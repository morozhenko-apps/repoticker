# Mode B existing test inventory, part 6 (JS)

Exact baseline `5b07a3273a27516af8ceb793f0d427a1bada964b`. Physical Windows and KDE evidence cannot be deduced from source-level tests. Enumerate OS behavior independently in Stage 6 interactions.

### `tests/tray-safe-sync.test.mjs`

Classification **Source contract** (preliminary); `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/src-tauri/src/linux_tray.rs`, `../apps/desktop/src-tauri/src/tray_i18n.rs`, `../apps/desktop/ui/locales/native.json`. **Declared tests (3)**:

- L12 test("six stable tray actions have 20-language labels and keep Safe Sync dispatch", () => {
- L34 test("KDE maintains one KSNI tray handle and updates labels on successful save", () => {
- L44 test("Windows changes menu labels without replacing tray icon or stable action IDs", () => {

### `tests/ui-layout.test.mjs`

Classification **Isolated process** (preliminary); `../apps/desktop/ui/view.mjs`, `../apps/desktop/ui/index.html`, `../apps/desktop/ui/style.css`, `../apps/desktop/ui/app.mjs`, `../apps/desktop/ui/settings.html`, `../apps/desktop/ui/settings.css`, `../apps/desktop/ui/settings.mjs`, `../apps/desktop/src-tauri/tauri.conf.json`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/ui/about.html`, `../apps/desktop/ui/about.mjs`, `../apps/desktop/src-tauri/src/linux_surface.rs`, `../apps/desktop/src-tauri/src/github_session.rs`, `../apps/desktop/ui/github-monitor.mjs`, `../apps/desktop/ui/quota.mjs`, `../apps/desktop/ui/repo-row-indicator.mjs`. **Declared tests (17)**:

- L10 test("compact has no duplicate header, refresh, or permanent results", () => {
- L22 test("four main operations remain at bottom; only two metric hovers and billing icon", () => {
- L40 test("repeating Repos collapses to compact; new open always resets", () => {
- L51 test("only clean, behind and upstream tracking repos activate safe pull", () => {
- L63 test("successes do not create logs, errors remain visible and check is green", () => {
- L72 test("native progress reports are in rows with translucent fills and bulk button percentages", () => {
- L82 test("settings has a separate entrypoint and card can be dragged", () => {
- L94 test("repository drawer disables idle dismissal and drag never survives hiding", () => {
- L105 test("parallel repo tracking keeps multiple running rows and monotonic button progress", () => {
- L112 test("settings is transactional and has no duplicate title or scrolling page", () => {
- L128 test("popup is transparent and persists native anchor after manual movement", () => {
- L143 test("tray About uses real package version, icon and author", () => {
- L153 test("native geometry changes are serialized by GTK acknowledgment and preserve anchor", () => {
- L171 test("GitHub Device Flow Settings never expose bearer tokens to JavaScript", () => {
- L201 test("read-only monitor flow shares native state and allows installation selection", () => {
- L218 test("only status hovers use help cursor and compact metric row cannot change card height", () => {
- L226 test("CI checkmark and cross depend only on resolved GitHub Actions outcomes", () => {

### `tests/ui.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/model.mjs`. **Declared tests (3)**:

- L5 test("empty or missing state never invents activity", () => {
- L11 test("summary counts online and busy runners separately", () => {
- L22 test("only direct GitHub Actions run links pass validation", () => {

### `tests/usage-events.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/quota.mjs?usage-kind-regression`. **Declared tests (1)**:

- L30 test("native-selected tooltip switches reliably and auto-selected organization provides billing", async () => {

### `tests/window-frame.test.mjs`

Classification **Source contract** (preliminary); `../apps/desktop/ui/window-frame.css`, `../apps/desktop/ui/settings.html`, `../apps/desktop/ui/about.html`, `../apps/desktop/src-tauri/tauri.conf.json`. **Declared tests (1)**:

- L7 test("frameless Settings and About reuse one theme-aware inside-viewport contour", () => {

### `tests/windows-card-regressions.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/view.mjs`, `../apps/desktop/ui/app.mjs`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/src-tauri/tauri.conf.json`, `../apps/desktop/src-tauri/src/windows_geometry.rs`, `../apps/desktop/ui/settings.mjs`, `../apps/desktop/ui/settings.html`, `../apps/desktop/src-tauri/capabilities/default.json`. **Declared tests (6)**:

- L8 test("Expanded card sizes 0, 1, 2, 10 and 100 repositories without empty space", () => {
- L20 test("One repo is rendered without a minimum item count", () => {
- L28 test("Windows release binary has no console and transparent popups lack native white shadow", () => {
- L40 test("Windows popup restores and saves position using existing config margins", () => {
- L50 test("Windows close handler saves using typed WebviewWindow rather than generic Window", () => {
- L58 test("Native folder selection has no broad WebView permissions", () => {

### `tests/windows-git-process.test.mjs`

Classification **Source contract** (preliminary); `../crates/repoticker-core/src/git.rs`. **Declared tests (2)**:

- L10 test("Windows GUI spawns Git and taskkill without allocating console windows", () => {
- L22 test("Git loader failure retains 0xC0000142 and is not an absent repository", () => {

### `tests/windows-hover-trace.test.mjs`

Classification **Source contract** (preliminary); no direct source import extracted. **Declared tests (4)**:

- L9 test("hover debugging is opt-in, single-read and stage-specific", () => {
- L22 test("native hover trace cannot echo user-defined strings or secret values", () => {
- L35 test("native show command traces its entry before any popup lookup or positioning", () => {
- L45 test("Windows target cannot compile away the unmanaged usage popup show path", () => {

### `tests/windows-nsis-credential-cleanup.test.mjs`

Classification **Source contract** (preliminary); no direct source import extracted. **Declared tests (5)**:

- L15 test("NSIS uses the official post-uninstall hook without forking Tauri's template", () => {
- L24 test("cleanup is gated on explicit delete-data consent AND never runs on upgrades", () => {
- L34 test("deletion targets precisely the v1 Windows Credential Manager user.service entry", () => {
- L46 test("missing credential is idempotent; other failures are visible and nonzero", () => {
- L55 test("normal Settings Disconnect remains the native credential deletion path", () => {

### `tests/windows-qa-seven-findings.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/card-i18n.mjs`, `../apps/desktop/ui/locale-catalog.mjs`, `../apps/desktop/ui/quota-details.mjs`. **Declared tests (6)**:

- L16 test("Fetch controls are meaningful localized verbs, not 19 English Fetch labels", () => {
- L30 test("all three Windows metrics use a single styled native usage window", () => {
- L47 test("billing retains full authoritative data and refuses invented allowances", () => {
- L62 test("compact Windows geometry has no unaccounted top gap", () => {
- L71 test("Settings Apply closes after committed mutation, not after a second network read", () => {
- L84 test("AppData and OS keychain are separate stores; uninstall cannot silently revoke OAuth", () => {

### `tests/windows-settings-qa.test.mjs`

Classification **Controller/integration fixture** (preliminary); `../apps/desktop/ui/settings.mjs`, `../apps/desktop/ui/settings.html`, `../apps/desktop/ui/settings.css`, `../apps/desktop/ui/app.mjs`, `../apps/desktop/ui/index.html`, `../apps/desktop/ui/style.css`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/src-tauri/src/tray_i18n.rs`, `../apps/desktop/ui/locales/native.json`, `../apps/desktop/src-tauri/tauri.conf.json`. **Declared tests (7)**:

- L16 test("Windows verbatim paths are normalized only in the display projection", () => {
- L32 test("Native titles use saved locale and pending locale cannot repaint Settings", () => {
- L46 test("Folders and ignored child names both have native browse controls", () => {
- L54 test("Scrollable Settings and dropdown options align at the top without extra padding", () => {
- L62 test("Windows drawer pointer interaction does not start window dragging", () => {
- L69 test("Metric hover uses nonfocusable pointer-through Windows balloon without native misleading titles", () => {
- L81 test("Settings and About cannot minimize and use the explicit native RepoTicker icon", () => {

### `tests/windows-tray-physical-regressions.test.mjs`

Classification **Source contract** (preliminary); no direct source import extracted. **Declared tests (6)**:

- L13 test("Given main card, right click cannot expose a WebView browser menu", () => {
- L22 test("Given empty repository drawer, message aligns centered without overlay or new height", () => {
- L29 test("Given Windows hover, left mouse-drag cannot capture metric targets", () => {
- L38 test("Given native Windows usage popup, show and resize enforce topmost without focus", () => {
- L58 test("Given QA code change, Windows and Linux acceptance jobs stay unpublished", () => {
- L71 test("unmanaged tooltip is anchored to fixed footer rather than expanding card top", () => {

