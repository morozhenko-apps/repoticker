# Mode B method assertions: local Git UI, single-flight scans, drawer and row priority

Production source unchanged at `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; parent `5ae786010e3a8d04153c7a662547ffc50ba56f55`. Four actual modules with **10 lexical named candidates**:
- `apps/desktop/ui/scan-refresh.mjs` blob `f6cd5b81e67aef20db2275f7886268d2b5e14cbf`: 3 candidates, 2 exported functions and one private `drain`.
- `apps/desktop/ui/view.mjs` blob `d6214720f834bacb5f2d2edd58ba79e9e538a815`: 4 exported functions.
- `apps/desktop/ui/repo-menu.mjs` blob `ee438b15bd49289b31b79e7c5c111fe28f528397`: 1 exported function.
- `apps/desktop/ui/repo-row-indicator.mjs` blob `2ad16434ff2606c28b689ab7c809e6f735425a5e`: 1 exported function and one inline private predicate.

Evidence inspected in real Node test bodies, **not executed this turn**:
`tests/scan-refresh.test.mjs` blob `315fbb4c3373628046016dc80fd4adc498e53a5c` (7 mixed tests), `tests/mode-b-resilience.test.mjs` (100 overlapping invalidations), `tests/ui-layout.test.mjs` blob `342186d1809b9774413390159d0f4088642ad10b` (view/legacy pull direct + source), `tests/safe-sync-manual-refresh.test.mjs` blob `d371a12ecc0f6bee5c44f90c723bb8557982d217` (real sync count), `tests/repo-menu.test.mjs` blob `f534d6edf62381c974d45b8020f8b29916da213c` (real geometry + app source), `tests/repo-row-indicator.test.mjs` blob `36317803c8a8e6273e0e0fd2617fdd4959c678a9` (3 real and one static).

## Ten exact lexical method candidates

| Source line | Subject / owner | Classification | Direct assertion from existing tests | Remaining independent branch |
| ---: | --- | --- | --- | --- |
| `scan-refresh` 10 | `shouldSpinForRepos` | E_PARTIAL | `Repos spinner is reserved for uncached first snapshot`: all 4 Boolean pairs, only active+uncached→true | Coercion/truthy non-Boolean inputs, no real DOM spinner animation |
| `scan-refresh` 14 | `createScanRefreshQueue` | E_PARTIAL | `overlapping full scans coalesce and never publish a superseded result`: 3 overlapping calls same Promise, one scan, trailing latest publishes; `scan queue rejects absent callbacks`: null callbacks throw TypeError | Nonfunction optional busy callback, callback throw fault policy, simultaneous 100 invalidations already tested elsewhere |
| `scan-refresh` 23 | `drain` | I_PARTIAL, private async nested method | `superseded read failures do not hide later success`, `busy indicator tracks entire coalesced local scan`: stale failure suppressed, terminal error visible, [true,false] around entire chain | `publish` callback throws, `onError` throws, second invalidation during failed continuation, no busy state stranded |
| `view` 8 | `nextCardView` | E_PARTIAL | `repeating Repos collapses to compact`: compact↔repos and settings↔settings; `constructor` rejected through `Object.hasOwn` | null/object request, invalid current valid requested and unknown key, no actual window resize/focus |
| `view` 14 | `cardWindowHeight` | E_PARTIAL | `cardWindowHeight("repos") > cardWindowHeight("compact")` | exact 0/1/9/10/11, negatives/nonint, MAX, cap 510 and invalid view; source-derived formulas, no full direct table |
| `view` 26 | `pullReadyCommitCount` | E_PARTIAL | `only clean, behind and upstream tracking repos activate safe pull`: behind=4 yes; dirty, ahead, no upstream, unfinished, diverged, 0/-1 behind all zero | string/Infinity/unsafe behind, many-repo accumulation >MAX, malformed null row |
| `view` 39 | `syncReadyCommitCount` | E_PARTIAL | `Safe sync eligibility accepts strictly ahead or behind but rejects unsafe repos`: ahead 4 and behind 2, dirty, detached, diverged, operation and current rejected | inconsistent `sync_state` vs numeric ahead/behind, nonarray/corrupt row, sum >MAX |
| `repo-menu` 3 | `placeRepoMenu` | E_PARTIAL | `menu stays within drawer and flips above lower scroll rows`: 370×370 drawer with 155×120 menu, left 6 margin; `long translated ...`: width 600→208 in 220 drawer | exact below==lower bound, above==6 and neither fit; NaN/nonfinite measured rects (physical preconditions first) |
| `repo-row-indicator` 3 | `repoRowIndicator` | E_PARTIAL | `per-repo Git ahead/behind takes priority over any CI result`: ↑3, ↓5, ↑2 ↓4; `only known synchronized ... last CI`: ✓/✕/—; unknown tracking refuses Git/CI false certainty | MAX safe exact, undefined repo, empty upstream, unsupported CI conclusion, combined invalid conditions |
| `repo-row-indicator` 4 | `valid(value)` | INLINE, private predicate owned by `repoRowIndicator` | Existing direct unknown tracking tests reject null, -1, Infinity, string "0", unsafe MAX+1; not its own exported method | Include exact boundary checks in row-indicator table; no separate public contract |

## Domain differences that must not be "fixed" for test conformity

- The `repoRowIndicator` shows local divergence even when dirty; it does **not** authorize Safe Sync. The `syncReadyCommitCount` pure helper applies a stricter eligibility contract. Test each domain independently.
- `pullReadyCommitCount` is legacy **pull-only** (behind), while `syncReadyCommitCount` includes strictly safe ahead and behind. A repo with an unsafe operation does not become eligible merely because row arrows are displayed.
- `createScanRefreshQueue` owns the sole *full local Git scan*; `refreshMonitor` uses a separate native `github_monitor_snapshot` call. Existing source regexp tests assert there is one `get_snapshot` call in `app.mjs`, but that is **not** live controller A1 integration.
- `drain` catches errors from the `scan` await and from `publish`; a thrown `publish` may be routed to `onError` as if a scan failed. This is **source-derived behavior**, not yet a reproduced failure. Establish callback exception contract before modifying production.
- Geometry input comes from browser-measured rectangles. Do not mark arbitrary NaN as a confirmed user-visible menu defect without a demonstrable browser/DOM precondition.
- A sum of individually safe commit counts may exceed JS's safe integer bound in `view.mjs`, whose `reduce` has no terminal range guard. This is a boundary characterization candidate, not proof of a real repository portfolio that large.

## Positive/N1–N12 and planned Stage 9 cases

- Positive E_PARTIAL across all 8 exported functions and the two internal owner paths; the `valid` predicate is INLINE, not another domain test. **More precisely: 2 scan exports + 4 view exports + 1 menu export + 1 indicator export = 8**, and one private drain plus one inline valid = 10 lexical candidates.
- N1 malformed callbacks/rows/rects, N2 safe integer and geometric boundaries, N4 refresh coalescing, N5 concurrent scans and native drag overlap, N6 unknown tracking, N7 Safe Sync fail-closed, N9 physical focus/scroll; N3 failed external scan already injected, N8 UI translation dimension separate, N10 native error redaction separate; N11 NA. N12 disk/permissions exception via injected scan, no live host installation.
- `SC-T1` bounded callback-error table (`scan`, `publish`, `onError`, `onBusyChange`) and guaranteed busy transitions where the callback contract permits; `RM-T1` drawer exact thresholds; `VW-T1` view height/sync boundaries; `RI-T1` last CI outcome unknown vs valid Git. `A1-T1` real `app.mjs` imported DOM/Tauri event behavior later, distinct from source text checks.

No mutations or suites executed, no source/test/CI changes. All ten entries now have an evidence owner but none is fully signed off across negative categories; overall Stage 3–8 PARTIAL.
