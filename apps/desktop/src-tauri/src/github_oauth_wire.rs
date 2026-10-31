//! Native-only GitHub App OAuth wire models: no network, persistence or UI tokens.
//! Never log raw HTTP bodies: a successful OAuth response holds bearer secrets.

use repoticker_core::github_auth::{DeviceResponse, DeviceSession};
use serde_json::Value;

pub const CLIENT_ID: &str = "Iv23liyFAFdT7NCSkpIj";
pub const DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
pub const TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
pub const DEVICE_GRANT_TYPE: &str = "urn:ietf:params:oauth:grant-type:device_code";
const MAX_JSON_BYTES: usize = 8192;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WireError {
    InvalidServerResponse,
    MissingRefreshToken,
}

/// Private device_code remains on the native side. Display only the session.
pub struct DeviceChallenge {
    pub session: DeviceSession,
    device_code: String,
}

impl DeviceChallenge {
    pub fn device_code(&self) -> &str {
        &self.device_code
    }
}

impl std::fmt::Debug for DeviceChallenge {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("DeviceChallenge")
            .field("session", &self.session)
            .field("device_code", &"[REDACTED]")
            .finish()
    }
}

/// Not serializable to a WebView. Credential persistence must be atomic.
pub struct TokenLease {
    pub access_token: String,
    pub refresh_token: String,
    pub access_expires_in: u64,
    pub refresh_expires_in: u64,
}

impl std::fmt::Debug for TokenLease {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TokenLease")
            .field("access_token", &"[REDACTED]")
            .field("refresh_token", &"[REDACTED]")
            .field("access_expires_in", &self.access_expires_in)
            .field("refresh_expires_in", &self.refresh_expires_in)
            .finish()
    }
}

#[derive(Debug)]
pub enum PollReply {
    State(DeviceResponse),
    Granted(TokenLease),
}

fn object(input: &str) -> Result<Value, WireError> {
    if input.len() > MAX_JSON_BYTES {
        return Err(WireError::InvalidServerResponse);
    }
    let value: Value = serde_json::from_str(input).map_err(|_| WireError::InvalidServerResponse)?;
    if !value.is_object() {
        return Err(WireError::InvalidServerResponse);
    }
    Ok(value)
}

fn valid_ascii_token(value: &str, max_len: usize) -> bool {
    !value.is_empty() && value.len() <= max_len && value.bytes().all(|byte| byte.is_ascii_graphic())
}

pub fn parse_device_challenge(input: &str, started_at: u64) -> Result<DeviceChallenge, WireError> {
    let value = object(input)?;
    let device_code = value
        .get("device_code")
        .and_then(Value::as_str)
        .filter(|s| valid_ascii_token(s, 512))
        .ok_or(WireError::InvalidServerResponse)?;
    let user_code = value
        .get("user_code")
        .and_then(Value::as_str)
        .ok_or(WireError::InvalidServerResponse)?;
    let uri = value
        .get("verification_uri")
        .and_then(Value::as_str)
        .ok_or(WireError::InvalidServerResponse)?;
    let expires_in = value
        .get("expires_in")
        .and_then(Value::as_u64)
        .ok_or(WireError::InvalidServerResponse)?;
    let interval = value.get("interval").and_then(Value::as_u64).unwrap_or(5);
    let session = DeviceSession::new(user_code, uri, started_at, expires_in, interval)
        .map_err(|_| WireError::InvalidServerResponse)?;
    Ok(DeviceChallenge {
        session,
        device_code: device_code.to_owned(),
    })
}

