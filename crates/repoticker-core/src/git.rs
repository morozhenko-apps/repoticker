//! Local Git operations. An enrolled root is the only discovery boundary.
//! All execution uses argv (never a shell); errors are isolated per repository.

use crate::{classify_sync, RepositoryState, SyncDecision};
use std::{
    collections::BTreeSet,
    env, fmt, fs,
    path::{Path, PathBuf},
    process::{Command, Output},
};

#[derive(Debug, Clone)]
pub struct GitError(pub String);

impl fmt::Display for GitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for GitError {}

#[derive(Debug, Clone)]
pub struct RepoSnapshot {
    pub path: PathBuf,
    pub name: String,
    pub branch: Option<String>,
    pub upstream: Option<String>,
    pub dirty: bool,
    pub ahead: u64,
    pub behind: u64,
    pub decision: SyncDecision,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum OperationOutcome {
    Fetched,
    Updated(u64),
    AlreadyCurrent,
    Skipped(SyncDecision),
}

fn invoke(repo: &Path, args: &[&str]) -> Result<Output, GitError> {
    Command::new("git")
        .arg("-C")
        .arg(repo)
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0")
        .output()
        .map_err(|err| GitError(format!("Failed to launch git: {err}")))
}

fn stderr(output: &Output) -> String {
    let text = String::from_utf8_lossy(&output.stderr);
    let text = text.trim();
    text.chars().take(500).collect()
}

fn required(repo: &Path, args: &[&str]) -> Result<String, GitError> {
    let output = invoke(repo, args)?;
    if !output.status.success() {
        return Err(GitError(format!(
            "git {}: {}",
            args.join(" "),
            stderr(&output)
        )));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned())
}

fn optional(repo: &Path, args: &[&str]) -> Result<Option<String>, GitError> {
    let output = invoke(repo, args)?;
    if output.status.success() {
        Ok(Some(
            String::from_utf8_lossy(&output.stdout).trim().to_owned(),
        ))
    } else {
        Ok(None)
    }
}

fn looks_like_checkout(path: &Path, allow_worktree: bool) -> bool {
    let dotgit = path.join(".git");
    dotgit.is_dir() || (allow_worktree && dotgit.is_file())
}

fn verified_checkout(path: &Path) -> Result<bool, GitError> {
    let top = match optional(path, &["rev-parse", "--show-toplevel"])? {
        Some(value) if !value.is_empty() => PathBuf::from(value),
        _ => return Ok(false),
    };
    let canonical_top =
        fs::canonicalize(top).map_err(|err| GitError(format!("Cannot resolve git root: {err}")))?;
    let canonical_path = fs::canonicalize(path)
        .map_err(|err| GitError(format!("Cannot resolve repository: {err}")))?;
    Ok(canonical_top == canonical_path)
}

fn ignored_child(path: &Path) -> bool {
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("");
    name.starts_with('.')
        || name.ends_with(".worktrees")
        || matches!(
            name,
            "node_modules" | "target" | "build" | "dist" | "snapshots"
        )
}

/// Search an explicitly enrolled root and its immediate children only.
/// Linked worktrees and submodules (.git files) are excluded from automatic
/// child discovery; a healthy linked worktree can be enrolled explicitly.
pub fn discover(root: &Path) -> Result<Vec<PathBuf>, GitError> {
    let root = fs::canonicalize(root)
        .map_err(|err| GitError(format!("Invalid root {}: {err}", root.display())))?;
    if !root.is_dir() {
        return Err(GitError(format!(
            "Root is not a directory: {}",
            root.display()
        )));
    }
    if looks_like_checkout(&root, true) {
        return if verified_checkout(&root)? {
            Ok(vec![root])
        } else {
            Err(GitError("Explicit repository root is invalid".into()))
        };
    }

    let mut repositories = BTreeSet::new();
    let entries = fs::read_dir(&root)
        .map_err(|err| GitError(format!("Cannot enumerate {}: {err}", root.display())))?;
    for entry in entries {
        let entry = entry.map_err(|err| GitError(format!("Directory entry error: {err}")))?;
        let path = entry.path();
        // Do not follow directory symlinks or enter hidden/snapshot/worktree roots.
        if !entry
            .file_type()
            .map_err(|err| GitError(err.to_string()))?
            .is_dir()
            || ignored_child(&path)
            || !looks_like_checkout(&path, false)
        {
            continue;
        }
        // Broken .git metadata is skipped without aborting the complete scan.
        if matches!(verified_checkout(&path), Ok(true)) {
            repositories.insert(fs::canonicalize(&path).map_err(|err| GitError(err.to_string()))?);
        }
    }
    Ok(repositories.into_iter().collect())
}

pub fn discover_all(roots: &[PathBuf]) -> (Vec<PathBuf>, Vec<String>) {
    let mut repositories = BTreeSet::new();
    let mut errors = Vec::new();
    for root in roots {
        match discover(root) {
            Ok(paths) => repositories.extend(paths),
            Err(err) => errors.push(err.to_string()),
        }
    }
    (repositories.into_iter().collect(), errors)
}

pub fn normalize_root(path: &str) -> Result<PathBuf, GitError> {
    let input = path.trim();
    if input.is_empty() {
        return Err(GitError("Root path is empty".into()));
    }
    let expanded = if input == "~" || input.starts_with("~/") || input.starts_with("~\\") {
        let home = env::var_os("HOME")
            .or_else(|| env::var_os("USERPROFILE"))
            .ok_or_else(|| GitError("Cannot resolve home directory".into()))?;
        if input == "~" {
            PathBuf::from(home)
        } else {
            PathBuf::from(home).join(&input[2..])
        }
    } else {
        PathBuf::from(input)
    };
    if !expanded.is_absolute() {
        return Err(GitError("Enter an absolute path or ~/...".into()));
    }
    let normalized = fs::canonicalize(&expanded)
        .map_err(|err| GitError(format!("Cannot open {}: {err}", expanded.display())))?;
    if !normalized.is_dir() {
        return Err(GitError("Root must be a directory".into()));
    }
    Ok(normalized)
}

/// Returns authoritative local refs/status. Does NOT contact any remote.
pub fn inspect(repo: &Path) -> Result<RepoSnapshot, GitError> {
    if !verified_checkout(repo)? {
        return Err(GitError(format!(
            "Not a valid checkout: {}",
            repo.display()
        )));
    }
    let branch = optional(repo, &["symbolic-ref", "-q", "--short", "HEAD"])?;
    let dirty = !required(
        repo,
        &["status", "--porcelain=v1", "--untracked-files=normal"],
    )?
    .is_empty();
    let upstream = if branch.is_some() {
        optional(
            repo,
            &[
                "rev-parse",
                "--abbrev-ref",
                "--symbolic-full-name",
                "@{upstream}",
            ],
        )?
    } else {
        None
    };
    let (ahead, behind) = if upstream.is_some() {
        let raw = required(
            repo,
            &["rev-list", "--left-right", "--count", "HEAD...@{upstream}"],
        )?;
        let mut tokens = raw.split_whitespace();
        let ahead = tokens.next().and_then(|v| v.parse::<u64>().ok());
        let behind = tokens.next().and_then(|v| v.parse::<u64>().ok());
        match (ahead, behind, tokens.next()) {
            (Some(ahead), Some(behind), None) => (ahead, behind),
            _ => return Err(GitError("Unexpected git ahead/behind format".into())),
        }
    } else {
        (0, 0)
    };
    // An absent branch is not eligible even if the remote is configured.
    let decision = classify_sync(RepositoryState {
        has_upstream: branch.is_some() && upstream.is_some(),
        worktree_clean: !dirty,
        git_operation_in_progress: git_operation_in_progress(repo)?,
        ahead,
        behind,
    });
    let name = repo
        .file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_else(|| repo.display().to_string());
    Ok(RepoSnapshot {
        path: repo.to_path_buf(),
        name,
        branch,
        upstream,
        dirty,
        ahead,
        behind,
        decision,
    })
}

fn git_operation_in_progress(repo: &Path) -> Result<bool, GitError> {
    // rev-parse --git-path respects linked worktrees, unlike .git-relative checks.
    for marker in [
        "MERGE_HEAD",
        "CHERRY_PICK_HEAD",
        "REVERT_HEAD",
        "rebase-merge",
        "rebase-apply",
        "sequencer",
    ] {
        let marker_path = required(repo, &["rev-parse", "--git-path", marker])?;
        let marker_path = PathBuf::from(marker_path);
        let marker_path = if marker_path.is_absolute() {
            marker_path
        } else {
            repo.join(marker_path)
        };
        if marker_path.exists() {
            return Ok(true);
        }
    }
    Ok(false)
}

/// No worktree files are modified. Fetch all configured remotes.
pub fn fetch(repo: &Path) -> Result<OperationOutcome, GitError> {
    if !verified_checkout(repo)? {
        return Err(GitError("Repository is no longer valid".into()));
    }
    required(repo, &["fetch", "--all", "--prune", "--quiet"])?;
    Ok(OperationOutcome::Fetched)
}

/// Fetch then attempt the current branch fast-forward only.
/// A rejected check does not attempt a merge, rebase, stash or reset.
pub fn safe_pull(repo: &Path) -> Result<OperationOutcome, GitError> {
    fetch(repo)?;
    let state = inspect(repo)?;
    match state.decision {
        SyncDecision::FastForward { commits } => {
            let expected_head = required(repo, &["rev-parse", "HEAD"])?;
            // Defensive recheck to limit races with other local agents.
            let again = inspect(repo)?;
            if again.branch != state.branch
                || again.decision != state.decision
                || required(repo, &["rev-parse", "HEAD"])? != expected_head
            {
                return Err(GitError(
                    "Repository changed during sync; retry manually".into(),
                ));
            }
            required(repo, &["merge", "--ff-only", "--quiet", "@{upstream}"])?;
            Ok(OperationOutcome::Updated(commits))
        }
        SyncDecision::UpToDate => Ok(OperationOutcome::AlreadyCurrent),
        other => Ok(OperationOutcome::Skipped(other)),
    }
}
