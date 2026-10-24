//! Local Git operations. An enrolled root is the only discovery boundary.
//! All execution uses argv (never a shell); errors are isolated per repository.

use crate::{classify_sync, RepositoryState, SyncDecision};
use std::{
    collections::BTreeSet,
    env, fmt, fs,
    io::{self, Read},
    path::{Path, PathBuf},
    process::{Child, Command, Output, Stdio},
    sync::{mpsc, Mutex},
    thread,
    time::{Duration, Instant},
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
pub const PUSH_OUTCOME_UNKNOWN: &str =
    "Git push timed out: remote outcome unknown; inspect the remote before retrying";
const LOCAL_GIT_TIMEOUT: Duration = Duration::from_secs(20);
const REMOTE_PROBE_TIMEOUT: Duration = Duration::from_secs(45);
const FETCH_GIT_TIMEOUT: Duration = Duration::from_secs(120);
const PUSH_GIT_TIMEOUT: Duration = Duration::from_secs(120);
const PROCESS_REAP_GRACE: Duration = Duration::from_secs(3);
const POLL_INTERVAL: Duration = Duration::from_millis(15);

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
    // taskkill /T terminates descendants of the exact owned PID. The
    // supervisor itself also has a deadline: never hang indefinitely
    // while trying to stop a hung SSH process.
    let mut child = Command::new("taskkill.exe")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|err| GitError(format!("Cannot start Git process-tree termination: {err}")))?;
    let start = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) if status.success() => return Ok(()),
            Ok(Some(_)) => return Err(GitError("Cannot stop owned Git process tree".into())),
            Ok(None) => {}
            Err(err) => return Err(GitError(format!("Cannot await taskkill: {err}"))),
        }
        if start.elapsed() >= PROCESS_REAP_GRACE {
            let _ = child.kill();
            let _ = child.wait();
            return Err(GitError(
                "Owned Git process-tree termination exceeded deadline".into(),
            ));
        }
        thread::sleep(POLL_INTERVAL);
    }
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
    run_cancellable_command_with_timeout(
        command,
        cancel,
        after_spawn,
        after_register,
        FETCH_GIT_TIMEOUT,
    )
}

fn run_cancellable_command_with_timeout(
    command: &mut Command,
    cancel: &FetchCancellation,
    after_spawn: impl FnOnce(),
    after_register: impl FnOnce(),
    timeout: Duration,
) -> Result<Output, GitError> {
    if cancel.is_cancelled() {
        return Err(GitError(FETCH_CANCELLED.into()));
    }
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
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
            let terminated = terminate_fetch_group(pid);
            let _ = wait_owned_child(
                child,
                PROCESS_REAP_GRACE,
                "Cancelled Fetch child could not be reaped",
            );
            terminated?;
            return Err(GitError(FETCH_CANCELLED.into()));
        }
        Err(error) => {
            let _ = terminate_fetch_group(pid);
            let _ = wait_owned_child(
                child,
                PROCESS_REAP_GRACE,
                "Failed Fetch registration cleanup timed out",
            );
            return Err(error);
        }
    }
    after_register();
    let result = wait_owned_child(
        child,
        timeout,
        "Git fetch timed out; remote-tracking refs may be partially updated",
    );
    cancel.unregister(pid);
    if cancel.is_cancelled() {
        return Err(GitError(FETCH_CANCELLED.into()));
    }
    result
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
    Pushed(u64),
    AlreadyCurrent,
    Skipped(SyncDecision),
}

fn drain_git_pipe<R: Read + Send + 'static>(mut reader: R) -> mpsc::Receiver<io::Result<Vec<u8>>> {
    let (sender, receiver) = mpsc::sync_channel(1);
    thread::spawn(move || {
        let mut bytes = Vec::new();
        let result = reader.read_to_end(&mut bytes).map(|_| bytes);
        let _ = sender.send(result);
    });
    receiver
}

