//! Native-only, opt-in CI failure delivery. Never accepts arbitrary text or URLs.
use std::collections::VecDeque;
use std::sync::Mutex;
use tauri::{plugin::PermissionState, AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

const MAX_DELIVERED: usize = 512;

#[derive(Default)]
pub(crate) struct DeliveredAlerts(Mutex<VecDeque<String>>);

fn approved_scope(config: &crate::Config, repository: &str, run_id: u64, attempt: u32) -> bool {
    if !config.ci_failure_notifications
        || run_id == 0
        || run_id > 9_007_199_254_740_991
        || !(1..=1_000_000).contains(&attempt)
    {
        return false;
    }
    let Some((owner, name)) = repository.split_once('/') else {
        return false;
    };
    if !crate::github_api::valid_name(owner)
        || !crate::github_api::valid_name(name)
        || owner == "."
        || owner == ".."
        || name == "."
        || name == ".."
        || name.contains('/')
        || !config
            .github_monitor_org
            .as_deref()
            .is_some_and(|account| owner.eq_ignore_ascii_case(account))
    {
        return false;
    }
    config.github_monitor_repositories.is_empty()
        || config
            .github_monitor_repositories
            .iter()
            .any(|item| item.eq_ignore_ascii_case(repository))
}

#[tauri::command]
pub(crate) fn ci_notification_permission(app: AppHandle) -> String {
    if !cfg!(any(target_os = "linux", target_os = "windows")) {
        return "unsupported".into();
    }
    match app.notification().permission_state() {
        Ok(PermissionState::Granted) => "granted".into(),
        Ok(PermissionState::Denied) => "denied".into(),
        Ok(_) => "prompt".into(),
        Err(_) => "unavailable".into(),
    }
}

/// Explicit diagnostic. This never fabricates CI run data or changes
/// the real failure notification deduplication state.
fn notification_test_enabled(config: &crate::Config) -> bool {
    config.ci_failure_notifications
}

#[tauri::command]
pub(crate) fn ci_notification_test(app: AppHandle) -> Result<(), String> {
    if !cfg!(any(target_os = "linux", target_os = "windows")) {
        return Err("System notifications unsupported on this platform.".into());
    }
    let config = crate::read_config(&app)?;
    if !notification_test_enabled(&config) {
        return Err("Enable and save CI notifications before testing.".into());
    }
    if !matches!(
        app.notification().permission_state(),
        Ok(PermissionState::Granted)
    ) {
        return Err("System notification permission unavailable.".into());
    }
    app.notification()
        .builder()
        .title("RepoTicker: test notification")
        .body("Native notification test. No CI workflow failed.")
        .show()
        .map_err(|_| "System notification test delivery failed.".to_owned())?;
    Ok(())
}

#[tauri::command]
pub(crate) fn ci_failure_notify(
    app: AppHandle,
    repository: String,
    run_id: u64,
    run_attempt: u32,
) -> Result<bool, String> {
    if !cfg!(any(target_os = "linux", target_os = "windows")) {
        return Ok(false);
    }
    let config = crate::read_config(&app)?;
    if !approved_scope(&config, &repository, run_id, run_attempt) {
        return Ok(false);
    }
    if !matches!(
        app.notification().permission_state(),
        Ok(PermissionState::Granted)
    ) {
        return Err("System notification permission unavailable.".into());
    }
    let key = format!(
        "{}/{}/{}",
        repository.to_ascii_lowercase(),
        run_id,
        run_attempt
    );
    let state = app.state::<DeliveredAlerts>();
    let mut delivered = state
        .0
        .lock()
        .map_err(|_| "Notification state unavailable.")?;
    if delivered.contains(&key) {
        return Ok(false);
    }
    app.notification()
        .builder()
        .title("RepoTicker: CI failure")
        .body(format!(
            "{repository}: workflow run {run_id} (attempt {run_attempt}) failed"
        ))
        .show()
        .map_err(|_| "System notification delivery failed.".to_owned())?;
    delivered.push_back(key);
    if delivered.len() > MAX_DELIVERED {
        delivered.pop_front();
    }
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> crate::Config {
        let mut value = crate::default_config();
        value.github_monitor_org = Some("Team".into());
        value.github_monitor_repositories = vec!["Team/alpha".into()];
        value
    }

    #[test]
    fn native_test_diagnostic_requires_explicit_persisted_opt_in() {
        let mut value = config();
        assert!(!notification_test_enabled(&value));
        value.ci_failure_notifications = true;
        assert!(notification_test_enabled(&value));
    }

    #[test]
    fn notification_delivery_is_opt_in_and_restricted_to_selected_scope() {
        let mut value = config();
        assert!(!approved_scope(&value, "Team/alpha", 12, 1));
        value.ci_failure_notifications = true;
        assert!(approved_scope(&value, "team/alpha", 12, 1));
        for name in [
            "other/alpha",
            "Team/beta",
            "Team/../oops",
            "Team/a/b",
            "Team/%3C",
        ] {
            assert!(!approved_scope(&value, name, 12, 1), "{name}");
        }
        for id in [0, 9_007_199_254_740_992] {
            assert!(!approved_scope(&value, "team/alpha", id, 1));
        }
        for attempt in [0, 1_000_001] {
            assert!(!approved_scope(&value, "team/alpha", 12, attempt));
        }
        value.github_monitor_repositories.clear();
        assert!(approved_scope(&value, "Team/other", 12, 2));
        value.github_monitor_org = None;
        assert!(!approved_scope(&value, "Team/other", 12, 2));
    }
}
