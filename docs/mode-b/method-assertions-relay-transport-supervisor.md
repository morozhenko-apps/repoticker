# Mode B: native WSS Relay supervisor method-to-test evidence

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, source `apps/desktop/src-tauri/src/relay_transport.rs` blob `c58b54c8e695edd7a12272d4eb7877e1ca15f69f` (370 lines). The detailed source/branch review is [branch-map-relay-transport.md](branch-map-relay-transport.md). Audit parent `f19850657229d869cad71e5a66545dccd9ff2818`.

All **16 lexical entries** have a category: two existing TYPE_DECL, and **14 new** (5 E_PARTIAL direct pure Rust assertions, 7 P_NATIVE WSS/AppHandle methods, 2 TEST_ONLY `#[cfg(test)]` Rust test functions). No tests executed in this pass. The two inline unit tests truly call `backoff`, `phase_label`, `reason_label`, `http_failure_code`, and `snapshot`; they **do not call** `restart` or `run`.

## Exact entries

| Line | Function | Status | Assertion or open branch |
| ---: | --- | --- | --- |
| 52 | `fn phase_label(code: u8) -> &'static str {` | E_PARTIAL | phase 0,1,2,3,255 tested |
| 61 | `fn reason_label(code: u8) -> &'static str {` | E_PARTIAL | reason 7,11,19 tested |
| 84 | `fn http_failure_code(status: u16) -> u8 {` | E_PARTIAL | HTTP 401,403,404,503 tested |
| 94 | `fn handshake_failure_code(error: &tokio_tungstenite::tungstenite::Error) -> u8 {` | P_NATIVE | tungstenite Error variants untested |
| 104 | `fn snapshot(code: u8) -> RelayPhaseEvent {` | E_PARTIAL | snapshot(11) exact JSON tested |
| 111 | `fn set_phase(app: &AppHandle, code: u8) {` | P_NATIVE | AppHandle phase+event not tested |
| 136 | `pub fn relay_connection_status(app: AppHandle) -> &'static str {` | P_NATIVE | native status command untested |
| 145 | `pub fn relay_connection_diagnostics(app: AppHandle) -> RelayPhaseEvent {` | P_NATIVE | native diagnostics command untested |
| 153 | `fn backoff(attempt: u32) -> Duration {` | E_PARTIAL | backoff 0,4,9,u32::MAX tested |
| 159 | `pub fn restart(app: &AppHandle) {` | P_NATIVE | WSS restart/abort not tested |
| 179 | `fn send_reconcile(app: &AppHandle, decision: RelayDecision) {` | P_NATIVE | native reconcile events not tested |
| 188 | `async fn run(app: AppHandle) {` | P_NATIVE | native WSS supervisor/run not tested |
| 344 | `fn reconnect_is_bounded_without_unlimited_retry_frequency() {` | TEST_ONLY | Rust #[cfg(test)] declaration |
| 352 | `fn public_availability_is_only_fixed_nonsecret_phase_data() {` | TEST_ONLY | Rust #[cfg(test)] declaration |

## Direct unit assertion receipts

- `reconnect_is_bounded_without_unlimited_retry_frequency`: `backoff(0/4/9/u32::MAX)` yields exactly 1/16/60/60 seconds. 1/5/6/7 and reset after success are not individually asserted.
- `public_availability_is_only_fixed_nonsecret_phase_data`: phase 0/1/2/3/255 is polling/connecting/online/fallback/fallback; reason 7/11/19 is missing_secret/http_403/pending_changes; HTTP 401/403/404/503 codes 10/11/12/13; `serde_json::to_string(snapshot(11))` exactly `{"phase":"fallback","reason":"http_403"}`.
- Existing real JS `hybrid-reconcile-schedule.test.mjs` invokes `startGithubMonitoring` with fake phase events and tests REST fallback, 15-minute reconcile, and burst hints. This is **not native WSS/Tauri event** execution. Source-regex diagnostics tests are static only.

## Native independent negative/interaction gaps

1. `restart` must abort the old `JoinHandle` before a newer account/scope bearer can emit `online`, `tasks` or `all`; inject an external WSS and event sink, don't mock the transport supervisor subject.
2. `run` admission: Polling vs Hybrid, pending draft, missing/invalid HTTPS URL, selected scope, GitHub authorization and OS Keyring read failure. Denied preconditions must never initiate the WSS handshake.
3. `run` handshake: fixed WSS TLS/host/Authorization, deadline, HTTP 401/403/404/503, TLS/Io/protocol errors, 15-second connect timeout, hidden credentials, handshake resumption after config changed.
4. `run` frames: valid RelayCursor Hint/Ignore/tasks/all, malformed text, Ping/Pong, Close, binary, stream error and failed sends; controlled 40-second ping, 10-second send/close deadlines. A WebSocket hint is not authoritative GitHub Actions data.
5. `set_phase`, `send_reconcile`, status/diagnostics AppHandle: finite allowlisted phases and reasons, duplicate suppression, zero raw provider or bearer text in events, no stale events on Quit. Core protocol and JS consumer tests cannot prove these native paths.
6. Negative categories: N1 malformed, N2 bounds, N3 network/transport, N4 duplicate hint/reconnect, N5 abort/race, N6 cursor gap/stale, N7 auth/scope, N8 clock, N9 close/Quit, N10 redaction, N12 Keyring errors; N11 NA. Use deterministic fake Tokio time/external transport; no live WebSocket.

Any change to credential/scope or URL admission is a material security STOP FACTOR; this audit contains only documentation. Stage 3–8 PARTIAL, Stage 9 not started. No test, CI, prod or OS state was changed.
