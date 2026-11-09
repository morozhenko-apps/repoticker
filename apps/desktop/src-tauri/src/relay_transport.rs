//! Authenticated native WSS client for the operator-owned personal relay.
//! WebView receives only a bounded reconcile kind; GitHub REST remains the truth.
use futures_util::{SinkExt, StreamExt};
use repoticker_core::relay::{parse_frame, RelayCursor, RelayDecision};
use serde::Serialize;
use std::{
    sync::{
        atomic::{AtomicU8, Ordering},
        Mutex,
    },
    time::Duration,
};
use tauri::{async_runtime::JoinHandle, AppHandle, Emitter, Manager};
use tokio_tungstenite::{
    connect_async_with_config,
    tungstenite::{
        client::IntoClientRequest,
        http::{
            header::{AUTHORIZATION, USER_AGENT},
            HeaderValue,
        },
        protocol::{Message, WebSocketConfig},
    },
};

use crate::{github_session, read_config, relay_endpoint, relay_secret, ConnectionMode};

const CONNECT_TIMEOUT: Duration = Duration::from_secs(15);
const PING_INTERVAL: Duration = Duration::from_secs(40);
const SEND_TIMEOUT: Duration = Duration::from_secs(10);
const MAX_FRAME_BYTES: usize = 2_048;
const MAX_BACKOFF_SECONDS: u64 = 60;

#[derive(Default)]
pub struct RelayTransportState {
    job: Mutex<Option<JoinHandle<()>>>,
    phase: AtomicU8,
    last_failure: AtomicU8,
}

#[derive(Clone, Serialize)]
struct ReconcileEvent {
    kind: &'static str,
}

#[derive(Clone, Serialize)]
pub struct RelayPhaseEvent {
    phase: &'static str,
    reason: &'static str,
}

fn phase_label(code: u8) -> &'static str {
    match code {
        0 => "polling",
        1 => "connecting",
        2 => "online",
        _ => "fallback",
    }
}

fn reason_label(code: u8) -> &'static str {
    match code {
        4 => "configuration",
        5 => "scope",
        6 => "github",
        7 => "missing_secret",
        8 => "credential_store",
        9 => "invalid_url",
        10 => "http_401",
        11 => "http_403",
        12 => "http_endpoint",
        13 => "http_service",
        14 => "timeout",
        15 => "network",
        16 => "tls",
        17 => "protocol",
        18 => "closed",
        19 => "pending_changes",
        3 => "unavailable",
        _ => "none",
    }
}

fn http_failure_code(status: u16) -> u8 {
    match status {
        401 => 10,
        403 => 11,
        400 | 404 | 405 | 426 => 12,
        500..=599 => 13,
        _ => 17,
    }
}

fn handshake_failure_code(error: &tokio_tungstenite::tungstenite::Error) -> u8 {
    use tokio_tungstenite::tungstenite::Error;
    match error {
        Error::Http(response) => http_failure_code(response.status().as_u16()),
        Error::Tls(_) => 16,
        Error::Io(_) => 15,
        _ => 17,
    }
}

fn snapshot(code: u8) -> RelayPhaseEvent {
    RelayPhaseEvent {
        phase: phase_label(code),
        reason: reason_label(code),
    }
}

fn set_phase(app: &AppHandle, code: u8) {
    let state = app.state::<RelayTransportState>();
    if code == 2 {
        state.last_failure.store(0, Ordering::Release);
    } else if code >= 3 && state.last_failure.swap(code, Ordering::AcqRel) != code {
        // Never emit network errors, URLs or tokens to public diagnostic logs.
        eprintln!(
            "RepoTicker relay: phase=fallback reason={}",
            reason_label(code)
        );
    }
    if state.phase.swap(code, Ordering::AcqRel) != code {
        // Opt-in lifecycle diagnostics expose only finite phase/reason labels.
        if std::env::var_os("REPOTICKER_RELAY_DEBUG").is_some() {
            eprintln!(
                "RepoTicker relay diagnostic: phase={} reason={}",
                phase_label(code),
                reason_label(code)
            );
        }
        let _ = app.emit("repoticker-relay-state", snapshot(code));
    }
}

