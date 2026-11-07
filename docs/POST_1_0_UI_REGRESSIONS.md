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
3. [ ] Resolve the notification persistent-config/API contract choice with the owner before implementing the success/failure controls, backend guard, deduplication and 20 native templates.
4. [x] Implement a frameless About titlebar with only an accessible Close button, localized in 20 languages; restrict drag permission to the About window.
5. [ ] Validate actual KDE Wayland and Windows drag, keyboard close, focus, re-open and native presentation. No physical acceptance has been performed yet.
6. [ ] Execute final applicable STABLE JS, Rust and release-contract checks once and record exact evidence; no CI polling after a run is started.

## Validation and rollback

Use deterministic tests for scan/monitor isolation, progress semantics and cancellation, both tray menu orders, and translation key integrity. Relevant suites: `node --test tests/*.test.mjs`, `cargo test --workspace`, and `python3 -m unittest discover -s tests -v` (only if available locally or in trusted CI). A source-level change without executed checks is **PARTIAL**, never complete. Do not commit verbose tracing; use the existing opt-in `REPOTICKER_STARTUP_DEBUG=1` to measure local scan and monitor milestones without logging paths, tokens, repository names or runner inventory. Roll back the scoped functional commit independently of this document if required.

## Open architectural choice: CI notification preferences

**Option A (preferred, compatible additive extension):** keep `ci_failure_notifications: bool` and introduce a separately persisted `ci_success_notifications: bool` defaulting to false. Old configurations retain the existing failure preference, and success alerts remain off unless explicitly opted in. The native notification command must validate both permission and requested conclusion.

**Option B (unified schema with migration):** replace the old boolean with `ci_notification_mode` = `off | failures | successes | both` and explicitly migrate old configs. It centralizes policy but adds a schema migration and compatibility risks for rollback/downgrade.

Do not implement either persistent format until the owner selects an option. Successful and failed alerts must be separate monotonic `run id + attempt + conclusion` facts, silently baselined on startup/scope change, bounded/deduplicated, rate-limit aware and limited to authorized monitored repositories.

## Implementation evidence (2026-11-07)

- Documentation-first plan: `0d719ef9a715b4146ca0364369bea23810c83e28`.
- Spinner isolation, Fetch percentage and cancellation accessible name, native Linux/Windows menu order, Russian labels and associated tests: `7bf604db29c563d8d417d81c5dad6f4fed4a2207`.
- Frameless About with scoped native drag permission, close-only UI, 20 localized accessible Close labels and associated tests: `86f57bdfbee467304055cd81a8c10653492aa052`.

**Current state: PARTIAL / unverified runtime.** No local JS, Rust, release-contract or physical UI suite has been executed in this ChatGPT environment. No release/tag/main change was made. The failure-only CI alert preference remains unchanged until its configuration compatibility decision. A passing source diff is not a passing validation gate.
