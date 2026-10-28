#![cfg_attr(
    all(target_os = "windows", not(debug_assertions)),
    windows_subsystem = "windows"
)]
//! RepoTicker desktop: local-only roots, Git provider and tray card.
mod app_icon;
mod autostart;
mod ci_notifications;
mod github_api;
mod github_etag_cache;
mod github_native;
mod github_oauth_wire;
mod github_rate_gate;
mod github_session;
mod monitor_cache;
mod startup_diagnostics;
mod tray_i18n;
#[cfg(target_os = "windows")]
mod windows_geometry;

use repoticker_core::{
    config_store::JsonStore,
    git::{self, FetchCancellation, GitError, OperationOutcome, RepoSnapshot},
    shutdown::ShutdownSignal,
    SyncDecision,
};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU8, Ordering};
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};
#[cfg(target_os = "linux")]
mod linux_surface;
#[cfg(target_os = "linux")]
mod linux_tray;

#[cfg(not(target_os = "linux"))]
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::DialogExt;

#[derive(Default)]
struct OperationLock(Mutex<()>);

#[derive(Default)]
struct ActiveFetch(Mutex<Option<Arc<FetchCancellation>>>);

struct ActiveFetchLease<'a>(&'a ActiveFetch);

impl Drop for ActiveFetchLease<'_> {
    fn drop(&mut self) {
        if let Ok(mut active) = self.0 .0.lock() {
            *active = None;
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct Config {
    roots: Vec<String>,
    #[serde(default)]
    ignored_child_names: Vec<String>,
    #[serde(default = "default_language")]
    language: String,
    #[serde(default)]
    card_bottom_margin: Option<i32>,
    #[serde(default)]
    card_right_margin: Option<i32>,
    #[serde(default)]
    github_monitor_org: Option<String>,
    #[serde(default)]
    github_monitor_repositories: Vec<String>,
    #[serde(default)]
    ci_failure_notifications: bool,
}

fn default_language() -> String {
    "en".into()
}

#[derive(Serialize)]
struct RepoSummary {
    path: String,
    name: String,
    branch: String,
    upstream: Option<String>,
    ahead: u64,
    behind: u64,
    dirty: bool,
    sync_state: String,
    ci: Option<String>,
}

#[derive(Serialize)]
struct Snapshot {
    roots: Vec<String>,
    language: String,
    repositories: Vec<RepoSummary>,
    errors: Vec<String>,
    ci_running: Option<u32>,
    ci_queued: Option<u32>,
    runners_online: Option<u32>,
    connected: bool,
    runner_state: Option<serde_json::Value>,
    monitor_message: Option<String>,
    github_monitor_org: Option<String>,
}

#[derive(Serialize, Clone)]
struct ActionResult {
    path: String,
    status: String,
    message: String,
}

#[derive(Serialize, Clone)]
struct GitProgress {
    operation: String,
    path: String,
    completed: usize,
    total: usize,
    phase: String,
    status: Option<String>,
}

fn notify_progress(
    app: &AppHandle,
    operation: &str,
    path: &str,
    completed: usize,
    total: usize,
    phase: &str,
    status: Option<&str>,
) {
    let _ = app.emit(
        "repoticker-git-progress",
        GitProgress {
            operation: operation.to_owned(),
            path: path.to_owned(),
            completed,
            total,
            phase: phase.to_owned(),
            status: status.map(str::to_owned),
        },
    );
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|path| path.join("config.json"))
        .map_err(|err| format!("Cannot determine config directory: {err}"))
}

fn default_config() -> Config {
    Config {
        roots: Vec::new(),
        ignored_child_names: Vec::new(),
        language: default_language(),
        card_bottom_margin: None,
        card_right_margin: None,
        github_monitor_org: None,
        github_monitor_repositories: Vec::new(),
        ci_failure_notifications: false,
    }
}

fn read_config(app: &AppHandle) -> Result<Config, String> {
    let path = config_path(app)?;
    Ok(app
        .state::<JsonStore>()
        .read::<Config>(&path)?
        .unwrap_or_else(default_config))
}

/// All native configuration edits must run inside this one serialized
/// read/modify/write transaction, not separate read_config/save calls.
fn update_config<R>(
    app: &AppHandle,
    change: impl FnOnce(&mut Config) -> Result<(R, bool), String>,
) -> Result<R, String> {
    let path = config_path(app)?;
    app.state::<JsonStore>()
        .update(&path, default_config, change)
}

fn roots_as_paths(config: &Config) -> Vec<PathBuf> {
    config.roots.iter().map(PathBuf::from).collect()
}

fn decision_label(decision: SyncDecision) -> String {
    match decision {
        SyncDecision::FastForward { commits } => format!("behind {commits}"),
        SyncDecision::UpToDate => "current".into(),
        SyncDecision::LocalAhead => "ahead".into(),
        SyncDecision::Diverged => "diverged".into(),
        SyncDecision::LocalChanges => "local changes".into(),
        SyncDecision::NoUpstream => "no upstream".into(),
        SyncDecision::GitOperationInProgress => "operation in progress".into(),
    }
}

fn present(repo: RepoSnapshot) -> RepoSummary {
    RepoSummary {
        path: repo.path.to_string_lossy().into_owned(),
        name: repo.name,
        branch: repo.branch.unwrap_or_else(|| "(detached)".into()),
        upstream: repo.upstream,
        ahead: repo.ahead,
        behind: repo.behind,
        dirty: repo.dirty,
        sync_state: decision_label(repo.decision),
        ci: None,
    }
}

fn scan(app: &AppHandle) -> Result<Snapshot, String> {
    let _scan = startup_diagnostics::Span::new("git.scan_total");
    let config = read_config(app)?;
    let (repositories, mut errors) = {
        let _discover = startup_diagnostics::Span::new("git.discover");
        git::discover_all_with_ignored(&roots_as_paths(&config), &config.ignored_child_names)
    };
    let mut summaries = Vec::new();
    {
        let _inspect = startup_diagnostics::Span::new("git.inspect_all");
        for (path, result) in git::inspect_all(repositories) {
            match result {
                Ok(status) => summaries.push(present(status)),
                Err(err) => errors.push(format!("{}: {err}", path.display())),
            }
        }
    }
    summaries.sort_by(|a, b| a.name.cmp(&b.name).then(a.path.cmp(&b.path)));
    let (connected, runner_state, monitor_message) =
        app.state::<monitor_cache::MonitorCache>().read();
    Ok(Snapshot {
        roots: config.roots,
        language: config.language,
        repositories: summaries,
        errors,
        ci_running: None,
        ci_queued: None,
        runners_online: None,
        connected,
        runner_state,
        monitor_message,
        github_monitor_org: config.github_monitor_org,
    })
}

fn git_action_result(
    path: &std::path::Path,
    outcome: Result<OperationOutcome, GitError>,
) -> ActionResult {
    let path = path.to_string_lossy().into_owned();
    match outcome {
        Ok(OperationOutcome::Fetched) => ActionResult {
            path,
            status: "fetched".into(),
            message: "Fetch complete".into(),
        },
        Ok(OperationOutcome::Updated(commits)) => ActionResult {
            path,
            status: "updated".into(),
            message: format!("Fast-forwarded by {commits} commits"),
        },
        Ok(OperationOutcome::Pushed(commits)) => ActionResult {
            path,
            status: "pushed".into(),
            message: format!("Pushed {commits} commits"),
        },
        Ok(OperationOutcome::AlreadyCurrent) => ActionResult {
            path,
            status: "current".into(),
            message: "Already current".into(),
        },
        Ok(OperationOutcome::Skipped(decision)) => ActionResult {
            path,
            status: "skipped".into(),
            message: decision_label(decision),
        },
        Err(GitError(error)) if error == git::FETCH_CANCELLED => ActionResult {
            path,
            status: "cancelled".into(),
            message: error,
        },
        Err(GitError(error)) => ActionResult {
            path,
            status: "error".into(),
            message: error,
        },
    }
}

/// Admission is independent from Safe Sync eligibility: the Git core must
/// account for every discovered checkout, including no-ops and failures.
/// Only the legacy pull-only command preserves its historical prefilter.
fn should_schedule_git_target(
    operation: &str,
    inspect_decision: impl FnOnce() -> Option<SyncDecision>,
) -> bool {
    match operation {
        "fetch" | "safe_sync" => true,
        "safe_pull" => matches!(inspect_decision(), Some(SyncDecision::FastForward { .. })),
        _ => false,
    }
}

fn execute(
    app: &AppHandle,
    operation: &str,
    only_path: Option<&str>,
) -> Result<Vec<ActionResult>, String> {
    if operation != "fetch" && operation != "safe_pull" && operation != "safe_sync" {
        return Err("Unknown Git operation".into());
    }
    let state = app.state::<OperationLock>();
    let _guard = state.0.lock().map_err(|_| "Git operation lock poisoned")?;
    if app.state::<ShutdownSignal>().is_requested() {
        return Err("RepoTicker is shutting down".into());
    }
    let active_fetch = app.state::<ActiveFetch>();
    let cancellation = if operation == "fetch" {
        let token = Arc::new(FetchCancellation::default());
        *active_fetch
            .0
            .lock()
            .map_err(|_| "Fetch state unavailable")? = Some(Arc::clone(&token));
        Some(token)
    } else {
        None
    };
    let _fetch_lease = cancellation
        .as_ref()
        .map(|_| ActiveFetchLease(&active_fetch));
    // Close the race when Quit was requested after admission under
    // OperationLock, but before the Fetch token was published.
    if app.state::<ShutdownSignal>().is_requested() {
        if let Some(token) = cancellation.as_ref() {
            if let Err(error) = token.cancel() {
                eprintln!("RepoTicker quit Fetch cancellation failed: {error}");
            }
        }
        return Err("RepoTicker is shutting down".into());
    }
    let config = read_config(app)?;
    let (repositories, failures) =
        git::discover_all_with_ignored(&roots_as_paths(&config), &config.ignored_child_names);
    if let Some(requested) = only_path {
        if !repositories
            .iter()
            .any(|path| path.to_string_lossy() == requested)
        {
            return Err("Repository is not enrolled or no longer valid".into());
        }
    }
    let mut results: Vec<ActionResult> = failures
        .into_iter()
        .map(|message| ActionResult {
            path: String::new(),
            status: "error".into(),
            message,
        })
        .collect();

    let targets: Vec<_> = repositories
        .into_iter()
        .filter(|path| only_path.is_none_or(|requested| path.to_string_lossy() == requested))
        .filter(|path| {
            should_schedule_git_target(operation, || {
                git::inspect(path).ok().map(|status| status.decision)
            })
        })
        .collect();
    let total = targets.len();
    notify_progress(app, operation, "", 0, total, "begin", None);

    if operation == "fetch" {
        // At most four independent repositories in flight. Repeated fetches
        // in the same application are serialized by OperationLock.
        let completed = repoticker_core::bounded::bounded_map(
            targets,
            4,
            |path| {
                let outcome = git::fetch_with_cancel(
                    &path,
                    cancellation.as_ref().expect("active Fetch token"),
                );
                (path, outcome)
            },
            |path, already_done, _| {
                notify_progress(
                    app,
                    operation,
                    &path.to_string_lossy(),
                    already_done,
                    total,
                    "start",
                    None,
                );
            },
            |(path, outcome), done, _| {
                notify_progress(
                    app,
                    operation,
                    &path.to_string_lossy(),
                    done,
                    total,
                    "complete",
                    Some(match outcome {
                        Ok(_) => "fetched",
                        Err(GitError(error)) if error == git::FETCH_CANCELLED => "cancelled",
                        Err(_) => "error",
                    }),
                );
            },
        );
        results.extend(
            completed
                .into_iter()
                .map(|(path, outcome)| git_action_result(&path, outcome)),
        );
    } else {
        // Safe sync and legacy Safe pull mutate checkouts sequentially.
        for (index, path) in targets.into_iter().enumerate() {
            let display_path = path.to_string_lossy().into_owned();
            notify_progress(app, operation, &display_path, index, total, "start", None);
            let outcome = if operation == "safe_sync" {
                git::safe_sync(&path)
            } else {
                git::safe_pull(&path)
            };
            let result = git_action_result(&path, outcome);
            notify_progress(
                app,
                operation,
                &display_path,
                index + 1,
                total,
                "complete",
                Some(&result.status),
            );
            results.push(result);
        }
    }
    notify_progress(app, operation, "", total, total, "finish", None);
    Ok(results)
}

#[tauri::command]
async fn get_snapshot(app: AppHandle) -> Result<Snapshot, String> {
    let _snapshot = startup_diagnostics::Span::new("git.snapshot_ipc");
    tauri::async_runtime::spawn_blocking(move || scan(&app))
        .await
        .map_err(|err| err.to_string())?
}

/// Read only the configured GitHub monitor scope. Remote monitoring
/// must not wait for a full local Git discovery/inspection snapshot.
#[tauri::command]
fn get_monitor_scope(app: AppHandle) -> Result<Option<String>, String> {
    let _scope = startup_diagnostics::Span::new("config.monitor_scope");
    Ok(read_config(&app)?.github_monitor_org)
}

/// Read the monitored account and its repository filter in one config read,
/// avoiding mixed old/new account selections between IPC calls.
#[derive(Serialize)]
struct MonitorSelection {
    github_monitor_org: Option<String>,
    github_monitor_repositories: Vec<String>,
    ci_failure_notifications: bool,
}

#[tauri::command]
fn get_monitor_selection(app: AppHandle) -> Result<MonitorSelection, String> {
    let config = read_config(&app)?;
    Ok(MonitorSelection {
        github_monitor_org: config.github_monitor_org,
        github_monitor_repositories: config.github_monitor_repositories,
        ci_failure_notifications: config.ci_failure_notifications,
    })
}

/// Settings must not wait for `git::discover_all` and `git::inspect`.
/// This returns only the persisted, non-secret settings shown in its form.
#[derive(Serialize)]
struct SettingsConfig {
    roots: Vec<String>,
    language: String,
    github_monitor_org: Option<String>,
    github_monitor_repositories: Vec<String>,
    ignored_child_names: Vec<String>,
    ci_failure_notifications: bool,
}

#[tauri::command]
fn get_settings_config(app: AppHandle) -> Result<SettingsConfig, String> {
    let _config = startup_diagnostics::Span::new("config.settings");
    let config = read_config(&app)?;
    Ok(SettingsConfig {
        roots: config.roots,
        language: config.language,
        github_monitor_org: config.github_monitor_org,
        github_monitor_repositories: config.github_monitor_repositories,
        ignored_child_names: config.ignored_child_names,
        ci_failure_notifications: config.ci_failure_notifications,
    })
}

#[tauri::command]
fn add_root(app: AppHandle, root: String) -> Result<Vec<String>, String> {
    let canonical = git::normalize_root(&root).map_err(|err| err.to_string())?;
    git::discover(&canonical).map_err(|err| err.to_string())?;
    let text = canonical.to_string_lossy().into_owned();
    let (roots, changed) = update_config(&app, |config| {
        let changed = !config.roots.contains(&text);
        if changed {
            config.roots.push(text);
            config.roots.sort();
        }
        Ok(((config.roots.clone(), changed), changed))
    })?;
    if changed {
        let _ = app.emit("repoticker-config-changed", ());
    }
    Ok(roots)
}

#[tauri::command]
fn remove_root(app: AppHandle, root: String) -> Result<Vec<String>, String> {
    let roots = update_config(&app, |config| {
        if !config.roots.contains(&root) {
            return Err("Root is not enrolled".into());
        }
        config.roots.retain(|value| value != &root);
        Ok((config.roots.clone(), true))
    })?;
    let _ = app.emit("repoticker-config-changed", ());
    Ok(roots)
}

#[tauri::command]
fn cancel_git_fetch(app: AppHandle) -> Result<bool, String> {
    let token = app
        .state::<ActiveFetch>()
        .0
        .lock()
        .map_err(|_| "Fetch state unavailable")?
        .clone();
    match token {
        Some(token) => token.cancel().map_err(|error| error.to_string()),
        None => Ok(false),
    }
}

#[tauri::command]
async fn perform_git_action(
    app: AppHandle,
    operation: String,
    repo_path: Option<String>,
) -> Result<Vec<ActionResult>, String> {
    tauri::async_runtime::spawn_blocking(move || execute(&app, &operation, repo_path.as_deref()))
        .await
        .map_err(|err| err.to_string())?
}

/// Preserve the bottom edge when resizing a regular Tauri popup.
fn resize_unmanaged_card(window: &tauri::WebviewWindow, height: f64) -> Result<(), String> {
    let before_position = window.outer_position().ok();
    let before_size = window.outer_size().ok();
    window
        .set_size(tauri::LogicalSize::new(390.0, height))
        .map_err(|err| format!("Cannot resize card: {err}"))?;

    if let (Some(position), Some(size)) = (before_position, before_size) {
        let scale = window.scale_factor().unwrap_or(1.0);
        let new_physical_height = (height * scale).round() as i64;
        let bottom = i64::from(position.y) + i64::from(size.height);
        let top = bottom - new_physical_height;
        if let Ok(top) = i32::try_from(top) {
            // Position changes are unsupported by some Wayland compositors.
            // Keep the popup usable even if the request is rejected.
            let _ = window.set_position(tauri::PhysicalPosition::new(position.x, top));
        }
    }
    Ok(())
}

/// The card grows upward from its previous bottom edge when the platform
/// permits setting window coordinates. Wayland compositors may deny it.
#[tauri::command]
async fn set_card_view(
    app: AppHandle,
    view: String,
    repository_count: Option<usize>,
) -> Result<(), String> {
    let height = match view.as_str() {
        "compact" => {
            if cfg!(target_os = "windows") {
                108.0
            } else {
                122.0
            }
        }
        "repos" => {
            let count = repository_count.unwrap_or(0);
            let rows = count.clamp(1, 10);
            (122 + 18 + 35 * rows + if count == 0 { 8 } else { 0 }) as f64
        }
        "settings" => 318.0,
        _ => return Err("Unknown card view".into()),
    };
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Card window is unavailable".to_owned())?;

    #[cfg(target_os = "linux")]
    if linux_surface::enabled() {
        return linux_surface::resize(app, height as i32).await;
    }

    resize_unmanaged_card(&window, height)
}

// Fixed, explicitly opt-in hover diagnostics. Values are bounded to static
// labels; callers cannot inject paths, account names or provider payloads.
#[tauri::command]
fn ui_hover_debug_enabled() -> bool {
    std::env::var_os("REPOTICKER_UI_DEBUG").is_some()
}

#[tauri::command]
fn trace_ui_hover(kind: String, stage: String, sequence: u32) {
    if !ui_hover_debug_enabled() {
        return;
    }
    let kind = match kind.as_str() {
        "runners" => "runners",
        "tasks" => "tasks",
        "billing" => "billing",
        "none" => "none",
        _ => return,
    };
    let stage = match stage.as_str() {
        "ready" => "ready",
        "reset" => "reset",
        "pointer-enter" => "pointer-enter",
        "enter" => "enter",
        "leave" => "leave",
        "requested" => "requested",
        "queue-visible" => "queue-visible",
        "queue-hidden" => "queue-hidden",
        "queue-skip" => "queue-skip",
        "show-ipc" => "show-ipc",
        "show-resolved" => "show-resolved",
        "hide-ipc" => "hide-ipc",
        "hide-resolved" => "hide-resolved",
        "ipc-error" => "ipc-error",
        _ => return,
    };
    eprintln!("RepoTicker hover trace: seq={sequence} stage={stage} kind={kind}");
}

// Authoritative selected view survives missed events while the detached GTK
// Layer Shell WebView is hidden. No polling or GitHub API call is involved.
static USAGE_KIND: AtomicU8 = AtomicU8::new(0);

#[tauri::command]
fn get_usage_popup_kind() -> &'static str {
    match USAGE_KIND.load(Ordering::Acquire) {
        1 => "runners",
        2 => "tasks",
        _ => "billing",
    }
}