pub fn parse_token_reply(input: &str) -> Result<PollReply, WireError> {
    let value = object(input)?;
    if let Some(error) = value.get("error").and_then(Value::as_str) {
        // Discard untrusted error_description and arbitrary server content.
        let response = match error {
            "authorization_pending" => DeviceResponse::AuthorizationPending,
            "slow_down" => DeviceResponse::SlowDown,
            "access_denied" => DeviceResponse::AccessDenied,
            "expired_token" => DeviceResponse::ExpiredToken,
            "incorrect_client_credentials" => DeviceResponse::IncorrectClientCredentials,
            "unsupported_grant_type" => DeviceResponse::UnsupportedGrantType,
            "unverified_user_email" => DeviceResponse::UnverifiedUserEmail,
            _ => DeviceResponse::UnknownFailure,
        };
        return Ok(PollReply::State(response));
    }

    let access = value
        .get("access_token")
        .and_then(Value::as_str)
        .filter(|token| valid_ascii_token(token, 8192))
        .ok_or(WireError::InvalidServerResponse)?;
    let refresh = value
        .get("refresh_token")
        .and_then(Value::as_str)
        .filter(|token| valid_ascii_token(token, 8192))
        .ok_or(WireError::MissingRefreshToken)?;
    if value.get("token_type").and_then(Value::as_str) != Some("bearer") {
        return Err(WireError::InvalidServerResponse);
    }
    let access_expires_in = value
        .get("expires_in")
        .and_then(Value::as_u64)
        .filter(|n| *n > 0 && *n <= 604_800)
        .ok_or(WireError::InvalidServerResponse)?;
    let refresh_expires_in = value
        .get("refresh_token_expires_in")
        .and_then(Value::as_u64)
        .filter(|n| *n > 0 && *n <= 34_560_000)
        .ok_or(WireError::InvalidServerResponse)?;
    Ok(PollReply::Granted(TokenLease {
        access_token: access.to_owned(),
        refresh_token: refresh.to_owned(),
        access_expires_in,
        refresh_expires_in,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use repoticker_core::github_auth::{DevicePhase, PollDecision, TokenAction, TokenExpiration};

    #[test]
    fn valid_device_response_keeps_private_code_out_of_debug() {
        let input = r#"{"device_code":"native-secret","user_code":"ABCD-EFGH","verification_uri":"https://github.com/login/device","expires_in":900,"interval":5}"#;
        let mut result = parse_device_challenge(input, 1000).unwrap();
        assert_eq!(result.device_code(), "native-secret");
        assert_eq!(result.session.user_code, "ABCD-EFGH");
        assert_eq!(result.session.next_poll(1004), PollDecision::WaitSeconds(1));
        assert!(!format!("{result:?}").contains("native-secret"));
        for bad in [
            input.replace("github.com/login", "github.com.evil.test/login"),
            input.replace("\"interval\":5", "\"interval\":0"),
            input.replace("\"device_code\":\"native-secret\"", "\"device_code\":\"\""),
        ] {
            assert!(parse_device_challenge(&bad, 1000).is_err());
        }
    }

    #[test]
    fn known_device_errors_are_mapped_without_leaking_server_text() {
        for (code, expected) in [
            (
                "authorization_pending",
                DeviceResponse::AuthorizationPending,
            ),
            ("slow_down", DeviceResponse::SlowDown),
            ("access_denied", DeviceResponse::AccessDenied),
            ("expired_token", DeviceResponse::ExpiredToken),
        ] {
            let wire = format!(r#"{{"error":"{code}","error_description":"sensitive"}}"#);
            assert!(
                matches!(parse_token_reply(&wire), Ok(PollReply::State(response)) if response == expected)
            );
        }
        let mut session = parse_device_challenge(r#"{"device_code":"one","user_code":"ABCD-EFGH","verification_uri":"https://github.com/login/device","expires_in":900,"interval":5}"#, 1000).unwrap().session;
        assert_eq!(
            session.receive(DeviceResponse::AccessDenied, 1010),
            DevicePhase::Denied
        );
    }

    #[test]
    fn bearer_grants_require_lease_expiration_and_refresh_rotation() {
        let response = r#"{"access_token":"secret-access","refresh_token":"secret-refresh","token_type":"bearer","expires_in":28800,"refresh_token_expires_in":15897600}"#;
        let PollReply::Granted(tokens) = parse_token_reply(response).unwrap() else {
            panic!("expected valid grant");
        };
        assert_eq!(tokens.access_token, "secret-access");
        assert_eq!(tokens.refresh_token, "secret-refresh");
        assert!(!format!("{tokens:?}").contains("secret-access"));
        assert!(!format!("{tokens:?}").contains("secret-refresh"));
        let expiration = TokenExpiration {
            access_expires_at: 1000 + tokens.access_expires_in,
            refresh_expires_at: 1000 + tokens.refresh_expires_in,
        };
        assert_eq!(expiration.decide(1000, 300), TokenAction::UseAccessToken);
        for bad in [
            response.replace("bearer", "basic"),
            response.replace("secret-refresh", ""),
            response.replace("\"expires_in\":28800", "\"expires_in\":0"),
        ] {
            assert!(parse_token_reply(&bad).is_err());
        }
    }

    #[test]
    fn oauth_destinations_and_publisher_client_id_are_fixed() {
        assert_eq!(CLIENT_ID, "Iv23liyFAFdT7NCSkpIj");
        assert_eq!(DEVICE_CODE_URL, "https://github.com/login/device/code");
        assert_eq!(TOKEN_URL, "https://github.com/login/oauth/access_token");
        assert_eq!(
            DEVICE_GRANT_TYPE,
            "urn:ietf:params:oauth:grant-type:device_code"
        );
    }

    #[test]
    fn invalid_unbounded_or_unknown_oauth_replies_fail_closed() {
        assert!(parse_token_reply("{").is_err());
        assert!(parse_token_reply(&" ".repeat(8193)).is_err());
        assert!(parse_token_reply("[]").is_err());
        assert!(parse_device_challenge("{}", 1000).is_err());
        assert!(matches!(
            parse_token_reply(r#"{"error":"unrecognized","error_description":"private"}"#),
            Ok(PollReply::State(DeviceResponse::UnknownFailure))
        ));
    }

    #[test]
    fn oauth_device_code_rejects_malformed_and_unbounded_json_before_projection() {
        for response in [
            "[]",
            "{}",
            "null",
            r#"{"device_code":true}"#,
            r#"{"device_code":"native","user_code":"x","verification_uri":"http://github.com/login/device","expires_in":900}"#,
            r#"{"device_code":"native","user_code":"ABCD-EFGH","verification_uri":"https://github.com/login/device","expires_in":0}"#,
            r#"{"device_code":"native","user_code":"ABCD-EFGH","verification_uri":"https://github.com/login/device","expires_in":900,"interval":3601}"#,
        ] {
            assert!(
                parse_device_challenge(response, 1000).is_err(),
                "{response}"
            );
        }
        let large = format!(r#"{{"padding":"{}"}}"#, "x".repeat(MAX_JSON_BYTES));
        assert!(parse_device_challenge(&large, 1000).is_err());
    }

    #[test]
    fn oauth_token_reply_rejects_incomplete_or_untrusted_grants() {
        let valid = r#"{"access_token":"access","refresh_token":"refresh","token_type":"bearer","expires_in":28800,"refresh_token_expires_in":15897600}"#;
        for invalid in [
            valid.replace("\"token_type\":\"bearer\"", "\"token_type\":\"Bearer\""),
            valid.replace("\"refresh_token\":\"refresh\"", "\"refresh_token\":\"\""),
            valid.replace("\"access_token\":\"access\"", "\"access_token\":\"a b\""),
            valid.replace("\"expires_in\":28800", "\"expires_in\":604801"),
            valid.replace(
                "\"refresh_token_expires_in\":15897600",
                "\"refresh_token_expires_in\":34560001",
            ),
            valid.replace(
                "\"refresh_token_expires_in\":15897600",
                "\"refresh_token_expires_in\":0",
            ),
        ] {
            assert!(parse_token_reply(&invalid).is_err());
        }
        let PollReply::Granted(lease) = parse_token_reply(valid).unwrap() else {
            panic!("expected a token lease");
        };
        let debug = format!("{lease:?}");
        assert!(!debug.contains("access_token: \"access\""));
        assert!(!debug.contains("refresh_token: \"refresh\""));
        assert!(debug.contains("[REDACTED]"));
    }

    #[test]
    fn oauth_unrecognized_provider_descriptions_never_become_wire_errors() {
        for secret in ["token=private", "ghu_notreal", "Authorization: Bearer fake"] {
            let wire = format!(r#"{{"error":"unknown","error_description":"{secret}"}}"#);
            assert!(matches!(
                parse_token_reply(&wire),
                Ok(PollReply::State(DeviceResponse::UnknownFailure))
            ));
        }
        assert!(matches!(
            parse_token_reply(r#"{"error":"slow_down","access_token":"invalid"}"#),
            Ok(PollReply::State(DeviceResponse::SlowDown))
        ));
    }
}
