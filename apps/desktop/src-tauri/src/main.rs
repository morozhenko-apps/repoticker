//! RepoTicker desktop: local-only roots, Git provider and tray card.
mod app_icon;
mod github_api;
mod github_etag_cache;
mod github_native;
mod github_oauth_wire;
mod github_rate_gate;
mod github_session;
mod monitor_cache;
mod startup_diagnostics;

use repoticker_core::{
    config_store::JsonStore,
    git::{self, FetchCancellation, GitError, OperationOutcome, RepoSnapshot},
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

fn execute(
    app: &AppHandle,
    operation: &str,
    only_path: Option<&str>,
) -> Result<Vec<ActionResult>, String> {
    if operation != "fetch" && operation != "safe_pull" {
        return Err("Unknown Git operation".into());
    }
    let state = app.state::<OperationLock>();
    let _guard = state.0.lock().map_err(|_| "Git operation lock poisoned")?;
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
            if operation != "safe_pull" {
                return true;
            }
            // Only branches eligible for fast-forward are attempted. Inspect
            // again inside safe_pull to fail closed if another agent changed it.
            matches!(
                git::inspect(path),
                Ok(status) if matches!(status.decision, SyncDecision::FastForward { .. })
            )
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
        // Safe pull mutates checkouts and remains strictly sequential.
        for (index, path) in targets.into_iter().enumerate() {
            let display_path = path.to_string_lossy().into_owned();
            notify_progress(app, operation, &display_path, index, total, "start", None);
            let result = git_action_result(&path, git::safe_pull(&path));
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
}

#[tauri::command]
fn get_monitor_selection(app: AppHandle) -> Result<MonitorSelection, String> {
    let config = read_config(&app)?;
    Ok(MonitorSelection {
        github_monitor_org: config.github_monitor_org,
        github_monitor_repositories: config.github_monitor_repositories,
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
async fn set_card_view(app: AppHandle, view: String) -> Result<(), String> {
    let height = match view.as_str() {
        "compact" => 122.0,
        "repos" => 510.0,
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

#[tauri::command]
fn show_usage_popup(app: AppHandle, kind: String) -> Result<(), String> {
    let code = match kind.as_str() {
        "runners" => 1,
        "tasks" => 2,
        "billing" => 0,
        _ => return Err("Unsupported status tooltip.".into()),
    };
    USAGE_KIND.store(code, Ordering::Release);
    #[cfg(target_os = "linux")]
    if linux_surface::enabled() {
        linux_surface::show_usage(&app)?;
    } else {
        let card = app
            .get_webview_window("main")
            .ok_or_else(|| "Card unavailable".to_owned())?;
        let popup = app
            .get_webview_window("usage")
            .ok_or_else(|| "Usage popup unavailable".to_owned())?;
        if let (Ok(position), Ok(size)) = (card.outer_position(), card.outer_size()) {
            let outer = popup.outer_size().map_err(|error| error.to_string())?;
            let x = i64::from(position.x) + i64::from(size.width) - i64::from(outer.width) - 5;
            let y = i64::from(position.y) - i64::from(outer.height) + 8;
            if let (Ok(x), Ok(y)) = (i32::try_from(x), i32::try_from(y)) {
                let _ = popup.set_position(tauri::PhysicalPosition::new(x, y));
            }
        }
        popup.show().map_err(|error| error.to_string())?;
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
    popup.hide().map_err(|error| error.to_string())
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
        .map_err(|error| error.to_string())
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
        if let Err(error) = resize_unmanaged_card(&window, 122.0) {
            eprintln!("RepoTicker compact resize: {error}");
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
        let _ = window.show();
        let _ = window.set_focus();
        let _ = app.emit("repoticker-settings-opened", ());
    }
}

fn show_about(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("about") {
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
    let _ = app;
    Ok(())
}

#[tauri::command]
fn open_settings(app: AppHandle) {
    show_settings(&app);
}

#[tauri::command]
fn save_settings(
    app: AppHandle,
    roots: Vec<String>,
    language: String,
    ignored_child_names: Option<Vec<String>>,
) -> Result<(), String> {
    if language != "en" && language != "ru" {
        return Err("Unsupported language".into());
    }
    if roots.len() > 100 {
        return Err("Too many enrolled roots".into());
    }
    let mut validated = Vec::new();
    for root in roots {
        let canonical = git::normalize_root(&root).map_err(|err| err.to_string())?;
        git::discover(&canonical).map_err(|err| err.to_string())?;
        let text = canonical.to_string_lossy().into_owned();
        if !validated.contains(&text) {
            validated.push(text);
        }
    }
    validated.sort();
    let ignored = ignored_child_names
        .map(git::validate_ignored_child_names)
        .transpose()
        .map_err(|error| error.to_string())?;
    update_config(&app, |config| {
        config.roots = validated;
        config.language = language;
        if let Some(ignored) = ignored {
            config.ignored_child_names = ignored;
        }
        Ok(((), true))
    })?;
    let _ = app.emit("repoticker-config-changed", ());
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
    if language != "en" && language != "ru" {
        return Err("Unsupported language".into());
    }
    update_config(&app, |config| {
        config.language = language;
        Ok(((), true))
    })?;
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
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(OperationLock::default())
        .manage(ActiveFetch::default())
        .manage(JsonStore::default())
        .manage(monitor_cache::MonitorCache::default())
        .manage(github_rate_gate::GitHubRateGate::default())
        .manage(github_api::GitHubRestClient::default())
        .manage(github_etag_cache::GitHubETagCache::default())
        .manage(std::sync::Arc::new(
            github_session::GitHubAuthManager::default(),
        ))
        .setup(|app| {
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
                let open = MenuItem::with_id(app, "open", "Open card", true, None::<&str>)?;
                let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
                let fetch = MenuItem::with_id(app, "fetch", "Fetch all", true, None::<&str>)?;
                let sync = MenuItem::with_id(app, "sync", "Safe pull all", true, None::<&str>)?;
                let about =
                    MenuItem::with_id(app, "about", "About RepoTicker", true, None::<&str>)?;
                let quit = MenuItem::with_id(app, "quit", "Quit RepoTicker", true, None::<&str>)?;
                let menu =
                    Menu::with_items(app, &[&open, &settings, &fetch, &sync, &about, &quit])?;

                TrayIconBuilder::with_id("repoticker")
                    .icon(tray_image())
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id().as_ref() {
                        "open" => show_compact_card(app),
                        "settings" => show_settings(app),
                        "about" => show_about(app),
                        "fetch" => dispatch_menu_action(app, "fetch"),
                        "sync" => dispatch_menu_action(app, "safe_pull"),
                        "quit" => app.exit(0),
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
            hide_usage_popup,
            resize_usage_popup,
            open_project_website,
            add_root,
            remove_root,
            open_settings,
            set_language,
            save_settings,
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
