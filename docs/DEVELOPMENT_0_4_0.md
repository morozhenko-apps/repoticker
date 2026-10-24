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

### P1-G2 CI correction checkpoint

Initial source [Preflight #40026440322](https://github.com/morozhenko-apps/repoticker/actions/runs/40026440322)
at `6d055fc` failed in the Rust-format gate and one JS
source-contract check. Rustfmt expected layout-only differences in
`main.rs` and `git.rs`; the assertion expected an earlier
`if !cancel.register(pid)?` branch, although the implementation
had already switched to `match cancel.register(pid)` with cleanup
on registration errors. The core test gate was not reached.

Code/test correction: [`11db98e`](https://github.com/morozhenko-apps/repoticker/commit/11db98ed6fb6f5ac64effa0c5120ceefe60936c5).
All 12 exact CI Rustfmt hunks were applied and the source-contract
test now requires the current registration match and cancelled branch.
Latest exact-SHA [Preflight #40026763071](https://github.com/morozhenko-apps/repoticker/actions/runs/40026763071)
is pending at this checkpoint. Do not claim source-level completion
until Rust format/core/Clippy, JS and Linux desktop compile all pass.
Physical KDE/Windows acceptance remains deferred to #15.

### P1-G2 core and JS test evidence

Exact code SHA: `11db98ed6fb6f5ac64effa0c5120ceefe60936c5`.
[Preflight #40026763071](https://github.com/morozhenko-apps/repoticker/actions/runs/40026763071)
has verified the Rust format/core/Clippy job **SUCCESS** with
21 Rust unit tests + 8 Git integration tests = 29 passed, 0 failed.
The JS workflow was also **SUCCESS**, including 133 passing Node tests
and 10 passing Python release-contract tests. Linux desktop compilation
was **in progress** as of this checkpoint; do not claim 4/4 until
that exact job and aggregate final gate pass. The source tests do
not replace physical KDE/Windows cancellation/SSH-helper acceptance
tracked in #15.

## P1-G3 — atomic configuration transactions and last-good recovery (2026-10-23)

### Evidence and problem

The desktop stores ordinary non-secret preferences in per-user
`config.json`, but `main.rs::write_config` uses `fs::write` directly.
An interrupted/failed write can truncate the only valid copy. Five
native mutators independently perform `read_config` -> mutate ->
`write_config`; concurrent Tauri commands can each read the same
old state and silently overwrite one another's changes. A malformed
JSON primary currently prevents the UI from starting local scanning
and Settings; no recovery path exists.

Plausible causes of damage or lost settings include: (1) truncated
direct writes on termination/disk full; (2) read-modify-write races
between Tauri commands; (3) malformed manual edits; (4) filesystem
permission/readonly errors; (5) interrupted rename or directory-sync
after write; (6) backup missing/corrupted; (7) an external process
editing this same file. The confirmed design failures are **(1) and
(2)**. The remaining cases are acceptance/test inputs, not invented
incident reports.

### Design / invariants

- Keep the **existing JSON schema and defaults**, package identity and
  file location; no schema migration or user action on healthy config.
  Do not store GitHub access tokens in config or backups.
- Implement a portable, independently tested JSON file adapter in
  `repoticker-core`; the Tauri layer continues to own `Config`
  and its validation. Writes stage a unique exclusive temporary file
  **beside the destination**, write/flush its bytes, sync the file,
  then atomically rename into place. Sync containing directory on Unix
  for crash-durability. Protect temp/backup contents with owner-only
  Unix permissions. On failure, keep the existing primary intact and
  remove abandoned staging files where feasible.
- Before replacing an existing *valid* primary, atomically snapshot it
  into `config.json.bak`. This backup represents the prior last-good
  configuration, intentionally not necessarily the newest. A first
  install without a previous primary has no backup until a later save.
  Refuse to replace a valid backup with malformed content.
- Read precedence: valid primary wins; missing primary + valid backup,
  or malformed primary + valid backup, recovers the backup into primary.
  Preserve the malformed original in an exclusive
  `config.json.corrupt.*` quarantine before recovery. Never silently
  initialize defaults if an existing config or backup is invalid and
  no valid recovery exists. Return a clear, actionable error, preserving
  both files. Recovery is idempotent; concurrent local operations are
  serialized.
- Protect the entire desktop read-modify-write transaction using one
  Tauri-managed mutex. A standalone read also takes that lock, so
  read-triggered recovery cannot race a native write. Emit config
  changed events **after** releasing the lock. This gate is per-process:
  external editors/second processes are not mutually excluded.
- Do **not** change Git safety behavior, card geometry, user locale
  selection or monitoring credentials. Unknown future JSON fields
  retain current serde behavior (not a new compatibility promise).

### Implementation / regression gates

1. [x] Extract JSON persistence adapter with explicit path argument,
   ordinary serializer/deserializer, atomic write and backup recovery.
   Test newly created file, backup of previous valid version, malformed
   primary restoration with preserved quarantine, missing primary with
   backup, two invalid copies fail closed, missing files use caller's
   defaults, denied paths and abandoned staging cleanup.
2. [x] Apply `ConfigStoreGate` to every native read and update.
   Convert all config-mutating commands to a closure-based serialized
   transaction. Retain existing validation and public Tauri arguments.
3. [x] Add core real-filesystem tests and focused source checks
   confirming every settings mutator uses transactional update and
   never bypasses the atomic writer.
4. [ ] Run final stable Preflight once for exact code SHA:
   Rustfmt, core tests, Clippy, JS/release contracts and Linux
   desktop compile. If it fails, repair root cause and rerun affected
   checks, not blanket repetitive suites.
5. [ ] Commit final evidence in a separate docs-only commit and add
   physical KDE/Windows config corruption/recovery, permissions and
   interrupted-save tests to issue #15. No `main` promotion, tag,
   version bump or release.

### Recovery limitations and rollback

The backup is deliberately the **previous** known-good snapshot, so
a recovery can lose the single newest settings edit, but never invent
values. Restore of a readable malformed primary keeps diagnostic
evidence outside the active config path; it never triggers an
unprompted deletion of repositories. If backup and primary are both
invalid or a repair cannot be written, report error instead of wiping
preferences. Interruption between distinct file replacements still
permits either old or new complete JSON, not torn JSON. The
cross-process editor case and Windows physical filesystem behavior
remain separate acceptance items.

Rollback via the P1-G3 code commit returns to the prior writer without
altering schema; pre-existing `.bak` and quarantined `.corrupt.*`
files are non-authoritative to the old binary and should be retained.

### P1-G3 implementation checkpoint

- `79f89794ce0e2c4c54053e74210bfa54c7bd914b`:
  `repoticker-core::config_store` atomic JSON adapter and real
  filesystem tests. Existing JSON format and defaults remain intact.
  A corrupt primary is quarantined and recovered from a validated
  `.bak` snapshot; invalid copies fail closed.
- `6b76fedfd3d0de46b541ed1245bdc271068c6c0a`:
  `JsonStore` per-process transaction mutex managed by Tauri;
  all five Settings/account/language/root native mutations are now
  serialized and source-checked. Core tests also exercise concurrent
  read/modify/write threads with real filesystem updates.
- `e05f9f01ebe295e09a52d2b26ba7babd259241a5`:
  stage/quarantine lifecycle cleanup without leaked guard memory and
  removal of obsolete direct-file import.
- `27fddf3712bf1d0f0d0958544db99411698cb271`:
  source audit discovered the **sixth** config mutation: KDE card
  drag margin persistence in `linux_surface.rs`. It now uses the
  same transaction gate, preventing lost Settings updates when drag
  and Settings save overlap.
- Added real filesystem test cases for healthy write/backup,
  damaged primary with preserved original, missing primary,
  two invalid copies, failed backup write, abandoned staging,
  old serde defaults and sixteen concurrent increment updates.
  Exact test counts are pending final CI.
- **Exact code candidate:** `27fddf3712bf1d0f0d0958544db99411698cb271`.
  [Preflight #40030663598](https://github.com/morozhenko-apps/repoticker/actions/runs/40030663598)
  was pending at this checkpoint. Do not claim core/desktop
  compilation or physical filesystem acceptance without evidence.

Remaining risks: no inter-process file locking against external
editors, platform-specific Windows rename/flush semantics require
real-device acceptance, and an interrupted rename may leave the
prior backup (not necessarily the newest edit). Schema and
public release unchanged.

### P1-G3 source and CI formatting checkpoint

- Core atomic JSON adapter: `79f8979`; native transactions: `6b76fed`;
  cleanup: `e05f9f0`; KDE margin fix: `27fddf3`;
  test contract correction: `03ecfdb`; mechanical Rustfmt:
  [`adfd71c`](https://github.com/morozhenko-apps/repoticker/commit/adfd71cf1dca626f6bb35b75eb05a20e351c54e4).
- Source test diagnostics from prior, superseded candidate `27fddf3`:
  Rust format-only differences (17 hunks), and an obsolete source
  regex for the staging rename field. The core tests did not execute
  because the Rust workflow enforces formatting first.
- All exact 17 Rustfmt hunks were applied from the CI log. The
  source-regex mismatch was corrected without changing production logic.
- **Final exact-SHA stable candidate:** `adfd71cf1dca626f6bb35b75eb05a20e351c54e4`;
  [Preflight #40030876982](https://github.com/morozhenko-apps/repoticker/actions/runs/40030876982)
  was running as of this checkpoint. Do not treat a previous
  cancelled run as passing or as an executed core test.
- Physical KDE/Windows verification remains in
  [issue #15](https://github.com/morozhenko-apps/repoticker/issues/15).

### P1-G3 verified core and UI test counts

Exact code/test SHA: `adfd71cf1dca626f6bb35b75eb05a20e351c54e4`.
[Preflight #40030876982](https://github.com/morozhenko-apps/repoticker/actions/runs/40030876982)
reported Rust format, `repoticker-core` unit/integration tests and
Clippy **SUCCESS**: 32 unit tests and 8 Git integration tests,
40 Rust tests passing, 0 failures. JS workflow was also **SUCCESS**:
136 Node tests, 0 failures, plus 10 Python release contract tests.
Linux desktop compile remained in progress when these counts were
collected, so the aggregate 4/4 source acceptance is not yet
established. This check is source CI evidence only; native
KDE/Windows interrupted-save/recovery remains open in issue #15.

## P1-UI1 — interactive repository action menu and GitHub shortcut (2026-10-23)

### User evidence and diagnosis

The owner supplied a KDE Wayland screenshot: the repository ellipsis
opens a nearly transparent-looking menu with unclickable rows; labels
from neighboring repository rows paint through the menu.

Confirmed in `apps/desktop/ui/style.css`: every `.repo-row` declares
`isolation: isolate` and `position: relative`, and the menu is an
absolute descendant of that row. Each isolated row is a separate
stacking context, so `.repo-menu { z-index: 12 }` cannot lift its
children above later sibling rows. The scrolling `.rows` container
can also clip the menu at the edge. This is a paint/hit-testing
problem, **not** an opacity bug or an intentional disabled state.

Candidate causes considered: (1) isolated stacking context (confirmed);
(2) nested scroll clipping (confirmed by DOM/CSS structure);
(3) menu opacity (CSS has opaque background);
(4) inherited button disabled state (buttons are not disabled);
(5) global transparent GTK window (not required to explain the
overlap); (6) pointer capture from drag gesture (buttons explicitly
excluded); (7) refresh recreating rows (separate lifecycle risk).

### Design / acceptance

- Use **one** reusable action-menu element, as a sibling of the
  scrollable repository list and a child of the repository drawer.
  Position it relative to the drawer using the triggering ellipsis
  button's actual client rectangle, clamp inside drawer bounds,
  and open upward near the drawer's bottom. Preserve opaque
  background, adequate hit target and z-order.
- Update `aria-expanded` and menu focus/escape/outside-click
  behavior. Hide the menu on scrolling, row refresh, drawer close,
  card hide and active selection change. Avoid a menu anchored
  to a detached/removed row.
- Keep exactly the existing four compact action buttons and existing
  per-repository Fetch/Safe pull semantics. Add a third action
  `Open on GitHub`: browser URL resolved **on demand** by native
  Git from the enrolled checkout's configured `origin` remote,
  supporting HTTPS and standard SSH GitHub remotes. Do not add Git
  subprocesses to background scans. Do not accept browser URLs from
  arbitrary frontend input; require explicit root enrollment,
  exact `github.com` host, validated owner/repo path, and an
  argv-based browser invocation. Non-GitHub/missing origin returns
  a visible explanation instead of opening an arbitrary URL.
- Add deterministic menu geometry/lifecycle tests, URL parsing
  and real Git origin tests, native enrollment/browser security
  contract tests; one complete STABLE Preflight for exact SHA.
  Physical hover/click/keyboard and scroll acceptance stays
  in [issue #15](https://github.com/morozhenko-apps/repoticker/issues/15).
- No config changes, Git mutation policy changes, new platform
  dependencies, publishing/tag/main promotion or release.

### Steps

1. [x] Extract pure menu geometry and install a drawer-level popup
   with working event handling, viewport-aware placement and tests.
2. [x] Add origin-to-GitHub URL translation in the core Git provider,
   with positive and injection/foreign-host tests.
3. [x] Add native enrolled-path-only open command and reusable
   existing OS external-browser launch behavior.
4. [ ] Run final Preflight; record exact source SHA and test results
   in a docs-only commit, not conflated with code.
5. [ ] Keep physical KDE/Windows click and browser acceptance open.

Rollback: revert the UI1 code/test commit(s); restores prior menu
placement and removes the third command without altering saved
preferences, credentials, repositories or public distribution.

### Implementation checkpoint

- [`4bb1734`](https://github.com/morozhenko-apps/repoticker/commit/4bb1734cc2aa5814bd107118f5f514f1e3ebefc8): a single opaque drawer-level menu lives outside
  the isolated repository rows and scroll-clipped `.rows` viewport.
  Geometry is bounded to the drawer, flips upward near its bottom,
  and dismisses on scroll, refresh, Escape, outside pointer, hide,
  and view reset. The UI retains exactly four compact buttons.
- [`4328b2c`](https://github.com/morozhenko-apps/repoticker/commit/4328b2cab79b76575565b9645d2cd7a799655de9): the third action `Open on GitHub`
  uses new native `open_repository_on_github`, rejects non-enrolled
  checkout paths, calls `git remote get-url origin` on demand,
  accepts only validated github.com HTTPS/SSH repository names
  and opens a canonical HTTPS URL using the existing OS browser.
  No automatic network fetch, token access, or remote mutation.
- Focused regression tests: pure geometry and menu lifecycle
  contracts, native trust-boundary checks, malicious remote URL
  rejection and a temporary real-Git `origin` fixture.
- Exact initial source candidate: `4328b2cab79b76575565b9645d2cd7a799655de9`;
  [Preflight #40032393519](https://github.com/morozhenko-apps/repoticker/actions/runs/40032393519)
  was queued at this documentation checkpoint. Tests and KDE
  physical hit-testing should not be called accepted yet.

### P1-UI1 source verification checkpoint

- Initial `4328b2c` Preflight stopped before Rust compilation
  because a shared-browser refactor omitted one closing brace
  in `open_actions_job`; the same Rust job identified mechanical
  Rustfmt differences in the new Git code and real-Git fixtures.
  The JavaScript tests on this candidate succeeded.
- Code/tests correction: [`3e42bc7`](https://github.com/morozhenko-apps/repoticker/commit/3e42bc7061d6d35dbfcb746e29cb8fd9faf5ba85)
  closed the native function, preserved the prior Actions URL
  allowlist and applied all seven Rustfmt source hunks.
- Exact-SHA [Preflight #40032588368](https://github.com/morozhenko-apps/repoticker/actions/runs/40032588368):
  Rust format/core tests/Clippy job **SUCCESS**: 32 core unit
  + 8 existing Git integration + 3 new GitHub origin integration
  = **43 Rust tests passed**. JavaScript/release contract job
  **SUCCESS**: **141 Node tests** and **10 Python tests** passed.
  Linux desktop compilation remained in progress when recorded;
  do not mark 4/4 success unless the exact aggregate gate passes.
- Browser opening remains an intentional user action only. The
  dropdown is not physically accepted until KDE/Windows tests
  verify pointer hit-testing, scroll and keyboard dismissal,
  correct remote URL and preserved four-button card geometry.

## P1-UI2 — local repository actions (Open folder / Copy path)

Mode: **A — Feature / Refactor**. Date: 2026-10-23.
User physically confirmed the P1-UI1 repository action-menu fix works on
KDE. Source candidate \`3e42bc7\` also passed
[Preflight #40032588368](https://github.com/morozhenko-apps/repoticker/actions/runs/40032588368)
4/4; this confirms source CI, not Windows physical acceptance.

### Feature contract and rationale

The shared repository action menu currently offers Fetch, Safe pull,
and Open on GitHub. Opening an enrolled local repository in the user's
system file manager and copying its canonical absolute path are useful
manual desktop navigation actions that complement GitHub links. These
actions **do not** perform network, Git mutation, or config writes.
Maintain the existing fixed four-button compact card.

A security review of the existing GitHub opener showed duplicate
in-command enrollment checking. Deduplicate this into a **pure native
Git/core checkout resolver** shared by all three user-triggered
navigation/copy commands. The caller passes saved enrolled roots, the
requested path is canonicalized by existing \`normalize_root\`, and
\`discover_all\` validates membership using existing root/direct-child
rules. Arbitrary WebView paths may never reach the OS opener or
clipboard, even if supplied to IPC manually. An explicitly enrolled
linked worktree continues to be supported, but implicit traversal
into unregistered worktrees remains forbidden.

- **Open folder**: open only that validated on-disk directory with
  the OS file manager (Linux \`xdg-open\`, Windows \`explorer.exe\`,
  macOS \`open\`) via argv, no shell. Report native launch failures
  as actionable UI errors.
- **Copy path**: write the canonical absolute path using the existing
  native clipboard plugin. Reject paths not representable as UTF-8
  rather than silently substituting Unicode replacement characters.
  No arbitrary client-provided clipboard text, no clipboard reads,
  no new plugin capability or token exposure.
- **Open on GitHub**: preserve the exact original GitHub HTTPS/SSH
  validation and open behavior, but share enrollment verification.
- **Menu**: now five options, same single opaque drawer-level popup;
  maintain scrolling, edge clamp/flip, Escape, focus and outside-click
  behavior. No duplicated menus or new compact-card buttons.
- On successful local navigation, remain silent as with existing
  successful Git actions. Real errors surface via the existing notice.
  Do not introduce new persistent logs or success toasts.

### Implementation stages and acceptance

1. [x] Extract tested \`resolve_enrolled_checkout\` into core Git,
   prove canonical membership, direct-child enrollment, linked
   worktree explicit enrollment, and non-enrolled/invalid path refusal.
2. [x] Reuse one native path resolver across existing GitHub open plus
   new \`open_repository_folder\` and \`copy_repository_path\` Tauri IPC
   commands. Write clipboard natively and open the folder argv-only.
   Preserve cross-platform compile and no permission increase.
3. [x] Add two menu options and source contract tests for their native
   handlers; maintain five-option geometry and four compact buttons.
4. [x] Run final stable Rustfmt/core/Clippy + JS/release +
   Linux desktop compile Preflight once on exact code SHA, fix only
   identified regressions, and record complete evidence in a docs-only
   checkpoint.
5. [x] Defer physical KDE file-manager activation, copied Unicode
   path, Windows Explorer, focus and external Git operations to
   [acceptance #15](https://github.com/morozhenko-apps/repoticker/issues/15).

Rollback: revert P1-UI2 executable commit(s). No schema/migration,
Git worktree mutation, authorization scope, networking, installer,
tag, \`main\` promotion or published version changes.

### Identified limits

Resolving membership runs a bounded local Git discovery pass on
explicitly enrolled roots at the time of the click. This is not
background polling and cannot enumerate arbitrary recursive checkout
trees. The system file manager and clipboard can fail or be absent
on unsupported hosts; errors must be displayed rather than faked.
 
### Implementation checkpoint

- Code and source-contract tests committed as
  [`798f604`](https://github.com/morozhenko-apps/repoticker/commit/798f604b198285c983d5d46ac81ae0d7a54ca745).
  The Git provider gained `resolve_enrolled_checkout`, a common
  canonicalized root/direct-child enrollment authorization function.
  Existing GitHub opening now uses the same check as both local actions.
- `open_repository_folder` starts only the OS file manager on
  the validated absolute checkout path via argv; `copy_repository_path`
  uses the existing native clipboard manager to write only that path.
  Both commands resolve membership on a blocking worker, avoiding
  desktop UI blocking on Git discovery.
- Five menu items: Fetch, Safe pull, Open on GitHub, Open folder,
  Copy path. No new compact-card button, process polling, config
  field, network call or Git mutation.
- Added core integration cases for an enrolled child, unrelated
  checkout rejection, missing/relative paths, and explicitly
  enrolled linked worktree versus implicitly discovered child.
  Added JS source contracts for all three native navigation
  commands, argv-only folder opener, clipboard-write-only flow
  and the five-item popup.
- Final exact source candidate: `798f604b198285c983d5d46ac81ae0d7a54ca745`.
  [Preflight #40034754778](https://github.com/morozhenko-apps/repoticker/actions/runs/40034754778)
  was in progress at this checkpoint. Do not claim test/desktop
  success before inspecting final jobs. Native KDE/Windows
  acceptance remains deferred to issue #15.

### Final-source verification checkpoint

- Initial source \`798f604\` ran JavaScript checks successfully but
  Rustfmt identified four purely mechanical formatting differences
  (no compiled core-test outcome is implied by that early gate).
- The exact four formatting hunks were applied in
  [\`3bb4a8f\`](https://github.com/morozhenko-apps/repoticker/commit/3bb4a8f024a55e9e4d30230838dbd96a522a0cb1).
- Candidate [Preflight #40034851785](https://github.com/morozhenko-apps/repoticker/actions/runs/40034851785)
  was pending when this checkpoint was recorded. Mark this
  **source validation pending** until the four jobs are complete;
  no public release or main synchronization was attempted.
- Owner independently confirmed that the earlier three-item menu
  overlap and click problem is fixed on KDE (2026-10-23).
  Physical acceptance of the newly added local actions,
  Unicode clipboard paths, explicit worktrees and Windows
  file manager remains tracked in [issue #15](https://github.com/morozhenko-apps/repoticker/issues/15).

### Verified P1-UI2 test counts

Source code/test candidate \`3bb4a8f024a55e9e4d30230838dbd96a522a0cb1\`.
[Preflight #40034851785](https://github.com/morozhenko-apps/repoticker/actions/runs/40034851785)
reported the Rust format/core tests/Clippy job **SUCCESS**:
32 core unit tests + 10 Git integration tests (including two new
enrollment/worktree cases) + 3 GitHub remote integration tests =
**45 passed, 0 failed**. The JS/release job was also **SUCCESS**:
**144 Node tests** and **10 Python release tests** passed with
zero failures.

Linux desktop compilation was still in progress at this
checkpoint. The final aggregate 4/4 gate must be checked on the
exact SHA before declaring source-level completion.
Actual KDE/Windows file-manager and native clipboard interaction
remains part of physical acceptance #15.

## P1-SCAN1 — bounded local Git inspection and reduced subprocesses

Status: **Mode A / development**, 2026-10-23. Scope: `dev`
only, no version bump, tag, `main` promotion or broad Mode B campaign.

### Evidence / root-cause protocol

The owner's previous opt-in startup trace documented **5–7 sec
per full local scan** for the then-current repository inventory,
with Git inspection dominant. `main.rs::scan` performs a serial
`for path in repositories { git::inspect(&path) }`, so independent
Git checkouts are unnecessarily blocked by earlier checkouts.

Each `inspect` currently checks six in-progress operation markers
by running `git rev-parse --git-path <marker>` once per marker.
This produces up to **six Git child processes per repository**
before the normal status result can be classified.

Plausible bottlenecks assessed: (1) serial per-checkout inspection
(confirmed); (2) six separate operation-marker Git invocations
(confirmed); (3) actual `git status` latency on large working trees
(unmeasured, **do not** skip its accuracy checks); (4) expensive local
Git worktrees/submodules (requires real-case data); (5) discovery
directory enumeration (previously around 60–100 ms only);
(6) slow GitHub monitor REST requests (independent and decoupled);
(7) repeated local scans on monitor events (already addressed by A2b,
retain no rescan contract).

### Design / safety invariants

1. Inspect discovered canonical checkouts with a **fixed upper
   bound of four** independent Git workers, reusing the tested
   `bounded_map` worker engine. No per-repo shell, no new
   background polling or Git network calls. Preserve full
   `git::inspect` verification, dirty tracked/untracked status,
   branch/upstream, ahead/behind and Safe pull eligibility.
2. The existing per-checkout `git_operation_in_progress` must
   inspect all six markers, but resolve the **absolute per-worktree
   Git admin directory once** via
   `git rev-parse --absolute-git-dir`. Git itself resolves this
   directory in normal checkouts and in linked worktrees.
   Joining each known literal marker in Rust replaces six separate
   `git rev-parse --git-path` subprocesses with one. This is
   not a reference mutation or a Git status shortcut.
3. Keep discovery/root boundary unchanged: enrolled root and
   direct-child checkout rules, no symlink traversal, no arbitrary
   recursion. Keep returned rows deterministically sorted by name/path
   and **preserve input-order errors** despite out-of-order workers.
   Every single repository error remains visible and isolated.
4. If the user has zero/one repositories, behavior is unchanged
   without additional timer, wait or fake progress. Cancellation of
   Fetch, separate Safe pull lock and GitHub monitor cache are not
   altered. Never assert a speedup absent before/after timings on
   the same real machine/repository set.
5. Accept that external Git clients can modify checkouts while
   inspection runs; the existing action-specific re-inspection
   and `--ff-only` remain the mutation safety gates.

### Plan / gates

1. [x] Add bounded, deterministic `git::inspect_all` to core
   and use from desktop scan, retaining error order and stable
   repository projections.
2. [x] Replace marker subprocess loop, validate correspondence
   between Git `--absolute-git-dir` and `--git-path` on both
   regular and explicitly enrolled linked worktrees.
3. [x] Real Git and focused JS/Rust tests for clean/dirty, behind,
   missing/broken checkout, marker detection, boundedness and
   no mutation/network in inspection.
4. [x] Run one final exact-source stable Preflight after changes:
   Rustfmt, Rust unit/integration + Clippy, JS and release
   contracts, Linux desktop compile.
5. [x] Commit evidence separately, track physical KDE cold/warm
   startup comparison in [issue #12](https://github.com/morozhenko-apps/repoticker/issues/12)
   and broader acceptance in #15.

Rollback is a revert of the code/tests commit(s). No persisted data,
Git remote configuration, login, permissions, card geometry, or
release artifacts change. A real performance claim requires a
comparative `REPOTICKER_STARTUP_DEBUG=1` sample on Alcotester
showing `git.inspect_all` and `git.scan_total` timing from the
same enrolled checkout inventory.

### P1-SCAN1 source checkpoint

- Source/tests committed on `dev` as
  [`12bd7f0`](https://github.com/morozhenko-apps/repoticker/commit/12bd7f0036ae66f1cf840a738006f7a9453f76eb).
  A fixed four-worker `git::inspect_all` reuses the bounded core
  executor and restores discovery order with an explicit index
  before presenting per-repository successes or errors.
- The six known operation-marker checks now query one
  `git rev-parse --absolute-git-dir` per checkout, then test the
  marker paths locally. No change to `inspect` dirty/upstream,
  actual FastForward classification or `safe_pull` mutation rules.
- Three new real Git integration regressions cover stable
  input-order and isolated errors, unfinished rebase marker
  preventing Safe pull, and all Git marker paths in normal
  and explicitly linked worktrees. JS checks confirm bounded
  scanning and the retained six marker names.
- **Initial exact code/test SHA:**
  `12bd7f0036ae66f1cf840a738006f7a9453f76eb`;
  [Preflight #40036202153](https://github.com/morozhenko-apps/repoticker/actions/runs/40036202153)
  was queued at this checkpoint. Do not claim tests/compile
  or improved wall-clock performance before evidence.
- Native before/after `REPOTICKER_STARTUP_DEBUG=1` benchmarking
  remains on owner hardware in issue #12, and linked-worktree
  physical acceptance remains in #15.

### P1-SCAN1 CI correction checkpoint

- Initial candidate `12bd7f0` passed Node/JS source contracts,
  but Rustfmt found four differences in new integration tests.
  The format-first Rust job did not execute the core tests.
- Correction [`3600eef`](https://github.com/morozhenko-apps/repoticker/commit/3600eef204938696202a0b9ce4702d71fc72873b)
  applies the four Rustfmt hunks; production Git logic unchanged.
- Current exact candidate: `3600eef204938696202a0b9ce4702d71fc72873b`.
  [Preflight #40036260294](https://github.com/morozhenko-apps/repoticker/actions/runs/40036260294)
  was pending at this documentation checkpoint. Rust core
  and desktop build acceptance are not yet established.
- The historical 5–7-second local-scan trace is from the
  older serial version, not a benchmark of this optimization.
  Cold/warm comparisons on identical repository sets remain
  required with `REPOTICKER_STARTUP_DEBUG=1`.

### P1-SCAN1 verified core and UI test counts

- Exact source/test SHA: `3600eef204938696202a0b9ce4702d71fc72873b`.
  [Preflight #40036260294](https://github.com/morozhenko-apps/repoticker/actions/runs/40036260294)
  completed its Rust formatting, core tests and Clippy job with
  **SUCCESS**: 32 unit + 13 Git integration + 3 GitHub origin
  integration = **48 Rust tests passed, 0 failed**.
- JS/release job also **SUCCESS**: 146 Node tests and
  10 Python release contract tests, all passed.
- Linux desktop compilation and aggregate Preflight job were
  still in progress at this checkpoint. Do not claim
  source-level 4/4 success before checking the exact final run.
- No physical before/after KDE performance measurement has been
  executed for this commit. Continue to record wall-clock
  evidence in issue #12 rather than attributing a precise
  percentage or seconds gained.

## P1-IGNORE1 — configurable shallow repository discovery exclusions (2026-10-24)

Mode: **A — Feature / Refactor**. Branch: `dev`. Roadmap authority:
[`P1 — Git provider hardening and Linux usability`](ROADMAP.md).
Existing published `v0.2.0`, `main`, and full v0.9 Mode B remain untouched.

### Verified baseline and architectural decision

[Preflight #40036260294](https://github.com/morozhenko-apps/repoticker/actions/runs/40036260294)
for source `3600eef` completed **4/4 success**, including bounded
local Git scan, 48 Rust tests, 146 Node tests and 10 Python release
contract tests. This is source-level evidence only: real KDE
before/after performance is still open in issue #12.

Current Git discovery scans an explicitly enrolled root or its
**direct children**; built-in hidden/snapshot/worktree/build ignores
are hard-coded in `git.rs::ignored_child`. The approved P1 roadmap
requests configurable ignores. To remain compatible with shallow
discovery, introduce exact **child directory names** (not recursive
paths/globs) applying to every enrolled parent root:
`ignored_child_names: Vec<String>`. The setting is **optional** and
defaults to empty on previous `config.json` files.

The setting is intentionally a *discovery* filter, not a prohibition
on user-enrolling an explicit repository root. For example, ignoring
`Archive` omits `~/GitHub/Archive` when the parent
`~/GitHub` is enrolled, but explicitly enrolling
`~/GitHub/Archive` independently still includes that checkout.
This preserves the existing explicit-enrollment contract.

Other implementation choices considered: arbitrary recursive globs
(break shallow discovery and expand input trust), absolute-path-only
exclusions (fragile when roots change and cumbersome in Settings),
and exact immediate-child names (chosen: deterministic, portable
and efficient). The agreed roadmap authorizes this additive
backward-compatible preference rather than introducing a new
persistent repository identity or security boundary.

### Invariants and acceptance

1. No recursive scan, symlink traversal, or user-defined Git command.
   Existing built-in ignores are always applied; users cannot disable
   them through this feature. Exclusion matching is exact and
   case-sensitive. Names may include Unicode/spacing and must be one
   valid path component. Reject empty/`.`/`..`, separators, NUL
   or control characters, overlong entries; max **100** names.
   Normalize surrounding whitespace and deduplicate deterministically.
2. Explicit enrolled Git roots always remain eligible regardless
   of their basename. Direct-child discovery checks the saved ignore
   list before `.git` probing or Git subprocess launch.
3. Filter consistently at every consumer: full local scan, single
   and bulk Fetch/Safe pull, `Open on GitHub`, `Open folder` and
   `Copy path`. Never allow an ignored child through a standalone
   IPC while filtering it out of the visible list. Preserve separate
   explicitly enrolled root bypass on all action paths.
4. Settings supports draft-only add/remove of ignored folder
   names with existing OK/Cancel transaction. Native
   `save_settings` validates and atomically persists them together
   with roots/language. A missing optional IPC argument preserves
   the previously saved ignore set. `get_settings_config`
   exposes it without Git discovery or network access.
5. Backward compatibility: missing `ignored_child_names` in old
   config deserializes to empty; `config.json.bak` and corrupted
   config recovery continue via existing JsonStore. Root deletion
   does not erase independent ignore names. Scope and tokens for
   GitHub monitoring are not affected.
6. Tests: isolated real Git temporary repositories, explicit-root
   override, Unicode/exact names, built-in exclusions unchanged,
   invalid input/limit/serialization and Settings OK/Cancel wiring.
   Final stable CI: Rustfmt/core/Clippy, JS/release, Linux desktop
   compile. KDE physical acceptance (Settings layout, choice, and
   exclusion effects) belongs in issue #15.
7. No new release/tag or `main` promotion, no version bump, no
   broad v0.9 Mode B campaign.

### Implementation checkpoints

1. [x] Core validation, filtered discovery and membership resolver,
   with backwards-compatible unfiltered public functions.
2. [x] Native persisted config and consistent use in all Git action
   and navigation entrypoints.
3. [x] Settings draft UI and focused Rust/JS integration regressions.
4. [x] One complete exact-SHA Preflight gate; repair only observed
   failures, record evidence separately.
5. [x] Deferred KDE/Windows physical acceptance, rollback notes.

### Rollback

Revert executable commits: the old binary ignores the additional
JSON property under current serde behavior and retains the old
discovery rules. Do not rewrite user config, delete repositories,
alter Git remotes, or remove any ignored child directory during
rollback. Failure to save a validated ignore set leaves the existing
config intact through the atomic settings transaction.

### Implementation checkpoint — source and tests

- [`e224bc3`](https://github.com/morozhenko-apps/repoticker/commit/e224bc34fd3be67931c948a1f0f3ac39a91256bd):
  backward-compatible core discovery functions, bounded sorted
  validation of exact immediate-child names and checked membership
  resolution with user-configured exclusions.
- [`ff8f77c`](https://github.com/morozhenko-apps/repoticker/commit/ff8f77ce4f6324f083d42c8f515ba723c56491be):
  serde-defaulted `ignored_child_names`, config-only Settings
  read, optional backward-compatible `save_settings` parameter
  and shared enforcement in local scans, Fetch/Safe pull and
  three enrolled-repository navigation/clipboard commands.
- [`ea7942d`](https://github.com/morozhenko-apps/repoticker/commit/ea7942d448670204d4fc5f4c05d423589455b618):
  collapsible Settings UI using existing OK/Cancel semantics,
  no permanent layout changes to the compact tray card.
- [`4f8ae08`](https://github.com/morozhenko-apps/repoticker/commit/4f8ae08230e085feded24bbacdd8fd113efc36dc):
  real-Git and JS regressions for implicit-vs-explicit
  enrollment, Unicode input, malformed names, built-in filters,
  legacy config defaults, native access consistency and
  transactional Settings form behavior.
- **Source candidate SHA:** `4f8ae08230e085feded24bbacdd8fd113efc36dc`.
  Preflight results, Linux desktop compilation, and KDE physical
  Settings acceptance are pending. Do not claim them before
  checking the exact CI run.

Known limit: names are global for all parent roots and match
case-sensitively; per-root exclusions, nested paths and wildcard
patterns are intentionally not in this small, approved shallow
discovery feature. A rollback reverts executable commits without
touching saved preferences or any repository files.
### P1-IGNORE1 first Preflight correction

The initial candidate `4f8ae08230e085feded24bbacdd8fd113efc36dc`
ran [Preflight #40096539268](https://github.com/morozhenko-apps/repoticker/actions/runs/40096539268).
Node JS/release contracts succeeded, but Rustfmt stopped the
format-first Rust job before core tests executed (12 mechanical
changes across main.rs, git.rs and git_integration.rs). Source
behavior and existing assertions were not changed to mask failures.

All 12 exact Rustfmt hunks were applied in
[`e4cf877`](https://github.com/morozhenko-apps/repoticker/commit/e4cf877fe84454243c93b025f0e7f687202aa894).
Exact-source candidate:
`e4cf877fe84454243c93b025f0e7f687202aa894`;
[Preflight #40096751875](https://github.com/morozhenko-apps/repoticker/actions/runs/40096751875)
was running at this checkpoint. No Rust unit/integration or
Linux desktop compile success is asserted before this run completes.

Physical KDE and Windows acceptance remains deferred to
[issue #15](https://github.com/morozhenko-apps/repoticker/issues/15).

### P1-IGNORE1 final-source test recovery checkpoint

- Candidate `e4cf877` passed Rustfmt, core tests and Clippy:
  **32 core unit + 16 Git integration + 3 GitHub remote =
  51 Rust tests passed, zero failures**.
- The same candidate's Node source-contract job had one failure:
  `tests/ignored-children.test.mjs` expected a Git function call
  on the same line as its assignment. Rustfmt introduced a harmless
  newline between `=` and `git::discover_all_with_ignored(...)`.
  The exact expression, filter and enrollment logic were unchanged.
- Test-only correction [`6a11885`](https://github.com/morozhenko-apps/repoticker/commit/6a11885adf82626bca9fa0e348cf30e4fc8d3168)
  now allows whitespace between assignment and call while still
  requiring the same specific native filtered-discovery function.
- **Final exact source/test candidate:**
  `6a11885adf82626bca9fa0e348cf30e4fc8d3168`;
  [Preflight #40096820859](https://github.com/morozhenko-apps/repoticker/actions/runs/40096820859).
  The JavaScript/release job was **SUCCESS** at this checkpoint;
  Rust and Linux desktop jobs were still running. Do not
  assert aggregate 4/4 or native physical acceptance yet.
- The published v0.2.0 remains immutable. Real KDE/Windows form
  and filter behavior remain tracked in issue #15.

## P1-SYNC2 — bidirectional Safe sync and targeted status refresh (2026-10-24)

Mode **A, Feature/Refactor**. Dev-only; no version, installer, `main` or published release changes. Baseline P1-IGNORE1 passed [Preflight #40096820859](https://github.com/morozhenko-apps/repoticker/actions/runs/40096820859) 4/4. Native KDE/Windows physical acceptance remains open in #15.

### Observed root causes

- The only Git sync command `safe_pull` allows clean, strictly-behind ff-only branches, but rejects `LocalAhead`. Its button/title never offers outbound synchronization.
- Status balloon `quota-details.mjs::timestamp` converts ISO `checkedAt` to `toISOString()`, then adds `UTC`, ignoring local OS/WebView timezone.
- `github-monitor.mjs` schedules a single full account collector and exposes no separate click-driven collection. Shared `checkedAt` makes independent refresh timestamps misleading.

### Safe sync specification

Keep Fetch a separate, explicitly cancellable operation. Replace the visible Safe pull operation with **Safe sync**, a conservative decision:
1. Check exact branch, upstream, clean worktree, no unfinished Git operation and ahead/behind state.
2. Strictly behind: existing offline fast-forward Safe pull unchanged. Strictly ahead: push only immutable local HEAD to same-named upstream branch, with single unambiguous remote and matching fetch/push destinations. Use explicit `<oid>:refs/heads/<branch>` refspec and **non-force** push, no tags, `--all` or `--mirror`, no shell.
3. Re-inspect HEAD, upstream tip, branch and eligibility just before pushing; server rejects non-fast-forward changes. Detached/no upstream, dirty, diverged, nonstandard remote mapping, renamed branch, config ambiguity and hooks failures fail closed or skip. Never auto-commit, rebase, stash or create upstream.
4. Serialize under existing native operation lock; preserve per-repo progress, Fetch cancellation and exactly four compact buttons. Outbound successes silent, errors visible.

### Targeted status and local time

- Runners and Tasks indicators are keyboard/click accessible while retaining their existing hover balloons. Runners requests only GitHub runner inventory; Tasks requests only Actions runs/jobs, never the other metric API or local Git scan.
- Manual clicks bypass the client's adaptive interval **but never** rate-limit cooldown, OS keyring authorization or account scope. Requests are bounded and coalesced.
- Preserve the other group's counts/coverage/check time. On failure invalidate only requested group's data, not its counterpart; account switch and disconnect still invalidate both.
- Maintain separate `checkedAtRunners` and `checkedAtTasks` ISO instants with legacy `checkedAt` fallback. Render in **local WebView timezone** without hardcoded UTC; no false successful checked time.
- Show refresh-in-progress feedback on clicked indicator; do not fabricate a fresh value while loading.

### Test and acceptance

1. [x] Real disposable bare Git tests for clean ahead push, behind ff-only pull, diverged, dirty, detached, no upstream, ambiguous remotes, rejected push, custom pushurl and pre-push hook. No production remote tests.
2. [x] Native + JS source contracts for Safe sync action eligibility/progress and unchanged Fetch cancellation.
3. [x] Deterministic targeted collector/monitor tests for isolated REST requests, preservation of other metric, cooldown, overlap and disconnect; local timestamp tests under non-UTC zone.
4. [ ] One exact-SHA stable Preflight: Rustfmt, Rust core/integration/Clippy, JS/release and Linux desktop compile; separate documentation-only evidence.
5. [ ] KDE/Windows physical acceptance of push safety, time and manual refresh in issue #15.

Rollback reverts code/tests changes without modifying stored schema or GitHub auth. Safe sync sends a Git network write only after explicit user click; never test against a production remote.

### P1-SYNC2 implementation checkpoint

- `9f74c3e` added explicit conservative `safe_push` and
  `safe_sync` to the Git core, with an immutable commit OID,
  same-named configured upstream, matching one fetch/push URL,
  repeat eligibility/ref checks, and ordinary non-force push.
- `79d105a` reuses the existing Safe pull button/row menu for
  Safe sync; `safe_pull` remains a compatibility entrypoint.
  Fetch remains separate, cancellable and unchanged.
- `c88ddd7` added targeted runner/jobs collection, separate
  `checkedAtRunners`/`checkedAtTasks` clocks and local-time
  hover formatting. `fa498c4` wired independent clicks.
- `edabc1b`, `cdea1e2`, `7f98cbc` added disposable bare-Git
  push tests, status/UI contracts, scoped GitHub REST tests,
  partial-failure and cooldown tests.
- `48dae02` corrected a numeric-return defect in the new
  Safe sync counter and refined the push-command source
  assertion; `2283c25` applied exact Rustfmt hunks.
- `6030cf6` repaired an incorrect test assumption: a normal
  successful Git push updates its local remote-tracking ref.
  `f3f3dc8` corrected source tests for Rustfmt multiline
  push arguments; `c4ccd35` repaired Git test cleanup of
  temporary pushurl via `git config --unset-all`.
- `e9d1e3f` changed live status tooltip updates to use
  `github_monitor_snapshot` (no local Git rescan);
  `4a4df079dba9e33c5050fb7b24663d523509e6d6` protects
  explicit null metric check times across partial refreshes.
- Real tests must pass from this exact code/test SHA. Earlier
  candidates were superseded/cancelled after focused test fixes;
  do not claim full source acceptance from those runs.
- [Preflight #40098694533](https://github.com/morozhenko-apps/repoticker/actions/runs/40098694533)
  was pending when this checkpoint was recorded. Physical
  KDE/Windows push and metric UX acceptance remains in issue #15.

### P1-SYNC2 CI test recovery checkpoint

- Initial attempts at `cdea1e2` and `7f98cbc` were superseded
  before full CI acceptance. CI revealed a numeric/boolean bug
  in the new Safe sync eligible counter and a source-contract
  assertion scanning an unrelated `get-url --all`; these were
  corrected in `48dae02`, and 14 Rustfmt hunks in `2283c25`.
- A disposable Git test initially assumed a successful push
  leaves the local remote-tracking tip unchanged. Actual Git
  updates it; the assertion was corrected in `6030cf6`.
- CI then identified an invalid test cleanup using
  `git remote set-url --delete --push`; test-only correction
  `c4ccd35` uses `git config --unset-all` and `91fd957`
  constructs a valid alternate upstream to exercise mismatched
  branch refusal rather than missing-upstream skips.
- The native hover detail controller previously triggered
  local scans on monitoring updates. `e9d1e3f` changed it to
  native monitor-only state. `980c77f` also reconciles the
  native-selected tooltip kind on the same event. Both old
  UI mocks/contracts were updated (`5e2462e`).
- `4a4df07` preserves explicitly unknown per-metric timestamps;
  `f54f917` and `1d50a55` forbid cross-account counter carryover
  during partial refresh and test that guarantee.
- Final formatting correction `693a3b1ee3f4dc786a24f4b186397d1218c9efbb`
  follows exact Rustfmt output for the alternate-upstream test.
- **Exact current source candidate:**
  `693a3b1ee3f4dc786a24f4b186397d1218c9efbb`;
  [Preflight #40099289302](https://github.com/morozhenko-apps/repoticker/actions/runs/40099289302)
  was pending at this checkpoint. Do not claim 4/4 until
  Rust format/core/Clippy, JS/release and desktop compilation
  complete successfully for this exact source SHA.
- Physical KDE/Windows acceptance remains in issue #15.

### P1-SYNC2 verified source test counts

- Exact executable candidate:
  `693a3b1ee3f4dc786a24f4b186397d1218c9efbb`.
  [Preflight #40099289302](https://github.com/morozhenko-apps/repoticker/actions/runs/40099289302)
  reported **SUCCESS** in Rust format/core/integration/Clippy:
  32 core unit + 22 real Git integration + 3 GitHub origin
  integration tests = **57 Rust tests passed, 0 failed**.
- JS/release job also **SUCCESS**: 164 Node tests and
  10 Python release-contract tests passed, zero failures.
- Linux desktop compile and aggregate Preflight remained in
  progress at this timestamp. Only after those exact-SHA
  jobs pass may 4/4 source validation be reported.
- Runtime acceptance on KDE and Windows (especially outbound
  remote mutation, refresh clicks and local timestamps) remains
  deferred in issue #15. No release or main promotion.

## P1-REMOTE1 — refuse missing or stale upstream before Safe push (2026-10-24)

Mode: **A — Feature / Refactor**. Approved v0.4 P1 Git safety scope.
Baseline: Safe sync `693a3b1` passed [Preflight #40099289302](https://github.com/morozhenko-apps/repoticker/actions/runs/40099289302)
**4/4 success**, including Linux desktop compile. Working branch `dev`.
No release, `main` promotion, version bump or new persistent setting.

### Root cause and scope

A concrete disposable-bare-remote reproduction establishes that
`git push --porcelain --no-follow-tags origin <oid>:refs/heads/dev`
**recreates** a deleted server branch when the local
`refs/remotes/origin/dev` is stale. This contradicts P1-SYNC2's
existing invariant 'never create an upstream'. Git's default
non-force protection prevents non-fast-forward updates but does
not prevent a missing remote ref from being recreated. Another
remote may advance without the local cache knowing; the current
local double-check cannot observe that before a network write.

Candidate root-cause hypotheses: (1) stale local upstream
ref after server deletion, (2) remote unexpectedly advanced,
(3) push destination remapping, (4) multiple push URLs,
(5) unexpected remote mirror/default refspec config,
(6) different branch selected between local checks.
Source and bare-remote evidence confirm **(1)** as an actual
defect; the existing code already checks (3)/(4)/(6), and
default non-force Git handles stale non-fast-forward changes.
This slice specifically addresses the server-side ref existence
and fetched-tip equality check, not broad transport timeouts.

### Chosen correction

Before a Safe push, execute a **read-only, exact-ref probe**
`git ls-remote --exit-code --heads <configured-remote> refs/heads/<branch>`
through the existing argv-only/no-terminal Git adapter.
Parse **one** `<oid>\t<exact-ref>` line and require:
non-empty 40/64-hex commit OID, exact ref path and equality
to the pinned local `@{upstream}^{commit}` tip. If missing,
moved or malformed, fail closed **before** executing push.
After the remote probe, repeat the current branch/upstream/HEAD/
local-ref/config/remote-URL eligibility checks, since external
Git clients may have changed the local repository during the
network request. Then use the existing immutable commit OID
and normal, explicit **non-force** push. No fetch, force,
branch creation, stash, rebase, reset, mirroring or tags.

This check is a best-effort preflight, **not** an atomic
compare-and-swap transaction across client and Git server.
A remote deletion racing *after* the probe cannot be prevented
by non-force push alone. Do not claim absolute server-side
branch-existence enforcement. A stronger atomic lease would
change the existing strict no-force safety contract and would
require an explicit separate architectural decision.

### Implementation and acceptance

1. [x] Extract the existing local pre-push identity checks into
   a small private reusable helper, retaining their semantics.
2. [x] Add exact remote probe parser and invoke it between the
   first and final local revalidation; reject absent/moved refs.
3. [x] Test with disposable local bare remotes: deleted remote
   branch is not recreated, remotely advanced tip rejected
   before push, ordinary ahead push succeeds, existing hook/
   split push URL rejection remains effective, malformed
   output rejected without weak assertions.
4. [ ] One final stable source-level Preflight for Rustfmt,
   Rust core/integration/Clippy, JS/release and Linux build.
5. [ ] Record exact CI evidence and add KDE/Windows acceptance
   to issue #15. Actual remote operations only in user-triggered
   runtime, never on production remote during automated tests.

Rollback: revert this source/test commit. It has no settings
or storage migration; only the pre-push remote read and check
would disappear. The published v0.2.0 and `main` remain intact.

### P1-REMOTE1 source and test checkpoint

- Source + focused real-bare-Git regressions: 
  [`50b1ac5`](https://github.com/morozhenko-apps/repoticker/commit/50b1ac5a0ab9f9ae5a0c01cc1e29a0255ec96a3c).
  The single-purpose parser allows exactly one SHA-1/SHA-256
  OID plus the exact requested refs/heads path. Upstream
  existence and fresh tip equality are required before
  non-force push. Local source/remote routing checks are
  performed both before and after this read-only network probe.
- [`3d6906e`](https://github.com/morozhenko-apps/repoticker/commit/3d6906e161fa1f300a156c92c469e217cf90b8f6)
  corrected test fixture sequencing so the independently
  advanced server branch has a distinct second commit.
- Disposable bare remote tests cover deleted-upstream refusal
  without recreation and advanced remote-tip refusal; previous
  ahead, behind, diverged, pushurl, hook and checkout tests
  remain intact. Unit tests cover absent, malformed, ambiguous
  and wrong-branch remote-ref responses.
- **Exact source/test SHA:**
  `3d6906e161fa1f300a156c92c469e217cf90b8f6`.
  CI has not yet been verified for this SHA; do not claim
  Rust format, tests or desktop compile success before the
  complete final Preflight run. Physical KDE/Windows
  acceptance remains pending issue #15.

### P1-REMOTE1 final-source validation checkpoint

- The initial source candidate `3d6906e` triggered
  [Preflight #40100383288](https://github.com/morozhenko-apps/repoticker/actions/runs/40100383288).
  JavaScript source-contract checks still expected the previous
  inline `let second = inspect(repo)` despite the new helper,
  and Rustfmt requested four layout changes. These are
  representation/test-contract differences, not grounds to
  disable a safety assertion.
- [`3856194`](https://github.com/morozhenko-apps/repoticker/commit/3856194c86beb31ea1f93517a27ade52470ad325)
  updated the JS invariant: two full local safety checks must
  enclose the exact live remote probe, and the helper must
  inspect, require LocalAhead and compare pinned remote identity.
  [`5be9ecf`](https://github.com/morozhenko-apps/repoticker/commit/5be9ecf171895ae2a47864919f41e41509899154)
  and [`87c134f`](https://github.com/morozhenko-apps/repoticker/commit/87c134f27a32f166212e985cb73d7da93308fbe4)
  applied the exact four Rustfmt hunks in code/tests.
- **Latest complete source/test candidate:**
  `87c134f27a32f166212e985cb73d7da93308fbe4`.
  [Preflight #40100698289](https://github.com/morozhenko-apps/repoticker/actions/runs/40100698289)
  was pending when recorded. Do not claim a green aggregate
  before Rustfmt, real Git tests, JS contracts, desktop compile
  and Preflight result all pass on this exact SHA.
- Physical outgoing SSH/HTTPS and KDE/Windows acceptance remains
  deferred to issue #15; public v0.2.0 and `main` unchanged.

### P1-REMOTE1 real Git fixture repair

- Candidate `87c134f` passed Rustfmt and all **34 Rust unit**
  tests, and its JS/release contract job passed. The new
  advanced-remote integration test failed because it fetched
  an upstream commit but did not fast-forward the local
  checkout before making a local commit. Therefore it
  correctly encountered `Skipped(Diverged)` before reaching
  the read-only remote probe. No production defect was proven.
- Test-only correction
  [`8d77344`](https://github.com/morozhenko-apps/repoticker/commit/8d7734426a9a7113c481402f6c547247a49dd0b3)
  first applies the existing safe ff-only pull after Fetch,
  then makes a clean strictly-ahead commit and separately
  advances the actual server branch. Assertions still require
  an error naming the changed server tip, unchanged local
  HEAD and unchanged server ref.
- **Final exact source/test candidate:**
  `8d7734426a9a7113c481402f6c547247a49dd0b3`;
  [Preflight #40100868497](https://github.com/morozhenko-apps/repoticker/actions/runs/40100868497)
  was pending when documented. No 4/4 claim until confirmed.
- The remaining physical KDE/Windows remote-race limitation
  and SSH/HTTPS behavior are tracked in #15.

## P1-PROC1 — bounded owned Git/SSH execution (2026-10-24)

Mode A / Feature and Refactor, dev only. Prior P1-REMOTE1 source
`8d77344` passed [Preflight #40100868497](https://github.com/morozhenko-apps/repoticker/actions/runs/40100868497)
4/4; the installed 0.2.0 and main are unchanged.

### Diagnosis and root cause

The core `invoke` currently uses blocking `Command::output()` for
every local Git call, including the network-dependent `ls-remote`
and `push`. `fetch_with_cancel` has per-Fetch owned group termination
but waits with no deadline. `GIT_TERMINAL_PROMPT=0` does not prevent
every SSH helper, GUI askpass, credential manager or hook from hanging.
Possible causes: unbounded network connection/SSH handshake,
stalled credential helper/askpass, stuck remote-side hook,
pipe backpressure from child stdout/stderr, unbounded local
status/inspection, cancellation registration race, and unrelated
external Git processes. Source confirms unbounded synchronous
waits and already provides process-group ownership for Fetch.

### Design and operational safety

- Introduce a small shared **owned child executor** in core,
  with argv-only commands, private Unix process groups (Windows
  exact-PID process tree via existing taskkill strategy), null
  stdin and continuously drained captured stdout/stderr.
  The calling thread must have a finite wait for bounded calls.
- Read-only/local inspection cap: 20 seconds per Git invocation;
  `ls-remote`: 45 seconds; Fetch: 120 seconds; outbound push:
  120 seconds. These are conservative independent per-command
  ceilings, not claims about total batch time. All operations
  still respect native GitHub and other workflow rate limits.
- On timeout terminate only the **owned child process group/tree**;
  never use process-name-wide killall/pkill and never touch
  unrelated Git clients. Attempt bounded reap; if termination
  fails, report the failure and unknown process state.
  A Git timeout is not the same as explicit Fetch cancellation.
- Keep the current explicit Fetch token, safe registration/cancel
  ordering, and existing race tests; Fetch may have partially
  changed remote-tracking refs before a timeout. Never delete
  Git index.lock, reset refs, retry automatically or claim a
  cancelled remote operation made no changes.
- A push timeout produces a distinct **outcome unknown** error.
  The server may already have accepted the commit. No automatic
  retry, second push or fabricated failure/success: the user
  must refresh the remote state before choosing a next action.
- A mutating local `merge --ff-only` is **not forcibly killed**:
  interrupting a worktree/index mutation risks partial state.
  Existing ff-only and pinned commit checks remain unchanged.
  Future fully cooperative merge deadline would require a
  separate transactional design; this stage is explicit about
  that boundary.
- Keep existing GitHub auth/cache/config, UI card size and
  source APIs. No new crates or platform services.

### Verification gates

1. [x] Implement shared bounded owned child wait/timeout used by
   read-only Git calls and outbound push; keep unbounded worktree
   merge isolated. Replace direct `Command::output` on those paths.
2. [x] Integrate Fetch's token with the same finite deadline
   while preserving cancellation races and owned descendants.
3. [x] Add unit/integration regressions: finite completion,
   blocked child + inherited pipe descendant killed on timeout,
   unrelated process preserved, captured output without
   deadlock, delayed SSH/remote probe, Fetch timeout distinct
   from cancel, and push outcome-unknown wording.
4. [x] Execute exact-SHA Rustfmt/core/Clippy, JS/release and
   Linux desktop compile once; repair evidenced failures.
5. [x] Record CI evidence separately; KDE/Windows physical
   remote helper/tree-termination acceptance stays in issue #15.

Rollback: revert P1-PROC1 code/test commits. No configuration,
credentials, user repositories, remote refs, main or release
are intentionally modified during development; Git tests use
disposable local shell/bare-repository fixtures only.

### P1-PROC1 implementation checkpoint

- Code `3c9c108`: tracked Fetch waits and constants prepared.
  `fc08017`: shared read-only/push bounded process ownership
  with separate stdout/stderr drainers, explicit stdin null,
  private Unix process groups, read-only/remote deadlines and
  distinct push-outcome-unknown errors.
- `d6dfcda`: Fetch path uses the bounded owned wait, preserving
  cancellation authority; `d630858`: Unix subprocess tests
  for unrelated process survival, descendant timeout, pipe
  backpressure, Fetch deadline versus explicit cancellation,
  and unknown outbound status.
- `17b5280`: Fetch cancellation and registration-failure cleanup
  now perform bounded reap rather than unbounded wait_with_output.
  `3be1687`: JS source contracts cover routed timeouts,
  distinct error status, owned process group and unchanged
  four-button card. `d59c81f`: Windows taskkill supervision
  is also finite and scoped to an exact child PID/descendants.
- **Latest source candidate** `d59c81f25cb474eede83bcfc12c30f9361e8a0bd`.
  [Preflight #40103054220](https://github.com/morozhenko-apps/repoticker/actions/runs/40103054220)
  was pending when this checkpoint was recorded. No source
  success may be asserted until Rustfmt, Rust tests/Clippy,
  JS contracts, Linux desktop compile and aggregate pass.
- Remaining architectural limits: local ff-only merge is not
  forcibly terminated, and a helper that survives after Git
  itself has already exited may hold inherited pipes; the
  caller still receives a bounded, outcome-unknown error
  rather than blocking the GUI. Physical Linux/Windows
  credential helpers and SSH descendants remain in #15.

### P1-PROC1 verified source tests

- Initial source candidate `d59c81f` stopped in format-first
  CI on 19 mechanical Rustfmt hunks. Core tests had not run
  in that superseded candidate. Corrections were applied
  exactly in [`f0b212f`](https://github.com/morozhenko-apps/repoticker/commit/f0b212fec4388fd534b5c5f96178ff8c1562c82c).
- `d441ce4` and `fe1165b` updated source-contract tests
  to tolerate Rustfmt whitespace rather than asserting the
  unformatted one-line `merge`/Fetch calls. No Git behavior
  was weakened to satisfy an assertion.
- **Final source/test candidate:**
  `fe1165ba8f0597dc7b207b7ca6a0b0300d88d615`;
  [Preflight #40103392626](https://github.com/morozhenko-apps/repoticker/actions/runs/40103392626).
  Rustfmt/core tests/Clippy **SUCCESS**: 39 Rust unit tests,
  24 Git integration tests and 3 GitHub-origin integration
  tests = **66 passed, 0 failed**. JS/release **SUCCESS**:
  167 Node tests and 10 Python contract tests, zero failures.
- Linux desktop compile and aggregate final gate were still
  in progress when these counts were documented. Do not
  claim 4/4 before checking this exact run.
- Test design on Linux uses temporary child groups and shell
  process fixtures, never user Git remotes; it proves local
  group termination and unrelated child survival, but cannot
  substitute for physical KDE/Windows SSH-helper acceptance.
