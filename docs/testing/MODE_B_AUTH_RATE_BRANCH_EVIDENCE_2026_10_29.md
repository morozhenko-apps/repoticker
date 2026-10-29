# Mode B — OAuth device auth, rate gates and session branch evidence

**Source inspection baseline:** `aab0ed0f5b449bb8b4bc0d2a24edb504b7985785`,
2026-10-29. Source files directly read:
`crates/repoticker-core/src/github_auth.rs`,
`apps/desktop/src-tauri/src/github_rate_gate.rs`,
`github_oauth_wire.rs` and `github_session.rs`.
No Rust/Node suite was executed. `E` means a **named
existing test candidate**, not executed/verified; `P` =
additional negative path required; `S` = static-only source
contract, not an integration test.

| ID | Production location | Actual decision/invariant | Existing named test | Type | Unverified boundary/interaction |
| --- | --- | --- | --- | --- | --- |
| A01 | github_auth.rs:62–71 | challenge URL/code/expires/interval guard | refuses_phishing_urls_invalid_user_codes_and_overflow | E | 0/1/32/33, Unicode, wrong URL, interval 3600/3601 |
| A02 | github_auth.rs:73–79 | min poll=5 and checked_add overflow | cannot_poll_more_often_than_github_interval; refuses_phishing_urls_invalid_user_codes_and_overflow | E | Exact 5 vs 4, start_at near u64 MAX |
| A03 | github_auth.rs:91–104 | phase!=Awaiting, now>=expires, now<next, Ready | cannot_poll_more_often_than_github_interval; denied_expired_and_cancelled_sessions_are_terminal | E | expiry-1/expiry/expiry+1, all terminal phases |
| A04 | github_auth.rs:107–114 | receive on terminal, receive after expiry | authorization_requires_a_nonexpired_active_challenge; denied_expired_and_cancelled_sessions_are_terminal | E | Authorized after expired/cancelled/denied stays terminal |
| A05 | github_auth.rs:115–132 | pending/slowdown/denied/expired/authorized/invalid responses | slowdown_extends_current_and_future_poll_intervals; unsupported_or_invalid_credentials_end_the_attempt | E | Repeated slow_down saturation and all error variants |
| A06 | github_auth.rs:135–139 | cancel only awaiting, not after terminal | denied_expired_and_cancelled_sessions_are_terminal | E | Double cancel, cancel after authorized or failed |
| A07 | github_auth.rs:156–163 | refresh expiry first, access threshold inclusive, else token | rotated_access_token_policy_refreshes_before_expiration | E | Boundary now+margin at equality, large saturation, refresh==access expiry |
| R01 | github_rate_gate.rs:18–26 | remaining time ceil seconds, bound MAX, lock poison recover | remaining_time_is_monotonic_and_does_not_shorten_existing_gate | E+P | exact 1 ms, expired Instant and poisoned lock recovery |
| R02 | github_rate_gate.rs:29–35 | defer MAX clamp and monotonic gate extension | remaining_time_is_monotonic_and_does_not_shorten_existing_gate | E | Concurrently defer shorter/longer durations |
| R03 | github_rate_gate.rs:38–44 | parse bounded_seconds 1..86400 or invalid | rate_gate_respects_retry_after_then_reset_and_bounded_fallback | E | negative, overflow, leading spaces, numeric zero and very large |
| R04 | github_rate_gate.rs:53–56 | 429 or rate-specific 403 only | permission_errors_never_enter_rate_gate | E | 403 with Retry-After, 401/404/503 never rate-gated |
| R05 | github_rate_gate.rs:57–65 | Reset deadline > now, Retry-After priority, fallback | rate_gate_respects_retry_after_then_reset_and_bounded_fallback | E | reset == now, past reset, malformed retry-after/reset |
| R06 | github_rate_gate.rs:68–81 | monotonic/current time and numeric public cooldown | remaining_time_is_monotonic_and_does_not_shorten_existing_gate | E+P | system clock before UNIX_EPOCH; no raw headers crossing IPC |
| W01 | github_oauth_wire.rs:65–73 | bounded JSON object only | invalid_unbounded_or_unknown_oauth_replies_fail_closed | E | JSON oversized exact max/exact max+1, Unicode invalid UTF8 body |
| W02 | github_oauth_wire.rs:76–106 | device code + user code + URI + interval trust | valid_device_response_keeps_private_code_out_of_debug; oauth_destinations_and_publisher_client_id_are_fixed | E | all invalid token permutations; expiry overflow |
| W03 | github_oauth_wire.rs:108–121 | known OAuth error vocabulary redaction | known_device_errors_are_mapped_without_leaking_server_text | E | unknown provider text never serialized to IPC |
| W04 | github_oauth_wire.rs:125–151 | bearer access+refresh validity and required lease | bearer_grants_require_lease_expiration_and_refresh_rotation | E | unknown casing, empty refresh, expiry boundaries |
| S01 | github_session.rs:55–79 | generation invalidate, active, progress dedup | newer_attempt_invalidates_prior_polling_generation | E | concurrent begin/cancel/logout and emitted events |
| S02 | github_session.rs:244–381 | begin/read credential/poll + store rotated tokens | stages_and_errors_are_safe_and_recoverable_without_webview_events; newer_attempt_invalidates_prior_polling_generation | E+P | OS vault failure, wrong account generation, actual async poll timing |
| S03 | github_session.rs:411–468 | disconnect/read/refresh lock and ETag generation snapshot | github-rest-transport.test.mjs static contracts; no full integration seam observed | S+P | refresh concurrent disconnect, failed vault write, old ETag with new account |
| S04 | github_session.rs:117–151 | native error -> finite public status and reason | all_auth_failures_are_redacted_and_actionable; terminal_auth_codes_do_not_expose_provider_response_bodies | E | ensure HTTP 429 differs 403, avoid arbitrary private response leakage |

