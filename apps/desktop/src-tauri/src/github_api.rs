//! Authenticated read-only GitHub REST transport.
//! The UI may request ONLY a finite set of Actions/installation routes.
//! OAuth bearer strings never cross IPC; error responses are not returned.

use std::{collections::HashSet, time::Duration};

use reqwest::{header, redirect::Policy, Client, Url};
use serde_json::{json, Value};
use tauri::AppHandle;

use crate::github_session;

const MAX_BODY: usize = 2 * 1024 * 1024;
const PAGE_CAP: u32 = 10;
const API_VERSION: &str = "2022-11-28";

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
    let route = match segments.as_slice() {
        ["user", "installations"] => 0,
        ["user", "installations", id, "repositories"] if id.parse::<u64>().is_ok_and(|n| n > 0) => {
            1
        }
        ["orgs", org, "actions", "runners"] if valid_name(org) => 2,
        ["repos", owner, repo, "actions", "runs"] if valid_name(owner) && valid_name(repo) => 3,
        ["repos", owner, repo, "actions", "runs", id, "jobs"]
            if valid_name(owner) && valid_name(repo) && id.parse::<u64>().is_ok_and(|n| n > 0) =>
        {
            4
        }
        _ => return false,
    };
    let mut keys = HashSet::new();
    for (key, value) in url.query_pairs() {
        if !keys.insert(key.to_string()) {
            return false;
        }
        match key.as_ref() {
            "per_page" if value == "100" => {}
            "page"
                if value
                    .parse::<u32>()
                    .is_ok_and(|n| (1..=PAGE_CAP).contains(&n)) => {}
            "status" if route == 3 && (value == "queued" || value == "in_progress") => {}
            "filter" if route == 4 && value == "latest" => {}
            _ => return false,
        }
    }
    keys.contains("per_page") && keys.contains("page")
}

/// Keep fields needed for the already-tested pure JS collector. This is a
/// deliberate API response projection, not arbitrary GitHub account data.
fn project(path: &str, value: Value) -> Result<Value, String> {
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
        return Err(match response.status().as_u16() {
            401 => "GitHub authorization expired or revoked.",
            403 => "GitHub permissions or rate limit prevent this request.",
            404 => "GitHub resource not accessible to this installation.",
            _ => "GitHub API request failed.",
        }
        .into());
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
            "/user/installations/123/repositories?per_page=100&page=2",
            "/orgs/team-apps/actions/runners?per_page=100&page=1",
            "/repos/team-apps/tool/actions/runs?status=queued&per_page=100&page=1",
            "/repos/team-apps/tool/actions/runs/123/jobs?filter=latest&per_page=100&page=1",
        ] {
            assert!(valid_path(path), "{path}");
        }
        for path in [
            "https://evil.example",
            "/user",
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
}
