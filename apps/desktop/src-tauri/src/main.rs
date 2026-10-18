//! Minimal, local-only tray shell. Git and GitHub adapters are intentionally not wired yet.
use serde::Serialize;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[derive(Serialize)]
struct Snapshot {
    repositories: Vec<RepositorySummary>,
    runners: Vec<RunnerSummary>,
    ci_running: u32,
    ci_failed: u32,
    connected: bool,
}

#[derive(Serialize)]
struct RepositorySummary {
    name: String,
    branch: String,
    behind: u64,
    ci: String,
}

#[derive(Serialize)]
struct RunnerSummary {
    name: String,
    busy: bool,
    online: bool,
}

// A deliberately empty snapshot: never report fictitious data as live GitHub state.
#[tauri::command]
fn get_snapshot() -> Snapshot {
    Snapshot {
        repositories: Vec::new(),
        runners: Vec::new(),
        ci_running: 0,
        ci_failed: 0,
        connected: false,
    }
}

fn toggle_card(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

// Until a vector icon is designed, use an owned monochrome-green RGBA tray marker.
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

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let open = MenuItem::with_id(app, "open", "Open card", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "Hide card", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit RepoTicker", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &hide, &quit])?;

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
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
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
        .invoke_handler(tauri::generate_handler![get_snapshot])
        .run(tauri::generate_context!())
        .expect("failed to run RepoTicker");
}
