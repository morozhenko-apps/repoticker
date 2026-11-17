# Mode B Stage 3: Rust noncallable type and impl-block syntax classification

Source-equivalent production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. The existing `method-level-discovery.md` has **707 lexical named entries in 80 source files**, including Rust type and implementation **declarations** that are not independently callable methods. This purely syntactic pass reclassifies **exactly 73 previously unresolved lines**: **41 TYPE_DECL** and **32 IMPL_BLOCK**. Previous 44 manually assertion-classified entries stay unchanged. New provisional status: **117/707 lexical entries classified or assertion-mapped; 590 remain unresolved**. This is not a 16.5% test-coverage claim.

## Classification rule and limitations

- `TYPE_DECL`: a candidate expression begins with Rust `struct`, `enum` or `union`, with optional `pub` or `pub(...)` visibility. It declares a data/type surface rather than a directly invoked method.
- `IMPL_BLOCK`: a candidate begins with Rust `impl` or `unsafe impl` and owns member definitions. The block is not a method. **Its contained `fn` entries remain executable and unverified until separately assertion-mapped**.
- All 73 were `?` before this pass and the exact original source line/signature are preserved. No rewrite of test expectations, risk scores, source code or Positive/N1–N12 classifications.
- This is a **syntax-level guaranteed subset** only, not an AST parse of every 707 entries. Local Git checkout/AST parser was unavailable in this agent environment (network DNS could not resolve github.com); GitHub connector read the repository Markdown inventory. Do not claim the full AST-aware Stage 3 gate has passed.
- A `struct` may still require tests for serialization, schema invariants, default values, security secrecy or its `impl` methods. This classification exempts only the **declaration from separate function branch counts**; it does not waive the type's integration coverage.
- Trait implementations and derived/auto-generated methods may introduce runtime behavior not exposed by the original lexical list. The member method assertions and data schema obligations remain tracked in their focused source maps.

## Count by original production source

