# Mode B: Relay secret custody, OS Keyring and native test-only classification

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, source `apps/desktop/src-tauri/src/relay_secret.rs` SHA `82b79b24a64879af92c1e52fc67520b1842ca314` (486 lines). Audit parent `72f399a16fe6a869796210c31e99226d6d8a3c43`. This file contains **34 lexical entries**, of which five Rust type/impl declarations were previously classified. **All 29 remaining entries are now triaged**. This includes four functions **inside `#[cfg(test)]`**, one **Win32 FFI declaration**, and three mutually exclusive `prompt_native` target variants.

**Actual direct inline Rust assertions** (reviewed source, **not executed here**): `strict_base64url_secret_policy_does_not_accept_untrusted_bytes` calls `valid_secret` with seven malformed strings and lengths 31/32/256/257; `wipes_owned_secret_buffer` calls `wipe` and checks all zero bytes; `replacing_draft_wipes_candidate_without_keyring_write` calls real `lock_draft` and asserts Set→Remove→take→None (it **does not** byte-inspect freed memory); `relay_credential_isolated_from_github_auth_record` checks service/account constants differ (no actual OS vault isolation). The Settings JS controller tests use **fake** Tauri IPC; they do not execute native OS Keyring.

## Full source-line mapping (29 new classifications)

| Source line | Named candidate | Status | Verified assertion or remaining independent branch |
| ---: | --- | --- | --- |
| 24 | `fn lock_draft(` | E_PARTIAL | Rust test uses real lock_draft with normal state and Set->Remove->take |
| 33 | `pub(crate) fn discard_draft(app: &AppHandle) {` | P_NATIVE | Actual AppHandle-managed state, no native discard command test |
| 38 | `pub(crate) fn has_pending_draft(app: &AppHandle) -> bool {` | P_NATIVE | Actual AppHandle pending draft status and absence/test of Remove |
| 46 | `fn drop(&mut self) {` | P_NATIVE | PromptLease releases AtomicBool; no direct in-flight native prompt execution |
| 51 | `fn enter_prompt(app: &AppHandle) -> Result<PromptLease, String> {` | P_NATIVE | Atomic prompt gate competing callers, denial, release after cancellation |
| 59 | `fn valid_secret(value: &str) -> bool {` | E_PARTIAL | Rust 31/32/256/257, bad chars; ASCII-only enforced |
| 66 | `fn entry() -> Result<keyring::Entry, String> {` | P_NATIVE | OS Keyring entry constructor, denied/unavailable |
| 71 | `pub(crate) fn read_secret() -> Result<Option<SensitiveSecret>, String> {` | P_NATIVE | Read existing/absent/corrupt/locked OS Keyring outcome |
| 88 | `pub(crate) fn wipe(value: &mut String) {` | E_PARTIAL | Real wipe mutates owned synthetic ASCII bytes to zero |
| 104 | `pub(crate) fn as_str(&self) -> &str {` | P_NATIVE | Borrowed secret access under drop/use race; no direct asserted read |
| 110 | `fn drop(&mut self) {` | P_NATIVE | Destructor delegates to wipe, not separately byte-proven after drop |
| 115 | `fn store_secret(secret: &SensitiveSecret) -> Result<(), String> {` | P_NATIVE | Write valid candidate / denied OS keyring / no secret echo |
| 124 | `fn remove_secret() -> Result<(), String> {` | P_NATIVE | NoEntry/delete/locked OS Keyring and idempotence |
| 131 | `fn settings_only(window: &tauri::WebviewWindow) -> Result<(), String> {` | P_NATIVE | Exact settings window label / nonsettings callers |
| 139 | `pub async fn relay_secret_status(window: tauri::WebviewWindow) -> Result<bool, String> {` | P_NATIVE | Native relay_secret_status draft precedence and unavailable vault |
| 162 | `pub async fn relay_prompt_secret(` | P_NATIVE | Native password prompt and visibility/permission path |
| 189 | `pub async fn relay_stage_secret(` | P_NATIVE | Native staging accepted Settings IPC, valid/invalid/hidden/race |
| 210 | `pub async fn relay_clear_secret(` | P_NATIVE | Stage Remove without immediate Keyring mutation; label gate |
| 224 | `pub async fn relay_commit_secret_draft(` | P_NATIVE | Commit/no draft/retry on Keyring failure, restart ordering |
| 272 | `async fn prompt_native(app: &AppHandle) -> Result<Option<String>, String> {` | OS_P | cfg Linux GTK modal UI and channel cancellation |
| 320 | `async fn prompt_native(_app: &AppHandle) -> Result<Option<String>, String> {` | OS_P | cfg Windows blocking native Credential UI |
| 327 | `async fn prompt_native(_app: &AppHandle) -> Result<Option<String>, String> {` | OS_P | cfg non-Windows/non-Linux unsupported-target error |
| 346 | `fn CredUIPromptForCredentialsW(` | FFI_DECL | Foreign Win32 CredUIPromptForCredentialsW declaration, not Rust callable function body |
| 366 | `fn wide(text: &str) -> Vec<u16> {` | OS_P | UTF-16 conversion within cfg Windows only |
| 370 | `pub(super) fn prompt() -> Result<Option<String>, String> {` | OS_P | Native Win32 secret prompt, cancellation/UTF-16 wiping |
| 437 | `fn relay_credential_isolated_from_github_auth_record() {` | TEST_ONLY | Inline Rust test: SERVICE/ACCOUNT vs GitHub credentials |
| 443 | `fn strict_base64url_secret_policy_does_not_accept_untrusted_bytes() {` | TEST_ONLY | Inline Rust test directly invokes valid_secret negative/length table |
| 462 | `fn replacing_draft_wipes_candidate_without_keyring_write() {` | TEST_ONLY | Inline Rust test manipulates draft state via lock_draft |
| 479 | `fn wipes_owned_secret_buffer() {` | TEST_ONLY | Inline Rust test invokes wipe and inspects zero bytes |

