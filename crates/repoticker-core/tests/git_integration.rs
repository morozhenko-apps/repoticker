use repoticker_core::{git, SyncDecision};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

struct Fixture {
    base: PathBuf,
    seed: PathBuf,
    local: PathBuf,
}

impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.base);
    }
}

fn run(at: &Path, args: &[&str]) -> String {
    let output = Command::new("git")
        .arg("-C")
        .arg(at)
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0")
        .output()
        .expect("git should be installed");
    assert!(
        output.status.success(),
        "git {:?} failed: {}",
        args,
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8_lossy(&output.stdout).trim().into()
}

impl Fixture {
    fn new() -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        let base = std::env::temp_dir().join(format!(
            "repoticker-git-{}-{}-{:?}",
            std::process::id(),
            timestamp,
            std::thread::current().id()
        ));
        fs::create_dir_all(&base).expect("fixture root");
        let seed = base.join("seed");
        let local = base.join("local");
        let remote = base.join("remote.git");
        fs::create_dir_all(&seed).expect("seed");
        run(
            &base,
            &[
                "init",
                "--bare",
                remote.to_str().expect("UTF-8 fixture path"),
            ],
        );
        run(&seed, &["init", "-b", "dev"]);
        run(&seed, &["config", "user.name", "RepoTicker tests"]);
        run(
            &seed,
            &["config", "user.email", "repoticker@example.invalid"],
        );
        fs::write(seed.join("tracked.txt"), "base\n").expect("initial fixture");
        run(&seed, &["add", "tracked.txt"]);
        run(&seed, &["commit", "-m", "base"]);
        run(
            &seed,
            &[
                "remote",
                "add",
                "origin",
                remote.to_str().expect("remote path"),
            ],
        );
        run(&seed, &["push", "--set-upstream", "origin", "dev"]);
        run(
            &base,
            &[
                "clone",
                "--branch",
                "dev",
                remote.to_str().expect("remote path"),
                local.to_str().expect("local path"),
            ],
        );
        run(&local, &["config", "user.name", "RepoTicker tests"]);
        run(
            &local,
            &["config", "user.email", "repoticker@example.invalid"],
        );
        Self { base, seed, local }
    }

    fn push_more(&self) {
        fs::write(self.seed.join("tracked.txt"), "remote updated\n").expect("update fixture");
        run(&self.seed, &["add", "tracked.txt"]);
        run(&self.seed, &["commit", "-m", "remote update"]);
        run(&self.seed, &["push", "origin", "dev"]);
    }
}

#[test]
fn discovery_is_shallow_ignores_snapshots_and_invalid_worktrees() {
    let f = Fixture::new();
    let hidden = f.base.join(".local").join("snapshots").join("copy");
    fs::create_dir_all(&hidden).expect("snapshot");
    let broken = f.base.join("broken");
    fs::create_dir_all(&broken).expect("broken");
    fs::write(broken.join(".git"), "gitdir: /nonexistent/worktree").expect("worktree");
    let found = git::discover(&f.base).expect("discover");
    assert_eq!(found, vec![f.local.clone(), f.seed.clone()]);
}

#[test]
fn fetch_only_changes_remote_refs_and_safe_pull_fast_forwards() {
    let f = Fixture::new();
    f.push_more();
    let before = run(&f.local, &["rev-parse", "HEAD"]);
    assert_eq!(
        git::fetch(&f.local).expect("fetch"),
        git::OperationOutcome::Fetched
    );
    assert_eq!(run(&f.local, &["rev-parse", "HEAD"]), before);
    let state = git::inspect(&f.local).expect("status");
    assert_eq!((state.ahead, state.behind), (0, 1));
    assert_eq!(state.decision, SyncDecision::FastForward { commits: 1 });
    assert_eq!(
        git::safe_pull(&f.local).expect("safe pull"),
        git::OperationOutcome::Updated(1)
    );
    assert_eq!(
        run(&f.local, &["rev-parse", "HEAD"]),
        run(&f.seed, &["rev-parse", "HEAD"])
    );
}

