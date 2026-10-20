//! RepoTicker desktop: local-only roots, Git provider and tray card.
mod app_icon;

use repoticker_core::{
    git::{self, GitError, OperationOutcome, RepoSnapshot},
    SyncDecision,
};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, sync::Mutex};
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

#[derive(Default)]
struct OperationLock(Mutex<()>);

#[derive(Debug, Serialize, Deserialize)]
struct Config {
    roots: Vec<String>,
    #[serde(default = "default_language")]
    language: String,
    #[serde(default)]
    card_bottom_margin: Option<i32>,
    #[serde(default)]
    card_right_margin: Option<i32>,
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

fn read_config(app: &AppHandle) -> Result<Config, String> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(Config {
            roots: Vec::new(),
            language: default_language(),
            card_bottom_margin: None,
            card_right_margin: None,
        });
    }
    let content = fs::read(&path).map_err(|err| format!("Cannot read config: {err}"))?;
    serde_json::from_slice::<Config>(&content)
        .map_err(|err| format!("Cannot parse config {}: {err}", path.display()))
}

fn write_config(app: &AppHandle, config: &Config) -> Result<(), String> {
    let path = config_path(app)?;
    let parent = path.parent().ok_or("Invalid config path")?;
    fs::create_dir_all(parent).map_err(|err| format!("Cannot create config directory: {err}"))?;
    let content = serde_json::to_vec_pretty(config).map_err(|err| err.to_string())?;
    fs::write(&path, content).map_err(|err| format!("Cannot save config: {err}"))
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
    let config = read_config(app)?;
    let (repositories, mut errors) = git::discover_all(&roots_as_paths(&config));
    let mut summaries = Vec::new();
    for path in repositories {
        match git::inspect(&path) {
            Ok(status) => summaries.push(present(status)),
            Err(err) => errors.push(format!("{}: {err}", path.display())),
        }
    }
    summaries.sort_by(|a, b| a.name.cmp(&b.name).then(a.path.cmp(&b.path)));
    Ok(Snapshot {
        roots: config.roots,
        language: config.language,
        repositories: summaries,
        errors,
        ci_running: None,
        ci_queued: None,
        runners_online: None,
        connected: false,
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
    let config = read_config(app)?;
    let (repositories, failures) = git::discover_all(&roots_as_paths(&config));
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
                let outcome = git::fetch(&path);
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
                    Some(if outcome.is_ok() { "fetched" } else { "error" }),
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
    tauri::async_runtime::spawn_blocking(move || scan(&app))
        .await
        .map_err(|err| err.to_string())?
}

#[tauri::command]
fn add_root(app: AppHandle, root: String) -> Result<Vec<String>, String> {
    let canonical = git::normalize_root(&root).map_err(|err| err.to_string())?;
    git::discover(&canonical).map_err(|err| err.to_string())?;
    let text = canonical.to_string_lossy().into_owned();
    let mut config = read_config(&app)?;
    if !config.roots.contains(&text) {
        config.roots.push(text);
        config.roots.sort();
        write_config(&app, &config)?;
        let _ = app.emit("repoticker-config-changed", ());
    }
    Ok(config.roots)
}

#[tauri::command]
fn remove_root(app: AppHandle, root: String) -> Result<Vec<String>, String> {
    let mut config = read_config(&app)?;
    if !config.roots.contains(&root) {
        return Err("Root is not enrolled".into());
    }
    config.roots.retain(|value| value != &root);
    write_config(&app, &config)?;
    let _ = app.emit("repoticker-config-changed", ());
    Ok(config.roots)
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

#[tauri::command]
fn show_usage_popup(app: AppHandle) -> Result<(), String> {
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
    let _ = app.emit_to("usage", "repoticker-usage-shown", ());
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
fn dismiss_usage_popup(app: AppHandle) -> Result<(), String> {
    hide_usage_popup(app.clone())?;
    app.emit("repoticker-usage-dismiss", ())
        .map_err(|error| error.to_string())
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

#[tauri::command]
fn open_project_website() -> Result<(), String> {
    let url = "https://morozhenko.com";
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
        .map_err(|error| format!("Cannot open website: {error}"))
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
        .map_err(|error| format!("Cannot open GitHub Actions job: {error}"))
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
fn save_settings(app: AppHandle, roots: Vec<String>, language: String) -> Result<(), String> {
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
    let mut config = read_config(&app)?;
    config.roots = validated;
    config.language = language;
    write_config(&app, &config)?;
    let _ = app.emit("repoticker-config-changed", ());
    Ok(())
}

#[tauri::command]
fn close_settings(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("settings")
        .ok_or_else(|| "Settings window is unavailable".to_owned())?;
    window.hide().map_err(|err| err.to_string())
}

#[tauri::command]
fn set_language(app: AppHandle, language: String) -> Result<(), String> {
    if language != "en" && language != "ru" {
        return Err("Unsupported language".into());
    }
    let mut config = read_config(&app)?;
    config.language = language;
    write_config(&app, &config)?;
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

fn main() {
    tauri::Builder::default()
        .manage(OperationLock::default())
        .setup(|app| {
            #[cfg(target_os = "linux")]
            {
                linux_surface::install(app)?;
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
            get_about_info,
            open_actions_job,
            show_usage_popup,
            hide_usage_popup,
            dismiss_usage_popup,
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
            set_card_view,
            hide_card
        ])
        .run(tauri::generate_context!())
        .expect("failed to run RepoTicker");
}
