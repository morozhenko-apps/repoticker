//! Opt-in, process-relative startup timing. Never log user-provided values.
//! Enable for a single run with REPOTICKER_STARTUP_DEBUG=1.
use std::sync::OnceLock;
use std::time::{Duration, Instant};

static START: OnceLock<Instant> = OnceLock::new();
static ENABLED: OnceLock<bool> = OnceLock::new();

pub fn initialize() {
    START.get_or_init(Instant::now);
}

fn enabled() -> bool {
    *ENABLED.get_or_init(|| std::env::var("REPOTICKER_STARTUP_DEBUG").as_deref() == Ok("1"))
}

fn write(stage: &'static str, elapsed: Duration) {
    if !enabled() {
        return;
    }
    let origin = START.get_or_init(Instant::now);
    eprintln!(
        "RepoTicker startup: stage={stage} since_ms={} duration_ms={}",
        origin.elapsed().as_millis(),
        elapsed.as_millis()
    );
}

pub struct Span {
    stage: &'static str,
    started: Option<Instant>,
}

impl Span {
    pub fn new(stage: &'static str) -> Self {
        Self {
            stage,
            started: enabled().then(Instant::now),
        }
    }
}

impl Drop for Span {
    fn drop(&mut self) {
        if let Some(started) = self.started {
            write(self.stage, started.elapsed());
        }
    }
}

// Only these fixed milestone labels can cross from the local WebView to stderr.
// Arbitrary strings, paths and provider data must never be logged.
fn allowed_stage(stage: &str) -> Option<&'static str> {
    match stage {
        "card.start" => Some("card.start"),
        "card.snapshot_ready" => Some("card.snapshot_ready"),
        "card.monitor_ready" => Some("card.monitor_ready"),
        "monitor.auth_start" => Some("monitor.auth_start"),
        "monitor.auth_ready" => Some("monitor.auth_ready"),
        "monitor.scope_ready" => Some("monitor.scope_ready"),
        "monitor.collect_ready" => Some("monitor.collect_ready"),
        "monitor.failed" => Some("monitor.failed"),
        "settings.start" => Some("settings.start"),
        "settings.config_auth_ready" => Some("settings.config_auth_ready"),
        "settings.installations_ready" => Some("settings.installations_ready"),
        _ => None,
    }
}

#[tauri::command]
pub fn trace_startup_stage(stage: String) {
    if !enabled() {
        return;
    }
    if let Some(label) = allowed_stage(&stage) {
        write(label, Duration::ZERO);
    }
}

#[cfg(test)]
mod tests {
    use super::allowed_stage;

    #[test]
    fn only_fixed_nonsecret_startup_milestones_are_accepted() {
        assert_eq!(allowed_stage("card.start"), Some("card.start"));
        assert_eq!(
            allowed_stage("settings.config_auth_ready"),
            Some("settings.config_auth_ready")
        );
        for unsafe_input in [
            "github.token=ghu_secret",
            "card.start\nTOKEN=secret",
            "monitor/owner/private",
            "/home/user/secret",
            "monitor.collect_ready;token=secret",
        ] {
            assert_eq!(allowed_stage(unsafe_input), None);
        }
    }
}
