# Mode B: method-level Settings controller assertion receipts and remaining native gaps

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, `apps/desktop/ui/settings.mjs` blob `a61b534c28e55767ed89b198d31a0e7781196c7e` (1353 source lines), audit parent `65aa1383a999b2a0c421a37a1ea3c70b663b61b9`.

**Verified real subject evidence:** `tests/settings-github-confirm.test.mjs` blob `6e8923ffcdeeee47425e1224e1a8424ab1e8316b` contains **132 Node `test(` declarations** and directly performs dynamic `await import("../apps/desktop/ui/settings.mjs?session-" + suffix)`. Its fixture uses **the shipped `settings.html` IDs**, a mocked DOM with events/focus and injected external native `invoke`, and deterministic delayed IPC. These are **actual controller tests**, unlike source-regex-only `tests/settings-controls.test.mjs`/`settings-relay-draft.test.mjs` sections. The harness does NOT execute actual Rust AppHandle, OS Keyring or host WebView. Historical test assertions were read; no test run performed this turn.

All **43 lexical entries** for `settings.mjs` now have classifications: **41 newly mapped** below (37 `I_PARTIAL`, 3 `ADAPTER`, 1 `P`) plus 2 previously classified `LOCAL_EXPR` Boolean values at lines 808 and 842 that remain owned by `validRelayDraft`/`updateApply`.

## Exact source entries and owners

| Source line | Lexical candidate | Evidence status | Owner |
| ---: | --- | --- | --- |
| 9 | `const byId = id => document.getElementById(id);` | ADAPTER | LOCALE |
| 11 | `const t = english => settingsText(uiLocale, english);` | ADAPTER | LOCALE |
| 14 | `function applySettingsLanguage(value) {` | I_PARTIAL | LOCALE |
| 62 | `function confirmedRelayConnection() {` | I_PARTIAL | RELAY |
| 69 | `function syncWorkerControls() {` | I_PARTIAL | RELAY |
| 121 | `function applyRelayPhase(status) {` | I_PARTIAL | RELAY |
| 146 | `const invoke = (command, args = {}) => window.__TAURI__?.core?.invoke(command, args) ??` | ADAPTER | RELAY |
| 153 | `const traceStartup = stage => {` | P | RELAY |
| 168 | `function renderRelaySecretState() {` | I_PARTIAL | RELAY |
| 193 | `async function refreshRelaySecretStatus(revision = settingsRefreshRevision) {` | I_PARTIAL | RELAY |
| 246 | `async function refreshRelayConnectionStatus(revision = settingsRefreshRevision) {` | I_PARTIAL | RELAY |
| 284 | `const validRepoName = name => REPO_NAME.test(name) &&` | I_PARTIAL | REPO |
| 288 | `const sameGithubIdentity = (a, b) => typeof a === "string" &&` | I_PARTIAL | REPO |
| 290 | `const containsGithubIdentity = (items, name) =>` | I_PARTIAL | REPO |
| 292 | `function normalizeRepoDraft() {` | I_PARTIAL | REPO |
| 295 | `function updateRepoDirty() {` | I_PARTIAL | REPO |
| 300 | `function repoChoiceValid() {` | I_PARTIAL | REPO |
| 307 | `function renderRepoChoices() {` | I_PARTIAL | REPO |
| 363 | `async function refreshRepoInventory() {` | I_PARTIAL | REPO |
| 417 | `function clearMonitorScopes() {` | I_PARTIAL | REPO |
| 431 | `async function refreshMonitorScopes() {` | I_PARTIAL | REPO |
| 534 | `function stopGithubStatusUpdates() {` | I_PARTIAL | AUTH |
| 543 | `function startGithubStatusUpdates() {` | I_PARTIAL | AUTH |
| 567 | `function githubMessage(text, error = false) {` | I_PARTIAL | AUTH |
| 578 | `function githubButtons() {` | I_PARTIAL | AUTH |
| 624 | `async function refreshGithub(knownAuth = null) {` | I_PARTIAL | AUTH |
| 777 | `function message(text, error = false) {` | I_PARTIAL | FORM |
| 782 | `function validRelayUrl(value) {` | I_PARTIAL | FORM |
| 802 | `function validRelayDraft() {` | I_PARTIAL | FORM |
| 815 | `function syncConnectionAvailability() {` | I_PARTIAL | FORM |
| 821 | `function pollingNeedsRelayCleanup() {` | I_PARTIAL | FORM |
| 826 | `function isDirty() {` | I_PARTIAL | FORM |
| 840 | `function updateApply() {` | I_PARTIAL | FORM |
| 849 | `function displayRootPath(path) {` | I_PARTIAL | ROOTS |
| 860 | `function renderRoots() {` | I_PARTIAL | ROOTS |
| 888 | `function renderIgnoredChildren() {` | I_PARTIAL | ROOTS |
| 939 | `async function refresh() {` | I_PARTIAL | REFRESH |
| 1115 | `function updateLanguagePicker() {` | I_PARTIAL | LANGUAGE |
| 1122 | `function closeLanguagePicker(returnFocus = false) {` | I_PARTIAL | LANGUAGE |
| 1128 | `function openLanguagePicker(position = "selected") {` | I_PARTIAL | LANGUAGE |
| 1192 | `const cancelSettings = async () => {` | I_PARTIAL | CANCEL |

