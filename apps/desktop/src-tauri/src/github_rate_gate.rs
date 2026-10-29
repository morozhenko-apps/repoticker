//! Native, in-memory shared backoff for GitHub REST rate limiting.
//! The token, request URL, raw headers and response bodies never cross IPC.
use std::{
    sync::Mutex,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

const FALLBACK_SECONDS: u64 = 120;
const MAX_SECONDS: u64 = 86_400;

#[derive(Default)]
pub struct GitHubRateGate {
    until: Mutex<Option<Instant>>,
}

impl GitHubRateGate {
    pub fn remaining_seconds(&self) -> u64 {
        let until = self.until.lock().unwrap_or_else(|err| err.into_inner());
        let left = until
            .map(|time| time.saturating_duration_since(Instant::now()))
            .unwrap_or_default();
        // Ceiling rather than floor: never resume network before server reset.
        u64::try_from(left.as_millis().saturating_add(999) / 1000)
            .unwrap_or(MAX_SECONDS)
            .min(MAX_SECONDS)
    }

    pub fn defer(&self, duration: Duration) {
        let new_until = Instant::now() + duration.min(Duration::from_secs(MAX_SECONDS));
        let mut current = self.until.lock().unwrap_or_else(|err| err.into_inner());
        if current.is_none_or(|until| until < new_until) {
            *current = Some(new_until);
        }
    }
}

fn bounded_seconds(input: Option<&str>) -> Option<u64> {
    input?
        .parse::<u64>()
        .ok()
        .map(|seconds| seconds.clamp(1, MAX_SECONDS))
}

/// Only a real 403 rate-limit classification or HTTP 429 activates the gate.
/// Invalid/unrecognized provider date formats use the bounded fallback.
pub fn backoff_duration(
    status: u16,
    remaining: Option<&str>,
    retry_after: Option<&str>,
    reset: Option<&str>,
    now_unix: u64,
) -> Option<Duration> {
    if status != 429 && !(status == 403 && (remaining == Some("0") || retry_after.is_some())) {
        return None;
    }
    let from_reset = reset
        .and_then(|value| value.parse::<u64>().ok())
        .filter(|deadline| *deadline > now_unix)
        .map(|deadline| deadline.saturating_sub(now_unix).clamp(1, MAX_SECONDS));
    Some(Duration::from_secs(
        bounded_seconds(retry_after)
            .or(from_reset)
            .unwrap_or(FALLBACK_SECONDS),
    ))
}

pub fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// Bounded numeric status only, never raw provider metadata.
#[tauri::command]
pub fn github_api_cooldown_seconds(app: AppHandle) -> u64 {
    app.state::<GitHubRateGate>().remaining_seconds()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rate_gate_respects_retry_after_then_reset_and_bounded_fallback() {
        let now = 1_800_000_000;
        assert_eq!(
            backoff_duration(429, None, Some("12"), Some("1800003000"), now),
            Some(Duration::from_secs(12))
        );
        assert_eq!(
            backoff_duration(403, Some("0"), None, Some("1800000125"), now),
            Some(Duration::from_secs(125))
        );
        assert_eq!(
            backoff_duration(429, None, Some("99999999999"), None, now),
            Some(Duration::from_secs(MAX_SECONDS))
        );
        assert_eq!(
            backoff_duration(429, None, Some("Wed, 21 Oct 2026 07:00:00 GMT"), None, now),
            Some(Duration::from_secs(FALLBACK_SECONDS))
        );
        assert_eq!(
            backoff_duration(429, None, Some("not-number"), None, now),
            Some(Duration::from_secs(FALLBACK_SECONDS))
        );
        assert_eq!(
            backoff_duration(429, None, Some("0"), None, now),
            Some(Duration::from_secs(1))
        );
    }

    #[test]
    fn permission_errors_never_enter_rate_gate() {
        assert_eq!(backoff_duration(403, Some("12"), None, None, 100), None);
        assert_eq!(
            backoff_duration(401, Some("0"), Some("50"), None, 100),
            None
        );
        assert_eq!(backoff_duration(404, None, None, None, 100), None);
        assert_eq!(backoff_duration(503, None, Some("60"), None, 100), None);
    }

    #[test]
    fn remaining_time_is_monotonic_and_does_not_shorten_existing_gate() {
        let gate = GitHubRateGate::default();
        assert_eq!(gate.remaining_seconds(), 0);
        gate.defer(Duration::from_secs(4));
        assert!((3..=4).contains(&gate.remaining_seconds()));
        gate.defer(Duration::from_secs(1));
        assert!((3..=4).contains(&gate.remaining_seconds()));
        gate.defer(Duration::ZERO);
        assert!((3..=4).contains(&gate.remaining_seconds()));
    }

    #[test]
    fn retry_header_boundaries_preserve_permission_and_rate_semantics() {
        let now = 1_800_000_000;
        assert_eq!(backoff_duration(403, Some("1"), None, None, now), None);
        assert_eq!(
            backoff_duration(403, None, Some("15"), None, now),
            Some(Duration::from_secs(15))
        );
        assert_eq!(
            backoff_duration(403, Some("0"), None, Some("1800000000"), now),
            Some(Duration::from_secs(FALLBACK_SECONDS))
        );
        assert_eq!(
            backoff_duration(403, Some("0"), None, Some("1800000001"), now),
            Some(Duration::from_secs(1))
        );
        assert_eq!(
            backoff_duration(429, None, Some("not-an-integer"), Some("1800000005"), now),
            Some(Duration::from_secs(5))
        );
        assert_eq!(
            backoff_duration(429, None, Some(" 15"), None, now),
            Some(Duration::from_secs(FALLBACK_SECONDS))
        );
        assert_eq!(
            backoff_duration(429, None, Some("-1"), None, now),
            Some(Duration::from_secs(FALLBACK_SECONDS))
        );
        assert_eq!(
            backoff_duration(429, None, Some("999999999999999999999999"), None, now),
            Some(Duration::from_secs(FALLBACK_SECONDS))
        );
        assert_eq!(
            backoff_duration(429, None, Some("86401"), None, now),
            Some(Duration::from_secs(MAX_SECONDS))
        );
    }

    #[test]
    fn quota_headers_have_explicit_reset_and_retry_boundaries() {
        let now = 1_800_000_000;
        assert_eq!(
            backoff_duration(429, None, None, Some("1800000000"), now),
            Some(Duration::from_secs(FALLBACK_SECONDS))
        );
        assert_eq!(
            backoff_duration(429, None, None, Some("1800000001"), now),
            Some(Duration::from_secs(1))
        );
        assert_eq!(
            backoff_duration(429, None, None, Some("1800000002"), now),
            Some(Duration::from_secs(2))
        );
        assert_eq!(
            backoff_duration(429, None, None, Some("18446744073709551615"), now),
            Some(Duration::from_secs(MAX_SECONDS))
        );
        assert_eq!(
            backoff_duration(429, None, Some("3"), Some("18446744073709551615"), now),
            Some(Duration::from_secs(3))
        );
        assert_eq!(
            backoff_duration(429, None, Some("broken"), Some("1800000002"), now),
            Some(Duration::from_secs(2))
        );
    }

    #[test]
    fn unrelated_status_and_permission_denials_cannot_start_a_rate_gate() {
        for status in [200, 201, 204, 301, 304, 400, 401, 404, 500, 503] {
            assert_eq!(
                backoff_duration(status, Some("0"), Some("90"), None, 100),
                None,
                "status {status} must not be classified as a quota gate"
            );
        }
        assert_eq!(
            backoff_duration(403, Some("1"), None, Some("500"), 100),
            None
        );
        assert_eq!(
            backoff_duration(403, Some("0"), Some("1"), None, 100),
            Some(Duration::from_secs(1))
        );
        assert_eq!(
            backoff_duration(429, None, None, None, 100),
            Some(Duration::from_secs(FALLBACK_SECONDS))
        );
    }

    #[test]
    fn concurrent_defer_calls_never_shorten_an_existing_cooldown() {
        use std::sync::Arc;
        use std::thread;
        let gate = Arc::new(GitHubRateGate::default());
        // A large margin avoids flaky wall-clock expectations on busy CI hosts.
        gate.defer(Duration::from_secs(MAX_SECONDS));
        let workers: Vec<_> = (0..12)
            .map(|index| {
                let gate = Arc::clone(&gate);
                thread::spawn(move || {
                    let seconds = if index % 2 == 0 { 1 } else { 30 };
                    gate.defer(Duration::from_secs(seconds));
                })
            })
            .collect();
        for worker in workers {
            worker.join().expect("deferred quota update");
        }
        assert!(gate.remaining_seconds() > 80_000);
    }
}
