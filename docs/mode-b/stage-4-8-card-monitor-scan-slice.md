# Mode B Stage 4–8: main-card, native monitor and local-scan race closure slice

**MODE B, evidence planning only.** Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; exact current audit parent `9ce7ed14b668d957ba446a0bbddd30a75b06bbae`. Production source blobs: `apps/desktop/ui/app.mjs=a2692d9cbaa07863ef6f75a5df6503010cf0d8fe`, `github-monitor.mjs=076a37b271c1186a5fb5cd2c60e45338d8ccc5af`, `scan-refresh.mjs=f6cd5b81e67aef20db2275f7886268d2b5e14cbf`.

Real source and existing test bodies inspected: `tests/scan-refresh.test.mjs` (7), `tests/github-monitor.test.mjs` (30), `tests/mode-b-native-monitor-races.test.mjs` (12), `tests/hybrid-reconcile-schedule.test.mjs` (11), `tests/mode-b-monitor-edges.test.mjs` (26). Existing source-level patterns in the scan suite that inspect `app.mjs` are **not real app controller event execution**. No tests were executed in this pass. [Existing detailed monitor branch map](branch-map-github-monitor-controller.md) remains the method owner for already-tested helper decisions.

## Stage 4: actual executable branches and assertion ownership

Evidence legend: E = existing executable assertion in actual imported source; I = invoked indirectly through real parent; P = independently observable missing case; OS = native platform/IPC acceptance. Historical tests were inspected only.

| Entry and guard | Existing E/I proof | Missing P/OS proof |
| --- | --- | --- |
| `scan-refresh.mjs:10 shouldSpinForRepos` | E uncached work spinner and cached list independently asserted by seven scan tests | P malformed cached flag and scan active type, no fabricated loading during later monitor-only events |
| `scan-refresh.mjs:14 createScanRefreshQueue`, private `drain` | E overlapping scans coalesce, superseded completion/errors ignored, terminal failure visible, onBusyChange spans coalesced queue, callback contract throws | P `publish` synchronously throws; `onError` throws; 3+ invalidations while one scan pending, final rejected scan; verify busy reset, returned rejection semantics and no duplicate subsequent native read |
| `app.mjs:532–553 refreshSnapshot` | I source-level composition uses exact `createScanRefreshQueue`, captures `monitorRevision` before native get_snapshot and reconciles at publish | P **actual imported app** with delayed get_snapshot + newer monitor event; verify repo rows remain from new Git scan and remote metrics from newer monitor; existing pure `reconcileScanPresentation` test alone insufficient |
| `app.mjs:560–573 refreshMonitor` | I separate `mergeMonitorPresentation` direct helper tests, source-level monitor event registration | P two overlapping `github_monitor_snapshot` requests resolved reverse order, stale rejection after newer success, no Git row replacement, DOM count and trace behavior |
| `app.mjs:718–750 locale and listener startup` | I source checked for revision comparison, `get_settings_config` independent early read, monitor/scan subscriptions | P actual app import with out-of-order config responses, snapshot-before-config and config-before-snapshot; final saved locale authority; first-snapshot and first-monitor startup trace exactly once |
| `app.mjs:582–613 Git action and cancellation` | I source guarded `busy` and `fetchCancelling`, native invoke mocked only in helper-related tests | P double Fetch/Sync click, cancel accept/reject, failure followed by refresh, event-driven `repoticker-git-action-finished` arriving before command promise; exactly one owned operation and no fabricated success |
| `app.mjs:752–788 native drag listeners` | I `createNativeDragGesture` itself directly tested separately | P actual card pointer filter (primary/button/target), pointer capture and loss, hide card while dragging, duplicate pointerup/cancel; physical Wayland input OS |
| `github-monitor.mjs:186–470 startGithubMonitoring` | E actual injected native/event/clock controller in four suites; initial auth/loading, revision discards, 429 cooldown, forced busy rerun, healthy Hybrid 15-minute safety, runner-only 403 independent task status, CI opt-in and silent baseline | P 0/1/86400/86401 cooldown seconds, wall-clock rollback after successful lastAttempt, 3-way account switch + queued publish + delayed cooldown, 6+ CI alerts with first failure, multiple simultaneous kinds order |
| `github-monitor.mjs:207 publish` | I delayed old-account publication and disconnect test assert no stale overwrite | P old publish rejects during scope switch while third new authorized refresh enqueues; bounded error and no false recovered counts |
| `github-monitor.mjs:228 applyCooldown` | I 429 cooldown enforced on forced UI/timer/relay fallback; old-scope async cooldown cannot publish old result | P invalid values, current clock reversed, result race where cooldown read completes after current account has changed |
| `github-monitor.mjs:338–359 CI callback/notify` | I 12 native race tests include no completed-read when opted out, one alert after silent baseline, stale CI result cannot notify after logout | P 6 alert cap (exact 5), first native `ci_run_notify` reject then later alerts, scope change between first and second send |
| `github-monitor.mjs:382–390 finally` | I forced busy request rerun after one refresh completes | P injected `onRefreshState` synchronous exception and pending rerun cleanup; callback errors must be characterized, not silently swallowed |

## Stage 5: Positive/N1–N12 applicability

