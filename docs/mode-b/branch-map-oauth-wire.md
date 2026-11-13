# Mode B: native GitHub OAuth wire parser, redaction and bounds

Baseline: a3ba7fa30fc4c81890d3075f94142942d001cbf3. Exact source: apps/desktop/src-tauri/src/github_oauth_wire.rs, blob 5bc4b2a1b6da7fb0b10ab25060e9b31aacc1b6fa.
This is Stage 3-8 assertion reconciliation, NOT new test execution, live OAuth authorization, credential handling or public-contract change.

## Existing real native executable evidence

The module contains eight inline Rust tests:
- valid_device_response_keeps_private_code_out_of_debug: valid device challenge, native-only code accessor, public user code, poll wait, redacted Debug, hostile verification URI, zero interval, empty device code rejection.
- known_device_errors_are_mapped_without_leaking_server_text: pending, slow_down, access_denied and expired_token map to fixed DeviceResponse states; denied session becomes terminal.
- bearer_grants_require_lease_expiration_and_refresh_rotation: native access/refresh token lease parsed with bounded expiry; both tokens redacted in Debug; wrong bearer type, missing refresh, zero expiry rejected.
- oauth_destinations_and_publisher_client_id_are_fixed: four literal GitHub device/token/client/grant route constants asserted.
- invalid_unbounded_or_unknown_oauth_replies_fail_closed: invalid JSON, oversized response, non-object, missing challenge and unknown provider error classification.
- oauth_device_code_rejects_malformed_and_unbounded_json_before_projection: malformed/missing fields, untrusted URI, zero expiry, interval 3601, overlimit JSON.
- oauth_token_reply_rejects_incomplete_or_untrusted_grants: wrong-case bearer, blank refresh, token space, access expiry above 604800, refresh expiry zero or above 34560000; Debug redaction.
- oauth_unrecognized_provider_descriptions_never_become_wire_errors: unknown errors with inert private-looking descriptions map to UnknownFailure; known error dominates unrelated access_token field.

These tests invoke real parser functions. External GitHub HTTP and OS Keyring are not involved. Results are source-inspected baseline assertions; no new native suite was run.

## Named functions/types, executable branches

| Surface | Source branches and invariants | Current evidence and gaps |
| --- | --- | --- |
| WireError and PollReply enum | Finite error/status response without provider-supplied descriptions; grant variant contains native-only TokenLease | E partial fixed error mapping; no direct serialization since structs lack Serialize |
| DeviceChallenge::device_code | Returns private device code by immutable borrow, native-only caller must not send this to WebView | E accessor gets exact code; native caller privilege/path not proven by parser |
| DeviceChallenge::Debug | Writes public session and literal REDACTED for private device code | E dummy secret absent; negative debug formatting for long/escaped device code not individually asserted |
| TokenLease::Debug | Both access and refresh replaced by REDACTED while numeric durations appear | E both secrets absent; exact independently different secret strings tested; format mutation should fail |
| object(input) | String UTF-8 byte length >8192 rejects before parse; bad JSON rejects; valid JSON non-object rejects; object accepted | E malformed, oversized and array; ? exact 8192/8193-byte serialized object, embedded Unicode bytes and null/scalar variants |
| valid_ascii_token(value,max_len) | Empty, byte length >max, any non-ASCII-graphic byte reject; otherwise accept | E empty and space; ? NUL/newline/tab, Unicode, exact access/refresh max constrained by outer 8192 JSON cap; do not assert an impossible 8192-byte token inside 8192-byte complete JSON |
| parse_device_challenge | Device code must be present string, nonempty, ASCII graphic and <=512; user_code/verification_uri strings; expires_in u64; interval u64 or default 5; delegates DeviceSession::new | E happy path, hostile URL, malformed fields, zero/3601 interval; ? 511/512/513 device code and default interval for missing or wrong type, plus 1/3600 expiry and interval in this wire layer |
| parse_device_challenge | DeviceSession::new rejects invalid user-code charset/length, URI not exact public GitHub device route, expiry 0/>3600, interval 0/>3600 and overflow started_at | E via core github_auth.rs: device_challenge_rejects_boundary_values_and_untrusted_codes, plus wire rejection; ? wire-level invalid started_at/time overflow cross-product |
| parse_token_reply error path | String error exists => return fixed State, no raw error_description; seven known error codes + UnknownFailure; error overrides token fields | E 4 codes, unknown and slow_down overriding malicious access_token; ? remaining 3 codes, empty error string, unknown string with valid token fields, non-string error fallthrough semantics |
| parse_token_reply grant path | access and refresh strings and ASCII graphic, access invalid => InvalidServerResponse; refresh invalid => MissingRefreshToken | E valid, empty refresh, access with space; ? each absent/null/wrong type, exact token lengths and error classification, first-invalid precedence |
| parse_token_reply token_type exact bearer | Only lowercase bearer accepted | E bearer and Bearer/basic rejected; ? absent/null/non-string |
| parse_token_reply access expiry | u64 >0 and <=604800; zero, negative/non-u64, max+1 reject | E zero, max+1; ? exact 1/604800 accepted and numeric overflow/type alternatives |
| parse_token_reply refresh expiry | u64 >0 and <=34560000; zero/max+1 reject | E zero, max+1; ? exact 1/34560000, non-integer/null/string/overflow |
| parse_token_reply success | TokenLease contains validated access, refresh, two durations; never serialized by this module | E valid and Debug redaction; native store failure and OAuth generation races belong to github_session.rs, not this parser |

