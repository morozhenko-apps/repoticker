# Mode B: Git core method-level executable assertion reconciliation

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; `crates/repoticker-core/src/git.rs` blob `5b92830d50e9a3d9a97487e3b78454bf3e64de55`, 2164 source lines. Audit parent `ecde9a1cc706bf898ce3b3fe5a3b2c76c462494f`.

This Git Core file has **68 lexical candidates**, 7 existing type/impl declarations and **61 newly classified**: **33 E_PARTIAL** with a named direct call in existing Rust tests, **2 I_PARTIAL** platform helpers reached through owned cancellation tests, **16 P_CORE** method branches with no independent direct assertion credited, **5 OS_P** platform-specific paths, **1 FFI_DECL** C `kill` declaration, and **4 TEST_ONLY** inline Windows tests at lines 1260–1292. The inline Windows tests are **`#[cfg(all(test, windows))]`**; their source assertions can be read but cannot be claimed executed on Linux or in this turn.

Actual Rust evidence reviewed: `crates/repoticker-core/tests/git_integration.rs` blob `0a9011b99f2340c356144d64346402b633f9d7d0` (**30 test declarations**), `crates/repoticker-core/tests/github_remote.rs` blob `1611c2ce00eaed1e6547ead0c9c4bce3dbeb5d77` (**3 tests**), and `git.rs` (**31 inline `#[test]` declarations**, including OS-gated) in addition to historical native/UI tests. Many tests instantiate disposable repositories and real Git commands; they are not mocks of the domain logic. Tests were **read, not newly executed**.

## Every 61 previously unresolved lexical entries