| Category | Evidence vs necessary case |
| --- | --- |
| Positive | E scan queue and monitor real controller happy paths; P actual `app.mjs` orchestration and WebView DOM |
| N1 | E invalid scan callbacks, invalid monitor refresh kind; P malformed native metric snapshot and DOM payload shape, unexpected event types |
| N2 | E existing 100/101 repo source, timer windows; P cooldown 0/1/86400/86401 and CI alerts 5/6, trailing forced-kind orders |
| N3 | E collection/REST simulated failures; P native monitor snapshot rejection after successful newer reply and publish rejects while scope changes |
| N4 | E scan invalidation and busy coalescing; P simultaneous Git native event + fetch promise completion without duplicate success |
| N5 | E queued monitor publication and stale scope prevention; P 3-way older/newer account + async cooldown + publish, app scan/monitor/config interleaving |
| N6 | E partial selected repo, unknown-vs-zero collector; P malformed nested `runner_state` trust boundary **NM1 STOP**, not a test-authorized policy change |
| N7 | E scope/auth revision guards; P cross-account CI status after out-of-order callbacks, no stale account in DOM |
| N8 | E Hybrid fake-time 2/15 min cadence; P clock rollback and exact deadline equality, locale event ordering |
| N9 | E programmatic card-hidden reset source; P event delivered during gesture, physical KDE drag/Quit and Windows window focus |
| N10 | E bounded GitHub errors; P provider string in DOM status/error via safe text-only sinks, no private repo in diagnostic trace |
| N11 | NA: no entitlements |
| N12 | E cache data in memory and OS-backed native config via simulated IPC; actual Keyring/SQLite/native persistence handled by other coverage owners |

## Stage 6: interaction matrix (one changed dimension per case)

- **AM-X1** native full Git scan pending × fresh monitor-only result × Git scan completes: local rows from scan, remote data from monitor, no stale regression.
- **AM-X2** two monitor snapshot requests × reversed fulfillment order × first rejects late: latest metrics remain and no old failure banner.
- **AM-X3** initial Settings locale reply × full Git snapshot reply × later config-changed locale: saved locale wins according to revision and firstSnapshotReady guards.
- **AM-X4** native Git action pending × progress event × cancel × action-finished event: exactly one native action, cancel is not a second Fetch, no fictitious completed counter.
- **GM-X1** account A collector pending × scope B publish queued × A cooldown read completes: only B current, no stale A CI notification.
- **GM-X2** rate cooldown × clock rollback × forced refresh and native relay fallback: no bypass; characterize actual scheduler before changing clock origin.
- **GM-X3** CI 6 alerts × first native notify fails × scope changes mid-batch: 5 cap and no later old-account message after revision invalidation.
- **SC-X1** three invalidations × superseded rejected scan × final publish throws: verify exact observation, cleanup and later request availability, not source-only regex.

## Stage 7: minimum independent additions (do not count existing tests)

| IDs | New independent case groups | Bodies |
| --- | --- | ---: |
| A1-1–A1-3 | Real `app.mjs` import: latest monitor reply, latest local scan, config revision and DOM | 3 |
| A1-4–A1-6 | Real card commands: Fetch/Cancel/event, pointer hide/capture, CI row/locale safe DOM | 3 |
| GM-1–GM-3 | Native monitor cooldown bounds and wall-clock, auth/scope/publish 3-way sequencing | 3 |
| GM-4–GM-5 | Six-alert cap/failing notification and multiple forced refresh kinds | 2 |
| SC-1–SC-2 | Three coalesced invalidations and publish-throw/onError-throw observation | 2 |
| X-1–X-2 | Cross-controller card ↔ monitoring trust and native Git action/event invalidation | 2 |
| **Total** | **15 minimum new independent test bodies** with parameterized variants. OS acceptance separate. | **15** |

Estimate is deliberately local to three files and the cross-controller paths; current global Stage 7 estimate is still pending. Real `app.mjs` is imported once per isolated test context with a faithful minimal document, Tauri event/invoke external adapters and controllable Promises; **no mocking `app.mjs`, `startGithubMonitoring` or domain logic**. Imported global singleton and listener cleanup between tests must be verified, not assumed. Avoid artificial sleeps; use deferred promises/event microtask drains.

## Stage 8: file-level E/P/OS ledger

| File | Direct suite evidence | New P case owners | OS acceptance | Status |
| --- | --- | --- | --- | --- |
| `apps/desktop/ui/app.mjs` | UI source checks and direct pure helper tests; **no demonstrated genuine main-card controller import in reviewed sources** | A1-1–A1-6, X-1–X-2 | KDE WebView event/drag and Windows lifecycle | PARTIAL / A1 harness gap |
| `apps/desktop/ui/github-monitor.mjs` | 30 + 12 + 11 + 26 tests across four suites, some shared modules; real controller with injected native/event/clock | GM-1–GM-5, X-1 | Native auth/Keyring/REST, hosted Relay | PARTIAL |
| `apps/desktop/ui/scan-refresh.mjs` | 7 direct tests, including coalescing, errors, spinner and parser guard | SC-1–SC-2, X-1 | Native filesystem/Git discovery through Tauri | PARTIAL |

## Stage 10: mutants required to be killed (planned, never executed)

- Remove `monitorRequest` last-reply check; remove `monitorRevision` reconciliation; invert firstSnapshotReady locale guard; change `onBusyChange(false)` timing; accept stale cancelled Fetch as success.
- Skip `selectionRevision` check inside publicationTail; update `lastState` after stale scope; bypass 429 cooldown for force/relay; change `alerts.slice(0,5)`; remove `onCiStatus(null)` on scope loss.
- Change queue `invalidated` reset semantics, publish stale result or leak active state when publish throws.

No mutations executed and no final STABLE/FLAKY run. Do not change NM1 nested JSON trust policy, monitor authorization, Git safety or native command semantics without explicit architectural STOP decision. Stage 4–8 **PARTIAL globally**, this slice is a precise planning artifact only.
