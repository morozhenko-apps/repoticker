//! Native GitHub App OAuth: bounded, nonredirecting HTTPS and OS keychain.
//!
//! No token-bearing type in this module is serialized to a WebView or logged.
//! A separate state machine coordinates cancellation and token refresh; this
//! module only owns network and persistent credential boundaries.

use std::time::Duration;

use reqwest::{header, redirect::Policy, Client};
use serde::{Deserialize, Serialize};

use crate::github_oauth_wire::{
    parse_device_challenge, parse_token_reply, DeviceChallenge, PollReply, TokenLease,
    CLIENT_ID, DEVICE_CODE_URL, DEVICE_GRANT_TYPE, TOKEN_URL,
};

const MAX_OAUTH_RESPONSE_BYTES: usize = 8192;
const KEYRING_SERVICE: &str = "com.morozhenko.repoticker.github";
const KEYRING_USER: &str = "github-app-user-token-v1";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NativeAuthError {
    Network,
    HttpStatus(u16),
    Rejected,
    BadResponse,
    KeychainUnavailable,
    CorruptCredential,
    NoCredential,
    Expired,
}

/// An access + refresh pair is *one* OS keychain entry, not two separate
/// writes that could be split by a process crash or a concurrent refresh.
#[derive(Serialize, Deserialize)]
pub struct CredentialRecord {
    pub version: u8,
    pub access_token: String,
    pub refresh_token: String,
    pub access_expires_at: u64,
    pub refresh_expires_at: u64,
}

impl std::fmt::Debug for CredentialRecord {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CredentialRecord")
            .field("version", &self.version)
            .field("access_token", &"[REDACTED]")
            .field("refresh_token", &"[REDACTED]")
            .field("access_expires_at", &self.access_expires_at)
            .field("refresh_expires_at", &self.refresh_expires_at)
            .finish()
    }
}

impl CredentialRecord {
    pub fn from_lease(lease: TokenLease, issued_at: u64) -> Result<Self, NativeAuthError> {
        let access_expires_at = issued_at
            .checked_add(lease.access_expires_in)
            .ok_or(NativeAuthError::BadResponse)?;
        let refresh_expires_at = issued_at
            .checked_add(lease.refresh_expires_in)
            .ok_or(NativeAuthError::BadResponse)?;
        if refresh_expires_at <= access_expires_at {
            return Err(NativeAuthError::BadResponse);
        }
        Ok(Self {
            version: 1,
            access_token: lease.access_token,
            refresh_token: lease.refresh_token,
            access_expires_at,
            refresh_expires_at,
        })
    }

    fn decode(body: &str) -> Result<Self, NativeAuthError> {
        let record: Self =
            serde_json::from_str(body).map_err(|_| NativeAuthError::CorruptCredential)?;
        if record.version != 1
            || record.access_token.is_empty()
            || record.refresh_token.is_empty()
            || record.access_expires_at == 0
            || record.refresh_expires_at <= record.access_expires_at
        {
            return Err(NativeAuthError::CorruptCredential);
        }
        Ok(record)
    }
}

pub struct NativeCredentialStore;

impl NativeCredentialStore {
    /// Blocking access only. Call from Tauri's spawn_blocking or another
    /// dedicated worker: Secret Service may need D-Bus interaction.
    fn entry() -> Result<keyring::Entry, NativeAuthError> {
        keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER)
            .map_err(|_| NativeAuthError::KeychainUnavailable)
    }

    pub fn load(&self) -> Result<Option<CredentialRecord>, NativeAuthError> {
        let entry = Self::entry()?;
        match entry.get_password() {
            Ok(body) => CredentialRecord::decode(&body).map(Some),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(_) => Err(NativeAuthError::KeychainUnavailable),
        }
    }

    pub fn replace(&self, record: &CredentialRecord) -> Result<(), NativeAuthError> {
        let entry = Self::entry()?;
        let value =
            serde_json::to_string(record).map_err(|_| NativeAuthError::CorruptCredential)?;
        entry
            .set_password(&value)
            .map_err(|_| NativeAuthError::KeychainUnavailable)
    }

    pub fn clear(&self) -> Result<(), NativeAuthError> {
        let entry = Self::entry()?;
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err(NativeAuthError::KeychainUnavailable),
        }
    }
}

/// Immutable HTTPS-only client with redirects/cookies prohibited. Token
/// values appear in POST *bodies*, never in query strings or headers/logs.
pub struct GithubOAuthHttp {
    client: Client,
}

impl GithubOAuthHttp {
    pub fn new() -> Result<Self, NativeAuthError> {
        let client = Client::builder()
            .redirect(Policy::none())
            .timeout(Duration::from_secs(20))
            .user_agent("RepoTicker/0.1 (+https://morozhenko.com/en/repoticker/)")
            .build()
            .map_err(|_| NativeAuthError::Network)?;
        Ok(Self { client })
    }

