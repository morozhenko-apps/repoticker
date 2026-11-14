# Mode B: complete main-card controller method ownership and A1 harness contract

Production `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; actual source `apps/desktop/ui/app.mjs` blob `a2692d9cbaa07863ef6f75a5df6503010cf0d8fe`, 788 lines. Audit parent `764e9ab57dd142f8e428153f4663e3633332bfaf`. Existing [controller branch map](branch-map-main-card-controller.md) gives detailed source branches and prior static/direct-helper test evidence.

**Evidence distinction:** no reviewed main-card test imports and executes the real `app.mjs` top-level controller. Existing `ui-layout`, `repo-menu`, `git-fetch-cancel`, `hover-fallback`, `scan-refresh`, `mode-b-resilience` tests execute independent pure helper code and/or inspect `app.mjs` source strings. None is evidence that the main card's actual event handlers ran. Do not count these pending methods as failing tests.

All **43 original lexical entries** now have dispositions: 39 newly classified below (36 `P_CONTROLLER`, 1 `CALLBACK_P`, 2 `ADAPTER`) plus the already classified 3 `CALL_SITE` (lines 545,612,713) and 1 `STARTUP_CALL` (line 745). An adapter's pure wrapper needs no standalone business test; its effects remain tested through the owner when A1 exists.

## Every previously unclassified main-card entry

| Source line | Actual named entry | Status | Test family |
| ---: | --- | --- | --- |
| 21 | `const byId = id => document.getElementById(id);` | ADAPTER | BOOT |
| 23 | `const invoke = (command, args = {}) => {` | ADAPTER | BOOT |
| 29 | `const traceStartup = stage => {` | P_CONTROLLER | BOOT |
| 51 | `function updateReposActivity() {` | P_CONTROLLER | IDLE |
| 63 | `function cancelAutoHide() {` | P_CONTROLLER | IDLE |
| 66 | `function armAutoHide() {` | P_CONTROLLER | IDLE |
| 86 | `function paintNotice() {` | P_CONTROLLER | NOTICE |
| 97 | `function showError(message) {` | P_CONTROLLER | NOTICE |
| 101 | `function showResizeError(message) {` | P_CONTROLLER | NOTICE |
| 105 | `function showGitOperationErrors(count, message) {` | P_CONTROLLER | NOTICE |
| 109 | `function clearError() {` | P_CONTROLLER | NOTICE |
| 113 | `function addText(parent, tag, value, className = "") {` | P_CONTROLLER | NOTICE |
| 125 | `function hideRepoMenus(restoreFocus = false) {` | P_CONTROLLER | MENU |
| 136 | `function showRepoMenu(button, repoPath) {` | P_CONTROLLER | MENU |
| 215 | `function paintCiIndicator(row, repo) {` | P_CONTROLLER | REPOS_CI |
| 232 | `function updateCiStatuses(next) {` | P_CONTROLLER | REPOS_CI |
| 241 | `function makeRepoRow(repo) {` | P_CONTROLLER | REPOS_CI |
| 272 | `function updateActionState() {` | P_CONTROLLER | ACTIONS |
| 320 | `function traceHover(kind, stage) {` | P_CONTROLLER | HOVER |
| 336 | `function setActiveTooltip(kind) {` | P_CONTROLLER | HOVER |
| 343 | `function resetQuota() {` | P_CONTROLLER | HOVER |
| 352 | `function setQuotaOpen(kind = null) {` | P_CONTROLLER | HOVER |
| 400 | `const enter = () => {` | CALLBACK_P | HOVER |
| 430 | `function monitorRefreshState(kind, active) {` | P_CONTROLLER | MONITOR |
| 439 | `function clearBrowserTooltips() {` | P_CONTROLLER | MONITOR |
| 445 | `function updateMetricAccessibleNames() {` | P_CONTROLLER | MONITOR |
| 452 | `function setCardLanguage(language) {` | P_CONTROLLER | MONITOR |
| 492 | `function renderMonitorMetrics(state) {` | P_CONTROLLER | MONITOR |
| 503 | `function traceMonitorReady() {` | P_CONTROLLER | MONITOR |
| 509 | `function render(next) {` | P_CONTROLLER | SCAN |
| 554 | `function refresh() {` | P_CONTROLLER | SCAN |
| 560 | `async function refreshMonitor() {` | P_CONTROLLER | SCAN |
| 574 | `function consumeResults(results) {` | P_CONTROLLER | GIT |
| 582 | `async function cancelActiveFetch() {` | P_CONTROLLER | GIT |
| 595 | `async function runGitAction(operation, repoPath = null) {` | P_CONTROLLER | GIT |
| 615 | `function resetView() {` | P_CONTROLLER | VIEW |
| 624 | `async function openView(target) {` | P_CONTROLLER | VIEW |
| 718 | `function refreshCardConfiguration() {` | P_CONTROLLER | CONFIG |
| 762 | `function stopDragging(event = null) {` | P_CONTROLLER | DRAG |

## Exact behavior families and nonduplicated evidence

| Family | Owned source lines | Controller outcomes requiring actual subject execution |
| --- | --- | --- |
| BOOT | 21, 23, 29 | native unavailable vs configured, diagnostics rejected, initial locale and snapshot order |
| IDLE | 51, 63, 66 | first scan spinner, 15s compact-only hide, pointer/visibility cancellation and error |
| NOTICE | 86, 97, 101, 105, 109, 113 | fixed text-only native/resize/Git notice, locale repaint, error privacy provenance |
| MENU | 125, 136 | menu open/toggle, original repo owner, outside/keyboard/Escape focus and geometry |
| REPOS_CI | 215, 232, 241 | Git before CI, accessible DOM rows and no remount on CI update |
| ACTIONS | 272 | fetch/cancel/busy/foreign progress, 0/100% actions, disabled/ARIA states |
| HOVER | 320, 336, 343, 352, 400 | queued native show/hide last requested kind, delayed result, focus/leave, failure |
| MONITOR | 430, 439, 445, 452, 492, 503 | per-metric unknown/known, aria-busy, RTL locale, first trace once |
| SCAN | 509, 554, 560 | local Git scan vs remote read, stale snapshot/monitor last-wins, no extra Git scan |
| GIT | 574, 582, 595 | Fetch-as-Cancel, failed cancel, single action, per-repo errors and tray progress |
| VIEW | 615, 624 | Escape priority, native resize rejection, quota hide and compact/repos |
| CONFIG | 718 | config revision, delayed initial Git scan and newer saved locale |
| DRAG | 762 | primary pointer only, owner pointer identity, captured/native stop, hidden |

Existing independent direct helpers with credit are `createScanRefreshQueue`/stale merges, `compactStatus` (indirect via Quota), `placeRepoMenu`, `repoRowIndicator`, `syncReadyCommitCount`, `nextCardView`, `createNativeDragGesture`, and locale projections. Their tests **do not satisfy A1** main-card event path.

## Real A1 subject harness after Stage 3–8 sign-off

Use the established `tests/settings-github-confirm.test.mjs` design precedent: the **actual** controller is imported in a disposable DOM/window global context with fake *external native* `invoke`, `event.listen`, HTML-derived IDs, accurate `querySelectorAll`/focus/ARIA, pointer capture, bounding rectangles, fake clock and deferred Promises. Never stub or copy `app.mjs`'s `render`, `runGitAction`, `refreshMonitor` or its other business closures.

| Case family | Mutation-sensitive required assertions |
| --- | --- |
| A1-BOOT | startup config, first Git snapshot and remote monitor independently; absent native IPC yields finite error, no leaked provider body |
| A1-RENDER | 0/1/10+ repo rows, unknown vs covered five GitHub metrics, all ARIA labels and malicious repo names via `textContent` |
| A1-ORDER | native monitor update while local `get_snapshot` held; old local completion preserves newer remote counts; monitor event never starts local Git scan |
| A1-GIT | Fetch click invokes real `perform_git_action("fetch")`, second click during progress invokes `cancel_git_fetch` **not** a second fetch; denied cancellation restores usability; Safe Sync only under eligible status |
| A1-PROGRESS | start/complete/finish from tray in out-of-order delivery, unknown op ignored, completed count monotonic, rows not remounted on CI-only event |
| A1-HOVER | deferred native popup show, newer kind and card hidden -> latest wins, hide failure bounded, hover/focus/leave transitions and `aria-expanded` exact |
| A1-MENU | same menu click close, keyboard Arrow/Home/End, outside click, scroll and Escape restore correct original focus; native repo open uses captured selected path |
| A1-IDLE | fake clock 14999/15000ms, never hides during Repos/scan/popup, pointer activity resets, escape priority and failed native hide |
| A1-LOCALE | saved pt-PT/Russian/Arabic and delayed old config, Arabic RTL and notice repaint, no unrelated Git/network calls |
| A1-DRAG | only primary left pointer on permitted surface, matching pointer capture, hidden/lost capture/ptrcancel invokes native stop once |

## Trust and architecture boundaries

- **A1 is an executable test-harness gap, not a confirmed production defect.** The existing DOM fixtures for Settings/About/Quota show the approach without requiring a production refactor. If true app import is blocked by a concrete DOM/native dependency, document DI seam compatibility and STOP FACTOR only if a public/security contract changes.
- UI Fetch-as-Cancel is not the same as two native direct Git IPC calls. Actual native `OperationLock` serializes two direct operations; do not claim native second click is silently rejected.
- Error formatting using raw native `String(error)` is a presentation risk that requires examination of native redaction provenance, not automatic assertion of a leaked token.
- NM1 nested native monitor unknown-key trust and external GitHub URL validation changes remain separate material security STOP boundaries.
- N1 input, N2 limits, N3 IPC denial, N4 duplicates, N5 races, N6 stale data, N7 authorization, N8 locale/time, N9 focus/close, N10 redaction and N12 native resource failure apply at interaction level; N11 monetization is NA. Physical Windows/KDE acceptance is separately OS-only.

**No new tests or suites were executed, no application/CI source modified.** This is a method-inventory owner map, global Stage 3–8 PARTIAL.
