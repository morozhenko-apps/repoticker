//! GitHub App native authorization lifecycle.
//!
//! Public Tauri commands return ONLY a user code, fixed verification URL
//! and sanitized status. The device code and access/refresh tokens remain
//! native and are never sent through events, config or JavaScript.

use std::{
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex as StdMutex,
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use repoticker_core::github_auth::{
    DevicePhase, DeviceResponse, PollDecision, TokenAction, TokenExpiration,
};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tokio::sync::{Mutex, Notify};

use crate::{
    github_native::{CredentialRecord, GithubOAuthHttp, NativeAuthError, NativeCredentialStore},
    github_oauth_wire::PollReply,
};

#[derive(Default)]
pub struct GitHubAuthManager {
    epoch: AtomicU64,
    wake: Notify,
    /// All credential reads/rotations/disconnects are serialized.
    vault_gate: Mutex<()>,
    /// Read-only, sanitized progress snapshot. Never contains HTTP bodies,
    /// device codes, OAuth tokens or native keychain error messages.
    progress: StdMutex<AuthProgress>,
}

#[derive(Clone, Copy)]
struct AuthProgress {
    phase: &'static str,
    reason: Option<&'static str>,
}

impl Default for AuthProgress {
    fn default() -> Self {
        Self {
            phase: "idle",
            reason: None,
        }
    }
}

impl GitHubAuthManager {
    fn invalidate(&self) -> u64 {
        let current = self.epoch.fetch_add(1, Ordering::AcqRel) + 1;
        self.wake.notify_waiters();
        current
    }

    fn active(&self, epoch: u64) -> bool {
        self.epoch.load(Ordering::Acquire) == epoch
    }

    fn progress(&self) -> AuthProgress {
        *self
            .progress
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn set_progress(&self, next: AuthProgress) -> bool {
        let mut progress = self
            .progress
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if progress.phase == next.phase && progress.reason == next.reason {
            return false;
        }
        *progress = next;
        true
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubAuthEvent {
    pub status: &'static str,
    pub reason: Option<&'static str>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubAuthChallenge {
    pub user_code: String,
    pub verification_uri: &'static str,
    pub expires_at: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubAuthStatus {
    pub connected: bool,
    pub expires_at: Option<u64>,
    pub phase: &'static str,
    pub reason: Option<&'static str>,
}

fn unix_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn public_error(error: NativeAuthError) -> String {
    match error {
        NativeAuthError::Network => "GitHub is unreachable.".into(),
        NativeAuthError::HttpStatus(status) if status == 429 => {
            "GitHub rate limit exceeded.".into()
        }
        NativeAuthError::HttpStatus(401 | 403) => "GitHub authorization rejected.".into(),
        NativeAuthError::HttpStatus(_) | NativeAuthError::Rejected => {
            "GitHub rejected the authorization request.".into()
        }
        NativeAuthError::BadResponse => "Invalid GitHub authorization response.".into(),
        NativeAuthError::KeychainUnavailable => {
            "System credential store unavailable or locked.".into()
        }
        NativeAuthError::CorruptCredential => {
            "Stored GitHub credentials are invalid. Disconnect and reconnect.".into()
        }
        NativeAuthError::NoCredential => "GitHub is not connected.".into(),
        NativeAuthError::Expired => "GitHub authorization expired. Reconnect.".into(),
    }
}

fn reason_category(error: NativeAuthError) -> &'static str {
    match error {
        NativeAuthError::Network => "network",
        NativeAuthError::HttpStatus(429) => "rate_limit",
        NativeAuthError::HttpStatus(401 | 403) | NativeAuthError::Rejected => {
            "authorization_rejected"
        }
        NativeAuthError::HttpStatus(_) => "http_status",
        NativeAuthError::BadResponse => "invalid_response",
        NativeAuthError::KeychainUnavailable => "credential_store",
        NativeAuthError::CorruptCredential => "invalid_credential",
        NativeAuthError::NoCredential => "not_connected",
        NativeAuthError::Expired => "expired",
    }
}

fn publish_with_reason(app: &AppHandle, status: &'static str, reason: Option<&'static str>) {
    if let Some(state) = app.try_state::<Arc<GitHubAuthManager>>() {
        if !state.set_progress(AuthProgress {
            phase: status,
            reason,
        }) {
            return;
        }
    }
    // In debug mode, report only fixed non-sensitive phase identifiers.
    if std::env::var_os("REPOTICKER_UI_DEBUG").is_some() {
        eprintln!(
            "RepoTicker github auth phase={status} reason={}",
            reason.unwrap_or("none")
        );
    }
    let _ = app.emit("repoticker-github-auth", GitHubAuthEvent { status, reason });
}

fn publish(app: &AppHandle, status: &'static str) {
    publish_with_reason(app, status, None);
}

pub fn cancel_pending(app: &AppHandle) {
    if let Some(state) = app.try_state::<Arc<GitHubAuthManager>>() {
        state.invalidate();
        publish(app, "cancelled");
    }
}

async fn read_credential() -> Result<Option<CredentialRecord>, NativeAuthError> {
    tauri::async_runtime::spawn_blocking(|| NativeCredentialStore.load())
        .await
        .map_err(|_| NativeAuthError::KeychainUnavailable)?
}

async fn store_credential(record: CredentialRecord) -> Result<(), NativeAuthError> {
    tauri::async_runtime::spawn_blocking(move || NativeCredentialStore.replace(&record))
        .await
        .map_err(|_| NativeAuthError::KeychainUnavailable)?
}

async fn delete_credential() -> Result<(), NativeAuthError> {
    tauri::async_runtime::spawn_blocking(|| NativeCredentialStore.clear())
        .await
        .map_err(|_| NativeAuthError::KeychainUnavailable)?
}

/// Cheap event-loss recovery: reads only native memory, never KWallet or GitHub.
#[tauri::command]
pub fn github_flow_status(app: AppHandle) -> GitHubAuthEvent {
    let progress = app.state::<Arc<GitHubAuthManager>>().progress();
    GitHubAuthEvent {
        status: progress.phase,
        reason: progress.reason,
    }
}

#[tauri::command]
pub async fn github_auth_status(app: AppHandle) -> Result<GitHubAuthStatus, String> {
    let state = app.state::<Arc<GitHubAuthManager>>().inner().clone();
    let _guard = state.vault_gate.lock().await;
    let credential = read_credential().await.map_err(public_error)?;
    let valid = credential.filter(|c| c.refresh_expires_at > unix_now());
    let progress = state.progress();
    Ok(GitHubAuthStatus {
        connected: valid.is_some(),
        expires_at: valid.as_ref().map(|c| c.access_expires_at),
        phase: if valid.is_some() {
            "connected"
        } else {
            progress.phase
        },
        reason: if valid.is_some() {
            None
        } else {
            progress.reason
        },
    })
}

/// Generates a new device challenge, invalidating any earlier sign-in
/// attempts. A preflight read ensures the OS credential store is usable
/// before requesting a device code from GitHub.
#[tauri::command]
pub async fn github_begin(app: AppHandle) -> Result<GitHubAuthChallenge, String> {
    let state = app.state::<Arc<GitHubAuthManager>>().inner().clone();
    let attempt = state.invalidate();
    publish(&app, "requesting");
    {
        let _guard = state.vault_gate.lock().await;
        if let Err(error) = read_credential().await {
            publish_with_reason(&app, "failed", Some(reason_category(error)));
            return Err(public_error(error));
        }
    }
    let http = GithubOAuthHttp::new().map_err(public_error)?;
    let challenge = match http.begin(unix_now()).await {
        Ok(challenge) => challenge,
        Err(error) => {
            publish_with_reason(&app, "failed", Some(reason_category(error)));
            return Err(public_error(error));
        }
    };
    if !state.active(attempt) {
        return Err("GitHub sign-in was cancelled.".into());
    }
    let display = GitHubAuthChallenge {
        user_code: challenge.session.user_code.clone(),
        verification_uri: challenge.session.verification_uri,
        expires_at: challenge.session.expires_at,
    };

    let app_for_poll = app.clone();
    tauri::async_runtime::spawn(async move {
        poll_authorization(app_for_poll, state, attempt, http, challenge).await;
    });
    publish(&app, "pending");
    Ok(display)
}

async fn poll_authorization(
    app: AppHandle,
    state: Arc<GitHubAuthManager>,
    attempt: u64,
    http: GithubOAuthHttp,
    challenge: crate::github_oauth_wire::DeviceChallenge,
) {
    let mut session = challenge.session.clone();
    loop {
        if !state.active(attempt) {
            return;
        }
        match session.next_poll(unix_now()) {
            PollDecision::WaitSeconds(seconds) => {
                tokio::select! {
                    () = tokio::time::sleep(Duration::from_secs(seconds)) => {}
                    () = state.wake.notified() => {}
                }
                continue;
            }
            PollDecision::Stop(phase) => {
                publish(
                    &app,
                    match phase {
                        DevicePhase::Denied => "denied",
                        DevicePhase::Expired => "expired",
                        DevicePhase::Cancelled => "cancelled",
                        _ => "failed",
                    },
                );
                return;
            }
            PollDecision::Ready => {}
        }
        if !state.active(attempt) {
            return;
        }
        let reply = match http.poll(challenge.device_code()).await {
            Ok(value) => value,
            Err(error) => {
                if state.active(attempt) {
                    publish_with_reason(&app, "failed", Some(reason_category(error)));
                }
                return;
            }
        };
        if !state.active(attempt) {
            return;
        }
        match reply {
            PollReply::State(response) => {
                if session.receive(response, unix_now()) == DevicePhase::AwaitingUser {
                    publish(&app, "awaiting_approval");
                    continue;
                }
                let (phase, reason) = match response {
                    DeviceResponse::AccessDenied => ("denied", None),
                    DeviceResponse::ExpiredToken => ("expired", None),
                    DeviceResponse::IncorrectClientCredentials => {
                        ("failed", Some("client_credentials"))
                    }
                    DeviceResponse::UnsupportedGrantType => ("failed", Some("grant_type")),
                    DeviceResponse::UnverifiedUserEmail => ("failed", Some("unverified_email")),
                    DeviceResponse::UnknownFailure => ("failed", Some("github_rejected")),
                    _ => ("failed", Some("invalid_response")),
                };
                publish_with_reason(&app, phase, reason);
                return;
            }
            PollReply::Granted(lease) => {
                if session.receive(DeviceResponse::Authorized, unix_now())
                    != DevicePhase::Authorized
                {
                    publish(&app, "expired");
                    return;
                }
                let _guard = state.vault_gate.lock().await;
                if !state.active(attempt) {
                    return;
                }
                publish(&app, "saving_credentials");
                let outcome = match CredentialRecord::from_lease(lease, unix_now()) {
                    Ok(record) => store_credential(record).await,
                    Err(error) => Err(error),
                };
                if state.active(attempt) {
                    match outcome {
                        Ok(()) => publish(&app, "connected"),
                        Err(error) => {
                            publish_with_reason(&app, "failed", Some(reason_category(error)));
                        }
                    }
                }
                return;
            }
        }
    }
}

fn valid_user_code(code: &str) -> bool {
    let bytes = code.as_bytes();
    bytes.len() == 9
        && bytes[4] == b'-'
        && bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| index == 4 || byte.is_ascii_uppercase() || byte.is_ascii_digit())
}

/// The only clipboard operation exposed to the Settings WebView.
/// No clipboard-read permission or arbitrary OAuth token copying.
#[tauri::command]
pub fn github_copy_user_code(app: AppHandle, code: String) -> Result<(), String> {
    if !valid_user_code(&code) {
        return Err("Invalid GitHub verification code.".into());
    }
    app.clipboard()
        .write_text(code)
        .map_err(|_| "Cannot copy verification code to system clipboard.".into())
}

#[tauri::command]
pub fn github_cancel(app: AppHandle) {
    cancel_pending(&app);
}

#[tauri::command]
pub async fn github_disconnect(app: AppHandle) -> Result<(), String> {
    let state = app.state::<Arc<GitHubAuthManager>>().inner().clone();
    state.invalidate();
    let _guard = state.vault_gate.lock().await;
    delete_credential().await.map_err(public_error)?;
    publish(&app, "disconnected");
    Ok(())
}

/// Native-only accessor for the upcoming Actions/runner REST collector.
/// Handles both tokens as a single rotated keychain credential generation.
/// This method is NEVER registered as a Tauri JS command.
#[allow(dead_code)]
pub async fn github_access_token(app: &AppHandle) -> Result<String, String> {
    let state = app.state::<Arc<GitHubAuthManager>>().inner().clone();
    let _guard = state.vault_gate.lock().await;
    let current = read_credential()
        .await
        .map_err(public_error)?
        .ok_or_else(|| public_error(NativeAuthError::NoCredential))?;
    let expiration = TokenExpiration {
        access_expires_at: current.access_expires_at,
        refresh_expires_at: current.refresh_expires_at,
    };
    match expiration.decide(unix_now(), 300) {
        TokenAction::UseAccessToken => Ok(current.access_token),
        TokenAction::Reauthorize => Err(public_error(NativeAuthError::Expired)),
        TokenAction::Refresh => {
            let http = GithubOAuthHttp::new().map_err(public_error)?;
            let lease = http
                .refresh(&current.refresh_token)
                .await
                .map_err(public_error)?;
            let rotated = CredentialRecord::from_lease(lease, unix_now()).map_err(public_error)?;
            // Replacing the entire token pair in one OS credential entry is
            // essential: GitHub invalidates the old refresh token on use.
            store_credential(rotated).await.map_err(public_error)?;
            let next = read_credential().await.map_err(public_error)?;
            next.map(|record| record.access_token)
                .ok_or_else(|| public_error(NativeAuthError::KeychainUnavailable))
        }
    }
}

#[tauri::command]
pub fn github_open_device_page() -> Result<(), String> {
    // Not user-controlled; no shell and no OAuth client secret.
    let url = "https://github.com/login/device";
    #[cfg(target_os = "linux")]
    let mut open = std::process::Command::new("xdg-open");
    #[cfg(target_os = "macos")]
    let mut open = std::process::Command::new("open");
    #[cfg(target_os = "windows")]
    let mut open = std::process::Command::new("explorer");
    open.arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|_| "Cannot open the GitHub authorization page.".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_auth_failures_are_redacted_and_actionable() {
        let errors = [
            NativeAuthError::Network,
            NativeAuthError::HttpStatus(403),
            NativeAuthError::HttpStatus(429),
            NativeAuthError::Rejected,
            NativeAuthError::BadResponse,
            NativeAuthError::KeychainUnavailable,
            NativeAuthError::CorruptCredential,
            NativeAuthError::NoCredential,
            NativeAuthError::Expired,
        ];
        for error in errors {
            let text = public_error(error);
            assert!(!text.is_empty());
            assert!(!text.contains("ghu_"));
            assert!(!text.contains("ghr_"));
            assert!(!text.contains(crate::github_oauth_wire::TOKEN_URL));
        }
    }

    #[test]
    fn clipboard_accepts_only_public_github_user_codes() {
        assert!(valid_user_code("ABCD-1234"));
        assert!(valid_user_code("WDJB-MJHT"));
        for invalid in [
            "ABCD-123",
            "ABCD-12345",
            "abcd-1234",
            "ghu_secret",
            "ghr_secret",
            "A-B-C-D-E",
            "ABCD 1234",
        ] {
            assert!(!valid_user_code(invalid));
        }
    }

    #[test]
    fn terminal_auth_codes_do_not_expose_provider_response_bodies() {
        for reason in [
            "client_credentials",
            "grant_type",
            "unverified_email",
            "github_rejected",
        ] {
            assert!(reason
                .bytes()
                .all(|byte| byte.is_ascii_lowercase() || byte == b'_'));
        }
    }

    #[test]
    fn stages_and_errors_are_safe_and_recoverable_without_webview_events() {
        let state = GitHubAuthManager::default();
        assert_eq!(state.progress().phase, "idle");
        assert!(state.set_progress(AuthProgress {
            phase: "awaiting_approval",
            reason: None,
        }));
        assert!(!state.set_progress(AuthProgress {
            phase: "awaiting_approval",
            reason: None,
        }));
        assert_eq!(state.progress().phase, "awaiting_approval");
        assert!(state.set_progress(AuthProgress {
            phase: "failed",
            reason: Some(reason_category(NativeAuthError::KeychainUnavailable)),
        }));
        assert_eq!(state.progress().reason, Some("credential_store"));
        assert_eq!(
            reason_category(NativeAuthError::BadResponse),
            "invalid_response"
        );
        assert_eq!(reason_category(NativeAuthError::Network), "network");
        assert_eq!(
            reason_category(NativeAuthError::Rejected),
            "authorization_rejected"
        );
    }

    #[test]
    fn newer_attempt_invalidates_prior_polling_generation() {
        let manager = GitHubAuthManager::default();
        let first = manager.invalidate();
        assert!(manager.active(first));
        let next = manager.invalidate();
        assert!(!manager.active(first));
        assert!(manager.active(next));
    }
}
