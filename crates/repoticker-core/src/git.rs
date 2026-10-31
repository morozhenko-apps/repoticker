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

// GUI-owned console helpers must not allocate a visible console on Windows.
// This does not suppress Git stderr or exit status, which remain observable.
#[cfg(windows)]
fn configure_background_child(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn configure_background_child(_command: &mut Command) {}

#[cfg(windows)]
const GIT_DLL_INIT_FAILURE: &str =
    "Git for Windows failed to initialize (0xC0000142); verify 'git --version' in a terminal";

fn check_git_process_startup(output: &Output) -> Result<(), GitError> {
    #[cfg(windows)]
    if output.status.code() == Some(0xC000_0142_u32 as i32) {
        return Err(GitError(GIT_DLL_INIT_FAILURE.into()));
    }
    let _ = output;
    Ok(())
}

fn is_git_process_startup_failure(error: &GitError) -> bool {
    #[cfg(windows)]
    {
        error.0 == GIT_DLL_INIT_FAILURE
    }
    #[cfg(not(windows))]
    {
        let _ = error;
        false
    }
}

fn git_command(repo: &Path, args: &[&str]) -> Command {
    let mut command = Command::new("git");
    command
        .arg("-C")
        .arg(repo)
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0");
    configure_background_child(&mut command);
    command
}

#[derive(Default)]
struct FetchChildren {
    cancelled: bool,
    running: BTreeSet<u32>,
    // Only processes successfully targeted by this specific Cancel.
    // A batch-wide cancellation is not evidence that every Fetch failed.
    targeted: BTreeSet<u32>,
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

    /// Cancel all owned Fetch groups. A termination failure can be retried
    /// while its PID is still registered; previously signalled PIDs are never
    /// targeted again, and new registrations stay blocked after the first call.
    pub fn cancel(&self) -> Result<bool, GitError> {
        self.cancel_with(terminate_fetch_group)
    }

    fn cancel_with(
        &self,
        mut terminate: impl FnMut(u32) -> Result<(), GitError>,
    ) -> Result<bool, GitError> {
        let mut state = self
            .children
            .lock()
            .map_err(|_| GitError("Fetch cancellation state unavailable".into()))?;
        let already_cancelled = state.cancelled;
        state.cancelled = true;
        let pending: Vec<u32> = state.running.difference(&state.targeted).copied().collect();
        if already_cancelled && pending.is_empty() {
            return Ok(false);
        }
        let mut first_error = None;
        for pid in pending {
            match terminate(pid) {
                Ok(()) => {
                    state.targeted.insert(pid);
                }
                Err(error) => {
                    if first_error.is_none() {
                        first_error = Some(error);
                    }
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

    fn unregister(&self, pid: u32) -> Result<bool, GitError> {
        let mut state = self
            .children
            .lock()
            .map_err(|_| GitError("Fetch cancellation state unavailable".into()))?;
        state.running.remove(&pid);
        Ok(state.targeted.remove(&pid))
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
    let mut terminator = Command::new("taskkill.exe");
    configure_background_child(&mut terminator);
    let mut child = terminator
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

// Preserve a successfully completed Fetch and all concrete subprocess errors,
// including uncertain remote outcome/failed cleanup, if Cancel races with
// completion of this or another repository.
fn classify_fetch_completion(
    result: Result<Output, GitError>,
    targeted: bool,
) -> Result<Output, GitError> {
    match result {
        Ok(output) if targeted && fetch_was_interrupted(&output.status) => {
            Err(GitError(FETCH_CANCELLED.into()))
        }
        other => other,
    }
}

#[cfg(unix)]
fn fetch_was_interrupted(status: &std::process::ExitStatus) -> bool {
    use std::os::unix::process::ExitStatusExt;
    status.signal().is_some()
}

#[cfg(windows)]
fn fetch_was_interrupted(status: &std::process::ExitStatus) -> bool {
    // Windows taskkill termination usually appears as nonzero process exit.
    !status.success()
}

#[cfg(not(any(unix, windows)))]
fn fetch_was_interrupted(_status: &std::process::ExitStatus) -> bool {
    false
}

/// A cancelled/unregistered child must be both terminated and reaped.
/// An incomplete cleanup may leave a running helper or partially changed
/// remote-tracking refs; it must not be reported as harmless cancellation.
fn unregistered_fetch_cleanup_error(
    original: GitError,
    terminated: Result<(), GitError>,
    reaped: Result<Output, GitError>,
) -> GitError {
    if terminated.is_ok() && reaped.is_ok() {
        return original;
    }
    let mut details = Vec::new();
    if let Err(error) = terminated {
        details.push(format!("termination failed: {error}"));
    }
    if let Err(error) = reaped {
        details.push(format!("reap failed: {error}"));
    }
    GitError(format!(
        "{}; owned Fetch child cleanup incomplete ({}); outcome unknown",
        original.0,
        details.join("; ")
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
            let reaped = wait_owned_child(
                child,
                PROCESS_REAP_GRACE,
                "Cancelled Fetch child could not be reaped",
            );
            return Err(unregistered_fetch_cleanup_error(
                GitError(FETCH_CANCELLED.into()),
                terminated,
                reaped,
            ));
        }
        Err(error) => {
            let terminated = terminate_fetch_group(pid);
            let reaped = wait_owned_child(
                child,
                PROCESS_REAP_GRACE,
                "Failed Fetch registration cleanup timed out",
            );
            return Err(unregistered_fetch_cleanup_error(error, terminated, reaped));
        }
    }
    after_register();
    let result = wait_owned_child(
        child,
        timeout,
        "Git fetch timed out; remote-tracking refs may be partially updated",
    );
    let targeted = cancel.unregister(pid);
    match (result, targeted) {
        // Never hide a real Git timeout, failed process-tree cleanup or
        // unknown remote outcome behind the batch cancellation flag.
        (Err(error), _) => Err(error),
        (Ok(_), Err(error)) => Err(error),
        (Ok(output), Ok(was_targeted)) => classify_fetch_completion(Ok(output), was_targeted),
    }
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

/// Receive one captured pipe. Git may have already exited while a helper
/// still holds the inherited descriptor. The parent-child watchdog cannot
/// catch that case, so terminate the same owned process group on timeout.
fn receive_owned_pipe(
    receiver: mpsc::Receiver<io::Result<Vec<u8>>>,
    pid: u32,
    timeout_message: &str,
    name: &str,
) -> Result<Vec<u8>, GitError> {
    match receiver.recv_timeout(PROCESS_REAP_GRACE) {
        Ok(Ok(bytes)) => Ok(bytes),
        Ok(Err(err)) => Err(GitError(format!("Cannot read Git {name}: {err}"))),
        Err(mpsc::RecvTimeoutError::Disconnected) => Err(GitError(format!(
            "{timeout_message}; Git {name} drain disconnected; outcome unknown"
        ))),
        Err(mpsc::RecvTimeoutError::Timeout) => {
            let cleanup = terminate_fetch_group(pid);
            // Confirm closure of the inherited pipe when termination succeeds.
            // If a helper escaped its group, the second wait is still finite
            // and the result remains an explicit error, never success.
            let closed = cleanup.is_ok()
                && matches!(
                    receiver.recv_timeout(PROCESS_REAP_GRACE),
                    Ok(Ok(_)) | Ok(Err(_))
                );
            let detail = match cleanup {
                Ok(()) if closed => "owned helper group stopped".to_owned(),
                Ok(()) => "owned helper cleanup could not be confirmed".to_owned(),
                Err(err) => format!("owned helper termination failed: {err}"),
            };
            Err(GitError(format!(
                "{timeout_message}; Git {name} held open by a descendant; {detail}; outcome unknown"
            )))
        }
    }
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

    // Git has exited, but a helper can still hold an inherited pipe.
    // A post-exit timeout must also stop the owned group, not merely
    // return an error while leaving a long-lived helper behind.
    let stdout = receive_owned_pipe(stdout_rx, pid, timeout_message, "stdout")?;
    let stderr = receive_owned_pipe(stderr_rx, pid, timeout_message, "stderr")?;
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
    let mut command = git_command(repo, args);
    let output = match args.first().copied() {
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
    }?;
    check_git_process_startup(&output)?;
    Ok(output)
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
        // Broken .git metadata is isolated; a failing Windows Git loader
        // is a global tool failure, not evidence that each repo is invalid.
        match verified_checkout(&path) {
            Ok(true) => {
                repositories
                    .insert(fs::canonicalize(&path).map_err(|err| GitError(err.to_string()))?);
            }
            Err(error) if is_git_process_startup_failure(&error) => return Err(error),
            _ => {}
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
        &[
            "status",
            "--porcelain=v1",
            "--untracked-files=normal",
            "--ignore-submodules=none",
        ],
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
    let mut command = git_command(repo, &args);
    let output = run_cancellable_command(&mut command, cancel, || {}, || {})?;
    check_git_process_startup(&output)?;
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

/// Revalidate the currently checked-out branch as well as the pinned
/// source/target commits. An external client may switch branches between
/// earlier inspections; an immutable target OID alone would not prevent
/// merge from advancing that other branch.
fn pull_source_unchanged(
    repo: &Path,
    original: &RepoSnapshot,
    expected_head: &str,
    expected_upstream_tip: &str,
) -> Result<bool, GitError> {
    let current = inspect(repo)?;
    Ok(current.branch == original.branch
        && current.upstream == original.upstream
        && current.decision == original.decision
        && !current.dirty
        && commit_oid(repo, "HEAD^{commit}")? == expected_head
        && commit_oid(repo, "@{upstream}^{commit}")? == expected_upstream_tip)
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

            // Verify the selected checkout and both pinned ref tips even
            // when ahead/behind counts remain numerically identical.
            if !pull_source_unchanged(repo, &state, &expected_head, &expected_upstream_tip)? {
                return Err(GitError(
                    "Repository changed during sync; retry manually".into(),
                ));
            }

            before_merge();
            // Close the final controllable gap before Git's ff-only merge:
            // it would otherwise advance a different checked-out branch.
            if !pull_source_unchanged(repo, &state, &expected_head, &expected_upstream_tip)? {
                return Err(GitError(
                    "Repository changed during sync; retry manually".into(),
                ));
            }

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
    safe_push_with_checkpoint(repo, || {})
}

/// Test seam for an external Git client changing state during ls-remote.
/// Production does not inject any action at this checkpoint.
fn safe_push_with_checkpoint(
    repo: &Path,
    after_remote_probe: impl FnOnce(),
) -> Result<OperationOutcome, GitError> {
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

    // Another Git process may alter the active branch, upstream or push
    // routing during the network read. The injected callback is a no-op
    // in production and is used only for deterministic race tests.
    after_remote_probe();
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

#[cfg(all(test, windows))]
mod windows_git_process_tests {
    use super::{
        check_git_process_startup, configure_background_child, git_command,
        is_git_process_startup_failure, GIT_DLL_INIT_FAILURE,
    };
    use std::{
        os::windows::process::ExitStatusExt,
        process::{Command, ExitStatus, Output},
    };

    #[test]
    fn loader_failure_reports_ntstatus_without_leaking_command_or_repo_path() {
        let output = Output {
            status: ExitStatus::from_raw(0xC000_0142),
            stdout: Vec::new(),
            stderr: Vec::new(),
        };
        let error = check_git_process_startup(&output).expect_err("DLL initialization failed");
        assert_eq!(error.0, GIT_DLL_INIT_FAILURE);
        assert!(is_git_process_startup_failure(&error));
    }

    #[test]
    fn ordinary_failure_remains_a_regular_git_exit_status() {
        let output = Output {
            status: ExitStatus::from_raw(1),
            stdout: Vec::new(),
            stderr: Vec::new(),
        };
        assert!(check_git_process_startup(&output).is_ok());
    }

    #[test]
    fn headless_git_command_executes_without_losing_output() {
        let root = std::env::current_dir().expect("test checkout");
        let output = git_command(&root, &["--version"])
            .output()
            .expect("Git for Windows is available on the Windows CI runner");
        assert!(output.status.success(), "Git startup must succeed on CI");
        assert!(String::from_utf8_lossy(&output.stdout).starts_with("git version "));
    }

    #[test]
    fn headless_child_creation_preserves_exit_status() {
        let mut command = Command::new("cmd.exe");
        configure_background_child(&mut command);
        let output = command
            .args(["/C", "exit", "17"])
            .output()
            .expect("cmd child");
        assert_eq!(output.status.code(), Some(17));
    }
}

#[cfg(test)]
mod concurrent_git_tests {
    use super::{safe_pull_with_checkpoints, safe_push_with_checkpoint};
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
    fn moving_upstream_after_second_check_aborts_before_merge() {
        let checkout = Checkout::new();
        let result = safe_pull_with_checkpoints(
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
            },
        );
        assert!(result
            .expect_err("upstream moved during final checkpoint")
            .0
            .contains("changed during sync"));
        checkout.unchanged();
    }

    #[test]
    fn switching_active_branch_after_second_check_cannot_advance_wrong_branch() {
        let checkout = Checkout::new();
        git(&checkout.root, &["branch", "other-branch"]);
        let result = safe_pull_with_checkpoints(
            &checkout.root,
            || {},
            || {
                git(&checkout.root, &["switch", "other-branch"]);
            },
        );
        assert!(result
            .expect_err("external checkout switch must abort Safe pull")
            .0
            .contains("changed during sync"));
        assert_eq!(
            git(&checkout.root, &["branch", "--show-current"]),
            "other-branch"
        );
        assert_eq!(git(&checkout.root, &["rev-parse", "dev"]), checkout.base);
        assert_eq!(
            git(&checkout.root, &["rev-parse", "other-branch"]),
            checkout.base
        );
        checkout.unchanged();
    }

    #[test]
    fn external_commit_after_second_check_is_not_overwritten_or_merged() {
        let checkout = Checkout::new();
        let result = safe_pull_with_checkpoints(
            &checkout.root,
            || {},
            || {
                git(
                    &checkout.root,
                    &["commit", "--allow-empty", "-m", "external commit"],
                );
            },
        );
        assert!(result
            .expect_err("HEAD changed at last checkpoint")
            .0
            .contains("changed during sync"));
        assert_ne!(git(&checkout.root, &["rev-parse", "HEAD"]), checkout.base);
        assert!(!checkout.root.join("first.txt").exists());
        assert!(!checkout.root.join("alternate.txt").exists());
        assert!(git(&checkout.root, &["status", "--porcelain"]).is_empty());
    }

    #[test]
    fn remapping_selected_upstream_after_second_check_aborts() {
        let checkout = Checkout::new();
        let result = safe_pull_with_checkpoints(
            &checkout.root,
            || {},
            || {
                git(
                    &checkout.root,
                    &["branch", "--set-upstream-to", "other/dev", "dev"],
                );
            },
        );
        assert!(result
            .expect_err("upstream configuration changed at last checkpoint")
            .0
            .contains("changed during sync"));
        checkout.unchanged();
    }

    fn ahead_with_bare_remote() -> (Checkout, PathBuf, String) {
        let checkout = Checkout::new();
        // Keep the disposable bare repository within .git so it is
        // cleaned with the fixture and does not dirty the worktree.
        let remote = checkout.root.join(".git").join("remote.git");
        let remote_path = remote.to_str().expect("UTF-8 fixture").to_owned();
        git(&checkout.root, &["init", "--bare", &remote_path]);
        let refspec = format!("{}:refs/heads/dev", checkout.first_tip);
        git(&checkout.root, &["push", &remote_path, &refspec]);
        git(
            &checkout.root,
            &["remote", "set-url", "origin", &remote_path],
        );
        git(&checkout.root, &["merge", "--ff-only", &checkout.first_tip]);
        git(
            &checkout.root,
            &["commit", "--allow-empty", "-m", "local strictly ahead"],
        );
        let head = git(&checkout.root, &["rev-parse", "HEAD"]);
        (checkout, remote, head)
    }

    #[test]
    fn switching_branch_while_remote_tip_is_checked_blocks_safe_push() {
        let (checkout, remote, ahead_head) = ahead_with_bare_remote();
        let result = safe_push_with_checkpoint(&checkout.root, || {
            git(&checkout.root, &["switch", "-c", "external-branch"]);
        });
        assert!(result
            .expect_err("remote-probe race must fail closed")
            .0
            .contains("Repository changed during Safe sync"));
        assert_eq!(
            git(&checkout.root, &["branch", "--show-current"]),
            "external-branch"
        );
        assert_eq!(git(&checkout.root, &["rev-parse", "dev"]), ahead_head);
        assert_eq!(
            git(&remote, &["rev-parse", "refs/heads/dev"]),
            checkout.first_tip
        );
    }

    #[test]
    fn repointing_upstream_while_remote_tip_is_checked_blocks_safe_push() {
        let (checkout, remote, ahead_head) = ahead_with_bare_remote();
        let result = safe_push_with_checkpoint(&checkout.root, || {
            git(
                &checkout.root,
                &[
                    "update-ref",
                    "refs/remotes/origin/dev",
                    &checkout.alternate_tip,
                ],
            );
        });
        assert!(result
            .expect_err("upstream OID race must be rejected")
            .0
            .contains("Repository changed during Safe sync"));
        assert_eq!(git(&checkout.root, &["rev-parse", "HEAD"]), ahead_head);
        assert_eq!(
            git(&remote, &["rev-parse", "refs/heads/dev"]),
            checkout.first_tip
        );
    }

    #[test]
    fn changing_push_remote_during_remote_probe_blocks_safe_push() {
        let (checkout, remote, ahead_head) = ahead_with_bare_remote();
        let other = checkout.root.join(".git").join("other-remote.git");
        let other_path = other.to_str().expect("UTF-8 fixture");
        git(&checkout.root, &["init", "--bare", other_path]);
        let result = safe_push_with_checkpoint(&checkout.root, || {
            git(&checkout.root, &["remote", "set-url", "origin", other_path]);
        });
        assert!(result
            .expect_err("changed remote URL must refuse push")
            .0
            .contains("Repository changed during Safe sync"));
        assert_eq!(git(&checkout.root, &["rev-parse", "HEAD"]), ahead_head);
        assert_eq!(
            git(&remote, &["rev-parse", "refs/heads/dev"]),
            checkout.first_tip
        );
        let output = Command::new("git")
            .arg("-C")
            .arg(&other)
            .args(["show-ref", "--verify", "--quiet", "refs/heads/dev"])
            .status()
            .expect("git installed");
        assert!(!output.success(), "alternate remote must remain untouched");
    }
}

#[cfg(all(test, unix))]
mod fetch_cancellation_tests {
    use super::{
        classify_fetch_completion, run_cancellable_command, unregistered_fetch_cleanup_error,
        FetchCancellation, GitError, FETCH_CANCELLED,
    };
    use std::{
        process::Command,
        sync::{mpsc, Arc},
        thread,
        time::Duration,
    };

    #[test]
    fn failed_termination_can_be_retried_without_resignalling_other_children() {
        let token = FetchCancellation::default();
        assert!(token.register(41).unwrap());
        assert!(token.register(42).unwrap());
        let mut first = Vec::new();
        let error = token
            .cancel_with(|pid| {
                first.push(pid);
                if pid == 41 {
                    Err(GitError("fixture termination failed".into()))
                } else {
                    Ok(())
                }
            })
            .expect_err("one owned process group failed to terminate");
        assert_eq!(error.0, "fixture termination failed");
        assert_eq!(first, vec![41, 42]);
        assert!(token.is_cancelled());
        assert!(!token.register(43).unwrap(), "new children remain blocked");
        {
            let state = token.children.lock().unwrap();
            assert_eq!(state.targeted.iter().copied().collect::<Vec<_>>(), vec![42]);
        }
        let mut retry = Vec::new();
        assert!(token
            .cancel_with(|pid| {
                retry.push(pid);
                Ok(())
            })
            .expect("retry failed child only"));
        assert_eq!(retry, vec![41]);
        assert!(!token
            .cancel_with(|_| panic!("no already-targeted PID may be re-signalled"))
            .unwrap());
        assert!(token.unregister(41).unwrap());
        assert!(token.unregister(42).unwrap());
        let state = token.children.lock().unwrap();
        assert!(state.running.is_empty());
        assert!(state.targeted.is_empty());
    }

    #[test]
    fn failed_target_unregistered_before_retry_is_not_signalled_again() {
        let token = FetchCancellation::default();
        assert!(token.register(55).unwrap());
        assert!(token
            .cancel_with(|_| Err(GitError("fixture termination failed".into())))
            .is_err());
        assert!(!token.unregister(55).unwrap());
        assert!(!token
            .cancel_with(|_| panic!("stale PID must never be signalled"))
            .unwrap());
        assert!(token.is_cancelled());
    }

    #[test]
    fn spawn_registration_cleanup_never_hides_unknown_outcomes() {
        use std::os::unix::process::ExitStatusExt;
        use std::process::{ExitStatus, Output};

        let completed = || Output {
            status: ExitStatus::from_raw(0),
            stdout: Vec::new(),
            stderr: Vec::new(),
        };
        let original = || GitError(FETCH_CANCELLED.into());
        assert_eq!(
            unregistered_fetch_cleanup_error(original(), Ok(()), Ok(completed())).0,
            FETCH_CANCELLED
        );
        let failed_reap = unregistered_fetch_cleanup_error(
            original(),
            Ok(()),
            Err(GitError("owned child still running".into())),
        );
        assert!(failed_reap
            .0
            .contains("reap failed: owned child still running"));
        assert!(failed_reap.0.contains("outcome unknown"));
        assert_ne!(failed_reap.0, FETCH_CANCELLED);

        let failed_termination = unregistered_fetch_cleanup_error(
            original(),
            Err(GitError("cannot signal owned group".into())),
            Ok(completed()),
        );
        assert!(failed_termination
            .0
            .contains("termination failed: cannot signal owned group"));
        assert!(failed_termination.0.contains("outcome unknown"));

        let both = unregistered_fetch_cleanup_error(
            GitError("Fetch registration state unavailable".into()),
            Err(GitError("signal denied".into())),
            Err(GitError("reap deadline".into())),
        );
        assert!(both.0.contains("Fetch registration state unavailable"));
        assert!(both.0.contains("signal denied"));
        assert!(both.0.contains("reap deadline"));
    }

    #[test]
    fn completed_fetch_result_is_not_overwritten_by_late_or_sibling_cancel() {
        use std::os::unix::process::ExitStatusExt;
        use std::process::{ExitStatus, Output};

        let completed = || Output {
            status: ExitStatus::from_raw(0),
            stdout: Vec::new(),
            stderr: Vec::new(),
        };
        assert!(classify_fetch_completion(Ok(completed()), true).is_ok());
        assert!(classify_fetch_completion(Ok(completed()), false).is_ok());

        let signalled = Output {
            status: ExitStatus::from_raw(9),
            stdout: Vec::new(),
            stderr: Vec::new(),
        };
        let result = classify_fetch_completion(Ok(signalled), true)
            .expect_err("targeted terminated child must be cancelled");
        assert_eq!(result.0, FETCH_CANCELLED);

        let ordinary_failure = Output {
            status: ExitStatus::from_raw(7 << 8),
            stdout: Vec::new(),
            stderr: Vec::new(),
        };
        assert!(classify_fetch_completion(Ok(ordinary_failure), true).is_ok());

        let actual_error =
            GitError("Git fetch timed out; remote-tracking refs may be partially updated".into());
        let result = classify_fetch_completion(Err(actual_error), true)
            .expect_err("real timeout must not be masked");
        assert!(result.0.contains("remote-tracking refs"));
        assert_ne!(result.0, FETCH_CANCELLED);
    }

    #[test]
    fn cancelling_two_owned_fetch_children_yields_two_distinct_cancelled_results() {
        let cancellation = Arc::new(FetchCancellation::default());
        let (tx, rx) = mpsc::channel();
        let mut workers = Vec::new();
        for _ in 0..2 {
            let token = Arc::clone(&cancellation);
            let ready = tx.clone();
            workers.push(thread::spawn(move || {
                let mut command = Command::new("sh");
                command.args(["-c", "sleep 300 & wait"]);
                run_cancellable_command(
                    &mut command,
                    &token,
                    || {},
                    || {
                        ready.send(()).expect("registration signal");
                    },
                )
            }));
        }
        drop(tx);
        let mut registered = 0;
        for _ in 0..2 {
            if rx.recv_timeout(Duration::from_secs(5)).is_ok() {
                registered += 1;
            }
        }
        // Never strand the test workers if registration unexpectedly fails.
        let cancelled = cancellation.cancel();
        let results: Vec<_> = workers
            .into_iter()
            .map(|worker| worker.join().expect("Fetch worker joins"))
            .collect();
        assert_eq!(registered, 2, "both Fetch children must register");
        assert!(cancelled.expect("Cancel two registered children"));
        for outcome in results {
            assert_eq!(outcome.expect_err("interrupted child").0, FETCH_CANCELLED);
        }
        let state = cancellation.children.lock().unwrap();
        assert!(state.running.is_empty());
        assert!(state.targeted.is_empty());
        drop(state);
        assert!(!cancellation.cancel().expect("idempotent Cancel"));
    }

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
    fn completed_drain_errors_are_distinct_from_inherited_pipe_timeouts() {
        let (sender, receiver) = mpsc::channel();
        sender
            .send(Err(io::Error::other("fixture read failure")))
            .unwrap();
        let error = receive_owned_pipe(receiver, 0, "Git process timeout", "stdout")
            .expect_err("drain I/O failure");
        assert!(error
            .0
            .contains("Cannot read Git stdout: fixture read failure"));
        assert!(!error.0.contains("held open"));

        let (sender, receiver) = mpsc::channel::<io::Result<Vec<u8>>>();
        drop(sender);
        let error = receive_owned_pipe(receiver, 0, "Git process timeout", "stderr")
            .expect_err("drain disconnected");
        assert!(error.0.contains("Git stderr drain disconnected"));
        assert!(!error.0.contains("held open"));
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn helper_holding_pipe_after_parent_exit_is_stopped_without_killing_unrelated_process() {
        use std::fs;
        use std::time::{SystemTime, UNIX_EPOCH};

        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let pid_file = std::env::temp_dir().join(format!(
            "repoticker-inherited-stdout-{}-{nonce}.pid",
            std::process::id()
        ));
        let mut unrelated = Command::new("sleep").arg("30").spawn().unwrap();
        let mut command = Command::new("sh");
        // Pass the temporary pathname as argv, never interpolate it into
        // a shell command. The background child inherits both output pipes.
        command
            .arg("-c")
            .arg("sleep 300 & printf '%s\\n' \"$!\" > \"$1\"")
            .arg("sh")
            .arg(&pid_file);

        let result = run_bounded_command(
            &mut command,
            Duration::from_secs(10),
            "Git output capture could not complete",
        );
        let owned_pid = fs::read_to_string(&pid_file)
            .ok()
            .and_then(|text| text.trim().parse::<u32>().ok());
        // /proc reports Z for a killed-but-not-yet-reaped helper. This
        // distinguishes it from a still-running process on Linux.
        let state = owned_pid.and_then(|pid| {
            fs::read_to_string(format!("/proc/{pid}/stat"))
                .ok()
                .and_then(|text| {
                    text.rsplit_once(") ")
                        .and_then(|(_, tail)| tail.chars().next())
                })
        });
        let unrelated_alive = unrelated.try_wait().unwrap().is_none();
        // Ensure a failed assertion cannot leak the fixture's helper.
        if let (Some(pid), Some(running)) = (owned_pid, state) {
            if running != 'Z' && running != 'X' {
                let _ = Command::new("kill")
                    .arg("-KILL")
                    .arg(pid.to_string())
                    .status();
            }
        }
        let _ = unrelated.kill();
        let _ = unrelated.wait();
        let _ = fs::remove_file(&pid_file);

        let error = result.expect_err("inherited pipe must fail closed");
        assert!(
            error.0.contains("stdout held open by a descendant"),
            "{error}"
        );
        assert!(error.0.contains("owned helper group stopped"), "{error}");
        assert!(
            owned_pid.is_some(),
            "background helper PID must be recorded"
        );
        assert!(
            state.is_none() || matches!(state, Some('Z' | 'X')),
            "inherited-pipe helper must be terminated, actual state: {state:?}"
        );
        assert!(unrelated_alive, "unrelated process must not be killed");
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
