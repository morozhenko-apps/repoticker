# Mode B UI inventory: remaining selectors and presentation

Source SHA `5b07a3273a27516af8ceb793f0d427a1bada964b`. Discovery, not branch-to-test proof. Files 4, functions 13, anchors 34.

### `apps/desktop/ui/settings-i18n.mjs`

Risk Medium/High (user-visible state and accessibility). Level unit/DOM contract; likely N1 N2 N6 N8 N9 N10, with N3/N5 where async effects apply. Estimated initial new-test budget 4 pending baseline reconciliation.

**Functions (1)**
- L147 `export function settingsText(language, english) {`

**Conditional/return anchors (3)**
- L148 if (typeof english !== "string") throw Error("Invalid Settings translation key");
- L149 if (settingsLocale(language) === "ru") return russian[english] ?? coreText(language, english);
- L150 return coreText(language, english);

### `apps/desktop/ui/status-metrics.mjs`

Risk Medium/High (user-visible state and accessibility). Level unit/DOM contract; likely N1 N2 N6 N8 N9 N10, with N3/N5 where async effects apply. Estimated initial new-test budget 4 pending baseline reconciliation.

**Functions (3)**
- L2 `export const shown = n => Number.isSafeInteger(n) && n >= 0 ? String(n) : "—";`
- L4 `export function compactStatus(state) {`
- L8 `const valid = n => Number.isSafeInteger(n) && n >= 0;`

**Conditional/return anchors (1)**
- L14 return {

### `apps/desktop/ui/surface-i18n.mjs`

Risk Medium/High (user-visible state and accessibility). Level unit/DOM contract; likely N1 N2 N6 N8 N9 N10, with N3/N5 where async effects apply. Estimated initial new-test budget 21 pending baseline reconciliation.

**Functions (5)**
- L57 `export function surfaceText(language, key) {`
- L64 `function isolatedValue(language, value) {`
- L68 `function translatedStatus(language, status) {`
- L83 `function translatedMessage(language, message) {`
- L98 `export function translateHoverDetails(details, language, runnerNameRows = 0) {`

**Conditional/return anchors (16)**
- L58 if (typeof key !== "string") throw Error("Invalid surface translation key");
- L59 return surfaceLocale(language) === "ru" ? (ru[key] ?? coreText(language, key)) : coreText(language, key);
- L65 return surfaceLocale(language) === "ar" && value !== "—"
- L69 if (surfaceLocale(language) === "en") return status;
- L71 if (runners) return surfaceText(language, "Runners") + " · " +
- L74 if (tasks) return surfaceText(language, "Tasks") + " · " +
- L78 if (billing) return surfaceText(language, "Actions") + " · " +
- L80 return surfaceText(language, status);
- L84 if (surfaceLocale(language) === "en") return message;
- L85 if (typeof message !== "string") return message;
- L87 if (checked) {
- L90 return surfaceText(language, "Checked") + ": " +
- L93 return surfaceText(language, message);
- L99 if (surfaceLocale(language) === "en" \|\| !details) return details;
- L106 return {
- L123 return [displayed, value];

### `apps/desktop/ui/view.mjs`

Risk Medium/High (user-visible state and accessibility). Level unit/DOM contract; likely N1 N2 N6 N8 N9 N10, with N3/N5 where async effects apply. Estimated initial new-test budget 18 pending baseline reconciliation.

**Functions (4)**
- L8 `export function nextCardView(current, requested) {`
- L14 `export function cardWindowHeight(view, repositoryCount = 0) {`
- L26 `export function pullReadyCommitCount(repositories = []) {`
- L39 `export function syncReadyCommitCount(repositories = []) {`

**Conditional/return anchors (14)**
- L9 if (!Object.hasOwn(CARD_HEIGHT, requested)) throw new Error("Unknown view");
- L10 return current === requested ? "compact" : requested;
- L15 if (!Object.hasOwn(CARD_HEIGHT, view)) throw new Error("Unknown view");
- L16 if (view !== "repos") return CARD_HEIGHT[view];
- L17 if (!Number.isSafeInteger(repositoryCount) \|\| repositoryCount < 0)
- L20 return Math.min(CARD_HEIGHT.repos, CARD_HEIGHT.compact + 18 + 35 * rows +
- L27 return repositories.reduce((count, repo) => (
- L40 return repositories.reduce((count, repo) => {
- L41 if (!repo.upstream \|\| repo.dirty) return count;
- L42 if (repo.ahead === 0 && /^behind [1-9]\d*$/.test(repo.sync_state \|\| "") &&
- L44 return count + repo.behind;
- L46 if (repo.behind === 0 && repo.sync_state === "ahead" &&
- L48 return count + repo.ahead;
- L50 return count;


## Structural artifacts requiring integration (no standalone public API)

- `apps/desktop/ui/index.html`, `settings.html`, `quota.html`, `about.html`: link targets, button IDs, focus, settings-only open link, no credential reveal, responsive footer, accessibility labels.
- `apps/desktop/ui/style.css`, `settings.css`, `quota.css`, `about.css`, `window-frame.css`: single non-intercepting frame, control dimensions, fixed footer, scrollbox and high-contrast rules. DOM/source tests cannot prove physical compositor rendering.
- `apps/desktop/src-tauri/tauri.conf.json`: window entitlement/permissions, dimensions, build output identity and Linux/Windows native acceptance in release contracts.
- `apps/desktop/ui/locale-auth.mjs` and associated pure catalogs: data parity with 20-language roster. N11 not applicable; storage-failure N12 must be tested in the native config store rather than pure UI labels.
