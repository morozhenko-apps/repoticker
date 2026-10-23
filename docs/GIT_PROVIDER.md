# Local Git provider — implemented manual mode

Source: `crates/repoticker-core/src/git.rs` and Tauri IPC in `apps/desktop/src-tauri/src/main.rs`. The user explicitly enrolls roots through the independent Settings window; Apply persists the transaction, Cancel does not alter saved settings.

## Enrollment and discovery

A root may be a valid Git checkout itself or a parent whose **immediate child directories** contain valid checkouts. Paths are normalized and validated before use; a hidden directory, symlink, invalid `.git` marker, snapshot/build container or administrative worktree tree is not silently enrolled. A valid linked worktree with a `.git` file may be enrolled explicitly as a root. Deep arbitrary recursion, global Git index and deleting repositories are not supported.

Removing a registered root removes only its config entry, not its checkout. Identically named repositories are distinguished by canonical path.

## Snapshot and UI

Installed Git supplies current branch/detached status, upstream, ahead/behind, dirty tracked/untracked working tree and unfinished Git operation status. Ahead/behind is measured against **last fetched remote-tracking refs**, which can be stale until Fetch. Empty, disconnected or unavailable GitHub CI/runners/quota measurements are shown as unknown, not zero.

The repository drawer shows individual operations and in-flight progress. A successful action is deliberately silent in the final compact card; individual errors remain visible.

## Manual Fetch

- Command semantics: `git fetch --all --prune --quiet` for an eligible enrolled checkout, through an argv-based process invocation rather than a shell.
- Changes remote-tracking references only, not the checked-out branch, local commits or worktree files.
- Up to four **different** repos can fetch concurrently; per-repo results and failures are isolated.
- Overall percentage is based on **number of completed repositories**, not transferred objects or bytes.
- Git may use existing local SSH/HTTPS credentials, credential helpers, Git configuration and user hooks.

## Manual Safe pull

Safe pull deliberately **does not fetch**. It reads the already-fetched upstream ref, checks eligibility, and executes a sequential `git merge --ff-only --quiet @{upstream}` only for branches that are:
- checked out, tracking a valid upstream and genuinely behind;
- not locally ahead or diverged;
- clean of tracked **and untracked** changes;
- free of unfinished merge/rebase/cherry-pick or similar operations.

Eligibility is re-inspected inside the actual operation to reduce TOCTOU risks. Git itself remains final authority. Dirty, detached, no-upstream, ahead-only, diverged or unfinished repositories are skipped, not auto-repaired. There is **no** stash, automatic merge commit, rebase, forced update, reset, checkout switch or deletion.

**Unreleased P1 dev hardening (2026-10-23):** `safe_pull` now resolves the exact already-fetched upstream commit OID and revalidates its identity along with HEAD, branch, upstream ref name and eligibility. The final `--ff-only` merge targets that pinned OID rather than re-resolving the moving `@{upstream}` expression. Changed upstream identity or tip aborts before mutation. This does not provide a cross-process Git transaction against modifications during the final native command. See [P1 development checkpoint](DEVELOPMENT_0_4_0.md). Published v0.2.0 retains its original behavior.

A repository may change upstream after the last Fetch. Run Fetch to refresh remote refs before Safe pull when current upstream state is needed; clicking Safe pull alone performs no network request.

## Known limitations

- No background fetch/pull or automatic startup sync in v0.1.0; all mutation is explicitly user-triggered.
- **Published v0.2.0:** no Git subprocess cancellation or comprehensive treatment of SSH prompt/hung helpers. `GIT_TERMINAL_PROMPT=0` prevents ordinary terminal Git prompts. The `dev` P1-G2 implementation adds explicit **Fetch-only** cancellation, including its owned child-process group/tree; it does not kill Safe pull. Partial remote-tracking ref updates during cancellation are possible and do not change the worktree. See [P1 development plan](DEVELOPMENT_0_4_0.md).
- External clients can change a checkout during operations; the application lock serializes only RepoTicker operations within one process.
- Native Git configuration, LFS, worktrees, hooks and credential helpers need broader hostile-input and cross-platform acceptance.
- Config JSON updates do not yet use atomic replacement or schema migration.
- Linux KDE Wayland card dragging jitters ([Issue #2](https://github.com/morozhenko-apps/repoticker/issues/2)); the native SNI tray and anchored popup have local smoke evidence but not comprehensive multi-monitor acceptance.
- GitHub REST polling, Actions runs/jobs, runner occupancy, token storage, quotas and webhook relay are **not implemented**.

## Test evidence and remaining cases

`cargo test -p repoticker-core` runs unit tests and real Git integration fixtures using temporary bare remotes/local checkouts. Verified scenarios include fast-forward-only policy, dirty/untracked refusal, missing upstream, divergence, explicit enrollment, bounded discovery and preservation of local checkout files on Fetch.

Still required: staged tracked modifications, combined operation markers, symlink escapes, multi-remotes and submodules, concurrent refs/head changes, unusual Git hooks/credentials, long-running cancellation, Windows path behavior and real OS acceptance.

See [PRODUCT.md](PRODUCT.md), [TEST_STRATEGY.md](TEST_STRATEGY.md) and [ROADMAP.md](ROADMAP.md).
