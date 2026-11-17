# Mode B executable inventory: UI domain utilities and runner/metric helpers

Exact source `5b07a3273a27516af8ceb793f0d427a1bada964b`. Discovery/estimated negative categories only; no per-branch coverage assertion is yet certified.

Files **12**, named operations **49**, branch/return anchors **149**.

### `apps/desktop/ui/browser-context-menu.mjs`

Risk **Medium**; level **Unit + integration/DOM contract**. Candidate negatives: N1 N2 N4 N5 N6 N8 N9 N10. Initial case count estimate **1** pending test evidence.

**Signatures (1)**
- L2 `export function disableBrowserContextMenu(documentRef) {`

**Branch/return candidates (0)**
- No explicit conditional statements

### `apps/desktop/ui/card-i18n.mjs`

Risk **Medium**; level **Unit + integration/DOM contract**. Candidate negatives: N1 N2 N4 N5 N6 N8 N9 N10. Initial case count estimate **22** pending test evidence.

**Signatures (4)**
- L111 `export function cardText(language, key, value) {`
- L130 `function countText(language, value) {`
- L141 `export function metricAccessibleLabel(language, kind, counts, busy = false) {`
- L154 `export function cardNoticeText(language, notice) {`

**Branch/return candidates (18)**
- L113 if (key === "syncReady" \|\| key === "gitErrors")
- L114 return localizedGitCount(locale, key, value);
- L116 if (message === undefined) throw new Error("Unknown card translation key");
- L118 if (locale === "en" \|\| locale === "ru") return rendered;
- L120 if (localized !== undefined) {
- L125 return localized.replaceAll("{name}", dynamic).replaceAll("{count}", dynamic);
- L127 return key in coreCardTerms ? coreText(locale, coreCardTerms[key]) : rendered;
- L131 if (typeof value !== "string" \|\| !/^\d+$/.test(value))
- L132 return cardText(language, "unknown");
- L134 return cardLocale(language) === "ar"
- L142 if (kind !== "runners" && kind !== "tasks") throw new Error("Unknown metric");
- L147 return [cardText(language, kind), metrics,
- L155 if (notice?.kind === "native" && typeof notice.message === "string") {
- L156 return localizedKnownError(language, notice.message);
- L158 if (notice?.kind === "resize" && typeof notice.message === "string") {
- L160 return cardText(language, "cannotResize") + notice.message;
- L162 if (notice?.kind === "git" &&
- L165 return cardText(language, "gitErrors", notice.count) +

### `apps/desktop/ui/model.mjs`

Risk **High**; level **Unit + integration/DOM contract**. Candidate negatives: N1 N2 N4 N5 N6 N8 N9 N10. Initial case count estimate **20** pending test evidence.

**Signatures (5)**
- L1 `export function summarize(snapshot) {`
- L14 `export function safeRunUrl(url) {`
- L27 `export function safeActionsJobUrl(url) {`
- L34 `const validName = name => /^[A-Za-z0-9_.-]+$/.test(name) && name !== "." && name !== "..";`
- L35 `const validNumber = num => /^[0-9]+$/.test(num);`

**Branch/return candidates (15)**
- L4 return {
- L15 if (typeof url !== "string") return null;
- L16 try {
- L18 if (parsed.protocol !== "https:" \|\| parsed.hostname !== "github.com") return null;
- L19 if (!/^\/[^/]+\/[^/]+\/actions\/runs\/\d+\/?$/.test(parsed.pathname)) return null;
- L20 return parsed.href;
- L21 } catch {
- L22 return null;
- L28 if (typeof url !== "string") return null;
- L29 try {
- L31 if (parsed.protocol !== "https:" \|\| parsed.hostname !== "github.com" \|\|
- L36 if (parts.length !== 7 \|\| !validName(parts[0]) \|\| !validName(parts[1]) \|\|
- L39 return parsed.href;
- L40 } catch {
- L41 return null;

### `apps/desktop/ui/monitor-presentation.mjs`

Risk **Medium**; level **Unit + integration/DOM contract**. Candidate negatives: N1 N2 N4 N5 N6 N8 N9 N10. Initial case count estimate **7** pending test evidence.

**Signatures (2)**
- L4 `export function mergeMonitorPresentation(local, remote) {`
- L18 `export function reconcileScanPresentation(next, current, before, after) {`

**Branch/return candidates (5)**
- L5 if (!remote \|\| typeof remote !== "object" \|\|
- L12 for (const key of MONITOR_FIELDS) changes[key] = remote[key];
- L13 return { ...local, ...changes };
- L19 if (before === after) return next;
- L20 return mergeMonitorPresentation(next, current);

### `apps/desktop/ui/native-drag.mjs`

Risk **Medium**; level **Unit + integration/DOM contract**. Candidate negatives: N1 N2 N4 N5 N6 N8 N9 N10. Initial case count estimate **8** pending test evidence.

**Signatures (2)**
- L5 `export function createNativeDragGesture({ start, stop, onError }) {`
- L9 `function enqueue(action) {`

**Branch/return candidates (6)**
- L12 return pending;
- L15 return {
- L17 if (session !== null) return false;
- L21 if (session === mine) session = null;
- L24 return true;
- L27 if (session === null \|\| (id !== null && session.id !== id)) return;

### `apps/desktop/ui/quota-details.mjs`

Risk **High**; level **Unit + integration/DOM contract**. Candidate negatives: N1 N2 N3 N6 N8 N10. Initial case count estimate **37** pending test evidence.

**Signatures (13)**
- L6 `function displayLocale(language) {`
- L15 `const hasRunnerName = value => typeof value === "string" && Boolean(value.trim());`
- L16 `export function displayRunnerName(value) {`
- L29 `export function localCheckedTime(value, timeZone, language = "en") {`
- L36 `const view = (status, sections, message = "") => ({`
- L39 `const notReady = (authorized, topic, reason) => ({`
- L49 `export function isHoverKind(kind) {`
- L53 `function runnerDetails(state) {`
- L65 `function tasksDetails(state) {`
- L87 `function billingDetails(billing = null, language = "en") {`
- L88 `const fmt = value => Number.isFinite(value) && value >= 0`
- L112 `export function buildHoverDetails(state, kind = "billing", authorized = false, statusMessage = null, billing = null, language = "en") {`
- L132 `export function buildQuotaDetails(state, authorized = false, statusMessage = null, billing = null) {`

**Branch/return candidates (24)**
- L8 return ({ pt: "pt-PT", "zh-Hant": "zh-TW", fil: "fil-PH" })[code] ?? code;
- L17 if (!hasRunnerName(value)) return "Unnamed runner";
- L22 for (const unit of units) {
- L23 if (count === 38) break;
- L27 return result;
- L30 if (typeof value !== "string" \|\| !Number.isFinite(Date.parse(value))) return "Unknown";
- L33 if (timeZone) options.timeZone = timeZone;
- L34 return new Intl.DateTimeFormat(displayLocale(language), options).format(new Date(value));
- L50 return HOVER_KINDS.includes(kind);
- L56 return view("Runners · " + total, [{
- L73 for (const runner of runners.slice(0, 4)) {
- L79 if (runners.length > 4) rows.push(["More self-hosted", "+" + (runners.length - 4)]);
- L80 if (!runnersCovered) rows.push(["Self-hosted", "—"]);
- L82 return view("Tasks · Running " + shown(jobsCovered ? counts.running : null) +
- L102 return { title, rows, message };
- L106 return view("Actions · " + period, sections);
- L113 if (!isHoverKind(kind)) return notReady(authorized, "Status", "Unknown tooltip type.");
- L116 if (!state && ["Checking GitHub connection...", "Connecting to GitHub..."].includes(statusMessage))
- L117 return { connected: false, status: "Connecting", message: statusMessage, sections: [] };
- L118 if (kind === "billing") return authorized ? billingDetails(billing, language) : notReady(false, "Billing");
- L119 if (!state \|\| !state.counts \|\| !state.coverage)
- L120 return notReady(authorized, kind === "runners" ? "Runners" : "Tasks", statusMessage);
- L128 return result;
- L133 return buildHoverDetails(state, "billing", authorized, statusMessage, billing);

### `apps/desktop/ui/quota-size.mjs`

Risk **Medium**; level **Unit + integration/DOM contract**. Candidate negatives: N1 N2 N3 N6 N8 N10. Initial case count estimate **4** pending test evidence.

**Signatures (1)**
- L10 `export function usageHeight(titleHeight, contentHeights) {`

**Branch/return candidates (3)**
- L11 if (!Number.isFinite(titleHeight) \|\| titleHeight < 0 \|\|
- L14 return USAGE_MIN_HEIGHT;
- L18 return Math.min(USAGE_MAX_HEIGHT, Math.max(USAGE_MIN_HEIGHT,

### `apps/desktop/ui/repo-menu.mjs`

Risk **High**; level **Unit + integration/DOM contract**. Candidate negatives: N1 N2 N4 N5 N6 N7 N9 N10. Initial case count estimate **2** pending test evidence.

**Signatures (1)**
- L3 `export function placeRepoMenu(anchor, drawer, menu, gap = 4) {`

**Branch/return candidates (1)**
- L18 return { left, top, width };

### `apps/desktop/ui/repo-row-indicator.mjs`

Risk **Medium**; level **Unit + integration/DOM contract**. Candidate negatives: N1 N2 N4 N5 N6 N7 N9 N10. Initial case count estimate **9** pending test evidence.

**Signatures (2)**
- L3 `export function repoRowIndicator(repo, outcome = null) {`
- L4 `const valid = value => Number.isSafeInteger(value) && value >= 0;`

**Branch/return candidates (7)**
- L7 if (repo?.upstream && valid(ahead) && valid(behind)) {
- L8 if (ahead > 0 \|\| behind > 0) {
- L10 if (ahead > 0) parts.push("↑" + ahead);
- L11 if (behind > 0) parts.push("↓" + behind);
- L12 return { kind: "git", text: parts.join(" "), ahead, behind };
- L16 return { kind: "unknown", text: "—" };
- L18 return { kind: "ci", text: outcome === "success" ? "✓" :

### `apps/desktop/ui/runner-collector.mjs`

Risk **High**; level **Unit + integration/DOM contract**. Candidate negatives: N1 N2 N3 N4 N5 N6 N7 N8 N10. Initial case count estimate **38** pending test evidence.

**Signatures (6)**
- L10 `async function getPages(get, pathForPage, key, maxPages) {`
- L22 `async function boundedMap(items, parallel, process) {`
- L41 `function limitRequests(get, limit) {`
- L44 `function dispatch() {`
- L65 `export async function collectRunnerState({`
- L177 `const priorClock = (state, field) => state && Object.hasOwn(state, field)`

**Branch/return candidates (32)**
- L12 for (let page = 1; page <= maxPages; page++) {
- L14 if (!payload \|\| !Array.isArray(payload[key]) \|\|
- L17 if (payload[key].length < PAGE_SIZE) return { items: all, complete: true };
- L19 return { items: all, complete: false };
- L28 while (index < items.length) {
- L34 return result;
- L45 while (active < limit && pending.length) {
- L56 return path => new Promise((resolve, reject) => {
- L71 if (!["all", "runners", "tasks"].includes(kind)) throw Error("Invalid collection kind");
- L74 if (typeof org !== "string" \|\| !NAME.test(org) \|\| org === "." \|\| org === "..")
- L76 if (!Array.isArray(repositories) \|\| !repositories.length) {
- L79 if (typeof get !== "function" \|\| !Number.isInteger(concurrency) \|\|
- L86 if (selectedRepos.length > 100 \|\| selectedRepos.some(repo => {
- L87 if (typeof repo !== "string") return true;
- L89 return components.length !== 2 \|\| components[0].toLowerCase() !== org.toLowerCase() \|\|
- L114 if (needRunners) {
- L116 try {
- L122 } catch (error) {
- L125 if (!runnerPage.complete && !errors.some(error => error.scope === "runners")) {
- L134 try {
- L136 for (const status of ["queued", "in_progress"]) {
- L143 if (!page.complete) complete = false;
- L144 for (const run of page.items) {
- L145 if (Number.isSafeInteger(run?.id) && run.id > 0) runIds.add(run.id);
- L150 if (runIds.size > maxActiveRunsPerRepo) complete = false;
- L157 for (const page of pages) {
- L158 if (!page.complete) complete = false;
- L161 } catch (error) {
- L165 return { repository, jobs, complete, reason };
- L167 for (const result of results) {
- L168 if (!result.complete) errors.push({
- L187 return {

### `apps/desktop/ui/runner-state.mjs`

Risk **High**; level **Unit + integration/DOM contract**. Candidate negatives: N1 N2 N3 N4 N5 N6 N7 N8 N10. Initial case count estimate **37** pending test evidence.

**Signatures (9)**
- L5 `const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);`
- L6 `const label = value => typeof value === "string" ? value.trim().toLowerCase() : "";`
- L8 `export function normalizeLabels(values) {`
- L20 `export function runnerLabelCompatible(jobLabels, runnerLabels) {`
- L29 `export function isStandardGitHubHostedLabel(value) {`
- L36 `export function classifyJobLane(job, knownRunnerIds = new Set()) {`
- L48 `function laneCounts(jobs, ids) {`
- L63 `export function summarizeRunnerState({`
- L124 `const exact = value => jobsComplete ? value : null;`

**Branch/return candidates (28)**
- L9 if (!Array.isArray(values)) return null;
- L11 for (const value of values) {
- L13 if (typeof name !== "string" \|\| !name.trim()) return null;
- L15 if (!result.includes(normalized)) result.push(normalized);
- L17 return result;
- L23 return Boolean(requested?.includes("self-hosted") && available &&
- L30 return /^(?:ubuntu\|windows\|macos)-(?:latest\|slim\|[\da-z][\da-z.]*)(?:-[\w.-]+)?$/.test(label(value));
- L37 if (!isObject(job)) return "unknown";
- L38 if (Number.isSafeInteger(job.runner_id) && knownRunnerIds.has(job.runner_id)) {
- L39 return "selfHosted";
- L42 if (!labels?.length) return "unknown";
- L43 if (labels.includes("self-hosted")) return "selfHosted";
- L44 if (labels.some(isStandardGitHubHostedLabel)) return "githubHosted";
- L45 return "unknown";
- L51 for (const job of jobs) {
- L57 return { counts, details };
- L70 for (const runner of inventory) {
- L71 if (!isObject(runner) \|\| !Number.isSafeInteger(runner.id) \|\| runner.id <= 0 \|\|
- L91 for (const job of items) {
- L92 if (!isObject(job) \|\| !Number.isSafeInteger(job.id) \|\| job.id <= 0 \|\|
- L98 if (existing && JSON.stringify(existing) !== JSON.stringify(job)) {
- L100 } else if (!existing) uniqueJobs.set(job.id, job);
- L107 for (const job of uniqueJobs.values()) {
- L108 if (job.status === "in_progress") running.push(job);
- L109 else if (job.status === "queued") {
- L111 if (inventoryComplete && classifyJobLane(job, seenRunnerIds) === "selfHosted" &&
- L115 } else if (["waiting", "pending", "requested"].includes(job.status)) {
- L125 return {

### `apps/desktop/ui/scan-refresh.mjs`

Risk **High**; level **Unit + integration/DOM contract**. Candidate negatives: N1 N2 N4 N5 N6 N8 N9 N10. Initial case count estimate **13** pending test evidence.

**Signatures (3)**
- L10 `export function shouldSpinForRepos(scanActive, hasCachedSnapshot) {`
- L14 `export function createScanRefreshQueue({ scan, publish, onError,`
- L23 `async function drain() {`

**Branch/return candidates (10)**
- L11 return Boolean(scanActive) && !hasCachedSnapshot;
- L16 if (typeof scan !== "function" \|\| typeof publish !== "function" \|\|
- L26 try {
- L28 if (!invalidated) publish(result);
- L29 } catch (error) {
- L30 if (!invalidated) onError(error);
- L35 return function refresh() {
- L36 if (active) {
- L38 return active;
- L45 return active;


## Evidence to bind at Stage 4

- Corresponding `tests/{module}.test.mjs` and `tests/mode-b-*.test.mjs` are candidate paths only; inspect and map assertion identifiers, including failure and concurrency cases.
- N11 is not applicable. N12 storage faults apply to persisted config, but pure calculations in these modules have no storage side effects. N3 network failures apply to collectors and monitor requests, not to pure label formatters.
- Anonymous callbacks, nullish behavior, Promise early exits and ternary expressions are included as Stage 4 obligations even if absent from lexical branch candidates.