#[test]
fn untracked_and_dirty_files_skip_without_stashing() {
    let f = Fixture::new();
    f.push_more();
    git::fetch(&f.local).expect("refresh remote refs");
    fs::write(f.local.join("untracked.txt"), "local content").expect("untracked");
    let before = run(&f.local, &["rev-parse", "HEAD"]);
    assert_eq!(
        git::safe_pull(&f.local).expect("decision"),
        git::OperationOutcome::Skipped(SyncDecision::LocalChanges)
    );
    assert_eq!(run(&f.local, &["rev-parse", "HEAD"]), before);
    assert_eq!(
        fs::read_to_string(f.local.join("untracked.txt")).expect("retained"),
        "local content"
    );
}

#[test]
fn divergent_commits_skip_without_merge() {
    let f = Fixture::new();
    fs::write(f.local.join("local.txt"), "local commit").expect("local");
    run(&f.local, &["add", "local.txt"]);
    run(&f.local, &["commit", "-m", "local commit"]);
    f.push_more();
    git::fetch(&f.local).expect("refresh remote refs");
    let before = run(&f.local, &["rev-parse", "HEAD"]);
    assert_eq!(
        git::safe_pull(&f.local).expect("decision"),
        git::OperationOutcome::Skipped(SyncDecision::Diverged)
    );
    assert_eq!(run(&f.local, &["rev-parse", "HEAD"]), before);
}

#[test]
fn branch_with_no_upstream_skips() {
    let f = Fixture::new();
    run(&f.local, &["branch", "--unset-upstream"]);
    assert_eq!(
        git::safe_pull(&f.local).expect("decision"),
        git::OperationOutcome::Skipped(SyncDecision::NoUpstream)
    );
}

#[test]
fn explicitly_enrolled_root_can_be_the_repository_itself() {
    let f = Fixture::new();
    assert_eq!(
        git::discover(&f.local).expect("explicit repo"),
        vec![f.local.clone()]
    );
}

#[test]
fn missing_root_and_relative_path_rejected() {
    assert!(git::discover(Path::new("/nonexistent/repoticker-root-test")).is_err());
    assert!(git::normalize_root("relative/path").is_err());
}

#[test]
fn safe_pull_uses_fetched_refs_without_implicit_network() {
    let f = Fixture::new();
    f.push_more();
    let old_remote_ref = run(&f.local, &["rev-parse", "refs/remotes/origin/dev"]);
    assert_eq!(
        git::safe_pull(&f.local).expect("no network pull"),
        git::OperationOutcome::AlreadyCurrent
    );
    assert_eq!(
        run(&f.local, &["rev-parse", "refs/remotes/origin/dev"]),
        old_remote_ref
    );
    git::fetch(&f.local).expect("explicit fetch");
    assert_eq!(
        git::safe_pull(&f.local).expect("fast forward"),
        git::OperationOutcome::Updated(1)
    );
}

#[test]
fn enrolled_checkout_resolution_accepts_only_canonical_discovered_repositories() {
    let f = Fixture::new();
    assert_eq!(
        git::resolve_enrolled_checkout(
            std::slice::from_ref(&f.base),
            f.local.to_str().expect("UTF-8 path"),
        )
        .expect("enrolled direct child"),
        f.local
    );
    // An unrelated checkout is not authorized just because it is valid.
    assert!(git::resolve_enrolled_checkout(
        std::slice::from_ref(&f.local),
        f.seed.to_str().expect("UTF-8 path")
    )
    .is_err());
    assert!(
        git::resolve_enrolled_checkout(std::slice::from_ref(&f.base), "relative/path").is_err()
    );
    assert!(git::resolve_enrolled_checkout(
        std::slice::from_ref(&f.base),
        f.base.join("not-found").to_str().expect("UTF-8 path")
    )
    .is_err());
}

