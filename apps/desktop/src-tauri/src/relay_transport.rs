//! Authenticated native WSS client for the operator-owned personal relay.
//! WebView receives only a bounded reconcile kind; GitHub REST remains the truth.
use std::{
    sync::{atomic::{AtomicU8, Ordering}, Mutex},
    time::Duration,
};
use futures_util::{SinkExt, StreamExt};
use repoticker_core::relay::{parse_frame, RelayCursor, RelayDecision};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tokio::task::JoinHandle;
use tokio_tungstenite::{
    connect_async_with_config,
    tungstenite::{
        client::IntoClientRequest,
        http::{header::AUTHORIZATION, HeaderValue},
        protocol::{Message, WebSocketConfig},
    },
};

use crate::{
    github_session, read_config, relay_endpoint, relay_secret, ConnectionMode,
};

const CONNECT_TIMEOUT: Duration = Duration::from_secs(15);
const PING_INTERVAL: Duration = Duration::from_secs(40);
const SEND_TIMEOUT: Duration = Duration::from_secs(10);
const MAX_FRAME_BYTES: usize = 2_048;
const MAX_BACKOFF_SECONDS: u64 = 60;

#[derive(Default)]
pub struct RelayTransportState {
    job: Mutex<Option<JoinHandle<()>>>,
    phase: AtomicU8,
}

#[derive(Serialize)]
struct ReconcileEvent {
    kind: &'static str,
}

#[derive(Serialize)]
struct RelayPhaseEvent {
    phase: &'static str,
}

fn phase_label(code: u8) -> &'static str {
    match code {
        1 => "connecting",
        2 => "online",
        3 => "fallback",
        _ => "polling",
    }
}

fn set_phase(app: &AppHandle, code: u8) {
    let state = app.state::<RelayTransportState>();
    if state.phase.swap(code, Ordering::AcqRel) != code {
        let _ = app.emit("repoticker-relay-state", RelayPhaseEvent {
            phase: phase_label(code),
        });
    }
}

#[tauri::command]
pub fn relay_connection_status(app: AppHandle) -> &'static str {
    phase_label(app.state::<RelayTransportState>().phase.load(Ordering::Acquire))
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
        set_phase(&app, 3);
        return;
    };
    if config.connection_mode != ConnectionMode::Hybrid {
        set_phase(&app, 0);
        return;
    }
    let Some(base_url) = config.relay_url.as_deref() else {
        set_phase(&app, 3);
        return;
    };
    let Some(account) = config.github_monitor_org.as_deref() else {
        set_phase(&app, 3);
        return;
    };
    let Ok(mut cursor) = RelayCursor::new(account, &config.github_monitor_repositories) else {
        set_phase(&app, 3);
        return;
    };
    match github_session::github_auth_status(app.clone()).await {
        Ok(status) if status.connected => {}
        _ => {
            set_phase(&app, 3);
            return;
        }
    }
    // Read the credential off the GUI thread. The RAII wrapper zeroes the
    // owned buffer on disconnect, cancellation and any error.
    let secret = match tauri::async_runtime::spawn_blocking(relay_secret::read_secret).await {
        Ok(Ok(Some(secret))) => secret,
        _ => {
            set_phase(&app, 3);
            return;
        }
    };
    let mut attempt = 0;
    loop {
        set_phase(&app, 1);
        let endpoint = match relay_endpoint::websocket_url(base_url, cursor.cursor()) {
            Ok(value) => value,
            Err(_) => {
                set_phase(&app, 3);
                return;
            }
        };
        // Construct all handshake headers natively and mark authorization
        // sensitive. Neither URL nor raw provider errors go to the WebView.
        let mut request = match endpoint.as_str().into_client_request() {
            Ok(value) => value,
            Err(_) => {
                set_phase(&app, 3);
                return;
            }
        };
        let mut value = String::from("Bearer ");
        value.push_str(secret.as_str());
        let header = HeaderValue::from_str(&value);
        relay_secret::wipe(&mut value);
        let Ok(mut header) = header else {
            set_phase(&app, 3);
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
        ).await;
        if let Ok(Ok((mut socket, _))) = connection {
            set_phase(&app, 2);
            // On every successful authentication/reconnect, compare the full
            // authoritative REST snapshot regardless of replay cache state.
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
                                    Err(_) => break,
                                };
                                send_reconcile(&app, cursor.observe(parsed));
                            }
                            Some(Ok(Message::Ping(_))) | Some(Ok(Message::Pong(_))) => {}
                            Some(Ok(Message::Close(_))) | None | Some(Err(_)) => break,
                            Some(Ok(_)) => break,
                        }
                    }
                    _ = ping.tick() => {
                        let ping = socket.send(Message::Ping(Vec::new().into()));
                        if !matches!(tokio::time::timeout(SEND_TIMEOUT, ping).await, Ok(Ok(()))) {
                            break;
                        }
                    }
                }
            }
            let _ = tokio::time::timeout(SEND_TIMEOUT, socket.close(None)).await;
        }
        // Any transport or authentication failure downgrades only hints;
        // independent GitHub REST polling and notification state continue.
        set_phase(&app, 3);
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
        assert_eq!(phase_label(u8::MAX), "polling");
    }
}