// Position the tooltip relative to the fixed footer, not the moving
// top edge of the expandable repositories drawer. These are logical
// pixel dimensions from the existing card layout:
// bottom padding (10) + actions (70) + status strip (25) + gap (20).
// On high DPI monitors the caller applies the window scale exactly once.
fn footer_anchored_usage_position(
    card_position: (i64, i64),
    card_size: (i64, i64),
    popup_size: (i64, i64),
    scale: f64,
) -> (i64, i64) {
    const RIGHT_INSET_LOGICAL: f64 = 24.0;
    const FOOTER_CLEARANCE_LOGICAL: f64 = 125.0;
    (
        card_position.0 + card_size.0
            - popup_size.0
            - (RIGHT_INSET_LOGICAL * scale).round() as i64,
        card_position.1 + card_size.1
            - popup_size.1
            - (FOOTER_CLEARANCE_LOGICAL * scale).round() as i64,
    )
}

// Unmanaged Windows/X11 popup: preserve bottom anchoring across drawer
// expansion, and reposition after content-driven resize. Clamp to the
// active monitor work area so the popup does not escape the screen.
fn position_unmanaged_usage_popup(
    card: &tauri::WebviewWindow,
    popup: &tauri::WebviewWindow,
) -> Result<(), String> {
    let position = card.outer_position().map_err(|error| error.to_string())?;
    let card_size = card.outer_size().map_err(|error| error.to_string())?;
    let popup_size = popup.outer_size().map_err(|error| error.to_string())?;
    let scale = card.scale_factor().map_err(|error| error.to_string())?;
    let (mut x, mut y) = footer_anchored_usage_position(
        (i64::from(position.x), i64::from(position.y)),
        (i64::from(card_size.width), i64::from(card_size.height)),
        (i64::from(popup_size.width), i64::from(popup_size.height)),
        scale,
    );
    if let Some(monitor) = card.current_monitor().map_err(|error| error.to_string())? {
        let area = monitor.work_area();
        let left = i64::from(area.position.x);
        let top = i64::from(area.position.y);
        let right = left + (i64::from(area.size.width) - i64::from(popup_size.width)).max(0);
        let bottom = top + (i64::from(area.size.height) - i64::from(popup_size.height)).max(0);
        x = x.clamp(left, right);
        y = y.clamp(top, bottom);
    }
    let x = i32::try_from(x).map_err(|_| "Invalid tooltip x coordinate")?;
    let y = i32::try_from(y).map_err(|_| "Invalid tooltip y coordinate")?;
    popup
        .set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod footer_tooltip_geometry_tests {
    use super::footer_anchored_usage_position;

    #[test]
    fn expanded_drawer_does_not_move_tooltip_away_from_bottom_status_strip() {
        let popup_size = (340, 180);
        let compact = footer_anchored_usage_position((250, 600), (390, 108), popup_size, 1.0);
        let expanded = footer_anchored_usage_position((250, 218), (390, 490), popup_size, 1.0);
        assert_eq!(compact, (276, 403));
        assert_eq!(expanded, compact);
    }

    #[test]
    fn applies_dpi_scale_once_to_both_logical_insets() {
        let physical = footer_anchored_usage_position(
            (100, 100),
            (585, 162),
            (510, 270),
            1.5,
        );
        assert_eq!(physical, (139, -196));
    }
}

#[tauri::command]
fn show_usage_popup(app: AppHandle, kind: String) -> Result<(), String> {
    let code = match kind.as_str() {
        "runners" => 1,
        "tasks" => 2,
        "billing" => 0,
        _ => return Err("Unsupported status tooltip.".into()),
    };
    if ui_hover_debug_enabled() {
        eprintln!("RepoTicker usage popup IPC received: {kind}");
    }
    USAGE_KIND.store(code, Ordering::Release);
    // Explicit target-dependent selection: cfg on an if/else would remove
    // BOTH branches on Windows, silently returning Ok without showing.
    #[cfg(target_os = "linux")]
    let use_unmanaged_popup = !linux_surface::enabled();
    #[cfg(not(target_os = "linux"))]
    let use_unmanaged_popup = true;

    #[cfg(target_os = "linux")]
    if !use_unmanaged_popup {
        linux_surface::show_usage(&app)?;
    }
    if use_unmanaged_popup {
        let card = app
            .get_webview_window("main")
            .ok_or_else(|| "Card unavailable".to_owned())?;
        let popup = app
            .get_webview_window("usage")
            .ok_or_else(|| "Usage popup unavailable".to_owned())?;
        if let Err(error) = position_unmanaged_usage_popup(&card, &popup) {
            // Geometry failure must not prevent showing the tooltip.
            eprintln!("RepoTicker usage popup positioning unavailable: {error}");
        }
        // On Windows, native SetWindowPos after show establishes actual
        // topmost z-order above the card without activating the tooltip.
        // The high-level always-on-top flag alone does not guarantee ordering.
        // Focus and cursor pass-through are best-effort OS hints.
        #[cfg(target_os = "windows")]
        {
            if let Err(error) = popup.set_focusable(false) {
                eprintln!("RepoTicker usage popup focus hint unavailable: {error}");
            }
            if let Err(error) = popup.set_ignore_cursor_events(true) {
                eprintln!("RepoTicker usage popup cursor hint unavailable: {error}");
            }
        }
        if std::env::var_os("REPOTICKER_UI_DEBUG").is_some() {
            eprintln!("RepoTicker usage popup show requested: {kind}");
        }
        popup
            .show()
            .map_err(|error| format!("Usage popup show failed: {error}"))?;
        #[cfg(target_os = "windows")]
        windows_geometry::raise_usage_popup(&popup)
            .map_err(|error| format!("Usage popup native ordering failed: {error}"))?;
        if std::env::var_os("REPOTICKER_UI_DEBUG").is_some() {
            eprintln!("RepoTicker usage popup visible: {kind}");
        }
    }
    // Deliver a typed presentation change even when the detached usage
    // window missed an ordinary event. The injected string is selected from
    // static literals above, never from an arbitrary provider response.
    if let Some(usage) = app.get_webview_window("usage") {
        let script = match code {
            1 => "window.__repotickerSetHoverKind?.('runners')",
            2 => "window.__repotickerSetHoverKind?.('tasks')",
            _ => "window.__repotickerSetHoverKind?.('billing')",
        };
        let _ = usage.eval(script);
    }
    let _ = app.emit_to("usage", "repoticker-usage-shown", kind);
    Ok(())
}

#[tauri::command]
fn hide_usage_popup(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    if linux_surface::enabled() {
        return linux_surface::hide_usage(&app);
    }
    let popup = app
        .get_webview_window("usage")
        .ok_or_else(|| "Usage popup unavailable".to_owned())?;
    if std::env::var_os("REPOTICKER_UI_DEBUG").is_some() {
        eprintln!("RepoTicker usage popup hide requested: visible={:?}", popup.is_visible());
    }
    popup.hide().map_err(|error| error.to_string())?;
    if std::env::var_os("REPOTICKER_UI_DEBUG").is_some() {
        eprintln!("RepoTicker usage popup hidden: visible={:?}", popup.is_visible());
    }
    Ok(())
}

#[tauri::command]
async fn resize_usage_popup(app: AppHandle, height: i32) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    if linux_surface::enabled() {
        return linux_surface::resize_usage(app, height).await;
    }
    let popup = app
        .get_webview_window("usage")
        .ok_or_else(|| "Usage popup unavailable".to_owned())?;
    popup
        .set_size(tauri::LogicalSize::new(340.0, f64::from(height)))
        .map_err(|error| error.to_string())?;
    if let Some(card) = app.get_webview_window("main") {
        if let Err(error) = position_unmanaged_usage_popup(&card, &popup) {
            eprintln!("RepoTicker usage popup resize placement failed: {error}");
        }
    }
    #[cfg(target_os = "windows")]
    if popup
        .is_visible()
        .map_err(|error| format!("Usage popup visibility check failed: {error}"))?
    {
        windows_geometry::raise_usage_popup(&popup)
            .map_err(|error| format!("Usage popup resize ordering failed: {error}"))?;
    }
    Ok(())
}

