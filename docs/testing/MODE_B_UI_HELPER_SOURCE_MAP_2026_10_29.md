# Mode B client helper/state/UI surface source inventory

**Baseline:** `1de68342cea48c9a14f6e549ce2dec395cbd7df3`, 2026-10-29. GitHub content
reads of 11 source modules; 49 syntactically
named JS functions. **Stage 1–3 partial**: declarations are
candidate test artifacts, not measured coverage or an exhaustive
branch map. Closures and event handlers require manual expansion.

## Risk contracts

- CI failures: opt-in event filter, dedup of run+attempt,
  latest deployment state and no notification under missing scope.
- Deferred snapshot refresh: canceled/stale response cannot
  overwrite a newer version, no busy spin or duplicate Fetch;
  renderer handles interrupted/hidden card.
- Repository menu: validated selection, five fixed actions,
  keyboard focus return and popup bounds at 100/125/150%.
- Native drag: pointer capture, start/stop lifetime, cancellation,
  event cleanup and physical KDE/Windows detection.
- Billing hover: no unsigned/mixed scope value misrepresented
  as a known total; gross used is not remaining; provider
  identities never translated. Unicode preview truncates
  by grapheme with defined fallback and preserves true names.
- Explicit fallback/provider runner display labels: source data
  immutable, only generated fallback localized, incomplete
  coverage stays unknown.

## Function index

| Module | Risk H/M | Named declarations | Name:line |
| --- | --- | ---: | --- |
| `apps/desktop/ui/about.mjs` | M | 3 | invoke:7, paintLocale:11, refreshLocale:24 |
| `apps/desktop/ui/browser-context-menu.mjs` | M | 1 | disableBrowserContextMenu:2 |
| `apps/desktop/ui/ci-failure-events.mjs` | H | 4 | validateSelection:12, validRun:33, collectRecentCompleted:46, createCiFailureTracker:87 |
| `apps/desktop/ui/monitor-presentation.mjs` | H | 2 | mergeMonitorPresentation:4, reconcileScanPresentation:18 |
| `apps/desktop/ui/native-drag.mjs` | H | 2 | createNativeDragGesture:5, enqueue:9 |
| `apps/desktop/ui/scan-refresh.mjs` | H | 2 | createScanRefreshQueue:9, drain:18 |
| `apps/desktop/ui/quota.mjs` | M | 17 | byId:11, invoke:12, add:13, line:20, setLocale:31, paint:40, invalidateBilling:103, statusUnavailable:112, selectedOrganization:117, paintSnapshot:121, scheduleBilling:128, refresh:148, refreshMonitorOnly:188, refreshLocale:214, subscribe:226, applyHoverKind:243, onUsageShown:256 |
| `apps/desktop/ui/quota-details.mjs` | M | 13 | displayLocale:6, hasRunnerName:15, displayRunnerName:16, localCheckedTime:29, view:36, notReady:39, isHoverKind:49, runnerDetails:53, tasksDetails:65, billingDetails:87, fmt:88, buildHoverDetails:112, buildQuotaDetails:132 |
| `apps/desktop/ui/quota-size.mjs` | M | 1 | usageHeight:10 |
| `apps/desktop/ui/repo-menu.mjs` | M | 1 | placeRepoMenu:3 |
| `apps/desktop/ui/status-metrics.mjs` | M | 3 | shown:2, compactStatus:4, valid:8 |

**Next:** inspect conditionals and callbacks, map each to
Node stable tests and Positive/N1–N12, and use installed native
Windows/KDE UI testing after Mode B as approved. No test
suite run or physical acceptance is implied.
