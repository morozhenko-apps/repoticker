//! Native-only login launch. OS startup state is authoritative; no config copy.
use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
pub(crate) fn autostart_is_enabled(app: AppHandle) -> Result<bool, String> {
    app.autolaunch()
        .is_enabled()
        .map_err(|_| "System autostart state unavailable.".into())
}

#[tauri::command]
pub(crate) fn autostart_set_enabled(app: AppHandle, enabled: bool) -> Result<bool, String> {
    let manager = app.autolaunch();
    let previous = manager
        .is_enabled()
        .map_err(|_| "System autostart state unavailable.".to_owned())?;
    if previous == enabled {
        return Ok(enabled);
    }
    let result = if enabled {
        manager.enable()
    } else {
        manager.disable()
    };
    result.map_err(|_| "System autostart registration failed.".to_owned())?;
    match manager.is_enabled() {
        Ok(value) if value == enabled => Ok(value),
        _ => {
            // Roll back if the OS registration cannot be confirmed.
            if previous {
                let _ = manager.enable();
            } else {
                let _ = manager.disable();
            }
            Err("Cannot verify system autostart registration.".into())
        }
    }
}
