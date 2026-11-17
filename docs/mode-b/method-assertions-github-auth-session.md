# Mode B: native GitHub OAuth session method/branch evidence and Keyring ownership

Production source `apps/desktop/src-tauri/src/github_session.rs` blob `fa0754cf19a9480c7adefd5e3679d22e8a58aaf5` (649 lines) at `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; audit parent `8549d1bfe0de2791f7b9720e4ec6d0ebad109150`.

All **30 lexical entries** now classified: 6 preexisting `TYPE_DECL`/`IMPL_BLOCK` and **24 real functions** here. Eight private helpers are **E_PARTIAL**, tested directly by seven inline Rust unit tests; 16 native AppHandle/OAuth/Keyring/clipboard/browser entrypoints are **P_NATIVE**. These tags acknowledge test *source code assertions*, not execution in this turn. Existing JS Settings controller uses a fake Tauri IPC; Core OAuth DeviceSession parser has its own real tests; neither directly calls this native session's async command boundary.

## Exact method receipts

| Line | Native function | Evidence | Confirmed direct assertion or still-missing contract |
| ---: | --- | --- | --- |
| 47 | `fn default() -> Self {` | E_PARTIAL | AuthProgress::default idle/no-reason used directly by stages_and_errors test |
| 56 | `fn invalidate(&self) -> u64 {` | E_PARTIAL | Manager::invalidate increments epoch; newer_attempt and competing_native_auth test |
| 62 | `fn active(&self, epoch: u64) -> bool {` | E_PARTIAL | Manager::active rejects prior epoch and admits current under two-thread barrier |
| 66 | `fn progress(&self) -> AuthProgress {` | E_PARTIAL | Manager::progress returns initial, pending, failed fixed reason in Rust test |
| 73 | `fn set_progress(&self, next: AuthProgress) -> bool {` | E_PARTIAL | Manager::set_progress updates once, deduplicates unchanged phase/reason |
| 110 | `fn unix_now() -> u64 {` | P_NATIVE | SystemTime/UNIX_EPOCH and clock rollback: no fake clock seam |
| 117 | `fn public_error(error: NativeAuthError) -> String {` | E_PARTIAL | public_error maps 9 NativeAuthError classes to bounded public strings |
| 139 | `fn reason_category(error: NativeAuthError) -> &'static str {` | E_PARTIAL | reason_category finite mapping for HTTP429/401, Network, Keyring, Expired |
| 155 | `fn publish_with_reason(app: &AppHandle, status: &'static str, reason: Option<&'static str>) {` | P_NATIVE | AppHandle publish event, progress dedup and no provider text |
| 174 | `fn publish(app: &AppHandle, status: &'static str) {` | P_NATIVE | connected/disconnected restart native Relay only |
| 183 | `pub fn cancel_pending(app: &AppHandle) {` | P_NATIVE | actual AppHandle cancel_pending and waiters |
| 190 | `async fn read_credential() -> Result<Option<CredentialRecord>, NativeAuthError> {` | P_NATIVE | spawn_blocking Keyring read and join failure |
| 196 | `async fn store_credential(record: CredentialRecord) -> Result<(), NativeAuthError> {` | P_NATIVE | spawn_blocking Keyring record replace and join failure |
| 202 | `async fn delete_credential() -> Result<(), NativeAuthError> {` | P_NATIVE | spawn_blocking Keyring delete and join failure |
| 210 | `pub fn github_flow_status(app: AppHandle) -> GitHubAuthEvent {` | P_NATIVE | native finite github_flow_status command reads progress without vault |
| 219 | `pub async fn github_auth_status(app: AppHandle) -> Result<GitHubAuthStatus, String> {` | P_NATIVE | github_auth_status vault gate / absent/corrupt/valid token |
| 249 | `pub async fn github_begin(app: AppHandle) -> Result<GitHubAuthChallenge, String> {` | P_NATIVE | github_begin OS Keyring preflight and GitHub challenge/invalidate generation |
| 286 | `async fn poll_authorization(` | P_NATIVE | poll_authorization: token reply, wake/pending, slow-down, stored-grant epoch recheck |
| 388 | `fn valid_user_code(code: &str) -> bool {` | E_PARTIAL | valid_user_code accepts exact uppercase digit code, rejects wrong byte lengths and private-token lookalikes |
| 401 | `pub fn github_copy_user_code(app: AppHandle, code: String) -> Result<(), String> {` | P_NATIVE | github_copy_user_code actual OS clipboard permission and error redaction |
| 411 | `pub fn github_cancel(app: AppHandle) {` | P_NATIVE | github_cancel native command wrapper |
| 416 | `pub async fn github_disconnect(app: AppHandle) -> Result<(), String> {` | P_NATIVE | github_disconnect epoch, vault delete, ETag and Relay reset ordering |
| 433 | `pub async fn github_access_token_with_cache(` | P_NATIVE | github_access_token_with_cache native credential refresh and cache invalidation |
| 474 | `pub fn github_open_device_page() -> Result<(), String> {` | P_NATIVE | github_open_device_page fixed browser URL and denied OS launcher |

## The seven genuine inline Rust tests: what they prove

- `all_auth_failures_are_redacted_and_actionable`: nine `NativeAuthError` forms mapped to finite human-readable strings; no provider HTTP body or token prefix in output.
- `clipboard_accepts_only_public_github_user_codes`: real `valid_user_code` accepts fixed 9-byte `XXXX-XXXX` uppercase/digit and rejects seven malformed, wrong-length and private-looking values. Not an OS clipboard write.
- `terminal_auth_codes_do_not_expose_provider_response_bodies`: four enumerated terminal failure codes use restricted fixed ASCII words. Not actual Tauri `Emitter`.
- `stages_and_errors_are_safe_and_recoverable_without_webview_events`: `AuthProgress::default`, manager progress, `set_progress` idempotence and public Keyring error reason.
- `newer_attempt_invalidates_prior_polling_generation`: `invalidate` then `active` must make old attempt stale, new attempt current.
- `competing_native_auth_generations_reject_outdated_completions`: one real controlled Rust two-thread race with barrier channels, old epoch denied; **no OAuth HTTP or native vault read**.
- `normalized_auth_reason_and_message_remain_public_only`: six exact `public_error`/reason_category pairs.

## Native trust/transaction boundaries still P_NATIVE

1. **Vault custody**: `read_credential`, `store_credential`, `delete_credential` execute actual Keyring operations on blocking worker. Verify fail-open vs fail-closed for NoEntry, corrupt JSON, locked/unavailable OS secret service, write then readback, deleted vs failed deletion, and async join errors using injected external storage. Do not use owner's vault.
2. **Generation and publication**: the tested epoch predicate is a pure state-machine guarantee, not proof that `github_begin`, `poll_authorization`, `github_disconnect`, `github_access_token_with_cache` dispatch events in safe order under async HTTP. Required scenario: old OAuth grant resolves after a new login/Disconnect, vault write fails after grant, only new owner can publish connected and refresh ETag/Relay.
3. **Finite diagnostics**: `public_error`/reason_category tests do not prove `publish_with_reason` event payload exactly excludes access_token, refresh_token, device_code or provider response. The production structure is statically fixed, and a native event test should exercise it. Never infer a token leak or claim zero leaks without execution.
4. **Device auth**: `github_flow_status` is cached progress (no OS vault/HTTP), `github_auth_status` reads vault; these are distinct commands. `github_copy_user_code` validates a public code before clipboard; clipboard errors must not reveal OS text. `github_open_device_page` opens a fixed allowlisted browser URL, not a user URL.
5. **Time**: `unix_now` is wall time and `poll_authorization` computes OAuth expiry/poll deadlines with tokio time. Tests of manual clock rollback and fixed wait conditions need injected clock, not setting the host clock.
6. **Policy STOP**: changing credential JSON format, revocation semantics, event/public error vocabulary or Keyring failure authorization is material security/persistence contract. Document options and obtain decision before any **production** change; this docs pass does not propose one.

## Stage 9 deterministic families, after global Stage 3–8 closure

`AUTH-N1` full exact public-error + reason table including 400/401/403/429/500/503, token-like synthetic canary and no URL/path echo; `AUTH-N2` 8/9/10-byte public codes and malformed UTF-8/Unicode, clipboard denied; `AUTH-N3` fake native vault load/replace/delete/join error, old/new generation token transaction with explicit delayed fulfillment; `AUTH-N4` OAuth begin/poll/refresh from fake HTTPS fixed endpoint with pending/slowdown/invalid/expired and no raw body; `AUTH-N5` simultaneous begin/cancel/Disconnect + late grant and restarted scope, no stale ETag; `AUTH-OS` synthetic KDE KWallet/Windows Credential Manager/clipboard/browser acceptance only on approved host. Do not mock `GitHubAuthManager` itself.

N1 input, N2 exact time/code bounds, N3 external GitHub/Keyring failure, N4 idempotence, N5 races, N6 stored credentials, N7 auth scopes, N8 clock, N9 cancel/browser failure, N10 privacy, N12 OS vault apply; N11 NA. A future direct native integration test must keep domain manager real and mock only storage/HTTP/event ports.

No suite, mutation, OS Keyring, GitHub authorization or production code executed/modified. **Mode B PARTIAL**.
