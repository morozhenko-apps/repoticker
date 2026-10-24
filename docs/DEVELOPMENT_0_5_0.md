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
   GitHub REST allowlist to accept paginated \`status=completed\` Actions runs;
   project a minimal, validated \`id\`, \`run_attempt\`, \`conclusion\`,
   \`updated_at\` tuple, without names, secrets, raw payloads or token transfer.
   Add allow/deny and projection tests for malicious paths and input.
2. [x] **A2.2: Deterministic failure transitions.** Add a pure JS state
   machine and tests keyed by monitored account, repository, run ID and
   attempt. First complete read after process start/scope change is a
   silent baseline. Only a newly observed \`failure\` conclusion may emit
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
   in a separate docs commit. Do not ship \`main\` or a release.

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
  [\`e5df4006\`](https://github.com/morozhenko-apps/repoticker/commit/e5df4006b1bf9bceff220189fa639d7dbae4be5e).
  Existing queued/in-progress collection remains ID-only; the explicit
  completed status is now permitted with narrowly validated fields.
- Pure completed-window collector and process-local per-account/repository/
  run-attempt history:
  [\`904838d9\`](https://github.com/morozhenko-apps/repoticker/commit/904838d9c704df4f9a2e3b6c6e069f81e35481e0).
  It does not fetch by itself; no background completed-run traffic
  or notification side effects until native opt-in wiring exists.
- Eleven deterministic Node tests (including later correction):
  [\`908f7f83\`](https://github.com/morozhenko-apps/repoticker/commit/908f7f83ec99d96f458095c2dc3754b6a5f91f37).
  Covers baseline silence, dedup, attempts, account changes,
  failed reads, malformed inputs, per-repository isolation,
  request/concurrency caps and reset.
- [Preflight #40127311636](https://github.com/morozhenko-apps/repoticker/actions/runs/40127311636)
  was **in progress** when last inspected. No green or 4/4 claim yet.
- **A2.3 NOT DONE:** no native notification adapter, opt-in Settings
  preference, OS permissions or autostart. A2.1–A2.2 alone are not a
  usable notification feature. Public main/release remain unchanged.


### A2.2 conclusion-correction follow-up

- [\`1277b738\`](https://github.com/morozhenko-apps/repoticker/commit/1277b7381387473caee146b4b5fe958d2bdc8cb9)
  preserves monotonic failure dedup when GitHub corrects an earlier
  completed conclusion for the same run attempt. Replayed/stale
  success data must not rearm an already issued failure candidate.
  Duplicate same-attempt records in a response are invalid.
- [\`203a1fbf\`](https://github.com/morozhenko-apps/repoticker/commit/203a1fbff67e92f985224841108f58ed823e1608)
  adds regression tests for corrected conclusions and duplicate
  provider records. **Exact latest A2.1/A2.2 executable candidate:
  \`203a1fbff67e92f985224841108f58ed823e1608\`.**
  Validation for earlier SHAs is not transferable to this commit.
- CI and platform acceptance must be verified separately. An inert
  transition tracker is intentionally not wired into the live monitor
  until both the opt-in preference and native delivery adapter exist.
