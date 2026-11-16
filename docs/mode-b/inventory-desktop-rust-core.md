# Mode B production inventory: desktop Rust orchestration and GitHub

Exact source `5b07a3273a27516af8ceb793f0d427a1bada964b`. Discovery mapping only;

**Source-inventory correction:** `main.rs` contains production functions **after** inline `#[cfg(test)]` blocks; its initial method/branch counts below were truncated and are NOT the final full-file total. The omitted executable continuation is enumerated in [inventory-main-continuation.md](inventory-main-continuation.md). That supplement supersedes the earlier count. Do not mark Stage 3 complete until its branch mapping is reconciled.

 `#[cfg(test)]` bodies omitted. Every condition needs true/false analysis; every early return needs the corresponding error/success evidence. Source `main.rs` uses Tauri commands and user-facing I/O; core logic is not to be replaced by mocks. No cases are marked covered by name similarity.

Files **9**, signatures **133**, branch and return anchors **240**.

### `apps/desktop/src-tauri/build.rs`

Risk **High**; level **Unit + native integration**, selected categories **N1 N2 N6 N7 N10 N12**; initial per-source additional-case budget ~**9** (an estimate, not already-missing tests). Native OS, Keyring and network dependencies require contract fakes, never mocked domain methods.

**Functions and types (3)**
- L3 `fn execute(name: &str, args: &[&str]) -> String {`
- L17 `fn compile_wayland_bridge() {`
- L79 `fn main() {`