// The caller retains ownership of the Child handle. Both pipes are drained
// concurrently to avoid Git blocking when output exceeds the pipe capacity.
fn wait_owned_child(
    mut child: Child,
    timeout: Duration,
    timeout_message: &str,
) -> Result<Output, GitError> {
    let pid = child.id();
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| GitError("Git stdout pipe unavailable".into()))?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| GitError("Git stderr pipe unavailable".into()))?;
    let stdout_rx = drain_git_pipe(stdout);
    let stderr_rx = drain_git_pipe(stderr);
    let started = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => {}
            Err(err) => return Err(GitError(format!("Cannot wait for Git: {err}"))),
        }
        if started.elapsed() >= timeout {
            // Only this child was launched in its private Unix process
            // group or by its tracked exact Windows child PID.
            let termination = terminate_fetch_group(pid);
            let reap_start = Instant::now();
            let mut reaped = false;
            while reap_start.elapsed() < PROCESS_REAP_GRACE {
                match child.try_wait() {
                    Ok(Some(_)) => {
                        reaped = true;
                        break;
                    }
                    Ok(None) => thread::sleep(POLL_INTERVAL),
                    Err(err) => {
                        return Err(GitError(format!(
                            "{timeout_message}; cannot reap owned child: {err}"
                        )));
                    }
                }
            }
            if let Err(err) = termination {
                return Err(GitError(format!(
                    "{timeout_message}; process-tree termination failed: {err}"
                )));
            }
            if !reaped {
                return Err(GitError(format!(
                    "{timeout_message}; owned child did not exit after termination"
                )));
            }
            return Err(GitError(timeout_message.into()));
        }
        thread::sleep(POLL_INTERVAL);
    };

    // A helper can outlive Git while retaining a pipe. Bound collection
    // after Git exits; never block the GUI indefinitely.
    let stdout = stdout_rx
        .recv_timeout(PROCESS_REAP_GRACE)
        .map_err(|_| {
            GitError(format!(
                "{timeout_message}; Git stdout held open by a descendant; outcome unknown"
            ))
        })?
        .map_err(|err| GitError(format!("Cannot read Git stdout: {err}")))?;
    let stderr = stderr_rx
        .recv_timeout(PROCESS_REAP_GRACE)
        .map_err(|_| {
            GitError(format!(
                "{timeout_message}; Git stderr held open by a descendant; outcome unknown"
            ))
        })?
        .map_err(|err| GitError(format!("Cannot read Git stderr: {err}")))?;
    Ok(Output {
        status,
        stdout,
        stderr,
    })
}

fn run_bounded_command(
    command: &mut Command,
    timeout: Duration,
    timeout_message: &str,
) -> Result<Output, GitError> {
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        command.process_group(0);
    }
    let child = command
        .spawn()
        .map_err(|err| GitError(format!("Failed to launch git: {err}")))?;
    wait_owned_child(child, timeout, timeout_message)
}