| Source line | Method or declaration | Status | Test/branch owner |
| ---: | --- | --- | --- |
| 20 | `fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {` | P_CORE | PROCESS |
| 40 | `fn configure_background_child(command: &mut Command) {` | E_PARTIAL | PROCESS |
| 47 | `fn configure_background_child(_command: &mut Command) {}` | OS_P | PROCESS |
| 53 | `fn check_git_process_startup(output: &Output) -> Result<(), GitError> {` | E_PARTIAL | PROCESS |
| 62 | `fn is_git_process_startup_failure(error: &GitError) -> bool {` | E_PARTIAL | PROCESS |
| 74 | `fn git_command(repo: &Path, args: &[&str]) -> Command {` | E_PARTIAL | PROCESS |
| 102 | `pub fn is_cancelled(&self) -> bool {` | E_PARTIAL | FETCH |
| 112 | `pub fn cancel(&self) -> Result<bool, GitError> {` | E_PARTIAL | FETCH |
| 116 | `fn cancel_with(` | E_PARTIAL | FETCH |
| 149 | `fn register(&self, pid: u32) -> Result<bool, GitError> {` | E_PARTIAL | FETCH |
| 161 | `fn unregister(&self, pid: u32) -> Result<bool, GitError> {` | E_PARTIAL | FETCH |
| 172 | `fn terminate_fetch_group(pid: u32) -> Result<(), GitError> {` | I_PARTIAL | FETCH |
| 177 | `fn kill(pid: i32, signal: i32) -> i32;` | FFI_DECL | FETCH |
| 190 | `fn terminate_fetch_group(pid: u32) -> Result<(), GitError> {` | OS_P | FETCH |
| 223 | `fn terminate_fetch_group(_pid: u32) -> Result<(), GitError> {` | OS_P | FETCH |
| 232 | `fn classify_fetch_completion(` | E_PARTIAL | FETCH |
| 245 | `fn fetch_was_interrupted(status: &std::process::ExitStatus) -> bool {` | I_PARTIAL | FETCH |
| 251 | `fn fetch_was_interrupted(status: &std::process::ExitStatus) -> bool {` | OS_P | FETCH |
| 257 | `fn fetch_was_interrupted(_status: &std::process::ExitStatus) -> bool {` | OS_P | FETCH |
| 264 | `fn unregistered_fetch_cleanup_error(` | E_PARTIAL | FETCH |
| 286 | `fn run_cancellable_command(` | E_PARTIAL | FETCH |
| 301 | `fn run_cancellable_command_with_timeout(` | E_PARTIAL | FETCH |
| 389 | `fn drain_git_pipe<R: Read + Send + 'static>(mut reader: R) -> mpsc::Receiver<io::Result<Vec<u8>>> {` | P_CORE | PROCESS |
| 402 | `fn receive_owned_pipe(` | E_PARTIAL | PROCESS |
| 438 | `fn wait_owned_child(` | P_CORE | PROCESS |
| 508 | `fn run_bounded_command(` | E_PARTIAL | PROCESS |
| 528 | `fn invoke(repo: &Path, args: &[&str]) -> Result<Output, GitError> {` | P_CORE | PROCESS |
| 556 | `fn stderr(output: &Output) -> String {` | P_CORE | PROCESS |
| 562 | `fn required(repo: &Path, args: &[&str]) -> Result<String, GitError> {` | P_CORE | PROCESS |
| 574 | `fn optional(repo: &Path, args: &[&str]) -> Result<Option<String>, GitError> {` | P_CORE | PROCESS |
| 585 | `fn looks_like_checkout(path: &Path, allow_worktree: bool) -> bool {` | P_CORE | DISCOVERY |
| 590 | `fn verified_checkout(path: &Path) -> Result<bool, GitError> {` | P_CORE | DISCOVERY |
| 602 | `fn ignored_child(path: &Path) -> bool {` | P_CORE | DISCOVERY |
| 619 | `pub fn validate_ignored_child_names(names: Vec<String>) -> Result<Vec<String>, GitError> {` | E_PARTIAL | DISCOVERY |
| 644 | `pub fn discover_with_ignored(` | E_PARTIAL | DISCOVERY |
| 699 | `pub fn discover(root: &Path) -> Result<Vec<PathBuf>, GitError> {` | E_PARTIAL | DISCOVERY |
| 703 | `pub fn discover_all_with_ignored(` | E_PARTIAL | DISCOVERY |
| 719 | `pub fn discover_all(roots: &[PathBuf]) -> (Vec<PathBuf>, Vec<String>) {` | P_CORE | DISCOVERY |
| 724 | `pub fn resolve_enrolled_checkout_with_ignored(` | E_PARTIAL | DISCOVERY |
| 741 | `pub fn resolve_enrolled_checkout(roots: &[PathBuf], requested: &str) -> Result<PathBuf, GitError> {` | E_PARTIAL | DISCOVERY |
| 745 | `pub fn normalize_root(path: &str) -> Result<PathBuf, GitError> {` | E_PARTIAL | DISCOVERY |
| 775 | `pub fn inspect_all(repositories: Vec<PathBuf>) -> Vec<(PathBuf, Result<RepoSnapshot, GitError>)> {` | E_PARTIAL | DISCOVERY |
| 795 | `pub fn inspect(repo: &Path) -> Result<RepoSnapshot, GitError> {` | E_PARTIAL | DISCOVERY |
| 873 | `fn git_operation_in_progress(repo: &Path) -> Result<bool, GitError> {` | P_CORE | DISCOVERY |
| 895 | `pub fn github_remote_to_browser_url(remote: &str) -> Option<String> {` | E_PARTIAL | ORIGIN |
| 924 | `pub fn github_origin_url(repo: &Path) -> Result<String, GitError> {` | E_PARTIAL | ORIGIN |
| 934 | `pub fn fetch(repo: &Path) -> Result<OperationOutcome, GitError> {` | E_PARTIAL | FETCH |
| 945 | `pub fn fetch_with_cancel(` | P_CORE | FETCH |
| 974 | `fn commit_oid(repo: &Path, revision: &str) -> Result<String, GitError> {` | P_CORE | SAFE_SYNC |
| 986 | `fn pull_source_unchanged(` | P_CORE | SAFE_SYNC |
| 1003 | `fn safe_pull_with_checkpoints(` | E_PARTIAL | SAFE_SYNC |
| 1055 | `fn safe_push_source_unchanged(` | P_CORE | SAFE_SYNC |
| 1079 | `fn parse_single_remote_branch(raw: &str, branch_ref: &str) -> Result<String, GitError> {` | E_PARTIAL | SAFE_SYNC |
| 1102 | `pub fn safe_push(repo: &Path) -> Result<OperationOutcome, GitError> {` | E_PARTIAL | SAFE_SYNC |
| 1108 | `fn safe_push_with_checkpoint(` | E_PARTIAL | SAFE_SYNC |
| 1232 | `pub fn safe_sync(repo: &Path) -> Result<OperationOutcome, GitError> {` | E_PARTIAL | SAFE_SYNC |
| 1244 | `pub fn safe_pull(repo: &Path) -> Result<OperationOutcome, GitError> {` | E_PARTIAL | SAFE_SYNC |
| 1260 | `fn loader_failure_reports_ntstatus_without_leaking_command_or_repo_path() {` | TEST_ONLY | TEST_DECL |
| 1272 | `fn ordinary_failure_remains_a_regular_git_exit_status() {` | TEST_ONLY | TEST_DECL |
| 1282 | `fn headless_git_command_executes_without_losing_output() {` | TEST_ONLY | TEST_DECL |
| 1292 | `fn headless_child_creation_preserves_exit_status() {` | TEST_ONLY | TEST_DECL |