#[tauri::command]
fn hide_card(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Card window is unavailable".to_owned())?;
    #[cfg(target_os = "linux")]
    if linux_surface::enabled() {
        linux_surface::hide(&app)?;
        linux_surface::request_resize(&app, 122)?;
        let _ = app.emit("repoticker-card-hidden", ());
        return Ok(());
    }
    let _ = hide_usage_popup(app.clone());
    #[cfg(target_os = "windows")]
    if let Err(error) = windows_geometry::save(&app, &window) {
        // A read-only or unavailable config must never prevent hiding the card.
        eprintln!("RepoTicker Windows anchor save failed: {error}");
    }
    window.hide().map_err(|err| err.to_string())?;
    let _ = app.emit("repoticker-card-hidden", ());
    Ok(())
}

fn show_compact_card(app: &AppHandle) {
    let _ = hide_usage_popup(app.clone());
    // On KDE the resize and show requests must be ordered on GTK's main
    // thread before notifying WebView. Never update cached height early.
    #[cfg(target_os = "linux")]
    if linux_surface::enabled() {
        if let Err(error) = linux_surface::request_resize(app, 122) {
            eprintln!("RepoTicker Layer Shell compact resize: {error}");
        }
        let _ = app.emit("repoticker-reset-view", ());
        if let Err(error) = linux_surface::show(app) {
            eprintln!("RepoTicker Layer Shell show: {error}");
        }
        let _ = app.emit("repoticker-card-shown", ());
        return;
    }

    // Non-layer-shell platforms retain the existing compact geometry.
    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = resize_unmanaged_card(
            &window,
            if cfg!(target_os = "windows") {
                108.0
            } else {
                122.0
            },
        ) {
            eprintln!("RepoTicker compact resize: {error}");
        }
        #[cfg(target_os = "windows")]
        if let Err(error) = windows_geometry::restore(app, &window) {
            eprintln!("RepoTicker Windows anchor restore failed: {error}");
        }
        let _ = app.emit("repoticker-reset-view", ());
        let _ = window.show();
        let _ = window.set_focus();
        #[cfg(target_os = "linux")]
        if std::env::var_os("REPOTICKER_UI_DEBUG").is_some() {
            eprintln!(
                "RepoTicker fallback geometry: requested=390x122 outer={:?} inner={:?} position={:?} scale={:?}",
                window.outer_size(),
                window.inner_size(),
                window.outer_position(),
                window.scale_factor()
            );
        }
        let _ = app.emit("repoticker-card-shown", ());
    }
}