#[test]
fn linked_worktree_requires_explicit_root_enrollment() {
    let f = Fixture::new();
    let worktree = f.base.join("linked-checkout");
    run(
        &f.local,
        &[
            "worktree",
            "add",
            "-b",
            "feature/linked",
            worktree.to_str().expect("UTF-8 worktree path"),
        ],
    );
    assert!(worktree.join(".git").is_file());
    let path = worktree.to_str().expect("UTF-8 worktree path");
    assert!(git::resolve_enrolled_checkout(std::slice::from_ref(&f.base), path).is_err());
    assert_eq!(
        git::resolve_enrolled_checkout(std::slice::from_ref(&worktree), path)
            .expect("explicitly enrolled linked worktree"),
        worktree
    );
}

#[test]
fn bounded_inspect_preserves_input_order_and_per_repository_errors() {
    let f = Fixture::new();
    let missing = f.base.join("removed-checkout");
    fs::write(f.local.join("untracked.txt"), "untracked").expect("dirty checkout");
    let paths = vec![f.seed.clone(), missing.clone(), f.local.clone()];
    let observed = git::inspect_all(paths.clone());
    assert_eq!(
        observed
            .iter()
            .map(|(path, _)| path.clone())
            .collect::<Vec<_>>(),
        paths
    );
    let first = observed[0].1.as_ref().expect("first checkout status");
    assert!(!first.dirty);
    assert_eq!(first.path, f.seed);
    assert!(
        observed[1].1.is_err(),
        "missing checkout should be isolated"
    );
    let final_repo = observed[2].1.as_ref().expect("last checkout status");
    assert!(final_repo.dirty);
    assert_eq!(final_repo.path, f.local);
    assert_eq!(git::inspect_all(Vec::new()).len(), 0);
}

#[test]
fn operation_markers_still_block_safe_pull_after_single_admin_dir_resolution() {
    let f = Fixture::new();
    f.push_more();
    git::fetch(&f.local).expect("fetch updated ref");
    assert_eq!(
        git::inspect(&f.local).expect("before marker").decision,
        SyncDecision::FastForward { commits: 1 }
    );
    let rebase_dir = f.local.join(".git").join("rebase-merge");
    fs::create_dir(&rebase_dir).expect("fake in-progress marker");
    assert_eq!(
        git::inspect(&f.local).expect("in-progress state").decision,
        SyncDecision::GitOperationInProgress
    );
    assert_eq!(
        git::safe_pull(&f.local).expect("safe pull must fail closed"),
        git::OperationOutcome::Skipped(SyncDecision::GitOperationInProgress)
    );
    fs::remove_dir(rebase_dir).expect("clear marker");
    assert_eq!(
        git::inspect(&f.local).expect("after marker").decision,
        SyncDecision::FastForward { commits: 1 }
    );
}

#[test]
fn all_git_operation_markers_resolve_under_absolute_git_dir_in_linked_worktree() {
    let f = Fixture::new();
    let linked = f.base.join("linked-marker-worktree");
    run(
        &f.local,
        &[
            "worktree",
            "add",
            "-b",
            "feature/markers",
            linked.to_str().expect("UTF-8 checkout path"),
        ],
    );
    for repo in [&f.local, &linked] {
        let absolute_git_dir = PathBuf::from(run(repo, &["rev-parse", "--absolute-git-dir"]));
        assert!(absolute_git_dir.is_absolute());
        assert!(absolute_git_dir.exists());
        for marker in [
            "MERGE_HEAD",
            "CHERRY_PICK_HEAD",
            "REVERT_HEAD",
            "rebase-merge",
            "rebase-apply",
            "sequencer",
        ] {
            let expected = PathBuf::from(run(repo, &["rev-parse", "--git-path", marker]));
            let expected = if expected.is_absolute() {
                expected
            } else {
                repo.join(expected)
            };
            assert_eq!(absolute_git_dir.join(marker), expected);
        }
        let marker_dir = absolute_git_dir.join("rebase-merge");
        fs::create_dir(&marker_dir).expect("marker directory");
        assert!(git::inspect(repo).is_ok());
        fs::remove_dir(marker_dir).expect("remove marker");
    }
}