    async fn submit(&self, url: &'static str, form: &[(&str, &str)]) -> Result<String, NativeAuthError> {
        // Both endpoints are compile-time constants, never user-provided URLs.
        if url != DEVICE_CODE_URL && url != TOKEN_URL {
            return Err(NativeAuthError::BadResponse);
        }
        let mut response = self
            .client
            .post(url)
            .header(header::ACCEPT, "application/json")
            .form(form)
            .send()
            .await
            .map_err(|_| NativeAuthError::Network)?;
        let status = response.status();
        if !status.is_success() {
            return Err(NativeAuthError::HttpStatus(status.as_u16()));
        }

        // Do not trust a Content-Length alone: enforce a hard streaming
        // limit even for chunked/misreported server responses.
        let mut body = Vec::new();
        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|_| NativeAuthError::Network)?
        {
            let remaining = MAX_OAUTH_RESPONSE_BYTES.saturating_sub(body.len());
            if chunk.len() > remaining {
                return Err(NativeAuthError::BadResponse);
            }
            body.extend_from_slice(&chunk);
        }
        String::from_utf8(body).map_err(|_| NativeAuthError::BadResponse)
    }

    pub async fn begin(&self, now: u64) -> Result<DeviceChallenge, NativeAuthError> {
        let body = self
            .submit(
                DEVICE_CODE_URL,
                &[("client_id", CLIENT_ID), ("scope", "offline_access")],
            )
            .await?;
        parse_device_challenge(&body, now).map_err(|_| NativeAuthError::BadResponse)
    }

    pub async fn poll(&self, device_code: &str) -> Result<PollReply, NativeAuthError> {
        let body = self
            .submit(
                TOKEN_URL,
                &[
                    ("client_id", CLIENT_ID),
                    ("device_code", device_code),
                    ("grant_type", DEVICE_GRANT_TYPE),
                ],
            )
            .await?;
        parse_token_reply(&body).map_err(|_| NativeAuthError::BadResponse)
    }

    pub async fn refresh(&self, refresh_token: &str) -> Result<TokenLease, NativeAuthError> {
        let body = self
            .submit(
                TOKEN_URL,
                &[
                    ("client_id", CLIENT_ID),
                    ("refresh_token", refresh_token),
                    ("grant_type", "refresh_token"),
                ],
            )
            .await?;
        match parse_token_reply(&body).map_err(|_| NativeAuthError::BadResponse)? {
            PollReply::Granted(lease) => Ok(lease),
            PollReply::State(_) => Err(NativeAuthError::Rejected),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn record() -> CredentialRecord {
        CredentialRecord {
            version: 1,
            access_token: "ghu_sensitive".into(),
            refresh_token: "ghr_sensitive".into(),
            access_expires_at: 10_000,
            refresh_expires_at: 20_000,
        }
    }

    #[test]
    fn token_bundle_serializes_as_one_keychain_entry_and_never_debug_logs_secrets() {
        let record = record();
        let body = serde_json::to_string(&record).unwrap();
        let rebuilt = CredentialRecord::decode(&body).unwrap();
        assert_eq!(rebuilt.access_token, record.access_token);
        assert_eq!(rebuilt.refresh_token, record.refresh_token);
        let debug = format!("{record:?}");
        assert!(!debug.contains("ghu_sensitive"));
        assert!(!debug.contains("ghr_sensitive"));
    }

    #[test]
    fn malformed_and_stale_keychain_values_fail_closed() {
        for body in [
            "{}",
            "[]",
            "{",
            r#"{"version":2,"access_token":"a","refresh_token":"b","access_expires_at":10,"refresh_expires_at":20}"#,
            r#"{"version":1,"access_token":"a","refresh_token":"","access_expires_at":10,"refresh_expires_at":20}"#,
            r#"{"version":1,"access_token":"a","refresh_token":"b","access_expires_at":20,"refresh_expires_at":10}"#,
        ] {
            assert!(matches!(
                CredentialRecord::decode(body),
                Err(NativeAuthError::CorruptCredential)
            ));
        }
    }

    #[test]
    fn expiry_arithmetic_rejects_overflow_and_inconsistent_refresh() {
        let lease = TokenLease {
            access_token: "a".into(),
            refresh_token: "r".into(),
            access_expires_in: 28_800,
            refresh_expires_in: 15_897_600,
        };
        assert!(matches!(
            CredentialRecord::from_lease(lease, u64::MAX),
            Err(NativeAuthError::BadResponse)
        ));
        let bad = TokenLease {
            access_token: "a".into(),
            refresh_token: "r".into(),
            access_expires_in: 100,
            refresh_expires_in: 1,
        };
        assert!(matches!(
            CredentialRecord::from_lease(bad, 10),
            Err(NativeAuthError::BadResponse)
        ));
    }
}
