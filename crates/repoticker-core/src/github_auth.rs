//! GitHub App Device Flow policy; no HTTP, secrets or clock reads.
//! Caller owns all device/access/refresh tokens and OS credential storage.

pub const VERIFY_URL: &str = "https://github.com/login/device";
pub const MIN_POLL_INTERVAL: u64 = 5;
pub const SLOW_DOWN_INCREMENT: u64 = 5;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AuthError {
    InvalidChallenge,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeviceResponse {
    AuthorizationPending,
    SlowDown,
    AccessDenied,
    ExpiredToken,
    IncorrectClientCredentials,
    UnsupportedGrantType,
    UnverifiedUserEmail,
    Authorized,
    UnknownFailure,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DevicePhase {
    AwaitingUser,
    Authorized,
    Denied,
    Expired,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PollDecision {
    Ready,
    WaitSeconds(u64),
    Stop(DevicePhase),
}

/// No device_code, private access token or refresh token in UI-safe state.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeviceSession {
    pub user_code: String,
    pub verification_uri: &'static str,
    pub expires_at: u64,
    pub poll_interval: u64,
    pub phase: DevicePhase,
    next_poll_at: u64,
}

impl DeviceSession {
    pub fn new(
        user_code: &str,
        verification_uri: &str,
        started_at: u64,
        expires_in: u64,
        interval: u64,
    ) -> Result<Self, AuthError> {
        if verification_uri != VERIFY_URL
            || user_code.is_empty()
            || user_code.len() > 32
            || !user_code
                .bytes()
                .all(|b| b.is_ascii_uppercase() || b.is_ascii_digit() || b == b'-')
            || !(1..=3600).contains(&expires_in)
            || !(1..=3600).contains(&interval)
        {
            return Err(AuthError::InvalidChallenge);
        }
        let interval = interval.max(MIN_POLL_INTERVAL);
        let expires_at = started_at
            .checked_add(expires_in)
            .ok_or(AuthError::InvalidChallenge)?;
        let next_poll_at = started_at
            .checked_add(interval)
            .ok_or(AuthError::InvalidChallenge)?;
        Ok(Self {
            user_code: user_code.to_owned(),
            verification_uri: VERIFY_URL,
            expires_at,
            poll_interval: interval,
            phase: DevicePhase::AwaitingUser,
            next_poll_at,
        })
    }

    /// A scheduled native timer uses the returned wait; never busy-poll.
    pub fn next_poll(&mut self, now: u64) -> PollDecision {
        if self.phase != DevicePhase::AwaitingUser {
            return PollDecision::Stop(self.phase);
        }
        if now >= self.expires_at {
            self.phase = DevicePhase::Expired;
            return PollDecision::Stop(self.phase);
        }
        if now < self.next_poll_at {
            return PollDecision::WaitSeconds(self.next_poll_at - now);
        }
        self.next_poll_at = now.saturating_add(self.poll_interval);
        PollDecision::Ready
    }

    /// Map only known GitHub response codes to non-sensitive outcomes.
    pub fn receive(&mut self, response: DeviceResponse, now: u64) -> DevicePhase {
        if self.phase != DevicePhase::AwaitingUser {
            return self.phase;
        }
        if now >= self.expires_at {
            self.phase = DevicePhase::Expired;
            return self.phase;
        }
        self.phase = match response {
            DeviceResponse::AuthorizationPending => DevicePhase::AwaitingUser,
            DeviceResponse::SlowDown => {
                self.poll_interval = self.poll_interval.saturating_add(SLOW_DOWN_INCREMENT);
                self.next_poll_at = self
                    .next_poll_at
                    .max(now.saturating_add(self.poll_interval));
                DevicePhase::AwaitingUser
            }
            DeviceResponse::AccessDenied => DevicePhase::Denied,
            DeviceResponse::ExpiredToken => DevicePhase::Expired,
            DeviceResponse::Authorized => DevicePhase::Authorized,
            DeviceResponse::IncorrectClientCredentials
            | DeviceResponse::UnsupportedGrantType
            | DeviceResponse::UnverifiedUserEmail
            | DeviceResponse::UnknownFailure => DevicePhase::Failed,
        };
        self.phase
    }

    pub fn cancel(&mut self) {
        if self.phase == DevicePhase::AwaitingUser {
            self.phase = DevicePhase::Cancelled;
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TokenExpiration {
    pub access_expires_at: u64,
    pub refresh_expires_at: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TokenAction {
    UseAccessToken,
    Refresh,
    Reauthorize,
}

impl TokenExpiration {
    pub fn decide(self, now: u64, refresh_margin_seconds: u64) -> TokenAction {
        if now >= self.refresh_expires_at {
            TokenAction::Reauthorize
        } else if now.saturating_add(refresh_margin_seconds) >= self.access_expires_at {
            TokenAction::Refresh
        } else {
            TokenAction::UseAccessToken
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn challenge() -> DeviceSession {
        DeviceSession::new("ABCD-EFGH", VERIFY_URL, 1_000, 900, 5).unwrap()
    }

    #[test]
    fn refuses_phishing_urls_invalid_user_codes_and_overflow() {
        for uri in [
            "http://github.com/login/device",
            "https://github.com.attacker.tld/login/device",
            "https://github.com/login/device?next=evil",
            "https://github.com/login/device/",
        ] {
            assert_eq!(
                DeviceSession::new("ABCD-EFGH", uri, 1_000, 900, 5),
                Err(AuthError::InvalidChallenge)
            );
        }
        assert_eq!(
            DeviceSession::new("bad code", VERIFY_URL, 1_000, 900, 5),
            Err(AuthError::InvalidChallenge)
        );
        assert_eq!(
            DeviceSession::new("ABCD-EFGH", VERIFY_URL, u64::MAX, 900, 5),
            Err(AuthError::InvalidChallenge)
        );
    }

    #[test]
    fn cannot_poll_more_often_than_github_interval() {
        let mut s = challenge();
        assert_eq!(s.next_poll(1_000), PollDecision::WaitSeconds(5));
        assert_eq!(s.next_poll(1_005), PollDecision::Ready);
        assert_eq!(s.next_poll(1_006), PollDecision::WaitSeconds(4));
        assert_eq!(
            s.receive(DeviceResponse::AuthorizationPending, 1_007),
            DevicePhase::AwaitingUser
        );
        assert_eq!(s.next_poll(1_010), PollDecision::Ready);
    }

    #[test]
    fn slowdown_extends_current_and_future_poll_intervals() {
        let mut s = challenge();
        assert_eq!(s.next_poll(1_005), PollDecision::Ready);
        s.receive(DeviceResponse::SlowDown, 1_005);
        assert_eq!(s.poll_interval, 10);
        assert_eq!(s.next_poll(1_014), PollDecision::WaitSeconds(1));
        assert_eq!(s.next_poll(1_015), PollDecision::Ready);
        assert_eq!(s.next_poll(1_020), PollDecision::WaitSeconds(5));
    }

    #[test]
    fn denied_expired_and_cancelled_sessions_are_terminal() {
        let mut denied = challenge();
        denied.receive(DeviceResponse::AccessDenied, 1_010);
        assert_eq!(
            denied.next_poll(1_015),
            PollDecision::Stop(DevicePhase::Denied)
        );
        assert_eq!(
            denied.receive(DeviceResponse::Authorized, 1_020),
            DevicePhase::Denied
        );
        let mut expired = challenge();
        assert_eq!(
            expired.next_poll(1_900),
            PollDecision::Stop(DevicePhase::Expired)
        );
        let mut cancelled = challenge();
        cancelled.cancel();
        assert_eq!(
            cancelled.receive(DeviceResponse::Authorized, 1_020),
            DevicePhase::Cancelled
        );
    }

    #[test]
    fn authorization_requires_a_nonexpired_active_challenge() {
        let mut s = challenge();
        assert_eq!(
            s.receive(DeviceResponse::Authorized, 1_100),
            DevicePhase::Authorized
        );
        assert_eq!(
            s.next_poll(1_200),
            PollDecision::Stop(DevicePhase::Authorized)
        );
        let mut expired = challenge();
        assert_eq!(
            expired.receive(DeviceResponse::Authorized, 1_900),
            DevicePhase::Expired
        );
    }

    #[test]
    fn unsupported_or_invalid_credentials_end_the_attempt() {
        for code in [
            DeviceResponse::IncorrectClientCredentials,
            DeviceResponse::UnsupportedGrantType,
            DeviceResponse::UnverifiedUserEmail,
            DeviceResponse::UnknownFailure,
        ] {
            let mut s = challenge();
            assert_eq!(s.receive(code, 1_010), DevicePhase::Failed);
        }
    }

    #[test]
    fn rotated_access_token_policy_refreshes_before_expiration() {
        let lease = TokenExpiration {
            access_expires_at: 10_000,
            refresh_expires_at: 20_000,
        };
        assert_eq!(lease.decide(9_600, 300), TokenAction::UseAccessToken);
        assert_eq!(lease.decide(9_700, 300), TokenAction::Refresh);
        assert_eq!(lease.decide(20_000, 300), TokenAction::Reauthorize);
        assert_eq!(lease.decide(u64::MAX, 300), TokenAction::Reauthorize);
    }

    #[test]
    fn device_challenge_rejects_boundary_values_and_untrusted_codes() {
        for expires in [0, 3_601] {
            assert_eq!(
                DeviceSession::new("ABCD-EFGH", VERIFY_URL, 1_000, expires, 5),
                Err(AuthError::InvalidChallenge)
            );
        }
        for interval in [0, 3_601] {
            assert_eq!(
                DeviceSession::new("ABCD-EFGH", VERIFY_URL, 1_000, 900, interval),
                Err(AuthError::InvalidChallenge)
            );
        }
        for code in ["", "AB cd", "AB_cD", "A/B", "ÄBC", "abcd-1234"] {
            assert_eq!(
                DeviceSession::new(code, VERIFY_URL, 1_000, 900, 5),
                Err(AuthError::InvalidChallenge),
                "untrusted device user code: {code:?}"
            );
        }
        let too_long = "A".repeat(33);
        assert_eq!(
            DeviceSession::new(&too_long, VERIFY_URL, 1_000, 900, 5),
            Err(AuthError::InvalidChallenge)
        );

        let minimum = DeviceSession::new("A", VERIFY_URL, 1_000, 1, 1).unwrap();
        assert_eq!(minimum.poll_interval, MIN_POLL_INTERVAL);
        assert_eq!(minimum.expires_at, 1_001);
        assert_eq!(
            DeviceSession::new("A", VERIFY_URL, 1_000, 3_600, 3_600)
                .unwrap()
                .poll_interval,
            3_600
        );
        let near_max = u64::MAX - 5;
        assert!(DeviceSession::new("A", VERIFY_URL, near_max, 5, 5).is_ok());
        assert_eq!(
            DeviceSession::new("A", VERIFY_URL, near_max + 1, 5, 5),
            Err(AuthError::InvalidChallenge)
        );
    }

    #[test]
    fn consecutive_slow_down_replies_never_enable_early_polling() {
        let mut session = challenge();
        assert_eq!(session.next_poll(1_005), PollDecision::Ready);
        assert_eq!(
            session.receive(DeviceResponse::SlowDown, 1_005),
            DevicePhase::AwaitingUser
        );
        assert_eq!(session.next_poll(1_014), PollDecision::WaitSeconds(1));
        assert_eq!(session.next_poll(1_015), PollDecision::Ready);
        assert_eq!(
            session.receive(DeviceResponse::SlowDown, 1_015),
            DevicePhase::AwaitingUser
        );
        assert_eq!(session.poll_interval, 15);
        assert_eq!(session.next_poll(1_029), PollDecision::WaitSeconds(1));
        assert_eq!(session.next_poll(1_030), PollDecision::Ready);
        assert_eq!(session.next_poll(1_031), PollDecision::WaitSeconds(14));
        assert_eq!(
            session.next_poll(1_900),
            PollDecision::Stop(DevicePhase::Expired)
        );
        assert_eq!(
            session.receive(DeviceResponse::Authorized, 1_900),
            DevicePhase::Expired
        );
    }

    #[test]
    fn terminal_device_phases_reject_late_success_and_cancellation() {
        for (reply, terminal) in [
            (DeviceResponse::AccessDenied, DevicePhase::Denied),
            (DeviceResponse::ExpiredToken, DevicePhase::Expired),
            (DeviceResponse::UnknownFailure, DevicePhase::Failed),
            (DeviceResponse::Authorized, DevicePhase::Authorized),
        ] {
            let mut session = challenge();
            assert_eq!(session.receive(reply, 1_010), terminal);
            session.cancel();
            session.cancel();
            assert_eq!(session.phase, terminal);
            assert_eq!(session.receive(DeviceResponse::Authorized, 1_020), terminal);
            assert_eq!(session.next_poll(1_021), PollDecision::Stop(terminal));
        }
        let mut cancelled = challenge();
        cancelled.cancel();
        cancelled.cancel();
        assert_eq!(
            cancelled.next_poll(1_010),
            PollDecision::Stop(DevicePhase::Cancelled)
        );
        assert_eq!(
            cancelled.receive(DeviceResponse::Authorized, 1_010),
            DevicePhase::Cancelled
        );
    }

    #[test]
    fn refresh_policy_handles_exact_margin_and_saturated_time() {
        let lease = TokenExpiration {
            access_expires_at: 400,
            refresh_expires_at: 500,
        };
        assert_eq!(lease.decide(398, 1), TokenAction::UseAccessToken);
        assert_eq!(lease.decide(399, 1), TokenAction::Refresh);
        assert_eq!(lease.decide(400, 0), TokenAction::Refresh);
        assert_eq!(lease.decide(500, 0), TokenAction::Reauthorize);

        let near_max = TokenExpiration {
            access_expires_at: u64::MAX - 1,
            refresh_expires_at: u64::MAX,
        };
        assert_eq!(
            near_max.decide(u64::MAX - 2, 0),
            TokenAction::UseAccessToken
        );
        assert_eq!(near_max.decide(u64::MAX - 2, 10), TokenAction::Refresh);
        assert_eq!(near_max.decide(u64::MAX, 10), TokenAction::Reauthorize);
    }
}
