//! Linux StatusNotifierItem: unlike Tauri's Linux tray backend, Activate
//! fires for KDE's primary click. All UI/Git work is marshalled away from DBus.
use crate::{dispatch_menu_action, show_compact_card, show_settings, toggle_card};
use ksni::{blocking::TrayMethods as _, menu::StandardItem, Icon, MenuItem, Tray};
use tauri::{App, AppHandle, Manager};

struct LinuxTray {
    app: AppHandle,
}

impl LinuxTray {
    fn on_ui(&self, action: &'static str) {
        let app = self.app.clone();
        let dispatcher = app.clone();
        let _ = dispatcher.run_on_main_thread(move || match action {
            "open" => show_compact_card(&app),
            "toggle" => toggle_card(&app),
            "settings" => show_settings(&app),
            "fetch" => dispatch_menu_action(&app, "fetch"),
            "sync" => dispatch_menu_action(&app, "safe_pull"),
            "quit" => app.exit(0),
            _ => {}
        });
    }
}

impl Tray for LinuxTray {
    fn id(&self) -> String {
        "repoticker".into()
    }

    fn title(&self) -> String {
        "RepoTicker".into()
    }

    fn icon_pixmap(&self) -> Vec<Icon> {
        let mut data = vec![0u8; 16 * 16 * 4];
        for y in 3usize..13 {
            for x in 3usize..13 {
                if x == 3 || x == 12 || y == 3 || y == 12 {
                    let pos = (y * 16 + x) * 4;
                    data[pos..pos + 4].copy_from_slice(&[255, 44, 154, 95]); // ARGB32
                }
            }
        }
        vec![Icon { width: 16, height: 16, data }]
    }

    fn activate(&mut self, _x: i32, _y: i32) {
        self.on_ui("toggle");
    }

    fn menu(&self) -> Vec<MenuItem<Self>> {
        vec![
            StandardItem {
                label: "Open card".into(),
                activate: Box::new(|tray: &mut Self| tray.on_ui("open")),
                ..Default::default()
            }
            .into(),
            StandardItem {
                label: "Settings".into(),
                activate: Box::new(|tray: &mut Self| tray.on_ui("settings")),
                ..Default::default()
            }
            .into(),
            StandardItem {
                label: "Fetch all".into(),
                activate: Box::new(|tray: &mut Self| tray.on_ui("fetch")),
                ..Default::default()
            }
            .into(),
            StandardItem {
                label: "Safe pull all".into(),
                activate: Box::new(|tray: &mut Self| tray.on_ui("sync")),
                ..Default::default()
            }
            .into(),
            StandardItem {
                label: "Quit RepoTicker".into(),
                activate: Box::new(|tray: &mut Self| tray.on_ui("quit")),
                ..Default::default()
            }
            .into(),
        ]
    }
}

pub fn install(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = LinuxTray {
        app: app.handle().clone(),
    }
    .spawn()?;
    // Own the tray for the full Tauri process lifetime.
    app.manage(handle);
    Ok(())
}
