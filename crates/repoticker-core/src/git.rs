//! Local Git operations. An enrolled root is the only discovery boundary.
//! All execution uses argv (never a shell); errors are isolated per repository.

use crate::{classify_sync, RepositoryState, SyncDecision};
use std::{
    collections::BTreeSet,
    env, fmt, fs,
    path::{Path, PathBuf},
    process::{Command, Output, Stdio},
    sync::Mutex,
};

#[derive(Debug, Clone)]
pub struct GitError(pub String);

impl fmt::Display for GitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for GitError {}

pub const FETCH_CANCELLED: &str = "Git fetch cancelled";

#[derive(Default)]
struct FetchChildren {
    cancelled: bool,
    running: BTreeSet<u32>,
}

/// One explicit Fetch operation owns this cancellation authority.
/// It never targets other processes or a running Safe pull.
#[derive(Default)]
pub struct FetchCancellation {
    children: Mutex<FetchChildren>,
}

impl FetchCancellation {
    pub fn is_cancelled(&self) -> bool {
        self.children
            .lock()
            .map(|state| state.cancelled)
            .unwrap_or(true)
    }

    /// Request cancellation once and terminate only registered child groups.
    /// The mutex also orders cancellation against concurrent child registration.
    pub fn cancel(&self) -> Result<bool, GitError> {
        let mut state = self
            .children
            .lock()
            .map_err(|_| GitError("Fetch cancellation state unavailable".into()))?;
        if state.cancelled {
            return Ok(false);
        }
        state.cancelled = true;
        let mut first_error = None;
        for &pid in &state.running {
            if let Err(error) = terminate_fetch_group(pid) {
                if first_error.is_none() {
                    first_error = Some(error);
                }
            }
        }
        if let Some(error) = first_error {
            return Err(error);
        }
        Ok(true)
    }

    fn register(&self, pid: u32) -> Result<bool, GitError> {
        let mut state = self
            .children
            .lock()
            .map_err(|_| GitError("Fetch cancellation state unavailable".into()))?;
        if state.cancelled {
            return Ok(false);
        }
        state.running.insert(pid);
        Ok(true)
    }

    fn unregister(&self, pid: u32) {
        if let Ok(mut state) = self.children.lock() {
            state.running.remove(&pid);
        }
    }
}

#[cfg(unix)]
fn terminate_fetch_group(pid: u32) -> Result<(), GitError> {
    let group = i32::try_from(pid).map_err(|_| GitError("Invalid Git process ID".into()))?;
    // SAFETY: the process was started in its own group with this exact PID.
    // Negative PID targets the owned group, never RepoTicker's process group.
    unsafe extern "C" {
        fn kill(pid: i32, signal: i32) -> i32;
    }
    const SIGKILL: i32 = 9;
    if unsafe { kill(-group, SIGKILL) } != 0 {
        let error = std::io::Error::last_os_error();
        if error.kind() != std::io::ErrorKind::NotFound {
            return Err(GitError(format!("Cannot cancel Git fetch: {error}")));
        }
    }
    Ok(())
}

#[cfg(windows)]
fn terminate_fetch_group(pid: u32) -> Result<(), GitError> {
    // Windows taskkill /T targets descendants of the exact child PID.
    // No shell, user-controlled command or process-name-wide termination.
    let result = Command::new("taskkill.exe")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .output()
        .map_err(|err| GitError(format!("Cannot start Git fetch cancellation: {err}")))?;
    if !result.status.success() {
        return Err(GitError("Cannot stop Git fetch process tree".into()));
    }
    Ok(())
}

#[cfg(not(any(unix, windows)))]
fn terminate_fetch_group(_pid: u32) -> Result<(), GitError> {
    Err(GitError(
        "Fetch cancellation is unsupported on this platform".into(),
    ))
}

