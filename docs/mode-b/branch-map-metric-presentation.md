# Mode B: compact metric confidence and stale Git/remote presentation merge

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; parent `c491f28956d12e982286f9435d25d563bd5903e2`, named branch `audit/mode-b-testing`.
Subjects:
- `apps/desktop/ui/status-metrics.mjs` blob `ef5f46f111fe22503863f58f072db78c63ba4537`, 21 source lines, `shown` and `compactStatus`; **real `app.mjs` imports `compactStatus` at line 4 and calls it during initial state and `renderMonitorMetrics`**.
- `apps/desktop/ui/monitor-presentation.mjs` blob `2b3689bec1975d8a3ca9503d2410aec92d6499c9`, 21 source lines, `mergeMonitorPresentation` and `reconcileScanPresentation`.

Direct test `tests/monitor-presentation.test.mjs` blob `da3bcd051fcd91752463ccb430702efe3753e523` (**five Node tests**, three call the real presentation methods; two only inspect Rust/app source). Also `tests/mode-b-resilience.test.mjs` contains direct presentation reconciliation tests with an injected stale scan. `tests/card-i18n.test.mjs` verifies accessible metric labels and scans `app.mjs` source ordering, while `tests/ui.test.mjs` imports `model.mjs`, **not `compactStatus`**. No directly executed `compactStatus` test was found in the reviewed relevant suites; this is a **reviewed-source gap, not proof no other repository test exists**. No test suites were run this turn.

## Actual tested monitor presentation branches

| Method/decision | Direct assertions and missing |
| --- | --- |
| `mergeMonitorPresentation(local, remote)` admission | E invalid null, {}, `connected:null` and missing `monitor_message` each throw; do not mutate local |
| remote field allowlist | E only `connected`, `runner_state` and `monitor_message` overwrite local; roots, repositories and errors maintain strict object identity of local inputs |
| valid remote `connected` | E true success with nested runner state/observed queue, null message |
| `reconcileScanPresentation(next,current,before,after)` no intervening monitor revision | E `before==after==0` returns exact `next` object, no remote merge |
| revision changed while scan in flight | E before=0 after=1 returns stale scan's new Git repositories while retaining current authoritative remote state |
| Event semantics | S static test: `repoticker-monitor-updated` etc call `refreshMonitor` not `refresh`, `github_monitor_snapshot` is native cache read. This does not execute `app.mjs` event handlers (A1 open) |
| nested `runner_state` schema | **Not validated** by `mergeMonitorPresentation` itself, only required as present. It is a display merge, not a trust sanitization API. NM1 native nested validation policy remains architectural STOP FACTOR |

## `shown` and `compactStatus`: independently testable branches

| Exact source branch | Expected value semantics | Evidence status |
| --- | --- | --- |
| `shown(n)` | Number.isSafeInteger AND n>=0 -> String(n). Undefined, null, negative, fractional, NaN, Infinity, unsafe integer -> em dash | S source and shared product rules; ? direct `shown` table |
| `state?.counts` absent | no confidence, five metric strings all em dash | S source; ? actual method test from imported module |
| covered runners | only `coverage.runners === true` authorizes runner totals; false/undefined/null do **not** become zero | S source; ? false/numeric 1/true table |
| `total` | only if busy,idle,offline each nonnegative safe integer; sum of three; final `shown(total)` also rejects **unsafe sum**, even if each summand is individually safe | S; ? MAX_SAFE_INTEGER+1 overflow and mixed-invalid inputs |
| `online` | when coverage.runners true and busy/idle valid, sum two, **without requiring valid offline** | S; ? offline malformed while online remains known and total unknown |
| `offline` | when covered, require only offline valid; busy/idle invalid do not erase known offline count | S; ? independent confidence under malformed two other metrics |
| jobs coverage | only `coverage.jobs === true`; running and queued checked independently via `shown` | S; ? one valid 0 and one unknown under partial coverage |
| independence | runner coverage false while jobs true still shows known running/queued; jobs false while runners true retains known total/online/offline | S product policy, real `runner-state`/collector tests support data origin; ? exact compactStatus output |
| source failure | no I/O, pure presentation; missing state never fabricates zero, no mutation of original state | S; ? runtime input frozen/state mutation test |

## Important interaction boundaries

- **Unknown is not zero:** compact strip's visual em dash is an intentional explicit unknown sentinel; a confident `0` only occurs after the corresponding group coverage and valid numeric fact.
- **A partial runner cache can contain observed jobs and known/unknown independently.** Caller must not fill missing values with 0 just because the GitHub API returned an empty page while pagination was incomplete.
- **Large count overflow:** a sum of individually valid safe integers can become unsafe, but `shown(sum)` will replace it with an em dash. This prevents displaying misleading rounded JavaScript values, but is currently a source-derived path requiring direct test.
- **Strict nested data ownership:** `mergeMonitorPresentation` does not validate `runner_state` nested unknown fields and must not be treated as a security sanitizer. NM1 trust policy needs explicit architecture decision before production IPC changes.
- **No extra Git scan on monitor event:** helper merge tests alone cannot prove the real main-card event path, which remains A1 controller gap.

## Positive / N1–N12

| Class | Existing direct evidence / missing |
| --- | --- |
| Positive | E real monitor presentation merge+stale revision; compactStatus source-only in reviewed suites |
| N1 | E malformed outer remote shape; ? malformed nested counts and invalid compact state |
| N2 | ? 0/1/MAX safe count, sum overflow and one-known/one-unknown |
| N3 | NA pure functions; provider network belongs to collector |
| N4 | E revision unchanged returns original next; repeated identical remote merge idempotence ? |
| N5 | E late local snapshot with newer monitor revision retains remote facts, ? three independent overlapping revisions |
| N6 | E unknown outer field rejected, partial coverage imported from collector, compact output ? |
| N7 | E merges allowlist only local repositories unchanged; NM1 unknown nested fields architectural |
| N8 | NA no time/locale conversions in these methods |
| N9 | UI actual DOM labels/aria not exercised by these pure helpers |
| N10 | S pure functions do not log or stringify provider exception, native error rendering separate |
| N11 | NA |
| N12 | NA no storage/side effects |

## Stage 9 mutation-sensitive direct tests

- MP1: `compactStatus(null)` and coverage false/numeric 1/undefined table, assert five exact em dashes.
- MP2: covered runners counts (0, 1, MAX), offline invalid while online valid; test field-wise independence and unsafe sum rejection.
- MP3: jobs coverage true with running 0/queued null; runners coverage false and jobs true; never fabricate unknown zero.
- MP4: merge remote outer shape missing required property, but extra remote fields cannot overwrite local roots/repositories/errors; input frozen.
- MP5: three deferred actual `app.mjs` controller snapshot/scan events in reverse order; no extra Git discovery, DOM/aria matches `compactStatus` output under account switch (A1).
- MP6: decide native nested monitor object allowlist/security contract under NM1 before changing production schema.

Mutants: `coverage.runners !== false`, `Number.isInteger` instead of safe, fill unknown with 0, sum overflow as text, allow remote repositories overwrite, ignore revision, trigger full Git scan for monitor-only event. No mutation engine or suite run, Stage 3–8 global PARTIAL.
