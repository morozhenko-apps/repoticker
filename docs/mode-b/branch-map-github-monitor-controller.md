# Mode B: GitHub monitor authorization, scope transactions, refresh and cache publication

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Production `apps/desktop/ui/github-monitor.mjs`, blob `076a37b271c1186a5fb5cd2c60e45338d8ccc5af`, 470 source lines. Test bodies inspected: `tests/github-monitor.test.mjs` blob `df666c4f94a7292c53f6345cbd8fa8621a479cc3` (**30** tests), `tests/mode-b-native-monitor-races.test.mjs` blob `b9bae5fc259e9da035d877866f3d1a9b6156e146` (**12** tests), `tests/mode-b-monitor-edges.test.mjs` blob `ab8e2f268e30b8e3fd968f8adf0c526531982d22` (**26** cross-module tests), and `tests/hybrid-reconcile-schedule.test.mjs` blob `cf18776897349bb89ca7f1bd1c56797faad37ecf` (**11** real controller tests). No new suite was executed. Prepared parent `364ab28d4a16d46fc609d4ad39a629452e48cc05` on `audit/mode-b-testing`.

Tests execute real exported `startGithubMonitoring`, `collectForAccount`, `listInstalledRepositories`, `monitorRefreshDelay`, `mergeMetricGroup`, `invalidateMetricGroup`, but inject external native invoke, event, timer/clock, API transport and collector. They do **not** prove actual Tauri Rust IPC, live GitHub connectivity or physical UI delivery.

## Public collector and cache methods

| Exact function/decision | Distinct production outcomes | Executable evidence vs uncovered |
| --- | --- | --- |
| `monitorRefreshDelay` | Invalid/non-safe repository count -> default 100; count <=1 floors to 2 min; one extra minute per 15 repos, scales above 30; no actual max 7 min enforced by this helper | E exact 15-repo and high-count boundaries via `mode-b-monitor-edges`; ? negative/noninteger/huge count and direct overflow |
| `validAccountName` | ASCII 1..100 letters/digits/_.-, reject "."/"..", bad type | E `mode-b-monitor-edges` invalid installation scope; ? all 100/101-byte combinations in installed repo records |
| `listInstalledRepositories` | GET up to 10 pages ×100, reject malformed/101; accept only valid owner/full_name and selected names; exact dedup, max 100 return; complete only if all selected authorized or entire account scope fits | E `github-monitor` truncated scope, selected outside first page, denied/missing selected, and `mode-b-monitor-edges` exactly full+partial page; ? mixed-case duplicates, 10th 100 vs 100+ and corrupt nested full_name |
| `collectForAccount` installed list | Incomplete installations -> null state/reason; exact selected account or single-auto; multiple require explicit choice, none -> no accessible installation | E single/multiple/malformed/incomplete installation tests |
| `collectForAccount` selected repos | Reject wrong org/malformed >100/duplicates before installed-repo GET; missing selected => null state, never confident zero; no accessible => state null | E invalid selection no GET and revoked selected tests |
| `collectForAccount` previous reuse | Pass previous only on **case-sensitive** equal org and exact JSON repository order; otherwise null; runner collector itself does case-insensitive set matching | E matching order and different account tests; ? case-only org display change interacting with previous scope in both layers |
| `collectForAccount` partial scope | No explicit selection and >100 / pages truncated => invalidate entire tasks metrics, retain independent runner evidence and record `repositories/incomplete`; explicit subset only complete when all authorized | E truncation vs unknown, selected repository coverage/partial runner only failure |
| `collectForAccount` error report | Fixed highest severity reason and bounded message; runner-only 403 keeps known jobs but surfaces permission-specific message | E runner-only denial with jobs running=2, `githubFailureMessage` fixed value; ? multiple simultaneous error priorities |
| `mergeMetricGroup` | `all` or no previous => new; different scope => new; runners-only keeps prior jobs/coverage/clock, tasks-only keeps prior runner inventory/clock; preserve **explicit null** clock instead of falling back | E targeted merge preserves unrelated metrics, time and account isolation, explicit unknown clock |
| `invalidateMetricGroup` | absent/all => null; runners-only clears runner identity/capacity/clock, tasks-only clears jobs/lane totals+clock while retaining runner capacity; deep clone prevents touching old object | E failed tasks leaves runner inventory, failed runners leaves jobs, dynamic scope tests; ? nested unusual bad-state input structure |

