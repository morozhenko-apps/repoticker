# Local Git provider — implemented manual mode

Source: `crates/repoticker-core/src/git.rs` and Tauri IPC in `apps/desktop/src-tauri/src/main.rs`. The user explicitly enrolls roots through the independent Settings window; Apply persists the transaction, Cancel does not alter saved settings.

## Enrollment and discovery

A root may be a valid Git checkout itself or a parent whose **immediate child directories** contain valid checkouts. Paths are normalized and validated before use; a hidden directory, symlink, invalid `.git` marker, snapshot/build container or administrative worktree tree is not silently enrolled. A valid linked worktree with a `.git` file may be enrolled explicitly as a root. Deep arbitrary recursion, global Git index and deleting repositories are not supported.

Removing a registered root removes only its config entry, not its checkout. Identically named repositories are distinguished by canonical path.

**Unreleased P1-IGNORE1 (dev):** Settings now supports a bounded list
of up to 100 additional exact immediate-child folder names to ignore.
These are global across all enrolled parent roots, case-sensitive,
not recursive, not globs and cannot disable built-in hidden/build/
snapshot exclusions. Existing configurations default to an empty list.
An explicitly enrolled Git repository remains visible and actionable
even if its name appears in the ignore list; only automatic child
discovery is filtered. Local snapshots, Fetch/Safe pull and
Open on GitHub/Open folder/Copy path all use the same filtered
discovery and enrollment boundary. The setting is committed only
with Settings OK and is preserved on Cancel. No remote data, Git
mutations or repository files are changed by editing exclusions.
See [P1-IGNORE1 plan](DEVELOPMENT_0_4_0.md) and
[native acceptance #15](https://github.com/morozhenko-apps/repoticker/issues/15).


## Snapshot and UI

Installed Git supplies current branch/detached status, upstream, ahead/behind, dirty tracked/untracked working tree and unfinished Git operation status. Ahead/behind is measured against **last fetched remote-tracking refs**, which can be stale until Fetch. Empty, disconnected or unavailable GitHub CI/runners/quota measurements are shown as unknown, not zero.

The repository drawer shows individual operations and in-flight progress. A successful action is deliberately silent in the final compact card; individual errors remain visible.

**Unreleased dev P1-SCAN1:** local snapshots now inspect independent
enrolled checkouts with a fixed maximum of four Git workers using
the existing bounded executor, restoring discovery order before
projecting each success or error. Git operation marker checks
resolve the absolute per-worktree Git admin directory only once
and test all six marker files/directories locally, including
linked worktrees. Branch/upstream, dirty state, ahead/behind,
and Safe pull safety are unchanged. Measured wall-clock
improvement requires KDE before/after instrumentation; see
[P1-SCAN1](DEVELOPMENT_0_4_0.md) and startup issue #12.
Published v0.2.0 remains unchanged.

**Unreleased dev UI actions:** Each repository's shared popup has
Fetch, Safe pull and Open on GitHub, plus Open folder and Copy path.
The last two native actions open only the canonical, currently enrolled
checkout path in the OS file manager or copy it through the existing
write-only native clipboard. All three navigation/copy commands use
the same root/direct-child enrollment resolver and do not modify
the checkout or contact GitHub APIs. An explicitly enrolled linked
worktree is accepted; its unregistered implicit child remains excluded.
These additions are not part of the published v0.2.0. See
[P1-UI2](DEVELOPMENT_0_4_0.md) and deferred physical acceptance #15.

## Unreleased P1-SYNC2: Safe sync and targeted live metrics

The **dev** compact-card button and per-repository menu now expose
**Safe sync**, replacing the displayed Safe pull option. The legacy
`safe_pull` function remains in the Git core for compatibility.

- **Strictly behind** an upstream fetched tip: the existing
  offline clean fast-forward-only Safe pull (no implicit Fetch).
- **Strictly ahead** and clean: conservative ordinary **non-force**
  push of pinned HEAD commit OID to the same-named configured upstream
  branch. Require one matching fetch/push URL, stable HEAD/upstream
  and remote config, with server-side non-fast-forward protection
  and pre-push hooks. No force, tags, automatic rebase/stash/reset
  or upstream creation.
- **Diverged, dirty, detached, no upstream or unfinished operation**:
  skipped, never auto-reconciled. Fetch remains separate and
  cancellable. A successful push to a normal upstream updates its
  remote-tracking ref.

Runners and Tasks in the compact status strip are separate manual
refresh controls. Clicking Runners requests only runner inventory;
Tasks requests only Actions runs/jobs. Both respect native GitHub
authorization, cooldown and bounded request limits. A targeted
result keeps the other group's counts, coverage and independently
last-successful checked time; unknown stays unknown. Checked times
render in the WebView's **local machine timezone**, not forced UTC.
An open status balloon refreshes from the native monitor cache
rather than launching a local Git status scan.


**Unreleased P1-REMOTE1 hardening:** Safe push now performs an exact
read-only remote-branch probe before sending the pinned commit.
It requires the upstream `refs/heads/<branch>` to exist on the
server and match the already-fetched upstream OID. A removed or
advanced remote branch fails before push; it is never knowingly
recreated from a stale tracking ref. The client verifies local
HEAD/upstream/clean status and remote routing again after the
probe. No automatic Fetch is introduced. This is a best-effort
non-force safety preflight, **not an atomic server-side lease**:
a deletion racing after the probe remains a documented limit
of Git's ordinary non-force push semantics. See
[P1-REMOTE1](DEVELOPMENT_0_4_0.md) and issue #15.

These features remain **unreleased dev-only** until native KDE/
Windows acceptance in [issue #15](https://github.com/morozhenko-apps/repoticker/issues/15)
and separate release approval. See [P1-SYNC2](DEVELOPMENT_0_4_0.md).

## Unreleased P1-GIT-RACE2: final checkout revalidation

Safe pull has a third conservative validation of the active
checkout, HEAD, current branch, selected upstream, full status
and immutable commit IDs **after** its final external-client
checkpoint and immediately before the `git merge --ff-only`
call. A pinned target commit alone cannot prevent a different
branch from being advanced if another Git client switches
the active checkout in the last interval. If any checked
identity changes, Safe sync refuses with a visible error
instead of merging the formerly selected target.

Safe push also has deterministic tests of concurrent active
branch/upstream/remote URL changes during live remote probing;
the existing post-probe source+route guard must refuse any
changed destination. Explicit pinned push refspec and
`--no-follow-tags` override implicit Git defaults for
`push.default`, `remote.pushDefault`, `branch.pushRemote`,
`push.followTags` and remote-configured push refspecs.
Mirror mode cannot cause a multi-ref write through Safe sync.

This is **not** an atomic cross-process lock between
RepoTicker and all external Git clients: another process
could still change HEAD after the final check but before
Git's internal merge lock. No reset, stash or aggressive
process termination is introduced. See [P1-GIT-RACE2]
(DEVELOPMENT_0_4_0.md) and issue #15. This is not part
of published v0.2.0.

## Unreleased P1-GIT-EDGE1: tracked submodule safety

The dev safety classifier queries Git status with
`--porcelain=v1 --untracked-files=normal --ignore-submodules=none`
to explicitly detect dirty initialized tracked submodules,
even when user Git config contains `diff.ignoreSubmodules=all`
or `submodule.<name>.ignore=all`. These values may hide
nested untracked changes from an ordinary user Git status
command but cannot suppress RepoTicker's Safe sync guard.

Safe pull and Safe push continue to refuse dirty parent
checkouts, without altering the user's global or repository
Git configuration, staging nested changes, initializing
submodules, or modifying their commits. Additional real
Git tests cover selected origin amid a second remote and
a configured external `core.hooksPath` failure preventing
outbound non-force push. Physical acceptance: issue #15;
engineering evidence: [P1-GIT-EDGE1](DEVELOPMENT_0_4_0.md).
Not present in published v0.2.0.

## Unreleased P1-PROC1: bounded owned Git/SSH subprocesses

The dev Git executor now applies hard per-process deadlines while
keeping existing argv-only execution, no-terminal prompts and
independent explicit Fetch cancellation:

| Operation | Deadline | Failure semantics |
|---|---:|---|
| Read-only/local Git inspection | 20 s | local Git command timed out |
| Read-only remote `ls-remote` | 45 s | no Safe push attempted |
| Fetch | 120 s | partial remote-tracking ref updates may have occurred |
| Safe push | 120 s | **remote outcome unknown**; inspect remote before retrying |

Git children are started in private Unix process groups; on Windows
the exact owned PID and its descendants are targeted via bounded
`taskkill /T`. Stdout and stderr are drained concurrently to avoid
blocking on full pipes; timeouts bound process exit and output
collection. Unrelated Git processes are not targeted by name.
User-triggered Fetch cancellation retains its own token and is
**not** the same as a timeout. A local `git merge --ff-only` is
intentionally **not force-killed** during worktree/index mutation.
An inherited pipe still held by a detached helper after Git exits
can produce a bounded outcome-unknown error; absolute orphan-free
termination of detached helper processes is not asserted.

See [P1-PROC1](DEVELOPMENT_0_4_0.md) and
[physical acceptance issue #15](https://github.com/morozhenko-apps/repoticker/issues/15).
Published v0.2.0 is unchanged.

**Unreleased P1-PROC2 (dev):** When the directly owned Git process
has exited but an inherited stdout/stderr pipe remains open, the
bounded pipe-drain error now also attempts to stop the original
owned process group/tree and confirm that the pipe closes.
The operation remains an explicit error with **unknown outcome**,
not a successful Fetch or Safe sync. The cleanup confirmation can
fail if a helper detached into a separate group; Windows
`taskkill /PID /T` may reject an already-exited parent PID,
and this limitation is surfaced rather than hidden. Linux
process-boundary regression coverage and exact source validation
are tracked in [P1-PROC2](DEVELOPMENT_0_4_0.md).
This does not claim orphan-free execution across arbitrary
third-party helpers or cross-platform physical acceptance.

**Unreleased P1-FETCH-RACE4 (dev):** Explicit Cancel remains
Fetch-only and prevents subsequent child registrations. If termination
of one already-owned Git process group fails, a second Cancel can
retry that *still-registered, unsuccessfully targeted* process,
without sending another signal to completed or previously terminated
groups. During a cancel-between-spawn-and-register race, the app
must confirm both bounded termination and reap before reporting
`cancelled`; incomplete cleanup is a Git error with an
**unknown outcome** warning. The per-repository success and
concrete timeout/error classification are unchanged. Exact CI
evidence and rollback scope: [P1-FETCH-RACE4](DEVELOPMENT_0_4_0.md).
Windows physical process-tree acceptance remains deferred.

## Unreleased P1-QUIT1: explicit tray Quit waits for owned Git work

On `dev`, selecting **Quit** from the KDE or Windows tray first
prevents new Git action admission, requests cancellation of the
current explicit Fetch, and waits for the existing Git-operation
mutex to be released before exiting the desktop process.
An action already queued when Quit is selected cannot begin.
A Fetch registered concurrently with Quit re-checks shutdown
after publishing its cancellation token, so a late token is
not missed. The UI event loop is not blocked while the Git
operation and bounded child cleanup finish.

Safe sync and legacy Safe pull are deliberately **not**
forcibly cancelled: they must complete their existing
Git worktree/remote operation before the explicit Quit can
finish. This means Quit can remain pending during a slow
non-cancellable Git command. OS SIGKILL, power failure,
Task Manager forced termination or session teardown are
not equivalent to explicit tray Quit and are **not**
protected by this path.

See [P1-QUIT1](DEVELOPMENT_0_4_0.md) and
[deferred OS acceptance #15](https://github.com/morozhenko-apps/repoticker/issues/15).
No behavior in the published v0.2.0 is changed.

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
- **Published v0.2.0:** Config JSON updates are not atomic, and no schema migration is implemented. **Unreleased P1-G3 dev:** all native config edits, including KDE card margin persistence, now use a managed per-process serialized transaction and atomic same-directory replacement with a validated prior-good `config.json.bak` snapshot. A malformed/missing primary is restored from a valid backup, with malformed originals preserved as `config.json.corrupt.*`; if both copies are invalid, startup/settings fail closed rather than silently resetting preferences. Existing config schema and defaults stay unchanged. Physical KDE/Windows interruption, permission and cross-process editor acceptance remain open in [issue #15](https://github.com/morozhenko-apps/repoticker/issues/15). See [P1-G3 plan](DEVELOPMENT_0_4_0.md).
- Linux KDE Wayland card dragging jitters ([Issue #2](https://github.com/morozhenko-apps/repoticker/issues/2)); the native SNI tray and anchored popup have local smoke evidence but not comprehensive multi-monitor acceptance.
- GitHub REST polling, Actions runs/jobs, runner occupancy, token storage, quotas and webhook relay are **not implemented**.

## Test evidence and remaining cases

`cargo test -p repoticker-core` runs unit tests and real Git integration fixtures using temporary bare remotes/local checkouts. Verified scenarios include fast-forward-only policy, dirty/untracked refusal, missing upstream, divergence, explicit enrollment, bounded discovery and preservation of local checkout files on Fetch.

Still required: staged tracked modifications, combined operation markers, symlink escapes, multi-remotes and submodules, concurrent refs/head changes, unusual Git hooks/credentials, long-running cancellation, Windows path behavior and real OS acceptance.

See [PRODUCT.md](PRODUCT.md), [TEST_STRATEGY.md](TEST_STRATEGY.md) and [ROADMAP.md](ROADMAP.md).
