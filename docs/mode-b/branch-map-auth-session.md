# Mode B: GitHub native OAuth session, credential store and generation safety

Production baseline: a3ba7fa30fc4c81890d3075f94142942d001cbf3. Source: apps/desktop/src-tauri/src/github_session.rs. Documentation parent: 4e4c81e223fe5e0011afb3dc961cff00f4fb9564.
Status: **Stage 3-8 PARTIAL**, assertion and source inspection only. No provider login, actual OS Keyring operation, new regression suite or public behavior change.

## Existing seven real Rust tests

- all_auth_failures_are_redacted_and_actionable: nine NativeAuthError variants map to non-empty finite messages with no token-like prefixes or token endpoint URL.
- clipboard_accepts_only_public_github_user_codes: valid 9-byte uppercase/digits user codes accepted, seven wrong-length/charset and private-token lookalikes rejected.
- terminal_auth_codes_do_not_expose_provider_response_bodies: four hardcoded terminal reason strings contain lowercase letters and underscores only; this checks the constants, **not** native event emitter behavior.
- stages_and_errors_are_safe_and_recoverable_without_webview_events: AuthProgress starts idle, status changes, identical status is deduplicated, credential-store failure reason remains finite.
- newer_attempt_invalidates_prior_polling_generation and competing_native_auth_generations_reject_outdated_completions: real atomic generation invalidation, one channel-controlled old/new race; no actual OAuth HTTP or Keyring invoked.
- normalized_auth_reason_and_message_remain_public_only: six exact error/reason message pairs, including 401/429/Keyring and expiry.

Only state/error/validation helpers are directly under test. The seven tests do **not** execute github_begin, poll_authorization, github_auth_status, github_disconnect, github_access_token_with_cache or the OS credential adapter under injected errors.

## Function/branch and assertion inventory

| Production method | Separate executable branch/outcome | Evidence and open cases |
| --- | --- | --- |
| GitHubAuthManager::invalidate / active | atomic epoch increment, notify waiters; equal/older generations | E for sequential and barrier-controlled old generation; ? wrap at u64::MAX and wake waiter under concurrent cancellation |
| AuthProgress::default, manager.progress/set_progress | idle; same phase+reason no change; different phase/reason updates; poisoned lock recovery | E idle/same/new; ? poison and reason-only change |
| unix_now | SystemTime before/after epoch | ? fallback to zero needs deterministic clock adapter, no changes to host clock |
| public_error/reason_category | Network, 401/403, 429, other HTTP, Rejected, BadResponse, KeychainUnavailable, CorruptCredential, NoCredential, Expired | E partial 6 exact pairs and secret absence for 9 variants; ? 403 vs 429 precedence, other HTTP and full category/message table |
| publish_with_reason | managed state missing vs present; dedup same status; debug env on/off; emit success/failure ignored | E set_progress helper; ? actual AppHandle emitter, no message on duplicate and strictly fixed reason |
| publish | status connected/disconnected restarts native relay; other status does not | S source; ? native event/relay restart counts, no stale scope |
| cancel_pending | manager missing vs present; epoch invalidation and cancelled event | ? actual Tauri command, cancellation vs newer begin interleaving |
| read_credential/store_credential/delete_credential | spawn_blocking succeeds; join error maps to KeychainUnavailable; OS adapter succeeds/fails | ? all actual Keyring outcomes; O3 NEEDS_ADAPTER for fault injection |
| github_flow_status | managed progress read without OS Keyring or GitHub fetch; finite status/reason | E progress helper, S getter; ? real Tauri command readback |
| github_auth_status | vault lock acquisition; credential read failure or None/expired/valid; valid returns connected and access expiry; invalid returns cached progress/reason | ? actual native command and locked/expired-vault read; inspect false connected plus previous progress "connected" for inconsistent display as a test hypothesis |
| github_begin | invalidate old, reset ETag, publish requesting; Keyring preflight success/failure; HTTP client construction/begin success/failure; old epoch rejected after HTTP; spawn polling task, pending and public challenge | ? synchronous fail branches and two simultaneous begins; stale HTTP error may race newer requesting status (hypothesis, not proven) |
| poll_authorization: wait/stop/ready | active epoch before and after wait; wake vs Tokio deadline; terminal denied/expired/cancelled/other; ready initiates request | Core DeviceSession E; actual async supervisor status/event paths ? |
| poll_authorization: HTTP poll | bounded provider error; epoch checked before/after external request; failure publishes only if active | ? deliberate old/new epoch changes between check and publish, error and success interleavings |
| poll_authorization: State reply | pending/slowdown loops; denied/expired/fixed failures terminate; invalid terminal status becomes finite failed | Core DeviceSession E and wire parser E; Tauri event output ? |
| poll_authorization: Granted reply | expired grant refused; vault lock acquired; epoch recheck; saving_credentials; CredentialRecord conversion/store success or failure; ETag invalidated only on confirmed valid save; new epoch suppresses completion event | ? injected store failure with concurrent disconnect and newer login; no false connected; cancellation during blocked store |
| valid_user_code | exactly 9 bytes, dash at byte 4, others ASCII uppercase/digits | E happy and seven invalids; ? NUL, non-ASCII, digit/dash placement, near-length bounds |
| github_copy_user_code | invalid code rejected before clipboard; valid OS write success/failure mapped to fixed public error | E validator only; OS clipboard denied/locked unverified |
| github_cancel | forwards to cancel_pending | ? command adapter actual dispatch |
| github_disconnect | invalidate epoch first, hold vault lock; invalidate ETag, delete Keyring then publish disconnected; failure returns public error before publishing disconnected | ? readback under failed deletion, last-known credentials must not be misreported as successful deletion; native relay scope and notification reset |
| github_access_token_with_cache | single vault lock for token and generation; missing/invalid vault; UseAccessToken, Reauthorize, Refresh; refresh HTTP and CredentialRecord/Keyring write/read failures; ETag invalidation; token+CacheLookup snapshot atomic | E TokenExpiration domain policy; ? actual native adapter failure and racing logout/re-login; source says no JS Tauri command |
| github_open_device_page | platform-specific xdg-open/open/explorer with fixed GitHub URL; spawn success/failure | S source; OS platform smoke, no user URL |

