//! RepoTicker domain rules and Git provider.

pub mod bounded;
pub mod config_store;
pub mod git;
pub mod github_auth;

/// Remote comparison is meaningful only after a successful fetch.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RepositoryState {
    pub has_upstream: bool,
    pub worktree_clean: bool,
    pub git_operation_in_progress: bool,
    pub ahead: u64,
    pub behind: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncDecision {
    NoUpstream,
    LocalChanges,
    GitOperationInProgress,
    Diverged,
    UpToDate,
    LocalAhead,
    FastForward { commits: u64 },
}

/// Fail closed; the Git adapter must execute the native --ff-only operation.
pub fn classify_sync(state: RepositoryState) -> SyncDecision {
    if !state.has_upstream {
        return SyncDecision::NoUpstream;
    }
    if state.git_operation_in_progress {
        return SyncDecision::GitOperationInProgress;
    }
    if !state.worktree_clean {
        return SyncDecision::LocalChanges;
    }
    if state.ahead > 0 && state.behind > 0 {
        return SyncDecision::Diverged;
    }
    if state.ahead > 0 {
        return SyncDecision::LocalAhead;
    }
    if state.behind > 0 {
        return SyncDecision::FastForward {
            commits: state.behind,
        };
    }
    SyncDecision::UpToDate
}

#[cfg(test)]
mod tests {
    use super::{classify_sync, RepositoryState, SyncDecision};

    fn clean(ahead: u64, behind: u64) -> RepositoryState {
        RepositoryState {
            has_upstream: true,
            worktree_clean: true,
            git_operation_in_progress: false,
            ahead,
            behind,
        }
    }

    #[test]
    fn clean_behind_branch_allows_fast_forward() {
        assert_eq!(
            classify_sync(clean(0, 3)),
            SyncDecision::FastForward { commits: 3 }
        );
    }

    #[test]
    fn up_to_date_branch_does_not_pull() {
        assert_eq!(classify_sync(clean(0, 0)), SyncDecision::UpToDate);
    }

    #[test]
    fn local_commits_do_not_get_rebased_or_merged() {
        assert_eq!(classify_sync(clean(2, 0)), SyncDecision::LocalAhead);
        assert_eq!(classify_sync(clean(2, 1)), SyncDecision::Diverged);
    }

    #[test]
    fn modified_or_untracked_files_block_automatic_pull() {
        let mut state = clean(0, 4);
        state.worktree_clean = false;
        assert_eq!(classify_sync(state), SyncDecision::LocalChanges);
    }

    #[test]
    fn unfinished_operation_blocks_automatic_pull() {
        let mut state = clean(0, 4);
        state.git_operation_in_progress = true;
        assert_eq!(classify_sync(state), SyncDecision::GitOperationInProgress);
    }

    #[test]
    fn missing_upstream_blocks_automatic_pull() {
        let mut state = clean(0, 4);
        state.has_upstream = false;
        assert_eq!(classify_sync(state), SyncDecision::NoUpstream);
    }
}
