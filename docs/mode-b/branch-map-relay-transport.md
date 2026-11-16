# Mode B: native WSS relay transport, supervisor and scope-isolation branch audit

Production baseline a3ba7fa30fc4c81890d3075f94142942d001cbf3. Source apps/desktop/src-tauri/src/relay_transport.rs, blob c58b54c8e695edd7a12272d4eb7877e1ca15f69f. Prepared parent e4994fe62bda62e3e6b21a10f7134f90a5d0862f.
This is Stage 3–8 review, NOT a live WebSocket test, new Rust test execution, hosted Cloudflare change, or native lifecycle certification.

## Existing executable versus source-only coverage

- Rust reconnect_is_bounded_without_unlimited_retry_frequency directly checks real backoff(0)=1, (4)=16, (9)=60, (u32::MAX)=60 seconds. It does not run a retry loop or actual timeouts.
- Rust public_availability_is_only_fixed_nonsecret_phase_data checks real phase_label codes 0/1/2/3/255; reason_label codes 7/11/19; four HTTP classifications and exact JSON for snapshot(11). No native Tauri AppHandle, WSS or emitted event is exercised.
- tests/relay-native-diagnostics.test.mjs checks **source text** for finite reason labels, TLS-safety/header construction, diagnostics and Settings translations; this is S, not native transport E.
- tests/hybrid-reconcile-schedule.test.mjs calls real JS startGithubMonitoring with **faked IPC phase/reconcile events**. It establishes REST recovery cadence, hint burst and stale event handling in the JS consumer, not socket, HTTP status, native auth or Rust supervisor.
- tests/graceful-quit.test.mjs checks native quit/source ordering via regex; physical socket/task abort and WebKit teardown are separate OS acceptance.

## Named native methods and branches

| Method | Distinct executable outcomes | Existing proof / remaining gap |
| --- | --- | --- |
| phase_label and reason_label | Four phases; finite fallback reasons 3/4..19 and unknown -> none | E subset; ? every numeric code, unknown 20/255, round-trip diagnostics |
| http_failure_code | 401, 403, 400/404/405/426, 500..599, all other -> protocol | E 401/403/404/503; ? 400/405/426, 500/599 vs 499/600 |
| handshake_failure_code | Http response classification, TLS, Io, other -> protocol | S for match arms; ? actual representative tungstenite error variants, no raw error exposure |
| snapshot | phase_label + reason_label structured in JSON | E snapshot(11); ? independent phase codes, no nonallowlisted fields |
| set_phase | successful online clears last_failure; fallback code>=3 logs once per different failure; same code suppresses event; changed code emits; opt-in safe debug labels | ? direct native state/event sink, 2->fallback->2, repeated identical failure, distinct failure and emit failure; no raw provider data |
| relay_connection_status and relay_connection_diagnostics | Both read same atomic phase, project phase or fixed structured reason | S command registration/UI; ? real managed-state readbacks while reconnecting and after config change |
| backoff | 2^min(attempt,6) seconds capped at 60, saturating attempt increments in caller | E attempt 0/4/9/MAX; ? 1/5/6/7 exact transition and reset to 0 on success |
| restart | debug mode presence, job Mutex normal/poison, old JoinHandle abort, reset phase 0, create exactly one new task | S source only; ? deterministic pending-handshake abort and no old event/new-scope leak; Linux/Windows async lifetime |
| send_reconcile | Ignore emits nothing, RefreshTasks emits kind=tasks, ReconcileAll emits kind=all; emit failure ignored | E only corresponding JS consumer using fake event; ? real native emitter, event count/payload with all decisions |
| run: config gates | read_config fails -> configuration; Polling -> polling; pending secret draft -> pending_changes; missing URL -> invalid_url; missing org or invalid RelayCursor -> scope | ? all native branches under injected config, no WebSocket attempt on failure |
| run: authorization and secret | github_auth_status connected vs false/error; native secret read Some/None/error or join failure | ? missing_secret, credential_store, github statuses; no token in WebView, native vault denied case |
| run: TLS and URL | installs or reuses ring provider; validated websocket_url and native request; sensitive Authorization header wiped from temporary string | S source; ? rejection of invalid origin/header, provider installed, TLS hostname/cert enforcement on native client |
| run: handshake | connect within 15s vs timeout; HTTP 401/403/4xx/5xx, TLS/Io/protocol errors; valid socket establishes online only after successful upgrade | ? deterministic transport injection and exact reason; no live acceptance asserted |
| run: online entry | on each successful upgrade set online, reconcile all via REST event, reset backoff, start 40s ping timer with missed tick skip | JS consumer E for online event, native ?; REST remains authoritative even after WSS hint |
| run: incoming frames | parse valid Text and RelayCursor.observe -> Ignore/tasks/all; invalid text => protocol; Ping/Pong ignored; Close/None => closed; tungstenite error classified; non-text data => protocol | Core parse_frame/RelayCursor tests exist and JS consumer tests exist; no direct native socket frame dispatch assertions |
| run: outgoing heartbeat | Ping succeeds or send error/10s timeout => timeout fallback; close with separate 10s bound | ? simulated ping/close failures, no unbounded close waiting |
| run: reconnect | failure set; exponential bounded sleep; attempt increments; task abort on restart and next generation cannot keep old bearer/scope | Backoff E, restart S; ? reconnect across old/new account, 401, token revoke, app quit, stale event interleaving |