## Source-true method groups, assertion receipts and missing branches

| Owner | Lines | Existing real controller assertions | New independent branch/OS proof |
| --- | --- | --- | --- |
| LOCALE | 9, 11, 14 | Saved Russian/English/Arabic locale, draft language, Cancel and return focus. Tests: Saved Russian Settings renders native status..., Keyboard arrows wrap... | unexpected language type, empty i18n key and aria on large translated layout |
| RELAY | 62, 69, 121, 146, 153, 168, 193, 246 | Hybrid URL and password draft, stored mask, denied Keyring write, stale Relay phase/online and focus events. Tests: Inline password is staged exactly once..., Given failed postcommit Keyring status read... | all native Keyring errors through actual OS store; denied phase read + third reopen; ensure tracing stages remain allowlisted |
| REPO | 284, 288, 290, 292, 295, 300, 307, 363, 417, 431 | Scoped installations 10-page cap, 100/101 repo boundary, malformed page/duplicate/case-equivalent saved selection. Tests: Mode B Settings blocks 101..., Mode B late old-owner repository inventory... | multi-IPC torn native owner/scope, provider 403 on later page, invalid 100-char exact owner, byte/Unicode case |
| AUTH | 534, 543, 567, 578, 624 | Same-session one challenge, pending cancellation, revocation on explicit OK, old token not resurrected, bounded auth error. Tests: Mode B concurrent Connect events..., Mode B rejected device code request... | native 1.5s status timer busy/error and raw String(error) trust boundary, corrupted phase payload; actual OS wallet |
| FORM | 777, 782, 802, 815, 821, 826, 840 | Invalid HTTPS URL/password blocks Apply, unchanged config not rewritten, double OK one stage/save/commit. Tests: Hybrid validates URL..., Given concurrent OK taps... | exact hostname/port/IP/fragment boundaries, candidate 31/32/256/257, native stale post-write config |
| ROOTS | 849, 860, 888 | Draft-only roots/ignored children, Windows verbatim path display, 255 chars accepted and 101st excluded rejected. Tests: Mode B Windows verbatim roots..., Mode B native excluded-folder picker refuses the 101st... | actual filesystem permission denied/no native writes on invalid; UI focus after failed picker |
| REFRESH | 939 | Denied initial Settings config fail closed, late first read never overwrites later reopen, auth and autostart independent. Tests: Mode B late first config read..., Mode B failed Settings reopen... | three concurrent reopen generations, unreadable native config+Keyring and stale status after retry |
| LANGUAGE | 1115, 1122, 1128 | Actual custom listbox focus Home/End/ArrowDown/ArrowUp/Escape and draft-only choice. Tests: Keyboard arrows wrap..., Keyboard language choice stays a draft... | 20 locale RTL physical focus and pointer outside under WebKit/WebView2 |
| CANCEL | 1192 | Cancel revokes only provisional new auth, never prior credential; cancels pending challenge and staged Relay. Tests: Settings Cancel revokes unconfirmed..., Mode B Cancel during in-flight device challenge... | native close rejected during pending revocation and two reopens, real Keyring read/write/clear failures |

Important reading rules:
- `I_PARTIAL` means **at least one observable result of the real controller** uses this private method in a reviewed test. It is not full per-method branch coverage.
- The `ADAPTER` methods `byId`, `t` and `invoke` are private DOM/locale/native wrappers. Their behavior belongs to consuming controller tests; don't fabricate a separate public-API test for each wrapper.
- `traceStartup` at line 153 is `P`: source runs a fire-and-forget allowlisted trace stage, but a direct observable tracing/failure assertion was not confirmed in the reviewed Settings fixture; no false E credit.
- Source lines 808 `candidateValid` and 842 `authNeedsConfirmation` are **LOCAL_EXPR**, not callable functions, but their exact false/true outputs are reflected in Apply disabled/enabled checks and password 31/32/256/257 planning.
- `settings.mjs` has no independent exported domain method; Node tests still execute real private behavior by importing the top-level controller and dispatching UI events.

## High-value existing assertions that eliminate unnecessary new tests

