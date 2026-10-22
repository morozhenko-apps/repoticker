//! Authenticated read-only GitHub REST transport.
//! The UI may request ONLY documented Actions, account and billing read routes.
//! OAuth bearer strings never cross IPC; error responses are not returned.

use std::{collections::HashSet, time::Duration};

use reqwest::{header, redirect::Policy, Client, Url};
use serde_json::{json, Value};
use tauri::AppHandle;

use crate::github_session;

const MAX_BODY: usize = 2 * 1024 * 1024;
const PAGE_CAP: u32 = 10;
const API_VERSION: &str = "2022-11-28";

/// A fixed, redacted error vocabulary shared with the JS monitor policy.
/// Do not return GitHub response bodies, account names or HTTP header values.
fn api_http_failure(
    status: u16,
    remaining: Option<&str>,
    retry_after: Option<&str>,
) -> &'static str {
    match status {
        401 => "GitHub API authorization expired or revoked.",
        403 if remaining == Some("0") || retry_after.is_some() => "GitHub API rate limited.",
        403 => "GitHub API permission denied.",
        404 => "GitHub API resource inaccessible.",
        429 => "GitHub API rate limited.",
        _ => "GitHub API request failed.",
    }
}

pub(crate) fn valid_name(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 100
        && value != "."
        && value != ".."
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"._-".contains(&b))
}

fn valid_path(requested: &str) -> bool {
    if requested.len() > 300
        || !requested.starts_with('/')
        || requested.contains('%')
        || requested.contains('#')
        || requested.contains("//")
        || requested.contains('\\')
    {
        return false;
    }
    let Ok(url) = Url::parse(&format!("https://api.github.com{requested}")) else {
        return false;
    };
    if url.host_str() != Some("api.github.com") || url.fragment().is_some() {
        return false;
    }
    let segments: Vec<&str> = url.path().split('/').filter(|s| !s.is_empty()).collect();
    if segments.as_slice() == ["user"] {
        return url.query().is_none();
    }
    if matches!(segments.as_slice(), ["orgs", org] if valid_name(org)) {
        return url.query().is_none();
    }
    let billing = matches!(
        segments.as_slice(),
        ["organizations", org, "settings", "billing", "usage", "summary"] if valid_name(org)
    ) || matches!(
        segments.as_slice(),
        ["users", user, "settings", "billing", "usage", "summary"] if valid_name(user)
    );
    let route = if billing {
        5
    } else {
        match segments.as_slice() {
            ["user", "installations"] => 0,
            ["user", "installations", id, "repositories"]
                if id.parse::<u64>().is_ok_and(|n| n > 0) =>
            {
                1
            }
            ["orgs", org, "actions", "runners"] if valid_name(org) => 2,
            ["repos", owner, repo, "actions", "runs"] if valid_name(owner) && valid_name(repo) => 3,
            ["repos", owner, repo, "actions", "runs", id, "jobs"]
                if valid_name(owner)
                    && valid_name(repo)
                    && id.parse::<u64>().is_ok_and(|n| n > 0) =>
            {
                4
            }
            _ => return false,
        }
    };
    let mut keys = HashSet::new();
    for (key, value) in url.query_pairs() {
        if !keys.insert(key.to_string()) {
            return false;
        }
        match key.as_ref() {
            "per_page" if route != 5 && value == "100" => {}
            "page"
                if route != 5
                    && value
                        .parse::<u32>()
                        .is_ok_and(|n| (1..=PAGE_CAP).contains(&n)) => {}
            "status" if route == 3 && (value == "queued" || value == "in_progress") => {}
            "filter" if route == 4 && value == "latest" => {}
            "year"
                if route == 5
                    && value.len() == 4
                    && value
                        .parse::<u32>()
                        .is_ok_and(|n| (2020..=2100).contains(&n)) => {}
            "month" if route == 5 && value.parse::<u32>().is_ok_and(|n| (1..=12).contains(&n)) => {}
            _ => return false,
        }
    }
    if route == 5 {
        keys.contains("year") && keys.contains("month")
    } else {
        keys.contains("per_page") && keys.contains("page")
    }
}

fn project_billing(value: Value) -> Result<Value, String> {
    let items = value
        .get("usageItems")
        .and_then(Value::as_array)
        .ok_or_else(|| "Unexpected GitHub billing response.".to_owned())?;
    if items.len() > 500 {
        return Err("GitHub billing response exceeds allowed item count.".into());
    }
    let mut projected = Vec::new();
    for item in items {
        if item.get("product").and_then(Value::as_str) != Some("Actions")
            || item.get("unitType").and_then(Value::as_str) != Some("minutes")
        {
            continue;
        }
        let sku = item
            .get("sku")
            .and_then(Value::as_str)
            .ok_or_else(|| "Incomplete GitHub billing item.".to_owned())?;
        let quantity = item
            .get("grossQuantity")
            .and_then(Value::as_f64)
            .ok_or_else(|| "Incomplete GitHub billing quantity.".to_owned())?;
        if sku.len() > 80 || sku.is_empty() || !quantity.is_finite() || quantity < 0.0 {
            return Err("Invalid GitHub billing quantity.".into());
        }
        projected.push(json!({ "sku": sku, "grossQuantity": quantity }));
    }
    Ok(json!({ "usageItems": projected }))
}