#[test]
fn custom_ignored_child_folders_affect_only_implicit_shallow_discovery() {
    let f = Fixture::new();
    let ignored = vec!["local".to_owned()];
    assert_eq!(
        git::discover_with_ignored(&f.base, &ignored).expect("filtered discovery"),
        vec![f.seed.clone()]
    );
    // Explicitly enrolled child checkouts retain their original authority.
    assert_eq!(
        git::discover_with_ignored(&f.local, &ignored).expect("explicit root"),
        vec![f.local.clone()]
    );
    let (discovered, failures) =
        git::discover_all_with_ignored(&[f.base.clone(), f.local.clone()], &ignored);
    assert!(failures.is_empty());
    assert_eq!(discovered, vec![f.local.clone(), f.seed.clone()]);
    let path = f.local.to_str().expect("UTF-8 test checkout");
    assert!(
        git::resolve_enrolled_checkout_with_ignored(std::slice::from_ref(&f.base), path, &ignored)
            .is_err(),
        "ignored implicit checkout cannot bypass filtering through navigation IPC"
    );
    assert_eq!(
        git::resolve_enrolled_checkout_with_ignored(std::slice::from_ref(&f.local), path, &ignored)
            .expect("explicit root still valid"),
        f.local
    );
    // Old APIs and older persisted config without ignores remain unchanged.
    assert_eq!(
        git::discover(&f.base).expect("legacy discovery"),
        vec![f.local.clone(), f.seed.clone()]
    );
}

#[test]
fn ignore_names_are_exact_validated_bounded_and_unicode_capable() {
    assert_eq!(
        git::validate_ignored_child_names(vec![
            " Réservé ".into(),
            "Archive".into(),
            "Archive".into()
        ])
        .unwrap(),
        vec!["Archive".to_owned(), "Réservé".to_owned()]
    );
    for invalid in [
        "",
        " ",
        ".",
        "..",
        "a/b",
        "a\\b",
        "line\nbreak",
        "nul\0here",
    ] {
        assert!(
            git::validate_ignored_child_names(vec![invalid.into()]).is_err(),
            "invalid child name: {invalid:?}"
        );
    }
    assert!(git::validate_ignored_child_names(vec!["é".repeat(128)]).is_err());
    assert!(
        git::validate_ignored_child_names((0..101).map(|i| format!("repo{i}")).collect()).is_err()
    );
    assert_eq!(
        git::validate_ignored_child_names(vec![]).unwrap(),
        Vec::<String>::new()
    );
}

#[test]
fn built_in_exclusions_remain_enforced_without_custom_configuration() {
    let f = Fixture::new();
    let generated = f.base.join("target");
    run(
        &f.base,
        &[
            "clone",
            f.local.to_str().expect("fixture source"),
            generated.to_str().expect("fixture destination"),
        ],
    );
    assert!(!git::discover(&f.base).unwrap().contains(&generated));
    assert!(!git::discover_with_ignored(&f.base, &[])
        .unwrap()
        .contains(&generated));
    // Built-in ignored children remain separate from explicit root choices.
    assert_eq!(git::discover(&generated).unwrap(), vec![generated]);
}

#[test]
fn safe_sync_pushes_strictly_ahead_clean_branch_without_force_or_worktree_changes() {
    let f = Fixture::new();
    let old_remote = run(&f.seed, &["rev-parse", "refs/remotes/origin/dev"]);
    fs::write(f.local.join("tracked.txt"), "local change\n").expect("edit local");
    run(&f.local, &["add", "tracked.txt"]);
    run(&f.local, &["commit", "-m", "safe ahead"]);
    let head = run(&f.local, &["rev-parse", "HEAD"]);
    assert_eq!(
        git::inspect(&f.local).unwrap().decision,
        SyncDecision::LocalAhead
    );
    assert_eq!(
        git::safe_sync(&f.local).unwrap(),
        git::OperationOutcome::Pushed(1)
    );
    assert_eq!(run(&f.local, &["rev-parse", "HEAD"]), head);
    assert_eq!(
        run(&f.seed, &["rev-parse", "refs/remotes/origin/dev"]),
        old_remote
    );
    let bare = f.base.join("remote.git");
    assert_eq!(run(&bare, &["rev-parse", "refs/heads/dev"]), head);
    assert_eq!(
        git::safe_sync(&f.local).unwrap(),
        git::OperationOutcome::AlreadyCurrent,
        "successful push updates the local tracking tip for this standard upstream"
    );
    assert_eq!(run(&bare, &["rev-parse", "refs/heads/dev"]), head);
    git::fetch(&f.local).unwrap();
    assert_eq!(
        git::safe_sync(&f.local).unwrap(),
        git::OperationOutcome::AlreadyCurrent
    );
}