| Existing named test (real Settings) | Actual output/assertion confirmed |
| --- | --- |
| `Mode B: concurrent Connect events issue only one native GitHub challenge` | Two click events while starting result in exactly one `github_begin` call; code is hidden until real challenge success |
| `Inline password is staged exactly once on OK and cleared before OS Keyring commit` | Native `stage` is before native `commit`, `close_settings` last; final DOM mask is fixed, not the raw value |
| `Mode B: denied monitoring-scope write preserves the current account` | Rejected `github_set_monitor_org` leaves previous owner intact, no native token revocation, dialog remains open |
| `Mode B: initial Settings config failure reports unavailable without revealing IPC detail` | Apply disabled, credential status unavailable, injected `PRIVATE_CONFIG_ERROR_DO_NOT_RENDER` not visible |
| `Mode B: late first config read cannot overwrite the newer reopened Settings form` | Newer RU/settings/roots remain, old response cannot overwrite, no unintended save |
| `Mode B: mismatched OS autostart response fails verification without claiming success` | Native acknowledged desired state different from actual → form stays open, Apply still available, no claimed success |
| `Keyboard arrows wrap, Home/End move focus, Escape restores trigger and no change is saved` | Real listbox event handlers control focus and keep language as draft only |
| `Hybrid validates URL and rejects insecure origin before Settings can persist` | Invalid HTTPS/protocol/origin cannot enable Apply; no `save_settings` called |
| `Given two focus events after a missed reopening notification When reconciling Then reload config once` | Consecutive focus events in the same session cause only one native config reload |
| `Given failed postcommit Keyring status read When clearing Relay Then do not claim successful teardown` | Even if native removal reported, failed verification keeps form open and does not falsely report full cleanup |

The test bodies above were read for those assertions, not merely deduced from their names. 132 is the number of tests in **one file**, not 132 fully independent cases across all 41 methods or proof of Stage 5 completion.

## Still unverified contract boundaries, no source change authorization

1. **Real native transaction:** simulated `stage`→`save_settings`→`commit`/remove must be reconciled with actual Rust settings file and OS Keyring. Native post-config-write/Keyring failure can produce non-atomic state; product rollback policy cannot be invented under testing mode.
2. **Native phase clock:** `startGithubStatusUpdates` uses `setInterval` and catches `github_flow_status` with `githubMessage(String(error),true)`. This is a *source-derived trust/projection concern*, not a reproduced leak; verify whether native error is bounded/redacted before a security contract change.
3. **Owner identity/case:** account selection is validated against complete GitHub App installation facts; case-equivalent saved owner should preserve the selection while malformed partial pages remain untrusted. Existing UI fake-IPC cases cover pairwise cases, not all real Rust side effects.
4. **Relay status authority:** an online WebSocket phase is not evidence that webhook delivery is functioning or that the owner possesses an authorized scoped token. Existing fake status/phase race tests do not prove hosted Cloudflare.
5. **Close/focus/Cancel:** Settings Cancel may revoke a *new provisional* GitHub authorization, not a previously authorized account. Pending asynchronous completions must not resurrect staged credentials.
6. **Security/OS testing:** effective Tauri capabilities and Windows/KDE Keyring/Native drag/autostart are physical/integration obligations; no fake DOM pass can substitute.

## Remaining Stage 9 test families after full Stage 3–8 sign-off

- ST-M1: native Rust settings commands combined with real test JsonStore and injected Keyring success/failure, write-before-event and side-effect ordering; do not touch host secrets.
- ST-M2: exact 31/32/256/257 relay password candidate, scheme/origin/IP/local/private host URL boundaries and malformed value, assert no native mutating IPC.
- ST-M3: simulated native `github_flow_status` timer rejection, bounded raw message provenance and no unsolicited credential disclosure. Timer must be controlled, not slept through.
- ST-M4: two overlapping window reopen generations, denied config + failed Keyring, last-result-wins, old Device Flow challenge not restored, no unrelated persistence.
- ST-M5: real host OS autostart and native file picker acceptance, separate from deterministic UI tests; no privileged actions in audit.
- ST-M6: actual native `github_set_monitor_org` with 0/1/100/101 selection, partial inventory failure and ETag/relay restart/notification order.

N1 malformed types/IDs/URL, N2 exact limits, N3 network native OAuth externally, N4 repeated Connect/OK, N5 config/Keyring races, N6 stale auth/draft and corrupt stored config, N7 authorization/Keyring, N8 locale/focus/time, N9 Cancel/dialog and keyboard, N10 secret masking and native redaction, N12 storage failures remain mapped as E_PARTIAL/P/OS; N11 is NA. **No method FULL and no Stage 3–8 completion declaration.**

No new test execution, mutation, production code, CI, credentials or release changes. All work is documentation-only.