#[tauri::command]
pub fn relay_connection_status(app: AppHandle) -> &'static str {
    phase_label(
        app.state::<RelayTransportState>()
            .phase
            .load(Ordering::Acquire),
    )
}

#[tauri::command]
pub fn relay_connection_diagnostics(app: AppHandle) -> RelayPhaseEvent {
    snapshot(
        app.state::<RelayTransportState>()
            .phase
            .load(Ordering::Acquire),
    )
}

fn backoff(attempt: u32) -> Duration {
    Duration::from_secs((1_u64 << attempt.min(6)).min(MAX_BACKOFF_SECONDS))
}

/// Always abort the previous task before publishing its replacement.
/// This cancels pending TLS handshakes, heartbeat timers and old-scope reads.
pub fn restart(app: &AppHandle) {
    let state = app.state::<RelayTransportState>();
    let mut slot = state.job.lock().unwrap_or_else(|err| err.into_inner());
    if let Some(previous) = slot.take() {
        previous.abort();
    }
    // Atomic on the native side: a single active task per application.
    set_phase(app, 0);
    let current = app.clone();
    *slot = Some(tauri::async_runtime::spawn(async move {
        run(current).await;
    }));
}

fn send_reconcile(app: &AppHandle, decision: RelayDecision) {
    let kind = match decision {
        RelayDecision::Ignore => return,
        RelayDecision::RefreshTasks => "tasks",
        RelayDecision::ReconcileAll => "all",
    };
    let _ = app.emit("repoticker-relay-reconcile", ReconcileEvent { kind });
}