fn show_settings(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let language = read_config(app)
            .map(|config| config.language)
            .unwrap_or_else(|_| "en".to_owned());
        let _ = window.set_title(tray_i18n::window_title(&language, "settings"));
        let _ = window.show();
        let _ = window.set_focus();
        let _ = app.emit("repoticker-settings-opened", ());
    }
}

fn show_about(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("about") {
        let language = read_config(app)
            .map(|config| config.language)
            .unwrap_or_else(|_| "en".to_owned());
        let _ = window.set_title(tray_i18n::window_title(&language, "about"));
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[derive(Serialize)]
struct AboutInfo {
    version: &'static str,
    author: &'static str,
    website: &'static str,
}

#[tauri::command]
fn get_about_info() -> AboutInfo {
    AboutInfo {
        version: env!("CARGO_PKG_VERSION"),
        author: "Stanislav Moseyko (morozhenko)",
        website: "https://morozhenko.com",
    }
}

fn launch_browser(url: &str) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    let mut command = std::process::Command::new("xdg-open");
    #[cfg(target_os = "macos")]
    let mut command = std::process::Command::new("open");
    #[cfg(target_os = "windows")]
    let mut command = std::process::Command::new("explorer");
    command
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Cannot open browser: {error}"))
}

#[tauri::command]
fn open_project_website() -> Result<(), String> {
    launch_browser("https://morozhenko.com")
}

/// Open an allowlisted GitHub Actions job in the user's web browser.
#[tauri::command]
fn open_actions_job(url: String) -> Result<(), String> {
    let path = url
        .strip_prefix("https://github.com/")
        .ok_or_else(|| "Untrusted GitHub Actions URL".to_owned())?;
    if path.contains(['?', '#', '@']) || path.contains("//") {
        return Err("Untrusted GitHub Actions URL".into());
    }
    let parts: Vec<_> = path.trim_end_matches('/').split('/').collect();
    let safe_name = |s: &str| {
        !s.is_empty()
            && s != "."
            && s != ".."
            && s.bytes()
                .all(|ch| ch.is_ascii_alphanumeric() || b"_.-".contains(&ch))
    };
    if parts.len() != 7
        || !safe_name(parts[0])
        || !safe_name(parts[1])
        || parts[2] != "actions"
        || parts[3] != "runs"
        || parts[5] != "job"
        || !parts[4].bytes().all(|ch| ch.is_ascii_digit())
        || !parts[6].bytes().all(|ch| ch.is_ascii_digit())
    {
        return Err("Untrusted GitHub Actions URL".into());
    }
    launch_browser(&url)
}

/// Central enrollment boundary for user-triggered repository actions.
fn enrolled_repository(app: &AppHandle, repo_path: &str) -> Result<PathBuf, String> {
    let config = read_config(app)?;
    git::resolve_enrolled_checkout_with_ignored(
        &roots_as_paths(&config),
        repo_path,
        &config.ignored_child_names,
    )
    .map_err(|error| error.to_string())
}

/// Open only the canonical GitHub origin of a currently enrolled checkout.
/// A WebView-supplied path cannot cause arbitrary URL or filesystem opening.
#[tauri::command]
async fn open_repository_on_github(app: AppHandle, repo_path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let selected = enrolled_repository(&app, &repo_path)?;
        let url = git::github_origin_url(&selected).map_err(|error| error.to_string())?;
        launch_browser(&url)
    })
    .await
    .map_err(|error| error.to_string())?
}