#[test]
fn safe_sync_keeps_offline_fast_forward_for_clean_behind_branch() {
    let f = Fixture::new();
    f.push_more();
    git::fetch(&f.local).expect("explicit fetch");
    assert_eq!(
        git::safe_sync(&f.local).unwrap(),
        git::OperationOutcome::Updated(1)
    );
    assert_eq!(
        run(&f.local, &["rev-parse", "HEAD"]),
        run(&f.seed, &["rev-parse", "HEAD"])
    );
}

#[test]
fn safe_sync_fails_closed_when_remote_advanced_beyond_stale_tracking_ref() {
    let f = Fixture::new();
    fs::write(f.local.join("tracked.txt"), "local ahead\n").unwrap();
    run(&f.local, &["add", "tracked.txt"]);
    run(&f.local, &["commit", "-m", "local ahead"]);
    let local_head = run(&f.local, &["rev-parse", "HEAD"]);
    f.push_more();
    let remote_head = run(&f.seed, &["rev-parse", "HEAD"]);
    assert!(
        git::safe_push(&f.local).is_err(),
        "remote must reject non-fast-forward"
    );
    assert_eq!(
        run(&f.base.join("remote.git"), &["rev-parse", "refs/heads/dev"]),
        remote_head
    );
    assert_eq!(run(&f.local, &["rev-parse", "HEAD"]), local_head);
}

#[test]
fn safe_sync_skips_dirty_and_diverged_and_no_upstream() {
    let f = Fixture::new();
    fs::write(f.local.join("untracked.txt"), "local").unwrap();
    assert_eq!(
        git::safe_sync(&f.local).unwrap(),
        git::OperationOutcome::Skipped(SyncDecision::LocalChanges)
    );
    fs::remove_file(f.local.join("untracked.txt")).unwrap();
    run(&f.local, &["branch", "--unset-upstream"]);
    assert_eq!(
        git::safe_sync(&f.local).unwrap(),
        git::OperationOutcome::Skipped(SyncDecision::NoUpstream)
    );
    run(&f.local, &["branch", "--set-upstream-to=origin/dev"]);
    fs::write(f.local.join("tracked.txt"), "local ahead\n").unwrap();
    run(&f.local, &["add", "tracked.txt"]);
    run(&f.local, &["commit", "-m", "local"]);
    f.push_more();
    git::fetch(&f.local).unwrap();
    assert_eq!(
        git::safe_sync(&f.local).unwrap(),
        git::OperationOutcome::Skipped(SyncDecision::Diverged)
    );
}

#[test]
fn safe_push_rejects_split_push_url_or_nonmatching_upstream_branch() {
    let f = Fixture::new();
    fs::write(f.local.join("tracked.txt"), "ahead\n").unwrap();
    run(&f.local, &["add", "tracked.txt"]);
    run(&f.local, &["commit", "-m", "ahead"]);
    run(
        &f.local,
        &[
            "remote",
            "set-url",
            "--push",
            "origin",
            f.seed.to_str().expect("path"),
        ],
    );
    assert!(
        git::safe_push(&f.local).is_err(),
        "split push URL must be refused"
    );
    run(
        &f.local,
        &["config", "--unset-all", "remote.origin.pushurl"],
    );
    // Keep the alternate upstream valid and strictly behind local HEAD.
    // This must exercise a mismatched push branch, not NoUpstream.
    let tip = run(&f.local, &["rev-parse", "refs/remotes/origin/dev"]);
    run(&f.local, &["update-ref", "refs/remotes/origin/other", &tip]);
    run(
        &f.local,
        &["config", "branch.dev.merge", "refs/heads/other"],
    );
    assert_eq!(
        git::inspect(&f.local).unwrap().decision,
        SyncDecision::LocalAhead
    );
    assert!(
        git::safe_push(&f.local).is_err(),
        "unmatched merge ref must be refused"
    );
}

