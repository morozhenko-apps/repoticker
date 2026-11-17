//! Strict Hybrid relay framing and REST-reconciliation decisions.
//! Hints never carry trustworthy CI results or authorize local Git mutations.
use serde_json::Value;
use std::collections::BTreeSet;

const MAX_FRAME_BYTES: usize = 2_048;
const MAX_CURSOR: u64 = 9_007_199_254_740_991;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RelayFrame {
    Hint { cursor: u64, repository: String },
    Reset { cursor: u64 },
    Ready { cursor: u64 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RelayDecision {
    Ignore,
    RefreshTasks,
    ReconcileAll,
}

fn valid_component(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 100
        && value != "."
        && value != ".."
        && value
            .bytes()
            .all(|ch| ch.is_ascii_alphanumeric() || b"_.-".contains(&ch))
}

fn canonical_repo(value: &str) -> Option<String> {
    let mut parts = value.split('/');
    let owner = parts.next()?;
    let repo = parts.next()?;
    if parts.next().is_some() || !valid_component(owner) || !valid_component(repo) {
        return None;
    }
    Some(format!(
        "{}/{}",
        owner.to_ascii_lowercase(),
        repo.to_ascii_lowercase()
    ))
}

pub fn parse_frame(raw: &[u8]) -> Result<RelayFrame, &'static str> {
    if raw.is_empty() || raw.len() > MAX_FRAME_BYTES {
        return Err("Invalid relay frame length");
    }
    let data: Value = serde_json::from_slice(raw).map_err(|_| "Invalid relay frame")?;
    let object = data.as_object().ok_or("Invalid relay frame")?;
    if object.get("v").and_then(Value::as_u64) != Some(1) {
        return Err("Unsupported relay version");
    }
    let kind = object
        .get("type")
        .and_then(Value::as_str)
        .ok_or("Missing relay frame type")?;
    let cursor = object
        .get("cursor")
        .and_then(Value::as_u64)
        .filter(|cursor| *cursor <= MAX_CURSOR)
        .ok_or("Invalid relay cursor")?;
    match kind {
        "hint" if object.len() == 4 => {
            let repository = object
                .get("repository")
                .and_then(Value::as_str)
                .and_then(canonical_repo)
                .ok_or("Invalid relay repository")?;
            Ok(RelayFrame::Hint { cursor, repository })
        }
        "reset" if object.len() == 3 => Ok(RelayFrame::Reset { cursor }),
        "ready" if object.len() == 3 => Ok(RelayFrame::Ready { cursor }),
        _ => Err("Unknown relay frame"),
    }
}

/// A per-account, process-local session. No credentials or raw event JSON in state.
pub struct RelayCursor {
    account: String,
    selected: BTreeSet<String>,
    last: u64,
    ready: bool,
}

impl RelayCursor {
    pub fn new(account: &str, selected: &[String]) -> Result<Self, &'static str> {
        if !valid_component(account) || selected.len() > 100 {
            return Err("Invalid relay monitor scope");
        }
        let account = account.to_ascii_lowercase();
        let mut repositories = BTreeSet::new();
        for source in selected {
            let repo = canonical_repo(source).ok_or("Invalid relay monitor repository")?;
            if !repo.starts_with(&format!("{account}/")) || !repositories.insert(repo) {
                return Err("Invalid relay monitor repository");
            }
        }
        Ok(Self {
            account,
            selected: repositories,
            last: 0,
            ready: false,
        })
    }

    pub fn cursor(&self) -> u64 {
        self.last
    }

    pub fn observe(&mut self, frame: RelayFrame) -> RelayDecision {
        match frame {
            RelayFrame::Hint { cursor, repository } => {
                if cursor <= self.last {
                    return RelayDecision::Ignore;
                }
                let gap = cursor > self.last.saturating_add(1);
                self.last = cursor;
                if gap {
                    return RelayDecision::ReconcileAll;
                }
                if repository.starts_with(&format!("{}/", self.account))
                    && (self.selected.is_empty() || self.selected.contains(&repository))
                {
                    RelayDecision::RefreshTasks
                } else {
                    RelayDecision::Ignore
                }
            }
            RelayFrame::Reset { cursor } => {
                self.last = cursor;
                self.ready = false;
                RelayDecision::ReconcileAll
            }
            RelayFrame::Ready { cursor } => {
                let changed = !self.ready || cursor != self.last;
                self.last = cursor;
                self.ready = true;
                if changed {
                    RelayDecision::ReconcileAll
                } else {
                    RelayDecision::Ignore
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_malformed_untrusted_or_oversized_frames() {
        for source in [
            "",
            "{}",
            r#"{"v":2,"type":"ready","cursor":1}"#,
            r#"{"v":1,"type":"ready","cursor":-1}"#,
            r#"{"v":1,"type":"ready","cursor":9007199254740992}"#,
            r#"{"v":1,"type":"ready","cursor":1,"token":"secret"}"#,
            r#"{"v":1,"type":"hint","cursor":1,"repository":"other/../repo"}"#,
            r#"{"v":1,"type":"hint","cursor":1,"repository":"team/repo","conclusion":"success"}"#,
            r#"{"v":1,"type":"batch","cursor":1}"#,
        ] {
            assert!(parse_frame(source.as_bytes()).is_err(), "{source}");
        }
        assert!(parse_frame(&vec![b'x'; 2049]).is_err());
    }

    #[test]
    fn parses_only_minimal_verified_relay_frames() {
        assert_eq!(
            parse_frame(br#"{"v":1,"type":"hint","cursor":5,"repository":"TEAM/Repo"}"#),
            Ok(RelayFrame::Hint {
                cursor: 5,
                repository: "team/repo".to_owned()
            })
        );
        assert_eq!(
            parse_frame(br#"{"v":1,"type":"reset","cursor":9}"#),
            Ok(RelayFrame::Reset { cursor: 9 })
        );
        assert_eq!(
            parse_frame(br#"{"v":1,"type":"ready","cursor":9}"#),
            Ok(RelayFrame::Ready { cursor: 9 })
        );
    }

    #[test]
    fn rejects_wrong_owner_duplicate_selection_and_path_traversal() {
        for entries in [
            vec!["other/repo".to_owned()],
            vec!["team/repo".to_owned(), "TEAM/Repo".to_owned()],
            vec!["team/../repo".to_owned()],
        ] {
            assert!(RelayCursor::new("team", &entries).is_err());
        }
        assert!(RelayCursor::new("team/foo", &[]).is_err());
    }

    #[test]
    fn deduplicates_replayed_hints_and_reconciles_on_gaps_or_reset() {
        let mut session = RelayCursor::new("Team", &["TEAM/Repo".to_owned()]).unwrap();
        let hint = |cursor, repository: &str| RelayFrame::Hint {
            cursor,
            repository: repository.to_owned(),
        };
        assert_eq!(
            session.observe(hint(1, "team/repo")),
            RelayDecision::RefreshTasks
        );
        assert_eq!(session.observe(hint(1, "team/repo")), RelayDecision::Ignore);
        assert_eq!(
            session.observe(hint(2, "team/other")),
            RelayDecision::Ignore
        );
        assert_eq!(
            session.observe(hint(5, "team/repo")),
            RelayDecision::ReconcileAll
        );
        assert_eq!(
            session.observe(RelayFrame::Reset { cursor: 12 }),
            RelayDecision::ReconcileAll
        );
        assert_eq!(session.cursor(), 12);
        assert_eq!(
            session.observe(RelayFrame::Ready { cursor: 12 }),
            RelayDecision::ReconcileAll
        );
        assert_eq!(
            session.observe(RelayFrame::Ready { cursor: 12 }),
            RelayDecision::Ignore
        );
    }

    #[test]
    fn all_repositories_monitor_accepts_same_account_only() {
        let mut cursor = RelayCursor::new("team", &[]).unwrap();
        assert_eq!(
            cursor.observe(RelayFrame::Hint {
                cursor: 1,
                repository: "other/repo".to_owned()
            }),
            RelayDecision::Ignore
        );
        assert_eq!(
            cursor.observe(RelayFrame::Hint {
                cursor: 2,
                repository: "team/other".to_owned()
            }),
            RelayDecision::RefreshTasks
        );
    }
}