fn run_cancellable_command(
    command: &mut Command,
    cancel: &FetchCancellation,
    after_spawn: impl FnOnce(),
    after_register: impl FnOnce(),
) -> Result<Output, GitError> {
    if cancel.is_cancelled() {
        return Err(GitError(FETCH_CANCELLED.into()));
    }
    command.stdout(Stdio::piped()).stderr(Stdio::piped());
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        command.process_group(0);
    }
    let child = command
        .spawn()
        .map_err(|err| GitError(format!("Failed to launch git: {err}")))?;
    let pid = child.id();
    after_spawn();
    match cancel.register(pid) {
        Ok(true) => {}
        Ok(false) => {
            terminate_fetch_group(pid)?;
            let _ = child.wait_with_output();
            return Err(GitError(FETCH_CANCELLED.into()));
        }
        Err(error) => {
            let _ = terminate_fetch_group(pid);
            let _ = child.wait_with_output();
            return Err(error);
        }
    }
    after_register();
    let result = child.wait_with_output();
    cancel.unregister(pid);
    if cancel.is_cancelled() {
        return Err(GitError(FETCH_CANCELLED.into()));
    }
    result.map_err(|err| GitError(format!("Failed to wait for git: {err}")))
}

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

/// Fetch with explicit cooperative cancellation and owned child-process
/// termination. No forced Git worktree mutation is performed on cancellation.
/// The Git remote-tracking refs may have been partially updated.
pub fn fetch_with_cancel(
    repo: &Path,
    cancel: &FetchCancellation,
) -> Result<OperationOutcome, GitError> {
    if cancel.is_cancelled() {
        return Err(GitError(FETCH_CANCELLED.into()));
    }
    if !verified_checkout(repo)? {
        return Err(GitError("Repository is no longer valid".into()));
    }
    if cancel.is_cancelled() {
        return Err(GitError(FETCH_CANCELLED.into()));
    }
    let args = ["fetch", "--all", "--prune", "--quiet"];
    let mut command = Command::new("git");
    command
        .arg("-C")
        .arg(repo)
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0");
    let output = run_cancellable_command(&mut command, cancel, || {}, || {})?;
    if !output.status.success() {
        return Err(GitError(format!(
            "git {}: {}",
            args.join(" "),
            stderr(&output)
        )));
    }
    Ok(OperationOutcome::Fetched)
}

/// Resolve an immutable commit argument instead of passing a moving
/// upstream expression to the final Git mutation.
fn commit_oid(repo: &Path, revision: &str) -> Result<String, GitError> {
    let oid = required(repo, &["rev-parse", "--verify", revision])?;
    if !matches!(oid.len(), 40 | 64) || !oid.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(GitError("Invalid Git commit object ID".into()));
    }
    Ok(oid)
}

/// A private seam for deterministic inter-process change tests. Checkpoints
/// do not modify Git state in production; they are invoked as no-op closures.
fn safe_pull_with_checkpoints(
    repo: &Path,
    after_first_check: impl FnOnce(),
    before_merge: impl FnOnce(),
) -> Result<OperationOutcome, GitError> {
    let state = inspect(repo)?;
    match state.decision {
        SyncDecision::FastForward { commits } => {
            let expected_head = commit_oid(repo, "HEAD^{commit}")?;
            let expected_upstream_tip = commit_oid(repo, "@{upstream}^{commit}")?;
            after_first_check();

            // Detect changes to either side of the proposed fast-forward,
            // even when ahead/behind counts remain numerically identical.
            let again = inspect(repo)?;
            if again.branch != state.branch
                || again.upstream != state.upstream
                || again.decision != state.decision
                || commit_oid(repo, "HEAD^{commit}")? != expected_head
                || commit_oid(repo, "@{upstream}^{commit}")? != expected_upstream_tip
            {
                return Err(GitError(
                    "Repository changed during sync; retry manually".into(),
                ));
            }

            before_merge();
            // Git resolves only this already-validated commit, not whatever
            // @{upstream} may point to after our final inspection.
            required(
                repo,
                &["merge", "--ff-only", "--quiet", &expected_upstream_tip],
            )?;
            Ok(OperationOutcome::Updated(commits))
        }
        SyncDecision::UpToDate => Ok(OperationOutcome::AlreadyCurrent),
        other => Ok(OperationOutcome::Skipped(other)),
    }
}

