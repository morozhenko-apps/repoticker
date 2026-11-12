# Mode B executable inventory: WebView controllers, Settings and monitoring

Exact source `5b07a3273a27516af8ceb793f0d427a1bada964b`. **Discovery only**. Lines enumerate named functions/conditionals in source; callback/ternary/short-circuit expression paths still need exhaustive Stage 4 expansion. Neither number of tests nor matching filenames proves each outcome.

Files **10**, named operations **145**, branch/return anchors **554**.

### `apps/desktop/ui/about.mjs`

Risk **High**; level **Unit + IPC-contract + critical UI smoke**. Candidate N categories: N1 N2 N3 N4 N5 N6 N7 N8 N9 N10. Expected new-case bound pending assertion reconciliation: **12**. This is not a missing-test count.

**Named source operations (4)**
- L7 `const invoke = command => window.__TAURI__?.core?.invoke(command) ??`
- L11 `function paintLocale(value) {`
- L26 `async function refreshLocale() {`
- L55 `function closeAbout() {`

**Conditional/return anchors (8)**
- L16 for (const item of document.querySelectorAll("[data-i18n]"))
- L18 for (const item of document.querySelectorAll("[data-i18n-alt]"))
- L20 for (const item of document.querySelectorAll("[data-i18n-aria]")) {
- L23 if (item.id === "close-about") item.title = translated;
- L29 try {
- L32 } catch {
- L35 if (revision === localeRevision) paintLocale(language);
- L62 if (event.key === "Escape") closeAbout();

### `apps/desktop/ui/app.mjs`

Risk **Critical**; level **Unit + IPC-contract + critical UI smoke**. Candidate N categories: N1 N2 N3 N4 N5 N6 N7 N8 N9 N10. Expected new-case bound pending assertion reconciliation: **154**. This is not a missing-test count.

**Named source operations (43)**
- L21 `const byId = id => document.getElementById(id);`
- L23 `const invoke = (command, args = {}) => {`
- L29 `const traceStartup = stage => {`
- L51 `function updateReposActivity() {`
- L63 `function cancelAutoHide() {`
- L66 `function armAutoHide() {`
- L86 `function paintNotice() {`
- L97 `function showError(message) {`
- L101 `function showResizeError(message) {`
- L105 `function showGitOperationErrors(count, message) {`
- L109 `function clearError() {`
- L113 `function addText(parent, tag, value, className = "") {`
- L125 `function hideRepoMenus(restoreFocus = false) {`
- L136 `function showRepoMenu(button, repoPath) {`
- L215 `function paintCiIndicator(row, repo) {`
- L232 `function updateCiStatuses(next) {`
- L241 `function makeRepoRow(repo) {`
- L272 `function updateActionState() {`
- L320 `function traceHover(kind, stage) {`
- L336 `function setActiveTooltip(kind) {`
- L343 `function resetQuota() {`
- L352 `function setQuotaOpen(kind = null) {`
- L400 `const enter = () => {`
- L430 `function monitorRefreshState(kind, active) {`
- L439 `function clearBrowserTooltips() {`
- L445 `function updateMetricAccessibleNames() {`
- L452 `function setCardLanguage(language) {`
- L492 `function renderMonitorMetrics(state) {`
- L503 `function traceMonitorReady() {`
- L509 `function render(next) {`
- L545 `render(reconcileScanPresentation(next, snapshot, revision, monitorRevision));`
- L554 `function refresh() {`
- L560 `async function refreshMonitor() {`
- L574 `function consumeResults(results) {`
- L582 `async function cancelActiveFetch() {`
- L595 `async function runGitAction(operation, repoPath = null) {`
- L612 `render(snapshot);`
- L615 `function resetView() {`
- L624 `async function openView(target) {`
- L713 `refresh();`
- L718 `function refreshCardConfiguration() {`
- L745 `refresh();`
- L762 `function stopDragging(event = null) {`

**Conditional/return anchors (111)**
- L22 if (navigator.userAgent.includes("Windows")) document.documentElement.classList.add("windows-platform");
- L24 if (!window.__TAURI__?.core?.invoke) {
- L25 return Promise.reject(new Error("Launch the desktop application to use Git."));
- L27 return window.__TAURI__.core.invoke(command, args);
- L58 if (localScanActive) cancelAutoHide();
- L64 if (idleTimer !== null) { clearTimeout(idleTimer); idleTimer = null; }
- L70 if (!cardVisible \|\| view !== "compact" \|\| quotaExpanded \|\|
- L73 try { await invoke("hide_card"); resetView(); }
- L74 catch (error) { showError(error); }
- L77 for (const eventName of AUTO_HIDE_EVENTS) {
- L81 if (document.hidden) cancelAutoHide();
- L88 if (lastNotice === null) {
- L91 return;
- L116 if (className) el.className = className;
- L118 return el;
- L133 if (restoreFocus && previouslyFocused?.isConnected) previouslyFocused.focus();
- L139 if (alreadyOpen) return;
- L161 for (const [key, operation] of [
- L175 if (!path) return;
- L181 if (Object.hasOwn(nativeActions, operation)) {
- L182 try {
- L184 } catch (error) {
- L197 if (event.key === "ArrowDown") target = items[(current + 1) % items.length];
- L198 if (event.key === "ArrowUp") target = items[(current + items.length - 1) % items.length];
- L199 if (event.key === "Home") target = items[0];
- L200 if (event.key === "End") target = items[items.length - 1];
- L201 if (target) {
- L208 if (!repoMenu.hidden &&
- L237 if (repo) paintCiIndicator(row, repo);
- L251 if (progress) {
- L252 if (progress.active?.has(repo.path)) {
- L254 } else if (progress.done?.has(repo.path)) {
- L256 if (progress.errors?.has(repo.path)) row.classList.add("is-failed");
- L269 return row;
- L282 for (const [operation, id] of [["fetch", "fetch-all"], ["safe_sync", "sync-all"]]) {
- L286 if (active) {
- L294 if (operation === "fetch") {
- L321 if (!hoverDebugEnabled) return;
- L337 for (const [name, node] of Object.entries(hoverTargets)) {
- L358 if (wanted === visibleKind) {
- L360 return;
- L362 if (wanted) {
- L366 if (!cardVisible \|\| hoveredKind !== wanted) {
- L368 if (!hoveredKind \|\| !cardVisible) await invoke("hide_usage_popup");
- L372 return;
- L394 return quotaQueue;
- L399 for (const [kind, anchor] of Object.entries(hoverTargets)) {
- L411 if (hoveredKind === kind) void setQuotaOpen(null);
- L415 if (hoveredKind === kind) void setQuotaOpen(null);
- L421 for (const [kind, node] of Object.entries(manualIndicator)) {
- L423 if (node.getAttribute("aria-busy") === "true") return;
- L431 if (kind === "all") {
- L432 for (const node of Object.values(manualIndicator))
- L443 for (const node of Object.values(hoverTargets)) node.removeAttribute("title");
- L446 for (const [kind, node] of Object.entries(manualIndicator)) {
- L454 if (next === cardLanguage) return;
- L464 for (const item of repoMenu.querySelectorAll("[data-locale-key]"))
- L484 if (repo) paintCiIndicator(row, repo);
- L486 if (localScanActive) byId("repo-scan-status").textContent =
- L490 if (lastNotice !== null) paintNotice();
- L504 if (!firstMonitorReady && snapshot.runner_state != null) {
- L513 if (view === "repos" && previousCount !== next.repositories.length) {
- L522 if (!next.repositories.length) {
- L527 for (const repo of next.repositories) list.append(makeRepoRow(repo));
- L530 if (next.errors?.length) showError(next.errors[0]);
- L542 return { revision, next };
- L546 if (!firstSnapshotReady) {
- L555 return refreshSnapshot();
- L562 try {
- L565 if (request !== monitorRequest) return;
- L570 } catch (error) {
- L578 if (errors.length) {
- L583 if (fetchCancelling) return;
- L586 try {
- L588 if (!accepted) fetchCancelling = false;
- L589 } catch (error) {
- L596 if (busy) return;
- L601 try {
- L605 } catch (error) {
- L625 if (quotaExpanded) await setQuotaOpen(false);
- L627 if (desired === view) return;
- L628 try {
- L639 if (view !== "repos") hideRepoMenus();
- L640 } catch (error) {
- L646 try { await invoke("hide_card"); resetView(); }
- L647 catch (error) { showError(error); }
- L650 if (progress?.operation === "fetch" && progress.phase !== "finish") {
- L652 } else if (!busy) {
- L658 if (event.key === "Escape" && !repoMenu.hidden) {
- L661 return;
- L663 if (event.key === "Escape") {
- L664 if (quotaExpanded) { void setQuotaOpen(false); return; }
- L665 if (view !== "compact") openView(view);
- L671 if (!payload \|\| !["fetch", "safe_pull", "safe_sync"].includes(payload.operation)) return;
- L672 if (!progress \|\| progress.operation !== payload.operation) {
- L679 if (payload.phase === "start") progress.active.add(payload.path);
- L680 if (payload.phase === "complete") {
- L683 if (payload.status === "error") progress.errors.add(payload.path);
- L685 if (payload.phase === "finish") {
- L688 if (!busy) progress = null;
- L721 if (revision !== appliedLocaleRevision) return;
- L722 if (typeof config?.language === "string") {
- L734 if (event.payload?.Ok) consumeResults(event.payload.Ok);
- L735 else if (event.payload?.Err) showError(event.payload.Err);
- L742 if (firstSnapshotReady \|\| typeof config?.language !== "string") return;
- L763 if (event?.pointerId != null && event.pointerId !== activePointerId) return;
- L765 if (id === null) return;
- L768 if (dragSurface.hasPointerCapture(id)) {
- L774 if (event.button !== 0 \|\| !event.isPrimary \|\|
- L776 if (!dragGesture.begin(event.pointerId)) return;
- L781 if (event.pointerId === activePointerId && !(event.buttons & 1)) {

### `apps/desktop/ui/ci-failure-events.mjs`

Risk **High**; level **Unit + IPC-contract + critical UI smoke**. Candidate N categories: N1 N2 N3 N4 N5 N6 N7 N8 N9 N10. Expected new-case bound pending assertion reconciliation: **38**. This is not a missing-test count.

**Named source operations (5)**
- L6 `const canonicalUtc = value => {`
- L18 `function validateSelection(account, repositories) {`
- L39 `function validRun(run) {`
- L51 `export async function collectRecentCompleted({`
- L92 `export function createCiFailureTracker({ maxRemembered = 500 } = {}) {`

**Conditional/return anchors (33)**
- L7 if (typeof value !== "string" \|\| !UTC.test(value)) return false;
- L9 return Number.isFinite(millis) &&
- L19 if (!NAME.test(account) \|\| account === "." \|\| account === ".." \|\|
- L23 for (const repo of repositories) {
- L24 if (typeof repo !== "string") throw Error("Invalid notification repository");
- L26 if (names.length !== 2 \|\| !names.every(name =>
- L33 if (new Set(normalized.map(name => name.toLowerCase())).size !== normalized.length) {
- L36 return normalized;
- L40 return run && Number.isSafeInteger(run.id) && run.id > 0 &&
- L55 if (typeof get !== "function" \|\| !Number.isInteger(maxPages) \|\|
- L61 while (index < names.length) {
- L64 try {
- L66 for (let page = 1; page <= maxPages; page++) {
- L69 if (!Array.isArray(payload?.workflow_runs) \|\|
- L75 if (payload.workflow_runs.length < PAGE_SIZE) break;
- L78 } catch (_) {
- L84 return results;
- L93 if (!Number.isInteger(maxRemembered) \|\| maxRemembered < 200 \|\|
- L98 return {
- L104 if (!["off", "failures", "successes", "both"].includes(mode))
- L107 if (!Array.isArray(results)) throw Error("Invalid notification observations");
- L111 for (const result of results) {
- L112 if (!result \|\| typeof result.repository !== "string" \|\|
- L118 if (result.error !== undefined) {
- L119 if (result.error !== "unavailable" \|\| result.runs !== undefined) {
- L124 if (!Array.isArray(result.runs) \|\| result.runs.length > 200 \|\|
- L133 if (scope !== nextScope) {
- L138 for (const result of results) {
- L140 if (result.error) {
- L148 for (const run of result.runs) {
- L158 if (previous && bit !== 0 && enabled && !(prior & bit)) {
- L170 while (seen.size > maxRemembered) seen.delete(seen.keys().next().value);
- L173 return alerts;

### `apps/desktop/ui/ci-status.mjs`

Risk **High**; level **Unit + IPC-contract + critical UI smoke**. Candidate N categories: N1 N2 N3 N4 N5 N6 N7 N8 N9 N10. Expected new-case bound pending assertion reconciliation: **12**. This is not a missing-test count.

**Named source operations (3)**
- L4 `const identity = fullName => {`
- L12 `export function projectLatestCiStatuses(account, observations) {`
- L31 `export function ciOutcomeForRepo(repo, statuses) {`

**Conditional/return anchors (9)**
- L5 if (typeof fullName !== "string") return null;
- L7 if (parts.length !== 2 \|\| parts.some(part =>
- L9 return parts.map(part => part.toLowerCase());
- L13 if (typeof account !== "string" \|\| !NAME.test(account) \|\|
- L17 for (const result of observations) {
- L19 if (!parts \|\| parts[0] !== account.toLowerCase() \|\|
- L28 return { account: account.toLowerCase(), outcomes };
- L33 if (!parts \|\| !statuses \|\| parts[0] !== statuses.account \|\|
- L35 return statuses.outcomes.get(parts.join("/")) ?? null;

### `apps/desktop/ui/github-billing.mjs`

Risk **Critical**; level **Unit + IPC-contract + critical UI smoke**. Candidate N categories: N1 N2 N3 N4 N5 N6 N8 N9 N10. Expected new-case bound pending assertion reconciliation: **54**. This is not a missing-test count.

**Named source operations (11)**
- L8 `export function billingMonth(now = new Date()) {`
- L14 `export function knownPersonalAllowance(plan) {`
- L25 `export function knownOrganizationAllowance(plan) {`
- L33 `export function reportedActionsMinutes(payload) {`
- L49 `const unavailable = reason => ({`
- L54 `export async function collectBillingUsage({ get, organization, now = new Date() }) {`
- L60 `async function fetchOrganization() {`
- L91 `async function fetchPersonal() {`
- L121 `export function createBillingCache({ get, now = () => Date.now(),`
- L130 `function clear() {`
- L136 `async function load(organization, connected) {`

**Conditional/return anchors (43)**
- L9 if (!(now instanceof Date) \|\| !Number.isFinite(now.getTime()))
- L11 return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
- L15 switch (typeof plan === "string" ? plan.toLowerCase() : "") {
- L16 case "free": return 2000;
- L17 case "pro": return 3000;
- L26 switch (typeof plan === "string" ? plan.toLowerCase() : "") {
- L27 case "free": return 2000;
- L28 case "team": return 3000;
- L34 if (!payload \|\| !Array.isArray(payload.usageItems) \|\| payload.usageItems.length > 500)
- L37 for (const item of payload.usageItems) {
- L38 if (!item \|\| !NAME.test(item.sku) \|\|
- L43 if (!Number.isSafeInteger(Math.ceil(total)))
- L46 return total;
- L55 if (typeof get !== "function") throw Error("Missing native billing transport");
- L61 if (typeof organization !== "string" \|\| !NAME.test(organization))
- L62 return unavailable("Choose a monitored organization in Settings.");
- L76 if (usageResult.status === "fulfilled") {
- L77 try { reported = reportedActionsMinutes(usageResult.value); }
- L78 catch { /* A malformed report stays unknown. */ }
- L86 return { state: ready ? "ready" : "unavailable",
- L93 try {
- L95 } catch {
- L96 return unavailable("GitHub account identity unavailable; reconnect after approval.");
- L98 if (!NAME.test(account?.login))
- L99 return unavailable("GitHub account identity unavailable.");
- L102 try {
- L105 return { state: "ready", plan, included: knownPersonalAllowance(plan),
- L108 } catch {
- L109 return { ...unavailable("Personal billing unavailable; reauthorize Plan: read."),
- L115 return { month: monthLabel, organization: org, personal };
- L123 if (typeof get !== "function" \|\| typeof now !== "function" \|\|
- L137 if (!connected) {
- L139 return null;
- L147 if (activeKey !== key) {
- L155 if (saved?.key === key && started >= saved.at &&
- L157 if (pending?.key === key) return pending.promise;
- L161 if (current === generation) saved = { key, at: started, value };
- L162 return value;
- L165 if (current === generation) saved = { key, at: started, value: fallback };
- L166 return fallback;
- L168 if (pending?.promise === promise) pending = null;
- L171 return promise;
- L173 return { load, clear };

### `apps/desktop/ui/github-errors.mjs`

Risk **High**; level **Unit + IPC-contract + critical UI smoke**. Candidate N categories: N1 N2 N3 N4 N5 N6 N7 N8 N9 N10. Expected new-case bound pending assertion reconciliation: **10**. This is not a missing-test count.

**Named source operations (3)**
- L19 `export function githubFailureReason(error) {`
- L26 `export function githubFailureMessage(reason, scope = "monitor") {`
- L52 `export function mostImportantGithubFailure(failures) {`

**Conditional/return anchors (7)**
- L22 return Object.hasOwn(NATIVE_MESSAGES, message) ?
- L36 if (scope === "runners" && reason === "permission_denied")
- L37 return "Runner inventory access denied; authorized Actions jobs remain visible.";
- L38 return Object.hasOwn(detail, reason) ? detail[reason] : detail.unavailable;
- L53 if (!Array.isArray(failures) \|\| !failures.length) return null;
- L58 if (!known.length) return "unavailable";
- L59 return known.reduce((best, entry) =>

### `apps/desktop/ui/github-installations.mjs`

Risk **Critical**; level **Unit + IPC-contract + critical UI smoke**. Candidate N categories: N1 N2 N3 N4 N5 N6 N7 N8 N9 N10. Expected new-case bound pending assertion reconciliation: **10**. This is not a missing-test count.

**Named source operations (2)**
- L5 `const validAccountName = name => typeof name === "string" &&`
- L8 `export async function listAvailableInstallations(get) {`

**Conditional/return anchors (8)**
- L12 for (let page = 1; page <= INSTALL_PAGE_LIMIT; page++) {
- L14 if (!Array.isArray(response?.installations) \|\|
- L16 for (const item of response.installations) {
- L18 if (!validAccountName(name) \|\|
- L22 if (seenIds.has(item.id) \|\| seenOwners.has(identity)) {
- L25 if (seenIds.get(item.id) !== identity \|\|
- L34 if (response.installations.length < 100) return { items: result, complete: true };
- L36 return { items: result, complete: false };

### `apps/desktop/ui/github-monitor.mjs`

Risk **Critical**; level **Unit + IPC-contract + critical UI smoke**. Candidate N categories: N1 N2 N3 N4 N5 N6 N7 N8 N9 N10. Expected new-case bound pending assertion reconciliation: **101**. This is not a missing-test count.

**Named source operations (14)**
- L15 `export function monitorRefreshDelay(repositoryCount) {`
- L23 `const validAccountName = name => typeof name === "string" &&`
- L27 `export async function listInstalledRepositories(get, owner, installationId,`
- L59 `export async function collectForAccount({`
- L120 `export function mergeMetricGroup(previous, next, kind) {`
- L127 `const priorClock = field => Object.hasOwn(previous, field)`
- L155 `export function invalidateMetricGroup(previous, kind) {`
- L186 `export function startGithubMonitoring({ invoke, event, onError = () => {},`
- L206 `const get = path => invoke("github_api_get", { path });`
- L207 `function publish(connected, runnerState = null, message = null,`
- L216 `function invalidatePresentation(message) {`
- L228 `async function applyCooldown(reason) {`
- L238 `async function refresh(force = false, kind = "all") {`
- L411 `function applyRelayPhase(phase) {`

**Conditional/return anchors (87)**
- L19 return 60_000 * Math.max(2, Math.ceil(Math.max(1, count) / 15));
- L32 for (let page = 1; page <= INSTALL_PAGE_LIMIT; page++) {
- L35 if (!Array.isArray(payload?.repositories) \|\|
- L37 for (const repo of payload.repositories) {
- L40 if (parts.length === 2 && validAccountName(parts[0]) &&
- L47 if (payload.repositories.length < 100) break;
- L48 if (page === INSTALL_PAGE_LIMIT) complete = false;
- L55 return { items: unique.slice(0, 100),
- L64 if (!available.complete) return { state: null, reason: "GitHub installation list incomplete." };
- L67 if (!install) return { state: null, reason: available.items.length
- L69 if (!Array.isArray(selectedRepositories) \|\| selectedRepositories.length > 100 \|\|
- L72 return parts.length !== 2 \|\| !validAccountName(parts[0]) \|\|
- L83 if (selectedRepositories.length && !repos.complete) {
- L84 return { state: null, repositoryCount: selectedRepositories.length,
- L87 if (!repos.items.length) {
- L88 return { state: null, reason: "No accessible repositories for " + install.name + "." };
- L99 if (!repos.complete && kind !== "runners") {
- L111 return { state, repositoryCount: repos.items.length, failure, reason: failure
- L121 if (kind === "all" \|\| !previous) return next;
- L123 if (previous.scope?.organization !== next.scope?.organization \|\|
- L150 for (const key of keepCount) merged.counts[key] = previous.counts?.[key] ?? null;
- L151 for (const key of keepCoverage) merged.coverage[key] = previous.coverage?.[key] ?? false;
- L152 return merged;
- L156 if (!previous \|\| kind === "all") return null;
- L158 if (kind === "runners") {
- L162 for (const key of ["busy", "idle", "offline"]) clone.counts[key] = null;
- L177 for (const key of ["running", "queued", "waiting", "runningSelfHosted",
- L183 return clone;
- L210 if (revision !== selectionRevision) return;
- L211 return invoke("github_monitor_publish", { connected, runnerState, message });
- L214 return write;
- L229 if (reason !== "rate_limited") return;
- L230 try {
- L232 if (Number.isSafeInteger(seconds) && seconds > 0 && seconds <= 86_400)
- L234 } catch (error) {
- L239 if (!["all", "runners", "tasks"].includes(kind)) return;
- L240 if (busy) {
- L241 if (force) rerunKind = rerunKind && rerunKind !== kind ? "all" : kind;
- L242 return;
- L244 if (!force) {
- L249 if (now() - lastForGroup < interval) return;
- L254 if (kind === "all") {
- L257 } else if (kind === "runners") {
- L263 try {
- L264 if (first) onStage("monitor.auth_start");
- L267 if (first) onStage("monitor.auth_ready");
- L268 if (revision !== selectionRevision) return;
- L269 if (!authorized) {
- L270 if (kind === "all") fullReconciliationHealthy = false;
- L276 return;
- L280 if (now() < cooldownUntil) {
- L281 if (kind === "all") fullReconciliationHealthy = false;
- L282 if (kind !== "runners") onCiStatus?.(null);
- L287 return;
- L289 if (!hasPublishedResult)
- L294 if (revision !== selectionRevision) return;
- L295 if (first) onStage("monitor.scope_ready");
- L301 if (revision !== selectionRevision) return;
- L302 if (first) onStage("monitor.collect_ready");
- L309 if (revision === selectionRevision) {
- L315 if (kind === "all") {
- L331 if (!notificationsEnabled) ciTracker.reset();
- L338 if (trustedCiRead && (notificationsEnabled \|\| onCiStatus)) {
- L343 if (revision !== selectionRevision) return;
- L345 if (notificationsEnabled) {
- L351 for (const alert of alerts.slice(0, 5)) {
- L352 if (revision !== selectionRevision) break;
- L359 } else if (revision === selectionRevision && kind !== "runners") {
- L364 } catch (error) {
- L365 if (revision !== selectionRevision) return;
- L366 if (kind === "all") fullReconciliationHealthy = false;
- L367 if (kind !== "runners") {
- L371 if (first) onStage("monitor.failed");
- L378 if (revision === selectionRevision) {
- L385 if (rerunKind) {
- L393 if (evt?.payload?.status === "disconnected") {
- L395 } else if (evt?.payload?.status === "connected") {
- L414 if (wasOnline && !relayOnline) {
- L427 if (relayPhaseRevision === initialPhaseRevision) applyRelayPhase(phase);
- L438 if (kind !== "tasks" && kind !== "all") return;
- L440 if (timestamp - lastRelay[kind] < RELAY_HINT_BURST_MS) {
- L441 if (kind === "tasks") trailingRelayTasks = true;
- L442 return;
- L453 if (!relayOnline \|\| !fullReconciliationHealthy \|\|
- L457 } else if (now() - lastRunnerAttempt >= minIntervalMs) {
- L459 } else if (trailingRelayTasks &&
- L469 return refresh;

### `apps/desktop/ui/quota.mjs`

Risk **High**; level **Unit + IPC-contract + critical UI smoke**. Candidate N categories: N1 N2 N3 N4 N5 N6 N7 N8 N9 N10. Expected new-case bound pending assertion reconciliation: **62**. This is not a missing-test count.

**Named source operations (17)**
- L11 `const byId = id => document.getElementById(id);`
- L12 `const invoke = (name, args = {}) => window.__TAURI__.core.invoke(name, args);`
- L13 `function add(parent, tag, value, cls = "") {`
- L20 `function line(parent, label, value, providerName = false) {`
- L31 `function setLocale(value) {`
- L40 `function paint(details, runnerNameRows = 0) {`
- L103 `function invalidateBilling() {`
- L112 `function statusUnavailable(message) {`
- L117 `export function selectedOrganization(snapshot) {`
- L129 `function paintSnapshot(snapshot) {`
- L136 `function scheduleBilling(snapshot) {`
- L156 `async function refresh() {`
- L196 `async function refreshMonitorOnly() {`
- L222 `async function refreshLocale() {`
- L234 `function subscribe(eventName, handler = refresh) {`
- L251 `function applyHoverKind(kind) {`
- L264 `async function onUsageShown() {`

**Conditional/return anchors (45)**
- L16 if (cls) node.className = cls;
- L18 return node;
- L23 if (providerName) name.dir = "auto";
- L37 if (currentSnapshot) paintSnapshot(currentSnapshot);
- L38 else if (lastRawDetails) paint(lastRawDetails, lastRunnerNameRows);
- L47 if (title) title.textContent = details.status;
- L50 if (!details.connected) add(root, "span", details.message, "quota-message");
- L52 for (const section of details.sections) {
- L54 if (section.title) add(block, "div", section.title, "quota-section-title");
- L55 for (const [index, [label, value]] of (section.rows \|\| []).entries()) {
- L58 if (section.message) add(block, "span", section.message, "quota-message");
- L60 if (details.message) add(root, "span", details.message, "quota-message");
- L69 if (details.connected) {
- L125 if (configured && monitored &&
- L127 return configured \|\| monitored;
- L137 if (activeKind !== "billing" \|\| snapshot.connected !== true) return;
- L139 if (billingFetch?.scope === scope) return;
- L144 if (currentVersion === billingVersion && billingScope === scope && value) {
- L146 if (activeKind === "billing" && currentSnapshot?.connected)
- L151 if (currentVersion === billingVersion && billingScope === scope) billingState = null;
- L153 if (billingFetch?.request === request) billingFetch = null;
- L159 try {
- L166 if (configuredOrg !== null && typeof configuredOrg !== "string")
- L171 if (id !== refreshId) return;
- L172 if (startLocaleRevision === localeRevision)
- L174 if (isHoverKind(nativeKind)) activeKind = nativeKind;
- L182 if (billingScope !== scope \|\| !currentSnapshot.connected) {
- L188 } catch {
- L189 if (id === refreshId)
- L198 try {
- L201 if (id !== refreshId) return;
- L202 if (isHoverKind(nativeKind)) activeKind = nativeKind;
- L209 if (billingScope !== scope \|\| !currentSnapshot.connected) {
- L215 } catch {
- L216 if (id === refreshId) statusUnavailable("Cannot read refreshed GitHub status.");
- L225 try {
- L228 } catch {
- L231 if (revision === localeRevision) setLocale(language);
- L236 if (typeof listen !== "function") {
- L238 return;
- L252 if (!isHoverKind(kind)) return;
- L253 if (activeKind === kind && currentSnapshot) return;
- L255 if (currentSnapshot) {
- L266 try { applyHoverKind(await invoke("get_usage_popup_kind")); }
- L267 catch { /* Failed reconciliation is not fabricated as billing data. */ }

### `apps/desktop/ui/settings.mjs`

Risk **Critical**; level **Unit + IPC-contract + critical UI smoke**. Candidate N categories: N1 N2 N3 N4 N5 N6 N7 N8 N9 N10 N12. Expected new-case bound pending assertion reconciliation: **246**. This is not a missing-test count.

**Named source operations (43)**
- L9 `const byId = id => document.getElementById(id);`
- L11 `const t = english => settingsText(uiLocale, english);`
- L14 `function applySettingsLanguage(value) {`
- L62 `function confirmedRelayConnection() {`
- L69 `function syncWorkerControls() {`
- L121 `function applyRelayPhase(status) {`
- L146 `const invoke = (command, args = {}) => window.__TAURI__?.core?.invoke(command, args) ??`
- L153 `const traceStartup = stage => {`
- L168 `function renderRelaySecretState() {`
- L193 `async function refreshRelaySecretStatus(revision = settingsRefreshRevision) {`
- L246 `async function refreshRelayConnectionStatus(revision = settingsRefreshRevision) {`
- L284 `const validRepoName = name => REPO_NAME.test(name) &&`
- L288 `const sameGithubIdentity = (a, b) => typeof a === "string" &&`
- L290 `const containsGithubIdentity = (items, name) =>`
- L292 `function normalizeRepoDraft() {`
- L295 `function updateRepoDirty() {`
- L300 `function repoChoiceValid() {`
- L307 `function renderRepoChoices() {`
- L363 `async function refreshRepoInventory() {`
- L417 `function clearMonitorScopes() {`
- L431 `async function refreshMonitorScopes() {`
- L534 `function stopGithubStatusUpdates() {`
- L543 `function startGithubStatusUpdates() {`
- L567 `function githubMessage(text, error = false) {`
- L578 `function githubButtons() {`
- L624 `async function refreshGithub(knownAuth = null) {`
- L777 `function message(text, error = false) {`
- L782 `function validRelayUrl(value) {`
- L802 `function validRelayDraft() {`
- L808 `const candidateValid = (32 <= candidate.length && candidate.length <= 256) &&`
- L815 `function syncConnectionAvailability() {`
- L821 `function pollingNeedsRelayCleanup() {`
- L826 `function isDirty() {`
- L840 `function updateApply() {`
- L842 `const authNeedsConfirmation = (githubConnected && githubStartedHere) || disconnectPending;`
- L849 `function displayRootPath(path) {`
- L860 `function renderRoots() {`
- L888 `function renderIgnoredChildren() {`
- L939 `async function refresh() {`
- L1115 `function updateLanguagePicker() {`
- L1122 `function closeLanguagePicker(returnFocus = false) {`
- L1128 `function openLanguagePicker(position = "selected") {`
- L1192 `const cancelSettings = async () => {`

**Conditional/return anchors (203)**
- L19 for (const item of document.querySelectorAll?.("[data-i18n]") ?? [])
- L21 for (const item of document.querySelectorAll?.("[data-i18n-placeholder]") ?? [])
- L23 for (const item of document.querySelectorAll?.("[data-i18n-aria]") ?? [])
- L27 if (draft) byId("autostart-status").textContent = draft.autostartEnabled === null
- L63 return relayPhase === "online" &&
- L89 if (!pendingHybridChanges && connected) {
- L92 } else if (!pendingHybridChanges && isPersistedHybrid &&
- L96 } else if (!pendingHybridChanges && isPersistedHybrid &&
- L100 } else if (!pendingHybridChanges && isPersistedHybrid &&
- L109 if (pendingHybridChanges) {
- L111 } else if (hybridSelected && isPersistedHybrid && relayPhase === "fallback") {
- L113 } else if (hybridSelected && isPersistedHybrid &&
- L129 if (!draft \|\| saving) return;
- L131 if (draft.connectionMode === "polling") {
- L137 if (secretField.type === "password") secretField.value = "";
- L142 if (!draft \|\| saving \|\| byId("github-worker-url").disabled) return;
- L150 if (event.button !== 0 \|\| event.target?.id === "settings-close") return;
- L175 if (configured) {
- L180 if (mask.type !== "password") mask.value = "";
- L194 try {
- L196 if (revision !== settingsRefreshRevision) return;
- L198 } catch {
- L199 if (revision !== settingsRefreshRevision) return;
- L207 if (saving \|\| settingsLoading \|\| byId("relay-secret-mask").disabled) return;
- L211 if (relaySecretBusy \|\| saving \|\| relaySecretConfigured !== true) return;
- L214 try {
- L221 } catch {
- L249 try {
- L251 if (revision !== settingsRefreshRevision \|\|
- L254 } catch {
- L255 if (revision !== settingsRefreshRevision \|\|
- L293 return repoMode === "all" ? [] : [...selectedRepoNames].sort();
- L301 if (repoMode === "all") return true;
- L302 if (selectedRepoNames.size === 0 \|\| selectedRepoNames.size > 100) return false;
- L303 if (!repoChoiceTouched) return true; // Preserve existing config if API is offline.
- L304 return repoInventoryReady && [...selectedRepoNames].every(name =>
- L316 if (!show) {
- L318 return;
- L323 for (const name of visible.slice(0, 100)) {
- L331 if (checkbox.checked) {
- L332 if (!containsGithubIdentity(selectedRepoNames, name))
- L335 for (const selected of selectedRepoNames) {
- L336 if (sameGithubIdentity(selected, name)) selectedRepoNames.delete(selected);
- L372 if (panel.hidden) return;
- L373 try {
- L376 for (let page = 1; page <= 10; page++) {
- L379 if (!Array.isArray(payload?.repositories) \|\|
- L381 for (const item of payload.repositories) {
- L385 if (typeof name !== "string") throw Error("Invalid repository list");
- L387 if (parts.length === 2 &&
- L391 if (payload.repositories.length < 100) {
- L396 if (revision !== repoInventoryRevision) return;
- L400 } catch {
- L401 if (revision !== repoInventoryRevision) return;
- L409 if (!githubConnected \|\| !selectedScope) return;
- L411 if (repoMode === "all") selectedRepoNames.clear();
- L435 if (!githubConnected) {
- L437 return;
- L439 try {
- L446 if (revision !== monitorScopesRevision \|\| !githubConnected) return;
- L453 if (githubScopeAtOpen === null) githubScopeAtOpen = config \|\| "";
- L460 if (!githubScopeTouched) selectedScope = resolved;
- L465 if (!config && inventory.complete && accounts.length === 1 &&
- L468 try {
- L470 if (revision !== monitorScopesRevision \|\| !githubConnected) return;
- L473 } catch {
- L474 if (revision !== monitorScopesRevision \|\| !githubConnected) return;
- L486 if (needsPicker) {
- L492 for (const name of accounts) {
- L500 if (!inventory.complete) githubMessage(
- L503 if (revision !== monitorScopesRevision \|\| !githubConnected) return;
- L505 } catch {
- L506 if (revision !== monitorScopesRevision \|\| !githubConnected) return;
- L517 if (sameGithubIdentity(previousScope, selectedScope)) {
- L519 return;
- L535 if (githubStatusTimer !== null) {
- L544 if (githubStatusTimer !== null) return;
- L546 if (!githubPending) {
- L548 return;
- L550 if (githubStatusBusy) return;
- L552 try {
- L554 if (phase.status === "connected" \|\|
- L559 } catch (error) {
- L583 if (!githubPending) byId("github-copy-code").textContent = t("Copy code");
- L627 if (settingsLoading \|\| settingsInitFailed) return;
- L632 if (disconnectPending) return;
- L634 try {
- L638 if (authRevision !== monitorScopesRevision) return;
- L642 if (!githubConnected) clearMonitorScopes();
- L645 if (!githubPending) byId("github-user-code").textContent = "";
- L647 if (githubPending) startGithubStatusUpdates();
- L653 if (githubConnected) await refreshMonitorScopes();
- L655 } catch (error) {
- L656 if (authRevision !== monitorScopesRevision) return;
- L672 if (githubPending \|\| githubStarting \|\| githubConnected \|\| githubChecking \|\|
- L679 try {
- L683 if (beginRevision !== githubBeginRevision) return;
- L690 } catch {
- L691 if (beginRevision !== githubBeginRevision) return;
- L698 if (beginRevision === githubBeginRevision) {
- L708 if (!githubPending \|\| !code) return;
- L709 try {
- L713 } catch {
- L720 if (settingsNeedsRefreshOnFocus) {
- L725 return;
- L727 if (githubPending) void refreshGithub();
- L729 if (draft && !saving && !settingsLoading) {
- L743 try { await invoke("github_open_device_page"); }
- L744 catch (error) { githubMessage(String(error), true); }
- L759 if (saving \|\| !githubConnected) return;
- L783 if (value === "") return true;
- L784 if (typeof value !== "string" \|\| value.length > 512 \|\|
- L787 try {
- L790 return parsed.protocol === "https:" && parsed.username === "" &&
- L798 } catch {
- L799 return false;
- L803 if (!draft) return false;
- L805 if (draft.connectionMode !== "hybrid") return true;
- L812 return validRelayUrl(draft.relayUrl) && draft.relayUrl !== "" &&
- L822 return draft?.connectionMode === "polling" &&
- L827 if (!original \|\| !draft) return false;
- L828 return pollingNeedsRelayCleanup() \|\| relaySecretTouched \|\|
- L854 if (!path.startsWith(prefix)) return path;
- L856 return remainder.startsWith("UNC" + slash)
- L863 if (!draft.roots.length) {
- L869 for (const root of draft.roots) {
- L891 if (!draft.ignoredChildNames.length) {
- L897 for (const name of draft.ignoredChildNames) {
- L917 if (!draft \|\| saving) return;
- L920 if (!name \|\| name === "." \|\| name === ".." \|\|
- L923 return;
- L925 if (draft.ignoredChildNames.length >= 100 &&
- L928 return;
- L930 if (!draft.ignoredChildNames.includes(name)) {
- L944 try {
- L955 if (revision !== settingsRefreshRevision) return;
- L1013 } catch {
- L1015 if (revision !== settingsRefreshRevision) return;
- L1032 if (!draft \|\| saving \|\| original?.autostartEnabled === null) return;
- L1037 if (!draft \|\| saving) return;
- L1039 if (!["off", "failures", "successes", "both"].includes(value)) return;
- L1045 if (!draft \|\| saving) return;
- L1047 if (!value) return;
- L1048 if (!draft.roots.includes(value)) draft.roots.push(value);
- L1058 if (!draft \|\| saving \|\| rootBrowsePending) return;
- L1061 try {
- L1063 if (typeof selected === "string" && selected.trim()) {
- L1064 if (!draft.roots.includes(selected)) draft.roots.push(selected);
- L1070 } catch (error) {
- L1082 if (!draft \|\| saving \|\| ignoredBrowsePending) return;
- L1085 try {
- L1087 if (typeof selected === "string") {
- L1089 if (!name \|\| name === "." \|\| name === ".." \|\|
- L1093 if (!draft.ignoredChildNames.includes(name)) {
- L1094 if (draft.ignoredChildNames.length >= 100)
- L1103 } catch (error) {
- L1117 for (const option of languageOptions) {
- L1126 if (returnFocus && wasOpen) languageTrigger.focus();
- L1129 if (!draft \|\| saving) return;
- L1138 if (!languageList.hidden) closeLanguagePicker(true);
- L1142 if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
- L1143 if (!draft \|\| saving) return;
- L1150 if (languageList.hidden) return;
- L1151 if (event.key === "Escape") {
- L1154 return;
- L1156 if (event.key === "Tab") {
- L1158 return;
- L1160 if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
- L1171 for (const option of languageOptions) {
- L1173 if (!draft \|\| saving) return;
- L1184 if (!event.target.closest(".language-picker")) closeLanguagePicker();
- L1187 if (event.key === "Escape" && !languageList.hidden) {
- L1193 if (saving) return;
- L1200 try {
- L1203 if (githubStartedHere \|\| githubPending) {
- L1206 if (githubStartedHere) {
- L1208 if (auth.connected) await invoke("github_disconnect");
- L1217 try {
- L1219 } catch (error) {
- L1224 } catch (error) {
- L1235 if (saving \|\| settingsLoading \|\| settingsInitFailed \|\| githubCheckFailed \|\|
- L1243 try {
- L1249 if (clearRelay) {
- L1254 } else if (!simpleSelected && field.type === "password" && field.value) {
- L1261 if (simpleSelected \|\| field.type === "password") field.value = "";
- L1265 if (original.language !== draft.language)
- L1267 if (original.ciNotificationMode !== draft.ciNotificationMode)
- L1269 if (original.connectionMode !== draft.connectionMode)
- L1273 if (original.relayUrl !== relayUrlForSave)
- L1275 if (JSON.stringify(original.roots) !== JSON.stringify(draft.roots))
- L1277 if (JSON.stringify(original.ignoredChildNames) !== JSON.stringify(draft.ignoredChildNames))
- L1279 if (Object.keys(configChanges).length) {
- L1282 if (githubConnected && (githubScopeTouched \|\| repoChoiceTouched \|\| githubStartedHere)) {
- L1297 if (autostartChanged) {
- L1301 if (actual !== draft.autostartEnabled)
- L1305 if (disconnectPending) {
- L1311 if (relaySecretTouched) {
- L1314 if (simpleSelected) relaySecretConfigured = false;
- L1316 if (simpleSelected && clearRelay) {
- L1324 if (persisted?.connection_mode !== "polling" \|\|
- L1332 try {
- L1334 } catch (error) {
- L1339 } catch (error) {


## Candidate evidence, not inferred PASS

- `tests/settings-github-confirm.test.mjs`, `settings-controls.test.mjs`, `settings-relay-draft.test.mjs` and `settings-visual-controls.test.mjs` exercise real Settings controller through an external IPC fixture; verify each branch with its assertion.
- `tests/github-monitor.test.mjs`, `mode-b-monitor-edges.test.mjs`, `hybrid-reconcile-schedule.test.mjs`, `ci-failure-events.test.mjs` cover monitor state transitions and page/API projections; confirm permutations and error states.
- `tests/quota-*.test.mjs`, `github-billing.test.mjs`, `runner-*.test.mjs` cover metrics/quotas. Quota is read-only observation, **not** in-app billing entitlement (N11 NA for this project).
- `tests/ui.test.mjs`, `ui-layout.test.mjs`, `hover-fallback.test.mjs`, `windows-*test.mjs` cover UI contract; validate focus and pointer behavior physically on KDE and Windows.
- An `if` or `return` anchor is only a discovery target. Map each public rule's outcomes to exact assertions before calling the file 'covered'.
