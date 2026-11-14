# Mode B: GitHub runner and completed CI collector method assertions

Production `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Source `apps/desktop/ui/runner-collector.mjs` blob `b34ee1f4d934166eda922ceab3de15bf19ff2714` (199 lines), and `apps/desktop/ui/ci-failure-events.mjs` blob `f78945f0b73010c1d700279413532672c8c9f7fb` (177 lines). Parent `373bb660f21a79e7197af7f7b5dc364f44f41291`. Neither module owns a GitHub bearer token or sends a notification directly; `get` is injected native transport and notification delivery belongs to the controller.

**Actual test source reviewed:** `tests/runner-collector.test.mjs` blob `fc845b159457762cd0ee8555fd139bb8e58abff4` (22 tests), `tests/ci-failure-events.test.mjs` blob `acc3c6323852ebd1ef33a872020019d54b9c6554` (19 tests), and `tests/mode-b-monitor-edges.test.mjs` blob `ab8e2f268e30b8e3fd968f8adf0c526531982d22` (26 mixed-module tests). Some real source exports have multiple asserting tests; don't add totals as distinct per-method coverage. Test bodies/source read, **no test suite executed this audit pass**.

## All 11 actual lexical candidates

| Source line | Named method/closure | Evidence | Branch/edge owner |
| --- | --- | --- | --- |
| `apps/desktop/ui/runner-collector.mjs:10` | `async function getPages(get, pathForPage, key, maxPages) {` | I_PARTIAL | GET 0/100/101 page, incomplete at cap, 403/429 independent failure |
| `apps/desktop/ui/runner-collector.mjs:22` | `async function boundedMap(items, parallel, process) {` | I_PARTIAL | bounded indexed concurrent per-repo mapping; process throw with no total misstatement |
| `apps/desktop/ui/runner-collector.mjs:41` | `function limitRequests(get, limit) {` | I_PARTIAL | global active REST cap across nested jobs and release after failed request |
| `apps/desktop/ui/runner-collector.mjs:44` | `function dispatch() {` | INLINE | private queue dispatch inside limitRequests; owner cap/failure assertions |
| `apps/desktop/ui/runner-collector.mjs:65` | `export async function collectRunnerState({` | E_PARTIAL | real collectRunnerState, owner/selection provenance, targeted runners/tasks, unknown vs zero |
| `apps/desktop/ui/runner-collector.mjs:177` | `const priorClock = (state, field) => state && Object.hasOwn(state, field)` | INLINE | private priorClock old checkedAt fallback vs explicit null in targeted refresh |
| `apps/desktop/ui/ci-failure-events.mjs:6` | `const canonicalUtc = value => {` | I_PARTIAL | exact canonical UTC timestamp, leap-day and impossible-calendar invalid input |
| `apps/desktop/ui/ci-failure-events.mjs:18` | `function validateSelection(account, repositories) {` | I_PARTIAL | owner/repo 1..100, duplicate and other-owner validation before API |
| `apps/desktop/ui/ci-failure-events.mjs:39` | `function validRun(run) {` | I_PARTIAL | run id, attempt, finite conclusion and UTC validation |
| `apps/desktop/ui/ci-failure-events.mjs:51` | `export async function collectRecentCompleted({` | E_PARTIAL | collectRecentCompleted per-repo errors and bounded concurrency/pages |
| `apps/desktop/ui/ci-failure-events.mjs:92` | `export function createCiFailureTracker({ maxRemembered = 500 } = {}) {` | E_PARTIAL | tracker silent baseline, new run attempt and dual success/failure bits, reset |

The two `INLINE` closures (`dispatch` and `priorClock`) belong to their enclosing work budget/collector. Count neither as an extra exported public method. Both E_PARTIAL exports `collectRunnerState` and `collectRecentCompleted`, and E_PARTIAL tracker factory `createCiFailureTracker`, are imported and exercised directly by existing Node tests; private helpers are I_PARTIAL through those real methods.

## Actual existing semantic/negative assertions

| Contract | Real tests and asserted outcome | Unclosed independent path |
| --- | --- | --- |
| Full/partial runner pages | `capped runner pagination cannot report a confident zero`, `Mode B runner collector: one full runner page without a next page is unknown`: cap while full -> false coverage rather than 0 | Exactly page 100 vs 101, unreadable second page after one full page |
| Jobs vs runs | `queued jobs in running workflow counted with queued workflows across repos`, `same run in both active statuses has only one jobs query`: units are jobs, run IDs dedup | Invalid run ID + duplicated malformed jobs across pages and order-independent equivalence |
| Independent permissions | `denied runner inventory keeps complete hosted job totals`, `rate-limited repo preserves independent runner inventory`: API failure in one group leaves other group's known observations | Multiple distinct repo failures and partial prior runner timestamp during account switch |
| Nested request limit | `global cap applies to all nested jobs requests across repositories`, `global cap releases failed requests without fabricating complete job counts`: count in-flight native GETs never above configured concurrency | Race after both pending+failed requests with an aborting callback, fairness and final queue drain |
| Targeted refresh | `manual runners refresh calls only runner inventory and preserves task timestamp`, `Mode B: tasks-only refresh cannot display another organization`, `case and order changes preserve same-scope task evidence` | Explicit null timestamp vs missing clock with malformed prior state; strict owner proven in actual native scope adapter |
| CI UTC/shape | `Mode B: impossible calendar dates and normalized UTC timestamps never enter CI history`, `real leap-day UTC timestamp remains accepted` | Seconds offset variants and 0000/9999 year edge, malformed Date type/object |
| Completed run collector | `Given oversized or malformed API response When reading Then no alert candidate is accepted`, `Given many repositories When reading Then concurrency stays bounded`: invalid page per-repo unavailable rather than global fake zero | 100/101 exact second page plus 429 without Retry-After on one repo, silent per-repo rebaseline |
| CI tracker | `Given first completed reads When failures predate startup Then baseline is silent`; `Given known run When a new attempt fails Then notification is distinct`; `Both mode retains distinct success/failure facts through stale API alternation` | History max 200/500/1000 eviction and atomic no mutation on invalid *later* repo input |
| Scope changes | `Mode B CI tracker: scope order change is not a different security scope` and `Given changed account ... baseline resets` | Exact Unicode/noncanonical identity rejection; locale cannot alter protected repo identities |

## Mutation and provenance limits

- Source decisions `items.length <100` vs `<=100`, 100/101 page cap, `Number.isSafeInteger(run.id)` and required `run_attempt >=1`, `canonicUtc` exact ISO, `jobCoverage` requiring all reads complete, per-repo partial isolation, and `maxRemembered` bounded FIFO are mutation-sensitive contracts. Existing tests kill many obvious mutants logically, but **no mutation runner was executed**.
- `collectRunnerState` validates selected repositories and uses a shared request limiter; **never** imply the cap applies separately per job. A native transport that denies one repository must not produce confident jobs zero.
- `createCiFailureTracker.observe` validates all successful provider snapshots **before updating history** and emits only newly observed conclusions, initially silent. An unreadable repo causes a **rebaseline on recovery**, not a replay of missed alerts.
- The two sources never receive native bearer credentials, but actual native GitHub API projection/redaction, revoked account and Keyring remain separate permission/OS integration obligations.
- Positive E_PARTIAL, N1 malformed, N2 page/run/budget, N3 errors, N4 notification duplicate, N5 nested concurrency, N6 partial histories, N7 account/owner permissions, N8 UTC, N10 no arbitrary payload retention: partly asserted; OS N9/natively observed provider failure and N12 storage are external; N11 NA. No global Stage 3–8 closure.

## Stage 9 after sign-off

`RC1` exact page and request budget with late reject; `RC2` job ID dedup, duplicate status and selection cap; `RC3` separated runner/job clocks with scope casing and malformed state; `CI1` 100/101/second-page 429 per-repo fail closed; `CI2` UTC canonical pathological values and attempts; `CI3` bounded history eviction and atomic invalid later repository; `CI4` real notification controller trust and no old account alert after logout.

No new tests, production code, CI, external GitHub calls or OS user data touched. Overall Mode B remains PARTIAL.
