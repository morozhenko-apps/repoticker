# Mode B: native main.rs method-level ownership, inline tests and IPC gaps

Production `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; `apps/desktop/src-tauri/src/main.rs` blob `5ab66298bcaa50668a228d0ef62b99aecb17d134` (2071 lines). Audit parent `5757f33b4f7cabc6eb300bdc6798988f5323cf0e`.

The original lexical inventory has **70 rows**: 2 previously marked `IMPL_BLOCK` containers, and **68 actual native Rust functions** mapped here. Of these, **6 E_PARTIAL** have direct inline Rust tests, **61 P_NATIVE** require direct command/OS assertion reconciliation, **1 BOOTSTRAP_P** is the startup `main()`. `P_NATIVE` does NOT mean a failed or untested *dependency*: Git core, JsonStore, Rust shutdown and Settings/Quota UI fake-IPC have their own executable test credit. No test was run in this audit turn.

## Every method with its exact native owner

| Line | Actual source method | Evidence status | Workstream |
| ---: | --- | --- | --- |
| 60 | `fn drop(&mut self) {` | P_NATIVE | GIT |
| 113 | `fn allows(self, conclusion: &str) -> bool {` | E_PARTIAL | SETTINGS |
| 123 | `fn default_language() -> String {` | P_NATIVE | SETTINGS |
| 173 | `fn notify_progress(` | P_NATIVE | GIT |
| 195 | `fn config_path(app: &AppHandle) -> Result<PathBuf, String> {` | P_NATIVE | SETTINGS |
| 202 | `fn default_config() -> Config {` | P_NATIVE | SETTINGS |
| 217 | `fn read_config(app: &AppHandle) -> Result<Config, String> {` | P_NATIVE | SETTINGS |
| 227 | `fn update_config<R>(` | P_NATIVE | SETTINGS |
| 236 | `fn roots_as_paths(config: &Config) -> Vec<PathBuf> {` | P_NATIVE | SETTINGS |
| 240 | `fn decision_label(decision: SyncDecision) -> String {` | P_NATIVE | GIT |
| 252 | `fn present(repo: RepoSnapshot) -> RepoSummary {` | P_NATIVE | GIT |
| 266 | `fn scan(app: &AppHandle) -> Result<Snapshot, String> {` | P_NATIVE | GIT |
| 301 | `fn git_action_result(` | P_NATIVE | GIT |
| 348 | `fn should_schedule_git_target(` | E_PARTIAL | GIT |
| 359 | `fn execute(` | P_NATIVE | GIT |
| 501 | `async fn get_snapshot(app: AppHandle) -> Result<Snapshot, String> {` | P_NATIVE | GIT |
| 511 | `fn get_monitor_scope(app: AppHandle) -> Result<Option<String>, String> {` | P_NATIVE | SETTINGS |
| 526 | `fn get_monitor_selection(app: AppHandle) -> Result<MonitorSelection, String> {` | P_NATIVE | SETTINGS |
| 550 | `fn get_settings_config(app: AppHandle) -> Result<SettingsConfig, String> {` | P_NATIVE | SETTINGS |
| 566 | `fn add_root(app: AppHandle, root: String) -> Result<Vec<String>, String> {` | P_NATIVE | SETTINGS |
| 585 | `fn remove_root(app: AppHandle, root: String) -> Result<Vec<String>, String> {` | P_NATIVE | SETTINGS |
| 598 | `fn cancel_git_fetch(app: AppHandle) -> Result<bool, String> {` | P_NATIVE | GIT |
| 612 | `async fn perform_git_action(` | P_NATIVE | GIT |
| 623 | `fn resize_unmanaged_card(window: &tauri::WebviewWindow, height: f64) -> Result<(), String> {` | P_NATIVE | POPUP |
| 647 | `async fn set_card_view(` | P_NATIVE | POPUP |
| 683 | `fn ui_hover_debug_enabled() -> bool {` | P_NATIVE | POPUP |
| 688 | `fn trace_ui_hover(kind: String, stage: String, sequence: u32) {` | P_NATIVE | POPUP |
| 724 | `fn get_usage_popup_kind() -> &'static str {` | P_NATIVE | POPUP |
| 737 | `fn footer_anchored_usage_position(` | E_PARTIAL | POPUP |
| 756 | `fn position_unmanaged_usage_popup(` | P_NATIVE | POPUP |
| 807 | `fn show_usage_popup(app: AppHandle, kind: String) -> Result<(), String> {` | P_NATIVE | POPUP |
| 886 | `fn hide_usage_popup(app: AppHandle) -> Result<(), String> {` | P_NATIVE | POPUP |
| 911 | `async fn resize_usage_popup(app: AppHandle, height: i32) -> Result<(), String> {` | P_NATIVE | POPUP |
| 945 | `fn hide_card(app: AppHandle) -> Result<(), String> {` | P_NATIVE | POPUP |
| 967 | `fn show_compact_card(app: &AppHandle) {` | P_NATIVE | POPUP |
| 1017 | `fn show_settings(app: &AppHandle) {` | P_NATIVE | POPUP |
| 1044 | `fn show_about(app: &AppHandle) {` | P_NATIVE | POPUP |
| 1056 | `fn hide_about(app: AppHandle) -> Result<(), String> {` | P_NATIVE | POPUP |
| 1071 | `fn get_about_info() -> AboutInfo {` | P_NATIVE | POPUP |
| 1079 | `fn launch_browser(url: &str) -> Result<(), String> {` | P_NATIVE | EXTERNAL |
| 1094 | `fn open_project_website() -> Result<(), String> {` | P_NATIVE | EXTERNAL |
| 1100 | `fn trusted_relay_resource_url(resource: &str) -> Option<&'static str> {` | E_PARTIAL | EXTERNAL |
| 1111 | `fn open_relay_resource(window: tauri::WebviewWindow, resource: String) -> Result<(), String> {` | P_NATIVE | EXTERNAL |
| 1147 | `fn open_actions_job(url: String) -> Result<(), String> {` | P_NATIVE | EXTERNAL |
| 1177 | `fn enrolled_repository(app: &AppHandle, repo_path: &str) -> Result<PathBuf, String> {` | P_NATIVE | EXTERNAL |
| 1190 | `async fn open_repository_on_github(app: AppHandle, repo_path: String) -> Result<(), String> {` | P_NATIVE | EXTERNAL |
| 1201 | `fn launch_file_manager(path: &std::path::Path) -> Result<(), String> {` | P_NATIVE | EXTERNAL |
| 1216 | `async fn open_repository_folder(app: AppHandle, repo_path: String) -> Result<(), String> {` | P_NATIVE | EXTERNAL |
| 1227 | `async fn copy_repository_path(app: AppHandle, repo_path: String) -> Result<(), String> {` | P_NATIVE | EXTERNAL |
| 1242 | `async fn start_card_drag(app: AppHandle) -> Result<bool, String> {` | P_NATIVE | DRAG |
| 1256 | `async fn stop_card_drag(app: AppHandle) -> Result<(), String> {` | P_NATIVE | DRAG |
| 1276 | `fn open_settings(app: AppHandle) {` | P_NATIVE | EXTERNAL |
| 1281 | `fn start_settings_drag(app: AppHandle) -> Result<(), String> {` | P_NATIVE | DRAG |
| 1291 | `async fn select_repository_root(app: AppHandle) -> Result<Option<String>, String> {` | P_NATIVE | SETTINGS |
| 1315 | `fn clear_relay_url_for_polling(config: &mut Config) -> bool {` | E_PARTIAL | SETTINGS |
| 1324 | `fn save_settings(` | P_NATIVE | SETTINGS |
| 1444 | `fn close_settings(app: AppHandle) -> Result<(), String> {` | P_NATIVE | SETTINGS |
| 1620 | `fn validate_monitor_repositories(` | E_PARTIAL | SETTINGS |
| 1651 | `fn github_set_monitor_org(` | P_NATIVE | SETTINGS |
| 1685 | `fn set_language(app: AppHandle, language: String) -> Result<(), String> {` | P_NATIVE | SETTINGS |
| 1699 | `fn toggle_card(app: &AppHandle) {` | P_NATIVE | TRAY_QUIT |
| 1726 | `fn tray_image() -> Image<'static> {` | P_NATIVE | TRAY_QUIT |
| 1732 | `fn build_desktop_tray_menu(app: &AppHandle, language: &str) -> tauri::Result<Menu<tauri::Wry>> {` | P_NATIVE | TRAY_QUIT |
| 1780 | `fn refresh_tray_language(app: &AppHandle, language: &str) {` | P_NATIVE | TRAY_QUIT |
| 1797 | `fn request_quit(app: &AppHandle) {` | P_NATIVE | TRAY_QUIT |
| 1834 | `fn dispatch_menu_action(app: &AppHandle, operation: &'static str) {` | P_NATIVE | TRAY_QUIT |
| 1844 | `fn configure_gdk_for_native_wayland() {` | P_NATIVE | TRAY_QUIT |
| 1858 | `fn main() {` | BOOTSTRAP_P | TRAY_QUIT |

## Genuine directly tested functions

`main.rs` contains 11 inline Rust unit tests total, with these six directly invoked production methods:

| Production line | Matching inline test and assertion owner |
| ---: | --- |
| 113 | ci_notification_mode_restricts_conclusions (Off/Failures/Successes/Both × success/failure/unknown) |
| 348 | safe_sync_accounts_for_every_discovered_repo_state; fetch_remains_unfiltered...; unsupported_operations_never_schedule_a_checkout |
| 737 | expanded_drawer_does_not_move_tooltip_away_from_bottom_status_strip; applies_dpi_scale_once_to_both_logical_insets |
| 1100 | only_fixed_deployment_guide_is_allowed (valid guide, six invalid choices) |
| 1315 | saved_polling_clears_legacy_relay_origin_without_changing_hybrid |
| 1620 | selected_repositories_require_same_account_and_valid_names (case, other-owner, traversal, duplicate, 101) |

Other inline tests prove legacy serde Config behavior and mode defaults, **not direct `save_settings`, `perform_git_action`, `get_monitor_selection` or `request_quit` command execution**. Settings JS has 132 real imported controller tests with injected *fake native* Tauri IPC, not a real AppHandle/Keyring.

## Workstreams and real missing branches

| Workstream | Methods | Actual command/OS acceptance needed |
| --- | ---: | --- |
| GIT | 11 | native OperationLock, cancellation, scoped Git snapshot and Quit |
| SETTINGS | 19 | actual JsonStore/AppHandle transaction, selected owner and Relay/ETag side effects |
| POPUP | 16 | native popup kind, DPI, Linux Layer Shell, Windows WebView and hide/show |
| EXTERNAL | 11 | URL allowlist, enrolled repo opener, clipboard, file manager |
| DRAG | 3 | native Wayland/Windows gesture start/end |
| TRAY_QUIT | 8 | native tray, Quit ownership and app startup |

**GIT / A2:** UI double Fetch means one native Fetch and a separate `cancel_git_fetch`. Two direct native `perform_git_action("fetch")` calls may be serialized but can both run in sequence; do not assert fictitious native coalescence. Verify native OperationLock, Git refs/branch recheck, queued request after Quit, failed child termination and never mutation on invalid root/target.

**SETTINGS:** `save_settings` persists config, while Settings JS separately stages/commits OS Keyring. Exact config-before-event/ETag invalidation/Relay restart order, rejected write, scope 100/101 and keyring-after-write failures need AppHandle/JsonStore with isolated credentials. Cross-resource rollback policy is a **material security/persistence STOP FACTOR if a production change is needed**, not a presumed defect.

**POPUP / Q3:** Native `show_usage_popup` accepts fixed runners/tasks/billing and sets native kind. Source has Linux layer-shell versus unmanaged Windows paths, native show/raise/focus/position. Inline `footer_anchored_usage_position` assertions test geometry and DPI **only**, not real popup display, native command authority or out-of-order Quota event arbitration.

**EXTERNAL:** `trusted_relay_resource_url("guide")` is directly covered by a strict allowlist test. Actual `open_relay_resource` caller window label, `open_actions_job` malformed URL, enrolled repo path, file manager and clipboard permissions must still be verified at command boundary. Do not silently modify external URL trust contracts.

**DRAG / TRAY / QUIT:** Actual Wayland pointer bridge, Windows z-order, tray locale refresh, registered Git operation termination and Quit owner cannot be certified from JS helper tests. Pure `ShutdownSignal` Rust tests prove thread-safe ownership only; exact native `request_quit` and OS shutdown remain separate.

## Stage 9 and negative matrix ownership

The six E_PARTIAL methods remain partial across N1–N12; the 61 P_NATIVE paths require tailored positive/negative scopes rather than one token test each. N1 malformed input, N2 boundaries, N3 external network, N4 retries, N5 concurrent Git/Keyring/Quit, N6 corrupt config/stale monitor, N7 IPC authorization and enrolled path, N8 locale/time/DPI, N9 OS focus/hide, N10 no secret/log leakage, and N12 disk/Keyring failure vary by function; N11 is NA. Focus future tests on `A2/G2`, `MS1–MS5`, `Q3` native kind, trusted external openers and physical OS checks after global Stages 3–8 branch/interaction signoff.

No production/test/CI modifications, no Rust/Node suite execution or native OS state changes. Mode B remains PARTIAL.