#[cfg(unix)]
#[test]
fn safe_push_respects_failing_pre_push_hook_without_bypassing_hooks() {
    use std::os::unix::fs::PermissionsExt;
    let f = Fixture::new();
    fs::write(f.local.join("tracked.txt"), "ahead\n").unwrap();
    run(&f.local, &["add", "tracked.txt"]);
    run(&f.local, &["commit", "-m", "ahead"]);
    let hook = f.local.join(".git").join("hooks").join("pre-push");
    fs::write(&hook, "#!/bin/sh\nexit 1\n").unwrap();
    fs::set_permissions(&hook, fs::Permissions::from_mode(0o755)).unwrap();
    let previous = run(&f.base.join("remote.git"), &["rev-parse", "refs/heads/dev"]);
    assert!(git::safe_push(&f.local).is_err());
    assert_eq!(
        run(&f.base.join("remote.git"), &["rev-parse", "refs/heads/dev"]),
        previous
    );
}

#[test]
fn safe_push_refuses_to_recreate_deleted_upstream_branch() {
    let f = Fixture::new();
    fs::write(f.local.join("tracked.txt"), "local ahead\n").unwrap();
    run(&f.local, &["add", "tracked.txt"]);
    run(&f.local, &["commit", "-m", "local ahead"]);
    let original_head = run(&f.local, &["rev-parse", "HEAD"]);
    let bare = f.base.join("remote.git");
    run(&bare, &["update-ref", "-d", "refs/heads/dev"]);
    assert_eq!(
        git::inspect(&f.local).unwrap().decision,
        SyncDecision::LocalAhead
    );

    let error = git::safe_sync(&f.local).unwrap_err();
    assert!(error.to_string().contains("ls-remote"));
    let exists = Command::new("git")
        .arg("-C")
        .arg(&bare)
        .args(["show-ref", "--verify", "--quiet", "refs/heads/dev"])
        .status()
        .expect("git should be installed")
        .success();
    assert!(!exists, "Safe push must not recreate a deleted upstream");
    assert_eq!(run(&f.local, &["rev-parse", "HEAD"]), original_head);
}

#[test]
fn safe_push_refuses_remotely_advanced_tip_before_a_network_write() {
    let f = Fixture::new();
    f.push_more();
    git::fetch(&f.local).expect("prepare current upstream");
    assert_eq!(
        git::safe_pull(&f.local).expect("start from fetched upstream"),
        git::OperationOutcome::Updated(1)
    );
    fs::write(f.local.join("tracked.txt"), "local ahead\n").unwrap();
    run(&f.local, &["add", "tracked.txt"]);
    run(&f.local, &["commit", "-m", "ahead from fetched upstream"]);
    let local_head = run(&f.local, &["rev-parse", "HEAD"]);
    fs::write(f.seed.join("tracked.txt"), "remote moved again\n").unwrap();
    run(&f.seed, &["add", "tracked.txt"]);
    run(&f.seed, &["commit", "-m", "remote moved after fetch"]);
    run(&f.seed, &["push", "origin", "dev"]);
    let remote_head = run(&f.seed, &["rev-parse", "HEAD"]);
    let error = git::safe_push(&f.local).unwrap_err();
    assert!(error
        .to_string()
        .contains("Remote upstream moved since Fetch"));
    assert_eq!(
        run(&f.base.join("remote.git"), &["rev-parse", "refs/heads/dev"]),
        remote_head,
    );
    assert_eq!(run(&f.local, &["rev-parse", "HEAD"]), local_head);
}
