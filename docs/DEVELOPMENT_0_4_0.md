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

1. [ ] Extract tested \`resolve_enrolled_checkout\` into core Git,
   prove canonical membership, direct-child enrollment, linked
   worktree explicit enrollment, and non-enrolled/invalid path refusal.
2. [ ] Reuse one native path resolver across existing GitHub open plus
   new \`open_repository_folder\` and \`copy_repository_path\` Tauri IPC
   commands. Write clipboard natively and open the folder argv-only.
   Preserve cross-platform compile and no permission increase.
3. [ ] Add two menu options and source contract tests for their native
   handlers; maintain five-option geometry and four compact buttons.
4. [ ] Run final stable Rustfmt/core/Clippy + JS/release +
   Linux desktop compile Preflight once on exact code SHA, fix only
   identified regressions, and record complete evidence in a docs-only
   checkpoint.
5. [ ] Defer physical KDE file-manager activation, copied Unicode
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
