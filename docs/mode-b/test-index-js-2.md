# Mode B existing test inventory, part 2 (JS)

Exact baseline `5b07a3273a27516af8ceb793f0d427a1bada964b`. The 747-test Strict result is executable CI evidence; this file supplies individual test declaration candidates, not automatic branch-coverage proof.

### `tests/git-scan-performance.test.mjs`

Classification **Source contract** (preliminary); `../apps/desktop/src-tauri/src/main.rs`, `../crates/repoticker-core/src/git.rs`. **Declared tests (2)**:

- L6 test("local snapshot uses bounded independent inspection", () => {
- L16 test("operation markers are checked with one per-worktree Git admin directory", () => {

### `tests/github-billing.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/github-billing.mjs`, `../apps/desktop/src-tauri/src/github_api.rs`, `../apps/desktop/ui/quota.mjs`. **Declared tests (14)**:

- L12 test("billing requests use fixed owner paths and month, never legacy Actions billing", async () => {
- L41 test("only recognized direct-owner plans provide documented included allowances", () => {
- L55 test("strict billing projections reject malformed, negative and enormous minutes", () => {
- L67 test("organization admin rejection is isolated from personal plan and billing", async () => {
- L85 test("malformed personal usage is unavailable even when org billing succeeds", async () => {
- L98 test("unsupported owner, missing identity and unknown plans fail closed", async () => {
- L122 test("recognized organization plan remains visible if Actions billing is denied", async () => {
- L140 test("organization plan denial does not erase available usage and never infers plan", async () => {
- L157 test("billing cache coalesces concurrent reads, throttles hover and invalidates on scope/disconnect", async () => {
- L183 test("source contracts keep billing route exact, native-projected and token-free", async () => {
- L197 test("Mode B: billing UTC month boundaries never use local offset or invent remaining", async () => {
- L209 test("Mode B: usage length, SKU, quantity and accumulated safe-number boundaries", () => {
- L230 test("Mode B: an old in-flight organization read cannot poison new scope cache", async () => {
- L256 test("Mode B: billing cache refreshes at TTL boundary and after clock reversal", async () => {

### `tests/github-errors.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/locale-catalog.mjs`, `../apps/desktop/ui/locale-errors.mjs`, `../apps/desktop/ui/surface-i18n.mjs`, `../apps/desktop/ui/github-errors.mjs`. **Declared tests (4)**:

- L10 test("native GitHub HTTP and authorization errors become finite redacted categories", () => {
- L29 test("arbitrary provider strings, tokens and objects do not enter monitor descriptions", () => {
- L44 test("failure priority favors login and throttling while handling empty and malformed inputs", () => {
- L60 test("redacted monitor reasons are rendered in all twenty locales via the tooltip boundary", () => {

### `tests/github-installations-mode-b.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/github-installations.mjs`, `../apps/desktop/ui/github-monitor.mjs`. **Declared tests (7)**:

- L8 test("Mode B: empty and complete installation inventories retain truthful coverage", async () => {
- L18 test("Mode B: one corrupt row cannot make a partial installation inventory appear complete", async () => {
- L37 test("Mode B: exact overlapping GitHub pages deduplicate without losing scope", async () => {
- L52 test("Mode B: duplicate installation ID or owner with different identity fails closed", async () => {
- L61 test("Mode B: malformed page cardinality and missing collection reject immediately", async () => {
- L71 test("Mode B: corrupt account inventory prevents any repository query", async () => {
- L85 test("Mode B: installation name at native API limit is accepted; longer is not", async () => {

### `tests/github-monitor.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/github-monitor.mjs`, `../apps/desktop/src-tauri/src/main.rs`. **Declared tests (30)**:

- L12 test("single available GitHub App installation is selected automatically", async () => {
- L40 test("multiple installations require explicit account choice", async () => {
- L60 test("inaccessible or missing repository list cannot fabricate zero jobs", async () => {
- L71 test("truncated >100 repository scope forces running/queue to unknown", async () => {
- L93 test("installation pagination preserves truncation evidence", async () => {
- L107 test("unbounded org repository sets are not silently represented as complete", async () => {
- L117 test("runner-only permission denial gives a bounded diagnostic and keeps job totals", async () => {
- L139 test("rate-limited job collection shows explicit rate-limit status without fabricated zero", async () => {
- L155 test("monitor says Connecting after native authorization before slow data collection", async () => {
- L192 test("disconnected native credential check never claims Connecting or authorized", async () => {
- L210 test("GitHub monitor uses config-only scope without invoking the local Git scan", async () => {
- L249 test("first monitor startup reports only allowlisted nonsecret milestones in order", async () => {
- L279 test("429 backoff prevents timer and forced card refresh from hitting GitHub early", async () => {
- L316 test("partially rate-limited collection carries covered counts and honors cooldown", async () => {
- L346 test("offline errors publish unknown counts, not stale successful counts", async () => {
- L374 test("native disconnect remains immediate while REST cooldown is active", async () => {
- L405 test("slow prior Monitor account response cannot overwrite newly selected account", async () => {
- L444 test("late failed collector cannot replace disconnected auth state", async () => {
- L471 test("disconnect clears previous counts without waiting for a blocked collector", async () => {
- L517 test("scope switch immediately clears other account counts while collection remains blocked", async () => {
- L562 test("delayed native publication cannot overwrite later disconnect", async () => {
- L599 test("scope changes during async cooldown read cannot publish old account result", async () => {
- L641 test("selected repositories filter Actions calls before counting jobs", async () => {
- L665 test("revoked selected repository never fabricates complete job counts", async () => {
- L679 test("selected repo outside first 100 remains addressable within authorized pagination", async () => {
- L699 test("native persisted selection defaults to all and validates account ownership", () => {
- L713 test("targeted metric merge preserves unrelated coverage, totals and checked time", () => {
- L753 test("manual refresh under active cooldown does not bypass GitHub rate gate", async () => {
- L788 test("targeted updates preserve explicitly unknown clock without legacy fallback", () => {
- L805 test("manual metric refresh never merges identities from a different account", () => {

### `tests/github-rest-transport.test.mjs`

Classification **Source contract** (preliminary); `../apps/desktop/src-tauri/src/github_api.rs`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/src-tauri/src/github_etag_cache.rs`, `../apps/desktop/src-tauri/src/github_session.rs`. **Declared tests (3)**:

- L10 test("native GitHub REST reuses a process-local client without caching response data", () => {
- L24 test("each read still applies native token, validates route, enforces rate gate and response projection", () => {
- L40 test("ETag caching is native, generation-scoped and never serves unvalidated 304", () => {

### `tests/graceful-quit.test.mjs`

Classification **Source contract** (preliminary); `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/src-tauri/src/linux_tray.rs`, `../crates/repoticker-core/src/shutdown.rs`. **Declared tests (4)**:

- L10 test("KDE and Windows Quit both enter one native graceful shutdown path", () => {
- L20 test("graceful Quit cancels Fetch before waiting for existing operation lock", () => {
- L37 test("Git action admission and Fetch publication both check shutdown state", () => {
- L51 test("window close still hides, Safe sync is not killed, and events remain untouched", () => {

### `tests/hover-fallback.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/quota-details.mjs`, `../apps/desktop/ui/app.mjs`. **Declared tests (4)**:

- L9 test("rich panel projects runner and task information", () => {
- L25 test("unknown billing data is unknown, never zero", () => {
- L30 test("actual mouse entry recovers missing shown event and uses native balloon", () => {
- L38 test("WebView2 browser tooltip fallback is gone", () => {

### `tests/hybrid-reconcile-schedule.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/github-monitor.mjs`. **Declared tests (11)**:

- L83 test("Given Simple polling When two minutes elapse Then continue full REST snapshots", async () => {
- L93 test("Given native online Hybrid When time advances Then runners remain fresh and full CI uses 15-minute safety bound", async () => {
- L107 test("Given frequent Hybrid task hints When time advances Then tasks cannot starve full REST or runner reads", async () => {
- L122 test("Given online-to-fallback transition When WebSocket is lost Then reconcile immediately and restore short polling", async () => {
- L133 test("Given connecting or polling native phase When timer advances Then keep the short full REST schedule", async () => {
- L142 test("Given native phase IPC failure When monitor starts Then fail safe to direct polling", async () => {
- L149 test("Given late native phase snapshot When newer fallback event arrives Then stale snapshot cannot restore online mode", async () => {
- L165 test("Given a burst of two task hints When burst gate coalesces Then a trailing task reconciliation is not lost", async () => {
- L178 test("Given an incomplete full REST snapshot When online Then do not stretch recovery to 15 minutes", async () => {
- L190 test("Given GitHub cooldown When fallback forces a read Then no rate-limit bypass occurs", async () => {
- L219 test("Given unknown native phase When online Then conservatively revert to full REST and never trust a status payload", async () => {

### `tests/ignored-children.test.mjs`

Classification **Source contract** (preliminary); `../crates/repoticker-core/src/git.rs`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/ui/settings.mjs`, `../apps/desktop/ui/settings.html`. **Declared tests (3)**:

- L10 test("config defaults to legacy discovery and never drops existing settings", () => {
- L18 test("snapshot actions and navigation all share the same ignore boundary", () => {
- L30 test("ignore Settings edits are draft-only and saved on the existing OK contract", () => {

### `tests/linux-qa-installer.test.mjs`

Classification **Source contract** (preliminary); `../scripts/install_qa_linux.sh`. **Declared tests (5)**:

- L10 test("QA installer is bash-valid and uses a unique extraction directory", () => {
- L21 test("QA installer refuses stale source and unverified package", () => {
- L28 test("QA installer starts exactly one actual installed binary, not guessed CLI", () => {
- L34 test("QA installer replaces same-version production DEB and proves exact payload", () => {
- L47 test("QA installer requires the synchronized current Debian package version", () => {

### `tests/locale-counts-and-notifications.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/locale-catalog.mjs`, `../apps/desktop/ui/locale-counts.mjs`, `../apps/desktop/ui/locale-plurals.mjs`, `../apps/desktop/ui/card-i18n.mjs`, `../apps/desktop/ui/quota-details.mjs`, `../apps/desktop/ui/locales/notifications.json`, `../apps/desktop/src-tauri/src/ci_notifications.rs`, `../apps/desktop/ui/settings.mjs`, `../apps/desktop/ui/quota.mjs`, `../apps/desktop/ui/app.mjs`. **Declared tests (5)**:

- L17 test("every locale has complete, placeholder-safe repository-count sentences", () => {
- L37 test("repository selection formats non-fabricated quantities and locale plurals", () => {
- L60 test("Git counts choose plural rules without translating identifiers", () => {
- L78 test("all CI notifications preserve provider run identity and opt-in scope", () => {
- L107 test("usage presentation localizes numbers, dates and isolates provider names", () => {

### `tests/locale-errors.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/locale-catalog.mjs`, `../apps/desktop/ui/locale-errors.mjs`, `../apps/desktop/ui/card-i18n.mjs`, `../apps/desktop/ui/github-errors.mjs`, `../apps/desktop/ui/settings-i18n.mjs`, `../apps/desktop/ui/surface-i18n.mjs`, `../apps/desktop/ui/settings.mjs`, `../apps/desktop/ui/app.mjs`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/src-tauri/src/autostart.rs`, `../apps/desktop/src-tauri/src/github_session.rs`, `../apps/desktop/src-tauri/src/github_api.rs`, `../crates/repoticker-core/src/git.rs`. **Declared tests (14)**:

- L74 test("all known fixed local/authorization errors have exact 20-locale key parity", () => {
- L90 test("known failures preserve user-action semantics in representative locales", () => {
- L103 test("unknown exception payloads, OS paths, repos and tokens pass through without rewriting", () => {
- L122 test("catalog keys are grounded in native or Settings static error sites", () => {
- L134 test("card known native error projection uses every exact existing 20-locale translation", () => {
- L146 test("unknown native error and provider data remain exact text, not partial translations", () => {
- L170 test("card reprojects typed raw and Git-operation notices on locale changes", () => {
- L191 test("exact native Git safety messages and summary localize in all 20 languages", () => {
- L234 test("all 18 GitHub API/monitor diagnostics have exact locale parity and safe meaning", () => {
- L277 test("unknown GitHub error payloads are not translated by exact-key catalog", () => {
- L299 test("native autostart/clipboard errors are translated exactly in every locale", () => {
- L332 test("OS errors with dynamic paths and process details are left unchanged", () => {
- L349 test("resize error keeps raw OS data while localizing only the prefix in all 20 locales", () => {
- L371 test("card resize failure is a typed notice and stays translatable on locale changes", () => {