## `startGithubMonitoring`: native-boundary and asynchronous branches

| Controller branch | Independent outcomes and guards | Direct evidence / open |
| --- | --- | --- |
| startup | One timer `REFRESH_MS=60s`; schedule callback, register GitHub auth/scope/config/relay/card events, request native phase snapshot, fire first authorized refresh | E `hybrid-reconcile-schedule` asserts one timer and required refresh; ? listener unavailable and timer registration failure |
| `publish` queue | Serialize `github_monitor_publish` on `publicationTail`; skip stale revision at actual dequeue; failed earlier write cannot permanently block next | E `delayed native publication cannot overwrite later disconnect`; ? native publish error followed by third scope revision |
| `invalidatePresentation` | Reset CI tracker+statuses, increment revision, clear cached counts and full-reconcile healthy, issue immediate disconnected presentation and forced refresh | E disconnect/scope/config events immediately remove old data and pending collector cannot revive it |
| `applyCooldown` | Only fixed reason rate_limited; ask native cooldown seconds, accept safe 1..86400, extend monotone maximum of current deadline; failure to query invokes onError without inventing backoff | E 429 stops timer/card/forced refresh, async cooldown old scope cannot publish; ? 0/1/86400/86401/noninteger and backward now |
| `refresh` kind | Only all/runners/tasks; invalid kind returns without native/API work | E `Mode B06: malformed refresh kind` |
| `refresh` busy | Forced during busy coalesces into rerun: same kind retained, differing kinds promoted all, deferred once; nonforced ignored | E forced requests while busy coalesce one final full refresh; ? 3-way kind order and event disconnect during busy |
| `refresh` cadence | Nonforced uses per-kind last attempts; hybrid healthy+online full every 15m, otherwise adaptive minimum; rate cooldown checked after auth even under force | E Simple every 2m, hybrid runner every 2m, full 15m, fallback force doesn't bypass cooldown |
| auth preflight | Call `github_auth_status` first; disconnected clears counts and CI status, no GitHub collection; connected first publishes Connecting before slow GET | E unauthorized no collect, first loading, late auth fail and scope switch |
| cooldown branch | Connected true, cache invalidated by targeted kind, fixed rate-limit text; no transport/collect, still runner-only vs tasks-only preserved | E 429 and active manual forced refresh denied; ? all three kinds + previously unknown null clock concurrently |
| config-only scope | `get_monitor_selection` native call rather than full Git scan; after await verify current selectionRevision | E `GitHub monitor uses config-only scope`, async scope changes discard old result |
| collect success/partial | `collect` with selected org/repositories and prior state, dynamic min interval, native cooldown check, targeted merge or invalidation, serialized publish, `lastState` after matching revision | E partial errors never replace unknown with zero; delayed old results cannot override newer auth |
| fullReconciliationHealthy | Set true only for full kind with no failure, jobs coverage true, complete scope organization and repos; partial or runner-only denied -> false | E hybrid incomplete full snapshot doesn't stretch timer, runner-only permission remains independent |
| CI read/notification trust | Only kind != runners and trustworthy jobs/scope + no global error (except all-runner permission denial); independent status refresh may run when notifications opt-out if onCiStatus exists; tracker only when enabled | E native monitor race tests for opt-out no completed-run requests and enabled silent baseline+one alert, runner-only permission error tests |
| CI async revision/limit | After completed-run read, check revision before status/notification; send <=5 alerts and recheck revision per item; native notification failure calls onError but does not block other alerts | E old CI response after logout cannot notify; ? 6+ alerts and failure on first send while other alerts delivered |
| exception | classify fixed provider failure, optionally apply cooldown, invalidate requested group and CI, publish bounded message; no stale successful counts | E offline/partial/429 errors and late failed collector rejection |
| finally | release busy, call onRefreshState(kind,false), replay latest forced rerun once; no blocking sleeps | E coalescing forced requests; ? error in onRefreshState callback and resolver rejection |
| auth event | disconnected vs connected issue distinct presentation messages, scope/config always invalidate old snapshot immediately | E disconnect/scope/config event tests |
| card event | card shown calls nonforced all refresh, rate interval and cooldown still enforced | E 429 blocks forced and card polls |