## Combined race/mutation risk register

- **AS1 stale error event:** old github_begin HTTP request returns error after a later begin has moved to requesting; source has no active(attempt) guard in the old HTTP failure branch. Establish a deterministic actual-manager/HTTP-adapter interleaving and verify new progress/event is not overwritten. A positive reproduction is not yet claimed.
- **AS2 stale terminal event:** poll_authorization checks active(attempt) but does not hold the epoch gate while publishing a terminal State/Stop outcome. Test a controlled cancel/begin between check and publish; current eventual consistency is not evidence of a resolved race.
- **AS3 status consistency:** github_auth_status filters expired vault credentials, but may re-use previous progress.phase as connected even if connected=false. Verify a real expired credential plus previous connected progress. A source-derived hypothesis only until reproduced.
- **AS4 vault transaction:** refresh rotates token pair, writes to Keyring, invalidates cache, then re-reads under the same vault lock; failure at each external operation must not publish stale connected or pair new ETag with old token.
- **AS5 disconnect vs store:** invalidate epoch, wait vault lock, clear credential, then disconnected event; old task already storing must not resurrect connected or public user code after new account.
- **AS6 command permissions:** native access_token_with_cache must remain unregistered to the JS command dispatcher. Confirm effective Tauri capability/command boundary, not solely source regex.

No production fix may be proposed from AS1-AS3 without reproduction. If a fix changes an auth or persistence contract, perform the architectural STOP FACTOR first.

## Positive and N1-N12 matrix

| Category | Evidence | Remaining |
| --- | --- | --- |
| Positive | E partial | Manager epoch/progress and error labels; all command success paths not directly executed |
| N1 | E partial | Clipboard format; actual command invalid input/permission boundary |
| N2 | E partial | DeviceSession and TokenExpiration in core; epoch wrap and time boundaries |
| N3 | ? | HTTP begin/poll/refresh network error, timeout, 401/403/429 and reauthorization status |
| N4 | ? | Repeated begin/cancel/disconnect and fail-after-partial-rotation idempotency |
| N5 | E partial | Atomic generation race; store+disconnect+publish AS1/AS2/AS5 not tested |
| N6 | ? | Corrupt/expired/no credential and concurrent settings status projection |
| N7 | E partial | Finite public reasons, native-only token getter; effective command authorization |
| N8 | E partial | Core explicit clock; actual unix_now and near-expiry refresh race requires fake clock |
| N9 | OS | Late clipboard/native browser and OS dialog during Quit/cancel |
| N10 | E partial | No-token public errors and clipboard code validation; actual OS secret/event redaction pending |
| N11 | NA | No subscription/entitlement behavior |
| N12 | NEEDS_ADAPTER | Native Keyring read/write/delete failure and transaction rollback proof |

## Test/harness obligations before Stage 9

1. Classify each public command, native-only helper and anonymous async callback against the method inventory; keep O1/O3 and related cases cross-referenced instead of inventing new redundant scenario groups.
2. Plan a production-preserving test seam for GithubOAuthHttp and NativeCredentialStore, with deterministic fake clock and channels. The real GitHubAuthManager, generation logic, and state machine must **not** be mocked.
3. Exercise every independent real HTTP/Keyring branch, old/new epoch ordering, status event redaction, and native app close; separate native physical acceptance from Rust integration.
4. At mutation review, remove epoch checks, reorder ETag before Keyring operation, drop vault lock, change refresh threshold, or publish after stale cancellation: each guard removal must be killed by an exact regression.
5. Document any source-confirmed auth/protocol defect with reproducible evidence before proposing a behavior change. No tests or mutations were run while writing this map.

This completes one native source-file branch/assertion pass only. No dev/main branch, Worker, production file, secret, GitHub auth account or CI run was modified.