/// Fast-forward using local fetched upstream refs; no implicit network access.
/// Fetch first to refresh remote refs. Recheck eligibility and both ref tips
/// before branch mutation; never merge, rebase, stash or reset automatically.
pub fn safe_pull(repo: &Path) -> Result<OperationOutcome, GitError> {
    safe_pull_with_checkpoints(repo, || {}, || {})
}

#[cfg(test)]
mod concurrent_git_tests {
    use super::{safe_pull_with_checkpoints, OperationOutcome};
    use std::{
        fs,
        path::{Path, PathBuf},
        process::Command,
        time::{SystemTime, UNIX_EPOCH},
    };

    struct Checkout {
        root: PathBuf,
        base: String,
        first_tip: String,
        alternate_tip: String,
    }

    impl Drop for Checkout {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.root);
        }
    }

    fn git(root: &Path, args: &[&str]) -> String {
        let output = Command::new("git")
            .arg("-C")
            .arg(root)
            .args(args)
            .env("GIT_TERMINAL_PROMPT", "0")
            .output()
            .expect("git must be installed");
        assert!(
            output.status.success(),
            "git {:?} failed: {}",
            args,
            String::from_utf8_lossy(&output.stderr)
        );
        String::from_utf8_lossy(&output.stdout).trim().into()
    }

    impl Checkout {
        fn new() -> Self {
            let nanos = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos();
            let root = std::env::temp_dir().join(format!(
                "repoticker-upstream-race-{}-{}-{:?}",
                std::process::id(),
                nanos,
                std::thread::current().id()
            ));
            fs::create_dir_all(&root).expect("fixture directory");
            git(&root, &["init", "-b", "dev"]);
            git(&root, &["config", "user.name", "RepoTicker tests"]);
            git(
                &root,
                &["config", "user.email", "repoticker@example.invalid"],
            );
            fs::write(root.join("base.txt"), "base\n").expect("base file");
            git(&root, &["add", "base.txt"]);
            git(&root, &["commit", "-m", "base"]);
            let base = git(&root, &["rev-parse", "HEAD"]);

            fs::write(root.join("first.txt"), "first\n").expect("first branch");
            git(&root, &["add", "first.txt"]);
            git(&root, &["commit", "-m", "first"]);
            let first_tip = git(&root, &["rev-parse", "HEAD"]);
            git(&root, &["reset", "--hard", &base]);

            fs::write(root.join("alternate.txt"), "alternate\n").expect("alternate branch");
            git(&root, &["add", "alternate.txt"]);
            git(&root, &["commit", "-m", "alternate"]);
            let alternate_tip = git(&root, &["rev-parse", "HEAD"]);
            git(&root, &["reset", "--hard", &base]);

            git(&root, &["remote", "add", "origin", "."]);
            git(&root, &["remote", "add", "other", "."]);
            git(
                &root,
                &["update-ref", "refs/remotes/origin/dev", &first_tip],
            );
            git(
                &root,
                &["update-ref", "refs/remotes/other/dev", &alternate_tip],
            );
            git(&root, &["branch", "--set-upstream-to", "origin/dev", "dev"]);

            Self {
                root,
                base,
                first_tip,
                alternate_tip,
            }
        }

        fn unchanged(&self) {
            assert_eq!(git(&self.root, &["rev-parse", "HEAD"]), self.base);
            assert!(!self.root.join("first.txt").exists());
            assert!(!self.root.join("alternate.txt").exists());
            assert!(git(&self.root, &["status", "--porcelain"]).is_empty());
        }
    }

    #[test]
    fn moving_upstream_to_equally_distant_commit_aborts_without_changes() {
        let checkout = Checkout::new();
        let result = safe_pull_with_checkpoints(
            &checkout.root,
            || {
                git(
                    &checkout.root,
                    &[
                        "update-ref",
                        "refs/remotes/origin/dev",
                        &checkout.alternate_tip,
                    ],
                );
            },
            || panic!("must not reach merge after changed upstream tip"),
        );
        assert!(result
            .expect_err("changed OID must fail")
            .0
            .contains("changed during sync"));
        checkout.unchanged();
    }

    #[test]
    fn repointing_upstream_to_equally_distant_ref_aborts_without_changes() {
        let checkout = Checkout::new();
        let result = safe_pull_with_checkpoints(
            &checkout.root,
            || {
                git(
                    &checkout.root,
                    &["branch", "--set-upstream-to", "other/dev", "dev"],
                );
            },
            || panic!("must not merge a different upstream"),
        );
        assert!(result
            .expect_err("changed upstream name must fail")
            .0
            .contains("changed during sync"));
        checkout.unchanged();
    }

    #[test]
    fn moving_upstream_after_final_check_cannot_redirect_pinned_merge() {
        let checkout = Checkout::new();
        assert_eq!(
            safe_pull_with_checkpoints(
                &checkout.root,
                || {},
                || {
                    git(
                        &checkout.root,
                        &[
                            "update-ref",
                            "refs/remotes/origin/dev",
                            &checkout.alternate_tip,
                        ],
                    );
                }
            )
            .expect("pinned fast-forward"),
            OperationOutcome::Updated(1)
        );
        assert_eq!(
            git(&checkout.root, &["rev-parse", "HEAD"]),
            checkout.first_tip
        );
        assert!(checkout.root.join("first.txt").is_file());
        assert!(!checkout.root.join("alternate.txt").exists());
    }
}

