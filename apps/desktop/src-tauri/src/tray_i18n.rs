//! Fixed menu-label mapping. Action dispatch always uses stable internal IDs.
//! This is an exhaustive read-only presentation projection of an EN/RU setting.

pub(crate) fn label(language: &str, action: &str) -> &'static str {
    match (language, action) {
        ("ru", "open") => "Открыть",
        ("ru", "settings") => "Настройки",
        ("ru", "fetch") => "Фетч",
        ("ru", "sync") => "Синхронизация",
        ("ru", "about") => "О RepoTicker",
        ("ru", "quit") => "Выход",
        (_, "open") => "Open card",
        (_, "settings") => "Settings",
        (_, "fetch") => "Fetch",
        (_, "sync") => "Sync",
        (_, "about") => "About RepoTicker",
        (_, "quit") => "Quit",
        // Unreachable for the six hardcoded internal action IDs.
        _ => "RepoTicker",
    }
}

#[cfg(test)]
mod tests {
    use super::label;

    #[test]
    fn all_tray_actions_have_english_and_russian_labels() {
        for (id, english, russian) in [
            ("open", "Open card", "Открыть"),
            ("settings", "Settings", "Настройки"),
            ("fetch", "Fetch", "Фетч"),
            ("sync", "Sync", "Синхронизация"),
            ("about", "About RepoTicker", "О RepoTicker"),
            ("quit", "Quit", "Выход"),
        ] {
            assert_eq!(label("en", id), english);
            assert_eq!(label("ru", id), russian);
            assert_eq!(label("pt", id), english, "unknown locales fall back to EN");
            assert_eq!(label("", id), english);
        }
    }

    #[test]
    fn unknown_action_does_not_create_an_untrusted_menu_label() {
        assert_eq!(label("ru", "arbitrary"), "RepoTicker");
    }
}
