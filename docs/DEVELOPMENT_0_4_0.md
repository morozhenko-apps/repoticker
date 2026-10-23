# RepoTicker P1 hardening — development checkpoint (v0.4 work bucket)

Status: **Mode A / planned source change**, 2026-10-23.
Development branch: `dev`. Current public, immutable release:
[`v0.2.0`](https://github.com/morozhenko-apps/repoticker/releases/tag/v0.2.0).
The `v0.4` label is a functional work bucket, **not** a request to
increase Cargo/Tauri version, release a package, or promote `main`.
Authority: [version roadmap](VERSION_ROADMAP_TO_1_0.md),
[Git safety contract](GIT_PROVIDER.md) and user AGENT SSOT.

## P1-G1 — pin the validated upstream commit during manual Safe pull

### Evidence and risk analysis

`crates/repoticker-core/src/git.rs::safe_pull` presently calls
`inspect`, reads HEAD, calls `inspect` again, checks the active
branch, `SyncDecision` and HEAD, then executes:
`git merge --ff-only --quiet @{upstream}`.

That **last argument is a moving ref expression**. The method does
not compare the resolved upstream target or upstream branch name across
the double inspection. A second Git client can move the remote-tracking
ref to another commit with the *same ahead/behind values*, or repoint
the branch upstream, without changing the existing checked conditions.
The final Git subprocess then resolves whichever commit `@{upstream}`
names at execution time. `--ff-only` prevents a merge commit, but
does not prove the target was the commit actually checked.

Plausible sources of unsafe/incorrect behavior to distinguish:
1. Concurrent fetch changes the selected upstream OID (primary).
2. Concurrent `branch --set-upstream-to` changes upstream identity
   without changing the ahead/behind decision (primary).
3. Another client changes HEAD/checked-out branch (partially guarded).
4. An external worktree edit changes cleanliness (partially guarded).
5. A concurrent rebase/cherry-pick introduces operation markers
   between individual status calls (partially guarded).
6. Git hook/config side effects or other subprocesses alter references
   or worktree after validation (separate P1 follow-up).
7. Git's ref/index locks reject or serialize competing writes
   (upstream exact-target consistency is still not guaranteed by
   the existing `--ff-only` flag).

**Chosen fix:** resolve the already-fetched upstream tip to a full
verified Git object ID, compare it along with branch, upstream name,
HEAD and eligibility on the second inspection, and pass that pinned
OID to `git merge --ff-only --quiet`. Git remains the authority for
worktree/index/ref lock conflicts; this is not a universal transaction
across third-party Git processes. Do not silently retry a changed
repository, fetch, reset, stash, rebase, force or run a shell.
Validate the OID as 40/64 ASCII hex before passing it as argv.

### Implementation stages and gates

1. [x] Keep public `safe_pull(repo)` and `OperationOutcome` unchanged.
   Introduce a private, testable operation with controlled checkpoints
   to simulate precisely timed external ref changes using real Git.
2. [x] Pin and revalidate upstream identity/OID and HEAD before the
   actual merge. Abort with existing actionable concurrent-change
   error when any invariant changes; use pinned OID for the merge.
   Do not modify `fetch`, the GitHub monitor, or Settings.
3. [x] Deterministic real-Git tests:
   - same behind-count but different upstream tip during recheck
     produces error and leaves HEAD/worktree untouched;
   - upstream reconfigured to a distinct tracking ref with equal
     behind-count produces error;
   - upstream moves **after** the final check: merge uses
     the original validated commit, not the new ref;
   - normal fast-forward and existing refusal cases continue
     to behave unchanged. No sleep, shell, or network.
4. [x] Review source/diffs/format; run the final STABLE Preflight once
   on the complete code-and-test candidate, including core integration
   tests and desktop compile. Native physical testing for actual
   third-party concurrent process races remains deferred to
   [issue #15](https://github.com/morozhenko-apps/repoticker/issues/15).
5. [x] Record evidence, exact SHA, remaining risks and rollback in a
   separate docs-only commit. No new release, tags, `main` promotion
   or full v0.9 Mode B campaign.

### Rollback / compatibility

Revert the P1-G1 code-and-test commit. The change is internal to
`repoticker-core`: no persisted data/schema, public API, Settings,
GitHub App permissions or release signing changes. Under races the
correct behavior becomes a fail-closed error or an exact validated
fast-forward; existing clean, stable upstream branches keep the
same result. `git merge --ff-only` remains mandatory, so the
existing local Git safety contract is preserved.

Known limit: there is no cross-process global Git lock covering the
entire series of `inspect` calls. An external process may still
modify the checkout during the final native Git operation. This slice
does not claim to solve cancellation/timeouts, hooks or every
worktree/index conflict, all retained in the broader P1 roadmap.

## P1-G1 implementation checkpoint — 2026-10-23

- **Native/core source and deterministic real-Git regressions** committed
  on `dev` as [`00183c3`](https://github.com/morozhenko-apps/repoticker/commit/00183c3fd236d2a867728e1d69ef84856fbe8cfa).
  The code reads full verified 40/64-digit commit IDs and compares
  current HEAD, current upstream name, upstream commit ID and
  `SyncDecision` against the initial observation. The mutation
  uses `git merge --ff-only --quiet <validated full OID>`.
- Three deterministic race fixtures use **real local Git** and
  checkpoint callbacks without sleeps or network: equal behind-count
  ref move, equal behind-count upstream reconfiguration, and a ref
  move immediately before the merge subprocess. Stable normal-case
  integration tests remain in the core suite.
- First source [Preflight #40022648349](https://github.com/morozhenko-apps/repoticker/actions/runs/40022648349)
  reported **Rustfmt-only** differences and did not execute the core
  test step. The corresponding [`a80f045`](https://github.com/morozhenko-apps/repoticker/commit/a80f045d4d842147140074ce5cdb701feaf97df6)
  is a mechanical formatting correction taken from the CI diff.
- A separate local Git diagnostic reproduced two distinct upstream
  commits with unchanged `HEAD...@{upstream}` ahead/behind values
  `0 1` before/after a tracking-ref move; merging the pinned first
  OID advanced to the first commit, not the changed upstream target.
  This validates the underlying Git behavior, **not** the compiled
  RepoTicker Rust tests or physical desktop acceptance.
- **Final stable Preflight candidate:** `a80f045d4d842147140074ce5cdb701feaf97df6`;
  [workflow #40022758425](https://github.com/morozhenko-apps/repoticker/actions/runs/40022758425)
  was pending at this checkpoint. Do not claim it passed without
  inspecting the exact run's final jobs.
- **Still deferred:** native KDE/Windows process-race smoke, hostile
  hooks/config, long-running SSH/Git cancellation, atomic config,
  and cross-process operation contention. No release, tag or `main`
  promotion. This stage's physical verification remains in #15.


## P1-G2 — explicit, bounded-scope Fetch cancellation (2026-10-23)

### Evidence, limits, and root-cause protocol

Existing `git::invoke` executes Git with `Command::output()`. For a
hung `git fetch` (SSH transport, credential helper, remote connection),
that blocks indefinitely, offers no live child handle, and holds the
desktop's per-operation lock. The UI disables Fetch while busy; there
is no cancellation command. Fetch is bounded to four parallel repos
but an entire batch waits on all workers, so one stuck child can stall
the whole batch.

Plausible causes for an actual stall are: (1) unreachable/slow remote
server; (2) SSH transport process waiting on interactive authentication;
(3) external Git credential helper not honoring terminal prompt settings;
(4) proxy/network connection hanging; (5) Git hooks/configured process
helpers blocking; (6) long-lived repository lock or external Git
operation; (7) an event/IPC presentation failure. The **confirmed
architectural limitation** is the absence of a cancellable child
process lifecycle; actual remote causes remain unmeasured.

### Scope and decisions

Implement explicit user-triggered cancellation of **Fetch only**.
Never abruptly kill an already executing `git merge --ff-only`:
interrupting a worktree/index mutation can leave partial state.
Retain native `perform_git_action` and `git::fetch` for compatibility;
add only a local Tauri IPC `cancel_git_fetch`. Reuse the existing
Fetch button in the same four-button compact layout: it becomes
`Cancel` during an active Fetch and `Stopping...` when acknowledged.
Tray-started Fetch is also cancellable from the card when visible.

For cancellable Fetch, launch Git as an owned, independently terminated
OS child process (process group on Unix; process-tree stop on Windows).
Keep cancellation authority strictly tied to the current RepoTicker
fetch generation/owned child PIDs. Use a single locked cancellation
registry to resolve cancel-before-spawn and spawn-after-cancel races.
A cancelled future batch must not start new Git remote calls.
Cancellation must not use sleeps, busy polling, arbitrary per-repo
timeouts, forced Git ref resets, global process-name killing, or
shell-interpolated user data.

Preserve `GIT_TERMINAL_PROMPT=0`, bounded stderr handling and argv-only
invocation. If an interrupted Fetch updated some tracking refs, state
is **partial/unknown until freshly inspected**; never claim a
transactional rollback or touch worktree files. The UI must report
`cancelled` independently from an error, and keep real failures
visible.

### Milestones and validation

1. [x] Add cancellable native Git Fetch subprocess execution, with
   child-group lifecycle, generation-controlled cancellation and
   deterministic tests for cancel before launch, during a live
   process and launch/cancel races. Preserve old `fetch` contract.
2. [x] Wire desktop active-operation state and cancel IPC independently
   of `OperationLock`; ensure it can interrupt a blocked worker.
   Clear active operation only after all workers return.
3. [x] Reuse the existing Fetch action UI for Cancel/Stopping, without
   changing compact card dimensions, Safe pull semantics or other
   controls. Add source/model interaction tests for the cancellation
   state and native IPC wiring.
4. [ ] One final stable test gate after implementation. Run Rust
   core tests, JS contracts, Rustfmt/Clippy, Linux desktop compile
   through exact-SHA Preflight. Record failures honestly; no mid-task
   repetitive suite runs.
5. [ ] Commit evidence separately. KDE cancel of a truly blocking
   SSH/credential-helper transport and Windows process-tree termination
   remain **physical acceptance** in issue #15.

Rollback: revert code/test commit(s); published v0.2.0 and existing
per-user config remain unchanged. No GitHub App permission, local Git
selection, credential migration, tag, or release change.

Limits: cancellation is user-requested, not a hidden automatic timeout.
A SIGKILL/taskkill can interrupt Git ref maintenance; the next Fetch
is responsible for recovering ordinary remote-tracking freshness.
An external helper that explicitly detaches into a new process group
or escapes Windows's process tree is outside this slice's guarantee.

### P1-G1 verified final gate

[Preflight #40022758425](https://github.com/morozhenko-apps/repoticker/actions/runs/40022758425)
for `a80f045d4d842147140074ce5cdb701feaf97df6` was
**completed SUCCESS** (4/4: Rust format/core/Clippy, JS, Linux
desktop compile and aggregate gate). This confirms source-level
verification, not physical inter-process race acceptance.

### P1-G2 implementation checkpoint

- `2cc5430712472ae4df530f43aa34d9d63e148eb8`:
  explicit `FetchCancellation` keyed to its owned Git child processes.
  A cancellable Fetch uses the existing argv-only Git command plus
  a process group on Unix / native Windows `taskkill /PID /T /F`.
  Cancellation registers PIDs before waiting and orders registration
  with the cancel flag under one lock. A stopped Fetch reports
  `Git fetch cancelled`, distinct from a successful Fetch.
- `e8c1d8d93e54d04f8256a468e5bb4a91326b9c8a`:
  desktop `ActiveFetch` state and independent `cancel_git_fetch`
  IPC, existing four-button compact UI and three source/security
  regression tests. The Fetch action becomes Cancel/Stopping only
  while Fetch is running; Safe pull still runs sequentially, without
  any new kill/cancel path.
- `6d055fc9876ba04aa48fe76335caf29ddf9126d9`:
  Windows process-tree termination errors fail closed; a registration
  state failure cleans up the freshly spawned child group.
- Test additions: three real subprocess lifecycle tests in Rust
  (pre-cancel before spawn, cancel registered live group with a
  descendant, cancel between process spawn and registry insert)
  and three JS source/interface contracts. These tests have been
  committed but must not be reported passing before final CI.
- Final candidate source SHA:
  `6d055fc9876ba04aa48fe76335caf29ddf9126d9`.
  [Preflight #40026440322](https://github.com/morozhenko-apps/repoticker/actions/runs/40026440322)
  **pending as of this checkpoint**. Exact status and any errors
  must be checked, not inferred from source changes.
- Physical acceptance remains open in [issue #15](https://github.com/morozhenko-apps/repoticker/issues/15):
  KDE blocked SSH helper, cancel at batch boundaries, late cancel,
  Windows process-tree cleanup and partial Fetch ref inspection.
  No new release, main promotion or runtime acceptance is claimed.
