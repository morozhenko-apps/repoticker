# Mode B: Quota hover and GitHub Actions billing method assertions

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Actual sources `apps/desktop/ui/quota-details.mjs` blob `d9f67bba06d11eefaf326c501fc5942a4f69d4cf` (135 lines), `apps/desktop/ui/github-billing.mjs` blob `b976af815accd1fcab79b7c7ddbdbc96cb8bddd6` (175 lines); audit parent `749bf0b13824f077c623c8cde317caa5ee96f5d9`.

**All 24 remaining lexical entries** (13 Quota, 11 Billing) now have owners: E_PARTIAL exported real helper calls, I_PARTIAL internal helpers exercised through actual model/presenter test, one INLINE `fmt` nested in billingDetails. These are **existing Node assertions**, not executed during this pass and not 100% coverage.

Reviewed real test bodies: `tests/quota-details.test.mjs` blob `d90673d3a1d6bc7f9d05b817d51dac49e874d070` (8 tests), `tests/locale-counts-and-notifications.test.mjs` (5 tests), `tests/surface-i18n.test.mjs` (9 tests), `tests/github-billing.test.mjs` blob `a2699124eb8f0a2920a33612937d857957c796c2` (14 tests). The 14 billing tests call real `billingMonth`, both allowance functions, `reportedActionsMinutes`, `collectBillingUsage` and `createBillingCache` with a fake external native GET and controlled clock. They do not directly execute a Tauri Keyring/API command.

## Exact method receipts

| Source:line | Function/closure | Evidence |
| --- | --- | --- |
| `apps/desktop/ui/quota-details.mjs:6` | `function displayLocale(language) {` | I_PARTIAL |
| `apps/desktop/ui/quota-details.mjs:15` | `const hasRunnerName = value => typeof value === "string" && Boolean(value.trim());` | I_PARTIAL |
| `apps/desktop/ui/quota-details.mjs:16` | `export function displayRunnerName(value) {` | E_PARTIAL |
| `apps/desktop/ui/quota-details.mjs:29` | `export function localCheckedTime(value, timeZone, language = "en") {` | E_PARTIAL |
| `apps/desktop/ui/quota-details.mjs:36` | `const view = (status, sections, message = "") => ({` | I_PARTIAL |
| `apps/desktop/ui/quota-details.mjs:39` | `const notReady = (authorized, topic, reason) => ({` | I_PARTIAL |
| `apps/desktop/ui/quota-details.mjs:49` | `export function isHoverKind(kind) {` | I_PARTIAL |
| `apps/desktop/ui/quota-details.mjs:53` | `function runnerDetails(state) {` | I_PARTIAL |
| `apps/desktop/ui/quota-details.mjs:65` | `function tasksDetails(state) {` | I_PARTIAL |
| `apps/desktop/ui/quota-details.mjs:87` | `function billingDetails(billing = null, language = "en") {` | I_PARTIAL |
| `apps/desktop/ui/quota-details.mjs:88` | `const fmt = value => Number.isFinite(value) && value >= 0` | INLINE |
| `apps/desktop/ui/quota-details.mjs:112` | `export function buildHoverDetails(state, kind = "billing", authorized = false, statusMessage = null, billing = null, language = "en") {` | E_PARTIAL |
| `apps/desktop/ui/quota-details.mjs:132` | `export function buildQuotaDetails(state, authorized = false, statusMessage = null, billing = null) {` | E_PARTIAL |
| `apps/desktop/ui/github-billing.mjs:8` | `export function billingMonth(now = new Date()) {` | E_PARTIAL |
| `apps/desktop/ui/github-billing.mjs:14` | `export function knownPersonalAllowance(plan) {` | E_PARTIAL |
| `apps/desktop/ui/github-billing.mjs:25` | `export function knownOrganizationAllowance(plan) {` | E_PARTIAL |
| `apps/desktop/ui/github-billing.mjs:33` | `export function reportedActionsMinutes(payload) {` | E_PARTIAL |
| `apps/desktop/ui/github-billing.mjs:49` | `const unavailable = reason => ({` | I_PARTIAL |
| `apps/desktop/ui/github-billing.mjs:54` | `export async function collectBillingUsage({ get, organization, now = new Date() }) {` | E_PARTIAL |
| `apps/desktop/ui/github-billing.mjs:60` | `async function fetchOrganization() {` | I_PARTIAL |
| `apps/desktop/ui/github-billing.mjs:91` | `async function fetchPersonal() {` | I_PARTIAL |
| `apps/desktop/ui/github-billing.mjs:121` | `export function createBillingCache({ get, now = () => Date.now(),` | E_PARTIAL |
| `apps/desktop/ui/github-billing.mjs:130` | `function clear() {` | I_PARTIAL |
| `apps/desktop/ui/github-billing.mjs:136` | `async function load(organization, connected) {` | I_PARTIAL |