## Direct behaviors with genuine Rust assertions

| Domain | Real test source and observed assertion | Separate remaining branch |
| --- | --- | --- |
| Git discovery and explicit enrollment | `discovery_is_shallow_ignores_snapshots_and_invalid_worktrees`, `enrolled_checkout_resolution_accepts_only_canonical_discovered_repositories`, `linked_worktree_requires_explicit_root_enrollment`, `ignore_names_are_exact_validated_bounded_and_unicode_capable`; direct real `discover`, `resolve_enrolled_checkout`, `validate_ignored_child_names` | Duplicate normalization vs symlink TOCTOU when checkout changes after enrollment |
| Git inspect and readiness | `bounded_inspect_preserves_input_order_and_per_repository_errors` calls `inspect_all`, `inspect` and observes per-repo results; operation markers tracked under linked worktrees | Concurrent checkout mutation after inspection before native `perform_git_action` still separate A2 |
| Strict GitHub opener | `canonicalizes_supported_https_scp_and_ssh_github_remotes`; `rejects_untrusted_hosts_credentials_extra_paths_and_url_tricks` rejects lookalike host, URL userinfo, query/hash, traversal and percent-encoded separator; `resolves_real_local_git_origin_without_network_or_worktree_changes` | OS browser launcher and native enrolled path verification outside Core |
| Safe pull | `fetch_only_changes_remote_refs_and_safe_pull_fast_forwards`, `untracked_and_dirty_files_skip_without_stashing`, `branch_with_no_upstream_skips`, `moving_upstream_after_second_check_aborts_before_merge`, `switching_active_branch_after_second_check_cannot_advance_wrong_branch` | External filesystem failure and race beyond final ref proof |
| Safe push | `safe_push_respects_failing_pre_push_hook_without_bypassing_hooks`: failing executable hook keeps remote tip; `safe_push_refuses_to_recreate_deleted_upstream_branch`, `safe_push_refuses_remotely_advanced_tip_before_a_network_write` and `changing_push_remote_during_remote_probe_blocks_safe_push` | Remote timeout yields unknown push outcome, operator cannot automatically retry blindly |
| Safe Sync | `safe_sync_pushes_strictly_ahead_clean_branch_without_force_or_worktree_changes`, `safe_sync_keeps_offline_fast_forward_for_clean_behind_branch`, `safe_sync_skips_dirty_and_diverged_and_no_upstream`; no forced push, no stash | Native queued double-sync + Quit boundary still not directly integrated |
| Owned child cancellation | `cancel_between_spawn_and_registration_prevents_a_leaked_child`, `cancelling_after_registration_terminates_the_process_group`, `cancelling_two_owned_fetch_children_yields_two_distinct_cancelled_results`, `failed_termination_can_be_retried_without_resignalling_other_children` call real `FetchCancellation` and subprocess helpers | Windows `taskkill` process-tree semantics, user signal during blocked launcher |
| Bounded Git output | `large_captured_output_does_not_block_waiting_on_child_pipes` reads 200000 stdout bytes and stderr marker; `completed_drain_errors_are_distinct_from_inherited_pipe_timeouts`, `helper_holding_pipe_after_parent_exit_is_stopped_without_killing_unrelated_process` | OOM/permission, unreadable inherited pipes, Windows argv-specific error |
| Windows startup | Four `#[cfg(all(test, windows))]` functions source-test special NTSTATUS loader error, ordinary failure, no visible console and preserved exit status; `configure_background_child`, `check_git_process_startup`, `git_command` directly called in these Windows-only tests | Source evidence only here; OS Windows CI run and physical visible-console acceptance not verified |

