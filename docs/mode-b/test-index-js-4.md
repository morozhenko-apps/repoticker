# Mode B existing test inventory, part 4 (JS)

Exact baseline `5b07a3273a27516af8ceb793f0d427a1bada964b`. Test names are not a substitute for assertions. Need confirm SQL transaction and socket adapter tests actually execute domain functions, while Worker documentation/config tests are correctly labeled structural.

### `tests/package-identity.test.mjs`

Classification **Source contract** (preliminary); no direct source import extracted. **Declared tests (4)**:

- L18 test("one executable name for Cargo, Tauri, Windows and Linux", () => {
- L30 test("packaging keeps a branded launcher but no hyphenated Debian package", () => {
- L46 test("unpublished installer refuses legacy package and launches canonical executable", () => {
- L61 test("active release and QA scripts contain no accidental alternate product spelling", () => {

### `tests/quota-details.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/quota-details.mjs`, `../apps/desktop/ui/model.mjs`. **Declared tests (8)**:

- L6 test("legacy billing-only entrypoint shows only account types and unknown quotas", () => {
- L15 test("unavailable runner statistics do not erase authorization", () => {
- L21 test("job URL validator remains restricted even though hover window is pointer-pass-through", () => {
- L34 test("billing hover stacks only compact verified owner fields", () => {
- L54 test("initial credential check and data loading say Connecting, not Connect GitHub", () => {
- L75 test("runner names truncate by Unicode graphemes, not UTF-16 code units", () => {
- L101 test("task preview records fallback provenance without altering runner identities", () => {
- L125 test("unavailable runner inventory does not synthesize an unnamed runner", () => {

### `tests/quota-mode-b.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/quota.mjs?mode-b-`. **Declared tests (10)**:

- L155 test("Mode B: popup billing scope fails closed on conflicting owner provenance", async () => {
- L182 test("Mode B: old initial monitor IPC reply never overwrites newer event metrics", async () => {
- L201 test("Mode B: failed monitor-only IPC reports unavailable, not old confident counts", async () => {
- L216 test("Mode B: prior-account billing arriving late cannot replace newer scope billing", async () => {
- L253 test("Mode B: raw billing transport exception never appears in detached popup", async () => {
- L269 test("Mode B: initial native monitor denial recovers on a later trusted event", async () => {
- L285 test("Mode B: invalid native account scope fails closed until corrected", async () => {
- L303 test("Mode B: unknown native popup kind cannot invent metrics and later recovers", async () => {
- L318 test("Mode B: failed locale IPC falls back to English without changing trusted metrics", async () => {
- L336 test("Mode B: a delayed old locale reply cannot override the later config event", async () => {

### `tests/quota-surface.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/quota-size.mjs`, `../apps/desktop/ui/index.html`, `../apps/desktop/ui/app.mjs`, `../apps/desktop/ui/quota.html`, `../apps/desktop/ui/quota.css`, `../apps/desktop/src-tauri/src/linux_surface.rs`, `../apps/desktop/src-tauri/tauri.conf.json`, `../apps/desktop/ui/quota.mjs`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/src-tauri/capabilities/default.json`, `../apps/desktop/src-tauri/capabilities/usage-events.json`, `../apps/desktop/src-tauri/src/windows_geometry.rs`, `../apps/desktop/ui/style.css`. **Declared tests (12)**:

- L13 test("compact card is never resized or expanded to display a tooltip", () => {
- L23 test("tooltip is a standalone WebView and not a child of compact card", () => {
- L35 test("usage height is based on content rows, never viewport scrollHeight", () => {
- L50 test("usage overlay follows the same physical monitor as the main Layer Shell card", () => {
- L60 test("three separate hover targets share one pointer-pass-through WebView", () => {
- L70 test("native tooltip ignores pointer/focus and reports the actual surface backend", () => {
- L77 test("KDE Wayland forces native GDK selection before Tauri setup", () => {
- L86 test("the separate usage WebView can listen without inheriting main permissions", () => {
- L107 test("GTK exact min/max height updates stay valid while growing and shrinking", () => {
- L116 test("Windows usage tooltip clips the WebView corner pixels on show and resize", () => {
- L141 test("localized billing diagnostics are not needlessly clamped before native size limit", () => {
- L154 test("long locale diagnostics wrap within bounded card and tooltip instead of horizontal cropping", () => {

### `tests/relay-hub.test.mjs`

Classification **Controller/integration fixture** (preliminary); `../apps/relay-cloudflare/src/hub.mjs`, `../apps/relay-cloudflare/src/relay-protocol.mjs`. **Declared tests (19)**:

- L73 test("Given verified delivery When stored Then retry is idempotent and cursor never duplicates", async () => {
- L87 test("Given more than 128 webhook deliveries When querying stale cursor Then reset is required", async () => {
- L106 test("Given WebSocket subscriber When connected Then replay only bounded hints and accept no command", async () => {
- L118 test("Given old journal and WebSocket cap When replaying Then no unbounded websocket state", async () => {
- L134 test("Given expired/unauthorized session or malformed internal hint Then deny with no durable writes", async () => {
- L152 test("Given excessive signed deliveries in one minute Then hard-cap writes and allow duplicate idempotence", async () => {
- L163 test("Given storage failure When inserting Then no success acknowledgment or phantom delivery", async () => {
- L169 test("Given subscriber with outdated cursor When reconnecting Then report reset before ready", async () => {
- L179 test("Given a repository revoked from allowlist When replaying Then old stored hints do not leak it", async () => {
- L188 test("Given owner-scope allowlist When ingesting/replaying Then permit new repo and hide revoked history", async () => {
- L202 test("Given concurrent duplicate deliveries When ingesting Then transaction grants one cursor and one rate admission", async () => {
- L212 test("Given failed SQL insert after budget increment When transacting Then roll back both hint and budget", async () => {
- L223 test("Given exact history age boundary When replaying Then include age limit and reset one millisecond later", async () => {
- L237 test("Given one backpressured subscriber When broadcasting Then close only it and notify healthy peers", async () => {
- L252 test("Given one throwing socket When broadcasting Then isolate send error and keep durable write committed", async () => {
- L265 test("Given socket client messages When handling Then pong to ping and close arbitrary commands", async () => {
- L277 test("Given invalid durable requests When dispatching Then reject without writing records", async () => {
- L302 test("Given 512/513-byte signed-internal hint payloads When ingesting Then enforce exact DO bound", async () => {
- L320 test("Given revoked runtime allowlist When reading Durable Object Then fail closed with no journal leak", async () => {

### `tests/relay-native-diagnostics.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/settings-i18n.mjs`, `../apps/desktop/ui/locale-catalog.mjs`, `../apps/desktop/src-tauri/src/relay_transport.rs`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/ui/settings.html`, `../apps/desktop/ui/settings.mjs`, `../apps/desktop/ui/settings.css`, `../apps/desktop/src-tauri/tauri.conf.json`, `../apps/desktop/src-tauri/src/relay_secret.rs`. **Declared tests (7)**:

- L15 test("WSS emits safe, closed reason codes and does not print provider errors", () => {
- L33 test("WSS upgrade has explicit generic user agent and never disables TLS checks", () => {
- L40 test("failure detail is visible inline and has no redundant tooltip", () => {
- L50 test("all 20 Settings languages include the user-facing native WSS failure reasons", () => {
- L78 test("settings cannot minimize and keeps a draggable Close-only titlebar", () => {
- L92 test("credential Disconnect does not depend on network state or Settings loading", () => {
- L103 test("opt-in lifecycle tracing emits finite state only after persistence, not secrets", () => {

### `tests/relay-protocol.test.mjs`

Classification **Runtime module** (preliminary); `../apps/relay-cloudflare/src/relay-protocol.mjs`. **Declared tests (6)**:

- L16 test("Given operator allowlist When validating names Then only exact unique owner/repos pass", () => {
- L27 test("Given an explicitly allowed owner When verifying repos Then accept only its current and future children", () => {
- L44 test("Given GitHub delivery identifier and cursor When parsing Then reject replays via strict formats", () => {
- L58 test("Given signed workflow_run event When checking schema Then only supported allowlisted run hints pass", () => {
- L90 test("Given request body When reading Then cap bytes before accumulation and refuse mismatch", async () => {
- L104 test("Given operator bearer secret When checking client Then no wrong token is authorized", async () => {

### `tests/relay-webhook-signature.test.mjs`

Classification **Runtime module** (preliminary); `../apps/relay-cloudflare/src/webhook-verify.mjs`, `../apps/relay-cloudflare/src/index.ts`, `../apps/relay-cloudflare/src/worker.mjs`. **Declared tests (5)**:

- L12 test("Given a valid raw GitHub webhook When verifying HMAC Then exact signed bytes pass", async () => {
- L21 test("Given body or secret differs When verifying webhook Then it is rejected", async () => {
- L29 test("Given a missing or malformed signature When verifying Then fail closed", async () => {
- L40 test("Given invalid verifier input When verifying Then no provider secret or delivery is accepted", async () => {
- L48 test("Given the new Hybrid worker When packaged Then it routes through the signed front door", () => {

### `tests/relay-worker-binding-retention.test.mjs`

Classification **Source contract** (preliminary); `../apps/relay-cloudflare/wrangler.toml`, `../apps/relay-cloudflare/README.md`. **Declared tests (4)**:

- L10 test("Git-linked Wrangler deployments retain dashboard-managed runtime variables", () => {
- L20 test("Worker source does not embed operator secrets or private allowlist values", () => {
- L28 test("Deployment guide separates runtime bindings from build variables", () => {
- L35 test("GitHub relay CI compiles the Worker without publishing or uploading secrets", () => {

### `tests/relay-worker-distribution-ui.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/settings-i18n.mjs`, `../apps/desktop/ui/locale-catalog.mjs`, `../apps/desktop/ui/settings.html`, `../apps/desktop/ui/settings.mjs`, `../apps/desktop/ui/settings.css`, `../apps/desktop/ui/style.css`, `../apps/desktop/ui/about.css`, `../apps/desktop/ui/quota.css`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/relay-cloudflare/README.md`. **Declared tests (5)**:

- L17 test("the desktop links to one deployment guide and keeps setup out of Settings", () => {
- L27 test("native browser opening admits only two fixed settings-only URL resources", () => {
- L40 test("Worker help links and browser errors have translations in all 20 locales", () => {
- L52 test("masked password placeholder has normal tracking and readable help contrast", () => {
- L61 test("each desktop window disables incidental text selection with safe exceptions", () => {

### `tests/relay-worker.test.mjs`

Classification **Controller/integration fixture** (preliminary); `../apps/relay-cloudflare/src/worker.mjs`. **Declared tests (8)**:

- L36 test("Given a signed allowed completion When accepted Then enqueue only minimal durable hint", async () => {
- L42 test("Given signed organization webhook When owner scope enabled Then allow newly created repository only", async () => {
- L60 test("Given signed requested/in_progress/completed When accepted Then relay only repo hints", async () => {
- L80 test("Given invalid signature, schema, ID or owner When received Then reject before persistence", async () => {
- L93 test("Given signed ping When GitHub initializes hook Then acknowledge without a hint", async () => {
- L98 test("Given durable failure When ingesting Then return retryable 503", async () => {
- L102 test("Given client subscription When not authenticated Then do not read private journal", async () => {
- L116 test("Given unsafe method or query When checking ingress Then reject without calling durable object", async () => {

### `tests/repo-local-actions.test.mjs`

Classification **Source contract** (preliminary); `../apps/desktop/src-tauri/src/main.rs`, `../crates/repoticker-core/src/git.rs`, `../apps/desktop/ui/app.mjs`, `../apps/desktop/ui/index.html`. **Declared tests (3)**:

- L10 test("all navigation and clipboard commands share the canonical enrollment verifier", () => {
- L27 test("folder uses argv-only OS file manager and clipboard writes only canonical path", () => {
- L40 test("five popup options leave the four compact buttons unchanged", () => {

### `tests/repo-menu.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/repo-menu.mjs`, `../apps/desktop/ui/card-i18n.mjs`, `../apps/desktop/ui/app.mjs`, `../apps/desktop/ui/style.css`, `../apps/desktop/ui/index.html`. **Declared tests (4)**:

- L11 test("popup is outside scroll-clipped, isolated repository rows and visibly opaque", () => {
- L18 test("menu stays within drawer and flips above lower scroll rows", () => {
- L33 test("menu contains Fetch, Safe pull and native enrolled GitHub open with dismissal", () => {
- L55 test("long translated repository actions remeasure at every open and stay inside drawer", () => {

