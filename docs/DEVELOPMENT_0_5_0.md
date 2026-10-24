# RepoTicker v0.5 development — native notifications, startup and accessibility

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
3. [ ] **A2.3: Native preference and notification adapter.** Store
   an opt-in preference (default OFF), add Settings OK/Cancel behavior,
   and use a maintained, platform-capability-aware Tauri notification
   adapter on Linux/Windows; keep OS permission state separate from
   the saved preference. Any new dependency must update Cargo.lock.
   Only start completed-run polling after opt-in. Display a concise,
   privacy-limited summary; GitHub credentials stay native.
4. [ ] **A2.4: Final gate and documentation.** Run the stable Rust,
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

