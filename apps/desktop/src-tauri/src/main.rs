//! RepoTicker desktop: local-only roots, Git provider and tray card.
use repoticker_core::{
    git::{self, GitError, OperationOutcome, RepoSnapshot},
    SyncDecision,
};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State,
};

#[derive(Default)]
struct OperationLock(Mutex<()>);

#[derive(Debug, Serialize, Deserialize)]
struct Config {
    roots: Vec<String>,
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
    repositories: Vec<RepoSummary>,
    errors: Vec<String>,
    ci_running: Option<u32>,
    ci_failed: Option<u32>,
    connected: bool,
}

#[derive(Serialize, Clone)]
struct ActionResult {
    path: String,
    status: String,
    message: String,
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
        return Ok(Config { roots: Vec::new() });
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
        repositories: summaries,
        errors,
        ci_running: None,
        ci_failed: None,
        connected: false,
    })
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

    for path in repositories {
        let display_path = path.to_string_lossy().into_owned();
        if only_path.is_some_and(|requested| requested != display_path) {
            continue;
        }
        let operation_result = match operation {
            "fetch" => git::fetch(&path),
            "safe_pull" => git::safe_pull(&path),
            _ => unreachable!(),
        };
        let result = match operation_result {
            Ok(OperationOutcome::Fetched) => ActionResult {
                path: display_path,
                status: "fetched".into(),
                message: "Fetch complete".into(),
            },
            Ok(OperationOutcome::Updated(commits)) => ActionResult {
                path: display_path,
                status: "updated".into(),
                message: format!("Fast-forwarded by {commits} commits"),
            },
            Ok(OperationOutcome::AlreadyCurrent) => ActionResult {
                path: display_path,
                status: "current".into(),
                message: "Already current".into(),
            },
            Ok(OperationOutcome::Skipped(decision)) => ActionResult {
                path: display_path,
                status: "skipped".into(),
                message: decision_label(decision),
            },
            Err(GitError(error)) => ActionResult {
                path: display_path,
                status: "error".into(),
                message: error,
            },
        };
        results.push(result);
    }
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

/// Strictly bounded card sizes. Expanding the repository drawer must never
/// change the width or turn the compact utility into a permanent dashboard.
#[tauri::command]
fn set_card_view(app: AppHandle, view: String) -> Result<(), String> {
    let height = match view.as_str() {
        "compact" => 225.0,
        "repos" => 550.0,
        "settings" => 370.0,
        _ => return Err("Unknown card view".into()),
    };
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Card window is unavailable".to_owned())?;
    window
        .set_size(tauri::LogicalSize::new(390.0, height))
        .map_err(|err| format!("Cannot resize card: {err}"))
}

fn toggle_card(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

fn tray_image() -> Image<'static> {
    let mut rgba = vec![0u8; 16 * 16 * 4];
    for y in 3usize..13 {
        for x in 3usize..13 {
            if x == 3 || x == 12 || y == 3 || y == 12 {
                let index = (y * 16 + x) * 4;
                rgba[index..index + 4].copy_from_slice(&[44, 154, 95, 255]);
            }
        }
    }
    Image::new_owned(rgba, 16, 16)
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
            let open = MenuItem::with_id(app, "open", "Open card", true, None::<&str>)?;
            let fetch = MenuItem::with_id(app, "fetch", "Fetch all", true, None::<&str>)?;
            let sync = MenuItem::with_id(app, "sync", "Safe pull all", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit RepoTicker", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &fetch, &sync, &quit])?;

            TrayIconBuilder::with_id("repoticker")
                .icon(tray_image())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
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
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_snapshot,
            add_root,
            remove_root,
            perform_git_action,
            set_card_view
        ])
        .run(tauri::generate_context!())
        .expect("failed to run RepoTicker");
}
