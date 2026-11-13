# Mode B: real main card app.mjs controller, native IPC and A1/A2 event admission

Production baseline `a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Source `apps/desktop/ui/app.mjs`, 788 lines, direct imports of `view.mjs`, `scan-refresh.mjs`, `monitor-presentation.mjs`, `github-monitor.mjs`, `native-drag.mjs` and other pure UI policy modules. Prepared parent `31a29fe5db974d9c3441ffdab777aa3ed1a5296b`.

**A1 remains NEW_HARNESS**: the real `app.mjs` top-level controller is neither exported as pure functions nor instrumented by the existing UI coverage run. It must be imported with a contract-faithful DOM/Tauri environment that executes its actual listeners/closures. No new instrumented coverage or actual controller test was run while making this map.

## Existing evidence: executable imported helpers versus source-contract assertions

| Real test module | Direct assertions/evidence | Level |
| --- | --- | --- |
| `tests/scan-refresh.test.mjs` | Real `createScanRefreshQueue` handles coalesced native scans, superseded failure, busy transitions and source-work spinner; one test inspects `app.mjs` source routing | E helper, S controller |
| `tests/ui-layout.test.mjs` | Real pure `nextCardView`/window-height/commit eligibility; many card HTML/CSS and `app.mjs` regex checks for buttons/progress/layout/drag/hovers | E pure helpers, S controller |
| `tests/repo-menu.test.mjs` | Real `placeRepoMenu` geometry; source checks for open/close and native repo actions, not actual top-level event listener | E menu helper, S controller |
| `tests/git-fetch-cancel.test.mjs` | Source matches Fetch-as-Cancel button and separate `cancel_git_fetch` invocation, no actual two-click imported `app.mjs` execution | S controller; native core cancellation E separately |
| `tests/hover-fallback.test.mjs`, `tests/split-status-hover.test.mjs` | Real hover projection helpers; source checks on hover target bindings and native balloon | E projection, S controller |
| `tests/ui.test.mjs` | Real model metrics and `safeRunUrl` domain helpers; does not import main controller | E model, not A1 |
| `tests/mode-b-resilience.test.mjs` | Real remote presentation/helper state and queued scan policy, not in-situ `app.mjs` lifecycle | E helpers, not actual top-level app |
| Native Git tests | `OperationLock` is source-only in main command, while Rust Git core has real integration cancellation/refs protection | E core / S main IPC; documented in `branch-map-main-git-admission.md` |

## Main controller named functions, closures and branch obligations

| Surface / functions | Distinct predicates or outcomes | Current evidence and missing controller assertions |
| --- | --- | --- |
| Bootstrap `invoke`, `traceStartup`, top-level imports | Tauri invoke available vs unavailable, startup diagnostics failures nonblocking; initial language config before/after local snapshot | S; ? run actual bootstrap with mocked Tauri bridge and DOM, no unhandled rejection |
| `updateReposActivity`, `cancelAutoHide`, `armAutoHide` | First-scan indicator, 15s compact-only idle timeout, no timer while hidden/repos/quota/scan; reset on pointer/key/visibility; native hide success/error | E `shouldSpinForRepos` helper, S controller; ? fake-clock actual timer and hidden/window order |
| `paintNotice`, `showError`, `showResizeError`, `showGitOperationErrors`, `clearError` | Notice absent vs present, translated known vs native error, finite visible result | S controller; ? newline/secret error and locale late changes in real DOM |
| `addText`, `makeRepoRow`, `paintCiIndicator`, `updateCiStatuses` | Text uses `textContent`; row empty/status/path and CI outcome decoration; no provider HTML injection | E pure indicators, S DOM row insertion; ? malicious repository strings, visibility, aria and row state |
| `hideRepoMenus`, `showRepoMenu`, menu click/keydown/outside events | Toggle same anchor, restore focus, position/resize, only current path, native opening vs Git action, arrow/Home/End, outside pointer & scroll | E geometry, S click/keyboard wiring; ? actual DOM focus/dismissal, changed/removed rows while action awaits |
| `updateActionState` | Empty repos, zero eligible sync, busy/foreign progress, active Fetch Cancel, fetchCancelling, terminal finish; percentage and accessible title | S source, E `syncReadyCommitCount` helper; ? actual enabled/disabled transitions, 0/1/max count and mixed statuses |
| `traceHover`, `setActiveTooltip`, `setQuotaOpen`, `resetQuota`, `clearBrowserTooltips` | Diagnostics opt-in; queued popup kind last-wins; pending show resolved after hover moved/hidden; hide failure; no redundant browser tooltip | E popup geometry/hover helper, S controller; ? actual async deferred native show/hide and later kind/focus/visibility changes |
| `monitorRefreshState`, manual indicator click | Kind all vs individual, aria-busy rejection of duplicate clicks, independent GitHub metric-only request and no full Git scan | JS GithubMonitoring E, S top-level binding; ? actual click and two overlapping native progress events |
| `setCardLanguage`, `updateMetricAccessibleNames`, `renderMonitorMetrics`, `traceMonitorReady` | Supported locale/direction, repaint metrics/accessibility, monitor readiness once, pending notice translation | E pure translations/metrics, S controller; ? actual 20-language DOM/aria update, stale config race |
| `render`, scan queue `publish`, `refresh` | Replace repo rows, empty-root vs no-valid-repos, preserving newer monitor revision on delayed local scan; re-size drawer only on row count change; show first error | E `reconcileScanPresentation` and scan queue; ? actual rows and in-flight native scan/drop/hidden events |
| `refreshMonitor` | Increment monitorRequest, ignore older successful reply, merge new remote result only, no Git scan; failure shows error | E presentation helper, S controller; ? error from superseded old request after newer success can still show a stale notice, *hypothesis* requiring real controller test |
| `consumeResults` | Filter exact status=error, no permanent success log or canceled count; first error displayed | E UI-layout source checks; ? actual DOM notice on mixed success/error/cancel |
| `cancelActiveFetch` | Already cancelling returns early; invoke cancel true keeps disabling, false restores; rejection shows error and restores | S; ? simultaneous cancel clicks, failed request and subsequent native finish event |
| `runGitAction` | `busy` drops overlapping card action; begin/progress setup; invoke selected repo/all; consume results; refresh; error; finally clears flags and re-renders | S; ? actual double click, successful and failed native action, one refresh, progress from tray interleaved |
| `resetView`, `openView`, UI click/keydown | Compact vs repos mode, pending quota hide, IPC resize success/failure, hide card and Escape closes menu/quota/drawer/card in priority order | E pure view policy, S event bindings; ? real event ordering, resizing failure preserves DOM/intent |
| Native progress listener | Accept only known operations, create progress on other-source action, monotonic completed, Set active/done/errors, finish behavior, patch only affected row | S; ? malformed/out-of-order payload, tray finish during card action, missing row and unknown status, never reset scrollbar |
| Card show/hide/config change listeners | Cancel auto hide, reset quota/drag, config locale revision guard, refresh local Git once via queue; remote update triggers `refreshMonitor` only | E queue/helper, S actual listener; ? hidden → shown with stale old snapshot/config and concurrent auth/scope/locale |
| Drag gesture and pointer capture | Left primary pointer outside controls, begin accepted, stop only matching pointer, lost capture/up/cancel, no leaked native drag after hide | E `createNativeDragGesture` helper, S DOM integration; ? native OS pointer capture and Wayland/Windows physical tests |

## A2 contract clarification discovered from real source

- A **second Fetch button click during active card Fetch** takes `cancelActiveFetch()` via the `progress.operation==="fetch"` guard, not `runGitAction("fetch")`. In the real controller this is the intended Fetch-as-Cancel UX.
- **Two direct native `perform_git_action("fetch")` requests** are serialized by the Tauri `OperationLock`, but are **not automatically coalesced**: absent Quit/error, the second may run after the first. Tests must not assert a fictitious native `busy` rejection.
- **Two Safe Sync requests** are serialized and the second re-inspects the updated Git state. With an initial one-commit-ahead fixture and no external mutation, expect one remote push and the later `AlreadyCurrent` state; assert no simultaneous branch writes.
- This corrects the older A2 short-form wording, which merged UI double-click behavior with native IPC contention. No design change or bug is claimed.

## Positive + N1–N12 and real harness prerequisites

| Category | Current status | Needed in actual top-level controller test |
| --- | --- | --- |
| Positive | E helpers / S controller | Native bootstrap, render, Fetch, Sync, view and hover flow |
| N1 | E helpers / ? | Malformed Tauri event payload, unknown operation/kind, missing DOM text |
| N2 | E helpers / ? | 0/1/10+ rows, 0/100% progress, 15s auto hide and tiny/long translated text |
| N3 | ? | IPC rejects/never resolves, monitor failure, delayed config read; no external network |
| N4 | ? A1/A2 | UI Fetch-as-Cancel vs direct native queued command; double Sync and repeated Quit |
| N5 | E helper / ? | Deferred scan, monitor, popup, config and Git action events in reverse order |
| N6 | E helpers / ? | Incomplete snapshot, missing monitor fields, stale event and invalid saved locale |
| N7 | S / ? | Only enrolled native repo operations and fixed external opens, no arbitrary HTML/URL |
| N8 | E translations / ? | Actual locale/RTL DOM repaint while tray action in progress |
| N9 | ? / OS | Escape/view switch/hide during operation, pointer capture cancel, app quit |
| N10 | E text helpers / ? | Provider-supplied content never used as HTML; errors/diagnostics redacted |
| N11 | NA | No paid entitlement |
| N12 | ? | Native IPC config read/write failure and stale UI recovery |

Stage 9 needs one **reusable external DOM/Tauri harness** that imports actual `app.mjs` from a fresh URL/module scope, with required HTML IDs, event listeners, fake scheduler, deterministic deferred IPC/notification callbacks and isolated globals. The component itself remains real and unmocked. Define exact A1 tests for auto-hide, row/notice, locale/monitor race, popup ordering, Git action and native progress/drag. Cover A2 with distinct UI and native contract fixtures. Only after global Stages 3–8 are complete.

Mutation kills: remove busy/last-wins checks, merge stale scan directly, accept an unknown native operation, schedule a full Git scan for monitor-only event, clear active Fetch before native acknowledgement, remove pointer identity, use `innerHTML` with repository text, publish wrong locale after delayed config result. Real instrumented `app.mjs` assertions, not regex, must fail.

No tests, production code or CI executed. Mode B overall remains PARTIAL.