/// File manager navigation never accepts arbitrary WebView-supplied paths.
fn launch_file_manager(path: &std::path::Path) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    let mut command = std::process::Command::new("xdg-open");
    #[cfg(target_os = "macos")]
    let mut command = std::process::Command::new("open");
    #[cfg(target_os = "windows")]
    let mut command = std::process::Command::new("explorer.exe");
    command
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Cannot open repository folder: {error}"))
}

#[tauri::command]
async fn open_repository_folder(app: AppHandle, repo_path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let selected = enrolled_repository(&app, &repo_path)?;
        launch_file_manager(&selected)
    })
    .await
    .map_err(|error| error.to_string())?
}

/// Clipboard access is write-only and limited to the verified checkout path.
#[tauri::command]
async fn copy_repository_path(app: AppHandle, repo_path: String) -> Result<(), String> {
    let owned = app.clone();
    let selected =
        tauri::async_runtime::spawn_blocking(move || enrolled_repository(&owned, &repo_path))
            .await
            .map_err(|error| error.to_string())??;
    let text = selected
        .to_str()
        .ok_or_else(|| "Repository path cannot be copied as UTF-8".to_owned())?;
    app.clipboard()
        .write_text(text)
        .map_err(|_| "Cannot copy repository path to system clipboard".to_owned())
}