**Evidence labels are conservative:** a helper with no direct test may still execute when real `safe_sync`, `fetch` or `inspect` executes; `P_CORE` does **not** claim its entire dependency path is untested. Only direct method assertions are E. Platform `I_PARTIAL` for Unix group termination/interruption means its effects are observed indirectly in real owned child cancellation tests, not on every OS.

## Invariants and negative testing obligations

1. **No-force and exact-ref:** Safe Push must not bypass `pre-push`, silently recreate a deleted upstream branch or use user-configured `push.default=matching` to push all refs. Preserve working tree and local branch when remote has changed. The existing integration tests cover several independent adversarial configurations.
2. **Atomic admissibility:** `safe_pull_with_checkpoints` and `safe_push_with_checkpoint` re-inspect branch names and upstream OIDs before modifying refs. Current tests inject deliberate race at checked points, but OS ref contention and ultimate native Tauri queue after Quit still require A2 direct verification.
3. **Cancellation vs unknown remote state:** A child killed before completion may produce `FETCH_CANCELLED`, but failed cleanup or push timeout must retain a concrete error or `PUSH_OUTCOME_UNKNOWN`. Do not turn errors into successful cancellation by weakening tests.
4. **Enrolled repository security:** `normalize_root`, `resolve_enrolled_checkout`, discovery and inspection are distinct. A source-approved checkout can become invalid after scan; native command must re-resolve enrolled root immediately before a mutation.
5. **OS-specific surface:** Windows `taskkill.exe /PID /T /F` is an owned process tree, not an OS-wide kill. Unix negative PID is the exact owned process group. Both require physical/OS-native acceptance; never run cancellation against unrelated user processes.

## Stage 9 exact additions (after global Stages 3–8 signoff)

`GIT-N1` malformed/unreachable Git binary, invalid root/checkout, paths with spaces/newlines and symlink escape; `GIT-N2` exact timeout and owned pipe caps, empty/large stderr, windows loader NTSTATUS; `GIT-N3` cancellation at spawn/pre-register/post-register/late completion with double cancel and failed cleanup; `GIT-N4` remote branch stale/deleted/moved, pushed ref and pre-push hook, no forced update; `GIT-N5` simultaneous queued native operations vs Quit (requires actual command IPC); `GIT-OS` Windows process-tree and Linux physical Git installations with synthetic disposable test process only.

Applicable N1/N2/N4/N5/N6/N7/N9/N10/N12 are branch dependent; N3 applies remote Git transport failure, N8 no locale except paths and timeouts, N11 NA. Existing actual Rust integration tests receive E_PARTIAL credit. No new executable test or mutation suite was run and no production Git behavior changed. **Stage 3–8 global PARTIAL**.
