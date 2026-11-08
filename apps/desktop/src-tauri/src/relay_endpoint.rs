//! Canonical operator relay origin validation. No secrets and no network calls.
use std::net::IpAddr;

const MAX_URL_BYTES: usize = 512;

pub fn normalize_base_url(raw: &str) -> Result<String, String> {
    if raw.is_empty()
        || raw.len() > MAX_URL_BYTES
        || raw.trim() != raw
        || raw.contains('\\')
        || !raw.starts_with("https://")
    {
        return Err("Relay URL must be an HTTPS origin.".to_owned());
    }
    let parsed =
        reqwest::Url::parse(raw).map_err(|_| "Relay URL must be an HTTPS origin.".to_owned())?;
    let host = parsed
        .host_str()
        .ok_or_else(|| "Relay URL must have a public host.".to_owned())?;
    if parsed.scheme() != "https"
        || !parsed.username().is_empty()
        || parsed.password().is_some()
        || parsed.query().is_some()
        || parsed.fragment().is_some()
        || parsed.path() != "/"
        || parsed.port().is_some_and(|port| port != 443)
        || host.parse::<IpAddr>().is_ok()
        || !host.contains('.')
        || host == "localhost"
        || host.ends_with(".localhost")
        || host.ends_with(".local")
        || host.ends_with(".internal")
        || host.ends_with(".invalid")
        || host.ends_with(".test")
    {
        return Err(
            "Relay URL must be a public HTTPS origin without credentials or a path.".to_owned(),
        );
    }
    Ok(format!("https://{host}/"))
}

pub fn websocket_url(base: &str, cursor: u64) -> Result<String, String> {
    if cursor > 9_007_199_254_740_991 {
        return Err("Relay cursor is invalid.".to_owned());
    }
    let canonical = normalize_base_url(base)?;
    Ok(format!(
        "wss://{}/v1/stream?after={cursor}",
        canonical
            .trim_start_matches("https://")
            .trim_end_matches('/')
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_canonical_public_https_origins_are_stored() {
        assert_eq!(
            normalize_base_url("https://Relay.Example.COM").unwrap(),
            "https://relay.example.com/"
        );
        assert_eq!(
            normalize_base_url("https://relay.example.com:443/").unwrap(),
            "https://relay.example.com/"
        );
        for invalid in [
            "",
            "http://relay.example.com",
            "ws://relay.example.com",
            "https://user:pass@relay.example.com/",
            "https://relay.example.com/v1/github",
            "https://relay.example.com/?token=secret",
            "https://relay.example.com/#frag",
            "https://127.0.0.1",
            "https://[::1]/",
            "https://localhost",
            "https://relay.local",
            "https://relay.example.com:8443/",
            "https://relay.example.com\\@evil.example",
            "https://relay.example.com\n",
        ] {
            assert!(normalize_base_url(invalid).is_err(), "{invalid}");
        }
    }

    #[test]
    fn websocket_url_contains_only_cursor_and_validated_origin() {
        assert_eq!(
            websocket_url("https://relay.example.com/", 12).unwrap(),
            "wss://relay.example.com/v1/stream?after=12"
        );
        assert!(websocket_url("https://relay.example.com", u64::MAX).is_err());
    }
}
