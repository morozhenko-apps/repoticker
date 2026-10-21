//! In-memory snapshot shared by the main card and the read-only usage balloon.
//! This is sanitized presentation data, not an OAuth credential store.

use serde_json::Value;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Default)]
pub struct MonitorCache {
    state: Mutex<CacheState>,
}

#[derive(Default)]
struct CacheState {
    connected: bool,
    runner_state: Option<Value>,
    message: Option<String>,
}

impl MonitorCache {
    pub fn read(&self) -> (bool, Option<Value>, Option<String>) {
        let current = self
            .state
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        (
            current.connected,
            current.runner_state.clone(),
            current.message.clone(),
        )
    }
}

/// Refuse unbounded or malformed presentations; this shared state never
/// receives or stores a GitHub bearer token or the OAuth device code.
#[tauri::command]
pub fn github_monitor_publish(
    app: AppHandle,
    connected: bool,
    runner_state: Option<Value>,
    message: Option<String>,
) -> Result<(), String> {
    if runner_state.as_ref().is_some_and(|state| {
        !state.get("counts").is_some_and(Value::is_object)
            || !state.get("coverage").is_some_and(Value::is_object)
    }) {
        return Err("Invalid monitor summary.".into());
    }
    if runner_state
        .as_ref()
        .is_some_and(|v| serde_json::to_vec(v).map_or(true, |body| body.len() > 262_144))
    {
        return Err("Monitor summary exceeds memory limit.".into());
    }
    if message
        .as_ref()
        .is_some_and(|m| m.len() > 180 || m.contains('\n'))
    {
        return Err("Invalid monitor status.".into());
    }
    let state = app.state::<MonitorCache>();
    {
        let mut cached = state
            .state
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        cached.connected = connected;
        cached.runner_state = if connected { runner_state } else { None };
        cached.message = message;
    }
    let _ = app.emit("repoticker-monitor-updated", ());
    Ok(())
}