## Existing assertion credits, distinct from open cases

- **Quota exact confidence:** authorized but unavailable runner state is `Runners unavailable`, not a false disconnected account; `Checking GitHub connection...` and `Connecting to GitHub...` produce finite Connecting, not a fake zero. `runnerDetails` calls `compactStatus`, `tasksDetails` respects independent jobs/runners coverage; malformed or stale `state.runners` cannot be treated as confirmed inventory when coverage is false.
- **Unicode and identity:** `displayRunnerName` clips at 38 grapheme clusters preserving emoji ZWJ and combining marks, with synthetic fallback `Unnamed runner` distinguished from provider origin metadata. This is **display-only**; never normalize actual GitHub runner ID/name in persisted model to presentation text.
- **Billing semantics:** published plan allowances only for known personal Free=2000, Pro=3000 and org Free=2000, Team=3000. Usage quantities are gross SKU minutes; `remaining` is always null, not inferred as allowance-minus-gross. Tests reject malformed SKU, 501+ entries, negative/unsafe accumulated quantity. A separate provider permission denial can leave known organization plan or personal allowance intact without inventing consumption.
- **Billing cache:** real `createBillingCache` tests coalesce identical reads, isolate old organization responses, reject cached data after scope switch/disconnect, refresh at TTL and after **backward wall-clock reversal**. This differs from GitHub Monitor timer, whose rollback remains a separate hypothesis; do not mark it covered from Billing tests.
- **Quota timestamps and RTL:** `localCheckedTime` is directly invoked in locale-counts test, maps pt/zh-Hant/fil to appropriate Intl locales, displays finite time or Unknown. Native popup height/interactive pointer behavior belongs Quota controller and KDE/Windows physical tests, not pure hover models.

## Outstanding independent Stage 9 scenarios

1. `QD1` displayRunnerName if `Intl.Segmenter` unavailable; exact Unicode fallback with 38 vs 39 code points, no mutation of model identity. `QD2` invalid timeZone should be characterized (source Intl may throw RangeError), DST, invalid locale and split `checkedAtRunners`/Tasks versus legacy `checkedAt`, ensure no stale confidence.
2. `QD3` wrong kind returns finite Unknown, complete direct runner count matrix (malformed nested counts, online/offline partial) and correct runningJob runner_id matching including zero/safe bound. `QD4` billing month regex 00/01/12/13, null/NaN/Gross values, precise locale formatting and provider-looking text; textContent in Quota DOM required.
3. `GB1` exact `reportedActionsMinutes` list 0/1/500/501; additive fractional near MAX_SAFE_INTEGER, malformed SKU/account, negative/NaN/Infinity; no free allowance claim. `GB2` permission 401/403/429 to plan vs usage independently, invalid org/login, malformed plan, empty month and API URL exact.
4. `GB3` concurrent pending billing read after reconnect/scope switch, TTL boundary and clock rollback, repeated error cache backoff, read *only* selected authorized organization. Existing tests cover major branches; add only independent unasserted cases.
5. `Q3` actual detached Quota controller callbacks `repoticker-usage-shown` / `__repotickerSetHoverKind` remain missing even though model tests pass. Never infer native popup authority from pure Billing/Quota model results.

Positive/N1 malformed, N2 0/max, N3 rate/permission, N4 repeat/TTL, N5 stale async owner, N6 partial data, N7 identity/authorization, N8 locale/clock, N9 physical pointer external, N10 name/diagnostic privacy apply; N11 and native storage N12 NA for pure helpers. No tests/build/CI/OS commands run, no source modification. Global Stage 3–8 PARTIAL.