fn invoke(repo: &Path, args: &[&str]) -> Result<Output, GitError> {
    let mut command = Command::new("git");
    command
        .arg("-C")
        .arg(repo)
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0");
    match args.first().copied() {
        // Local worktree/index mutations are never force-killed.
        Some("merge") => command
            .stdin(Stdio::null())
            .output()
            .map_err(|err| GitError(format!("Failed to launch git: {err}"))),
        Some("push") => run_bounded_command(&mut command, PUSH_GIT_TIMEOUT, PUSH_OUTCOME_UNKNOWN),
        Some("ls-remote") => run_bounded_command(
            &mut command,
            REMOTE_PROBE_TIMEOUT,
            "Git remote probe timed out; no push attempted",
        ),
        Some("fetch") => run_bounded_command(
            &mut command,
            FETCH_GIT_TIMEOUT,
            "Git fetch timed out; remote-tracking refs may be partially updated",
        ),
        _ => run_bounded_command(
            &mut command,
            LOCAL_GIT_TIMEOUT,
            "Local Git command timed out",
        ),
    }
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
/// Normalize a bounded, exact set of immediate-child folder names.
pub fn validate_ignored_child_names(names: Vec<String>) -> Result<Vec<String>, GitError> {
    if names.len() > 100 {
        return Err(GitError("Too many ignored folder names (max 100)".into()));
    }
    let mut normalized = BTreeSet::new();
    for name in names {
        let name = name.trim();
        if name.is_empty()
            || matches!(name, "." | "..")
            || name.len() > 255
            || name
                .chars()
                .any(|c| c == '/' || c == '\\' || c.is_control())
        {
            return Err(GitError(
                "Ignored folder names must be single directory names (max 255 bytes)".into(),
            ));
        }
        normalized.insert(name.to_owned());
    }
    Ok(normalized.into_iter().collect())
}

/// Discover an enrolled root and its direct children only.
/// Custom exclusions apply only to automatically discovered children.
pub fn discover_with_ignored(
    root: &Path,
    ignored_child_names: &[String],
) -> Result<Vec<PathBuf>, GitError> {
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
            || path
                .file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| ignored_child_names.iter().any(|ignored| name == ignored))
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

/// Compatibility entrypoint: no configurable names are ignored.
pub fn discover(root: &Path) -> Result<Vec<PathBuf>, GitError> {
    discover_with_ignored(root, &[])
}

pub fn discover_all_with_ignored(
    roots: &[PathBuf],
    ignored_child_names: &[String],
) -> (Vec<PathBuf>, Vec<String>) {
    let mut repositories = BTreeSet::new();
    let mut errors = Vec::new();
    for root in roots {
        match discover_with_ignored(root, ignored_child_names) {
            Ok(paths) => repositories.extend(paths),
            Err(err) => errors.push(err.to_string()),
        }
    }
    (repositories.into_iter().collect(), errors)
}

/// Compatibility entrypoint with no user-configured exclusions.
pub fn discover_all(roots: &[PathBuf]) -> (Vec<PathBuf>, Vec<String>) {
    discover_all_with_ignored(roots, &[])
}

/// Reject checkouts that are not currently discovered under enrolled roots.
pub fn resolve_enrolled_checkout_with_ignored(
    roots: &[PathBuf],
    requested: &str,
    ignored_child_names: &[String],
) -> Result<PathBuf, GitError> {
    let selected = normalize_root(requested)?;
    let (repositories, _) = discover_all_with_ignored(roots, ignored_child_names);
    if repositories.binary_search(&selected).is_ok() {
        Ok(selected)
    } else {
        Err(GitError(
            "Repository is not enrolled or no longer valid".into(),
        ))
    }
}

/// Compatibility resolver for callers without configured ignore names.
pub fn resolve_enrolled_checkout(roots: &[PathBuf], requested: &str) -> Result<PathBuf, GitError> {
    resolve_enrolled_checkout_with_ignored(roots, requested, &[])
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

/// Inspect independent enrolled checkouts with bounded concurrency.
/// Completion order may differ; return results in original discovery order.
pub fn inspect_all(repositories: Vec<PathBuf>) -> Vec<(PathBuf, Result<RepoSnapshot, GitError>)> {
    let tasks: Vec<_> = repositories.into_iter().enumerate().collect();
    let mut inspected = crate::bounded::bounded_map(
        tasks,
        4,
        |(index, path)| {
            let result = inspect(&path);
            (index, path, result)
        },
        |_, _, _| {},
        |_, _, _| {},
    );
    inspected.sort_by_key(|(index, _, _)| *index);
    inspected
        .into_iter()
        .map(|(_, path, result)| (path, result))
        .collect()
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
    // Git resolves the per-worktree admin directory even for linked
    // worktrees. These markers are local to that directory.
    let git_dir = PathBuf::from(required(repo, &["rev-parse", "--absolute-git-dir"])?);
    if !git_dir.is_absolute() {
        return Err(GitError("Unexpected relative Git admin directory".into()));
    }
    Ok([
        "MERGE_HEAD",
        "CHERRY_PICK_HEAD",
        "REVERT_HEAD",
        "rebase-merge",
        "rebase-apply",
        "sequencer",
    ]
    .iter()
    .any(|marker| git_dir.join(marker).exists()))
}

/// Translate supported GitHub origin remotes into a canonical browser URL.
/// Never pass arbitrary remote URLs, query strings, credentials or local paths
/// to the external browser.
pub fn github_remote_to_browser_url(remote: &str) -> Option<String> {
    let remote = remote.trim();
    let path = remote
        .strip_prefix("https://github.com/")
        .or_else(|| remote.strip_prefix("git@github.com:"))
        .or_else(|| remote.strip_prefix("ssh://git@github.com/"))?;
    let mut segments = path.split('/');
    let owner = segments.next()?;
    let raw_repo = segments.next()?;
    if segments.next().is_some() {
        return None;
    }
    let name = raw_repo.strip_suffix(".git").unwrap_or(raw_repo);
    let safe = |part: &str| {
        !part.is_empty()
            && part != "."
            && part != ".."
            && part
                .bytes()
                .all(|c| c.is_ascii_alphanumeric() || b"_.-".contains(&c))
    };
    if !safe(owner) || !safe(name) {
        return None;
    }
    Some(format!("https://github.com/{owner}/{name}"))
}

/// Resolve origin only for an enrolled, verified Git checkout on user action.
/// No network access or background Git scan is performed here.
pub fn github_origin_url(repo: &Path) -> Result<String, GitError> {
    if !verified_checkout(repo)? {
        return Err(GitError("Repository is no longer valid".into()));
    }
    let remote = required(repo, &["remote", "get-url", "origin"])?;
    github_remote_to_browser_url(&remote)
        .ok_or_else(|| GitError("Origin is not a supported GitHub repository".into()))
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

/// Fixed source and target for one explicitly requested outbound operation.
struct SafePushPin {
    branch: String,
    remote: String,
    branch_ref: String,
    url: String,
    head: String,
    upstream_tip: String,
}

fn safe_push_source_unchanged(
    repo: &Path,
    original: &RepoSnapshot,
    pin: &SafePushPin,
) -> Result<bool, GitError> {
    let current = inspect(repo)?;
    Ok(current.decision == SyncDecision::LocalAhead
        && current.branch == original.branch
        && current.upstream == original.upstream
        && commit_oid(repo, "HEAD^{commit}")? == pin.head
        && commit_oid(repo, "@{upstream}^{commit}")? == pin.upstream_tip
        && required(
            repo,
            &["config", "--get", &format!("branch.{}.remote", pin.branch)],
        )? == pin.remote
        && required(
            repo,
            &["config", "--get", &format!("branch.{}.merge", pin.branch)],
        )? == pin.branch_ref
        && required(repo, &["remote", "get-url", "--all", &pin.remote])? == pin.url
        && required(repo, &["remote", "get-url", "--push", "--all", &pin.remote])? == pin.url)
}

/// Never accept a different or ambiguous remote ref as evidence.
fn parse_single_remote_branch(raw: &str, branch_ref: &str) -> Result<String, GitError> {
    let mut lines = raw.lines();
    let Some(line) = lines.next() else {
        return Err(GitError("Remote upstream branch is missing".into()));
    };
    if lines.next().is_some() {
        return Err(GitError("Ambiguous remote upstream branch response".into()));
    }
    let Some((oid, found_ref)) = line.split_once('\t') else {
        return Err(GitError("Malformed remote upstream response".into()));
    };
    if found_ref != branch_ref
        || !matches!(oid.len(), 40 | 64)
        || !oid.bytes().all(|byte| byte.is_ascii_hexdigit())
    {
        return Err(GitError("Invalid remote upstream branch identity".into()));
    }
    Ok(oid.to_owned())
}

/// Push only a strictly-ahead, clean, fully checked branch to its
/// same-named configured upstream, without force, tags or default refspecs.
/// Both tips and remote routing are checked again before the network write.
pub fn safe_push(repo: &Path) -> Result<OperationOutcome, GitError> {
    let first = inspect(repo)?;
    if first.decision != SyncDecision::LocalAhead {
        return match first.decision {
            SyncDecision::UpToDate => Ok(OperationOutcome::AlreadyCurrent),
            other => Ok(OperationOutcome::Skipped(other)),
        };
    }
    let branch = first
        .branch
        .as_deref()
        .ok_or_else(|| GitError("No local branch".into()))?;
    // A Git branch is a ref component; allow slash hierarchy but never an
    // argument flag, missing/refspec separator or unsafe ref punctuation.
    if branch.starts_with('-')
        || branch.contains(':')
        || branch.contains('^')
        || branch.contains('~')
        || branch.contains('*')
        || branch.contains('?')
        || branch.contains('[')
        || branch.contains('\\')
        || branch.contains(' ')
        || branch.contains("..")
        || branch.contains("@{")
        || branch.ends_with(".lock")
    {
        return Err(GitError("Unsafe branch name for automatic push".into()));
    }
    let config_remote = required(
        repo,
        &["config", "--get", &format!("branch.{branch}.remote")],
    )?;
    if config_remote.is_empty()
        || config_remote == "."
        || !config_remote
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || b"_.-".contains(&c))
    {
        return Err(GitError("Ambiguous upstream remote for Safe sync".into()));
    }
    let merge_ref = required(
        repo,
        &["config", "--get", &format!("branch.{branch}.merge")],
    )?;
    let branch_ref = format!("refs/heads/{branch}");
    if merge_ref != branch_ref
        || first.upstream.as_deref() != Some(format!("{config_remote}/{branch}").as_str())
    {
        return Err(GitError(
            "Upstream is not the same-named remote branch".into(),
        ));
    }
    let fetch_urls = required(repo, &["remote", "get-url", "--all", &config_remote])?;
    let push_urls = required(
        repo,
        &["remote", "get-url", "--push", "--all", &config_remote],
    )?;
    if fetch_urls.is_empty() || fetch_urls.contains('\n') || fetch_urls != push_urls {
        return Err(GitError(
            "Safe sync requires one matching fetch/push remote URL".into(),
        ));
    }
    let pin = SafePushPin {
        branch: branch.to_owned(),
        remote: config_remote,
        branch_ref,
        url: fetch_urls,
        head: commit_oid(repo, "HEAD^{commit}")?,
        upstream_tip: commit_oid(repo, "@{upstream}^{commit}")?,
    };

    if !safe_push_source_unchanged(repo, &first, &pin)? {
        return Err(GitError("Repository changed during Safe sync".into()));
    }

    // Non-force push alone would recreate a deleted upstream branch.
    // Read the exact live ref without changing local remote-tracking refs.
    let live = required(
        repo,
        &[
            "ls-remote",
            "--exit-code",
            "--heads",
            &pin.remote,
            &pin.branch_ref,
        ],
    )?;
    let remote_tip = parse_single_remote_branch(&live, &pin.branch_ref)?;
    if remote_tip != pin.upstream_tip {
        return Err(GitError(
            "Remote upstream moved since Fetch; Safe sync did not push".into(),
        ));
    }

    // Recheck local Git refs and remote routing after the network request.
    if !safe_push_source_unchanged(repo, &first, &pin)? {
        return Err(GitError("Repository changed during Safe sync".into()));
    }
    // Git's ordinary non-force push rejects remote non-fast-forwards.
    // A commit OID avoids pushing a moving local branch expression.
    let refspec = format!("{}:{}", pin.head, pin.branch_ref);
    required(
        repo,
        &[
            "push",
            "--porcelain",
            "--no-follow-tags",
            &pin.remote,
            &refspec,
        ],
    )?;
    Ok(OperationOutcome::Pushed(first.ahead))
}

/// One user action chooses a safe direction from the current *fetched* refs.
/// It never combines a pull and a push for a divergent branch.
pub fn safe_sync(repo: &Path) -> Result<OperationOutcome, GitError> {
    match inspect(repo)?.decision {
        SyncDecision::FastForward { .. } => safe_pull(repo),
        SyncDecision::LocalAhead => safe_push(repo),
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

#[cfg(test)]
mod remote_branch_parser_tests {
    use super::parse_single_remote_branch;

    #[test]
    fn accepts_one_exact_ref_and_oid() {
        let oid = "a".repeat(40);
        let raw = format!("{oid}\trefs/heads/dev\n");
        assert_eq!(
            parse_single_remote_branch(&raw, "refs/heads/dev").unwrap(),
            oid
        );
        let sha256 = "c".repeat(64);
        assert_eq!(
            parse_single_remote_branch(
                &format!("{sha256}\trefs/heads/feature/subbranch\n"),
                "refs/heads/feature/subbranch",
            )
            .unwrap(),
            sha256
        );
    }

    #[test]
    fn refuses_absent_ambiguous_or_malformed_remote_branch() {
        let oid = "b".repeat(40);
        for raw in [
            String::new(),
            format!("{oid} refs/heads/dev"),
            format!("{oid}\trefs/heads/other"),
            format!("{oid}\trefs/heads/dev\n{oid}\trefs/heads/dev\n"),
            format!("{}\trefs/heads/dev", "g".repeat(40)),
            format!("{}\trefs/heads/dev", "c".repeat(39)),
        ] {
            assert!(
                parse_single_remote_branch(&raw, "refs/heads/dev").is_err(),
                "unexpectedly accepted {raw:?}"
            );
        }
    }
}

#[cfg(all(test, unix))]
mod owned_git_process_tests {
    use super::*;
    use std::time::{Duration, Instant};

    #[test]
    fn timeout_terminates_only_its_owned_child_group() {
        let mut unrelated = Command::new("sleep").arg("5").spawn().unwrap();
        let mut command = Command::new("sh");
        command.args(["-c", "sleep 300 & wait"]);
        let start = Instant::now();
        let error = run_bounded_command(
            &mut command,
            Duration::from_millis(150),
            "test Git subprocess timeout",
        )
        .expect_err("owned process must time out");
        assert!(error.0.contains("test Git subprocess timeout"), "{error}");
        assert!(
            start.elapsed() < Duration::from_secs(4),
            "timeout must be bounded"
        );
        assert!(
            unrelated.try_wait().unwrap().is_none(),
            "unrelated process must survive"
        );
        unrelated.kill().unwrap();
        unrelated.wait().unwrap();
    }

    #[test]
    fn large_captured_output_does_not_block_waiting_on_child_pipes() {
        let mut command = Command::new("sh");
        command.args(["-c", "head -c 200000 /dev/zero; printf marker >&2"]);
        let output = run_bounded_command(
            &mut command,
            Duration::from_secs(5),
            "large output unexpectedly timed out",
        )
        .expect("pipes must be drained concurrently");
        assert!(output.status.success());
        assert_eq!(output.stdout.len(), 200000);
        assert_eq!(output.stderr, b"marker");
    }

    #[test]
    fn fetch_deadline_does_not_claim_user_cancellation() {
        let cancellation = FetchCancellation::default();
        let mut command = Command::new("sh");
        command.args(["-c", "sleep 300 & wait"]);
        let error = run_cancellable_command_with_timeout(
            &mut command,
            &cancellation,
            || {},
            || {},
            Duration::from_millis(150),
        )
        .expect_err("hung Fetch must return");
        assert!(error.0.contains("Git fetch timed out"), "{error}");
        assert!(!cancellation.is_cancelled());
        assert_ne!(error.0, FETCH_CANCELLED);
    }

    #[test]
    fn outbound_timeout_reports_remote_outcome_unknown() {
        let mut command = Command::new("sh");
        command.args(["-c", "sleep 300 & wait"]);
        let error = run_bounded_command(
            &mut command,
            Duration::from_millis(150),
            PUSH_OUTCOME_UNKNOWN,
        )
        .expect_err("hung remote write must report uncertainty");
        assert!(error.0.contains("outcome unknown"));
        assert!(error.0.contains("before retrying"));
        assert_ne!(error.0, FETCH_CANCELLED);
    }

    #[test]
    fn bounded_execution_returns_valid_exit_status_and_stderr() {
        let mut command = Command::new("sh");
        command.args(["-c", "printf output; printf notice >&2; exit 7"]);
        let output = run_bounded_command(
            &mut command,
            Duration::from_secs(3),
            "unexpected local Git timeout",
        )
        .unwrap();
        assert_eq!(output.status.code(), Some(7));
        assert_eq!(output.stdout, b"output");
        assert_eq!(output.stderr, b"notice");
    }
}