async fn run(app: AppHandle) {
    let Ok(config) = read_config(&app) else {
        set_phase(&app, 4);
        return;
    };
    if config.connection_mode != ConnectionMode::Hybrid {
        set_phase(&app, 0);
        return;
    }
    // A Settings draft may be changing both relay origin and native Keyring
    // credential. Never handshake to a newly saved URL using an old bearer.
    // Rest fallback is independent and stays available until explicit OK.
    if relay_secret::has_pending_draft(&app) {
        set_phase(&app, 19);
        return;
    }
    let Some(base_url) = config.relay_url.as_deref() else {
        set_phase(&app, 9);
        return;
    };
    let Some(account) = config.github_monitor_org.as_deref() else {
        set_phase(&app, 5);
        return;
    };
    let Ok(mut cursor) = RelayCursor::new(account, &config.github_monitor_repositories) else {
        set_phase(&app, 5);
        return;
    };
    match github_session::github_auth_status(app.clone()).await {
        Ok(status) if status.connected => {}
        _ => {
            set_phase(&app, 6);
            return;
        }
    }
    // Read the credential off the GUI thread. The RAII wrapper zeroes the
    // owned buffer on disconnect, cancellation and any error.
    let secret = match tauri::async_runtime::spawn_blocking(relay_secret::read_secret).await {
        Ok(Ok(Some(secret))) => secret,
        Ok(Ok(None)) => {
            set_phase(&app, 7);
            return;
        }
        _ => {
            set_phase(&app, 8);
            return;
        }
    };
    // rustls may have more than one provider enabled by transitive crates.
    // Install a deterministic provider, or reuse the already installed one.
    // Never disable TLS certificate or hostname verification.
    let _ = rustls::crypto::ring::default_provider().install_default();
    let mut attempt = 0;
    loop {
        set_phase(&app, 1);
        let endpoint = match relay_endpoint::websocket_url(base_url, cursor.cursor()) {
            Ok(value) => value,
            Err(_) => {
                set_phase(&app, 9);
                return;
            }
        };
        // Construct all handshake headers natively and mark authorization
        // sensitive. Neither URL nor raw provider errors go to the WebView.
        let mut request = match endpoint.as_str().into_client_request() {
            Ok(value) => value,
            Err(_) => {
                set_phase(&app, 9);
                return;
            }
        };
        // Generic native-client identity for the HTTP upgrade, no personal data.
        request
            .headers_mut()
            .insert(USER_AGENT, HeaderValue::from_static("RepoTicker/1.0"));
        let mut value = String::from("Bearer ");
        value.push_str(secret.as_str());
        let header = HeaderValue::from_str(&value);
        relay_secret::wipe(&mut value);
        let Ok(mut header) = header else {
            set_phase(&app, 8);
            return;
        };
        header.set_sensitive(true);
        request.headers_mut().insert(AUTHORIZATION, header);
        let limits = WebSocketConfig::default()
            .max_frame_size(Some(MAX_FRAME_BYTES))
            .max_message_size(Some(MAX_FRAME_BYTES));
        let connection = tokio::time::timeout(
            CONNECT_TIMEOUT,
            connect_async_with_config(request, Some(limits), false),
        )
        .await;
        let failure = match connection {
            Ok(Ok((mut socket, _))) => {
                set_phase(&app, 2);
                let mut disconnect_reason = 18;
                // Reconcile the complete authoritative REST state after login.
                send_reconcile(&app, RelayDecision::ReconcileAll);
                attempt = 0;
                let mut ping = tokio::time::interval(PING_INTERVAL);
                ping.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
                ping.tick().await;
                loop {
                    tokio::select! {
                        frame = socket.next() => {
                            match frame {
                                Some(Ok(Message::Text(raw))) => {
                                    let parsed = match parse_frame(raw.as_bytes()) {
                                        Ok(value) => value,
                                        Err(_) => {
                                            disconnect_reason = 17;
                                            break;
                                        }
                                    };
                                    send_reconcile(&app, cursor.observe(parsed));
                                }
                                Some(Ok(Message::Ping(_))) | Some(Ok(Message::Pong(_))) => {}
                                Some(Ok(Message::Close(_))) | None => break,
                                Some(Err(ref error)) => {
                                    disconnect_reason = handshake_failure_code(error);
                                    break;
                                }
                                Some(Ok(_)) => {
                                    disconnect_reason = 17;
                                    break;
                                }
                            }
                        }
                        _ = ping.tick() => {
                            let ping = socket.send(Message::Ping(Vec::new().into()));
                            if !matches!(tokio::time::timeout(SEND_TIMEOUT, ping).await, Ok(Ok(()))) {
                                disconnect_reason = 14;
                                break;
                            }
                        }
                    }
                }
                let _ = tokio::time::timeout(SEND_TIMEOUT, socket.close(None)).await;
                disconnect_reason
            }
            Ok(Err(ref error)) => handshake_failure_code(error),
            Err(_) => 14,
        };
        // Independent REST monitoring continues if the relay fails.
        set_phase(&app, failure);
        tokio::time::sleep(backoff(attempt)).await;
        attempt = attempt.saturating_add(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reconnect_is_bounded_without_unlimited_retry_frequency() {
        assert_eq!(backoff(0), Duration::from_secs(1));
        assert_eq!(backoff(4), Duration::from_secs(16));
        assert_eq!(backoff(9), Duration::from_secs(60));
        assert_eq!(backoff(u32::MAX), Duration::from_secs(60));
    }

    #[test]
    fn public_availability_is_only_fixed_nonsecret_phase_data() {
        assert_eq!(phase_label(0), "polling");
        assert_eq!(phase_label(1), "connecting");
        assert_eq!(phase_label(2), "online");
        assert_eq!(phase_label(3), "fallback");
        assert_eq!(phase_label(u8::MAX), "fallback");
        assert_eq!(reason_label(7), "missing_secret");
        assert_eq!(reason_label(11), "http_403");
        assert_eq!(reason_label(19), "pending_changes");
        for (http, expected) in [(401, 10), (403, 11), (404, 12), (503, 13)] {
            assert_eq!(http_failure_code(http), expected);
        }
        assert_eq!(
            serde_json::to_string(&snapshot(11)).unwrap(),
            r#"{"phase":"fallback","reason":"http_403"}"#,
        );
    }
}