## Cross-product interaction and risk evidence

1. WSS online then server closes, offline network, HTTP 503 or invalid frame: phase becomes finite fallback and JS monitor uses authoritative REST polling (real JS consumer test exists; real WSS event boundary not yet exercised).
2. Old TLS handshake stalled while Settings changes URL, Keyring secret and selected owner: restart must abort old supervisor before new handshake, with no stale online event or old bearer. Source says previous JoinHandle abort; no native deterministic proof.
3. Active WSS Ping timeout vs inbound Close/frame vs OS Quit: exactly one lifecycle teardown, no blocked unrelated Git command. Native/physical OS-R1/OS-Q1 still outstanding.
4. Disconnect/reconnect across changing REST owner scope: RelayCursor reset and no old event projection; do not accept a hint as a GitHub Actions result.
5. Failure label uses only finite codes; error log and diagnostic value must not contain host, private repo, token or raw tungstenite payload. Existing JS static assertions are not native log capture.
6. Connection loop obtains current config/account/secret once; after that it relies on restart being triggered on all meaningful configuration/auth changes. Verify caller coverage and event ordering before asserting long-lived scope isolation. This is a test hypothesis, not a proven stale-scope defect.

## Positive plus N1–N12 for this source

| Category | Status | Gap |
| --- | --- | --- |
| Positive | E partial | Pure backoff/labels and JS consumer, real native online handshake not tested |
| N1 | S / ? | Invalid config, invalid endpoint/header and malformed frames |
| N2 | E partial / ? | Bounded backoff, 2 KiB frame, 10/15s timeout and 40s ping boundaries |
| N3 | ? | TLS/network/HTTP upgrade error, 401/403/404/500/503, closed connection |
| N4 | E partial / ? | Retries/backoff after fault and successful reset; no independent duplicate notification on reconnection |
| N5 | ? / OS | Restart/abort vs old WSS, auth/secret/account rotation, simultaneous Quit |
| N6 | ? | Stale cursor, corrupt relay frame, unsupported WebSocket type |
| N7 | S / ? | Native-only bearer, restricted origin/headers, frame parser and auth errors |
| N8 | ? | Monotonic timeout/backoff; clock rollback handled at protocol/adapter boundary, not time zones here |
| N9 | OS | Tray Quit, Settings close and interrupted WSS during desktop teardown |
| N10 | S / ? | Safe reason labels and source-level redaction; capture real native error logs and emitted payloads |
| N11 | NA | No paid entitlement |
| N12 | OS | OS Keyring missing/denied and settings failure; no local disk write by this transport |

## Exact Stage 9 test and mutation plan (after global Stage 3–8 approval)

- RT1: pure label/http status/backoff table across all branches including 400/404/405/426, 499/500/599/600, attempt 0/1/5/6/7/MAX; kill changed HTTP/error classification and off-by-one cap.
- RT2: native state/event adapter exercising set_phase dedup and privacy, two readback commands and send_reconcile Ignore/tasks/all with emitted payload. Kill duplicate event, dropped event and leaked reason.
- RT3: supervisor with injected external config, vault and WSS transport, preserving real run/restart/cursor logic. Each fail-closed preflight returns fixed phase without connecting. No actual operator secret or hosted Worker.
- RT4: scripted native WSS handshake/frame/heartbeat failures, 2 KiB exact framing bounds, timeout and reconnection. Kill skipped parser, disabled TLS or send timeout, wrong fallback.
- RT5: deterministic barrier-based restart while old handshake hangs, then change scope/bearer and Quit. Assert old socket closed, only current phase/reconcile event emitted, no stale account. No sleeps or busy polling.
- RT6: separate physical KDE/Windows TLS/OS vault/tray Quit acceptance with coredump/exit evidence. This is not satisfied by Rust unit tests.

Do not loosen production WebSocket origin, secret custody, schema, public IPC or stored settings for testing. If the current concrete behavior violates an architectural trust boundary, apply STOP FACTOR before a production correction. No code/test suite/CI/release or Cloudflare deployment changed by this document.