| Source | TYPE_DECL | IMPL_BLOCK |
| --- | ---: | ---: |
| `apps/desktop/src-tauri/src/github_api.rs` | 1 | 1 |
| `apps/desktop/src-tauri/src/github_etag_cache.rs` | 2 | 1 |
| `apps/desktop/src-tauri/src/github_native.rs` | 4 | 4 |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs` | 4 | 3 |
| `apps/desktop/src-tauri/src/github_rate_gate.rs` | 1 | 1 |
| `apps/desktop/src-tauri/src/github_session.rs` | 4 | 2 |
| `apps/desktop/src-tauri/src/linux_tray.rs` | 0 | 2 |
| `apps/desktop/src-tauri/src/main.rs` | 0 | 2 |
| `apps/desktop/src-tauri/src/monitor_cache.rs` | 2 | 2 |
| `apps/desktop/src-tauri/src/relay_secret.rs` | 2 | 3 |
| `apps/desktop/src-tauri/src/relay_transport.rs` | 2 | 0 |
| `apps/desktop/src-tauri/src/startup_diagnostics.rs` | 1 | 2 |
| `crates/repoticker-core/src/config_store.rs` | 1 | 2 |
| `crates/repoticker-core/src/git.rs` | 4 | 3 |
| `crates/repoticker-core/src/github_auth.rs` | 7 | 2 |
| `crates/repoticker-core/src/lib.rs` | 2 | 0 |
| `crates/repoticker-core/src/relay.rs` | 3 | 1 |
| `crates/repoticker-core/src/shutdown.rs` | 1 | 1 |
| **Total** | **41** | **32** |

## All 73 exact classification receipts

| Production source:line | Lexical declaration | Status |
| --- | --- | --- |
| `apps/desktop/src-tauri/src/github_api.rs:21` | `pub struct GitHubRestClient {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_api.rs:25` | `impl GitHubRestClient {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/github_etag_cache.rs:25` | `pub struct GitHubETagCache {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_etag_cache.rs:29` | `pub struct CacheLookup {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_etag_cache.rs:48` | `impl GitHubETagCache {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/github_native.rs:26` | `pub enum NativeAuthError {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_native.rs:40` | `pub struct CredentialRecord {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_native.rs:48` | `impl std::fmt::Debug for CredentialRecord {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/github_native.rs:60` | `impl CredentialRecord {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/github_native.rs:95` | `pub struct NativeCredentialStore;` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_native.rs:97` | `impl NativeCredentialStore {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/github_native.rs:134` | `pub struct GithubOAuthHttp {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_native.rs:138` | `impl GithubOAuthHttp {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs:14` | `pub enum WireError {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs:20` | `pub struct DeviceChallenge {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs:25` | `impl DeviceChallenge {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs:31` | `impl std::fmt::Debug for DeviceChallenge {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs:41` | `pub struct TokenLease {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs:48` | `impl std::fmt::Debug for TokenLease {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs:60` | `pub enum PollReply {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_rate_gate.rs:13` | `pub struct GitHubRateGate {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_rate_gate.rs:17` | `impl GitHubRateGate {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/github_session.rs:30` | `pub struct GitHubAuthManager {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_session.rs:46` | `impl Default for AuthProgress {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/github_session.rs:55` | `impl GitHubAuthManager {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/github_session.rs:88` | `pub struct GitHubAuthEvent {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_session.rs:95` | `pub struct GitHubAuthChallenge {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/github_session.rs:103` | `pub struct GitHubAuthStatus {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/linux_tray.rs:15` | `impl LinuxTray {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/linux_tray.rs:32` | `impl Tray for LinuxTray {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/main.rs:59` | `impl Drop for ActiveFetchLease<'_> {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/main.rs:112` | `impl CiNotificationMode {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/monitor_cache.rs:10` | `pub struct MonitorCache {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/monitor_cache.rs:20` | `impl Default for CacheState {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/monitor_cache.rs:32` | `impl MonitorCache {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/monitor_cache.rs:48` | `pub struct MonitorPresentation {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/relay_secret.rs:12` | `pub struct RelayPromptGate(AtomicBool);` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/relay_secret.rs:17` | `pub struct RelaySecretDraftState(Mutex<Option<RelaySecretDraft>>);` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/relay_secret.rs:45` | `impl Drop for PromptLease {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/relay_secret.rs:103` | `impl SensitiveSecret {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/relay_secret.rs:109` | `impl Drop for SensitiveSecret {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/relay_transport.rs:35` | `pub struct RelayTransportState {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/relay_transport.rs:47` | `pub struct RelayPhaseEvent {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/startup_diagnostics.rs:29` | `pub struct Span {` | `TYPE_DECL` |
| `apps/desktop/src-tauri/src/startup_diagnostics.rs:34` | `impl Span {` | `IMPL_BLOCK` |
| `apps/desktop/src-tauri/src/startup_diagnostics.rs:43` | `impl Drop for Span {` | `IMPL_BLOCK` |
| `crates/repoticker-core/src/config_store.rs:46` | `impl Drop for StagingFile {` | `IMPL_BLOCK` |
| `crates/repoticker-core/src/config_store.rs:178` | `pub struct JsonStore(std::sync::Mutex<()>);` | `TYPE_DECL` |
| `crates/repoticker-core/src/config_store.rs:180` | `impl JsonStore {` | `IMPL_BLOCK` |
| `crates/repoticker-core/src/git.rs:17` | `pub struct GitError(pub String);` | `TYPE_DECL` |
| `crates/repoticker-core/src/git.rs:19` | `impl fmt::Display for GitError {` | `IMPL_BLOCK` |
| `crates/repoticker-core/src/git.rs:25` | `impl std::error::Error for GitError {}` | `IMPL_BLOCK` |
| `crates/repoticker-core/src/git.rs:97` | `pub struct FetchCancellation {` | `TYPE_DECL` |
| `crates/repoticker-core/src/git.rs:101` | `impl FetchCancellation {` | `IMPL_BLOCK` |
| `crates/repoticker-core/src/git.rs:367` | `pub struct RepoSnapshot {` | `TYPE_DECL` |
| `crates/repoticker-core/src/git.rs:381` | `pub enum OperationOutcome {` | `TYPE_DECL` |
| `crates/repoticker-core/src/github_auth.rs:9` | `pub enum AuthError {` | `TYPE_DECL` |
| `crates/repoticker-core/src/github_auth.rs:14` | `pub enum DeviceResponse {` | `TYPE_DECL` |
| `crates/repoticker-core/src/github_auth.rs:27` | `pub enum DevicePhase {` | `TYPE_DECL` |
| `crates/repoticker-core/src/github_auth.rs:37` | `pub enum PollDecision {` | `TYPE_DECL` |
| `crates/repoticker-core/src/github_auth.rs:45` | `pub struct DeviceSession {` | `TYPE_DECL` |
| `crates/repoticker-core/src/github_auth.rs:54` | `impl DeviceSession {` | `IMPL_BLOCK` |
| `crates/repoticker-core/src/github_auth.rs:143` | `pub struct TokenExpiration {` | `TYPE_DECL` |
| `crates/repoticker-core/src/github_auth.rs:149` | `pub enum TokenAction {` | `TYPE_DECL` |
| `crates/repoticker-core/src/github_auth.rs:155` | `impl TokenExpiration {` | `IMPL_BLOCK` |
| `crates/repoticker-core/src/lib.rs:12` | `pub struct RepositoryState {` | `TYPE_DECL` |
| `crates/repoticker-core/src/lib.rs:21` | `pub enum SyncDecision {` | `TYPE_DECL` |
| `crates/repoticker-core/src/relay.rs:10` | `pub enum RelayFrame {` | `TYPE_DECL` |
| `crates/repoticker-core/src/relay.rs:17` | `pub enum RelayDecision {` | `TYPE_DECL` |
| `crates/repoticker-core/src/relay.rs:81` | `pub struct RelayCursor {` | `TYPE_DECL` |
| `crates/repoticker-core/src/relay.rs:88` | `impl RelayCursor {` | `IMPL_BLOCK` |
| `crates/repoticker-core/src/shutdown.rs:7` | `pub struct ShutdownSignal(AtomicBool);` | `TYPE_DECL` |
| `crates/repoticker-core/src/shutdown.rs:9` | `impl ShutdownSignal {` | `IMPL_BLOCK` |

## Remaining Stage 3–8 evidence

The other 590 unclassified entries must still be separated into Rust and JS/TS/Python callable methods, private nested closures, top-level import/constructor side effects, static dictionary definitions and shell command branches. A Rust `impl` block is not FULL merely because its container is now classified. Continue prioritizing source-true assertion links and unsafe native/AppHandle/Keyring/CI boundaries, and only update file-level N-matrix statuses after method/interaction closure.

No tests/mutations were executed, no source/test/CI/OS keys modified; global Mode B Stage 3–8 **PARTIAL**, Stage 9 still blocked.