/// Keep fields needed for the already-tested pure JS collector. This is a
/// deliberate API response projection, not arbitrary GitHub account data.
fn project(path: &str, value: Value) -> Result<Value, String> {
    if let Some(org) = path.strip_prefix("/orgs/") {
        if valid_name(org) && !org.contains('/') {
            let login = value
                .get("login")
                .and_then(Value::as_str)
                .filter(|name| name.eq_ignore_ascii_case(org))
                .ok_or_else(|| "Invalid GitHub organization identity.".to_owned())?;
            let plan = value.pointer("/plan/name").and_then(Value::as_str);
            return Ok(json!({
                "login": login,
                "plan": { "name": plan.filter(|name| name.len() <= 40) }
            }));
        }
    }
    if path == "/user" {
        let login = value
            .get("login")
            .and_then(Value::as_str)
            .filter(|name| valid_name(name))
            .ok_or_else(|| "Invalid GitHub account identity.".to_owned())?;
        let plan = value.pointer("/plan/name").and_then(Value::as_str);
        return Ok(json!({
            "login": login,
            "plan": { "name": plan.filter(|name| name.len() <= 40) }
        }));
    }
    if path.contains("/settings/billing/usage/summary?") {
        return project_billing(value);
    }
    let key = if path.starts_with("/user/installations/") {
        "repositories"
    } else if path.starts_with("/user/installations?") {
        "installations"
    } else if path.starts_with("/orgs/") {
        "runners"
    } else if path.contains("/jobs?") {
        "jobs"
    } else {
        "workflow_runs"
    };
    let arr = value
        .get(key)
        .and_then(Value::as_array)
        .ok_or_else(|| "Unexpected GitHub API response.".to_owned())?;
    if arr.len() > 100 {
        return Err("GitHub returned more than the requested page size.".into());
    }
    let items: Vec<Value> = arr
        .iter()
        .map(|item| match key {
            "installations" => json!({
                "id": item.get("id"),
                "account": {
                    "login": item.pointer("/account/login"),
                    "type": item.pointer("/account/type")
                }
            }),
            "repositories" => json!({
                "full_name": item.get("full_name"),
                "owner": { "login": item.pointer("/owner/login") }
            }),
            "runners" => json!({
                "id": item.get("id"), "name": item.get("name"),
                "status": item.get("status"), "busy": item.get("busy"),
                "labels": item.get("labels")
            }),
            "jobs" => json!({
                "id": item.get("id"), "name": item.get("name"),
                "status": item.get("status"), "runner_id": item.get("runner_id"),
                "labels": item.get("labels"), "html_url": item.get("html_url")
            }),
            _ => json!({ "id": item.get("id") }),
        })
        .collect();
    let mut projected = serde_json::Map::new();
    projected.insert(key.to_owned(), Value::Array(items));
    projected.insert(
        "total_count".to_owned(),
        value.get("total_count").cloned().unwrap_or(Value::Null),
    );
    Ok(Value::Object(projected))
}

