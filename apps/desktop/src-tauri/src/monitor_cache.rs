//! In-memory snapshot shared by the main card and the read-only usage balloon.
//! This is sanitized presentation data, not an OAuth credential store.

use serde::Serialize;
use serde_json::Value;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Default)]
pub struct MonitorCache {
    state: Mutex<CacheState>,
}

struct CacheState {
    connected: bool,
    runner_state: Option<Value>,
    message: Option<String>,
}

impl Default for CacheState {
    fn default() -> Self {
        Self {
            connected: false,
            runner_state: None,
            // The OS keyring has not yet been checked by the UI monitor.
            // False here means "not verified yet", not "disconnected".
            message: Some("Checking GitHub connection...".into()),
        }
    }
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

/// Non-secret, in-memory status for the compact card. Never scans Git.
#[derive(Serialize)]
pub struct MonitorPresentation {
    connected: bool,
    runner_state: Option<Value>,
    monitor_message: Option<String>,
}

#[tauri::command]
pub fn github_monitor_snapshot(app: AppHandle) -> MonitorPresentation {
    let (connected, runner_state, monitor_message) = app.state::<MonitorCache>().read();
    MonitorPresentation {
        connected,
        runner_state,
        monitor_message,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_status_is_unknown_until_wallet_verification() {
        let (connected, runner_state, message) = MonitorCache::default().read();
        assert!(!connected);
        assert!(runner_state.is_none());
        assert_eq!(message.as_deref(), Some("Checking GitHub connection..."));
    }

    #[test]
    fn monitor_projection_uses_only_expected_fields() {
        let projected = serde_json::to_value(MonitorPresentation {
            connected: true,
            runner_state: None,
            monitor_message: None,
        })
        .unwrap();
        let object = projected.as_object().unwrap();
        assert_eq!(object.len(), 3);
        assert_eq!(projected["connected"], true);
        assert!(projected.get("runner_state").is_some());
        assert!(projected.get("monitor_message").is_some());
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