#[tauri::command]
async fn start_card_drag(app: AppHandle) -> Result<bool, String> {
    #[cfg(target_os = "linux")]
    if linux_surface::enabled() {
        linux_surface::start_drag(&app).await?;
        return Ok(true);
    }
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Card unavailable".to_owned())?;
    window.start_dragging().map_err(|error| error.to_string())?;
    Ok(false)
}

#[tauri::command]
async fn stop_card_drag(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    if linux_surface::enabled() {
        return linux_surface::stop_drag(&app).await;
    }
    #[cfg(target_os = "windows")]
    {
        let window = app
            .get_webview_window("main")
            .ok_or_else(|| "Card unavailable".to_owned())?;
        return windows_geometry::save(&app, &window);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        Ok(())
    }
}

#[tauri::command]
fn open_settings(app: AppHandle) {
    show_settings(&app);
}

#[tauri::command]
async fn select_repository_root(app: AppHandle) -> Result<Option<String>, String> {
    let (sender, receiver) = tokio::sync::oneshot::channel();
    // The plugin owns the OS dialog; the WebView receives only the chosen path.
    // Cancellation produces None and never mutates enrolled roots.
    app.dialog().file().pick_folder(move |selected| {
        let _ = sender.send(selected);
    });
    let selected = receiver
        .await
        .map_err(|_| "Folder selection unavailable".to_owned())?;
    match selected {
        None => Ok(None),
        Some(folder) => {
            let path = folder
                .into_path()
                .map_err(|_| "Folder path is not a local filesystem path".to_owned())?;
            path.to_str()
                .map(|text| Some(text.to_owned()))
                .ok_or_else(|| "Folder path cannot be represented as UTF-8".to_owned())
        }
    }
}

#[tauri::command]
fn save_settings(
    app: AppHandle,
    roots: Option<Vec<String>>,
    language: Option<String>,
    ignored_child_names: Option<Vec<String>>,
    ci_failure_notifications: Option<bool>,
) -> Result<(), String> {
    if language
        .as_deref()
        .is_some_and(|locale| !tray_i18n::is_supported_locale(locale))
    {
        return Err("Unsupported language".into());
    }
    let mut validated = None;
    if let Some(roots) = roots {
        if roots.len() > 100 {
            return Err("Too many enrolled roots".into());
        }
        let mut paths = Vec::new();
        for root in roots {
            let canonical = git::normalize_root(&root).map_err(|err| err.to_string())?;
            git::discover(&canonical).map_err(|err| err.to_string())?;
            let text = canonical.to_string_lossy().into_owned();
            if !paths.contains(&text) {
                paths.push(text);
            }
        }
        paths.sort();
        validated = Some(paths);
    }
    let ignored = ignored_child_names
        .map(git::validate_ignored_child_names)
        .transpose()
        .map_err(|error| error.to_string())?;
    let mut saved_locale = None;
    let changed = update_config(&app, |config| {
        let mut changed = false;
        if let Some(roots) = validated {
            if config.roots != roots {
                config.roots = roots;
                changed = true;
            }
        }
        if let Some(language) = language {
            if config.language != language {
                config.language = language;
                saved_locale = Some(config.language.clone());
                changed = true;
            }
        }
        if let Some(enabled) = ci_failure_notifications {
            if config.ci_failure_notifications != enabled {
                config.ci_failure_notifications = enabled;
                changed = true;
            }
        }
        if let Some(ignored) = ignored {
            if config.ignored_child_names != ignored {
                config.ignored_child_names = ignored;
                changed = true;
            }
        }
        Ok((changed, changed))
    })?;
    if let Some(locale) = saved_locale {
        refresh_tray_language(&app, &locale);
    }
    if changed {
        let _ = app.emit("repoticker-config-changed", ());
    }
    Ok(())
}

#[tauri::command]
fn close_settings(app: AppHandle) -> Result<(), String> {
    github_session::cancel_pending(&app);
    let window = app
        .get_webview_window("settings")
        .ok_or_else(|| "Settings window is unavailable".to_owned())?;
    window.hide().map_err(|err| err.to_string())
}

/// A missing `repositories` argument preserves the selection for legacy
/// same-account callers; an explicit empty list means "monitor all".

#[cfg(test)]
mod git_target_admission_tests {
    use super::{should_schedule_git_target, SyncDecision};
    use std::cell::Cell;

    #[test]
    fn safe_sync_accounts_for_every_discovered_repo_state() {
        for decision in [
            Some(SyncDecision::FastForward { commits: 2 }),
            Some(SyncDecision::LocalAhead),
            Some(SyncDecision::UpToDate),
            Some(SyncDecision::NoUpstream),
            Some(SyncDecision::LocalChanges),
            Some(SyncDecision::Diverged),
            Some(SyncDecision::GitOperationInProgress),
            None, // An inspection error is returned by the actual core action.
        ] {
            let inspected = Cell::new(false);
            assert!(should_schedule_git_target("safe_sync", || {
                inspected.set(true);
                decision
            }));
            assert!(
                !inspected.get(),
                "The core owns the final Safe Sync inspection"
            );
        }
    }

    #[test]
    fn fetch_remains_unfiltered_and_legacy_pull_retains_narrow_eligibility() {
        let inspected = Cell::new(false);
        assert!(should_schedule_git_target("fetch", || {
            inspected.set(true);
            None
        }));
        assert!(
            !inspected.get(),
            "Fetch admission must never inspect Git status"
        );
        for decision in [
            Some(SyncDecision::UpToDate),
            Some(SyncDecision::NoUpstream),
            Some(SyncDecision::LocalAhead),
            Some(SyncDecision::LocalChanges),
            Some(SyncDecision::Diverged),
            Some(SyncDecision::GitOperationInProgress),
            None,
        ] {
            assert!(!should_schedule_git_target("safe_pull", || decision));
        }
        assert!(should_schedule_git_target("safe_pull", || {
            Some(SyncDecision::FastForward { commits: 1 })
        }));
    }

    #[test]
    fn unsupported_operations_never_schedule_a_checkout() {
        assert!(!should_schedule_git_target("push_force", || {
            panic!("No Git inspection should occur for unknown operations")
        }));
    }
}

#[cfg(test)]
mod monitor_selection_tests {
    use super::*;

    #[test]
    fn legacy_config_without_repositories_defaults_to_all() {
        let old = serde_json::json!({
            "roots": [],
            "language": "en",
            "github_monitor_org": "team"
        });
        let config: Config = serde_json::from_value(old).unwrap();
        assert!(config.github_monitor_repositories.is_empty());
        assert!(config.ignored_child_names.is_empty());
        assert!(!config.ci_failure_notifications);
    }

