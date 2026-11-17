# Mode B: repo menu geometry, Git/CI row precedence and local scan single-flight

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, named audit parent `f90d04928338f908cd4522b484eb3b1fa14c96e7`.
Sources:
- `apps/desktop/ui/repo-menu.mjs` blob `ee438b15bd49289b31b79e7c5c111fe28f528397` (19 lines), exported `placeRepoMenu`.
- `apps/desktop/ui/repo-row-indicator.mjs` blob `2ad16434ff2606c28b689ab7c809e6f735425a5e` (20 lines), exported `repoRowIndicator`.
- `apps/desktop/ui/scan-refresh.mjs` blob `f6cd5b81e67aef20db2275f7886268d2b5e14cbf` (47 lines), `shouldSpinForRepos` and `createScanRefreshQueue`.

Real Node test source bodies inspected: `tests/repo-menu.test.mjs` blob `f534d6edf62381c974d45b8020f8b29916da213c` (4 tests, 1 direct positioning), `tests/repo-row-indicator.test.mjs` blob `36317803c8a8e6273e0e0fd2617fdd4959c678a9` (4 tests, 3 direct and 1 source), `tests/scan-refresh.test.mjs` blob `315fbb4c3373628046016dc80fd4adc498e53a5c` (7 tests, 5 direct and 2 source contracts). No runtime tests executed during this documentation step. The tests' regular-expression checks of `app.mjs` do **not** execute its top-level DOM/Tauri controller (A1 remains open).

## Map of covered branches and specific remaining gaps

| Method | Actual branch/outcome | E: existing direct assertion or P: planned |
| --- | --- | --- |
| `placeRepoMenu` width | clamp menu width to drawer width minus 12px margin; X anchored against right edge and clamped to minimum 6px | E 155px normal, 600px→208px clipped, narrow drawer 120px→108px, left edge minimum 6 |
| `placeRepoMenu` vertical | prefer below when fits, else above if >=6px, otherwise clamp between 6px and lowerLimit | E middle/bottom/left cases; P exact below==lowerLimit, above==6, neither fits, undersized drawer |
| `placeRepoMenu` input trust | takes measured rects, has no numeric/finite validation; `NaN`, negative, 0×0 may produce nonsensical coordinates | Source-only hypothesis: measure with real DOM; decide whether browser geometric preconditions make these reachable before changing contract |
| `repoRowIndicator` valid tracking | only nonempty upstream plus safe nonnegative integer ahead/behind yields known Git; either >0 wins over CI | E ahead 3, behind 5, both 2/4, dirty divergent Git still displayed as Git |
| `repoRowIndicator` synchronized | both zero permits last `success`/ `failure`, otherwise unknown CI outcome shown as dash | E success/failure/null |
| `repoRowIndicator` invalid tracking | no upstream, null, negative, Infinity, string `"0"`, unsafe value -> kind unknown; no falsely clean label | E direct table; P empty upstream string, undefined repo, MAX_SAFE_INTEGER exact boundary, unsupported CI status while zero |
| `createScanRefreshQueue` constructor | scan/publish/onError/onBusyChange all callable; default onBusyChange no-op | E null scan/publish/onError TypeError; P nonfunction busy callback and absent entire input destructuring |
| `createScanRefreshQueue` same-flight | first starts scan, repeated refresh returns identical Promise and sets invalidated; **only one** scan active | E three overlapping requests, exact Promise identity and count |
| `drain` result | if invalidated, discard old result without publish and start a new scan; otherwise publish exactly latest | E three invalidations, only latest published |
| `drain` failure | suppress stale failed scan, report non-superseded failure through `onError`, recover next call | E old rejection, later success, terminal error followed by recovery |
| `onBusyChange` | true at start, false after entire chain settles, no intermediate false for invalidated scans | E direct callback state [true,false] even on final error; P onBusyChange throwing or publish/onError callback throwing |
| `shouldSpinForRepos` | spinner only active AND no cached snapshot; a refresh after first cache does not cause spinner | E exact 4-way Boolean truth table |
| Main card integration | exactly one `get_snapshot` call in `app.mjs` and `refreshMonitor` uses `github_monitor_snapshot`; repo menu DOM outside clipped rows | **S static source contracts**; A1 needs executable actual DOM/UI/Tauri event tests |

## Independent interaction / mutation cases

- **SC1**: `refresh` invalidated during a scan, with next request failure and still another pending invalidation, should publish only final state or report only terminal failure. Use deferred Promises and explicit microtask drain; existing tests prove two-stage paths.
- **SC2**: `publish` or `onError` throws after a settled native request. Current `drain` catch may route a thrown `publish` error through `onError`. This is **source-derived behavior** and should be characterized, not silently fixed or classified as provider failure.
- **SC3**: `onBusyChange(true)` throws before `active` is set. Source does not catch this; an unhandled DOM callback error is not a Git scan failure. Define callback failure contract before modifying production.
- **RM1**: drawer smaller than 12px and menu taller than drawer, NaN/Infinity geometry; characterize browser input constraints before requiring universal finite output.
- **RI1**: exact MAX safe count and duplicate CI update with unchanged Git tracking; never turn a dirty/unknown branch into safe sync eligibility.
- **UI-A1**: actual `app.mjs` full controller click/mouse/keyboard events, changing repository state during an inflight scan; not proven by source regex tests.

## Positive / N1–N12

| Class | E / P |
| --- | --- |
| Positive | E real positioning, Git-over-CI row priority, overlapping scans and spinner |
| N1 | E malformed Git counts / null callbacks; P invalid geometry and malformed busy callback |
| N2 | E 120px/600px/menu clamps; P exact vertical boundaries and MAX safe |
| N3 | E injected scan rejection, later recovery; no network in subject |
| N4 | E repeated refresh coalescence and explicit retry |
| N5 | E multi-request invalidation + stale result; P nested callback failures |
| N6 | E unknown Git tracking, no false zero; cached snapshot spinner |
| N7 | E no unsafe Git row from source; actual actions and native permission separate |
| N8 | NA pure geometry/queue has no locale/time; translated menu size covered via width fixture |
| N9 | E synthetic click/source menu contracts, physical focus/drag/scroll remains OS |
| N10 | E user-facing Git status derived only from safe counts, arbitrary native error redaction external |
| N11 | NA no entitlements |
| N12 | E failed external scan, disk access/permissions failure injected at boundary |

## Stage 9 executable additions after global Stage 3–8

- RM-T1 direct geometry exact below/above/clamp boundaries and very small viewport; assert finite values only where input contracts guarantee finite rects.
- RI-T1 direct `repoRowIndicator` exhaustive boundary table 0/1/MAX/MAX+1, malformed/null, all CI conclusions and upstream presence.
- SC-T1 single-flight every callback failure/interleaving and no busy flag stranded, using real `createScanRefreshQueue` and deferred controlled external scans.
- A1-T1 real imported `app.mjs` DOM+Tauri integration for repo-menu focus, event action and no duplicate full snapshot; do not claim source regex sufficient.

Mutation targets: remove invalidation branch, make old scan publish, spin on cached refresh, accept string Git counts, suppress CI under known clean branch, position menu outside drawer. No mutation run performed. Mode B Stage 3–8 PARTIAL.
