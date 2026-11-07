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
4. [ ] Implement selected-mode Settings control, native configuration/authorization guard, event tracker and 20 native message templates; add deterministic tests for startup silence, identity, scope, deduplication and each choice.
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


## Implementation evidence (2026-11-07)

- Documentation-first plan: `0d719ef9a715b4146ca0364369bea23810c83e28`.
- Spinner isolation, Fetch percentage and cancellation accessible name, native Linux/Windows menu order, Russian labels and associated tests: `7bf604db29c563d8d417d81c5dad6f4fed4a2207`.
- Frameless About with scoped native drag permission, close-only UI, 20 localized accessible Close labels and associated tests: `86f57bdfbee467304055cd81a8c10653492aa052`.

**Current state: PARTIAL / unverified runtime.** No local JS, Rust, release-contract or physical UI suite has been executed in this ChatGPT environment. No release/tag/main change was made. The failure-only CI alert preference remains unchanged until its configuration compatibility decision. A passing source diff is not a passing validation gate.
