# RepoTicker v0.5 development — native notifications, startup and accessibility

## Current interpretation of this work-bucket history

The initial native-notification architecture question below was subsequently
resolved for the implemented direct REST/native opt-in path; its later owner
choices and implementation receipts control that scope. Autostart remains a
separate undecided architecture boundary. Initial card, Settings, About and
GitHub tooltip EN/RU slices exist on dev, not a complete L10N-20 product.
The corrected runner-name projection at `55e1d504` passed
[Preflight 40137480766](https://github.com/morozhenko-apps/repoticker/actions/runs/40137480766),
superseding its earlier pending-CI note below. Keep provider-owned names intact.

Owner acceptance of a diagnostic KDE notification is not acceptance of the
actual GitHub-failure delivery path. Real KDE/Windows locale/geometry and
notification cases remain separate; no new public release, autostart or relay
was approved here. Continue via the [current handoff](ROADMAP.md#current-development-handoff-2026-10-24)
and preserve all detailed historical decisions/evidence below.


Status: **Mode A — Feature / Refactor**, started 2026-10-24.
Work only on `dev`. v0.3–v0.8 are development work packages, not
automatic version bumps/releases. No `main`, tags, AppImage/APT
publishing or migration without later acceptance.

## Investigation: reliable CI failure notifications (architectural stop factor)

Existing `github-monitor.mjs` -> `runner-collector.mjs` makes only
`status=queued` and `status=in_progress` Actions run-list requests.
Native `github_api.rs::valid_path` allows only those two statuses.
The response projection for workflow runs exposes **only `id`**,
and jobs expose status, name, runner information and canonical URL,
but not a completed run's final conclusion. Thus a disappearing
active job cannot be interpreted as `failure`: it may succeed,
be cancelled or fall outside bounded coverage. Do not manufacture
failure notifications from counts, missing jobs or transient API errors.
Current native code has no OS notification backend and no
notification/autostart persisted preference.

**Architectural choice required before enabling CI-failure alerts:**

1. **Recommended — direct REST/native OS**. Extend the existing
   sanitized, bounded GitHub REST allowlist with an explicit
   `status=completed` read query and narrowly projected run
   `{id, conclusion, updated_at}` facts; optionally correlate
   known active run IDs on completion. Keep OAuth in native
   Rust; deduplicate transitions by run ID plus monitor scope.
   Add OS-native desktop notifications and an opt-in persisted
   preference default OFF, with platform capability checks.
   Trade-offs: extra rate-budget usage and an explicit native
   read-only API/security-projection contract plus settings
   schema migration and permissions acceptance.
2. **Optional relay**. Wait for the P3 signed/replay-protected
   webhook relay and deliver run conclusions through that
   path, retaining a REST fallback. Trade-offs: backend
   dependency and substantial authentication/operational
   complexity; not needed for a local-first companion.

Autostart likewise needs a platform choice: prefer the
maintained Tauri autostart implementation with narrowly exposed
native Settings controls (default OFF), rather than manually
editing XDG autostart files/Windows registry in application
code. Any approval must specify Linux/Windows support and the
OS-level preference lifecycle. Until then, **do not** add the
new native IPC permissions, OAuth projections, persisted config
fields or system startup entries. These are separate approval
gates under the agent architectural stop-factor policy.

## v0.5 A1 — existing en/ru preference becomes useful on compact card

### Evidence and decisions

`Config.language` already defaults to `en`, validates `en|ru`,
survives Settings OK/Cancel and appears on `get_snapshot`; however
the compact card renders only literal English controls, button
titles and status metric names. The preference has no visible
effect. Do not change the persisted configuration model,
GitHub transport, native permissions or card geometry.

Provide pure locale dictionaries for **existing** language codes
`en` and `ru`, with English fallback for an unsupported locale.
Scope for this slice: compact card static visible labels,
status buttons' accessible count names, navigation/tooltips and
basic action progress/error messages. Use short strings to fit
the existing 390x122 card and keep unambiguous Git actions.
Settings/About, detached Runners/Tasks/Billing popup, native tray
and the future 20-locale audit stay in later v0.5/L10N-20
slices and must NOT be claimed translated by A1.

The initial card should use the config-only read already exposed
as `get_settings_config` rather than waiting for the full
local `get_snapshot` scan; after a config change, the last
authoritative snapshot supplies the saved locale. Treat the
config-only load as a nonblocking parallel read, and ensure
late locale reads cannot overwrite newer snapshot state.
Never infer a disconnected account or zero metrics while loading.

### Work plan

1. [x] Add pure `card-i18n.mjs` with tested EN/RU/fallback
   translations and accessible status descriptions preserving
   unknown `—` vs numeric `0`.
2. [x] Apply locale from config-only initial read and
   authoritative later snapshot, with a revision guard
   against stale responses. Translate compact card labels,
   control hints and accessible metrics without DOM
   reconstruction or affecting status refresh and Git ops.
3. [x] Add real lightweight DOM/controller or focused
   source contract tests: EN default, RU snapshot,
   unsupported fallback, stale config read, no false
   zero and four fixed action buttons. No model mocking.
4. [x] Run one final exact-code Preflight once at stable
   completion; document Rustfmt/core/Clippy, Node/Python
   and Linux desktop compile results in a docs-only commit.
5. [x] Keep physical KDE/Windows label overflow/contrast
   and translated popup/tray/Settings in issue #15/#16.

Rollback: revert A1 code/test commit. No schema migration,
new dependency, installer, security scope or release work.

## A1 executable checkpoint

- `f492fd89` adds pure `card-i18n.mjs`, covering only
  compact-card labels/hints and numeric/unknown accessibility
  projections for existing `en|ru` config values. Current
  status `—` is explicitly announced as unknown, not zero.
- `2e98fe35` binds the card's existing `Snapshot.language`
  to control labels/action progress and updates button
  `aria-label` from the current live Runners/Tasks counts.
  It also requests config-only `get_settings_config` in
  parallel with the first Git scan so RU labels can appear
  before local scan completion. An already-rendered full
  snapshot takes precedence over a late config-only read.
  Monitor IPC events continue to update metrics only.
- `16c823ae` adds deterministic Node unit/source contracts
  for the two locales, fallback, numeric unknown versus 0,
  local-only config read, stale order and card control count.
  No new native dependency, permission or persistent
  config field. No user Git mutation.
- Exact source/test commit: `16c823ae52bacdcc58ec9828263a23538a4c2028`;
  [Preflight #40124589351](https://github.com/morozhenko-apps/repoticker/actions/runs/40124589351)
  was **pending** when checkpoint recorded; verify 4/4
  before source-complete claim.
- Later EN/RU coverage is **not** finished: Settings,
  About, popup, native tray and backend-provided Git
  text are intentionally untranslated in this slice.
  Full L10N-20 and independent context audits remain #16.
- CI-failure OS notifications and OS autostart are
  **BLOCKED on an architectural choice**, not silently
  'implemented'. See the two approaches in this document.

## A1 CI contract correction

- First source/test candidate `16c823ae` triggered
  [Preflight #40124589351](https://github.com/morozhenko-apps/repoticker/actions/runs/40124589351).
  Rust core tests/Clippy passed, while JS reported four
  failing **old source-regex tests**. Those tests asserted
  literal English-only UI strings such as `Fetch`,
  `Safe sync`, `Cancel` and `Stopping...` rather than
  the stable Git operation enum and new translation
  lookup path. The source intentionally changed to
  `cardText(cardLanguage, key)` without changing
  `safe_sync`, `fetch`, `cancel_git_fetch` or API calls.
- `e3b414b5` updates all four affected contracts:
  Fetch cancellation asserts the correct stopping/cancel
  translation-key branch; repo local actions and menu
  assert **exactly five** stable operation pairs and
  availability of EN/RU text; Safe sync asserts the
  `safe_sync` operation key and translation binding.
  No source runtime guard or test count was deleted.
- **Exact corrected executable/test SHA**:
  `e3b414b52c1d6bffedd66b7f5720fc416f405e8d`.
  [Preflight #40124889705](https://github.com/morozhenko-apps/repoticker/actions/runs/40124889705)
  is the validation candidate; check all 4 jobs before
  recording full source completion. Source tests do
  not substitute for physical KDE/Windows label-fit
  and keyboard navigation checks.

## A1 validated test totals

Corrected source/test SHA:
`e3b414b52c1d6bffedd66b7f5720fc416f405e8d`.
[Preflight #40124889705](https://github.com/morozhenko-apps/repoticker/actions/runs/40124889705)
reported **SUCCESS** for Rustfmt, Rust core + Clippy
(45 unit, 30 Git integration, 3 GitHub-origin =
**78 Rust PASS**) and UI/release contracts
(**180 Node PASS, 14 Python PASS**). Total
**272 tests, zero failures**.
Linux desktop compile and final aggregate had not yet
finished at the last check; do not claim 4/4 until confirmed.
Physical KDE/Windows locale-fit and future popup/tray/
Settings translations are not covered by this source result.

Notification and autostart architecture remains paused
until owner chooses the native/REST option or alternative;
the present A1 code does not invoke OS notification APIs.

## A1 final verified Preflight

- Exact executable code/test commit:
  `e3b414b52c1d6bffedd66b7f5720fc416f405e8d`.
- [Preflight #40124889705](https://github.com/morozhenko-apps/repoticker/actions/runs/40124889705)
  **COMPLETED 4/4 SUCCESS** on that SHA:
  Rustfmt, Rust tests/Clippy, JS/release contracts,
  Linux desktop compile, and final aggregate passed.
  There were 78 Rust, 180 Node and 14 Python tests,
  **272 passed, zero failures**.
- This completes v0.5 A1 **code/CI**, not OS-native
  notifications, autostart, full EN/RU coverage,
  the L10N-20 contextual audits, or physical KDE/
  Windows real-screen-reader/layout acceptance.
- `main` and published v0.2.0 unchanged.

## A1 visible metric-caption parity

- The first 4/4-success A1 candidate `e3b414b`
  localized the numeric `aria-label` and status-tooltip
  text, but inspection found visible `.metric-caption`
  elements still displayed literal English Runners/Tasks
  when Russian was selected. This was not caught by the
  original pure translation unit tests.
- [`ca2f76a`](https://github.com/morozhenko-apps/repoticker/commit/ca2f76aabd70ae31fb12b215dd4dc5a43553dc43)
  updates both visible captions in `setCardLanguage`
  without changing fixed strip height or refresh flow.
  [`c09bb87`](https://github.com/morozhenko-apps/repoticker/commit/c09bb876f549dbb32949f14a744f266a1b7246bc)
  guards both DOM assignments with source contracts.
- **Latest exact executable candidate**:
  `c09bb876f549dbb32949f14a744f266a1b7246bc`.
  [Preflight #40125144485](https://github.com/morozhenko-apps/repoticker/actions/runs/40125144485)
  pending at this note. The previously documented
  Preflight #40124889705 remains valid only for
  its older source `e3b414b`, not this new candidate.
  No physical KDE/Windows layout or accessibility
  acceptance is claimed by source-contract tests.


## A2 — approved direct GitHub REST + native OS notifications (2026-10-24)

**Owner decision:** Option A of the notification architecture above is approved.
This is **outbound desktop-to-GitHub REST**, not a localhost HTTP listener
and not the optional Cloudflare/Docker webhook relay. The documented
autostart decision remains a separate stop factor; do not enable autostart
or create OS startup entries as part of A2.

### Milestones and boundaries

1. [x] **A2.1: Read-only completed-run facts.** Extend only the existing native
   GitHub REST allowlist to accept paginated `status=completed` Actions runs;
   project a minimal, validated `id`, `run_attempt`, `conclusion`,
   `updated_at` tuple, without names, secrets, raw payloads or token transfer.
   Add allow/deny and projection tests for malicious paths and input.
2. [x] **A2.2: Deterministic failure transitions.** Add a pure JS state
   machine and tests keyed by monitored account, repository, run ID and
   attempt. First complete read after process start/scope change is a
   silent baseline. Only a newly observed `failure` conclusion may emit
   an alert; incomplete/failed reads never synthesize a failure.
   Cap pages, repositories, memory and requests. Do not interpret
   missing active jobs or API errors as failures.
3. [x] **A2.3: Native preference and notification adapter.** Store
   an opt-in preference (default OFF), add Settings OK/Cancel behavior,
   and use a maintained, platform-capability-aware Tauri notification
   adapter on Linux/Windows; keep OS permission state separate from
   the saved preference. Any new dependency must update Cargo.lock.
   Only start completed-run polling after opt-in. Display a concise,
   privacy-limited summary; GitHub credentials stay native.
4. [x] **A2.4: Final gate and documentation.** Run the stable Rust,
   Node, Python and Linux desktop build checks on the exact executable
   SHA, inspect all CI jobs, record counts and real-platform limitations
   in a separate docs commit. Do not ship `main` or a release.

**Safety and rollback:** no notification without affirmative opt-in;
no historical failure burst on enabling; no notification on incomplete
coverage, timeout, 401/403/429, auth removal, or account switch.
No write/remote-Git operation is authorized by alert data. Retain the
same rate-limit/cooldown protections as the existing native transport.
Revert each milestone's isolated code/test changes to roll it back.
A2.1/A2.2 alone are an inert data foundation and must not be presented
as a working OS alert feature.


### A2.1–A2.2 implementation evidence

- Native REST security projection and Rust tests:
  [`e5df4006`](https://github.com/morozhenko-apps/repoticker/commit/e5df4006b1bf9bceff220189fa639d7dbae4be5e).
  Existing queued/in-progress collection remains ID-only; the explicit
  completed status is now permitted with narrowly validated fields.
- Pure completed-window collector and process-local per-account/repository/
  run-attempt history:
  [`904838d9`](https://github.com/morozhenko-apps/repoticker/commit/904838d9c704df4f9a2e3b6c6e069f81e35481e0).
  It does not fetch by itself; no background completed-run traffic
  or notification side effects until native opt-in wiring exists.
- Eleven deterministic Node tests (including later correction):
  [`908f7f83`](https://github.com/morozhenko-apps/repoticker/commit/908f7f83ec99d96f458095c2dc3754b6a5f91f37).
  Covers baseline silence, dedup, attempts, account changes,
  failed reads, malformed inputs, per-repository isolation,
  request/concurrency caps and reset.
- [Preflight #40127311636](https://github.com/morozhenko-apps/repoticker/actions/runs/40127311636)
  **FAILED**: 189/190 Node tests passed (duplicate-repository
  error expectation mismatch), Linux desktop compile passed,
  and Rustfmt failed mechanically before core tests.
- **A2.3 NOT DONE:** no native notification adapter, opt-in Settings
  preference, OS permissions or autostart. A2.1–A2.2 alone are not a
  usable notification feature. Public main/release remain unchanged.


### A2.2 conclusion-correction follow-up

- [`1277b738`](https://github.com/morozhenko-apps/repoticker/commit/1277b7381387473caee146b4b5fe958d2bdc8cb9)
  preserves monotonic failure dedup when GitHub corrects an earlier
  completed conclusion for the same run attempt. Replayed/stale
  success data must not rearm an already issued failure candidate.
  Duplicate same-attempt records in a response are invalid.
- [`203a1fbf`](https://github.com/morozhenko-apps/repoticker/commit/203a1fbff67e92f985224841108f58ed823e1608)
  adds regression tests for corrected conclusions and duplicate
  provider records. **Earlier A2.1/A2.2 executable candidate:
  `203a1fbff67e92f985224841108f58ed823e1608`.**
  Validation for earlier SHAs is not transferable to this commit.
- CI and platform acceptance must be verified separately. An inert
  transition tracker is intentionally not wired into the live monitor
  until both the opt-in preference and native delivery adapter exist.


### A2.2 preflight corrections (2026-10-24)

The first complete A2.2 candidate [#40127311636](https://github.com/morozhenko-apps/repoticker/actions/runs/40127311636)
was red for two independent, log-confirmed reasons:
the negative test expected an "Invalid notification" message
when the intended specific failure was "Duplicate notification
repository"; `cargo fmt --all --check` requested mechanical
formatting in the new Rust projection. Neither failure was
evidence of a GitHub API, permission or notification runtime defect.

- [`1c645627`](https://github.com/morozhenko-apps/repoticker/commit/1c6456271ca7ff076dac9b76492d41b3908fc768)
  applies the exact rustfmt hunk from the failed job.
- [`fbae51c9`](https://github.com/morozhenko-apps/repoticker/commit/fbae51c970632faaea4ab6b1d35f3a2ebdfdb44b)
  keeps the negative-path assertion strict and independently
  checks the duplicate-repository rejection.
- **Corrected exact source/test SHA:** `fbae51c970632faaea4ab6b1d35f3a2ebdfdb44b`.
  [Preflight #40127719281](https://github.com/morozhenko-apps/repoticker/actions/runs/40127719281)
  was pending at first inspection; its result must be checked
  before claiming the final stable gate. Earlier green desktop
  compile for the prior SHA is not exact-source acceptance.
- Reminder: these commits do **not** implement A2.3 native OS
  delivery or enable any completed-run monitoring in production.

## A2.3 decision and implementation plan (2026-10-24)

- The approved direct REST design uses the official `tauri-plugin-notification`
  in native Rust. No JS notification/plugin capability is granted: the
  only WebView entrypoint is a validated, read-only, notification-only
  application command. Desktop OS permission and opt-in config are distinct.
- Add an optional `ci_failure_notifications` boolean, default `false`, to
  persistent `Config`; include it in the single config-only Settings and
  monitor-selection reads. Existing configs and legacy save callers remain
  compatible. A checkbox changes only the draft; OK persists atomically,
  Cancel leaves the preference untouched.
- Reuse the process-local completed-run tracker. Only opt-in, authenticated
  selected repositories are polled after an authoritative monitor result;
  runner-only manual refresh and an offline/stale/rate-limited state never
  trigger an alert. The initial completed-run pass is a silent baseline.
- Native delivery revalidates repository enrollment and preference and
  remembers bounded successful notification IDs. It never accepts alert
  titles, bodies, URLs, tokens or arbitrary message text from JavaScript.
  A failing platform backend must report an error, not a claimed alert.
- Add focused Node and Rust regression tests. Generate and commit the Cargo
  lockfile from Cargo (never hand-edit checksums). Execute stable Preflight
  once on the exact source/test commit, then separately document 4/4 evidence
  and physical Linux/Windows notification acceptance gaps.
- No APT release, version bump, autostart change or promotion to `main`.
  Rollback is by isolated application/test commit(s) with no user-data
  migration, since the new settings field has a safe default.

**A2.1/A2.2 validation:** [Preflight #40127719281](https://github.com/morozhenko-apps/repoticker/actions/runs/40127719281)
completed successfully for exact executable SHA `fbae51c970632faaea4ab6b1d35f3a2ebdfdb44b`.

## A2.3 source and verification checkpoint (2026-10-24)

- `6e300d470c55f39f02f600f927115c2dca798d14` adds the opt-in
  `ci_failure_notifications` field (default OFF), Settings draft/OK/Cancel
  wiring, config-only monitor selection, an official Rust-side Tauri
  notification plugin and validated, deduplicated native delivery.
  The OS plugin is not exposed as a general-purpose JavaScript capability.
- `1208c83f16494e70ff0c01feca7ab2d4f07a6efb` adds integration
  tests for silent baselines, subsequent failures, opt-out, scope reset
  and source-level native security checks.
- `d9855e5f136950723849a4dcb7cf0fb47afd301f` stores a Cargo.lock
  generated by `cargo metadata` in one-time Actions job
  [#40128753744](https://github.com/morozhenko-apps/repoticker/actions/runs/40128753744).
  The temporary one-time lockfile workflow was removed in the next commit.
- `d42abf258e5ee8805afd7f096023eef85162854e` corrects verified
  rustfmt differences and expands Settings OK/Cancel contract tests.
  On that exact SHA, Node passed 197/197, Python release contracts
  passed 14/14, and 78 core Rust tests plus core Clippy/format passed;
  Linux desktop compilation was cancelled by the subsequent commit.
- `5a027460b6ba11ea62481eabaf4d7ebba6b4d268` additionally resets
  CI notification history when authorization expires silently and adds
  a reconnect regression test. **This is the current complete
  executable/test candidate**, not the earlier partially validated SHA.
- [Preflight #40129124638](https://github.com/morozhenko-apps/repoticker/actions/runs/40129124638)
  is the final exact-SHA validation target. Do not mark A2.3 or A2.4
  complete before all four jobs succeed, including the desktop compile.
- Physical native OS banner/notification-center delivery still needs
  independent KDE Wayland and installed Windows acceptance. Tauri
  reports desktop permission granted at API level; actual OS delivery
  may be suppressed by Do Not Disturb and must not be assumed from CI.
  No autostart, main promotion, release or version change.

### A2.3 native delivery acceptance checklist (not yet physically executed)

On an installed Linux KDE Wayland or Windows build, with a normal
GitHub Device Flow authorization and a selected monitor account:

1. Confirm the notification checkbox starts OFF for a legacy config,
   survives OK + full restart when enabled, and remains unchanged on Cancel.
2. Enable it and open the card: the first completed-run read must
   establish a silent baseline, including pre-existing failed runs.
3. Complete a new failed Actions workflow in an authorized monitored
   repository. After the next bounded scheduled refresh, verify precisely
   one system notification showing the repository and run ID. Further
   refreshes and duplicate provider reads must not repeat it.
4. Verify second failed attempts are distinct, but corrected/stale
   success data must not rearm a previously notified attempt.
5. Disable alerts, change selected repositories, disconnect GitHub and
   simulate API offline / 401 / 403 / 429. No OS notification must be
   emitted for unauthorized, outside-scope or unavailable data.
   Re-enabling or reauthorizing must establish a fresh silent baseline.
6. Check OS Do Not Disturb and a missing notification daemon/permission
   failure separately: a successful Rust compile or permission-state
   "granted" response does NOT guarantee visible OS delivery.
7. Confirm no Git mutation, Worker/relay call, autostart entry,
   Javascript-exposed token or arbitrary notification text is created
   by receiving CI events. Record exact installed package, DE/OS,
   notification daemon and run IDs in the acceptance report.

The plugin supports Linux and Windows desktops, but **physical Windows
installer/runtime and KDE display delivery are not accepted by source
checks**. Keep v0.2.0 main/release immutable until an explicit release gate.


## A2.3/A2.4 source and CI gate: VERIFIED

**Exact executable/test SHA:** `5a027460b6ba11ea62481eabaf4d7ebba6b4d268`.

[Preflight #40129124638](https://github.com/morozhenko-apps/repoticker/actions/runs/40129124638)
**COMPLETED, 4/4 SUCCESS** for Rustfmt, Rust core/Clippy, Node/Python
and the Linux desktop `cargo check --locked -p repoticker-desktop`.
There were **78 Rust core**, **198 Node**, **14 Python** successful tests:
**290 PASS, 0 FAIL**. Native desktop Rust compiled with the
notification plugin. No separate flaky suite is claimed executed.

**A2.3 implementation and A2.4 code/CI verification are COMPLETE.**
Independent KDE Wayland and installed Windows visible OS notification
acceptance is **OPEN**, as is Do Not Disturb/delivery-agent verification.
No `main`, version bump, APT publication, tag, release, OS autostart
or Hybrid relay change. Code/CI acceptance is not physical OS acceptance.

## A2 KDE physical acceptance feedback (2026-10-24): UI alignment and delivery diagnosis

Owner-provided KDE Wayland screenshot (locally compiled `dev` at `6dbd2fa`)
shows the persisted notification checkbox in the GitHub block,
"System notifications available", and monitor scope `morozhenko-apps`.
Local `cargo run --locked -p repoticker-desktop` compiled and started
on native `gtk-layer-shell`. The previously installed `/usr/bin/repoticker-desktop`
PID 3366630 was still running at the last reported process check.
No successful display of a RepoTicker-generated CI notification is yet confirmed.

### Observed UI root causes and change plan

- The account selector is a two-column `.github-grid` item with
  a full-width, 34px-high input. The repo selector is a 165px-wide,
  30px-high control aligned right in a separate flex row. This causes
  observable misalignment. Adopt the same two-column 10px-gap grid for
  the repo selector, with a full-width 34px control in column two.
  Preserve existing `hidden`, selection, overflow and accessibility.
- Global `input` styling is inherited by the native WebKitGTK checkbox,
  whose tick may draw outside its intended 16px bounds. Use a platform-
  independent 16px square with native checkbox semantics, explicit
  `appearance: none`, a centered check mark, and focus-visible ring;
  ensure repo selection checkboxes use the same style.
- Add structural/stylesheet regression tests for both alignments,
  box sizing, checked and keyboard-focus styles before final Preflight.

### Missing notifications: do not assign a fabricated root cause

Candidate causes: (1) workflow jobs succeeded, not workflow `failure`;
(2) first completed-run poll was a silent baseline; (3) old installed
process remained active beside `target/debug`; (4) Settings OK did not
persist the checkbox; (5) bounded monitor interval/rate cooldown;
(6) incomplete or unauthorized REST history; (7) Do Not Disturb or
desktop notification daemon rejection. The screenshot and compiled
native code exclude neither the timing case nor missing failures.
No evidence yet demonstrates a new post-baseline `failure` being
processed, so no notification engine behavior should be changed
solely from this observation. Verify one live failure and the process
identity, persisted config and timestamped polling before a delivery
bug fix; ordinary completed/successful jobs must remain silent.

Do not modify `main`, create a release, trigger synthetic CI failures,
or enable OS autostart for this visual correction.

### KDE feedback implementation evidence (2026-10-24)

- [`f05c8dbe`](https://github.com/morozhenko-apps/repoticker/commit/f05c8dbe3e496e315f26f21e5c7952f617f45eb5)
  unifies the monitor account/repository selector grid columns,
  10px gap, full-width 34px control height. It also removes
  WebKitGTK's native checkbox painting for both notification and
  selected-repository checkboxes, retaining native `input` state,
  keyboard focus and a high-contrast fallback.
- `tests/settings-visual-controls.test.mjs` asserts both selector
  alignment, checked/focus/box-size styles and Settings transaction
  boundaries. The exact CSS/test SHA passed
  [Preflight #40133196869](https://github.com/morozhenko-apps/repoticker/actions/runs/40133196869),
  4/4 SUCCESS.
- [`6b96996f`](https://github.com/morozhenko-apps/repoticker/commit/6b96996f139016a8d04b06e8db04f6b27bc290da)
  corrects a distinct authorization gate: runner-only
  `permission_denied` no longer blocks completed-run reads when
  job coverage is authoritative, while mixed job access errors and
  API rate limiting still block alerts. Integration tests cover
  successes remaining silent, runner-only 403, and job access errors.
  Final full-source [Preflight #40133349742](https://github.com/morozhenko-apps/repoticker/actions/runs/40133349742)
  is the exact evidence target.
- The user's installed `0.2.0` executable was still running at
  last inspected PID 3366630 when the source build was launched;
  a clean one-process runtime acceptance must stop both
  `repoticker-desktop` instances before starting latest `dev`.
- A real **new** workflow `conclusion=failure` observed after the
  silent initial baseline is still required to physically accept
  RepoTicker OS notifications. A successful/queued/completed runner
  job is not a sufficient condition. OS state reporting "available"
  confirms permission only, not GitHub API coverage or visible toast.

### KDE second acceptance: native test notification and select text centering (2026-10-24)

**Owner observation:** the account, connection-mode and repositories native
`<select>` controls are horizontally aligned, but their option text is
still rendered low inside the border on KDE WebKitGTK. The checkbox
checkmark is now accepted. The user explicitly requests a test of native
OS notification delivery without creating a failing CI job. RepoTicker
remains running on Alcotester.

**Root cause candidates for the vertical gap:** shared
`button, input, select` `padding: 6px 9px`; GTK native select
`appearance` internal metrics; implicit line-height; OS font metrics
and fractional scaling; disabled-opacity contrast; divergent
declarations. CSS inspection and the screenshot prioritize the
combination of the shared 6px block padding and WebKitGTK's native
select painting. The first grid-width correction did not address either.

**Plan (implementation separate from documentation):**

1. Normalize the three monitor select controls to a single accessible
   CSS-painted closed control using `appearance: none`, explicit 34px
   border-box sizing, zero block padding, deterministic line-height,
   fixed inline padding and one CSS background chevron.
   Preserve the browser's actual `<select>` element and native option
   popup and the disabled state; do not create a scripted combobox.
2. Add a **Test notification** button beside the OS permission status
   in Settings. It is enabled only for persisted, currently selected
   opt-in when the native permission check reports `granted`.
   A native `ci_notification_test` command must independently
   recheck persisted opt-in and OS permission, then use the same
   `tauri_plugin_notification` backend with fixed test-only title
   and body. No user-controlled text, GitHub run identifiers,
   GitHub requests, synthetic CI failures, delivery history changes
   or config writes. Report that the OS accepted the dispatch
   request, not that a banner was physically observed.
3. Regression test the shared select CSS and unchanged actual select
   semantics, the button's saved-preference/permission guards,
   the native command's denial paths and its no-arbitrary-text
   contract. Avoid a live failing GitHub Actions job.
4. Validate the exact code/test SHA with the normal stable Preflight,
   record PASS/FAIL, then physically verify on KDE after restarting
   the running source app. Do not change `main`, release, autostart
   or the outbound REST notification decision engine.

**Expected vs actual:** closed select text should sit centrally
between top/bottom edges. A fixed test notification should be
requestable without any failing workflow, separately from the real
end-to-end CI delivery acceptance. The code+CI gate does not
substitute for physical KDE notification visibility.

**Rollback:** independent CSS/UI + Rust/JS/test commits can be
reverted without migrating config or changing the OS package.

### Second KDE acceptance implementation (2026-10-24)

- `ba6c92c3c49fdf705c999816dc0476b7515931d8` changes only
  Settings CSS plus structural regression tests: shared
  `appearance: none`, deterministic `line-height: 32px`,
  `padding: 0 32px 0 12px`, and one background chevron for
  three GitHub select controls. All three remain real native selects
  with keyboard access and a forced-colors fallback.
- `91c7a1aa41624ce31aa8252f3b3a862e261626ab` adds an
  explicit `ci_notification_test` Tauri command backed by the
  same `tauri_plugin_notification` as real alerts. The native
  command rechecks the persisted notification opt-in and desktop
  permission, accepts **no parameters**, and sends a distinct,
  fixed `RepoTicker: test notification` title/body. It does not
  read GitHub, fabricate run IDs, affect deduplication or write
  settings. Settings exposes a small `Test` button next to
  native permission status, gated on persisted opt-in and
  permission. Native permission errors are displayed, and the
  success message means only that the OS dispatcher returned OK;
  an actual visible KDE banner remains a physical acceptance item.
  Dedicated native + JS integration/source contract tests added.
- Exact source/test validation target:
  [Preflight #40134203945](https://github.com/morozhenko-apps/repoticker/actions/runs/40134203945).
  Mark this gate complete only after all four jobs succeed.
- Manual KDE acceptance: stop both prior installed/debug processes,
  sync `dev` with fast-forward, run
  `cargo run --locked -p repoticker-desktop`. With the already-saved
  `ci_failure_notifications=true` check Settings -> GitHub -> Test.
  Verify the `RepoTicker: test notification` OS alert. This
  verifies Tauri/OS delivery only, **not** GitHub CI event monitoring.
  Native test does not establish CI workflow acceptance. Check
  the three centered dropdown labels and functioning option menus.
- No intentional failing GitHub Actions job was created; `main`,
  APT/release, autostart and package version remain untouched.

### Test notification CI correction (2026-10-24)

[Preflight #40134203945](https://github.com/morozhenko-apps/repoticker/actions/runs/40134203945)
reported a deterministic `cargo fmt --all --check` violation:
one superfluous blank line immediately before
`notification_test_enabled` in `ci_notifications.rs`.
Node UI/integration tests passed on that source SHA.
This is a formatting defect, not evidence of an OS dispatch
or GitHub REST failure.

[`a31e4640`](https://github.com/morozhenko-apps/repoticker/commit/a31e4640dd9ed3e2816c8bfd199e9b658461526d)
applies the precise rustfmt correction. The new exact
code/test CI candidate is [Preflight #40134283516](https://github.com/morozhenko-apps/repoticker/actions/runs/40134283516).
Check the final four-job result before claiming this feature
passes. The user is still running the prior binary, which
cannot expose the new native test command without a restart.

## KDE final Settings acceptance feedback (2026-10-24)

The owner physically checked the centered GitHub selectors, checkbox
and the opt-in native test-notification path on KDE Wayland and reported
that they appeared to work. The owner now requests a production-only
Settings UI: **remove the temporary Test notification button and its
permission/explanation text**, and eliminate the Settings page/GitHub
block scrollbars by enlarging the Settings window. This is visual
acceptance of a test OS notification, **not** confirmation that a
new GitHub workflow failure triggers the production pipeline.

Implementation contract:

- Raise only the Settings window's fixed/default/min/max height from
  552px to **720px**, preserving width 660px and the unaffected
  compact tray card, About and usage windows.
- Remove the page scroll override and GitHub block scroll container;
  let the full standard Settings form render without nested clipping.
  Keep a bounded scroll **only for a potentially large explicitly
  selected repository inventory** and for genuinely long local root
  lists; those are content lists, not page scrollbars.
- Remove the temporary native `ci_notification_test` command,
  related opt-in diagnostic Rust helper, JavaScript handler/state and
  button, along with the unneeded JS-facing notification permission
  probe/status. Retain **production** `ci_failure_notify`, native
  OS permission verification there, notification opt-in persistence
  and all actual CI transition/deduplication logic.
- Remove the redundant explanatory line in all-repositories mode,
  but retain selected-repository error/count feedback for accessibility.
- Update stable Settings CSS/DOM/native IPC tests and remove
  now-obsolete diagnostic tests. The fixed-height Settings geometry
  and absence of full-form scrollbars are regression contracts.
- Run exact-SHA stable Preflight. Don't deploy, change `main`,
  release a package, add autostart or fabricate GitHub failures.
  A physical 720px-height visual check is still separate from CI.

Rollback: independent code/test commit; the persisted config schema
and installed v0.2.0 package are untouched.

### Scroll-free Settings implementation and CI checkpoint (2026-10-24)

- `d5ecb7320f0e9b0bab8099efa65d1cf7fc12f7b6` changes only
  Settings window dimensions (`660×720`, fixed), Settings
  HTML/CSS/JS, and unused Rust notification diagnostic IPC.
  The standard Settings page and GitHub group no longer have
  independent vertical scroll containers. Explicitly selected
  repository inventories and unusually long local folder lists
  still have bounded list-level scrolling.
- The temporary `Test` button, native permission-status
  explanation and native `ci_notification_test`/
  `ci_notification_permission` commands are removed.
  The real `ci_failure_notify` command retains persisted
  opt-in, selected scope, permission checks and deduplication.
  `ci_failure_notifications` remains unchanged on disk.
- All-accessible mode no longer shows redundant explanatory
  text. Selected-only inventory counts/errors remain accessible.
- `6f1eb3b99eb81947c4dfc18fb72737c55a16550c` adds
  exact markup/IPC/geometry regression tests and removes
  obsolete diagnostic test fixtures.
- The exact executable/test SHA is `6f1eb3b9`. Validation is
  [Preflight #40135144357](https://github.com/morozhenko-apps/repoticker/actions/runs/40135144357).
  **Final four-job result was pending when this note was drafted;
  inspect the run before marking the gate PASS.**
- Physical KDE smoke for 720px Settings without the right-side
  scrollbar is still outstanding. The previously reported successful
  manual test toast proves only a native OS dispatch path;
  it does not establish live GitHub failure alert acceptance.
  No `main`, tag, installer or release changes.

## A1b — Settings EN/RU localization, incremental v0.5 work (2026-10-24)

The compact card already has an EN/RU dictionary using persisted
\`Config.language\` (default EN). Physical KDE acceptance of the 720px
scroll-free Settings and native notification dispatch was reported by
the owner. The Settings page still contains English labels and statuses
when \`Русский\` is selected, so the preference remains inconsistent
between surfaces. This is the next unblocked work bucket; OS autostart
is independently gated by the already recorded architecture choice.

**Contract and rationale**

- Add a pure, testable Settings EN/RU dictionary with explicit stable
  keys, English fallback and no persisted migration. Keep GitHub API
  identifiers, repository names, URLs, dates and paths unchanged.
- Localize Settings **static** labels, headings, select choices and
  accessibility attributes, including placeholders and the existing
  root/ignore/GitHub labels. Include essential **dynamic** status and
  validation copy rendered by the Settings controller. Do not translate
  remote/native exception messages verbatim, as those are opaque errors.
- Settings must initially apply the saved locale on its existing
  config-only read, and preview the draft locale immediately on selection.
  Cancel preserves the old locale; OK persists via the already
  transactional \`save_settings\` command. The current card refresh
  mechanism remains unchanged.
- Keep the existing settings dimensions (660×720), dropdown styling,
  GitHub selection behavior, native notification opt-in, auth flows,
  no-page-scroll contract, and OS security boundaries unchanged.
- The test notification command was intentionally removed after KDE
  smoke and must not be restored. No new GitHub REST requests or
  release/workflow changes.
- Implement as an ordinary Mode A slice using a small dedicated module
  and declarative HTML keys, not a duplicate form controller. Add focused
  EN/RU/fallback/preview/Cancel/status tests, then execute the standard
  final stable Preflight **once** on the last source/test SHA.
- **Out of scope:** native tray, detached runner/billing balloons,
  About, 20-language L10N-20 audit, OS autostart and release packaging.
  This cannot be described as full-app localization.

**Rollback:** revert the isolated Settings i18n executable/test commit.
No config schema, native dependency, IPC or on-disk migration changes.

**Acceptance:** RU Settings visible text is in Russian immediately on
opening with persisted RU and on draft switch; English is restored on
switch back or Cancel/reopen. API/data fields remain unmodified and
GitHub Device Flow, account/repository selection and Settings OK/Cancel
continue to work. CI success is not physical KDE UI acceptance.

### A1b Settings localization checkpoint (2026-10-24)

- `61dae998f9d4bcf7cfcbbc9831bad940d0a441dc` adds a pure
  `settings-i18n.mjs` EN/RU/fallback dictionary and applies
  declarative `data-i18n` keys in Settings, including accessibility
  labels, placeholders, headings, controls, the CI checkbox and
  essential GitHub/validation status strings. User-owned paths,
  repository identifiers, URLs and opaque provider errors are never
  translated. There are no new native permissions or persistent
  config fields.
- `de1dbcce25d514898212c7ecf7c619bf46e37859` keeps English
  status keys until display time, so live EN/RU preview cannot
  accidentally retain already-translated stale text.
- `9a0ebcb0cebf50b0206a73eb8352216ead7a56a9` updates
  pre-existing static HTML structure contracts and adds Settings
  tests for saved RU, draft EN, Cancel (no write), and EN-to-RU
  OK (persist). It completes the previously untranslated ignored-
  folder Add button and assistive list label.
- The initial localization candidate's JS job reported failures
  in **two source-shape assertions**, which expected a literal
  `<option>` or `<label>` immediately after a known attribute.
  The runtime behavior tests for Settings and the pure EN/RU
  dictionary passed on that initial SHA. The affected assertions
  now retain the element/value contract and include the
  intentional `data-i18n` attribute.
- Final executable/test source candidate:
  `9a0ebcb0cebf50b0206a73eb8352216ead7a56a9`;
  [Preflight #40135917461](https://github.com/morozhenko-apps/repoticker/actions/runs/40135917461).
  At first inspection the run was pending; **do not claim PASS
  before exact-SHA stable Rust, Node, release contracts, desktop
  compile and aggregate complete**.
- The prior scroll-free Settings candidate `6f1eb3b9` passed
  [Preflight #40135144357](https://github.com/morozhenko-apps/repoticker/actions/runs/40135144357),
  4/4 SUCCESS. The owner has separately confirmed the scroll-free
  KDE Settings layout and native test-notification dispatch; the
  temporary diagnostic UI was already removed.
- **Next independent acceptance:** KDE RU/EN toggle, connected
  and disconnected GitHub status, keyboard language picker and
  truncation within 660×720px. Detached popups, tray, About,
  Windows and 20-locales remain out of scope. Do not infer a
  release-ready v0.5 from this bounded slice.

## A1c — About and detached GitHub tooltip EN/RU (2026-10-24)

**Evidence:** A1b Settings EN/RU source SHA `9a0ebcb0` passed
[Preflight #40135917461](https://github.com/morozhenko-apps/repoticker/actions/runs/40135917461)
4/4 SUCCESS. Settings, compact card and persisted `en|ru` config now
share a selected language, but `about.html`/`about.mjs` and the
separate `quota.html`/`quota.mjs` remain English. The pure
`quota-details.mjs` already has extensive exact EN model contract
tests and is consumed as a trusted read-only presentation. Do not
rewrite that model's public shape or translate untrusted GitHub values.

**Mode A approved incremental work:**

1. Add one pure EN/RU/fallback **presentation-only** locale module
   for About static copy and detached GitHub tooltip fixed labels,
   status prefixes, known local error/help text. The existing
   `cardLocale` can normalize locale; no second persistent setting.
   Only known local labels are translated. Never translate numeric
   quantities, timestamps, run IDs, repository/runner names, plan
   names, provider error payloads or URLs.
2. About: read `get_settings_config` through the existing native
   config-only command (no local Git scan), alongside `get_about_info`.
   Translate static labels and accessibility metadata without
   modifying author/version/website fields or link command. Re-read
   config on window focus so About, which is hidden instead of
   destroyed, reflects Settings OK on later openings. Fallback to
   English on config-read errors, never a broken window.
3. Usage balloon: use the existing independent config-only command
   while fetching monitor status; localize only a projected copy of
   `buildHoverDetails` at paint. On `repoticker-config-changed`
   through the **existing usage listen capability**, refresh locale
   without local Git scan or extra GitHub REST traffic. Retain
   hover-kind race protections, billing scope, compact width and
   pointer-pass-through semantics. A missing locale read falls back to
   English without blocking status error reporting.
4. Add focused unit, native-config source and lightweight runtime
   tests: saved RU and EN fallback, translation-only projection,
   dynamic counts, unknown `—`, unchanged untrusted values,
   About focus refresh, tooltip config change, no Git scan and
   unchanged existing English quota details tests.
5. Execute one final exact-SHA stable Preflight on completed source and
   tests (Rust format/core/Clippy, Node/release, Linux desktop compile).
   Separately record results and leave KDE/Windows visible text
   acceptance open until a real desktop check.

**Compatibility/rollback:** No new schema, IPC command, Rust dependency,
permission or bundle version change. Revert this isolated UI/test
commit if necessary. No autostart, main promotion, published release,
full L10N-20 claim or unapproved relay.

### A1c About and tooltip implementation checkpoint (2026-10-24)

- `36d9665cb55c17b84f7334f454b43b5544be40ed`
  adds pure `surface-i18n.mjs`, About static and accessible
  EN/RU labels, and presentation-only translation of the
  validated `quota-details` model. Data values (runner names,
  paths, tariff names, counts, month and timestamps) remain
  byte-for-byte unchanged. The original `quota-details.mjs`
  pure model and its English contracts are untouched.
- About reads only existing `get_settings_config` and
  `get_about_info`, revalidates locale on focus with a
  revision guard, and leaves the project website action
  unchanged. No native permission or event capability added.
- Detached tooltip reads `get_settings_config` in parallel
  with its existing lightweight monitor data and reconciles
  saved locale on `repoticker-config-changed` through its
  existing listen permission. Cached, projected status may
  be repainted without new GitHub API reads or local Git scans.
- `215778ef148ef8bc11c13a1e7abcca3fab7c00af`
  adds deterministic EN/RU/fallback projection tests, About
  focus/reopen and immutable version/author/link test,
  config-change hover test with unchanged GitHub request count,
  and desktop capability/contract regression checks.
- **Executable/test candidate:** `215778ef148ef8bc11c13a1e7abcca3fab7c00af`.
  [Preflight #40137183637](https://github.com/morozhenko-apps/repoticker/actions/runs/40137183637)
  was pending at first inspection. Only claim completed
  A1c CI if all four jobs pass on that exact source SHA.
  Runtime KDE and Windows visible text remain separate physical
  acceptance gates. No `main`, tag, public version, autostart
  or relay changes.

### A1c localization collision guard and final test candidate (2026-10-24)

The first `215778ef` source/test candidate passed all 219 Node
tests and Rust/Clippy checks in CI, while its Linux desktop compile
was still running when reviewed. A source-only review identified a
real presentation collision: a user-owned runner named `Online`,
`Busy` or another UI status could be translated as a fixed label,
breaking the invariant that provider-owned names remain unchanged.

`55e1d50475f2e219cb9393e99de3fe5ae344d6d4` corrects the
projection without modifying `quota-details.mjs`: the caller
supplies the actual bounded number of named runner rows from
the validated native runner coverage, and the translator protects
those rows from key-based label substitution. An adversarial
`Online`/`Busy` name regression was added while keeping the
fixed `GitHub-hosted` summary label translated.

**Updated final executable/test source SHA:**
`55e1d50475f2e219cb9393e99de3fe5ae344d6d4`.
Check its new exact-SHA Preflight after the commit; earlier
`215778ef` evidence does not validate this correction. Keep
KDE/Windows physical locale and all OS release gates open until
accepted. This scope remains read-only and uses no new permissions.

## A1d — KDE/Windows native tray menu EN/RU (2026-10-24)

**Confirmed source gap:** The native KDE tray is `ksni::blocking`
(`linux_tray.rs`) with six static English `StandardItem` labels.
Non-Linux desktops use a Tauri 2 tray with the same six immutable
English `MenuItem` labels. Previous A1a/A1b/A1c localized card,
Settings, About and detached monitor hover only. The exact A1c
`55e1d504` source passed
[Preflight #40137480766](https://github.com/morozhenko-apps/repoticker/actions/runs/40137480766),
4/4 SUCCESS; physical KDE/Windows menu-language acceptance is open.

**Architecture:** one native pure `tray_i18n` mapping indexed by the
existing stable action IDs: `open`, `settings`, `fetch`,
`sync`, `about`, `quit`. English is fallback for unexpected
saved values. Labels have no effect on the action IDs, Git safety,
card click behavior, native permissions or shortcuts.

- On KDE, initialize `LinuxTray.language` from the saved config
  with a safe English fallback, and update the managed
  `ksni::blocking::Handle<LinuxTray>` on a successful language
  save with `Handle::update`. Keep existing DBus item and callbacks
  alive, do not tear down/recreate the StatusNotifierItem.
- On non-Linux (Windows), build the existing six-item Tauri menu
  from the same labels. After successful config save, use the
  existing `TrayIcon::set_menu` API to swap menu contents while
  retaining the same tray icon and ID-driven action callbacks.
  Menu updates are best-effort after the config transaction,
  never an extra config write or a reason to misreport saving
  as failed. No new background polling or platform dependency.
- Update both existing `save_settings` and `set_language`
  write paths. No live preview is required before Settings OK;
  Cancel must never update the tray. All action IDs unchanged.
- Add Rust pure label, fallback and action-ID coverage tests,
  Node source-level KDE/Windows lifecycle and Git-safety regression
  tests. Then run one stable exact-code Preflight including Linux
  desktop compile. Windows runtime and KDE physical refresh
  acceptance must remain separate and explicitly open.
- No autostart, new IPC, Tauri/ksni dependency, `main` promotion,
  new package/tag/release or expanded GitHub privileges.

**Rollback:** isolated Rust production/test commits. Existing config
format unchanged; published v0.2.0 remains untouched.

### A1d native tray source and test checkpoint (2026-10-24)

- `d03708fb69b04dda11258075c9dab11bfd219cf9`
  adds a pure Rust `tray_i18n::label(language, action_id)`
  EN/RU/fallback mapping and unit tests for all six stable
  native IDs, including `safe_sync` preserving the original
  action dispatcher. No menu command/event ID or Git action
  has been renamed.
- KDE `LinuxTray` now loads the language from existing
  `read_config` with fallback to EN and refreshes the existing
  blocking KSNI handle with `Handle::update` after a saved
  preference change. The StatusNotifierItem is neither
  unregistered nor respawned.
- The non-Linux Tauri tray creates the six menu items from
  the same dictionary at startup. After successful
  `save_settings` or `set_language`, it rebuilds only the
  **menu** through `tray_by_id("repoticker").set_menu`.
  The icon, tray event listeners and action IDs are retained.
  A platform repaint failure does not reverse the already
  completed settings transaction.
- `tests/tray-safe-sync.test.mjs` now asserts the full six-ID
  dictionary, KDE handle update, Windows menu replacement,
  stable Safe sync dispatcher and absence of unsafe pull
  action. Rust unit tests check EN/RU/unsupported locale
  fallbacks and an unknown action ID.
- Exact first candidate
  [Preflight #40139138207](https://github.com/morozhenko-apps/repoticker/actions/runs/40139138207)
  passed the Node tests but reported deterministic Rustfmt
  differences in the new non-Linux menu builder.
  `24f6c7bb244198c7530d70d72c612ae6d6bfbd1d`
  applied the exact formatter diff.
- **Final executable/test SHA:**
  `24f6c7bb244198c7530d70d72c612ae6d6bfbd1d`.
  [Preflight #40139215931](https://github.com/morozhenko-apps/repoticker/actions/runs/40139215931)
  is the exact result to inspect before claiming 4/4.
  KDE and Windows physical tray popup localization and
  post-Settings-OK label changes are unverified until
  owner/device acceptance. Windows binaries were not
  compiled in the Linux preflight.
- Autostart, main, release tags, OS credential permissions,
  HTTP transports and configuration schema are untouched.

### A1d Rustfmt normalization follow-up

The exact `24f6c7bb` Preflight showed one remaining whitespace-only
Rustfmt difference before `build_desktop_tray_menu`. No Node
regression was reported. `bdcd442b8c3d99b442a9471eb737dae18e4ccd74`
removes that last blank line. **The final executable/test source
candidate is now `bdcd442b8c3d99b442a9471eb737dae18e4ccd74`.**
Check the first exact-SHA Preflight for that commit before claiming
Rustfmt, desktop compile, or aggregate success; previous source
runs do not validate the changed SHA.

KDE and Windows tray language physical smoke remain OPEN.

## A3 — Settings keyboard language listbox and focus accessibility (2026-10-24)

**Root-cause evidence from current `dev`:** Settings uses a custom
WebKitGTK-friendly button/listbox to avoid native Wayland dropdown
displacement. Its controller currently toggles open/close only on
`click`, selects only via option `click`, and handles global
`Escape` by setting `hidden`. There is no keyboard ArrowUp/
ArrowDown/Home/End option focus path, opening does not move focus,
Escape does not return focus to the trigger, and keyboard Tab leaves
the popup potentially open. These are deterministic source gaps,
not inferred regressions from physical testing.

**Architectural decision already satisfied:** Retain the existing
custom option buttons, accessible listbox roles, and popover CSS,
because converting back to a native select would reintroduce the
previously accepted KDE geometry defect. This is a limited a11y
behavior fix, not a new UI architecture.

Implementation/acceptance:

1. One controller handles opening, option focus and closure. Clicking
   or pressing Enter/Space on the native button trigger opens it;
   ArrowDown/ArrowUp on the trigger opens and focuses the selected or
   nearest option. While open, ArrowUp/Down wraps between options,
   Home/End focus first/last, Escape closes and restores trigger
   focus; Tab closes and allows normal browser tab-order. Clicking
   outside closes without stealing focus.
2. Options keep actual button semantics, accurate `aria-selected`,
   `role=option`, `tabindex=-1` and stable IDs. Selection still
   previews RU/EN immediately in Settings, preserving saved data
   until OK. Prevent controls from updating while save is in flight.
   Focus only moves on explicit user input, never during startup.
3. Preserve KDE popup geometry, 660x720 shell, existing labels
   and config-only read. No new config fields, native APIs,
   package dependencies, Git operations, autostart or relay.
4. Add runtime-like input tests covering mouse opening, Arrow,
   Home/End, Escape, Tab, outside click, no writes before OK,
   and focus restoration, plus static accessibility invariants.
   Run exact executable SHA stable Preflight and document results.
5. Treat KDE/Windows physical keyboard accessibility as an open
   acceptance item until someone exercises the control on a desktop.

Rollback is an isolated Settings controller/HTML/CSS/tests code
commit, without touching `main` or the published v0.2.0 package.

### A3 Settings listbox code and test checkpoint (2026-10-24)

- `a648b1d029bfd4fd508b5029a552e821ea2fc066`
  introduces one shared open/close/focus path for the existing
  EN/RU Settings language listbox. The two option buttons
  now have stable IDs and programmatic `tabindex=-1`, with
  selected state still communicated through `aria-selected`
  and disclosure through `aria-expanded`.
- Keyboard ArrowUp/ArrowDown, Home/End, Enter/Space via
  native button click, Escape focus return, Tab without
  `preventDefault`, and outside pointer dismissal preserve
  the original 660×720 KDE popup geometry and preview semantics.
  Focus never moves during config-only startup.
- `dd91fa6d0a3a88ed51e1a435f5d03d689d2bae22`
  upgrades the actual Settings controller fixture to record
  active focus and document handlers and verifies wraparound,
  Home/End, Escape, Tab, outside click and a keyboard-driven
  RU preview followed by Cancel without config writes.
- Exact executable/test candidate:
  `dd91fa6d0a3a88ed51e1a435f5d03d689d2bae22`,
  [Preflight #40139791710](https://github.com/morozhenko-apps/repoticker/actions/runs/40139791710).
  The candidate's run was pending on first inspection. Do
  not count A3 validated until stable Node + Rust + desktop
  Linux + aggregate jobs pass on this SHA.
- Prior tray EN/RU executable SHA `bdcd442b` passed
  [Preflight #40139314507](https://github.com/morozhenko-apps/repoticker/actions/runs/40139314507),
  **4/4 SUCCESS**. KDE/Windows physical menu refresh and
  current keyboard/a11y acceptance are still open. Neither
  app version, release nor OS autostart has changed.
