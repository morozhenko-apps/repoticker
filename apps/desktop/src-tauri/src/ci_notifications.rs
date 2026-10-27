//! Native-only, opt-in CI failure delivery. Never accepts arbitrary text or URLs.
use std::{
    collections::{BTreeMap, VecDeque},
    sync::{Mutex, OnceLock},
};
use tauri::{plugin::PermissionState, AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

type NotificationCatalog = BTreeMap<String, NotificationTemplate>;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct NotificationTemplate {
    title: String,
    body: String,
    permission_error: String,
    state_error: String,
    delivery_error: String,
}

fn notification_catalog() -> &'static NotificationCatalog {
    static CATALOG: OnceLock<NotificationCatalog> = OnceLock::new();
    CATALOG.get_or_init(|| {
        serde_json::from_str(include_str!("../../ui/locales/notifications.json"))
            .expect("Bundled native notification translations must be valid")
    })
}

fn notification_error(language: &str, kind: &str) -> String {
    let catalog = notification_catalog();
    let template = catalog
        .get(language)
        .or_else(|| catalog.get("en"))
        .expect("English notification translations must exist");
    match kind {
        "permission" => template.permission_error.clone(),
        "state" => template.state_error.clone(),
        "delivery" => template.delivery_error.clone(),
        _ => "Notification unavailable.".into(),
    }
}

fn notification_text(
    language: &str,
    repository: &str,
    run_id: u64,
    attempt: u32,
) -> (String, String) {
    let templates = notification_catalog()
        .get(language)
        .or_else(|| notification_catalog().get("en"))
        .expect("English notification templates must exist");
    let body = templates
        .body
        .replace("{repository}", repository)
        .replace("{runId}", &run_id.to_string())
        .replace("{attempt}", &attempt.to_string());
    (templates.title.clone(), body)
}

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
        return Err(notification_error(&config.language, "permission"));
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
        .map_err(|_| notification_error(&config.language, "state"))?;
    if delivered.contains(&key) {
        return Ok(false);
    }
    let (title, body) = notification_text(&config.language, &repository, run_id, run_attempt);
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|_| notification_error(&config.language, "delivery"))?;
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
    fn notification_templates_are_complete_and_preserve_run_identity() {
        assert_eq!(notification_catalog().len(), 20);
        for (locale, template) in notification_catalog() {
            assert!(crate::tray_i18n::is_supported_locale(locale));
            assert!(!template.title.is_empty() && template.title.contains("RepoTicker"));
            for error in [&template.permission_error, &template.state_error, &template.delivery_error] {
                assert!(!error.trim().is_empty(), "{locale}: empty native error translation");
            }
            for placeholder in ["{repository}", "{runId}", "{attempt}"] {
                assert_eq!(template.body.matches(placeholder).count(), 1);
            }
            let (_, text) = notification_text(locale, "Team/repo", 112, 2);
            assert!(text.contains("Team/repo"));
            assert!(text.contains("112"));
            assert!(text.contains('2'));
            assert!(!text.contains('{'));
        }
        let (title, body) = notification_text("unrecognized", "Team/repo", 12, 1);
        assert_eq!(title, "RepoTicker: CI failure");
        assert!(body.contains("Team/repo"));
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
