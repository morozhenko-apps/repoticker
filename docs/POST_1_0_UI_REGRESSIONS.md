# Post-v1.0.0 UI regressions

Owner report: 2026-11-07. Tracking: [issue #21](https://github.com/morozhenko-apps/repoticker/issues/21).

## Baseline and scope

Baseline: `dev` at `df22d025cca176243068876b5e0931aa6d0afd53`; `main` stays reserved for reviewed releases. This work is a regression batch, not a release or permission to change hosted infrastructure. Keep native Git invariants and GitHub API scopes unchanged.

## Source-level diagnosis

- Repos spinner: the card currently combines `localScanActive` and `fullMonitorActive`. Full GitHub monitoring does not inspect local repositories and must not drive the Repos loading signal. Local first snapshot latency, Git discovery and inspection still require separate physical timing before they can be called optimized.
- Fetch progress: native Git operation events already provide `completed` and `total`, but the card replaces Fetch percentage with a Cancel label. Display `completed / total` as a whole-repository count percentage. This is **not** per-repository network byte progress. Keep cancellation as the active button's click action, exposed through its accessible name and tooltip. Do not invent `100%` for an unknown total.
- Tray ordering: the Linux KSNI menu and Windows Tauri menu currently put Settings before Fetch and Sync. Order both as Open, Fetch, Sync, Settings, About, Quit. Preserve stable action IDs and dispatch semantics.
- Localized labels: align Russian tray/card Fetch as `Фетч`, Sync as `Синхр.`, and tray About as `О программе`; preserve operation identity and all 20 locale catalogs. The alternative label `Статус` would misrepresent a Git fetch, which updates remote-tracking refs even though it leaves the working tree alone.
- About: `minimizable: false` already exists in Tauri config, but the Linux platform ignores it. Implementing a guaranteed Close-only window needs a custom window frame/titlebar and a native physical KDE/Windows acceptance gate; do not mistake a redundant config flag for a fix.
- CI notifications: the existing native/persisted contract contains a single `ci_failure_notifications` boolean and intentionally ignores new successful runs. Independently selectable success and failure delivery requires an owner-approved configuration/API compatibility decision before code changes.

## Milestones

1. [x] Analyze the active dev source, relevant test assertions and native/platform boundaries. Record the user-visible requirements and a bounded diagnosis.
2. [x] Commit scoped card spinner/progress and native tray/localization adjustments with matching source-level regression tests. Notification configuration remains unchanged. Final execution is pending.
3. [x] Owner chose a single `ci_notification_mode` enum (`off | failures | successes | both`) on 2026-11-07; default `off`; **no migration** from `ci_failure_notifications`. Legacy boolean is deliberately ignored. Other persisted preferences and OS credentials remain untouched.
4. [x] Implement selected-mode Settings control, native configuration/authorization guard, event tracker and 20 native message templates, with deterministic JS/Rust regression tests for startup silence, identity, scope, deduplication and each choice. Runtime test gate is still pending.
5. [x] Implement a frameless About titlebar with only an accessible Close button, localized in 20 languages; restrict drag permission to the About window.
6. [ ] Validate actual KDE Wayland and Windows drag, keyboard close, focus, re-open and native presentation. No physical acceptance has been performed yet.
7. [ ] Execute final applicable STABLE JS, Rust and release-contract checks once and record exact evidence; no CI polling after a run is started.

## Validation and rollback

Use deterministic tests for scan/monitor isolation, progress semantics and cancellation, both tray menu orders, and translation key integrity. Relevant suites: `node --test tests/*.test.mjs`, `cargo test --workspace`, and `python3 -m unittest discover -s tests -v` (only if available locally or in trusted CI). A source-level change without executed checks is **PARTIAL**, never complete. Do not commit verbose tracing; use the existing opt-in `REPOTICKER_STARTUP_DEBUG=1` to measure local scan and monitor milestones without logging paths, tokens, repository names or runner inventory. Roll back the scoped functional commit independently of this document if required.

## Approved decision: one opt-in CI notification mode (2026-11-07)

The owner approved **Option B with no migration**. Persist a single enum `ci_notification_mode` with values `off`, `failures`, `successes`, `both`, defaulting to `off`. An older `ci_failure_notifications` field must be ignored, even when it was `true`; do not copy it or enable notifications. Other local settings, monitor scope, and OS credentials remain untouched. A later settings save may naturally drop the ignored unknown field. Reject invalid values on the native Settings command; fail closed on unknown persisted enum states.

Use a single labelled Settings select, transactional Apply/Cancel, and locale-complete labels for all twenty supported languages. A changed setting requires a native config event; no GitHub auth regrant should be necessary.

Notifications are only for the explicit conclusions `failure` and `success`, and only when that conclusion is selected. Restrict native IPC by currently persisted mode, monitored organization and repository selection; never accept arbitrary notification strings, links or provider payload. Independently deduplicate each `repository + run_id + run_attempt + conclusion` fact. The first successful observation after launch, scope/mode switch or provider recovery establishes a silent baseline; transient stale API responses must not create duplicate alerts. Keep bounded memory, provider request bounds and no extra API requests when notifications are off.

A successful GitHub workflow run must not be confused with a successfully completed local Git Fetch. These notification preferences affect GitHub Actions only. Avoid verbose operation logs and sensitive values.


## Follow-up: CI notification recovery and Mode B regression map

The approved opt-in enum and per-conclusion native guard remain unchanged. Existing
source-level tests covered launch baselines and mode changes, but a focused
reproduction found a recovery regression: after a **previously successful**
repository snapshot, a failed completed-run read retained its old tracker
history. Subsequent recovery incorrectly alerted on completions from the
unobserved interval. Whole-monitor task/API failure has the same potential
because it skips notification observation without clearing historical state.

Plan: clear **only the affected repository's** tracker history after a failed
completed-run read; preserve unaffected repositories' dedup history. When a
task/all monitoring cycle cannot provide trustworthy job coverage or provider
scope, reset notification history before a future successful poll. Runner-only
refreshes retain the existing independent task baseline. No extra REST calls,
persistent queues, logging, window changes or stored notification history.
This enforces the already-approved silent-on-recovery behavior.

Mode B risk mapping for this incremental feature (historical
`MODE_B_MATRIX.md` and `MODE_B_COVERAGE.md` remain in Git history,
not in the current public docs tree):

| Class | Required notification scenario | Test owner |
| --- | --- | --- |
| Positive | A new selected success/failure after valid baseline emits once | `tests/ci-failure-events.test.mjs`, `tests/ci-native-integration.test.mjs` |
| N1/N2 | Invalid mode, run ID, attempt, duplicate run facts, page/identity bounds reject | JS tracker + native Rust scope tests |
| N3/N5 | One repo fails, other remains live; recovery baselines silently; late refresh cannot rewind selection | JS tracker and monitor integration |
| N4 | Repeated identical poll, corrected conclusion, restart/mode switch do not replay | JS tracker |
| N6/N7 | Invalid UTC, malicious repo identity, unauthorized owner/conclusion never notify | JS collector and native Rust guard |
| N8/N9 | Time validity, disconnect, rate limit and permission failure respect silent baseline | JS tracker/monitor integration |
| N10 | User-selected mode and 20 native notification translations | Settings and localization tests |
| N11 | Not applicable: no paid notification entitlements | Contractual N/A |
| N12 | Native notification permission/delivery and OS window interaction require Linux/Windows physical evidence | Native tests and platform acceptance |

This is a **feature-specific test matrix**, not a claim of 100%
repository-wide branch coverage. Historic 2026-10-29 measurement was
60.95% JS lines, 56.34% branches and 48.22% functions on the specified
source. The owner’s earlier Mode B work should not be described as
unperformed; new code still needs its own exact-source execution evidence.

Recovery fix: [`26038df`](https://github.com/morozhenko-apps/repoticker/commit/26038df2bd53f0ec0f4963bd74611889f4c2e906).
An error in a single repository's completed-run API read clears only
that repository's notification history; global task/transport failure
clears the alert tracker, and runner-only polling preserves it.
The existing source tests also acquired an exact `conclusion` field
assertion, previously omitted from the expected alert structure.

Execution boundary: isolated GitHub-sourced JavaScript evaluation in the
connected tool environment executed **19 tracker tests, 11 monitor/native
integration tests and 9 Settings visual contract tests, all passing**.
The integration harness substitutes external I/O and asynchronous event
loop scheduling and is therefore focused diagnostic evidence, not a
Node test runner result. No Rust/Cargo compile, full STABLE suite or
installed KDE/Windows acceptance was executed for this commit.


## Implementation evidence (2026-11-07)

- Documentation-first plan: `0d719ef9a715b4146ca0364369bea23810c83e28`.
- Spinner isolation, Fetch percentage and cancellation accessible name, native Linux/Windows menu order, Russian labels and associated tests: `7bf604db29c563d8d417d81c5dad6f4fed4a2207`.
- Frameless About with scoped native drag permission, close-only UI, 20 localized accessible Close labels and associated tests: `86f57bdfbee467304055cd81a8c10653492aa052`.

**Current state: PARTIAL / unverified installed runtime.** No full Node/Rust/Python CI suite or KDE/Windows physical acceptance has been executed in this ChatGPT environment. No release/tag/main change was made. The single four-choice opt-in CI alert mode has replaced the old persisted boolean. A passing source diff is not a passing validation gate.

- Mode-selection decision documented before source changes: `c8c06a92f4dc07503bd785aafd63874d107d0180`.
- Native config, GitHub monitor, per-run conclusion tracking, localized option labels and native notification templates, plus related test contracts: `3253bc2d870106c53ad15314fd9d62352ce04f18`.
- Focused offline validation in the connected ChatGPT JS environment: transformed source syntax parses for the tracker, monitoring, Settings and locale catalog; tracker simulated baseline, both conclusions and deduplication; validated notification templates contain all three placeholders in all 20 locales and option text exists across 18 non-EN/RU locales. This does **not** replace Node test execution or Rust compilation.
