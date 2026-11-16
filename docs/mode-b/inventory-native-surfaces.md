# Mode B source inventory: native surfaces, credentials and lifecycle

Exact source `5b07a3273a27516af8ceb793f0d427a1bada964b`. Source-derived **discovery candidates**, not audited executed coverage. For modules with inline `#[cfg(test)]` declarations, lexically extracted candidates also include test functions and need classification before Stage 3 sign-off. Validate all platform-specific `#[cfg]` arms independently; only a real native run proves OS/runtime behavior.

Files 11, extracted signatures 137, control/return anchors 166.

### `apps/desktop/src-tauri/src/app_icon.rs`

Risk **High**; level **Unit + platform integration**, likely applicable N1 N2 N4 N5 N6 N8 N9 N10; estimated additional-case ceiling **3** pending assertion reconciliation.

**Signatures (2; include inline Rust test declarations until excluded by source-level review)**
- L5 `pub fn tray_rgba() -> (Vec<u8>, u32, u32) {`
- L15 `pub fn tray_argb() -> (Vec<u8>, u32, u32) {`

**Control-flow/return anchors (1)**
- L18 for pixel in rgba.chunks_exact(4) {

### `apps/desktop/src-tauri/src/autostart.rs`

Risk **High**; level **Unit + platform integration**, likely applicable N1 N2 N4 N5 N6 N8 N9 N10; estimated additional-case ceiling **8** pending assertion reconciliation.

**Signatures (2; include inline Rust test declarations until excluded by source-level review)**
- L6 `pub(crate) fn autostart_is_enabled(app: AppHandle) -> Result<bool, String> {`
- L13 `pub(crate) fn autostart_set_enabled(app: AppHandle, enabled: bool) -> Result<bool, String> {`

**Control-flow/return anchors (6)**
- L18 if previous == enabled {
- L19 return Ok(enabled);
- L21 let result = if enabled {
- L27 match manager.is_enabled() {
- L28 Ok(value) if value == enabled => Ok(value),
- L31 if previous {

### `apps/desktop/src-tauri/src/linux_surface.rs`

Risk **Critical**; level **Unit + platform integration**, likely applicable N1 N2 N4 N5 N6 N8 N9 N12; estimated additional-case ceiling **67** pending assertion reconciliation.

**Signatures (26; include inline Rust test declarations until excluded by source-level review)**
- L13 `fn repoticker_relative_init(callback: extern "C" fn(f64, f64)) -> i32;`
- L14 `fn repoticker_relative_begin() -> i32;`
- L15 `fn repoticker_relative_end();`
- L41 `pub fn enabled() -> bool {`
- L45 `pub fn visible() -> bool {`
- L100 `pub fn install(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {`
- L200 `fn install_usage_surface(`
- L260 `fn on_usage_main(`
- L276 `fn anchor_usage(window: &gtk::ApplicationWindow) {`
- L301 `pub fn show_usage(app: &AppHandle) -> Result<(), String> {`
- L316 `pub fn hide_usage(app: &AppHandle) -> Result<(), String> {`
- L323 `fn set_exact_viewport_height(viewport: &gtk::ScrolledWindow, previous: i32, height: i32) {`
- L333 `pub async fn resize_usage(app: AppHandle, height: i32) -> Result<(), String> {`
- L378 `fn apply_size(window: &gtk::ApplicationWindow, width: i32, height: i32) {`
- L401 `fn on_main(`
- L419 `fn apply_card_height(window: &gtk::ApplicationWindow, height: i32) -> Result<(), String> {`
- L458 `fn validate_card_height(height: i32) -> Result<(), String> {`
- L467 `pub fn request_resize(app: &AppHandle, height: i32) -> Result<(), String> {`
- L478 `pub async fn resize(app: AppHandle, height: i32) -> Result<(), String> {`
- L499 `pub fn show(app: &AppHandle) -> Result<(), String> {`
- L522 `pub fn hide(app: &AppHandle) -> Result<(), String> {`
- L531 `fn persist_now(app: &AppHandle) -> Result<(), String> {`
- L542 `fn stop_on_gtk(app: &AppHandle) -> Result<(), String> {`
- L553 `pub fn cancel_drag(app: &AppHandle) -> Result<(), String> {`
- L563 `pub async fn start_drag(app: &AppHandle) -> Result<(), String> {`
- L585 `pub async fn stop_drag(app: &AppHandle) -> Result<(), String> {`

**Control-flow/return anchors (41)**
- L52 if !DRAG_ACTIVE.load(Ordering::Acquire)
- L57 return;
- L69 if delta_x == 0 && delta_y == 0 {
- L70 return;
- L80 if before != *margins {
- L85 if std::env::var_os("REPOTICKER_UI_DEBUG").is_some() {
- L103 if std::env::var_os("WAYLAND_DISPLAY").is_none() \|\| !gtk_layer_shell::is_supported() {
- L104 return Ok(());
- L121 if let Some(screen) = gtk::prelude::WidgetExt::screen(&layer) {
- L122 if let Some(visual) = screen.rgba_visual() {
- L172 if std::env::var_os("REPOTICKER_UI_DEBUG").is_some() {
- L190 if unsafe { repoticker_relative_init(on_relative_motion) } == 0 {
- L216 if let Some(screen) = gtk::prelude::WidgetExt::screen(&usage) {
- L217 if let Some(visual) = screen.rgba_visual() {
- L266 if let Some(window) = state.borrow().as_ref() {
- L280 if let Some(card) = state.borrow().as_ref() {
- L281 if let Some(gdk_window) = card.window() {
- L283 if let Some(monitor) = display.monitor_at_window(&gdk_window) {
- L284 if window.monitor().as_ref() != Some(&monitor) {
- L302 if !VISIBLE.load(Ordering::Acquire) {
- L303 return Err("Card is hidden".into());
- L310 if let Some(gdk_window) = window.window() {
- L324 if height > previous {
- L334 if !(118..=320).contains(&height) {
- L335 return Err("Invalid usage popup height".into());
- L344 if USAGE_HEIGHT.load(Ordering::Acquire) != height {
- L346 if let Some(viewport) = state.borrow().as_ref() {
- L356 if let Some(content) = state.borrow().as_ref() {
- L408 if let Some(window) = cell.borrow().as_ref() {
- L420 if CARD_HEIGHT.load(Ordering::Acquire) == height {
- L421 return Ok(());
- L433 if let Some(content) = cell.borrow().as_ref() {
- L445 if std::env::var_os("REPOTICKER_UI_DEBUG").is_some() {
- L459 if !(120..=900).contains(&height) {
- L460 return Err("Invalid card height".into());
- L470 if let Err(error) = apply_card_height(window, height) {
- L511 if std::env::var_os("REPOTICKER_UI_DEBUG").is_some() {
- L545 if DRAG_MOVED.swap(false, Ordering::AcqRel) {
- L557 if let Err(error) = stop_on_gtk(&writer) {
- L567 let result = if !VISIBLE.load(Ordering::Acquire) {
- L569 } else if unsafe { repoticker_relative_begin() } == 1 {

### `apps/desktop/src-tauri/src/linux_tray.rs`

Risk **High**; level **Unit + platform integration**, likely applicable N1 N2 N4 N5 N6 N8 N9 N10; estimated additional-case ceiling **13** pending assertion reconciliation.

**Signatures (10; include inline Rust test declarations until excluded by source-level review)**
- L15 `impl LinuxTray {`
- L16 `fn on_ui(&self, action: &'static str) {`
- L32 `impl Tray for LinuxTray {`
- L33 `fn id(&self) -> String {`
- L37 `fn title(&self) -> String {`
- L41 `fn icon_pixmap(&self) -> Vec<Icon> {`
- L50 `fn activate(&mut self, _x: i32, _y: i32) {`
- L54 `fn menu(&self) -> Vec<MenuItem<Self>> {`
- L96 `pub fn install(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {`
- L112 `pub(crate) fn set_language(app: &AppHandle, language: &str) {`

**Control-flow/return anchors (3)**
- L19 let _ = dispatcher.run_on_main_thread(move \|\| match action {
- L99 .unwrap_or_else(\|_\| "en".to_owned());
- L113 if let Some(handle) = app.try_state::<ksni::blocking::Handle<LinuxTray>>() {

### `apps/desktop/src-tauri/src/monitor_cache.rs`

Risk **High**; level **Unit + platform integration**, likely applicable N1 N2 N4 N5 N6 N8 N9 N10; estimated additional-case ceiling **19** pending assertion reconciliation.

**Signatures (10; include inline Rust test declarations until excluded by source-level review)**
- L10 `pub struct MonitorCache {`
- L20 `impl Default for CacheState {`
- L21 `fn default() -> Self {`
- L32 `impl MonitorCache {`
- L33 `pub fn read(&self) -> (bool, Option<Value>, Option<String>) {`
- L48 `pub struct MonitorPresentation {`
- L55 `pub fn github_monitor_snapshot(app: AppHandle) -> MonitorPresentation {`
- L69 `fn default_status_is_unknown_until_wallet_verification() {`
- L77 `fn monitor_projection_uses_only_expected_fields() {`
- L95 `pub fn github_monitor_publish(`

**Control-flow/return anchors (9)**
- L37 .unwrap_or_else(\|poisoned\| poisoned.into_inner());
- L101 if runner_state.as_ref().is_some_and(\|state\| {
- L105 return Err("Invalid monitor summary.".into());
- L107 if runner_state
- L111 return Err("Monitor summary exceeds memory limit.".into());
- L113 if message
- L117 return Err("Invalid monitor status.".into());
- L124 .unwrap_or_else(\|poisoned\| poisoned.into_inner());
- L126 cached.runner_state = if connected { runner_state } else { None };

### `apps/desktop/src-tauri/src/relay_endpoint.rs`

Risk **High**; level **Unit + platform integration**, likely applicable N1 N2 N4 N5 N6 N8 N9 N10; estimated additional-case ceiling **11** pending assertion reconciliation.

**Signatures (4; include inline Rust test declarations until excluded by source-level review)**
- L6 `pub fn normalize_base_url(raw: &str) -> Result<String, String> {`
- L43 `pub fn websocket_url(base: &str, cursor: u64) -> Result<String, String> {`
- L61 `fn only_canonical_public_https_origins_are_stored() {`
- L91 `fn websocket_url_contains_only_cursor_and_validated_origin() {`

**Control-flow/return anchors (7)**
- L7 if raw.is_empty()
- L13 return Err("Relay URL must be an HTTPS origin.".to_owned());
- L20 if parsed.scheme() != "https"
- L36 return Err(
- L44 if cursor > 9_007_199_254_740_991 {
- L45 return Err("Relay cursor is invalid.".to_owned());
- L70 for invalid in [

### `apps/desktop/src-tauri/src/relay_secret.rs`

Risk **Critical**; level **Unit + platform integration**, likely applicable N1 N2 N3 N4 N5 N6 N7 N9 N10 N12; estimated additional-case ceiling **68** pending assertion reconciliation.

**Signatures (34; include inline Rust test declarations until excluded by source-level review)**
- L12 `pub struct RelayPromptGate(AtomicBool);`
- L17 `pub struct RelaySecretDraftState(Mutex<Option<RelaySecretDraft>>);`
- L24 `fn lock_draft(`
- L33 `pub(crate) fn discard_draft(app: &AppHandle) {`
- L38 `pub(crate) fn has_pending_draft(app: &AppHandle) -> bool {`
- L45 `impl Drop for PromptLease {`
- L46 `fn drop(&mut self) {`
- L51 `fn enter_prompt(app: &AppHandle) -> Result<PromptLease, String> {`
- L59 `fn valid_secret(value: &str) -> bool {`
- L66 `fn entry() -> Result<keyring::Entry, String> {`
- L71 `pub(crate) fn read_secret() -> Result<Option<SensitiveSecret>, String> {`
- L88 `pub(crate) fn wipe(value: &mut String) {`
- L103 `impl SensitiveSecret {`
- L104 `pub(crate) fn as_str(&self) -> &str {`
- L109 `impl Drop for SensitiveSecret {`
- L110 `fn drop(&mut self) {`
- L115 `fn store_secret(secret: &SensitiveSecret) -> Result<(), String> {`
- L124 `fn remove_secret() -> Result<(), String> {`
- L131 `fn settings_only(window: &tauri::WebviewWindow) -> Result<(), String> {`
- L139 `pub async fn relay_secret_status(window: tauri::WebviewWindow) -> Result<bool, String> {`
- L162 `pub async fn relay_prompt_secret(`
- L189 `pub async fn relay_stage_secret(`
- L210 `pub async fn relay_clear_secret(`
- L224 `pub async fn relay_commit_secret_draft(`
- L272 `async fn prompt_native(app: &AppHandle) -> Result<Option<String>, String> {`
- L320 `async fn prompt_native(_app: &AppHandle) -> Result<Option<String>, String> {`
- L327 `async fn prompt_native(_app: &AppHandle) -> Result<Option<String>, String> {`
- L346 `fn CredUIPromptForCredentialsW(`
- L366 `fn wide(text: &str) -> Vec<u16> {`
- L370 `pub(super) fn prompt() -> Result<Option<String>, String> {`
- L437 `fn relay_credential_isolated_from_github_auth_record() {`
- L443 `fn strict_base64url_secret_policy_does_not_accept_untrusted_bytes() {`
- L462 `fn replacing_draft_wipes_candidate_without_keyring_write() {`
- L479 `fn wipes_owned_secret_buffer() {`

**Control-flow/return anchors (34)**
- L30 .unwrap_or_else(\|poisoned\| poisoned.into_inner())
- L72 match entry()?.get_password() {
- L75 if valid_secret(&secret.0) {
- L92 for byte in value.as_mut_vec() {
- L116 if !valid_secret(secret.as_str()) {
- L117 return Err("Relay secret must be 32-256 base64url characters.".into());
- L125 match entry()?.delete_credential() {
- L132 if window.label() != "settings" {
- L133 return Err("Relay credentials can only be managed in Settings.".into());
- L141 if let Some(value) = {
- L149 return Ok(value);
- L170 return Ok(false);
- L173 if !valid_secret(candidate.as_str()) {
- L174 return Err("Relay secret must be 32-256 base64url characters.".into());
- L177 if !window.is_visible().unwrap_or(false) {
- L178 return Err("Settings window is no longer open.".into());
- L197 if !valid_secret(candidate.as_str()) {
- L198 return Err("Relay secret must be 32-256 base64url characters.".into());
- L200 if !window.is_visible().unwrap_or(false) {
- L201 return Err("Settings window is no longer open.".into());
- L230 if !window.is_visible().unwrap_or(false) {
- L231 return Err("Settings window is no longer open.".into());
- L241 return Ok(());
- L244 let result = match &change {
- L252 if let Err(error) = outcome {
- L255 return Err(error);
- L259 let operation = match &candidate {
- L264 if std::env::var("REPOTICKER_RELAY_DEBUG").as_deref() == Ok("1") {
- L304 let selected = if dialog.run() == gtk::ResponseType::Accept {
- L405 let extracted = if outcome == 0 {
- L417 for slot in &mut password {
- L420 for slot in &mut username {
- L424 match outcome {
- L444 for invalid in [

### `apps/desktop/src-tauri/src/relay_transport.rs`

Risk **Critical**; level **Unit + platform integration**, likely applicable N1 N2 N3 N4 N5 N6 N7 N8 N9 N10; estimated additional-case ceiling **54** pending assertion reconciliation.

**Signatures (16; include inline Rust test declarations until excluded by source-level review)**
- L35 `pub struct RelayTransportState {`
- L47 `pub struct RelayPhaseEvent {`
- L52 `fn phase_label(code: u8) -> &'static str {`
- L61 `fn reason_label(code: u8) -> &'static str {`
- L84 `fn http_failure_code(status: u16) -> u8 {`
- L94 `fn handshake_failure_code(error: &tokio_tungstenite::tungstenite::Error) -> u8 {`
- L104 `fn snapshot(code: u8) -> RelayPhaseEvent {`
- L111 `fn set_phase(app: &AppHandle, code: u8) {`
- L136 `pub fn relay_connection_status(app: AppHandle) -> &'static str {`
- L145 `pub fn relay_connection_diagnostics(app: AppHandle) -> RelayPhaseEvent {`
- L153 `fn backoff(attempt: u32) -> Duration {`
- L159 `pub fn restart(app: &AppHandle) {`
- L179 `fn send_reconcile(app: &AppHandle, decision: RelayDecision) {`
- L188 `async fn run(app: AppHandle) {`
- L344 `fn reconnect_is_bounded_without_unlimited_retry_frequency() {`
- L352 `fn public_availability_is_only_fixed_nonsecret_phase_data() {`

**Control-flow/return anchors (38)**
- L53 match code {
- L62 match code {
- L85 match status {
- L96 match error {
- L113 if code == 2 {
- L115 } else if code >= 3 && state.last_failure.swap(code, Ordering::AcqRel) != code {
- L122 if state.phase.swap(code, Ordering::AcqRel) != code {
- L124 if std::env::var_os("REPOTICKER_RELAY_DEBUG").is_some() {
- L160 if std::env::var("REPOTICKER_RELAY_DEBUG").as_deref() == Ok("1") {
- L167 let mut slot = state.job.lock().unwrap_or_else(\|err\| err.into_inner());
- L168 if let Some(previous) = slot.take() {
- L180 let kind = match decision {
- L191 return;
- L193 if config.connection_mode != ConnectionMode::Hybrid {
- L195 return;
- L200 if relay_secret::has_pending_draft(&app) {
- L202 return;
- L206 return;
- L210 return;
- L214 return;
- L216 match github_session::github_auth_status(app.clone()).await {
- L217 Ok(status) if status.connected => {}
- L220 return;
- L225 let secret = match tauri::async_runtime::spawn_blocking(relay_secret::read_secret).await {
- L229 return;
- L233 return;
- L241 loop {
- L243 let endpoint = match relay_endpoint::websocket_url(base_url, cursor.cursor()) {
- L247 return;
- L252 let mut request = match endpoint.as_str().into_client_request() {
- L256 return;
- L269 return;
- L281 let failure = match connection {
- L291 loop {
- L294 match frame {
- L296 let parsed = match parse_frame(raw.as_bytes()) {
- L319 if !matches!(tokio::time::timeout(SEND_TIMEOUT, ping).await, Ok(Ok(()))) {
- L361 for (http, expected) in [(401, 10), (403, 11), (404, 12), (503, 13)] {

### `apps/desktop/src-tauri/src/startup_diagnostics.rs`

Risk **High**; level **Unit + platform integration**, likely applicable N1 N2 N4 N5 N6 N8 N9 N10; estimated additional-case ceiling **19** pending assertion reconciliation.

**Signatures (11; include inline Rust test declarations until excluded by source-level review)**
- L9 `pub fn initialize() {`
- L13 `fn enabled() -> bool {`
- L17 `fn write(stage: &'static str, elapsed: Duration) {`
- L29 `pub struct Span {`
- L34 `impl Span {`
- L35 `pub fn new(stage: &'static str) -> Self {`
- L43 `impl Drop for Span {`
- L44 `fn drop(&mut self) {`
- L53 `fn allowed_stage(stage: &str) -> Option<&'static str> {`
- L71 `pub fn trace_startup_stage(stage: String) {`
- L85 `fn only_fixed_nonsecret_startup_milestones_are_accepted() {`

**Control-flow/return anchors (8)**
- L18 if !enabled() {
- L19 return;
- L45 if let Some(started) = self.started {
- L54 match stage {
- L72 if !enabled() {
- L73 return;
- L75 if let Some(label) = allowed_stage(&stage) {
- L91 for unsafe_input in [

### `apps/desktop/src-tauri/src/tray_i18n.rs`

Risk **High**; level **Unit + platform integration**, likely applicable N1 N2 N4 N5 N6 N8 N9 N10; estimated additional-case ceiling **15** pending assertion reconciliation.

**Signatures (8; include inline Rust test declarations until excluded by source-level review)**
- L8 `fn catalog() -> &'static Catalog {`
- L16 `pub(crate) fn is_supported_locale(language: &str) -> bool {`
- L20 `fn text(language: &str, english: &'static str) -> &'static str {`
- L29 `pub(crate) fn label(language: &str, action: &str) -> &'static str {`
- L42 `pub(crate) fn window_title(language: &str, window: &str) -> &'static str {`
- L55 `fn native_registry_contains_exactly_twenty_locales() {`
- L69 `fn every_native_action_and_title_has_a_bundled_string() {`
- L85 `fn unknown_tray_action_is_not_a_command() {`

**Control-flow/return anchors (7)**
- L30 let key = match action {
- L43 match window {
- L57 for code in [
- L63 for invalid in ["pt-BR", "zh", "tl", "", "EN"] {
- L70 for lang in super::catalog().keys() {
- L71 for key in ["open", "settings", "fetch", "sync", "about", "quit"] {
- L74 for kind in ["settings", "about"] {

### `apps/desktop/src-tauri/src/windows_geometry.rs`

Risk **High**; level **Unit + platform integration**, likely applicable N1 N2 N6 N8 N9; estimated additional-case ceiling **26** pending assertion reconciliation.

**Signatures (14; include inline Rust test declarations until excluded by source-level review)**
- L10 `fn placement(`
- L25 `fn monitor_area(window: &WebviewWindow) -> Result<Option<((i64, i64), (i64, i64))>, String> {`
- L44 `pub(crate) fn restore(app: &AppHandle, window: &WebviewWindow) -> Result<(), String> {`
- L73 `pub(crate) fn save(app: &AppHandle, window: &WebviewWindow) -> Result<(), String> {`
- L97 `fn restores_position_for_bottom_right_work_area() {`
- L105 `fn keeps_bottom_edge_when_view_grows() {`
- L113 `fn supports_negative_monitor_coordinates_and_high_dpi_sizes() {`
- L121 `fn clamps_stale_margins_and_oversized_windows() {`
- L136 `fn SetWindowPos(`
- L150 `pub(crate) fn raise_usage_popup(popup: &WebviewWindow) -> Result<(), String> {`
- L183 `fn CreateRoundRectRgn(`
- L191 `fn DeleteObject(handle: *mut std::ffi::c_void) -> i32;`
- L196 `fn SetWindowRgn(hwnd: *mut std::ffi::c_void, region: *mut std::ffi::c_void, redraw: i32)`
- L202 `pub(crate) fn clip_usage_popup(popup: &WebviewWindow) -> Result<(), String> {`

**Control-flow/return anchors (12)**
- L26 let monitor = match window
- L46 return Ok(());
- L75 return Ok(());
- L167 if changed == 0 {
- L168 return Err(std::io::Error::last_os_error().to_string());
- L170 if std::env::var_os("REPOTICKER_UI_DEBUG").is_some() {
- L208 if width <= 0 \|\| height <= 0 {
- L209 return Err("Empty usage popup cannot be clipped".into());
- L215 if region.is_null() {
- L216 return Err(std::io::Error::last_os_error().to_string());
- L219 if attached == 0 {
- L223 return Err(error);


## Coverage evidence to reconcile

- Rust: built-in module tests for `relay_endpoint.rs`, `relay_secret.rs`, `relay_transport.rs`, `windows_geometry.rs`, Linux surface unit and native integration tests where present. Explicitly compare source output and branch decisions.
- JavaScript source contract: `tests/relay-native-diagnostics.test.mjs`, `tests/graceful-quit.test.mjs`, `tests/window-frame.test.mjs`, `tests/windows-*.test.mjs`, `tests/settings-*.test.mjs`. These are not substitute for native Tauri execution.
- Physical: Linux KDE Wayland `gtk-layer-shell`, GTK drag and menu, WebKitGPU shutdown coredump issue #23, Windows NSIS & geometry. Browser-only DOM tests do not cover compositor behavior.
- N11 is not applicable. N8 covers geometry/window scale and event timing only. Signing and distributed builds are inventoried in the release-script family.