#[cfg(all(test, unix))]
mod fetch_cancellation_tests {
    use super::{run_cancellable_command, FetchCancellation, FETCH_CANCELLED};
    use std::{
        process::Command,
        sync::{mpsc, Arc},
        thread,
        time::Duration,
    };

    #[test]
    fn cancelled_before_launch_does_not_start_a_child() {
        let cancellation = FetchCancellation::default();
        assert!(cancellation.cancel().expect("cancel"));
        assert!(!cancellation.cancel().expect("idempotent cancel"));
        let mut command = Command::new("sleep");
        command.arg("300");
        let error = run_cancellable_command(
            &mut command,
            &cancellation,
            || panic!("cancelled child must not spawn"),
            || panic!("cancelled child must not register"),
        )
        .expect_err("cancelled");
        assert_eq!(error.0, FETCH_CANCELLED);
    }

    #[test]
    fn cancelling_after_registration_terminates_the_process_group() {
        let cancellation = Arc::new(FetchCancellation::default());
        let (tx, rx) = mpsc::channel();
        let running = Arc::clone(&cancellation);
        let waiter = thread::spawn(move || {
            // Test-only shell deliberately spawns a descendant to verify
            // owned process-group termination; production invokes Git by argv.
            let mut command = Command::new("sh");
            command.args(["-c", "sleep 300 & wait"]);
            run_cancellable_command(
                &mut command,
                &running,
                || {},
                || {
                    tx.send(()).expect("started message");
                },
            )
        });
        rx.recv_timeout(Duration::from_secs(5))
            .expect("child registered without a sleep");
        assert!(cancellation.cancel().expect("cancel active process"));
        let error = waiter
            .join()
            .expect("thread completed")
            .expect_err("cancelled");
        assert_eq!(error.0, FETCH_CANCELLED);
    }

    #[test]
    fn cancel_between_spawn_and_registration_prevents_a_leaked_child() {
        let cancellation = FetchCancellation::default();
        let mut command = Command::new("sh");
        command.args(["-c", "sleep 300 & wait"]);
        let error = run_cancellable_command(
            &mut command,
            &cancellation,
            || {
                cancellation.cancel().expect("cancel before registration");
            },
            || panic!("cancelled process must never register"),
        )
        .expect_err("cancelled");
        assert_eq!(error.0, FETCH_CANCELLED);
    }
}
