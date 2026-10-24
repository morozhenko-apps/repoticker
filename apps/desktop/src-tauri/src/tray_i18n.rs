//! Fixed menu-label mapping. Action dispatch always uses stable internal IDs.
//! This is an exhaustive read-only presentation projection of an EN/RU setting.

pub(crate) fn label(language: &str, action: &str) -> &'static str {
    match (language, action) {
        ("ru", "open") => "Открыть карточку",
        ("ru", "settings") => "Настройки",
        ("ru", "fetch") => "Fetch всех репозиториев",
        ("ru", "sync") => "Безопасная синхронизация всех",
        ("ru", "about") => "О RepoTicker",
        ("ru", "quit") => "Выход из RepoTicker",
        (_, "open") => "Open card",
        (_, "settings") => "Settings",
        (_, "fetch") => "Fetch all",
        (_, "sync") => "Safe sync all",
        (_, "about") => "About RepoTicker",
        (_, "quit") => "Quit RepoTicker",
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
            ("open", "Open card", "Открыть карточку"),
            ("settings", "Settings", "Настройки"),
            ("fetch", "Fetch all", "Fetch всех репозиториев"),
            ("sync", "Safe sync all", "Безопасная синхронизация всех"),
            ("about", "About RepoTicker", "О RepoTicker"),
            ("quit", "Quit RepoTicker", "Выход из RepoTicker"),
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