    #[test]
    fn selected_repositories_require_same_account_and_valid_names() {
        assert_eq!(
            validate_monitor_repositories(
                Some("Team"),
                vec!["team/zebra".to_owned(), "Team/alpha".to_owned()]
            )
            .unwrap(),
            vec!["Team/alpha", "team/zebra"]
        );
        assert!(validate_monitor_repositories(Some("team"), vec!["other/private".into()]).is_err());
        assert!(validate_monitor_repositories(Some("team"), vec!["team/../bad".into()]).is_err());
        assert!(validate_monitor_repositories(
            Some("team"),
            vec!["team/repo".into(), "TEAM/REPO".into()]
        )
        .is_err());
        assert!(validate_monitor_repositories(None, vec!["team/repo".into()]).is_err());
        assert!(validate_monitor_repositories(
            Some("team"),
            (0..101).map(|i| format!("team/repo{i}")).collect()
        )
        .is_err());
        assert!(validate_monitor_repositories(None, Vec::new())
            .unwrap()
            .is_empty());
    }
}

fn validate_monitor_repositories(
    org: Option<&str>,
    repositories: Vec<String>,
) -> Result<Vec<String>, String> {
    if repositories.len() > 100 || (!repositories.is_empty() && org.is_none()) {
        return Err("Invalid GitHub repository selection.".into());
    }
    let mut selected = Vec::new();
    for repository in repositories {
        let Some((owner, name)) = repository.split_once('/') else {
            return Err("Invalid GitHub repository selection.".into());
        };
        if !org.is_some_and(|account| owner.eq_ignore_ascii_case(account))
            || !github_api::valid_name(owner)
            || !github_api::valid_name(name)
            || name.contains('/')
            || name == "."
            || name == ".."
            || selected
                .iter()
                .any(|item: &String| item.eq_ignore_ascii_case(&repository))
        {
            return Err("Invalid GitHub repository selection.".into());
        }
        selected.push(repository);
    }
    selected.sort_unstable_by_key(|name| name.to_ascii_lowercase());
    Ok(selected)
}

#[tauri::command]
fn github_set_monitor_org(
    app: AppHandle,
    org: Option<String>,
    repositories: Option<Vec<String>>,
) -> Result<(), String> {
    if org
        .as_ref()
        .is_some_and(|name| !github_api::valid_name(name))
    {
        return Err("Invalid GitHub account.".into());
    }
    update_config(&app, |config| {
        let changed_account = match (config.github_monitor_org.as_deref(), org.as_deref()) {
            (Some(previous), Some(next)) => !previous.eq_ignore_ascii_case(next),
            (None, None) => false,
            _ => true,
        };
        let selected = match repositories {
            Some(names) => validate_monitor_repositories(org.as_deref(), names)?,
            None if changed_account => Vec::new(),
            None => config.github_monitor_repositories.clone(),
        };
        config.github_monitor_org = org;
        config.github_monitor_repositories = selected;
        Ok(((), true))
    })?;
    app.state::<github_etag_cache::GitHubETagCache>()
        .invalidate();
    let _ = app.emit("repoticker-github-scope-changed", ());
    Ok(())
}

#[tauri::command]
fn set_language(app: AppHandle, language: String) -> Result<(), String> {
    if !tray_i18n::is_supported_locale(&language) {
        return Err("Unsupported language".into());
    }
    let language_for_tray = language.clone();
    update_config(&app, |config| {
        config.language = language;
        Ok(((), true))
    })?;
    refresh_tray_language(&app, &language_for_tray);
    let _ = app.emit("repoticker-config-changed", ());
    Ok(())
}

fn toggle_card(app: &AppHandle) {
    #[cfg(target_os = "linux")]
    if linux_surface::enabled() {
        if linux_surface::visible() {
            let _ = linux_surface::hide(app);
            let _ = linux_surface::request_resize(app, 122);
            let _ = app.emit("repoticker-card-hidden", ());
        } else {
            show_compact_card(app);
        }
        return;
    }
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            #[cfg(target_os = "windows")]
            if let Err(error) = windows_geometry::save(app, &window) {
                eprintln!("RepoTicker Windows anchor save failed: {error}");
            }
            let _ = window.hide();
            let _ = app.emit("repoticker-card-hidden", ());
        } else {
            show_compact_card(app);
        }
    }
}

#[cfg(not(target_os = "linux"))]
fn tray_image() -> Image<'static> {
    let (rgba, width, height) = app_icon::tray_rgba();
    Image::new_owned(rgba, width, height)
}

#[cfg(not(target_os = "linux"))]
fn build_desktop_tray_menu(app: &AppHandle, language: &str) -> tauri::Result<Menu<tauri::Wry>> {
    let open = MenuItem::with_id(
        app,
        "open",
        tray_i18n::label(language, "open"),
        true,
        None::<&str>,
    )?;
    let settings = MenuItem::with_id(
        app,
        "settings",
        tray_i18n::label(language, "settings"),
        true,
        None::<&str>,
    )?;
    let fetch = MenuItem::with_id(
        app,
        "fetch",
        tray_i18n::label(language, "fetch"),
        true,
        None::<&str>,
    )?;
    let sync = MenuItem::with_id(
        app,
        "sync",
        tray_i18n::label(language, "sync"),
        true,
        None::<&str>,
    )?;
    let about = MenuItem::with_id(
        app,
        "about",
        tray_i18n::label(language, "about"),
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(
        app,
        "quit",
        tray_i18n::label(language, "quit"),
        true,
        None::<&str>,
    )?;
    Menu::with_items(app, &[&open, &settings, &fetch, &sync, &about, &quit])
}

/// A settings write must not be reported as failed merely because the
/// platform tray temporarily cannot repaint (e.g. shell restarting).
fn refresh_tray_language(app: &AppHandle, language: &str) {
    #[cfg(target_os = "linux")]
    linux_tray::set_language(app, language);

    #[cfg(not(target_os = "linux"))]
    if let Some(tray) = app.tray_by_id("repoticker") {
        if let Err(error) =
            build_desktop_tray_menu(app, language).and_then(|menu| tray.set_menu(Some(menu)))
        {
            eprintln!("RepoTicker tray locale refresh unavailable: {error}");
        }
    }
}

/// Explicit Quit must not orphan an owned Fetch or interrupt Safe sync.
/// Keep the OS main loop responsive while the current Git operation drains.
/// Repeated menu activation owns no second shutdown worker.
fn request_quit(app: &AppHandle) {
    if !app.state::<ShutdownSignal>().begin() {
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let active = match app.state::<ActiveFetch>().0.lock() {
            Ok(state) => state.clone(),
            Err(_) => {
                eprintln!("RepoTicker quit refused: active Fetch registry unavailable");
                return;
            }
        };
        if let Some(token) = active {
            if let Err(error) = token.cancel() {
                // The worker still owns a bounded child watchdog. Do not
                // exit before it has returned an outcome and released the lock.
                eprintln!("RepoTicker quit Fetch cancellation failed: {error}");
            }
        }
        let operation = app.state::<OperationLock>();
        // Keep the state owner alive longer than the guard/result temporary;
        // matching a direct lock() call here caused E0597 in desktop compile.
        let operation_guard = operation.0.lock();
        match operation_guard {
            Ok(_guard) => {
                // The application may exit only after all registered Git
                // worker groups have completed their bounded cleanup.
                app.exit(0);
            }
            Err(_) => {
                eprintln!("RepoTicker quit refused: Git operation lock poisoned");
            }
        }
    });
}