Important negative-contract distinction: an unknown error **string** maps to an allowed fixed failure state, not a raw error. A non-string error field currently does not enter that branch and can reach ordinary grant validation. That is a distinct branch to characterize, not a pre-approved API/security change. Additional provider JSON keys are ignored by projection, unlike monitor_cache.rs which retains whole arbitrary runner JSON.

## Positive, N1-N12 module matrix

| Category | Evidence | Scope |
| --- | --- | --- |
| Positive | E partial | Valid challenge, grant and finite provider state; wire-level extremes still open |
| N1 | E partial | Empty, malformed, hostile URI, wrong token type, missing fields; type-by-type matrix not complete |
| N2 | E partial | 8193 reject, interval >3600, two expiry max+1; exact 8192, 512 and expiry accepted bounds pending |
| N3 | NA | Pure parsing; HTTP failure/timeout in github_session or github_api |
| N4 | NA | Parser has no retry/side effect; slow_down duration in DeviceSession |
| N5 | NA | Stateless parser; native authorization generation race belongs to session manager |
| N6 | E partial | Wrong JSON shape, invalid grant, unknown error handled; non-string error branch open |
| N7 | E partial | Exact GitHub URI and fixed bearer, unknown provider fields ignored |
| N8 | E partial | Explicit start time/expiry and overflow in DeviceSession, no ambient clock here |
| N9 | NA | No UI/OS window interruption |
| N10 | E partial | DeviceChallenge and TokenLease redacted Debug; external logs and Keyring require native acceptance |
| N11 | NA | No paid entitlement |
| N12 | NA | No direct persistent storage |

## Stage 9 executable cases planned only after global Stage 3-8 signoff

- OW1: table of exact valid/malformed JSON byte boundaries 8191/8192/8193, Unicode length, scalar/array and null; assert error enum without exposing payload.
- OW2: device_code 0/1/511/512/513 bytes, user_code validation via real DeviceSession, interval missing/wrong type defaults to 5, expiry/interval 1/3600 and invalid 0/3601; overflow started_at.
- OW3: all seven known errors and unknown/empty/non-string error fields, with a valid-looking grant in same payload. Preserve finite states and no raw error_description.
- OW4: table-driven access and refresh token missing/type/ASCII/exact realistic length, token_type, expiry 0/1/max/max+1; check MissingRefreshToken vs InvalidServerResponse precedence and Debug redaction.
- OW5: only if native integration inventory shows a gap, cross-check parser return never flows to WebView or logs; keep Keyring adapter failure separate under O3.

Mutation guards to kill: drop JSON cap or object-type check, relax ASCII/device code, change exact URI, skip refresh requirement, accept non-bearer, change expiry bound/zero logic, leak Debug tokens, forward raw provider error_description or make an unknown error grant token. Every mutation must be killed by actual parsed behavior, not source regex.

No code/tests/CI/Worker change. This mapping completes one Rust wire module's method-level source review but does NOT close the repository-wide Stages 3-8 gate or authorize Stage 9.