## Credential boundary: facts, risks and STOP limits

1. `relay_stage_secret(app,window,secret:String)` explicitly **receives a secret from Settings WebView into native IPC once**. The source header's “values never cross WebView IPC” cannot be used literally for this inbound path. The intended invariant is **never returned to WebView, serialized into public config or emitted in event/log**; the candidate is immediately wrapped in `SensitiveSecret`, validated and retained in native-only draft. Do not claim full UI↔native zero-leak without a real test.
2. `read_secret` classifies `NoEntry` as absent; malformed value and OS denial are distinct **finite errors**. `remove_secret` accepts missing entry idempotently, but no real injected OS backend fault assertion exists. This is **O3 NEEDS_ADAPTER**, not a failing test or permission to read the user's actual Keyring.
3. `relay_commit_secret_draft` takes the draft and uses blocking native OS Keyring, restores a candidate on recoverable credential error and restarts Relay only when successful. Validate **first commit success then second failure**, real state readback and no claim of a completed teardown without verified credential removal.
4. `PromptLease` uses an atomic gate; `relay_prompt_secret` requires Settings label and visible window. Native Linux GTK and Windows CredUI are platform-specific **OS-only** acceptance, not cross-platform portable unit tests; unsupported-target variant is a separate cfg branch.
5. `wipe` overwrites owned bytes but **not external OS Keyring memory**. A synthetic `SensitiveSecret` drop and reentrancy scenario should avoid unsafe reading of freed memory. No semantics of persistent credential format/rotation should be changed absent an architectural decision.

## Stage 9 cases after all Stage 3–8 gates

- RS-N1: exact secret string 0/31/32/33/255/256/257, all byte classes, invalid Unicode and embedded NUL, synthetic owned memory only.
- RS-N2: fake external credential provider: absent/locked/corrupt/read-denied/write-denied/delete-denied and idempotent repeat; ensure no bearer/token echoes. **Not** live OS vault.
- RS-N3: concurrent `relay_stage_secret`/clear/commit and deny foreign window, close while pending native prompt; one prompt lease, retry candidate preserved when source permits.
- RS-N4: Settings fake-IPC test already proves Apply concurrency and stage→config→commit; add true native adapter receipt only, cross-resource atomicity/rollback policy is STOP FACTOR for any production behavior change.
- RS-OS: controlled KDE and Windows real UI/cancel/Keyring acceptance with synthetic test account and owner authorization; no privileged operations during planning.

N1/N2/N4/N5/N6/N7/N9/N10/N12 apply as described per native method; N3 external Keyring/transport failure, N8 locale/time largely handled by Settings, N11 NA. No mutation or suite executed. **Mode B Stage 3–8 remains PARTIAL, Stage 9 blocked.**