## Specific unverified trust interactions

- **Full REST × runner-only 403 × CI alert:** Source deliberately permits trusted CI despite runner inventory denial, provided jobs complete; no single exhaustive mixed-run/notification failure case verified for all state permutations.
- **Account change × publication queue × async cooldown read:** E pairwise cases exist (old scope result, delayed publication, pending cooldown). Three-way interleaving with a second offline request and CI callback requires a controlled fixture.
- **429 × wall-clock rollback:** `now()` is used to compute both `cooldownUntil` and age since lastAttempt. A backward clock jump after last attempt may keep nonforced refresh suppressed until elapsed real wall time catches up. This is a **source-derived hypothesis**, not a reproduced bug or authorization-policy decision. A fake-clock test should characterize it before any time-base change.
- **Result response with malformed nested metrics:** Source calls `invalidateMetricGroup` expecting known shape. JS fake-return contracts and Rust IPC validator are distinct; native nested-JSON acceptance is an architectural decision tracked separately under issue #25, not silently changed in testing mode.
- **Secret boundary:** JS sees native status/selected scope and REST projections, never OAuth bearer. Native publish and notification commands are fake external interfaces in these tests.

## Positive and N1–N12

| Class | Evidence and open |
| --- | --- |
| Positive | E authorized first/steady refresh, selected scope, task/runners cached merge |
| N1 | E malformed refresh kind and selected scope, incomplete response |
| N2 | E 15 repos, 100/101 limits, bounded cooldown and alerts source; ? 0/86401 seconds, >5 alerts |
| N3 | E injected denied/429/offline collector and native status error |
| N4 | E forced rerun coalescing, adaptive cadence, reconnect after fallback |
| N5 | E old account/disconnect/publish/cooldown races; ? combined 3-way pending callbacks |
| N6 | E malformed API and stale state invalidation; ? Rust cache malformed nested value |
| N7 | E no token in WebView, exact selected owner, async revision prevents stale account |
| N8 | E fake clock scheduled at exact two-minute and 15-minute boundaries; ? backward clock/DST interactions |
| N9 | E synthetic card-shown and config/disconnect events; OS/actual app shutdown ? |
| N10 | E fixed provider reason/limited status, no token in function arguments |
| N11 | NA no monetization |
| N12 | E fake native error paths; OS Keyring/store failures remain platform integration |

## Stage 9 exact additional cases (after global Stages 3–8)

- GM1: account selection 0/1/100/101, exact 100→1, 10th page 100 and malformed nested repo records; no false complete/zero, no call after malformed selection.
- GM2: explicit 3-way concurrent `github_monitor_publish` blocked + scope change + pending native cooldown reply, ensure no old scope status or alerts emitted.
- GM3: fake clock rollback after rate limit, forced vs nonforced all/tasks/runners, test expected bounded retry policy before a clock-source fix.
- GM4: 0/1/86400/86401 cooldown, malformed timer and callback exceptions, `onRefreshState` balanced on collection error.
- GM5: trusted jobs + runner 403 + 6 CI failures + native notification rejection and rapid logout; no stale/duplicate cross-scope alert.
- GM6: physical actual Tauri IPC authorization, native cache publish and OS UI; separate from JS fake test guarantees.

Mutants to kill: delete selectionRevision check, replace null with 0, reverse `all`/targeted merges, ignore GitHub rate cooldown, allow unknown hint to trigger REST, advance full safety clock on tasks, notify after logout, skip serial publish queue. Direct existing tests kill many logically; no mutation run performed.

Global Stage 3–8 PARTIAL. No code/tests/CI/cloud deployment changed.
