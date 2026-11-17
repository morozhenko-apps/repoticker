# Mode B existing test inventory, part 3 (JS)

Exact baseline `5b07a3273a27516af8ceb793f0d427a1bada964b`. Do not treat test file naming or source-string assertions as behavioral coverage. Generated matrix tests require case count reconciliation with Node26's 747 test report.

### `tests/localization-20.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/locale-catalog.mjs`, `../apps/desktop/ui/locale-extended.mjs`, `../apps/desktop/ui/locale-workflow.mjs`, `../apps/desktop/ui/locale-auth.mjs`, `../apps/desktop/ui/locale-surface.mjs`, `../apps/desktop/ui/locale-card.mjs`, `../apps/desktop/ui/settings-i18n.mjs`, `../apps/desktop/ui/card-i18n.mjs`, `../apps/desktop/ui/surface-i18n.mjs`, `../apps/desktop/ui/locales/native.json`, `../apps/desktop/ui/settings.html`, `../apps/desktop/ui/settings.mjs`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/ui/app.mjs`, `../apps/desktop/ui/style.css`, `../apps/desktop/ui/quota.mjs`. **Declared tests (8)**:

- L33 test("exact 20 canonical locales, native names, no accidental regional aliases", () => {
- L56 test("all legacy static UI labels are present in every additional locale", () => {
- L77 test("shared Settings titlebar labels cannot shadow canonical core translations", () => {
- L86 test("native catalog uses the identical seven fixed menu/title keys", () => {
- L101 test("technical semantics: Git safety, unknown values, errors and credential boundaries", () => {
- L135 test("direction and persistence are presentation-only, provider IDs stay LTR", () => {
- L147 test("dynamic Git card templates preserve placeholders and untranslated values", () => {
- L182 test("RTL locale isolates provider names, Git refs and device codes without rewriting data", () => {

### `tests/metric-refresh-layout.test.mjs`

Classification **Source contract** (preliminary); `../apps/desktop/ui/style.css`, `../apps/desktop/ui/index.html`, `../apps/desktop/ui/app.mjs`. **Declared tests (2)**:

- L15 test("a metric refresh paints an absolute indicator, never inserts flowing label content", () => {
- L32 test("manual refresh keeps fixed card and row geometry with independent metric controls", () => {

### `tests/mode-b-api-boundaries.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/github-installations.mjs`, `../apps/desktop/ui/github-monitor.mjs`, `../apps/desktop/ui/runner-collector.mjs`. **Declared tests (21)**:

- L37 test("batch 04: installations accept 100 plus a final partial page", async () => {
- L48 test("batch 04: oversized installation page is invalid before a second fetch", async () => {
- L56 test("batch 04: missing installation payload is not a verified empty inventory", async () => {
- L61 test("batch 04: forbidden account identifiers reject incomplete installation inventory", async () => {
- L71 test("batch 04: oversized repository page is invalid before a second fetch", async () => {
- L79 test("batch 04: missing repository array fails, not a known-zero scope", async () => {
- L83 test("batch 04: only exact owner/repository names can enter all-repo inventory", async () => {
- L92 test("batch 04: 100 valid repositories followed by empty page are complete", async () => {
- L101 test("batch 04: duplicate case-insensitive selection rejected before repo API", async () => {
- L110 test("batch 04: dot components and traversal selection rejected before repo API", async () => {
- L118 test("batch 04: valid mixed-case selection keeps native canonical repository name", async () => {
- L132 test("batch 04: corrupted first installation page prevents Actions collection", async () => {
- L141 test("batch 04: incomplete all-repo inventory invalidates all task derivatives", async () => {
- L185 test("batch 04: explicit selected repo stays trusted despite unrelated truncated pages", async () => {
- L201 test("batch 04: runner-only collection does not discard independent tasks", async () => {
- L211 test("batch 04: oversize runner list leaves job counts independent and known", async () => {
- L226 test("batch 04: oversize queued runs cannot create authoritative zero jobs", async () => {
- L241 test("batch 04: oversize job page cannot inflate counts", async () => {
- L257 test("batch 04: exactly 100 jobs followed by empty page produce correct queue", async () => {
- L276 test("batch 04: malformed one-repo response preserves other runner facts", async () => {
- L292 test("batch 04: provider failure text never escapes into public error", async () => {

### `tests/mode-b-billing-auth-races.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/github-billing.mjs`, `../apps/desktop/ui/ci-failure-events.mjs`. **Declared tests (22)**:

- L46 test("Mode B05: late old-account result cannot overwrite current account without explicit clear", async () => {
- L59 test("Mode B05: completing new account first cannot resurrect older cached scope", async () => {
- L74 test("Mode B05: returning to a prior key starts a new generation, not its old pending read", async () => {
- L96 test("Mode B05: same-scope parallel reads coalesce to one four-request snapshot", async () => {
- L108 test("Mode B05: explicit clear stops an earlier generation from replacing active cache", async () => {
- L130 test("Mode B05: disconnect invalidates pending and saved results", async () => {
- L144 test("Mode B05: pending previous UTC month cannot replace current-month cache", async () => {
- L167 test("Mode B05: backwards clock jump does not extend cache freshness", async () => {
- L177 test("Mode B05: exact TTL is expired, one millisecond before TTL is still fresh", async () => {
- L191 test("Mode B05: failed organization usage remains unknown, not a fictional zero", async () => {
- L208 test("Mode B05: organization path injection is rejected before requesting that route", async () => {
- L223 test("Mode B05: partial plan and usage success do not imply remaining allowance", async () => {
- L240 test("Mode B05: usage projection refuses invalid entries without rounding to zero", () => {
- L250 test("Mode B05: baseline failed observations are silent, later new failure alerts once", () => {
- L258 test("Mode B05: separate run attempts notify separately while repeat observations dedup", () => {
- L268 test("Mode B05: unreadable repository rebaselines silently and later new failures alert", () => {
- L281 test("Mode B05: account case and reordered repositories preserve notification history", () => {
- L294 test("Mode B05: switching to another account creates a fresh silent baseline", () => {
- L305 test("Mode B05: invalid second notification item cannot partially update first history", () => {
- L315 test("Mode B05: duplicate attempt within one observation is rejected without mutation", () => {
- L325 test("Mode B05: completed-run collector does not leak provider error or poison good repo", async () => {
- L340 test("Mode B05: malformed CI scopes refuse all HTTP reads", async () => {

### `tests/mode-b-monitor-edges.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/github-monitor.mjs`, `../apps/desktop/ui/github-installations.mjs`, `../apps/desktop/ui/runner-collector.mjs`, `../apps/desktop/ui/ci-failure-events.mjs`, `../apps/desktop/ui/github-errors.mjs`. **Declared tests (26)**:

- L42 test("Mode B monitor refresh: exact 15-repository boundaries never overpoll", () => {
- L56 test("Mode B installations: malformed account facts invalidate the entire selection", async () => {
- L74 test("Mode B installations: exactly full page plus final partial page is complete", async () => {
- L88 test("Mode B installations: invalid response cannot masquerade as an empty authorized list", async () => {
- L99 test("Mode B account collection: invalid selection never reaches installed repository endpoint", async () => {
- L114 test("Mode B account collection: missing selected repository never becomes an empty queue", async () => {
- L128 test("Mode B account collection: incomplete installation pages never authorize a selection", async () => {
- L146 test("Mode B account collection: matching scope passes previous state only for exact repository order", async () => {
- L177 test("Mode B account collection: runner-only 403 keeps job metrics and bounded diagnostic", async () => {
- L195 test("Mode B targeted refresh: runner failure does not poison prior known task counts", () => {
- L223 test("Mode B targeted refresh: failed tasks invalidate counts but preserve runner inventory", () => {
- L245 test("Mode B targeted refresh: different scope cannot import previous runner identities", () => {
- L262 test("Mode B runner collector: rejects all malformed scopes before the first REST call", async () => {
- L284 test("Mode B runner collector: complete empty API is authoritative zero", async () => {
- L300 test("Mode B runner collector: one full runner page without a next page is unknown", async () => {
- L319 test("Mode B runner collector: malformed workflow run ID cannot fabricate queue completeness", async () => {
- L336 test("Mode B runner collector: job-run cap preserves partial evidence but no false totals", async () => {
- L359 test("Mode B runner collector: denied jobs do not erase independently known runner capacity", async () => {
- L382 test("Mode B runner collector: targeted tasks preserve prior runner facts and clocks", async () => {
- L405 test("Mode B runner collector: targeted runners do not request workflow runs or reset task clock", async () => {
- L427 test("Mode B CI tracker: scope order change is not a different security scope", () => {
- L446 test("Mode B CI tracker: invalid second repo never partially mutates first repo history", () => {
- L465 test("Mode B CI collection: malformed response or denied repo stays isolated and redacted", async () => {
- L485 test("Mode B CI collection: invalid input is refused before issuing native REST requests", async () => {
- L497 test("Mode B GitHub errors: raw response fragments never enter user-facing status", () => {
- L507 test("Mode B failed task refresh clears all derived coverage without erasing runner state", () => {

### `tests/mode-b-mutations.test.mjs`

Classification **Source contract** (preliminary); `../apps/desktop/ui/`. **Declared tests (12)**:

- L34 test("mutation M01: malformed installation must reject, never silently disappear", () =>
- L44 test("mutation M02: contradictory GitHub installation identity must fail closed", () =>
- L54 test("mutation M03: bounded installation response rejects 101 rows", () =>
- L65 test("mutation M04: invalid runner inventory never reports confident zero", () =>
- L78 test("mutation M05: malformed jobs cannot become authoritative zero", () =>
- L91 test("mutation M06: self-hosted label wins over hosted OS labels", () =>
- L100 test("mutation M07: runner compatibility requires every requested label", () =>
- L109 test("mutation M08: billing rejects 501 usage items, not just 502", () =>
- L121 test("mutation M09: reported billing totals must be safe integers", () =>
- L134 test("mutation M10: billing cache expires exactly at TTL", () =>
- L157 test("mutation M11: impossible Gregorian UTC dates must not alert as valid runs", () =>
- L176 test("mutation M12: provider account names above native bound cannot enter UI scope", () =>

### `tests/mode-b-native-monitor-races.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/github-monitor.mjs`. **Declared tests (12)**:

- L55 test("Mode B06: disconnected auth never collects or claims a connected job snapshot", async () => {
- L67 test("Mode B06: first authorized monitor publishes loading before populated result", async () => {
- L75 test("Mode B06: malformed refresh kind cannot cause any REST or collect work", async () => {
- L84 test("Mode B06: forced requests while busy coalesce into one final full refresh", async () => {
- L102 test("Mode B06: a delayed old collector cannot publish after native disconnect", async () => {
- L116 test("Mode B06: account scope switch discards older completed result", async () => {
- L128 test("Mode B06: config event invalidates old data before new API collection completes", async () => {
- L145 test("Mode B06: native rate cooldown blocks even forced card and manual refresh", async () => {
- L163 test("Mode B06: failed GitHub collection invalidates old counts instead of keeping zero", async () => {
- L179 test("Mode B06: notification opt-out causes no completed-run HTTP requests", async () => {
- L187 test("Mode B06: opted-in CI failure tracker has silent baseline then one new alert", async () => {
- L204 test("Mode B06: a stale CI response after logout cannot emit a notification", async () => {

### `tests/mode-b-relay-protocol.test.mjs`

Classification **Runtime module** (preliminary); `../apps/relay-cloudflare/src/relay-protocol.mjs`. **Declared tests (17)**:

- L16 test("Given repository components at 100/101 characters When canonicalizing Then the exact bound is enforced", () => {
- L28 test("Given malformed nonstring repository identities When canonicalizing Then the identity is rejected", () => {
- L33 test("Given allowlists at exact count limits When parsing Then accept 100 unique entries and reject the 101st", () => {
- L43 test("Given malformed or oversized allowlist source When parsing Then reject all unauthorized scopes", () => {
- L51 test("Given exact repository and owner wildcard When authorizing Then only the intended GitHub owner passes", () => {
- L62 test("Given delivery IDs When validating Then exact UUID syntax and normalized case are required", () => {
- L70 test("Given cursor boundaries When parsing Then only safe decimal integers pass", () => {
- L83 test("Given query parameter ambiguity When parsing cursor Then reject duplicates and unknown fields", () => {
- L93 test("Given supported run transitions When validating signed content Then emit only advisory repository hints", () => {
- L106 test("Given unsupported action/status pairs and broken UTF-8 When validating Then deny all payloads", () => {
- L128 test("Given empty and maximal request bodies When bounding Then accept exact limit and reject overlimit", async () => {
- L143 test("Given invalid body limits and lying content length When bounding Then return null", async () => {
- L160 test("Given chunked upload at limit When bounding Then reject the first overflowing chunk", async () => {
- L173 test("Given bearer secret at lower and upper bounds When verifying Then require an exact match", async () => {
- L181 test("Given malformed bearer formats When verifying Then fail closed without throwing", async () => {
- L198 test("Given a source stream failing mid-read When bounding Then reject without propagating private errors", async () => {
- L211 test("Given concurrent bearer verifications When comparing Then reject every wrong credential without shared state", async () => {

### `tests/mode-b-relay-worker.test.mjs`

Classification **Controller/integration fixture** (preliminary); `../apps/relay-cloudflare/src/worker.mjs`. **Declared tests (16)**:

- L64 test("Given missing runtime bindings When any route is accessed Then return 503 without durable access", async () => {
- L85 test("Given complete runtime bindings When checking an unknown path Then return 404, not 503", async () => {
- L92 test("Given wrong HTTP methods When routing Then return 405 before durable access", async () => {
- L104 test("Given unauthorized private subscription When requesting changes Then return 401 without durable reads", async () => {
- L118 test("Given native authorization with browser Origin or Cookie When subscribing Then deny 403", async () => {
- L128 test("Given invalid change cursors When requesting Then reject before a durable read", async () => {
- L138 test("Given authenticated changes When forwarding Then bound cursor and bearer never enter a public URL", async () => {
- L154 test("Given WebSocket upgrade requests When forwarding Then enforce upgrade and native bearer", async () => {
- L170 test("Given webhook misconfiguration When ingesting Then fail 503 before verification or storage", async () => {
- L179 test("Given unauthorized or malformed webhook metadata When ingesting Then reject before durable storage", async () => {
- L194 test("Given a payload one byte over the webhook cap When receiving Then reject 413 before HMAC or DO", async () => {
- L200 test("Given a correctly signed ping When accepting Then return 204 without DO writes", async () => {
- L206 test("Given verified workflow completion When forwarding to DO Then persist only the minimal hint", async () => {
- L219 test("Given DO errors and unexpected outcomes When ingesting Then return retryable redacted 503", async () => {
- L227 test("Given Durable Object exceptions When reading private changes Then emit only redacted no-store 503", async () => {
- L234 test("Given concurrent authenticated change reads When forwarding Then preserve each independent cursor", async () => {

### `tests/mode-b-resilience.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/github-billing.mjs`, `../apps/desktop/ui/ci-failure-events.mjs`, `../apps/desktop/ui/github-installations.mjs`, `../apps/desktop/ui/github-monitor.mjs`, `../apps/desktop/ui/scan-refresh.mjs`, `../apps/desktop/ui/monitor-presentation.mjs`, `../apps/desktop/ui/runner-state.mjs`, `../apps/desktop/ui/github-errors.mjs`. **Declared tests (20)**:

- L57 test("Mode B billing: TTL-1 is cache hit and exact TTL starts a fresh read", async () => {
- L79 test("Mode B billing: crossing UTC month refreshes even before TTL expires", async () => {
- L96 test("Mode B billing: UTC year/month boundaries are independent from local timezone", () => {
- L106 test("Mode B billing: old in-flight scope cannot replace newer cached scope", async () => {
- L126 test("Mode B billing: disconnect invalidates even an already running read", async () => {
- L146 test("Mode B billing: exact 500 usage entries are valid but 501 fail closed", () => {
- L161 test("Mode B billing: a valid zero is not a known allowance or remaining balance", async () => {
- L182 test("Mode B notification tracker: provider outage rebaselines failed repo without dropping healthy state", () => {
- L208 test("Mode B notification tracker: bounded history still deduplicates newest run", () => {
- L223 test("Mode B notification collector: maxPages=1 cannot fetch a second page", async () => {
- L238 test("Mode B notification collector: one denied repository does not erase other results", async () => {
- L251 test("Mode B installations: ten full pages retain incomplete authorization evidence", async () => {
- L266 test("Mode B installations: authorized selected repo on later page remains resolvable", async () => {
- L278 test("Mode B installations: all-repos view refuses confidence at pagination ceiling", async () => {
- L290 test("Mode B presentation: provider fields cannot overwrite local Git data", () => {
- L311 test("Mode B presentation: stale Git scan changes rows, never newer monitor state", () => {
- L329 test("Mode B scan queue: one hundred overlapping invalidations require one final read", async () => {
- L353 test("Mode B runner coverage: observed empty is zero; unobserved empty is unknown", () => {
- L372 test("Mode B runner classification: unknown capacity is never invented from labels", () => {
- L380 test("Mode B GitHub failures: arbitrary provider details cannot override finite reason", () => {

### `tests/mode-b-window-layout.test.mjs`

Classification **Source contract** (preliminary); `../apps/desktop/ui/settings.html`, `../apps/desktop/ui/settings.css`, `../apps/desktop/ui/window-frame.css`, `../apps/desktop/ui/about.html`, `../apps/desktop/src-tauri/tauri.conf.json`. **Declared tests (5)**:

- L12 test("Given bounded KDE Settings height When rendering Then footer is a sibling outside the only scrollable main", () => {
- L25 test("Given short Settings viewport When laying out Then title and footer retain space while form may scroll", () => {
- L47 test("Given very long localized errors When rendering footer Then error text can wrap without shrinking buttons", () => {
- L57 test("Given themed Settings and About When drawing frame Then border never intercepts controls", () => {
- L70 test("Given fixed-size frameless windows When comparing to CSS Then no layout adds OS titlebar controls", () => {

### `tests/monitor-presentation.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/monitor-presentation.mjs`, `../apps/desktop/src-tauri/src/monitor_cache.rs`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/ui/app.mjs`. **Declared tests (5)**:

- L27 test("monitor cache presentation replaces only remote metrics, preserves local Git rows", () => {
- L38 test("late local snapshot cannot erase newer authoritative remote state", () => {
- L48 test("invalid native monitor presentation cannot modify local state", () => {
- L55 test("native cache snapshot is read-only and registered for card IPC", () => {
- L63 test("monitor events only refresh metrics; real Git events still rescan local repos", () => {

### `tests/native-drag.test.mjs`

Classification **Runtime module** (preliminary); `../apps/desktop/ui/native-drag.mjs`, `../apps/desktop/ui/app.mjs`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/src-tauri/native/wayland_relative_drag.c`. **Declared tests (5)**:

- L15 test("gesture signals native start/end without WebView coordinate motion", async () => {
- L34 test("release while start is pending always queues stop after start", async () => {
- L51 test("rapid consecutive gestures serialize native ownership of the seat", async () => {
- L77 test("native start failure does not leak a held gesture", async () => {
- L92 test("native bridge and UI must not retain old WebView movement IPC", async () => {

