# Mode B: native MonitorCache, public JSON projection and NM1 security STOP FACTOR

Source `apps/desktop/src-tauri/src/monitor_cache.rs` blob `e7546ea54546823e7781e508b9cde126460cdf72` (132 lines), production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; audit parent `3e4728e0bb5c7809c6312c45e91b0e26d1e3b17a`.

**All ten original lexical records** now classified: four preexisting TYPE_DECL/IMPL_BLOCK and six new entries (2 E_PARTIAL direct pure Rust assertions, 2 P_NATIVE real AppHandle command functions, 2 TEST_ONLY inline test definitions). Tests were read, **not executed this turn**.

| Line | Subject | Status |
| ---: | --- | --- |
| 21 | `fn default() -> Self {` | E_PARTIAL |
| 33 | `pub fn read(&self) -> (bool, Option<Value>, Option<String>) {` | E_PARTIAL |
| 55 | `pub fn github_monitor_snapshot(app: AppHandle) -> MonitorPresentation {` | P_NATIVE |
| 69 | `fn default_status_is_unknown_until_wallet_verification() {` | TEST_ONLY |
| 77 | `fn monitor_projection_uses_only_expected_fields() {` | TEST_ONLY |
| 95 | `pub fn github_monitor_publish(` | P_NATIVE |

## Actual inline assertions and limits

- `default_status_is_unknown_until_wallet_verification` calls real `MonitorCache::default().read()`; asserts disconnected false, no runner_state and exact finite `Checking GitHub connection...` message. Unknown status is **not** proof of revoked credentials.
- `monitor_projection_uses_only_expected_fields` constructs `MonitorPresentation` with runner_state None and serializes it; asserts exactly **three top-level fields**: connected, runner_state, monitor_message. It does not call the Tauri `github_monitor_snapshot` command or pass an arbitrarily nested `runner_state` value.
- `github_monitor_publish` is a `#[tauri::command]` callable that verifies only `counts` and `coverage` are objects (not the field-level values), JSON serialized size ≤262144 bytes, and message length ≤180 bytes with no newline. It then writes connected+runner_state+message into managed cache, discards runner_state if `connected=false`, and emits fixed event `repoticker-monitor-updated`. No inline Rust test directly invokes this function under actual AppHandle.
- **NM1 source-derived risk:** the accepted `serde_json::Value` is not a strict nested allowlist: the code does not explicitly reject unknown keys within `runner_state`/counts/coverage or nested arbitrary objects as long as required containers and total size satisfy the checks. The three-field top-level `MonitorPresentation` test therefore does **not** prove no unexpected private nested property may be serialized into the public WebView projection.
- **No exploit confirmed.** Real JS Monitor controller currently produces an allowlisted internal projection, but the native command's trust boundary must be evaluated independently of that caller. Changing schema acceptance, nested allowlists or projection format changes the public/security contract and is a **material architecture STOP FACTOR**. Do **not** implement a filter or weaken tests without an explicit decision.

## Deterministic test contract to negotiate before security behavior change

1. `MC1` actual Tauri AppHandle source command uses managed state; valid publish is visible to `github_monitor_snapshot`, and disconnect clears stale runner data; old event publishes must not win after newer auth generation.
2. `MC2` sizes 262143/262144/262145, message length 179/180/181 and newline, no counts/coverage or wrong types, no false accept. These are current source behaviors, can be tested without choosing an unknown-key policy.
3. `MC3` dedicated **characterization-only** test with extra nested synthetic key (e.g. `example_canary`), assert current accepted/readback behavior and record contract options. It must not contain real secrets or claim policy correctness.
4. `MC4` choose one material security contract: (A) explicit strict recursive schema with rejection, or (B) bounded allowlisted projection of recognized fields and rejection/drop of extras, preserving documented backward compatibility. Either requires user architecture approval **before a production fix**, not for source inventory.
5. `MC5` event emission failure and unknown auth/Keyring state must not leak raw provider details; compose with A1 app.mjs real controller after Stage 3–8 closure. A direct Rust method test cannot be replaced by `ci-native-integration.test.mjs` static source checks.

Positive and N1 malformed, N2 size/count, N4 event repeat, N5 auth/logout race, N6 partial JSON, N7 trust/schema, N8 timestamp in producer, N9 close/Quit, N10 leakage and N12 managed state external; N11 NA. The status is **PARTIAL with NM1 STOP for any architecture-affecting change**, not a defect verdict. Only documentation was committed.
