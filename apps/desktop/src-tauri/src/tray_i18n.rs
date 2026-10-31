//! Native titles and tray labels share the UI's versioned 20-locale catalog.
//! Only stable internal action IDs are used for dispatch.

use std::{collections::BTreeMap, sync::OnceLock};

type Catalog = BTreeMap<String, BTreeMap<String, String>>;

fn catalog() -> &'static Catalog {
    static CATALOG: OnceLock<Catalog> = OnceLock::new();
    CATALOG.get_or_init(|| {
        serde_json::from_str(include_str!("../../ui/locales/native.json"))
            .expect("Bundled native translation catalog must be valid")
    })
}

pub(crate) fn is_supported_locale(language: &str) -> bool {
    catalog().contains_key(language)
}

fn text(language: &str, english: &'static str) -> &'static str {
    catalog()
        .get(language)
        .or_else(|| catalog().get("en"))
        .and_then(|terms| terms.get(english))
        .map(String::as_str)
        .unwrap_or(english)
}

pub(crate) fn label(language: &str, action: &str) -> &'static str {
    let key = match action {
        "open" => "Open card",
        "settings" => "Settings",
        "fetch" => "Fetch",
        "sync" => "Sync",
        "about" => "About RepoTicker",
        "quit" => "Quit",
        _ => return "RepoTicker",
    };
    text(language, key)
}

pub(crate) fn window_title(language: &str, window: &str) -> &'static str {
    match window {
        "settings" => text(language, "RepoTicker Settings"),
        "about" => text(language, "About RepoTicker"),
        _ => "RepoTicker",
    }
}

#[cfg(test)]
mod tests {
    use super::{is_supported_locale, label, window_title};

    #[test]
    fn native_registry_contains_exactly_twenty_locales() {
        assert_eq!(super::catalog().len(), 20);
        for code in [
            "en", "ru", "es", "pt", "de", "fr", "it", "pl", "hi", "zh-Hant", "ja", "nl", "sv",
            "tr", "ko", "bn", "th", "id", "fil", "ar",
        ] {
            assert!(is_supported_locale(code), "Missing {code}");
        }
        for invalid in ["pt-BR", "zh", "tl", "", "EN"] {
            assert!(!is_supported_locale(invalid));
        }
    }

    #[test]
    fn every_native_action_and_title_has_a_bundled_string() {
        for lang in super::catalog().keys() {
            for key in ["open", "settings", "fetch", "sync", "about", "quit"] {
                assert!(!label(lang, key).is_empty());
            }
            for kind in ["settings", "about"] {
                assert!(!window_title(lang, kind).is_empty());
            }
        }
        assert_eq!(label("pt", "settings"), "Definições");
        assert_eq!(label("ru", "quit"), "Выход");
        assert_eq!(window_title("de", "settings"), "RepoTicker-Einstellungen");
        assert_eq!(label("unknown", "quit"), "Quit");
    }

    #[test]
    fn unknown_tray_action_is_not_a_command() {
        assert_eq!(label("ru", "arbitrary"), "RepoTicker");
    }
}