**Branch/return candidates (6)**
- L7 .unwrap_or_else(\|error\| panic!("Cannot execute {name}: {error}"));
- L8 if !result.status.success() {
- L12 .unwrap_or_else(\|error\| panic!("{name} printed invalid UTF-8: {error}"))
- L26 if !protocol.exists() {
- L49 for (name, source) in [
- L80 if env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("linux") {

### `apps/desktop/src-tauri/src/main.rs`

Risk **Critical**; level **Unit + native integration**, selected categories **N1 N2 N3 N4 N5 N6 N7 N8 N9 N10 N12**; initial per-source additional-case budget ~**76** (an estimate, not already-missing tests). Native OS, Keyring and network dependencies require contract fakes, never mocked domain methods.

**Functions and types (32)**
- L59 `impl Drop for ActiveFetchLease<'_> {`
- L60 `fn drop(&mut self) {`
- L112 `impl CiNotificationMode {`
- L113 `fn allows(self, conclusion: &str) -> bool {`
- L123 `fn default_language() -> String {`
- L173 `fn notify_progress(`
- L195 `fn config_path(app: &AppHandle) -> Result<PathBuf, String> {`
- L202 `fn default_config() -> Config {`
- L217 `fn read_config(app: &AppHandle) -> Result<Config, String> {`
- L227 `fn update_config<R>(`
- L236 `fn roots_as_paths(config: &Config) -> Vec<PathBuf> {`
- L240 `fn decision_label(decision: SyncDecision) -> String {`
- L252 `fn present(repo: RepoSnapshot) -> RepoSummary {`
- L266 `fn scan(app: &AppHandle) -> Result<Snapshot, String> {`
- L301 `fn git_action_result(`
- L348 `fn should_schedule_git_target(`
- L359 `fn execute(`
- L501 `async fn get_snapshot(app: AppHandle) -> Result<Snapshot, String> {`
- L511 `fn get_monitor_scope(app: AppHandle) -> Result<Option<String>, String> {`
- L526 `fn get_monitor_selection(app: AppHandle) -> Result<MonitorSelection, String> {`
- L550 `fn get_settings_config(app: AppHandle) -> Result<SettingsConfig, String> {`
- L566 `fn add_root(app: AppHandle, root: String) -> Result<Vec<String>, String> {`
- L585 `fn remove_root(app: AppHandle, root: String) -> Result<Vec<String>, String> {`
- L598 `fn cancel_git_fetch(app: AppHandle) -> Result<bool, String> {`
- L612 `async fn perform_git_action(`
- L623 `fn resize_unmanaged_card(window: &tauri::WebviewWindow, height: f64) -> Result<(), String> {`
- L647 `async fn set_card_view(`
- L683 `fn ui_hover_debug_enabled() -> bool {`
- L688 `fn trace_ui_hover(kind: String, stage: String, sequence: u32) {`
- L724 `fn get_usage_popup_kind() -> &'static str {`
- L737 `fn footer_anchored_usage_position(`
- L756 `fn position_unmanaged_usage_popup(`

**Branch/return candidates (44)**
- L61 if let Ok(mut active) = self.0 .0.lock() {
- L114 match (self, conclusion) {
- L222 .unwrap_or_else(default_config))
- L241 match decision {
- L256 branch: repo.branch.unwrap_or_else(\|\| "(detached)".into()),
- L276 for (path, result) in git::inspect_all(repositories) {
- L277 match result {
- L306 match outcome {
- L332 Err(GitError(error)) if error == git::FETCH_CANCELLED => ActionResult {
- L352 match operation {
- L364 if operation != "fetch" && operation != "safe_pull" && operation != "safe_sync" {
- L365 return Err("Unknown Git operation".into());
- L369 if app.state::<ShutdownSignal>().is_requested() {
- L370 return Err("RepoTicker is shutting down".into());
- L373 let cancellation = if operation == "fetch" {
- L388 if app.state::<ShutdownSignal>().is_requested() {
- L389 if let Some(token) = cancellation.as_ref() {
- L390 if let Err(error) = token.cancel() {
- L394 return Err("RepoTicker is shutting down".into());
- L399 if let Some(requested) = only_path {
- L400 if !repositories
- L404 return Err("Repository is not enrolled or no longer valid".into());
- L428 if operation == "fetch" {
- L462 Err(GitError(error)) if error == git::FETCH_CANCELLED => "cancelled",
- L475 for (index, path) in targets.into_iter().enumerate() {
- L478 let outcome = if operation == "safe_sync" {
- L572 if changed {
- L578 if changed {
- L587 if !config.roots.contains(&root) {
- L588 return Err("Root is not enrolled".into());
- L605 match token {
- L630 if let (Some(position), Some(size)) = (before_position, before_size) {
- L635 if let Ok(top) = i32::try_from(top) {
- L652 let height = match view.as_str() {
- L654 if cfg!(target_os = "windows") {
- L663 (122 + 18 + 35 * rows + if count == 0 { 8 } else { 0 }) as f64
- L673 if linux_surface::enabled() {
- L674 return linux_surface::resize(app, height as i32).await;
- L689 if !ui_hover_debug_enabled() {
- L690 return;
- L692 let kind = match kind.as_str() {
- L699 let stage = match stage.as_str() {
- L725 match USAGE_KIND.load(Ordering::Acquire) {
- L770 if let Some(monitor) = card.current_monitor().map_err(\|error\| error.to_string())? {

### `apps/desktop/src-tauri/src/github_api.rs`

Risk **Critical**; level **Unit + native integration**, selected categories **N1 N2 N3 N4 N5 N6 N7 N8 N9 N10 N12**; initial per-source additional-case budget ~**91** (an estimate, not already-missing tests). Native OS, Keyring and network dependencies require contract fakes, never mocked domain methods.

**Functions and types (10)**
- L21 `pub struct GitHubRestClient {`
- L25 `impl GitHubRestClient {`
- L26 `fn client(&self) -> Result<&Client, String> {`
- L42 `fn api_http_failure(`
- L57 `pub(crate) fn valid_name(value: &str) -> bool {`
- L67 `fn valid_utc_second_timestamp(timestamp: &str) -> bool {`
- L106 `fn valid_path(requested: &str) -> bool {`
- L191 `fn project_billing(value: Value) -> Result<Value, String> {`
- L226 `fn project(path: &str, value: Value) -> Result<Value, String> {`
- L361 `pub async fn github_api_get(app: AppHandle, path: String) -> Result<Value, String> {`

**Branch/return candidates (81)**
- L47 match status {
- L49 403 if remaining == Some("0") \|\| retry_after.is_some() => "GitHub API rate limited.",
- L69 if bytes.len() != 20
- L74 .all(\|(index, byte)\| match index {
- L82 return false;
- L93 return false;
- L96 let days = match month {
- L99 2 if leap => 29,
- L107 if requested.len() > 300
- L114 return false;
- L117 return false;
- L119 if url.host_str() != Some("api.github.com") \|\| url.fragment().is_some() {
- L120 return false;
- L123 if segments.as_slice() == ["user"] {
- L124 return url.query().is_none();
- L126 if matches!(segments.as_slice(), ["orgs", org] if valid_name(org)) {
- L127 return url.query().is_none();
- L131 ["organizations", org, "settings", "billing", "usage", "summary"] if valid_name(org)
- L134 ["users", user, "settings", "billing", "usage", "summary"] if valid_name(user)
- L136 let route = if billing {
- L139 match segments.as_slice() {
- L142 if id.parse::<u64>().is_ok_and(\|n\| n > 0) =>
- L146 ["orgs", org, "actions", "runners"] if valid_name(org) => 2,
- L147 ["repos", owner, repo, "actions", "runs"] if valid_name(owner) && valid_name(repo) => 3,
- L149 if valid_name(owner)
- L159 for (key, value) in url.query_pairs() {
- L160 if !keys.insert(key.to_string()) {
- L161 return false;
- L163 match key.as_ref() {
- L164 "per_page" if route != 5 && value == "100" => {}
- L166 if route != 5
- L171 if route == 3
- L173 "filter" if route == 4 && value == "latest" => {}
- L175 if route == 5
- L180 "month" if route == 5 && value.parse::<u32>().is_ok_and(\|n\| (1..=12).contains(&n)) => {}
- L184 if route == 5 {
- L196 if items.len() > 500 {
- L197 return Err("GitHub billing response exceeds allowed item count.".into());
- L200 for item in items {
- L201 if item.get("product").and_then(Value::as_str) != Some("Actions")
- L216 if sku.len() > 80 \|\| sku.is_empty() \|\| !quantity.is_finite() \|\| quantity < 0.0 {
- L217 return Err("Invalid GitHub billing quantity.".into());
- L227 if let Some(org) = path.strip_prefix("/orgs/") {
- L228 if valid_name(org) && !org.contains('/') {
- L235 return Ok(json!({
- L241 if path == "/user" {
- L248 return Ok(json!({
- L253 if path.contains("/settings/billing/usage/summary?") {
- L254 return project_billing(value);
- L256 let key = if path.starts_with("/user/installations/") {
- L258 } else if path.starts_with("/user/installations?") {
- L260 } else if path.starts_with("/orgs/") {
- L262 } else if path.contains("/jobs?") {
- L271 if arr.len() > 100 {
- L272 return Err("GitHub returned more than the requested page size.".into());
- L276 if key == "workflow_runs" && path.contains("status=completed") {
- L319 return Ok(json!({
- L326 .map(\|item\| match key {
- L362 if !valid_path(&path) {
- L363 return Err("Unsupported GitHub read-only API request.".into());
- L366 let stage = if path.starts_with("/user/installations?") {
- L368 } else if path.starts_with("/user/installations/") {
- L370 } else if path.contains("/actions/runners?") {
- L372 } else if path.contains("/actions/runs/") {
- L374 } else if path.contains("/actions/runs?") {
- L382 if gate.remaining_seconds() > 0 {
- L383 return Err("GitHub API rate limited.".into());
- L395 if let Some(etag) = &lookup.etag {
- L402 if response.status() == reqwest::StatusCode::NOT_MODIFIED {
- L403 return cached
- L407 if !response.status().is_success() {
- L408 if matches!(response.status().as_u16(), 401 \| 403 \| 404) {
- L423 if let Some(duration) = github_rate_gate::backoff_duration(
- L432 return Err(api_http_failure(response.status().as_u16(), remaining, retry_after).into());
- L440 while let Some(chunk) = response
- L445 if bytes.len().saturating_add(chunk.len()) > MAX_BODY {
- L446 return Err("GitHub API response exceeded safe size.".into());
- L453 if !cached.unchanged(lookup.generation) {
- L454 return Err("GitHub authorization changed. Retry.".into());
- L456 if !cached.save(&path, &lookup, etag.as_deref(), &projected) {
- L457 return Err("GitHub authorization changed. Retry.".into());

### `apps/desktop/src-tauri/src/github_etag_cache.rs`

Risk **Critical**; level **Unit + native integration**, selected categories **N1 N2 N3 N4 N5 N6 N7 N8 N9 N10 N12**; initial per-source additional-case budget ~**26** (an estimate, not already-missing tests). Native OS, Keyring and network dependencies require contract fakes, never mocked domain methods.

**Functions and types (10)**
- L25 `pub struct GitHubETagCache {`
- L29 `pub struct CacheLookup {`
- L34 `fn valid_etag(etag: &str) -> bool {`
- L43 `fn cacheable(path: &str) -> bool {`
- L48 `impl GitHubETagCache {`
- L49 `pub fn snapshot(&self, path: &str) -> CacheLookup {`
- L66 `pub fn unchanged(&self, generation: u64) -> bool {`
- L74 `pub fn not_modified(&self, path: &str, lookup: &CacheLookup) -> Option<Value> {`
- L88 `pub fn invalidate(&self) {`
- L96 `pub fn save(`

**Branch/return candidates (16)**
- L50 let state = self.inner.lock().unwrap_or_else(\|err\| err.into_inner());
- L51 let etag = if cacheable(path) {
- L69 .unwrap_or_else(\|err\| err.into_inner())
- L75 let state = self.inner.lock().unwrap_or_else(\|err\| err.into_inner());
- L76 if state.generation != lookup.generation {
- L77 return None;
- L89 let mut state = self.inner.lock().unwrap_or_else(\|err\| err.into_inner());
- L103 let mut state = self.inner.lock().unwrap_or_else(\|err\| err.into_inner());
- L104 if state.generation != lookup.generation {
- L105 return false;
- L112 if current_etag != lookup.etag.as_deref() {
- L115 return true;
- L119 return true;
- L121 if !cacheable(path)
- L124 return true;
- L126 if state.entries.len() == MAX_ENTRIES {

### `apps/desktop/src-tauri/src/github_native.rs`

Risk **Critical**; level **Unit + native integration**, selected categories **N1 N2 N3 N4 N5 N6 N7 N8 N9 N10 N12**; initial per-source additional-case budget ~**35** (an estimate, not already-missing tests). Native OS, Keyring and network dependencies require contract fakes, never mocked domain methods.

**Functions and types (21)**
- L21 `fn device_challenge_fields() -> [(&'static str, &'static str); 1] {`
- L26 `pub enum NativeAuthError {`
- L40 `pub struct CredentialRecord {`
- L48 `impl std::fmt::Debug for CredentialRecord {`
- L49 `fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {`
- L60 `impl CredentialRecord {`
- L61 `pub fn from_lease(lease: TokenLease, issued_at: u64) -> Result<Self, NativeAuthError> {`
- L80 `fn decode(body: &str) -> Result<Self, NativeAuthError> {`
- L95 `pub struct NativeCredentialStore;`
- L97 `impl NativeCredentialStore {`
- L100 `fn entry() -> Result<keyring::Entry, NativeAuthError> {`
- L105 `pub fn load(&self) -> Result<Option<CredentialRecord>, NativeAuthError> {`
- L114 `pub fn replace(&self, record: &CredentialRecord) -> Result<(), NativeAuthError> {`
- L123 `pub fn clear(&self) -> Result<(), NativeAuthError> {`
- L134 `pub struct GithubOAuthHttp {`
- L138 `impl GithubOAuthHttp {`
- L139 `pub fn new() -> Result<Self, NativeAuthError> {`
- L149 `async fn submit(`
- L188 `pub async fn begin(&self, now: u64) -> Result<DeviceChallenge, NativeAuthError> {`
- L195 `pub async fn poll(&self, device_code: &str) -> Result<PollReply, NativeAuthError> {`
- L209 `pub async fn refresh(&self, refresh_token: &str) -> Result<TokenLease, NativeAuthError> {`

**Branch/return candidates (14)**
- L68 if refresh_expires_at <= access_expires_at {
- L69 return Err(NativeAuthError::BadResponse);
- L83 if record.version != 1
- L89 return Err(NativeAuthError::CorruptCredential);
- L107 match entry.get_password() {
- L125 match entry.delete_credential() {
- L155 if url != DEVICE_CODE_URL && url != TOKEN_URL {
- L156 return Err(NativeAuthError::BadResponse);
- L167 if !status.is_success() {
- L168 return Err(NativeAuthError::HttpStatus(status.as_u16()));
- L174 while let Some(chunk) = response
- L180 if chunk.len() > remaining {
- L181 return Err(NativeAuthError::BadResponse);
- L220 match parse_token_reply(&body).map_err(\|_\| NativeAuthError::BadResponse)? {

### `apps/desktop/src-tauri/src/github_oauth_wire.rs`

Risk **Critical**; level **Unit + native integration**, selected categories **N1 N2 N3 N4 N5 N6 N7 N8 N9 N10 N12**; initial per-source additional-case budget ~**23** (an estimate, not already-missing tests). Native OS, Keyring and network dependencies require contract fakes, never mocked domain methods.

**Functions and types (14)**
- L14 `pub enum WireError {`
- L20 `pub struct DeviceChallenge {`
- L25 `impl DeviceChallenge {`
- L26 `pub fn device_code(&self) -> &str {`
- L31 `impl std::fmt::Debug for DeviceChallenge {`
- L32 `fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {`
- L41 `pub struct TokenLease {`
- L48 `impl std::fmt::Debug for TokenLease {`
- L49 `fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {`
- L60 `pub enum PollReply {`
- L65 `fn object(input: &str) -> Result<Value, WireError> {`
- L76 `fn valid_ascii_token(value: &str, max_len: usize) -> bool {`
- L80 `pub fn parse_device_challenge(input: &str, started_at: u64) -> Result<DeviceChallenge, WireError> {`
- L108 `pub fn parse_token_reply(input: &str) -> Result<PollReply, WireError> {`

**Branch/return candidates (9)**
- L66 if input.len() > MAX_JSON_BYTES {
- L67 return Err(WireError::InvalidServerResponse);
- L70 if !value.is_object() {
- L71 return Err(WireError::InvalidServerResponse);
- L110 if let Some(error) = value.get("error").and_then(Value::as_str) {
- L112 let response = match error {
- L122 return Ok(PollReply::State(response));
- L135 if value.get("token_type").and_then(Value::as_str) != Some("bearer") {
- L136 return Err(WireError::InvalidServerResponse);

### `apps/desktop/src-tauri/src/github_rate_gate.rs`

Risk **Critical**; level **Unit + native integration**, selected categories **N1 N2 N3 N4 N5 N6 N7 N8 N9 N10 N12**; initial per-source additional-case budget ~**13** (an estimate, not already-missing tests). Native OS, Keyring and network dependencies require contract fakes, never mocked domain methods.

**Functions and types (8)**
- L13 `pub struct GitHubRateGate {`
- L17 `impl GitHubRateGate {`
- L18 `pub fn remaining_seconds(&self) -> u64 {`
- L29 `pub fn defer(&self, duration: Duration) {`
- L38 `fn bounded_seconds(input: Option<&str>) -> Option<u64> {`
- L47 `pub fn backoff_duration(`
- L68 `pub fn now_unix() -> u64 {`
- L77 `pub fn github_api_cooldown_seconds(app: AppHandle) -> u64 {`

**Branch/return candidates (5)**
- L19 let until = self.until.lock().unwrap_or_else(\|err\| err.into_inner());
- L31 let mut current = self.until.lock().unwrap_or_else(\|err\| err.into_inner());
- L32 if current.is_none_or(\|until\| until < new_until) {
- L54 if status != 429 && !(status == 403 && (remaining == Some("0") \|\| retry_after.is_some())) {
- L55 return None;

### `apps/desktop/src-tauri/src/github_session.rs`

Risk **Critical**; level **Unit + native integration**, selected categories **N1 N2 N3 N4 N5 N6 N7 N8 N9 N10 N12**; initial per-source additional-case budget ~**79** (an estimate, not already-missing tests). Native OS, Keyring and network dependencies require contract fakes, never mocked domain methods.

**Functions and types (30)**
- L30 `pub struct GitHubAuthManager {`
- L46 `impl Default for AuthProgress {`
- L47 `fn default() -> Self {`
- L55 `impl GitHubAuthManager {`
- L56 `fn invalidate(&self) -> u64 {`
- L62 `fn active(&self, epoch: u64) -> bool {`
- L66 `fn progress(&self) -> AuthProgress {`
- L73 `fn set_progress(&self, next: AuthProgress) -> bool {`
- L88 `pub struct GitHubAuthEvent {`
- L95 `pub struct GitHubAuthChallenge {`
- L103 `pub struct GitHubAuthStatus {`
- L110 `fn unix_now() -> u64 {`
- L117 `fn public_error(error: NativeAuthError) -> String {`
- L139 `fn reason_category(error: NativeAuthError) -> &'static str {`
- L155 `fn publish_with_reason(app: &AppHandle, status: &'static str, reason: Option<&'static str>) {`
- L174 `fn publish(app: &AppHandle, status: &'static str) {`
- L183 `pub fn cancel_pending(app: &AppHandle) {`
- L190 `async fn read_credential() -> Result<Option<CredentialRecord>, NativeAuthError> {`
- L196 `async fn store_credential(record: CredentialRecord) -> Result<(), NativeAuthError> {`
- L202 `async fn delete_credential() -> Result<(), NativeAuthError> {`
- L210 `pub fn github_flow_status(app: AppHandle) -> GitHubAuthEvent {`
- L219 `pub async fn github_auth_status(app: AppHandle) -> Result<GitHubAuthStatus, String> {`
- L249 `pub async fn github_begin(app: AppHandle) -> Result<GitHubAuthChallenge, String> {`
- L286 `async fn poll_authorization(`
- L388 `fn valid_user_code(code: &str) -> bool {`
- L401 `pub fn github_copy_user_code(app: AppHandle, code: String) -> Result<(), String> {`
- L411 `pub fn github_cancel(app: AppHandle) {`
- L416 `pub async fn github_disconnect(app: AppHandle) -> Result<(), String> {`
- L433 `pub async fn github_access_token_with_cache(`
- L474 `pub fn github_open_device_page() -> Result<(), String> {`

**Branch/return candidates (49)**
- L70 .unwrap_or_else(\|poisoned\| poisoned.into_inner())
- L77 .unwrap_or_else(\|poisoned\| poisoned.into_inner());
- L78 if progress.phase == next.phase && progress.reason == next.reason {
- L79 return false;
- L118 match error {
- L120 NativeAuthError::HttpStatus(status) if status == 429 => {
- L140 match error {
- L156 if let Some(state) = app.try_state::<Arc<GitHubAuthManager>>() {
- L157 if !state.set_progress(AuthProgress {
- L161 return;
- L165 if std::env::var_os("REPOTICKER_UI_DEBUG").is_some() {
- L178 if matches!(status, "connected" \| "disconnected") {
- L184 if let Some(state) = app.try_state::<Arc<GitHubAuthManager>>() {
- L232 phase: if valid.is_some() {
- L237 reason: if valid.is_some() {
- L256 if let Err(error) = read_credential().await {
- L258 return Err(public_error(error));
- L262 let challenge = match http.begin(unix_now()).await {
- L266 return Err(public_error(error));
- L269 if !state.active(attempt) {
- L270 return Err("GitHub sign-in was cancelled.".into());
- L294 loop {
- L295 if !state.active(attempt) {
- L296 return;
- L298 match session.next_poll(unix_now()) {
- L309 match phase {
- L316 return;
- L320 if !state.active(attempt) {
- L321 return;
- L323 let reply = match http.poll(challenge.device_code()).await {
- L326 if state.active(attempt) {
- L329 return;
- L332 if !state.active(attempt) {
- L333 return;
- L335 match reply {
- L337 if session.receive(response, unix_now()) == DevicePhase::AwaitingUser {
- L341 let (phase, reason) = match response {
- L353 return;
- L356 if session.receive(DeviceResponse::Authorized, unix_now())
- L360 return;
- L363 if !state.active(attempt) {
- L364 return;
- L367 let outcome = match CredentialRecord::from_lease(lease, unix_now()) {
- L371 if state.active(attempt) {
- L372 match outcome {
- L382 return;
- L402 if !valid_user_code(&code) {
- L403 return Err("Invalid GitHub verification code.".into());
- L448 let token = match expiration.decide(unix_now(), 300) {

### `apps/desktop/src-tauri/src/ci_notifications.rs`

Risk **High**; level **Unit + native integration**, selected categories **N1 N4 N5 N6 N8 N9 N10**; initial per-source additional-case budget ~**21** (an estimate, not already-missing tests). Native OS, Keyring and network dependencies require contract fakes, never mocked domain methods.

**Functions and types (5)**
- L23 `fn notification_catalog() -> &'static NotificationCatalog {`
- L31 `fn notification_error(language: &str, kind: &str) -> String {`
- L45 `fn notification_text(`
- L74 `fn approved_scope(`
- L113 `pub(crate) fn ci_run_notify(`

**Branch/return candidates (16)**
- L37 match kind {
- L56 let (title, body) = if conclusion == "success" {
- L81 if !config.ci_notification_mode.allows(conclusion)
- L86 return false;
- L89 return false;
- L91 if !crate::github_api::valid_name(owner)
- L103 return false;
- L120 if !cfg!(any(target_os = "linux", target_os = "windows")) {
- L121 return Ok(false);
- L124 if !approved_scope(&config, &repository, run_id, run_attempt, &conclusion) {
- L125 return Ok(false);
- L127 if !matches!(
- L131 return Err(notification_error(&config.language, "permission"));
- L145 if delivered.contains(&key) {
- L146 return Ok(false);
- L162 if delivered.len() > MAX_DELIVERED {


## Evidence reconciliation required

- Native Rust module unit tests and `crates/repoticker-core/tests/*` cover pure logic; verify exact data and denial paths.
- JavaScript source contract suites `tests/github-*.test.mjs`, `tests/settings-*.test.mjs`, `tests/ci-native-integration.test.mjs`, `tests/mode-b-native-monitor-races.test.mjs`, `tests/windows-*.test.mjs` may assert Rust snippets, not execute Rust IPC. Do not overclaim.
- High-risk branches: enrolled roots, Git fetch cancellation, save_settings atomicity, auth generation/cooldown, ETag 304 freshness, signed cloud webhook source identity, native notifications, shutdown. Distinguish simulated IPC from physical Keyring/KDE/Windows behavior.
- N11 is not applicable (no purchase entitlement feature). N8 applies only to timestamps/monotonic clock, expiry windows and localized outputs; Windows/Wayland-specific invariants require native acceptance.
