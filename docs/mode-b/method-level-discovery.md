# Mode B: per-method discovery register (source-derived)

Baseline production source `a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Input: eight preserved source inventories in this audit plus a separate `main.rs` continuation (inline Rust tests are interspersed). These are lexical extraction records, NOT an AST and NOT evidence that branches have been covered.

**Method evidence tags:** `I_PARTIAL` = real method was executed indirectly through a real consumer with some relevant assertions, but independent branches remain open; `E_PARTIAL` = real method called directly in reviewed tests with still-open branches; `INLINE` = a private closure nested within an enclosing method, not a separate public API. `ADAPTER` = a tiny private wrapper around DOM/native transport rather than a separate domain API; `P` = an inspected entrypoint with no matching direct executable event assertion. `TYPE_DECL` = Rust struct/enum/union declaration, not a callable method; `IMPL_BLOCK` = method-implementation container, not itself an executable method. These two are syntax-based Stage 3 type classification, **not** coverage of declared fields or member methods. `CLASS_DECL` = Python/JS/TS class definition, `CLASS_METHOD` = real class/adapter method awaiting assertion reconciliation, `CALL_SITE` = function call misrecognized as lexical method, `STARTUP_CALL` = top-level initialization effect, `LOCAL_EXPR` = Boolean/nonfunction value inside an owning function. None of these tags represents a passing test. `P_CONTROLLER` = private method whose in-situ main-card DOM/Tauri behavior is not verified, `CALLBACK_P` = unasserted event closure; these may already have directly tested separate pure helpers. `P_NATIVE` = actual native method/command without directly verified AppHandle/OS assertions (other pure modules may be tested); `BOOTSTRAP_P` = OS app setup. `TEST_ONLY` = Rust #[cfg(test)] test function, not production API; `FFI_DECL` = Win32 foreign function signature, not a Rust method body; `OS_P` = platform-gated native callable requiring OS acceptance. `P_CORE` = real private or public Core method without a named direct existing branch assertion; separate Git core dependencies may be tested. `DATA_ONLY` = a source-inspected module containing only an exported dictionary, with no callable extracted from the module; validate it as a structural/consumer artifact, not a fictitious method. Other `?` rows remain unclassified. These tags do not change the global Stage 3–8 PARTIAL state.

**Current Stage 3 checkpoint (source-inspected, not test-executed):** 708 provisional lexical/source-reconciled entries, **679 structurally classified or assertion-linked/planned, 29 '?' remain**. Exact categories: **179 E_PARTIAL, 112 I_PARTIAL, 133 P_NATIVE, 43 OS_P, 23 P_CORE, 36 P_CONTROLLER, 1 CALLBACK_P, 6 P, 1 BOOTSTRAP_P, 7 ADAPTER, 9 INLINE**, 41 TYPE_DECL, 32 IMPL_BLOCK, 9 FFI_DECL, 22 TEST_ONLY, 3 CALL_SITE, 1 STARTUP_CALL, 2 LOCAL_EXPR, 3 CLASS_DECL, 11 CLASS_METHOD, 5 DATA_ONLY. The initial 707-row lexical scan omitted real `linux_surface.rs:51` relative-pointer callback; more anonymous/extern/cfg omissions remain possible until true AST-aware reconciliation. **679 is not 679 passing tests, executable methods, or code coverage.**

Every line carries **risk**, **test level**, **candidate N categories**, and an **initial test-count floor**. These floors represent planning estimates to be refined against each distinct decision outcome, NOT observed tests, and NOT a cap on required tests. The letter `?` denotes not yet assertion-mapped. External dependencies are faked only by contract, never by replacing business logic.

Static catalog/data-only entries are separate testable artifacts: cross-locale structural parity + consumer semantics, not artificially invented network/disk failure tests. N11 not applicable to any RepoTicker file (no entitlements).

## `apps/desktop/src-tauri/build.rs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 3 | `fn execute(name: &str, args: &[&str]) -> String {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 17 | `fn compile_wayland_bridge() {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 79 | `fn main() {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |

## `apps/desktop/src-tauri/src/app_icon.rs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 5 | `pub fn tray_rgba() -> (Vec<u8>, u32, u32) {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 15 | `pub fn tray_argb() -> (Vec<u8>, u32, u32) {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |

## `apps/desktop/src-tauri/src/autostart.rs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 6 | `pub(crate) fn autostart_is_enabled(app: AppHandle) -> Result<bool, String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 13 | `pub(crate) fn autostart_set_enabled(app: AppHandle, enabled: bool) -> Result<bool, String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |

## `apps/desktop/src-tauri/src/ci_notifications.rs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 23 | `fn notification_catalog() -> &'static NotificationCatalog {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 31 | `fn notification_error(language: &str, kind: &str) -> String {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 45 | `fn notification_text(` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 74 | `fn approved_scope(` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 113 | `pub(crate) fn ci_run_notify(` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |

## `apps/desktop/src-tauri/src/github_api.rs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 21 | `pub struct GitHubRestClient {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 25 | `impl GitHubRestClient {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 26 | `fn client(&self) -> Result<&Client, String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 42 | `fn api_http_failure(` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 57 | `pub(crate) fn valid_name(value: &str) -> bool {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 67 | `fn valid_utc_second_timestamp(timestamp: &str) -> bool {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 106 | `fn valid_path(requested: &str) -> bool {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 191 | `fn project_billing(value: Value) -> Result<Value, String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 226 | `fn project(path: &str, value: Value) -> Result<Value, String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 361 | `pub async fn github_api_get(app: AppHandle, path: String) -> Result<Value, String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |

## `apps/desktop/src-tauri/src/github_etag_cache.rs`

**Method assertion evidence:** [Auth ETag cache, monotonic rate gate and private OAuth wire parsers](method-assertions-github-cache-rate-wire.md). Direct pure Rust tests distinguished from native AppHandle/OS callbacks.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 25 | `pub struct GitHubETagCache {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 29 | `pub struct CacheLookup {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 34 | `fn valid_etag(etag: &str) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 43 | `fn cacheable(path: &str) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 48 | `impl GitHubETagCache {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 49 | `pub fn snapshot(&self, path: &str) -> CacheLookup {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 66 | `pub fn unchanged(&self, generation: u64) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 74 | `pub fn not_modified(&self, path: &str, lookup: &CacheLookup) -> Option<Value> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 88 | `pub fn invalidate(&self) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 96 | `pub fn save(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `apps/desktop/src-tauri/src/github_native.rs`

**Native GitHub adapter evidence:** [CredentialRecord serialization, Keyring and bounded OAuth HTTP](method-assertions-github-native-adapter.md). Four direct inline Rust method assertions; actual external HTTPS/Keyring remain pending.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 21 | `fn device_challenge_fields() -> [(&'static str, &'static str); 1] {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 26 | `pub enum NativeAuthError {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 40 | `pub struct CredentialRecord {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 48 | `impl std::fmt::Debug for CredentialRecord {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 49 | `fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 60 | `impl CredentialRecord {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 61 | `pub fn from_lease(lease: TokenLease, issued_at: u64) -> Result<Self, NativeAuthError> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 80 | `fn decode(body: &str) -> Result<Self, NativeAuthError> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 95 | `pub struct NativeCredentialStore;` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 97 | `impl NativeCredentialStore {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 100 | `fn entry() -> Result<keyring::Entry, NativeAuthError> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 105 | `pub fn load(&self) -> Result<Option<CredentialRecord>, NativeAuthError> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 114 | `pub fn replace(&self, record: &CredentialRecord) -> Result<(), NativeAuthError> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 123 | `pub fn clear(&self) -> Result<(), NativeAuthError> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 134 | `pub struct GithubOAuthHttp {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 138 | `impl GithubOAuthHttp {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 139 | `pub fn new() -> Result<Self, NativeAuthError> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 149 | `async fn submit(` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 188 | `pub async fn begin(&self, now: u64) -> Result<DeviceChallenge, NativeAuthError> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 195 | `pub async fn poll(&self, device_code: &str) -> Result<PollReply, NativeAuthError> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 209 | `pub async fn refresh(&self, refresh_token: &str) -> Result<TokenLease, NativeAuthError> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |

## `apps/desktop/src-tauri/src/github_oauth_wire.rs`

**Method assertion evidence:** [Auth ETag cache, monotonic rate gate and private OAuth wire parsers](method-assertions-github-cache-rate-wire.md). Direct pure Rust tests distinguished from native AppHandle/OS callbacks.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 14 | `pub enum WireError {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 20 | `pub struct DeviceChallenge {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 25 | `impl DeviceChallenge {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 26 | `pub fn device_code(&self) -> &str {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 31 | `impl std::fmt::Debug for DeviceChallenge {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 32 | `fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 41 | `pub struct TokenLease {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 48 | `impl std::fmt::Debug for TokenLease {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 49 | `fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 60 | `pub enum PollReply {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 65 | `fn object(input: &str) -> Result<Value, WireError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 76 | `fn valid_ascii_token(value: &str, max_len: usize) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 80 | `pub fn parse_device_challenge(input: &str, started_at: u64) -> Result<DeviceChallenge, WireError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 108 | `pub fn parse_token_reply(input: &str) -> Result<PollReply, WireError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `apps/desktop/src-tauri/src/github_rate_gate.rs`

**Method assertion evidence:** [Auth ETag cache, monotonic rate gate and private OAuth wire parsers](method-assertions-github-cache-rate-wire.md). Direct pure Rust tests distinguished from native AppHandle/OS callbacks.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 13 | `pub struct GitHubRateGate {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 17 | `impl GitHubRateGate {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 18 | `pub fn remaining_seconds(&self) -> u64 {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 29 | `pub fn defer(&self, duration: Duration) {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 38 | `fn bounded_seconds(input: Option<&str>) -> Option<u64> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 47 | `pub fn backoff_duration(` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 68 | `pub fn now_unix() -> u64 {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 77 | `pub fn github_api_cooldown_seconds(app: AppHandle) -> u64 {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |

## `apps/desktop/src-tauri/src/github_session.rs`

**Native OAuth session method evidence:** [GitHubAuthManager generation, redacted errors, Keyring and HTTP command gaps](method-assertions-github-auth-session.md). Eight helpers directly asserted by inline Rust tests; remaining actual native side effects require contracted external adapters.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 30 | `pub struct GitHubAuthManager {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 46 | `impl Default for AuthProgress {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 47 | `fn default() -> Self {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 55 | `impl GitHubAuthManager {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 56 | `fn invalidate(&self) -> u64 {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 62 | `fn active(&self, epoch: u64) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 66 | `fn progress(&self) -> AuthProgress {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 73 | `fn set_progress(&self, next: AuthProgress) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 88 | `pub struct GitHubAuthEvent {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 95 | `pub struct GitHubAuthChallenge {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 103 | `pub struct GitHubAuthStatus {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 110 | `fn unix_now() -> u64 {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 117 | `fn public_error(error: NativeAuthError) -> String {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 139 | `fn reason_category(error: NativeAuthError) -> &'static str {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 155 | `fn publish_with_reason(app: &AppHandle, status: &'static str, reason: Option<&'static str>) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 174 | `fn publish(app: &AppHandle, status: &'static str) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 183 | `pub fn cancel_pending(app: &AppHandle) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 190 | `async fn read_credential() -> Result<Option<CredentialRecord>, NativeAuthError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 196 | `async fn store_credential(record: CredentialRecord) -> Result<(), NativeAuthError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 202 | `async fn delete_credential() -> Result<(), NativeAuthError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 210 | `pub fn github_flow_status(app: AppHandle) -> GitHubAuthEvent {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 219 | `pub async fn github_auth_status(app: AppHandle) -> Result<GitHubAuthStatus, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 249 | `pub async fn github_begin(app: AppHandle) -> Result<GitHubAuthChallenge, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 286 | `async fn poll_authorization(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 388 | `fn valid_user_code(code: &str) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 401 | `pub fn github_copy_user_code(app: AppHandle, code: String) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 411 | `pub fn github_cancel(app: AppHandle) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 416 | `pub async fn github_disconnect(app: AppHandle) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 433 | `pub async fn github_access_token_with_cache(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 474 | `pub fn github_open_device_page() -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |

## `apps/desktop/src-tauri/src/linux_surface.rs`

**Reconciliation:** [GTK Layer Shell exact source methods and Wayland relative pointer callback](method-assertions-linux-layer-shell.md). The original lexical extractor omitted `extern "C" fn on_relative_motion` at line 51; it is now a separate OS_P entry, making this provisional inventory **708 rows**, not 707.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 13 | `fn repoticker_relative_init(callback: extern "C" fn(f64, f64)) -> i32;` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | FFI_DECL |
| 14 | `fn repoticker_relative_begin() -> i32;` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | FFI_DECL |
| 15 | `fn repoticker_relative_end();` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | FFI_DECL |
| 41 | `pub fn enabled() -> bool {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 45 | `pub fn visible() -> bool {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 51 | `extern "C" fn on_relative_motion(dx: f64, dy: f64) {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 100 | `pub fn install(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 200 | `fn install_usage_surface(` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 260 | `fn on_usage_main(` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 276 | `fn anchor_usage(window: &gtk::ApplicationWindow) {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 301 | `pub fn show_usage(app: &AppHandle) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 316 | `pub fn hide_usage(app: &AppHandle) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 323 | `fn set_exact_viewport_height(viewport: &gtk::ScrolledWindow, previous: i32, height: i32) {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 333 | `pub async fn resize_usage(app: AppHandle, height: i32) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 378 | `fn apply_size(window: &gtk::ApplicationWindow, width: i32, height: i32) {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 401 | `fn on_main(` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 419 | `fn apply_card_height(window: &gtk::ApplicationWindow, height: i32) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 458 | `fn validate_card_height(height: i32) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 467 | `pub fn request_resize(app: &AppHandle, height: i32) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 478 | `pub async fn resize(app: AppHandle, height: i32) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 499 | `pub fn show(app: &AppHandle) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 522 | `pub fn hide(app: &AppHandle) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 531 | `fn persist_now(app: &AppHandle) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 542 | `fn stop_on_gtk(app: &AppHandle) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 553 | `pub fn cancel_drag(app: &AppHandle) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 563 | `pub async fn start_drag(app: &AppHandle) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 585 | `pub async fn stop_drag(app: &AppHandle) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |

## `apps/desktop/src-tauri/src/linux_tray.rs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 15 | `impl LinuxTray {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 16 | `fn on_ui(&self, action: &'static str) {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 32 | `impl Tray for LinuxTray {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 33 | `fn id(&self) -> String {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 37 | `fn title(&self) -> String {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 41 | `fn icon_pixmap(&self) -> Vec<Icon> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 50 | `fn activate(&mut self, _x: i32, _y: i32) {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 54 | `fn menu(&self) -> Vec<MenuItem<Self>> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 96 | `pub fn install(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 112 | `pub(crate) fn set_language(app: &AppHandle, language: &str) {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |

## `apps/desktop/src-tauri/src/main.rs`

**Native method assertion ledger:** [Tauri main.rs OS/IPC source-to-test ownership](method-assertions-native-main-ipc.md). Six direct inline Rust helper tests are credited; native commands remain pending actual command-level and OS acceptance.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 59 | `impl Drop for ActiveFetchLease<'_> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 60 | `fn drop(&mut self) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 112 | `impl CiNotificationMode {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 113 | `fn allows(self, conclusion: &str) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 123 | `fn default_language() -> String {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 173 | `fn notify_progress(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 195 | `fn config_path(app: &AppHandle) -> Result<PathBuf, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 202 | `fn default_config() -> Config {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 217 | `fn read_config(app: &AppHandle) -> Result<Config, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 227 | `fn update_config<R>(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 236 | `fn roots_as_paths(config: &Config) -> Vec<PathBuf> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 240 | `fn decision_label(decision: SyncDecision) -> String {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 252 | `fn present(repo: RepoSnapshot) -> RepoSummary {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 266 | `fn scan(app: &AppHandle) -> Result<Snapshot, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 301 | `fn git_action_result(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 348 | `fn should_schedule_git_target(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 359 | `fn execute(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 501 | `async fn get_snapshot(app: AppHandle) -> Result<Snapshot, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 511 | `fn get_monitor_scope(app: AppHandle) -> Result<Option<String>, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 526 | `fn get_monitor_selection(app: AppHandle) -> Result<MonitorSelection, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 550 | `fn get_settings_config(app: AppHandle) -> Result<SettingsConfig, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 566 | `fn add_root(app: AppHandle, root: String) -> Result<Vec<String>, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 585 | `fn remove_root(app: AppHandle, root: String) -> Result<Vec<String>, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 598 | `fn cancel_git_fetch(app: AppHandle) -> Result<bool, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 612 | `async fn perform_git_action(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 623 | `fn resize_unmanaged_card(window: &tauri::WebviewWindow, height: f64) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 647 | `async fn set_card_view(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 683 | `fn ui_hover_debug_enabled() -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 688 | `fn trace_ui_hover(kind: String, stage: String, sequence: u32) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 724 | `fn get_usage_popup_kind() -> &'static str {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 737 | `fn footer_anchored_usage_position(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 756 | `fn position_unmanaged_usage_popup(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 807 | `fn show_usage_popup(app: AppHandle, kind: String) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 886 | `fn hide_usage_popup(app: AppHandle) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 911 | `async fn resize_usage_popup(app: AppHandle, height: i32) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 945 | `fn hide_card(app: AppHandle) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 967 | `fn show_compact_card(app: &AppHandle) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1017 | `fn show_settings(app: &AppHandle) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1044 | `fn show_about(app: &AppHandle) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1056 | `fn hide_about(app: AppHandle) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1071 | `fn get_about_info() -> AboutInfo {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1079 | `fn launch_browser(url: &str) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1094 | `fn open_project_website() -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1100 | `fn trusted_relay_resource_url(resource: &str) -> Option<&'static str> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 1111 | `fn open_relay_resource(window: tauri::WebviewWindow, resource: String) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1147 | `fn open_actions_job(url: String) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1177 | `fn enrolled_repository(app: &AppHandle, repo_path: &str) -> Result<PathBuf, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1190 | `async fn open_repository_on_github(app: AppHandle, repo_path: String) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1201 | `fn launch_file_manager(path: &std::path::Path) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1216 | `async fn open_repository_folder(app: AppHandle, repo_path: String) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1227 | `async fn copy_repository_path(app: AppHandle, repo_path: String) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1242 | `async fn start_card_drag(app: AppHandle) -> Result<bool, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1256 | `async fn stop_card_drag(app: AppHandle) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1276 | `fn open_settings(app: AppHandle) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1281 | `fn start_settings_drag(app: AppHandle) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1291 | `async fn select_repository_root(app: AppHandle) -> Result<Option<String>, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1315 | `fn clear_relay_url_for_polling(config: &mut Config) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 1324 | `fn save_settings(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1444 | `fn close_settings(app: AppHandle) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1620 | `fn validate_monitor_repositories(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 1651 | `fn github_set_monitor_org(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1685 | `fn set_language(app: AppHandle, language: String) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1699 | `fn toggle_card(app: &AppHandle) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1726 | `fn tray_image() -> Image<'static> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1732 | `fn build_desktop_tray_menu(app: &AppHandle, language: &str) -> tauri::Result<Menu<tauri::Wry>> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1780 | `fn refresh_tray_language(app: &AppHandle, language: &str) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1797 | `fn request_quit(app: &AppHandle) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1834 | `fn dispatch_menu_action(app: &AppHandle, operation: &'static str) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1844 | `fn configure_gdk_for_native_wayland() {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 1858 | `fn main() {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | BOOTSTRAP_P |

## `apps/desktop/src-tauri/src/monitor_cache.rs`

**Method-level reconciliation and NM1 trust-boundary blocker:** [native MonitorCache JSON projection, AppHandle publish and missing strict nested allowlist decision](method-assertions-native-monitor-cache.md). No source or schema change authorized.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 10 | `pub struct MonitorCache {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 20 | `impl Default for CacheState {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 21 | `fn default() -> Self {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 32 | `impl MonitorCache {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 33 | `pub fn read(&self) -> (bool, Option<Value>, Option<String>) {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 48 | `pub struct MonitorPresentation {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 55 | `pub fn github_monitor_snapshot(app: AppHandle) -> MonitorPresentation {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 69 | `fn default_status_is_unknown_until_wallet_verification() {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |
| 77 | `fn monitor_projection_uses_only_expected_fields() {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |
| 95 | `pub fn github_monitor_publish(` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |

## `apps/desktop/src-tauri/src/relay_endpoint.rs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 6 | `pub fn normalize_base_url(raw: &str) -> Result<String, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 43 | `pub fn websocket_url(base: &str, cursor: u64) -> Result<String, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 61 | `fn only_canonical_public_https_origins_are_stored() {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |
| 91 | `fn websocket_url_contains_only_cursor_and_validated_origin() {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |

## `apps/desktop/src-tauri/src/relay_secret.rs`

**Method-level native credential custody and inline-test inventory:** [relay_secret actual Rust assertions, Windows FFI/test-only and O3 gaps](method-assertions-relay-secret-native.md). Keyring implementation needs injected OS provider; no host credential operations performed.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 12 | `pub struct RelayPromptGate(AtomicBool);` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 17 | `pub struct RelaySecretDraftState(Mutex<Option<RelaySecretDraft>>);` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 24 | `fn lock_draft(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 33 | `pub(crate) fn discard_draft(app: &AppHandle) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 38 | `pub(crate) fn has_pending_draft(app: &AppHandle) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 45 | `impl Drop for PromptLease {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 46 | `fn drop(&mut self) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 51 | `fn enter_prompt(app: &AppHandle) -> Result<PromptLease, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 59 | `fn valid_secret(value: &str) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 66 | `fn entry() -> Result<keyring::Entry, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 71 | `pub(crate) fn read_secret() -> Result<Option<SensitiveSecret>, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 88 | `pub(crate) fn wipe(value: &mut String) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 103 | `impl SensitiveSecret {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 104 | `pub(crate) fn as_str(&self) -> &str {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 109 | `impl Drop for SensitiveSecret {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 110 | `fn drop(&mut self) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 115 | `fn store_secret(secret: &SensitiveSecret) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 124 | `fn remove_secret() -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 131 | `fn settings_only(window: &tauri::WebviewWindow) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 139 | `pub async fn relay_secret_status(window: tauri::WebviewWindow) -> Result<bool, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 162 | `pub async fn relay_prompt_secret(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 189 | `pub async fn relay_stage_secret(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 210 | `pub async fn relay_clear_secret(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 224 | `pub async fn relay_commit_secret_draft(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 272 | `async fn prompt_native(app: &AppHandle) -> Result<Option<String>, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 320 | `async fn prompt_native(_app: &AppHandle) -> Result<Option<String>, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 327 | `async fn prompt_native(_app: &AppHandle) -> Result<Option<String>, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 346 | `fn CredUIPromptForCredentialsW(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | FFI_DECL |
| 366 | `fn wide(text: &str) -> Vec<u16> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 370 | `pub(super) fn prompt() -> Result<Option<String>, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 437 | `fn relay_credential_isolated_from_github_auth_record() {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |
| 443 | `fn strict_base64url_secret_policy_does_not_accept_untrusted_bytes() {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |
| 462 | `fn replacing_draft_wipes_candidate_without_keyring_write() {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |
| 479 | `fn wipes_owned_secret_buffer() {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |

## `apps/desktop/src-tauri/src/relay_transport.rs`

**Method assertion ledger:** [WSS Relay supervisor, finite diagnostics and native transport acceptance](method-assertions-relay-transport-supervisor.md). Two Rust test declarations are TEST_ONLY, not production methods.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 35 | `pub struct RelayTransportState {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 47 | `pub struct RelayPhaseEvent {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 52 | `fn phase_label(code: u8) -> &'static str {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 61 | `fn reason_label(code: u8) -> &'static str {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 84 | `fn http_failure_code(status: u16) -> u8 {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 94 | `fn handshake_failure_code(error: &tokio_tungstenite::tungstenite::Error) -> u8 {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 104 | `fn snapshot(code: u8) -> RelayPhaseEvent {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 111 | `fn set_phase(app: &AppHandle, code: u8) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 136 | `pub fn relay_connection_status(app: AppHandle) -> &'static str {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 145 | `pub fn relay_connection_diagnostics(app: AppHandle) -> RelayPhaseEvent {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 153 | `fn backoff(attempt: u32) -> Duration {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 159 | `pub fn restart(app: &AppHandle) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 179 | `fn send_reconcile(app: &AppHandle, decision: RelayDecision) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 188 | `async fn run(app: AppHandle) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 344 | `fn reconnect_is_bounded_without_unlimited_retry_frequency() {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |
| 352 | `fn public_availability_is_only_fixed_nonsecret_phase_data() {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |

## `apps/desktop/src-tauri/src/startup_diagnostics.rs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 9 | `pub fn initialize() {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 13 | `fn enabled() -> bool {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 17 | `fn write(stage: &'static str, elapsed: Duration) {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 29 | `pub struct Span {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 34 | `impl Span {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 35 | `pub fn new(stage: &'static str) -> Self {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 43 | `impl Drop for Span {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 44 | `fn drop(&mut self) {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 53 | `fn allowed_stage(stage: &str) -> Option<&'static str> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 71 | `pub fn trace_startup_stage(stage: String) {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 85 | `fn only_fixed_nonsecret_startup_milestones_are_accepted() {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |

## `apps/desktop/src-tauri/src/tray_i18n.rs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 8 | `fn catalog() -> &'static Catalog {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |
| 16 | `pub(crate) fn is_supported_locale(language: &str) -> bool {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |
| 20 | `fn text(language: &str, english: &'static str) -> &'static str {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |
| 29 | `pub(crate) fn label(language: &str, action: &str) -> &'static str {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |
| 42 | `pub(crate) fn window_title(language: &str, window: &str) -> &'static str {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |
| 55 | `fn native_registry_contains_exactly_twenty_locales() {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N6,N8,N9,N10 | TEST_ONLY |
| 69 | `fn every_native_action_and_title_has_a_bundled_string() {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N6,N8,N9,N10 | TEST_ONLY |
| 85 | `fn unknown_tray_action_is_not_a_command() {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N6,N8,N9,N10 | TEST_ONLY |

## `apps/desktop/src-tauri/src/windows_geometry.rs`

**Method assertion receipt:** [Windows placement pure tests, OS z-order and Win32 region ownership](method-assertions-windows-geometry.md). Four inline test functions and four FFI declarations are not independent production methods.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 10 | `fn placement(` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 25 | `fn monitor_area(window: &WebviewWindow) -> Result<Option<((i64, i64), (i64, i64))>, String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 44 | `pub(crate) fn restore(app: &AppHandle, window: &WebviewWindow) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 73 | `pub(crate) fn save(app: &AppHandle, window: &WebviewWindow) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_NATIVE |
| 97 | `fn restores_position_for_bottom_right_work_area() {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |
| 105 | `fn keeps_bottom_edge_when_view_grows() {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |
| 113 | `fn supports_negative_monitor_coordinates_and_high_dpi_sizes() {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |
| 121 | `fn clamps_stale_margins_and_oversized_windows() {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |
| 136 | `fn SetWindowPos(` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | FFI_DECL |
| 150 | `pub(crate) fn raise_usage_popup(popup: &WebviewWindow) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 183 | `fn CreateRoundRectRgn(` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | FFI_DECL |
| 191 | `fn DeleteObject(handle: *mut std::ffi::c_void) -> i32;` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | FFI_DECL |
| 196 | `fn SetWindowRgn(hwnd: *mut std::ffi::c_void, region: *mut std::ffi::c_void, redraw: i32)` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | FFI_DECL |
| 202 | `pub(crate) fn clip_usage_popup(popup: &WebviewWindow) -> Result<(), String> {` | High | Rust unit + native integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |

## `apps/desktop/ui/about.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 7 | `const invoke = command => window.__TAURI__?.core?.invoke(command) ??` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 11 | `function paintLocale(value) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 26 | `async function refreshLocale() {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 55 | `function closeAbout() {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |

## `apps/desktop/ui/app.mjs`

**Method-level reconciliation:** [all main-card controller owners and missing A1 imported-DOM assertions](method-assertions-main-card-controller.md). `P_CONTROLLER` and `CALLBACK_P` indicate missing actual controller test evidence, not observed product failures.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 21 | `const byId = id => document.getElementById(id);` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ADAPTER |
| 23 | `const invoke = (command, args = {}) => {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ADAPTER |
| 29 | `const traceStartup = stage => {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 51 | `function updateReposActivity() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 63 | `function cancelAutoHide() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 66 | `function armAutoHide() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 86 | `function paintNotice() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 97 | `function showError(message) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 101 | `function showResizeError(message) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 105 | `function showGitOperationErrors(count, message) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 109 | `function clearError() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 113 | `function addText(parent, tag, value, className = "") {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 125 | `function hideRepoMenus(restoreFocus = false) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 136 | `function showRepoMenu(button, repoPath) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 215 | `function paintCiIndicator(row, repo) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 232 | `function updateCiStatuses(next) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 241 | `function makeRepoRow(repo) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 272 | `function updateActionState() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 320 | `function traceHover(kind, stage) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 336 | `function setActiveTooltip(kind) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 343 | `function resetQuota() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 352 | `function setQuotaOpen(kind = null) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 400 | `const enter = () => {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | CALLBACK_P |
| 430 | `function monitorRefreshState(kind, active) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 439 | `function clearBrowserTooltips() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 445 | `function updateMetricAccessibleNames() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 452 | `function setCardLanguage(language) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 492 | `function renderMonitorMetrics(state) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 503 | `function traceMonitorReady() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 509 | `function render(next) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 545 | `render(reconcileScanPresentation(next, snapshot, revision, monitorRevision));` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | CALL_SITE |
| 554 | `function refresh() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 560 | `async function refreshMonitor() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 574 | `function consumeResults(results) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 582 | `async function cancelActiveFetch() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 595 | `async function runGitAction(operation, repoPath = null) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 612 | `render(snapshot);` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | CALL_SITE |
| 615 | `function resetView() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 624 | `async function openView(target) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 713 | `refresh();` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | CALL_SITE |
| 718 | `function refreshCardConfiguration() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |
| 745 | `refresh();` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | STARTUP_CALL |
| 762 | `function stopDragging(event = null) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CONTROLLER |

## `apps/desktop/ui/browser-context-menu.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 2 | `export function disableBrowserContextMenu(documentRef) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `apps/desktop/ui/card-i18n.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 111 | `export function cardText(language, key, value) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |
| 130 | `function countText(language, value) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | I_PARTIAL |
| 141 | `export function metricAccessibleLabel(language, kind, counts, busy = false) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |
| 154 | `export function cardNoticeText(language, notice) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |

## `apps/desktop/ui/ci-failure-events.mjs`

**Direct assertion reconciliation:** [runner/CI collector method-level evidence](method-assertions-runner-ci-collectors.md). Real exported methods are directly tested; private helpers are exercised only through those subjects.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 6 | `const canonicalUtc = value => {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 18 | `function validateSelection(account, repositories) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 39 | `function validRun(run) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 51 | `export async function collectRecentCompleted({` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 92 | `export function createCiFailureTracker({ maxRemembered = 500 } = {}) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `apps/desktop/ui/ci-status.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 4 | `const identity = fullName => {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 12 | `export function projectLatestCiStatuses(account, observations) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 31 | `export function ciOutcomeForRepo(repo, statuses) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `apps/desktop/ui/github-billing.mjs`

**Actual assertion reconciliation:** [Quota display and authenticated GitHub billing projections](method-assertions-quota-billing-models.md). E is a direct call in real Node tests; I denotes internal execution via real models, never full branch closure.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 8 | `export function billingMonth(now = new Date()) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 14 | `export function knownPersonalAllowance(plan) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 25 | `export function knownOrganizationAllowance(plan) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 33 | `export function reportedActionsMinutes(payload) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 49 | `const unavailable = reason => ({` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 54 | `export async function collectBillingUsage({ get, organization, now = new Date() }) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 60 | `async function fetchOrganization() {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 91 | `async function fetchPersonal() {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 121 | `export function createBillingCache({ get, now = () => Date.now(),` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 130 | `function clear() {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 136 | `async function load(organization, connected) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |

## `apps/desktop/ui/github-errors.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 19 | `export function githubFailureReason(error) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 26 | `export function githubFailureMessage(reason, scope = "monitor") {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 52 | `export function mostImportantGithubFailure(failures) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `apps/desktop/ui/github-installations.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 5 | `const validAccountName = name => typeof name === "string" &&` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 8 | `export async function listAvailableInstallations(get) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `apps/desktop/ui/github-monitor.mjs`

**Per-method assertion reconciliation:** [GitHub Monitor direct and private callback evidence](method-assertions-github-monitor.md). Statuses credit actual controller tests, never a branch-completeness certificate.

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 15 | `export function monitorRefreshDelay(repositoryCount) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 23 | `const validAccountName = name => typeof name === "string" &&` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 27 | `export async function listInstalledRepositories(get, owner, installationId,` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 59 | `export async function collectForAccount({` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 120 | `export function mergeMetricGroup(previous, next, kind) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 127 | `const priorClock = field => Object.hasOwn(previous, field)` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | INLINE |
| 155 | `export function invalidateMetricGroup(previous, kind) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 186 | `export function startGithubMonitoring({ invoke, event, onError = () => {},` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 206 | `const get = path => invoke("github_api_get", { path });` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | INLINE |
| 207 | `function publish(connected, runnerState = null, message = null,` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 216 | `function invalidatePresentation(message) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 228 | `async function applyCooldown(reason) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 238 | `async function refresh(force = false, kind = "all") {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 411 | `function applyRelayPhase(phase) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |

## `apps/desktop/ui/locale-auth.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| — | No named function extracted: module entrypoint / data / anonymous handlers require source inspection | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | DATA_ONLY |

## `apps/desktop/ui/locale-card.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| — | No named function extracted: module entrypoint / data / anonymous handlers require source inspection | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | DATA_ONLY |

## `apps/desktop/ui/locale-catalog.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 1032 | `export function normalizeLocale(value) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | I_PARTIAL |
| 1035 | `export function localeName(value) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | P |
| 1038 | `export function localeDirection(value) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | P |
| 1041 | `export function coreText(value, english) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |

## `apps/desktop/ui/locale-counts.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 157 | `function countText(locale, count) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | I_PARTIAL |
| 164 | `function render(template, values) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | I_PARTIAL |
| 168 | `export function repositorySelectionMessage(language, {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |

## `apps/desktop/ui/locale-errors.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 1050 | `export function localizedKnownError(language, value) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |

## `apps/desktop/ui/locale-extended.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| — | No named function extracted: module entrypoint / data / anonymous handlers require source inspection | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | DATA_ONLY |

## `apps/desktop/ui/locale-plurals.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 67 | `export function localizedGitCount(language, key, count) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |

## `apps/desktop/ui/locale-surface.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| — | No named function extracted: module entrypoint / data / anonymous handlers require source inspection | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | DATA_ONLY |

## `apps/desktop/ui/locale-workflow.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| — | No named function extracted: module entrypoint / data / anonymous handlers require source inspection | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | DATA_ONLY |

## `apps/desktop/ui/model.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 1 | `export function summarize(snapshot) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |
| 14 | `export function safeRunUrl(url) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |
| 27 | `export function safeActionsJobUrl(url) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |
| 34 | `const validName = name => /^[A-Za-z0-9_.-]+$/.test(name) && name !== "." && name !== "..";` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |
| 35 | `const validNumber = num => /^[0-9]+$/.test(num);` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |

## `apps/desktop/ui/monitor-presentation.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 4 | `export function mergeMonitorPresentation(local, remote) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 18 | `export function reconcileScanPresentation(next, current, before, after) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `apps/desktop/ui/native-drag.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 5 | `export function createNativeDragGesture({ start, stop, onError }) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |
| 9 | `function enqueue(action) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |

## `apps/desktop/ui/quota-details.mjs`

**Actual assertion reconciliation:** [Quota display and authenticated GitHub billing projections](method-assertions-quota-billing-models.md). E is a direct call in real Node tests; I denotes internal execution via real models, never full branch closure.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 6 | `function displayLocale(language) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 15 | `const hasRunnerName = value => typeof value === "string" && Boolean(value.trim());` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 16 | `export function displayRunnerName(value) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 29 | `export function localCheckedTime(value, timeZone, language = "en") {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 36 | `const view = (status, sections, message = "") => ({` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 39 | `const notReady = (authorized, topic, reason) => ({` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 49 | `export function isHoverKind(kind) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 53 | `function runnerDetails(state) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 65 | `function tasksDetails(state) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 87 | `function billingDetails(billing = null, language = "en") {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 88 | `const fmt = value => Number.isFinite(value) && value >= 0` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | INLINE |
| 112 | `export function buildHoverDetails(state, kind = "billing", authorized = false, statusMessage = null, billing = null, language = "en") {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 132 | `export function buildQuotaDetails(state, authorized = false, statusMessage = null, billing = null) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `apps/desktop/ui/quota-size.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 10 | `export function usageHeight(titleHeight, contentHeights) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `apps/desktop/ui/quota.mjs`

**Per-method assertion reconciliation:** [Quota imported-controller method and pending callback cases](method-assertions-quota-controller.md). Two bridge adapters are classified ADAPTER, both hover-kind callback entrypoints P; no all-branches-complete claim.

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 11 | `const byId = id => document.getElementById(id);` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ADAPTER |
| 12 | `const invoke = (name, args = {}) => window.__TAURI__.core.invoke(name, args);` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ADAPTER |
| 13 | `function add(parent, tag, value, cls = "") {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 20 | `function line(parent, label, value, providerName = false) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 31 | `function setLocale(value) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 40 | `function paint(details, runnerNameRows = 0) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 103 | `function invalidateBilling() {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 112 | `function statusUnavailable(message) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 117 | `export function selectedOrganization(snapshot) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 129 | `function paintSnapshot(snapshot) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 136 | `function scheduleBilling(snapshot) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 156 | `async function refresh() {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 196 | `async function refreshMonitorOnly() {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 222 | `async function refreshLocale() {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 234 | `function subscribe(eventName, handler = refresh) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 251 | `function applyHoverKind(kind) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P |
| 264 | `async function onUsageShown() {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P |

## `apps/desktop/ui/repo-menu.mjs`

**Per-method assertion reconciliation:** [Git UI exports and scan queue direct assertions](method-assertions-git-ui-queue.md). Evidence remains partial; inline predicate is not independently exported.

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 3 | `export function placeRepoMenu(anchor, drawer, menu, gap = 4) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `apps/desktop/ui/repo-row-indicator.mjs`

**Per-method assertion reconciliation:** [Git UI exports and scan queue direct assertions](method-assertions-git-ui-queue.md). Evidence remains partial; inline predicate is not independently exported.

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 3 | `export function repoRowIndicator(repo, outcome = null) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 4 | `const valid = value => Number.isSafeInteger(value) && value >= 0;` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | INLINE |

## `apps/desktop/ui/runner-collector.mjs`

**Direct assertion reconciliation:** [runner/CI collector method-level evidence](method-assertions-runner-ci-collectors.md). Real exported methods are directly tested; private helpers are exercised only through those subjects.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 10 | `async function getPages(get, pathForPage, key, maxPages) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 22 | `async function boundedMap(items, parallel, process) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 41 | `function limitRequests(get, limit) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 44 | `function dispatch() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | INLINE |
| 65 | `export async function collectRunnerState({` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 177 | `const priorClock = (state, field) => state && Object.hasOwn(state, field)` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | INLINE |

## `apps/desktop/ui/runner-state.mjs`

**Method-to-test mapping:** [real runner/job lane projection, strict source coverage and unknown-not-zero](method-assertions-runner-state.md). Functions are tested directly except nested/private helpers; zero on incomplete data is forbidden.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 5 | `const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 6 | `const label = value => typeof value === "string" ? value.trim().toLowerCase() : "";` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 8 | `export function normalizeLabels(values) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 20 | `export function runnerLabelCompatible(jobLabels, runnerLabels) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 29 | `export function isStandardGitHubHostedLabel(value) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 36 | `export function classifyJobLane(job, knownRunnerIds = new Set()) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 48 | `function laneCounts(jobs, ids) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 63 | `export function summarizeRunnerState({` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 124 | `const exact = value => jobsComplete ? value : null;` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | INLINE |

## `apps/desktop/ui/scan-refresh.mjs`

**Per-method assertion reconciliation:** [Git UI exports and scan queue direct assertions](method-assertions-git-ui-queue.md). Evidence remains partial; inline predicate is not independently exported.

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 10 | `export function shouldSpinForRepos(scanActive, hasCachedSnapshot) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 14 | `export function createScanRefreshQueue({ scan, publish, onError,` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 23 | `async function drain() {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |

## `apps/desktop/ui/settings-i18n.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 147 | `export function settingsText(language, english) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |

## `apps/desktop/ui/settings.mjs`

**Method-level assertion receipts:** [actual imported Settings controller, 132 tests, direct UI assertions and native boundary gaps](method-assertions-settings-controller.md). `I_PARTIAL` credits behavior through the real controller with external IPC fakes, never live native Keyring.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 9 | `const byId = id => document.getElementById(id);` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ADAPTER |
| 11 | `const t = english => settingsText(uiLocale, english);` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ADAPTER |
| 14 | `function applySettingsLanguage(value) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 62 | `function confirmedRelayConnection() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 69 | `function syncWorkerControls() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 121 | `function applyRelayPhase(status) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 146 | `const invoke = (command, args = {}) => window.__TAURI__?.core?.invoke(command, args) ??` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ADAPTER |
| 153 | `const traceStartup = stage => {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P |
| 168 | `function renderRelaySecretState() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 193 | `async function refreshRelaySecretStatus(revision = settingsRefreshRevision) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 246 | `async function refreshRelayConnectionStatus(revision = settingsRefreshRevision) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 284 | `const validRepoName = name => REPO_NAME.test(name) &&` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 288 | `const sameGithubIdentity = (a, b) => typeof a === "string" &&` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 290 | `const containsGithubIdentity = (items, name) =>` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 292 | `function normalizeRepoDraft() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 295 | `function updateRepoDirty() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 300 | `function repoChoiceValid() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 307 | `function renderRepoChoices() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 363 | `async function refreshRepoInventory() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 417 | `function clearMonitorScopes() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 431 | `async function refreshMonitorScopes() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 534 | `function stopGithubStatusUpdates() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 543 | `function startGithubStatusUpdates() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 567 | `function githubMessage(text, error = false) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 578 | `function githubButtons() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 624 | `async function refreshGithub(knownAuth = null) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 777 | `function message(text, error = false) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 782 | `function validRelayUrl(value) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 802 | `function validRelayDraft() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 808 | `const candidateValid = (32 <= candidate.length && candidate.length <= 256) &&` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | LOCAL_EXPR |
| 815 | `function syncConnectionAvailability() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 821 | `function pollingNeedsRelayCleanup() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 826 | `function isDirty() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 840 | `function updateApply() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 842 | `const authNeedsConfirmation = (githubConnected && githubStartedHere) \|\| disconnectPending;` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | LOCAL_EXPR |
| 849 | `function displayRootPath(path) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 860 | `function renderRoots() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 888 | `function renderIgnoredChildren() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 939 | `async function refresh() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 1115 | `function updateLanguagePicker() {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 1122 | `function closeLanguagePicker(returnFocus = false) {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 1128 | `function openLanguagePicker(position = "selected") {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 1192 | `const cancelSettings = async () => {` | High | Node domain/DOM + minimal OS smoke | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |

## `apps/desktop/ui/status-metrics.mjs`

**Per-method assertion reconciliation:** [status-metrics actual/indirect source evidence](method-assertions-status-metrics.md). This segment distinguishes two exported methods and one inline predicate; statuses are not branch-closure certificates.

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 2 | `export const shown = n => Number.isSafeInteger(n) && n >= 0 ? String(n) : "—";` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 4 | `export function compactStatus(state) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 8 | `const valid = n => Number.isSafeInteger(n) && n >= 0;` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | INLINE |

## `apps/desktop/ui/surface-i18n.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 57 | `export function surfaceText(language, key) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |
| 64 | `function isolatedValue(language, value) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | I_PARTIAL |
| 68 | `function translatedStatus(language, status) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | I_PARTIAL |
| 83 | `function translatedMessage(language, message) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | I_PARTIAL |
| 98 | `export function translateHoverDetails(details, language, runnerNameRows = 0) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N6,N8,N9,N10 | E_PARTIAL |

## `apps/desktop/ui/view.mjs`

**Per-method assertion reconciliation:** [Git UI exports and scan queue direct assertions](method-assertions-git-ui-queue.md). Evidence remains partial; inline predicate is not independently exported.

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 8 | `export function nextCardView(current, requested) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 14 | `export function cardWindowHeight(view, repositoryCount = 0) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 26 | `export function pullReadyCommitCount(repositories = []) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 39 | `export function syncReadyCommitCount(repositories = []) {` | Medium | Node domain/DOM + minimal OS smoke | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `apps/relay-cloudflare/src/hub.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 14 | `export class RelayHubController {` | Critical | Node unit + Worker isolated integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | CLASS_DECL |
| 15 | `constructor(ctx, env, platform = {}) {` | Critical | Node unit + Worker isolated integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | CLASS_METHOD |
| 29 | `history(after) {` | Critical | Node unit + Worker isolated integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | CLASS_METHOD |
| 52 | `ingest(delivery, repository) {` | Critical | Node unit + Worker isolated integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | CLASS_METHOD |
| 85 | `broadcast(hint) {` | Critical | Node unit + Worker isolated integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | CLASS_METHOD |
| 139 | `webSocketMessage(socket, message) {` | Critical | Node unit + Worker isolated integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | CLASS_METHOD |
| 144 | `webSocketClose(socket, code, reason) {` | Critical | Node unit + Worker isolated integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | CLASS_METHOD |

## `apps/relay-cloudflare/src/index.ts`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 6 | `export class RelayHub extends DurableObject {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | CLASS_DECL |
| 8 | `constructor(ctx: DurableObjectState, env: any) {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | CLASS_METHOD |
| 12 | `fetch(request: Request): Promise<Response> { return this.hub.fetch(request); }` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | CLASS_METHOD |
| 13 | `webSocketMessage(socket: WebSocket, message: string \\| ArrayBuffer): void {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | CLASS_METHOD |
| 16 | `webSocketClose(socket: WebSocket, code: number, reason: string): void {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | CLASS_METHOD |
| 22 | `fetch(request: Request, env: any): Promise<Response> {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | CLASS_METHOD |

## `apps/relay-cloudflare/src/relay-protocol.mjs`

**Method assertion evidence:** [Cloudflare Relay allowlists, body bounds and constant-time bearer authorization](method-assertions-cloudflare-relay-protocol.md). Nine exports are directly exercised by actual Node tests; no hosted Worker deployed.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 11 | `export function canonicalRepository(value) {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | E_PARTIAL |
| 19 | `export function allowedRepositories(raw) {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | E_PARTIAL |
| 40 | `export function isAllowedRepository(allowlist, value) {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | E_PARTIAL |
| 49 | `export function validDeliveryId(value) {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | E_PARTIAL |
| 53 | `export function parseCursor(raw) {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | E_PARTIAL |
| 60 | `export function cursorFromUrl(url) {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | E_PARTIAL |
| 68 | `export function validatedWorkflowEvent(payload, eventName, allowlist) {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | E_PARTIAL |
| 92 | `export async function boundedRequestBody(request, limit = BODY_LIMIT) {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | E_PARTIAL |
| 125 | `export async function validClientAuthorization(header, expectedSecret) {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | E_PARTIAL |

## `apps/relay-cloudflare/src/webhook-verify.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 5 | `export async function verifyGithubWebhookSignature(rawBody, signatureHeader, secret) {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | ? |

## `apps/relay-cloudflare/src/worker.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 51 | `export async function handleRelayRequest(request, env) {` | Critical | Node unit + Worker isolated integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | ? |

## `crates/repoticker-core/src/bounded.rs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 7 | `pub fn bounded_map<T, R, Work, Start, Complete>(` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `crates/repoticker-core/src/config_store.rs`

**Method assertion receipts:** [real JsonStore atomicity, backup recovery and storage fault cases](method-assertions-config-store.md). Source tests are actual filesystem tests with temporary paths; no owner config file was touched.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 14 | `fn backup_path(path: &Path) -> PathBuf {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 21 | `fn sibling_name(path: &Path, suffix: &str) -> PathBuf {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 30 | `fn create_private(path: &Path) -> io::Result<File> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 46 | `impl Drop for StagingFile {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 47 | `fn drop(&mut self) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 54 | `fn sync_directory(parent: &Path) -> io::Result<()> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 66 | `fn atomic_replace(path: &Path, bytes: &[u8]) -> io::Result<()> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 94 | `fn load(path: &Path) -> Result<Option<Vec<u8>>, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 102 | `fn quarantine_corrupt(path: &Path, raw: &[u8]) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 127 | `pub fn read_json<T: DeserializeOwned>(path: &Path) -> Result<Option<T>, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 163 | `pub fn save_json<T: Serialize + DeserializeOwned>(path: &Path, value: &T) -> Result<(), String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 178 | `pub struct JsonStore(std::sync::Mutex<()>);` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 180 | `impl JsonStore {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 181 | `pub fn read<T: DeserializeOwned>(&self, path: &Path) -> Result<Option<T>, String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 186 | `pub fn update<T, R>(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `crates/repoticker-core/src/git.rs`

**Method-level Git Core assertion ledger:** [Git safety, owned child process cancellation and no-force push](method-assertions-git-core.md). Direct behavioral assertions are distinguished from platform-only and private helper paths; Windows inline test methods classified TEST_ONLY.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 17 | `pub struct GitError(pub String);` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 19 | `impl fmt::Display for GitError {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 20 | `fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 25 | `impl std::error::Error for GitError {}` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 40 | `fn configure_background_child(command: &mut Command) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 47 | `fn configure_background_child(_command: &mut Command) {}` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 53 | `fn check_git_process_startup(output: &Output) -> Result<(), GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 62 | `fn is_git_process_startup_failure(error: &GitError) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 74 | `fn git_command(repo: &Path, args: &[&str]) -> Command {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 97 | `pub struct FetchCancellation {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 101 | `impl FetchCancellation {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 102 | `pub fn is_cancelled(&self) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 112 | `pub fn cancel(&self) -> Result<bool, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 116 | `fn cancel_with(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 149 | `fn register(&self, pid: u32) -> Result<bool, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 161 | `fn unregister(&self, pid: u32) -> Result<bool, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 172 | `fn terminate_fetch_group(pid: u32) -> Result<(), GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 177 | `fn kill(pid: i32, signal: i32) -> i32;` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | FFI_DECL |
| 190 | `fn terminate_fetch_group(pid: u32) -> Result<(), GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 223 | `fn terminate_fetch_group(_pid: u32) -> Result<(), GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 232 | `fn classify_fetch_completion(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 245 | `fn fetch_was_interrupted(status: &std::process::ExitStatus) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | I_PARTIAL |
| 251 | `fn fetch_was_interrupted(status: &std::process::ExitStatus) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 257 | `fn fetch_was_interrupted(_status: &std::process::ExitStatus) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | OS_P |
| 264 | `fn unregistered_fetch_cleanup_error(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 286 | `fn run_cancellable_command(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 301 | `fn run_cancellable_command_with_timeout(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 367 | `pub struct RepoSnapshot {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 381 | `pub enum OperationOutcome {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 389 | `fn drain_git_pipe<R: Read + Send + 'static>(mut reader: R) -> mpsc::Receiver<io::Result<Vec<u8>>> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 402 | `fn receive_owned_pipe(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 438 | `fn wait_owned_child(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 508 | `fn run_bounded_command(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 528 | `fn invoke(repo: &Path, args: &[&str]) -> Result<Output, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 556 | `fn stderr(output: &Output) -> String {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 562 | `fn required(repo: &Path, args: &[&str]) -> Result<String, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 574 | `fn optional(repo: &Path, args: &[&str]) -> Result<Option<String>, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 585 | `fn looks_like_checkout(path: &Path, allow_worktree: bool) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 590 | `fn verified_checkout(path: &Path) -> Result<bool, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 602 | `fn ignored_child(path: &Path) -> bool {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 619 | `pub fn validate_ignored_child_names(names: Vec<String>) -> Result<Vec<String>, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 644 | `pub fn discover_with_ignored(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 699 | `pub fn discover(root: &Path) -> Result<Vec<PathBuf>, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 703 | `pub fn discover_all_with_ignored(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 719 | `pub fn discover_all(roots: &[PathBuf]) -> (Vec<PathBuf>, Vec<String>) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 724 | `pub fn resolve_enrolled_checkout_with_ignored(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 741 | `pub fn resolve_enrolled_checkout(roots: &[PathBuf], requested: &str) -> Result<PathBuf, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 745 | `pub fn normalize_root(path: &str) -> Result<PathBuf, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 775 | `pub fn inspect_all(repositories: Vec<PathBuf>) -> Vec<(PathBuf, Result<RepoSnapshot, GitError>)> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 795 | `pub fn inspect(repo: &Path) -> Result<RepoSnapshot, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 873 | `fn git_operation_in_progress(repo: &Path) -> Result<bool, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 895 | `pub fn github_remote_to_browser_url(remote: &str) -> Option<String> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 924 | `pub fn github_origin_url(repo: &Path) -> Result<String, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 934 | `pub fn fetch(repo: &Path) -> Result<OperationOutcome, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 945 | `pub fn fetch_with_cancel(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 974 | `fn commit_oid(repo: &Path, revision: &str) -> Result<String, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 986 | `fn pull_source_unchanged(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 1003 | `fn safe_pull_with_checkpoints(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 1055 | `fn safe_push_source_unchanged(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | P_CORE |
| 1079 | `fn parse_single_remote_branch(raw: &str, branch_ref: &str) -> Result<String, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 1102 | `pub fn safe_push(repo: &Path) -> Result<OperationOutcome, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 1108 | `fn safe_push_with_checkpoint(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 1232 | `pub fn safe_sync(repo: &Path) -> Result<OperationOutcome, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 1244 | `pub fn safe_pull(repo: &Path) -> Result<OperationOutcome, GitError> {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 1260 | `fn loader_failure_reports_ntstatus_without_leaking_command_or_repo_path() {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |
| 1272 | `fn ordinary_failure_remains_a_regular_git_exit_status() {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |
| 1282 | `fn headless_git_command_executes_without_losing_output() {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |
| 1292 | `fn headless_child_creation_preserves_exit_status() {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TEST_ONLY |

## `crates/repoticker-core/src/github_auth.rs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 9 | `pub enum AuthError {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 14 | `pub enum DeviceResponse {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 27 | `pub enum DevicePhase {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 37 | `pub enum PollDecision {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 45 | `pub struct DeviceSession {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 54 | `impl DeviceSession {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 55 | `pub fn new(` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 91 | `pub fn next_poll(&mut self, now: u64) -> PollDecision {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 107 | `pub fn receive(&mut self, response: DeviceResponse, now: u64) -> DevicePhase {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 135 | `pub fn cancel(&mut self) {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 143 | `pub struct TokenExpiration {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 149 | `pub enum TokenAction {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 155 | `impl TokenExpiration {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 156 | `pub fn decide(self, now: u64, refresh_margin_seconds: u64) -> TokenAction {` | Critical | Rust unit + native integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `crates/repoticker-core/src/lib.rs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 12 | `pub struct RepositoryState {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 21 | `pub enum SyncDecision {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 32 | `pub fn classify_sync(state: RepositoryState) -> SyncDecision {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `crates/repoticker-core/src/relay.rs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 10 | `pub enum RelayFrame {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | TYPE_DECL |
| 17 | `pub enum RelayDecision {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | TYPE_DECL |
| 23 | `fn valid_component(value: &str) -> bool {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | I_PARTIAL |
| 33 | `fn canonical_repo(value: &str) -> Option<String> {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | I_PARTIAL |
| 47 | `pub fn parse_frame(raw: &[u8]) -> Result<RelayFrame, &'static str> {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | E_PARTIAL |
| 81 | `pub struct RelayCursor {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | TYPE_DECL |
| 88 | `impl RelayCursor {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | IMPL_BLOCK |
| 89 | `pub fn new(account: &str, selected: &[String]) -> Result<Self, &'static str> {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | E_PARTIAL |
| 109 | `pub fn cursor(&self) -> u64 {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | E_PARTIAL |
| 113 | `pub fn observe(&mut self, frame: RelayFrame) -> RelayDecision {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 | E_PARTIAL |

## `crates/repoticker-core/src/shutdown.rs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 7 | `pub struct ShutdownSignal(AtomicBool);` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | TYPE_DECL |
| 9 | `impl ShutdownSignal {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | IMPL_BLOCK |
| 11 | `pub fn begin(&self) -> bool {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |
| 15 | `pub fn is_requested(&self) -> bool {` | Medium | Rust unit + native integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | E_PARTIAL |

## `scripts/accept_autostart_linux.sh`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| — | No named function extracted: module entrypoint / data / anonymous handlers require source inspection | Medium | Shell contract + isolated subprocess | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |

## `scripts/accept_autostart_windows.ps1`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| — | No named function extracted: module entrypoint / data / anonymous handlers require source inspection | Medium | Shell contract + isolated subprocess | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |

## `scripts/apt_repository.py`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 17 | `def invoke(*args, env=None, input_data=None):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | ? |
| 21 | `def sha256(path):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | ? |
| 29 | `def package_field(deb, field):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | ? |
| 33 | `def assemble(deb: Path, out: Path, version: str, gpg_home: Path,` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | ? |
| 100 | `def verify(root, keyring):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | ? |
| 112 | `def main():` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | ? |

## `scripts/ci-pr-scope.sh`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| — | No named function extracted: module entrypoint / data / anonymous handlers require source inspection | Medium | Shell contract + isolated subprocess | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |

## `scripts/cleanup-published-artifacts.mjs`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 11 | `const isSha = value => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |
| 13 | `export function validateR2Receipt(receipt) {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |
| 79 | `async function listRunArtifacts(run, token, request) {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |
| 97 | `export async function deletePublishedArtifacts(receipt, token, request = fetch) {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |
| 138 | `async function main() {` | Medium | Node unit + Worker isolated integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |

## `scripts/install_qa_linux.sh`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| — | No named function extracted: module entrypoint / data / anonymous handlers require source inspection | Medium | Shell contract + isolated subprocess | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |

## `scripts/provision_apt_key.sh`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 65 | `cleanup_signing_validation() {` | Medium | Shell contract + isolated subprocess | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |

## `scripts/r2_release.py`

**Executable assertion ledger:** [R2 publication/Apt signing, CAS, public CDN readback and CLI main](method-assertions-r2-publisher.md). 67 test cases exercise the real Python release functions with fake R2/public transport; no hosted release was performed.


| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 39 | `def digest(path):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | E_PARTIAL |
| 47 | `def safe_file(path):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | E_PARTIAL |
| 56 | `def platform_files(release, platform, version, commit):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | I_PARTIAL |
| 97 | `def verify_signed_apt_indexes(inrelease, index):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | E_PARTIAL |
| 152 | `def verify_apt_package_catalog(packages, compressed, pool, version):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | E_PARTIAL |
| 217 | `def apt_files(apt, linux_deb, version):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | I_PARTIAL |
| 242 | `def source_map(release, apt, version, commit):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | E_PARTIAL |
| 258 | `def latest_manifest(immutable, version, commit):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | E_PARTIAL |
| 260 | `def item(key):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | INLINE |
| 278 | `def content_type(path):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | I_PARTIAL |
| 284 | `class _RejectPublicRedirect(urllib.request.HTTPRedirectHandler):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | CLASS_DECL |
| 287 | `def redirect_request(self, req, fp, code, msg, headers, newurl):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | I_PARTIAL |
| 291 | `def _verified_public_opener(request, timeout):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | I_PARTIAL |
| 300 | `def public_readback(path, relative, opener=_verified_public_opener):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | E_PARTIAL |
| 333 | `def object_head(client, key):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | E_PARTIAL |
| 344 | `def object_etag(head):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | I_PARTIAL |
| 354 | `def upload(client, key, file, immutable, expected_latest=_NO_SNAPSHOT):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | E_PARTIAL |
| 403 | `def publish(release, apt, version, commit, run_id, output, account, access_key, secret):` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | E_PARTIAL |
| 468 | `def main():` | Critical | Python unit + isolated release integration | 5+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | P |

## `scripts/release_assets.py`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 25 | `def digest(path):` | High | Python unit + isolated release integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | ? |
| 33 | `def canonical(version, platform, ext):` | High | Python unit + isolated release integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | ? |
| 48 | `def source_has_version(filename, version):` | High | Python unit + isolated release integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | ? |
| 55 | `def collect(source, target, platform, version):` | High | Python unit + isolated release integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | ? |
| 112 | `def merge(parts, output, version):` | High | Python unit + isolated release integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | ? |
| 142 | `def main():` | High | Python unit + isolated release integration | 3+ | Positive,N1,N2,N3,N4,N5,N6,N7,N10,N12 | ? |

## `scripts/release_version.py`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 24 | `def versions():` | Medium | Python unit + isolated release integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |
| 32 | `def bump(which):` | Medium | Python unit + isolated release integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |
| 56 | `def main():` | Medium | Python unit + isolated release integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |

## `scripts/verify_signing_key.py`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 8 | `def validate(text, fingerprint):` | Medium | Python unit + isolated release integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |
| 32 | `def main():` | Medium | Python unit + isolated release integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |

## `scripts/verify_signing_passphrase.sh`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 18 | `cleanup() {` | Medium | Shell contract + isolated subprocess | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |

## `tools/import_icon.py`

| Source line | Named method/type candidate | Risk | Test level | Planning floor | N categories to check | Coverage |
| ---: | --- | --- | --- | ---: | --- | :---: |
| 15 | `def main():` | Medium | Python unit + isolated release integration | 2+ | Positive,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 | ? |

## Completion controls

- Check public/anonymous exports and syntax-level branches with a language parser; lexical extraction is intentionally not signed off as Stage 3.
- Map each `?` to named tests and distinct true/false/match arms, including exceptions, `?` propagation and early returns.
- After method-level reconciliation, replace generic N category candidates with a reasoned ✔/✖/? for *each* applicable operation; preserve per-file coverage map as the companion index.
- Record final Stage 7 **number of actual planned new tests** after existing-assertion reconciliation; no fabricated totals from lexical candidate counts.
- Stage 9 remains blocked until full Stages 3–8 are independently auditable.
