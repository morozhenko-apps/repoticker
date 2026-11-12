# Mode B source inventory: Rust core and Cloudflare relay

Exact source: `5b07a3273a27516af8ceb793f0d427a1bada964b`.

This is a **discovery inventory**, not evidence of positive/negative coverage. Function and branch anchors were extracted from each production source before `#[cfg(test)]` blocks. Branch anchors require both outcomes, loop empty/nonempty, error propagation and match-arm analysis. Expression-level `?`, compound predicates and platform-specific conditions still need human branch expansion. The source contract is the sole definition of intended behavior; do not derive contracts from a permissive test.

**Scope:** 12 production files; 139 source method/type signatures and 204 control-branch anchors identified. Test-to-branch mapping is **not complete**.

### `crates/repoticker-core/src/bounded.rs`

Risk: **High**. Test level: **Unit + contract**. Applicable candidates: N1 N2 N5 N12. Initial additional-case budget (estimate, not tests executed): **6**. Method signatures are source-derived. A cited test suite is only a candidate until branch assertions are audited.

**Methods and types (1)**

- L7: `pub fn bounded_map<T, R, Work, Start, Complete>(`

**Executable branch candidates (5, each conditional requires outcomes)**

- L44 for _ in 0..parallelism {
- L45 if start_next(0) {
- L49 while running > 0 {
- L54 let value = match outcome {
- L61 if start_next(done) {

### `crates/repoticker-core/src/config_store.rs`

Risk: **Critical**. Test level: **Unit + integration**. Applicable candidates: N1 N2 N4 N5 N6 N7 N10 N12. Initial additional-case budget (estimate, not tests executed): **20**. Method signatures are source-derived. A cited test suite is only a candidate until branch assertions are audited.

**Methods and types (15)**

- L14: `fn backup_path(path: &Path) -> PathBuf {`
- L21: `fn sibling_name(path: &Path, suffix: &str) -> PathBuf {`
- L30: `fn create_private(path: &Path) -> io::Result<File> {`
- L46: `impl Drop for StagingFile {`
- L47: `fn drop(&mut self) {`
- L54: `fn sync_directory(parent: &Path) -> io::Result<()> {`
- L66: `fn atomic_replace(path: &Path, bytes: &[u8]) -> io::Result<()> {`
- L94: `fn load(path: &Path) -> Result<Option<Vec<u8>>, String> {`
- L102: `fn quarantine_corrupt(path: &Path, raw: &[u8]) -> Result<(), String> {`
- L127: `pub fn read_json<T: DeserializeOwned>(path: &Path) -> Result<Option<T>, String> {`
- L163: `pub fn save_json<T: Serialize + DeserializeOwned>(path: &Path, value: &T) -> Result<(), String> {`
- L178: `pub struct JsonStore(std::sync::Mutex<()>);`
- L180: `impl JsonStore {`
- L181: `pub fn read<T: DeserializeOwned>(&self, path: &Path) -> Result<Option<T>, String> {`
- L186: `pub fn update<T, R>(`

**Executable branch candidates (15, each conditional requires outcomes)**

- L48 if self.cleanup {
- L73 match create_private(&name) {
- L83 Err(err) if err.kind() == io::ErrorKind::AlreadyExists => continue,
- L95 match fs::read(path) {
- L97 Err(err) if err.kind() == io::ErrorKind::NotFound => Ok(None),
- L103 loop {
- L105 let mut file = match create_private(&name) {
- L107 Err(err) if err.kind() == io::ErrorKind::AlreadyExists => continue,
- L129 if let Some(raw) = &primary {
- L130 if let Ok(value) = serde_json::from_slice::<T>(raw) {
- L137 if primary.is_some() {
- L152 if let Some(corrupt) = &primary {
- L167 if let Some(previous) = load(path)? {
- L196 let mut config = read_json(path)?.unwrap_or_else(default);
- L198 if changed {

### `crates/repoticker-core/src/git.rs`

Risk: **Critical**. Test level: **Unit + integration**. Applicable candidates: N1 N2 N3 N4 N5 N6 N7 N9 N10 N12. Initial additional-case budget (estimate, not tests executed): **106**. Method signatures are source-derived. A cited test suite is only a candidate until branch assertions are audited.

**Methods and types (68)**

- L17: `pub struct GitError(pub String);`
- L19: `impl fmt::Display for GitError {`
- L20: `fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {`
- L25: `impl std::error::Error for GitError {}`
- L40: `fn configure_background_child(command: &mut Command) {`
- L47: `fn configure_background_child(_command: &mut Command) {}`
- L53: `fn check_git_process_startup(output: &Output) -> Result<(), GitError> {`
- L62: `fn is_git_process_startup_failure(error: &GitError) -> bool {`
- L74: `fn git_command(repo: &Path, args: &[&str]) -> Command {`
- L97: `pub struct FetchCancellation {`
- L101: `impl FetchCancellation {`
- L102: `pub fn is_cancelled(&self) -> bool {`
- L112: `pub fn cancel(&self) -> Result<bool, GitError> {`
- L116: `fn cancel_with(`
- L149: `fn register(&self, pid: u32) -> Result<bool, GitError> {`
- L161: `fn unregister(&self, pid: u32) -> Result<bool, GitError> {`
- L172: `fn terminate_fetch_group(pid: u32) -> Result<(), GitError> {`
- L177: `fn kill(pid: i32, signal: i32) -> i32;`
- L190: `fn terminate_fetch_group(pid: u32) -> Result<(), GitError> {`
- L223: `fn terminate_fetch_group(_pid: u32) -> Result<(), GitError> {`
- L232: `fn classify_fetch_completion(`
- L245: `fn fetch_was_interrupted(status: &std::process::ExitStatus) -> bool {`
- L251: `fn fetch_was_interrupted(status: &std::process::ExitStatus) -> bool {`
- L257: `fn fetch_was_interrupted(_status: &std::process::ExitStatus) -> bool {`
- L264: `fn unregistered_fetch_cleanup_error(`
- L286: `fn run_cancellable_command(`
- L301: `fn run_cancellable_command_with_timeout(`
- L367: `pub struct RepoSnapshot {`
- L381: `pub enum OperationOutcome {`
- L389: `fn drain_git_pipe<R: Read + Send + 'static>(mut reader: R) -> mpsc::Receiver<io::Result<Vec<u8>>> {`
- L402: `fn receive_owned_pipe(`
- L438: `fn wait_owned_child(`
- L508: `fn run_bounded_command(`
- L528: `fn invoke(repo: &Path, args: &[&str]) -> Result<Output, GitError> {`
- L556: `fn stderr(output: &Output) -> String {`
- L562: `fn required(repo: &Path, args: &[&str]) -> Result<String, GitError> {`
- L574: `fn optional(repo: &Path, args: &[&str]) -> Result<Option<String>, GitError> {`
- L585: `fn looks_like_checkout(path: &Path, allow_worktree: bool) -> bool {`
- L590: `fn verified_checkout(path: &Path) -> Result<bool, GitError> {`
- L602: `fn ignored_child(path: &Path) -> bool {`
- L619: `pub fn validate_ignored_child_names(names: Vec<String>) -> Result<Vec<String>, GitError> {`
- L644: `pub fn discover_with_ignored(`
- L699: `pub fn discover(root: &Path) -> Result<Vec<PathBuf>, GitError> {`
- L703: `pub fn discover_all_with_ignored(`
- L719: `pub fn discover_all(roots: &[PathBuf]) -> (Vec<PathBuf>, Vec<String>) {`
- L724: `pub fn resolve_enrolled_checkout_with_ignored(`
- L741: `pub fn resolve_enrolled_checkout(roots: &[PathBuf], requested: &str) -> Result<PathBuf, GitError> {`
- L745: `pub fn normalize_root(path: &str) -> Result<PathBuf, GitError> {`
- L775: `pub fn inspect_all(repositories: Vec<PathBuf>) -> Vec<(PathBuf, Result<RepoSnapshot, GitError>)> {`
- L795: `pub fn inspect(repo: &Path) -> Result<RepoSnapshot, GitError> {`
- L873: `fn git_operation_in_progress(repo: &Path) -> Result<bool, GitError> {`
- L895: `pub fn github_remote_to_browser_url(remote: &str) -> Option<String> {`
- L924: `pub fn github_origin_url(repo: &Path) -> Result<String, GitError> {`
- L934: `pub fn fetch(repo: &Path) -> Result<OperationOutcome, GitError> {`
- L945: `pub fn fetch_with_cancel(`
- L974: `fn commit_oid(repo: &Path, revision: &str) -> Result<String, GitError> {`
- L986: `fn pull_source_unchanged(`
- L1003: `fn safe_pull_with_checkpoints(`
- L1055: `fn safe_push_source_unchanged(`
- L1079: `fn parse_single_remote_branch(raw: &str, branch_ref: &str) -> Result<String, GitError> {`
- L1102: `pub fn safe_push(repo: &Path) -> Result<OperationOutcome, GitError> {`
- L1108: `fn safe_push_with_checkpoint(`
- L1232: `pub fn safe_sync(repo: &Path) -> Result<OperationOutcome, GitError> {`
- L1244: `pub fn safe_pull(repo: &Path) -> Result<OperationOutcome, GitError> {`
- L1260: `fn loader_failure_reports_ntstatus_without_leaking_command_or_repo_path() {`
- L1272: `fn ordinary_failure_remains_a_regular_git_exit_status() {`
- L1282: `fn headless_git_command_executes_without_losing_output() {`
- L1292: `fn headless_child_creation_preserves_exit_status() {`

**Executable branch candidates (83, each conditional requires outcomes)**

- L55 if output.status.code() == Some(0xC000_0142_u32 as i32) {
- L127 if already_cancelled && pending.is_empty() {
- L131 for pid in pending {
- L132 match terminate(pid) {
- L137 if first_error.is_none() {
- L143 if let Some(error) = first_error {
- L154 if state.cancelled {
- L180 if unsafe { kill(-group, SIGKILL) } != 0 {
- L182 if error.kind() != std::io::ErrorKind::NotFound {
- L204 loop {
- L205 match child.try_wait() {
- L206 Ok(Some(status)) if status.success() => return Ok(()),
- L211 if start.elapsed() >= PROCESS_REAP_GRACE {
- L236 match result {
- L237 Ok(output) if targeted && fetch_was_interrupted(&output.status) => {
- L269 if terminated.is_ok() && reaped.is_ok() {
- L273 if let Err(error) = terminated {
- L276 if let Err(error) = reaped {
- L308 if cancel.is_cancelled() {
- L325 match cancel.register(pid) {
- L357 match (result, targeted) {
- L408 match receiver.recv_timeout(PROCESS_REAP_GRACE) {
- L424 let detail = match cleanup {
- L425 Ok(()) if closed => "owned helper group stopped".to_owned(),
- L456 match child.try_wait() {
- L461 if started.elapsed() >= timeout {
- L467 while reap_start.elapsed() < PROCESS_REAP_GRACE {
- L468 match child.try_wait() {
- L481 if let Err(err) = termination {
- L486 if !reaped {
- L530 let output = match args.first().copied() {
- L564 if !output.status.success() {
- L576 if output.status.success() {
- L591 let top = match optional(path, &["rev-parse", "--show-toplevel"])? {
- L592 Some(value) if !value.is_empty() => PathBuf::from(value),
- L620 if names.len() > 100 {
- L624 for name in names {
- L626 if name.is_empty()
- L650 if !root.is_dir() {
- L656 if looks_like_checkout(&root, true) {
- L657 return if verified_checkout(&root)? {
- L667 for entry in entries {
- L671 if !entry
- L686 match verified_checkout(&path) {
- L691 Err(error) if is_git_process_startup_failure(&error) => return Err(error),
- L709 for root in roots {
- L710 match discover_with_ignored(root, ignored_child_names) {
- L731 if repositories.binary_search(&selected).is_ok() {
- L747 if input.is_empty() {
- L750 let expanded = if input == "~" \|\| input.starts_with("~/") \|\| input.starts_with("~\\") {
- L754 if input == "~" {
- L762 if !expanded.is_absolute() {
- L767 if !normalized.is_dir() {
- L796 if !verified_checkout(repo)? {
- L813 let upstream = if branch.is_some() {
- L826 let (ahead, behind) = if upstream.is_some() {
- L834 match (ahead, behind, tokens.next()) {
- L859 .unwrap_or_else(\|\| repo.display().to_string());
- L877 if !git_dir.is_absolute() {
- L904 if segments.next().is_some() {
- L916 if !safe(owner) \|\| !safe(name) {
- L925 if !verified_checkout(repo)? {
- L935 if !verified_checkout(repo)? {
- L949 if cancel.is_cancelled() {
- L952 if !verified_checkout(repo)? {
- L955 if cancel.is_cancelled() {
- L962 if !output.status.success() {
- L976 if !matches!(oid.len(), 40 \| 64) \|\| !oid.bytes().all(\|byte\| byte.is_ascii_hexdigit()) {
- L1009 match state.decision {
- L1017 if !pull_source_unchanged(repo, &state, &expected_head, &expected_upstream_tip)? {
- L1026 if !pull_source_unchanged(repo, &state, &expected_head, &expected_upstream_tip)? {
- L1084 if lines.next().is_some() {
- L1090 if found_ref != branch_ref
- L1113 if first.decision != SyncDecision::LocalAhead {
- L1114 return match first.decision {
- L1125 if branch.starts_with('-')
- L1144 if config_remote.is_empty()
- L1157 if merge_ref != branch_ref
- L1169 if fetch_urls.is_empty() \|\| fetch_urls.contains('\n') \|\| fetch_urls != push_urls {
- L1183 if !safe_push_source_unchanged(repo, &first, &pin)? {
- L1200 if remote_tip != pin.upstream_tip {
- L1211 if !safe_push_source_unchanged(repo, &first, &pin)? {
- L1233 match inspect(repo)?.decision {

### `crates/repoticker-core/src/github_auth.rs`

Risk: **Critical**. Test level: **Unit + contract**. Applicable candidates: N1 N2 N3 N4 N5 N6 N7 N8 N10. Initial additional-case budget (estimate, not tests executed): **22**. Method signatures are source-derived. A cited test suite is only a candidate until branch assertions are audited.

**Methods and types (14)**

- L9: `pub enum AuthError {`
- L14: `pub enum DeviceResponse {`
- L27: `pub enum DevicePhase {`
- L37: `pub enum PollDecision {`
- L45: `pub struct DeviceSession {`
- L54: `impl DeviceSession {`
- L55: `pub fn new(`
- L91: `pub fn next_poll(&mut self, now: u64) -> PollDecision {`
- L107: `pub fn receive(&mut self, response: DeviceResponse, now: u64) -> DevicePhase {`
- L135: `pub fn cancel(&mut self) {`
- L143: `pub struct TokenExpiration {`
- L149: `pub enum TokenAction {`
- L155: `impl TokenExpiration {`
- L156: `pub fn decide(self, now: u64, refresh_margin_seconds: u64) -> TokenAction {`

**Executable branch candidates (10, each conditional requires outcomes)**

- L62 if verification_uri != VERIFY_URL
- L92 if self.phase != DevicePhase::AwaitingUser {
- L95 if now >= self.expires_at {
- L99 if now < self.next_poll_at {
- L108 if self.phase != DevicePhase::AwaitingUser {
- L111 if now >= self.expires_at {
- L115 self.phase = match response {
- L136 if self.phase == DevicePhase::AwaitingUser {
- L157 if now >= self.refresh_expires_at {
- L159 } else if now.saturating_add(refresh_margin_seconds) >= self.access_expires_at {

### `crates/repoticker-core/src/lib.rs`

Risk: **High**. Test level: **Unit + contract**. Applicable candidates: N1 N2 N3 N4 N5 N6 N7 N9 N10 N12. Initial additional-case budget (estimate, not tests executed): **9**. Method signatures are source-derived. A cited test suite is only a candidate until branch assertions are audited.

**Methods and types (3)**

- L12: `pub struct RepositoryState {`
- L21: `pub enum SyncDecision {`
- L32: `pub fn classify_sync(state: RepositoryState) -> SyncDecision {`

**Executable branch candidates (6, each conditional requires outcomes)**

- L33 if !state.has_upstream {
- L36 if state.git_operation_in_progress {
- L39 if !state.worktree_clean {
- L42 if state.ahead > 0 && state.behind > 0 {
- L45 if state.ahead > 0 {
- L48 if state.behind > 0 {

### `crates/repoticker-core/src/relay.rs`

Risk: **Critical**. Test level: **Unit + contract**. Applicable candidates: N1 N2 N4 N5 N6 N7 N10. Initial additional-case budget (estimate, not tests executed): **22**. Method signatures are source-derived. A cited test suite is only a candidate until branch assertions are audited.

**Methods and types (10)**

- L10: `pub enum RelayFrame {`
- L17: `pub enum RelayDecision {`
- L23: `fn valid_component(value: &str) -> bool {`
- L33: `fn canonical_repo(value: &str) -> Option<String> {`
- L47: `pub fn parse_frame(raw: &[u8]) -> Result<RelayFrame, &'static str> {`
- L81: `pub struct RelayCursor {`
- L88: `impl RelayCursor {`
- L89: `pub fn new(account: &str, selected: &[String]) -> Result<Self, &'static str> {`
- L109: `pub fn cursor(&self) -> u64 {`
- L113: `pub fn observe(&mut self, frame: RelayFrame) -> RelayDecision {`

**Executable branch candidates (15, each conditional requires outcomes)**

- L37 if parts.next().is_some() \|\| !valid_component(owner) \|\| !valid_component(repo) {
- L48 if raw.is_empty() \|\| raw.len() > MAX_FRAME_BYTES {
- L53 if object.get("v").and_then(Value::as_u64) != Some(1) {
- L65 match kind {
- L66 "hint" if object.len() == 4 => {
- L74 "reset" if object.len() == 3 => Ok(RelayFrame::Reset { cursor }),
- L75 "ready" if object.len() == 3 => Ok(RelayFrame::Ready { cursor }),
- L90 if !valid_component(account) \|\| selected.len() > 100 {
- L95 for source in selected {
- L97 if !repo.starts_with(&format!("{account}/")) \|\| !repositories.insert(repo) {
- L114 match frame {
- L116 if cursor <= self.last {
- L121 if gap {
- L124 if repository.starts_with(&format!("{}/", self.account))
- L141 if changed {

### `crates/repoticker-core/src/shutdown.rs`

Risk: **High**. Test level: **Unit + contract**. Applicable candidates: N4 N5 N9. Initial additional-case budget (estimate, not tests executed): **4**. Method signatures are source-derived. A cited test suite is only a candidate until branch assertions are audited.

**Methods and types (4)**

- L7: `pub struct ShutdownSignal(AtomicBool);`
- L9: `impl ShutdownSignal {`
- L11: `pub fn begin(&self) -> bool {`
- L15: `pub fn is_requested(&self) -> bool {`

**Executable branch candidates (0, each conditional requires outcomes)**

- No branch predicates in this module; check return/error contracts

### `apps/relay-cloudflare/src/hub.mjs`

Risk: **Critical**. Test level: **Unit + integration**. Applicable candidates: N1 N2 N3 N4 N5 N6 N7 N10 N12. Initial additional-case budget (estimate, not tests executed): **22**. Method signatures are source-derived. A cited test suite is only a candidate until branch assertions are audited.

**Methods and types (7)**

- L14: `export class RelayHubController {`
- L15: `constructor(ctx, env, platform = {}) {`
- L29: `history(after) {`
- L52: `ingest(delivery, repository) {`
- L85: `broadcast(hint) {`
- L139: `webSocketMessage(socket, message) {`
- L144: `webSocketClose(socket, code, reason) {`

**Executable branch candidates (21, each conditional requires outcomes)**

- L25 if (typeof WebSocketRequestResponsePair === "function" && ctx.setWebSocketAutoResponse)
- L59 if (existing) return { accepted: true, hint: null };
- L63 if (usage >= INGEST_LIMIT_PER_MINUTE) return { accepted: false, hint: null };
- L86 if (!hint) return;
- L88 for (const socket of this.ctx.getWebSockets()) {
- L90 if (socket.bufferedAmount > 65_536) { socket.close(1008, "backpressure"); continue; }
- L99 if (!await validClientAuthorization(
- L102 if (!allowlist) return fail(503);
- L104 if (pathname === "/ingest" && request.method === "POST") {
- L106 if (!raw) return fail(413);
- L111 if (item?.v !== 1 \|\| !isAllowedRepository(allowlist, repository) \|\| !delivery)
- L114 if (!outcome.accepted) return fail(429);
- L118 if (request.method !== "GET") return fail(405);
- L119 if (pathname !== "/stream" && pathname !== "/changes") return fail(404);
- L121 if (after === null) return fail(400);
- L122 if (pathname === "/changes") {
- L126 if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") return fail(426);
- L127 if (this.ctx.getWebSockets().length >= SOCKET_LIMIT) return fail(429);
- L132 if (snapshot.reset)
- L140 if (message === "ping") socket.send("pong");
- L145 if (socket.readyState === 1) socket.close(code, reason);

### `apps/relay-cloudflare/src/index.ts`

Risk: **Critical**. Test level: **Unit + contract**. Applicable candidates: N1 N2 N3 N4 N5 N6 N7 N9 N10 N12. Initial additional-case budget (estimate, not tests executed): **2**. Method signatures are source-derived. A cited test suite is only a candidate until branch assertions are audited.

**Methods and types (6)**

- L6: `export class RelayHub extends DurableObject {`
- L8: `constructor(ctx: DurableObjectState, env: any) {`
- L12: `fetch(request: Request): Promise<Response> { return this.hub.fetch(request); }`
- L13: `webSocketMessage(socket: WebSocket, message: string \| ArrayBuffer): void {`
- L16: `webSocketClose(socket: WebSocket, code: number, reason: string): void {`
- L22: `fetch(request: Request, env: any): Promise<Response> {`

**Executable branch candidates (0, each conditional requires outcomes)**

- No branch predicates in this module; check return/error contracts

### `apps/relay-cloudflare/src/relay-protocol.mjs`

Risk: **Critical**. Test level: **Unit + contract**. Applicable candidates: N1 N2 N3 N4 N5 N6 N7 N10. Initial additional-case budget (estimate, not tests executed): **36**. Method signatures are source-derived. A cited test suite is only a candidate until branch assertions are audited.

**Methods and types (9)**

- L11: `export function canonicalRepository(value) {`
- L19: `export function allowedRepositories(raw) {`
- L40: `export function isAllowedRepository(allowlist, value) {`
- L49: `export function validDeliveryId(value) {`
- L53: `export function parseCursor(raw) {`
- L60: `export function cursorFromUrl(url) {`
- L68: `export function validatedWorkflowEvent(payload, eventName, allowlist) {`
- L92: `export async function boundedRequestBody(request, limit = BODY_LIMIT) {`
- L125: `export async function validClientAuthorization(header, expectedSecret) {`

**Executable branch candidates (27, each conditional requires outcomes)**

- L12 if (typeof value !== "string" \|\| value.length > 201) return null;
- L14 if (parts.length !== 2 \|\| parts.some(s => s === "." \|\| s === ".." \|\| !REPO_COMPONENT.test(s)))
- L20 if (typeof raw !== "string" \|\| raw.length > 20_100 \|\| !raw) return null;
- L22 if (names.length < 1 \|\| names.length > 100) return null;
- L24 for (const name of names) {
- L34 if (!canonical \|\| authorized.has(canonical)) return null;
- L41 if (!(allowlist instanceof Set)) return false;
- L43 if (!repo) return false;
- L54 if (raw === null \|\| raw === undefined) return 0;
- L55 if (typeof raw !== "string" \|\| !/^(0\|[1-9][0-9]{0,15})$/.test(raw)) return null;
- L62 if (uri.search.length > 48) return null;
- L64 if (names.some(key => key !== "after") \|\| names.length > 1) return null;
- L69 if (eventName === "ping") return { kind: "ping" };
- L70 if (eventName !== "workflow_run" \|\| !(allowlist instanceof Set)) return null;
- L85 if (!Object.hasOwn(statuses, action) \|\|
- L88 if (!isAllowedRepository(allowlist, repository)) return null;
- L93 if (!Number.isInteger(limit) \|\| limit < 1 \|\| limit > BODY_LIMIT) return null;
- L95 if (lengthHeader !== null &&
- L99 if (!reader) return new Uint8Array(0);
- L103 for (;;) {
- L105 if (done) break;
- L106 if (!(value instanceof Uint8Array) \|\| size + value.byteLength > limit) {
- L113 if (lengthHeader !== null && size !== Number(lengthHeader)) return null;
- L116 for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
- L126 if (typeof expectedSecret !== "string" \|\|
- L130 if (supplied.length < SECRET_MIN \|\| supplied.length > SECRET_MAX \|\|
- L140 for (let i = 0; i < 32; i++) difference \|= a[i] ^ b[i];

### `apps/relay-cloudflare/src/webhook-verify.mjs`

Risk: **Critical**. Test level: **Unit + contract**. Applicable candidates: N1 N2 N7 N10. Initial additional-case budget (estimate, not tests executed): **5**. Method signatures are source-derived. A cited test suite is only a candidate until branch assertions are audited.

**Methods and types (1)**

- L5: `export async function verifyGithubWebhookSignature(rawBody, signatureHeader, secret) {`

**Executable branch candidates (4, each conditional requires outcomes)**

- L6 if (!(rawBody instanceof Uint8Array) \|\|
- L9 const match = SIGNATURE.exec(signatureHeader);
- L10 if (!match) return false;
- L12 for (let index = 0; index < signature.length; index++)

### `apps/relay-cloudflare/src/worker.mjs`

Risk: **Critical**. Test level: **Unit + integration**. Applicable candidates: N1 N2 N3 N4 N5 N6 N7 N10 N12. Initial additional-case budget (estimate, not tests executed): **19**. Method signatures are source-derived. A cited test suite is only a candidate until branch assertions are audited.

**Methods and types (1)**

- L51: `export async function handleRelayRequest(request, env) {`

**Executable branch candidates (18, each conditional requires outcomes)**

- L11 if (typeof env.WEBHOOK_SECRET !== "string" \|\| env.WEBHOOK_SECRET.length < 32)
- L13 if (new URL(request.url).search) return fail(400);
- L14 if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i
- L17 if (!body) return fail(413);
- L18 if (!await verifyGithubWebhookSignature(body,
- L21 if (!event) return fail(422);
- L22 if (event.kind === "ping") return fail(204);
- L24 if (!delivery) return fail(422);
- L35 if (!await validClientAuthorization(request.headers.get("authorization"),
- L38 if (request.headers.has("origin") \|\| request.headers.has("cookie")) return fail(403);
- L40 if (after === null) return fail(400);
- L41 if (upgrade && request.headers.get("upgrade")?.toLowerCase() !== "websocket")
- L47 if (upgrade) headers.upgrade = "websocket";
- L53 if (!env?.RELAY_HUB \|\| !await validClientAuthorization(
- L56 if (!allowed) return fail(503);
- L59 if (path === "/v1/github")
- L61 if (path === "/v1/stream")
- L63 if (path === "/v1/changes")


## Mapping obligations

- Core candidate suites: Rust unit tests colocated in each module; `crates/repoticker-core/tests/git_integration.rs`, `github_remote.rs`, plus `tests/git-*.test.mjs` and `tests/mode-b-native-monitor-races.test.mjs`. Verify each assertion is production-exercising, not only source-string matching.
- Relay candidate suites: `tests/relay-*.test.mjs`, `tests/mode-b-relay-*.test.mjs`, `tests/hybrid-reconcile-schedule.test.mjs`, `tests/relay-native-diagnostics.test.mjs`. Validate SQLite transaction and WebSocket actual adapter behavior, not mere stubs.
- N8 applies only to time-sensitive paths (token expiry, cursor age, clock rollback), not to every binary parser. N11 monetization is **not applicable** to these modules because this product has no purchase/entitlement system; usage quota is observational, not subscription unlock.
- Do not mark any uncovered branch as covered solely because a file has a same-named test. Complete all per-method branch outcomes at Stage 4 and verified assertions at Stage 8.