## Stage 5 flow-level Positive/N1–N12 mapping

| Critical flow | Positive | N1 malformed | N2 time/bounds | N3 HTTP/OS | N4 retry | N5 concurrent | N6 corrupt | N7 auth | N8 clock | N9 cancel | N10 privacy | N11 purchase | N12 storage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DeviceSession pure state | E | E | E+P | N/A: pure | E | E+P | E | E | E+P | E | N/A: private code excluded | N/A: free | N/A: pure |
| OAuth reply parser | E | E | E+P | E | E | P | E | E | E | P | E | N/A: free | N/A: pure |
| Rate gate / headers | E | E | E+P | E | E | P | E | E | E+P | E | E+P | N/A: free | N/A: in-memory |
| Runtime keyring + refresh | E+P | E+P | E | E+P | E+P | P | E+P | E | E | P | E+P | N/A: free | P |

## Stage 6/10 interaction and mutation obligations

- Device flow: `slow_down` must postpone both next and
  future polls. Mutation `now>=expires_at` to strict `>`
  must be caught on the boundary.
- Poll success from a prior generation must not write credentials
  after cancel, disconnect or a newer begin. A pure
  `DeviceSession` test is insufficient to prove the async
  vault/event contract.
- HTTP 403 without GitHub quota evidence must never share
  the 429 rate-limit backoff. Mutating the classification
  predicate must be killed by tests.
- Credential refresh must commit a coherent rotated token pair
  and then invalidate its ETag cache; failure to write must
  remain a failure, not mixed old/new token and revision.
- User code and `device_code` must never enter logs/IPC
  or arbitrary provider failure messages. A serialized
  debug string containing a token is a critical regression.

## State

This **deepens Stage 4 only for the named domain**.
The full Stage 3–8 all-artifact/negative matrix is not
complete. The final STABLE suite is not run and Windows/KDE
session/keyring physical acceptance follows Mode B.
No auth secrets, GitHub App config, main/tag or R2
object was changed.