#[tauri::command]
pub async fn github_api_get(app: AppHandle, path: String) -> Result<Value, String> {
    if !valid_path(&path) {
        return Err("Unsupported GitHub read-only API request.".into());
    }
    let token = github_session::github_access_token(&app).await?;
    let client = Client::builder()
        .redirect(Policy::none())
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|_| "Cannot initialize GitHub API client.")?;
    let mut response = client
        .get(format!("https://api.github.com{path}"))
        .header(header::ACCEPT, "application/vnd.github+json")
        .header("X-GitHub-Api-Version", API_VERSION)
        .header(header::USER_AGENT, "RepoTicker/0.1")
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|_| "GitHub API network error.")?;
    if !response.status().is_success() {
        let remaining = response
            .headers()
            .get("x-ratelimit-remaining")
            .and_then(|header| header.to_str().ok());
        let retry_after = response
            .headers()
            .get(header::RETRY_AFTER)
            .and_then(|header| header.to_str().ok());
        return Err(api_http_failure(response.status().as_u16(), remaining, retry_after).into());
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "GitHub API stream failed.")?
    {
        if bytes.len().saturating_add(chunk.len()) > MAX_BODY {
            return Err("GitHub API response exceeded safe size.".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    let value: Value =
        serde_json::from_slice(&bytes).map_err(|_| "GitHub API returned invalid JSON.")?;
    project(&path, value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_documented_read_routes_are_allowed() {
        for path in [
            "/user/installations?per_page=100&page=1",
            "/user",
            "/orgs/team-apps",
            "/organizations/team-apps/settings/billing/usage/summary?year=2026&month=10",
            "/users/monalisa/settings/billing/usage/summary?year=2026&month=10",
            "/user/installations/123/repositories?per_page=100&page=2",
            "/orgs/team-apps/actions/runners?per_page=100&page=1",
            "/repos/team-apps/tool/actions/runs?status=queued&per_page=100&page=1",
            "/repos/team-apps/tool/actions/runs/123/jobs?filter=latest&per_page=100&page=1",
        ] {
            assert!(valid_path(path), "{path}");
        }
        for path in [
            "https://evil.example",
            "/user?other=true",
            "/orgs/team-apps?token=secret",
            "/orgs/../settings/billing",
            "/orgs/team-apps/private",
            "/organizations/team/settings/billing/usage/summary?month=10",
            "/users/monalisa/settings/billing/usage/summary?year=2026&month=13",
            "/users/monalisa/settings/billing/usage/summary?year=2026&month=10&token=abc",
            "/organizations/team/settings/billing/actions",
            "/user/installations?per_page=100&page=0",
            "/user/installations?per_page=999&page=1",
            "/user/installations?per_page=100&page=1&token=secret",
            "/user/installations?per_page=100&page=1&page=2",
            "/repos/team/repo/actions/workflows?per_page=100&page=1",
            "/repos/team/repo/actions/runs?status=completed&per_page=100&page=1",
            "/repos/team/../actions/runs?per_page=100&page=1",
            "/orgs/%2e%2e/actions/runners?per_page=100&page=1",
            "/orgs/team/actions/runners?per_page=100&page=1#frag",
            "/orgs/team/actions/runners?per_page=100&page=1&access_token=bad",
        ] {
            assert!(!valid_path(path), "{path}");
        }
    }

    #[test]
    fn response_projection_retains_no_oauth_or_repository_secrets() {
        let payload = json!({"total_count": 1, "repositories": [{
            "full_name": "team/repo", "owner": {"login": "team"},
            "private": true, "secret": "not-for-webview"
        }]});
        let projected = project(
            "/user/installations/123/repositories?per_page=100&page=1",
            payload,
        )
        .unwrap();
        assert_eq!(projected["repositories"][0]["full_name"], "team/repo");
        assert!(projected.to_string().find("not-for-webview").is_none());
    }
    #[test]
    fn projection_exposes_only_actions_minutes_and_minimal_identity() {
        let identity = project(
            "/user",
            json!({
                "login": "monalisa",
                "plan": { "name": "free", "payment_method": "secret" },
                "email": "private@example.com", "token": "secret"
            }),
        )
        .unwrap();
        assert_eq!(identity["login"], "monalisa");
        assert_eq!(identity["plan"]["name"], "free");
        assert!(!identity.to_string().contains("private@example.com"));
        let organization = project(
            "/orgs/team-apps",
            json!({
                "login": "team-apps",
                "plan": { "name": "team", "paymentDetails": "secret" },
                "billing_email": "secret@example.com"
            }),
        )
        .unwrap();
        assert_eq!(organization["plan"]["name"], "team");
        assert!(!organization.to_string().contains("secret"));
        assert!(project(
            "/orgs/team-apps",
            json!({"login": "other-org", "plan": {"name": "free"}})
        )
        .is_err());
        let path = "/organizations/team/settings/billing/usage/summary?year=2026&month=10";
        let payload = json!({ "usageItems": [
            { "product": "Actions", "sku": "actions_linux", "unitType": "minutes",
              "grossQuantity": 20, "netAmount": 1, "repositoryName": "private/secret" },
            { "product": "Copilot", "sku": "copilot", "unitType": "requests",
              "grossQuantity": 400, "netAmount": 10 }
        ], "paymentDetails": "should-never-leak" });
        let result = project(path, payload).unwrap();
        assert_eq!(result["usageItems"].as_array().unwrap().len(), 1);
        assert_eq!(result["usageItems"][0]["grossQuantity"], 20);
        assert!(!result.to_string().contains("private/secret"));
        assert!(!result.to_string().contains("netAmount"));
        assert!(project_billing(json!({"usageItems": [{
            "product": "Actions", "unitType": "minutes", "sku": "actions_linux",
            "grossQuantity": "invalid" }]}))
        .is_err());
    }
    #[test]
    fn github_rest_failures_distinguish_permissions_and_rate_limits_without_provider_text() {
        assert_eq!(
            api_http_failure(401, None, None),
            "GitHub API authorization expired or revoked."
        );
        assert_eq!(
            api_http_failure(403, None, None),
            "GitHub API permission denied."
        );
        assert_eq!(
            api_http_failure(403, Some("123"), None),
            "GitHub API permission denied."
        );
        assert_eq!(
            api_http_failure(403, Some("0"), None),
            "GitHub API rate limited."
        );
        assert_eq!(
            api_http_failure(403, None, Some("90")),
            "GitHub API rate limited."
        );
        assert_eq!(
            api_http_failure(429, None, None),
            "GitHub API rate limited."
        );
        assert_eq!(
            api_http_failure(404, None, None),
            "GitHub API resource inaccessible."
        );
        assert_eq!(
            api_http_failure(502, None, None),
            "GitHub API request failed."
        );
    }
}
