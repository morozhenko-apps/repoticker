# Mode B method assertions: compact status truth projection

Verified unchanged production `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Source `apps/desktop/ui/status-metrics.mjs` blob `ef5f46f111fe22503863f58f072db78c63ba4537` (21 executable/source lines). Audit parent `08084db449b0c56812be92d835d178914a4981c1`. This is the first **method-level E/I/P classification**, not an executable test or Stage 3–8 global sign-off.

**Evidence legend:** E = the named real subject is directly called and an output asserted in inspected test body; I = source is executed **indirectly via real consumer** and relevant output asserted; P = a distinct method branch is source-derived and has no matching inspected direct assertion; INLINE = lexical entry is part of its enclosing method and should **not** be counted as a separate public API; S = source/static expectation only. E/I always **PARTIAL** unless every meaningful independent branch is closed. No test executed in this audit turn.

## Method-level reconciliation (exact 3 lexical entries)

| Source line and function | Discovery classification | Real executable assertion already reviewed | Outstanding independent branch P |
| --- | --- | --- | --- |
| 2 `shown(n)` | Exported arrow, **I_PARTIAL** | `tests/quota-details.test.mjs` and `tests/hover-fallback.test.mjs` invoke real `buildHoverDetails` which calls `shown`; known runner/job 0/1 and unavailable metrics are projected to decimal/dash | Direct table: undefined/null, false, string "0", -1, 0, 1, MAX_SAFE_INTEGER, MAX+1, fractional, NaN, ±Infinity; assert exact text and mutation-sensitive guard |
| 4 `compactStatus(state)` | Exported function, **I_PARTIAL** | `tests/hover-fallback.test.mjs` "rich panel projects runner and task information": real runner hover with covered busy=2, idle=1, offline=1 expects "Runners · 4", "Online"="3"; task read uses real `shown`. `tests/quota-details.test.mjs` "unavailable runner statistics..." covers unavailable state through consumer | Direct complete truth table of every covered/uncovered runners/jobs combination, independent offline vs online/total, malformed nested counts, large valid operands with **unsafe aggregate sum**, full output object |
| 8 `valid(n)` closure | **INLINE** private predicate owned by `compactStatus` line 4 | Not a separate exported method. Branch is exercised via `compactStatus` runner counts, so don't invent an independent test count or API | Include its predicate true/false cases in `compactStatus` direct table |

## Source-exact executable branches to close

| Branch ID | Input condition | Expected source result | Existing evidence |
| --- | --- | --- | --- |
| SM-01 | `shown` with one finite nonnegative safe integer | Decimal String | I, known 0/1/2/4 |
| SM-02 | `shown` with invalid/unsafe/negative/fractional | "—" | I for unavailable null; P for full falsy/numeric boundaries |
| SM-03 | `state` null or `counts` missing; coverage absent | `{total,online,offline,running,queued}` all "—" | P direct, no falsely confident zeros |
| SM-04 | `coverage.runners !== true` but jobs are covered | three runner fields unknown, running and queued independently known if valid | P direct |
| SM-05 | `coverage.jobs !== true` but runners covered | jobs unknown, runner subset computed independently | P direct |
| SM-06 | runners covered; busy/idle/offline all valid | total=sum of three, online=sum of two, offline=raw | I covered example 2+1+1 |
| SM-07 | runners covered, offline invalid while busy/idle valid | online known, total/offline unknown | P |
| SM-08 | runners covered, busy invalid while offline valid | offline known, total/online unknown | P |
| SM-09 | each operand safe but aggregate > MAX_SAFE_INTEGER | `shown(sum)` yields unknown, even though individual counts valid | P; pure source guard, no executed failure claimed |
| SM-10 | jobs covered and one count invalid (other valid) | per-field independent known/unknown | P |
| SM-11 | coverage field literal 1 or "true" instead of true | unknown for that group | P strict Boolean |
| SM-12 | freeze input; invoke status helper | no mutation, deterministic output | P explicit immutability assertion |

## Actual Stage 9 planned table, **not implemented yet**

`SM-T1` direct `import {shown, compactStatus}` tests real functions with 12 `shown` inputs and fully asserted five-field status objects. `SM-T2` coverage truth table (runners/jobs true/false/undefined/numeric), missing nested structures. `SM-T3` permutation of invalid busy/idle/offline and running/queued, exact known-vs-unknown independence. `SM-T4` MAX_SAFE_INTEGER positive and unsafe sum, immutable frozen input.

Do **not** replace `compactStatus` with a fake callback in the tests. Do not call `0` a verified source value without `coverage===true`. No production change or security decision required to test current behavior.

## Negative-category mapping and interactions

- Positive: I_PARTIAL (real consumer 2+1+1, tasks 2/1).
- N1 missing/invalid/unsafe input, N2 bounds: P direct.
- N3 external HTTP and N12 storage: NA for pure projection.
- N4 deterministic repeated projection, N6 absent/partial data, N7 coverage/authority gate: P.
- N5 race: NA in these pure helpers; on-disk/native concurrent monitor data belongs `github-monitor.mjs`/Quota.
- N8 no locale or clock internal; N9 actual aria/DOM card still A1, N10 no raw exception projection, N11 no entitlements.
- Cross-component: Quota consumes this function while `app.mjs` renders compact metrics. The **same authoritative runner/job confidence invariant** must be checked under A1 main-card DOM, not inferred from this consumer test.

**Status:** three lexical candidates classified (2 real exports + 1 private inline). No method FULL, no Stage 3–8 sign-off. File-level Positive/N1–N12 cells remain intentionally `?` where exhaustive direct evidence is missing.