fn dispatch_menu_action(app: &AppHandle, operation: &'static str) {
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let result = execute(&app, operation, None);
        // The card refreshes its local status after the action completes.
        let _ = app.emit("repoticker-git-action-finished", result);
    });
}

#[cfg(target_os = "linux")]
fn configure_gdk_for_native_wayland() {
    // GDK_BACKEND=x11 inside a real KDE Wayland session caused RepoTicker
    // to take the Tauri/XWayland fallback: 390x200 instead of 390x122,
    // rubber-band movement, and no persisted Layer Shell margins.
    // This must run before Tauri initializes GTK, not in setup().
    let wayland_session =
        std::env::var("XDG_SESSION_TYPE").is_ok_and(|value| value.eq_ignore_ascii_case("wayland"));
    let wayland_socket =
        std::env::var("WAYLAND_DISPLAY").is_ok_and(|value| !value.trim().is_empty());
    if wayland_session && wayland_socket {
        std::env::set_var("GDK_BACKEND", "wayland");
    }
}

fn main() {
    startup_diagnostics::initialize();
    #[cfg(target_os = "linux")]
    configure_gdk_for_native_wayland();

    tauri::Builder::default()
        // Must precede all other plugins so a second launch never reaches setup.
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("RepoTicker")
                .build(),
        )
        .manage(OperationLock::default())
        .manage(ActiveFetch::default())
        .manage(ShutdownSignal::default())
        .manage(JsonStore::default())
        .manage(monitor_cache::MonitorCache::default())
        .manage(ci_notifications::DeliveredAlerts::default())
        .manage(github_rate_gate::GitHubRateGate::default())
        .manage(github_api::GitHubRestClient::default())
        .manage(github_etag_cache::GitHubETagCache::default())
        .manage(std::sync::Arc::new(
            github_session::GitHubAuthManager::default(),
        ))
        .setup(|app| {
            // Explicit per-window icon: the OS titlebar is independent from
            // the tray icon and WebView's About PNG. Without this GTK may
            // fall back to a generic WebView icon even when the DEB icon is
            // correctly installed.
            for label in ["settings", "about"] {
                if let Some(window) = app.get_webview_window(label) {
                    let (rgba, width, height) = app_icon::tray_rgba();
                    if let Err(error) =
                        window.set_icon(tauri::image::Image::new_owned(rgba, width, height))
                    {
                        eprintln!("RepoTicker native window icon unavailable: {error}");
                    }
                }
            }
            #[cfg(target_os = "linux")]
            {
                linux_surface::install(app)?;
                // This line is always emitted so user logs distinguish the
                // native KDE Layer Shell path from Tauri/X11 fallback.
                eprintln!(
                    "RepoTicker surface mode={} session={} wayland_display={} gdk_backend={}",
                    if linux_surface::enabled() {
                        "gtk-layer-shell"
                    } else {
                        "tauri-fallback"
                    },
                    std::env::var("XDG_SESSION_TYPE").unwrap_or_else(|_| "unknown".to_owned()),
                    std::env::var_os("WAYLAND_DISPLAY").is_some(),
                    std::env::var("GDK_BACKEND").unwrap_or_else(|_| "default".to_owned()),
                );
                linux_tray::install(app)?;
            }

            #[cfg(not(target_os = "linux"))]
            {
                let language = read_config(app.handle())
                    .map(|config| config.language)
                    .unwrap_or_else(|_| "en".to_owned());
                let menu = build_desktop_tray_menu(app.handle(), &language)?;

                TrayIconBuilder::with_id("repoticker")
                    .icon(tray_image())
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id().as_ref() {
                        "open" => show_compact_card(app),
                        "settings" => show_settings(app),
                        "about" => show_about(app),
                        "fetch" => dispatch_menu_action(app, "fetch"),
                        "sync" => dispatch_menu_action(app, "safe_sync"),
                        "quit" => request_quit(app),
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            toggle_card(tray.app_handle());
                        }
                    })
                    .build(app)?;
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            #[cfg(target_os = "linux")]
            if !linux_surface::enabled()
                && window.label() == "main"
                && std::env::var_os("REPOTICKER_UI_DEBUG").is_some()
            {
                match event {
                    tauri::WindowEvent::Resized(size) => {
                        eprintln!("RepoTicker fallback resized: {size:?}");
                    }
                    tauri::WindowEvent::Moved(position) => {
                        eprintln!("RepoTicker fallback moved: {position:?}");
                    }
                    _ => {}
                }
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if window.label() == "usage" {
                    let _ = hide_usage_popup(window.app_handle().clone());
                    return;
                }
                if window.label() == "settings" || window.label() == "about" {
                    let _ = window.hide();
                    return;
                }
                #[cfg(target_os = "linux")]
                if linux_surface::enabled() {
                    let _ = linux_surface::hide(window.app_handle());
                    let _ = linux_surface::request_resize(window.app_handle(), 122);
                } else {
                    let _ = window.hide();
                }
                #[cfg(target_os = "windows")]
                if window.label() == "main" {
                    // on_window_event exposes tauri::Window, but native
                    // geometry owns a WebviewWindow. Resolve the typed handle.
                    if let Some(card) = window.app_handle().get_webview_window("main") {
                        if let Err(error) = windows_geometry::save(window.app_handle(), &card) {
                            eprintln!("RepoTicker Windows close anchor save failed: {error}");
                        }
                    }
                }
                #[cfg(not(target_os = "linux"))]
                let _ = window.hide();
                let _ = window.app_handle().emit("repoticker-card-hidden", ());
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_snapshot,
            get_monitor_scope,
            get_monitor_selection,
            get_settings_config,
            autostart::autostart_is_enabled,
            autostart::autostart_set_enabled,
            ci_notifications::ci_failure_notify,
            startup_diagnostics::trace_startup_stage,
            github_session::github_auth_status,
            github_session::github_flow_status,
            github_api::github_api_get,
            github_rate_gate::github_api_cooldown_seconds,
            monitor_cache::github_monitor_publish,
            monitor_cache::github_monitor_snapshot,
            github_set_monitor_org,
            github_session::github_begin,
            github_session::github_cancel,
            github_session::github_disconnect,
            github_session::github_open_device_page,
            github_session::github_copy_user_code,
            get_about_info,
            open_actions_job,
            open_repository_on_github,
            open_repository_folder,
            copy_repository_path,
            show_usage_popup,
            get_usage_popup_kind,
            ui_hover_debug_enabled,
            trace_ui_hover,
            hide_usage_popup,
            resize_usage_popup,
            open_project_website,
            add_root,
            remove_root,
            open_settings,
            set_language,
            save_settings,
            select_repository_root,
            close_settings,
            start_card_drag,
            stop_card_drag,
            perform_git_action,
            cancel_git_fetch,
            set_card_view,
            hide_card
        ])
        .run(tauri::generate_context!())
        .expect("failed to run RepoTicker");
}
