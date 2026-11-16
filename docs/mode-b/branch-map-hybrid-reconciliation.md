# Mode B: Hybrid relay hint scheduling, finite REST reconciliation and race-admission branches

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; subject `apps/desktop/ui/github-monitor.mjs` blob `076a37b271c1186a5fb5cd2c60e45338d8ccc5af`, especially `applyRelayPhase`, native phase listeners, relay hint listener and schedule callback (lines 407–470). Full auth/cache refresh mapping in `branch-map-github-monitor-controller.md`. Direct test source `tests/hybrid-reconcile-schedule.test.mjs` blob `cf18776897349bb89ca7f1bd1c56797faad37ecf`, **11 tests** exercising actual `startGithubMonitoring` with an injected native IPC, fake event bus, scheduled callback and fake clock. No test executed this turn; no live relay/network.

## Direct existing assertions by case

| Existing test (abbreviated exact name) | Actual controller assertion |
| --- | --- |
| `Given Simple polling When two minutes elapse Then continue full REST snapshots` | After startup: one `all`; at +60s no new collection; at +120s second `all` |
| `Given native online Hybrid When time advances Then runners remain fresh and full CI uses 15-minute safety bound` | `HYBRID_FULL_RECONCILE_MS=900000`; +120s runner refresh, +240s next runner; at 15m exactly full `all` |
| `Given frequent Hybrid task hints When time advances Then tasks cannot starve full REST or runner reads` | 11 time jumps/hints still result in at least one runners refresh and one full all >=15m |
| `Given online-to-fallback transition When WebSocket is lost Then reconcile immediately and restore short polling` | Online→fallback immediately issues forced full all; then short cadence |
| `Given connecting or polling native phase When timer advances Then keep the short full REST schedule` | Connecting/polling/fallback native phases do not activate hybrid relaxed cadence |
| `Given native phase IPC failure When monitor starts Then fail safe to direct polling` | Missing `relay_connection_status` does not suppress short full REST |
| `Given late native phase snapshot When newer fallback event arrives Then stale snapshot cannot restore online mode` | Newer online→fallback events win over stale initial online promise; subsequent full remains short |
| `Given a burst of two task hints When burst gate coalesces Then a trailing task reconciliation is not lost` | First tasks hint causes one targeted request, second at +10s suppressed but remembered; next tick +20s produces exactly one trailing tasks refresh |
| `Given an incomplete full REST snapshot When online Then do not stretch recovery to 15 minutes` | Failed full collection null/unavailable forces short interval even native phase online |
| `Given GitHub cooldown When fallback forces a read Then no rate-limit bypass occurs` | Native 180-second cooldown prevents fallback forced collection at 0 and +120s; successful second collection after +240s |
| `Given unknown native phase When online Then conservatively revert to full REST and never trust a status payload` | Unknown phase becomes fallback conservative short `all`, no `ci_run_notify` invocation |

## Executable branch and ownership reconciliation

| Branch | Grounded expected behavior | E/gap |
| --- | --- | --- |
| `relayOnline = (phase==="online")` | Only exact native string online enables hybrid; all other/unknown false | E online, fallback, polling, connecting, unknown |
| `wasOnline && !relayOnline` | Online→not-online resets healthy and forces REST full immediately | E fallback, unknown phase; ? duplicate fallback should not cause repeated immediate requests |
| native phase async snapshot | Guard by `relayPhaseRevision` captured before initial promise; new event causes stale snapshot to be ignored | E late stale online snapshot after new fallback |
| native phase IPC rejection | Catch and retain Simple short cadence; no fabricated online | E injected throw |
| relay hint validation | Only `kind` tasks/all triggers refresh; event payload cannot include run result or provider conclusion | S source and unknown phase; ? direct malformed hint kinds / payload fields with asserted zero REST |
| burst gate | `now()-lastRelay[kind]<15000` suppresses burst; for tasks sets trailing flag, for all does not; distinguish kind clocks | E tasks+tasks within 10s, trailing after +20s; ? all+tasks and tasks+all interleavings, exact 14999/15000 ms |
| `lastRelay` reset | On accepted hint update last timestamp and clear trailing tasks, force refresh; must never advance lastFullAttempt merely due to hint | E frequent hints preserve 15m full safety; ? multiple hints while busy and forced rerun group coalescing |
| periodic full gate | If !online OR !healthy OR full age>=900000: clear trailing and nonforced `all` | E all branches by representative phase/incomplete/15m; ? exactly one tick after backwards time change |
| periodic runner gate | If hybrid healthy and runner age>=adaptive min: nonforced `runners`, no jobs/CI | E +120/+240 runner calls |
| periodic trailing tasks gate | Only if trailing flag, elapsed tasks hint>=15000 and now>=cooldownUntil; mark lastRelay.tasks=now and forced targeted tasks | E suppressed second hint replay, ? explicit cooldown preventing trailing under native rate limit |
| cooldown interaction | Fallback forced full is still authorized preflight then denied REST if rate deadline active | E 180s cooldown and recovery |
| full health | No provider error and jobs coverage/scope needed to stretch cadence; relay online alone insufficient | E incomplete full snapshot test |
| privacy/authorization | WebSocket hint is advisory trigger only, not authoritative CI status, job data, OAuth bearer or native Git mutation | E no notify on unknown phase, S client transport constraints; native relay event emitter separate |

## Conditional hypothesis: backward wall clock

The production scheduler uses `now()` numeric millisecond values for refresh ages and `lastRelay` hint burst gates. If system clock jumps backward, `now()-lastFullAttempt` or `now()-lastRelay.tasks` becomes negative and can suppress nonforced operations until wall clock catches up. **This is not a reproduced defect.** User-visible recovery contract and native Rust monotone rate-gate semantics must be compared before changing clock base. Current fake-clock tests only advance forward; test rollback to characterize, then use STOP FACTOR if replacing clock changes an approved security/backoff invariant.

## Positive / N1–N12

| Class | Status |
| --- | --- |
| Positive | E 11 controller schedule scenarios including Simple/Hybrid |
| N1 | E unknown phase fail-safe; ? malformed hint kind/event payload |
| N2 | E 2-min/15-min and 10s+20s hint; ? exact 14999/15000, 899999/900000 and minimum interval edge |
| N3 | E phase IPC failure and GitHub cooldown, network errors through collector separately |
| N4 | E duplicate task burst coalescing, phase reversion; ? repeated all hints |
| N5 | E stale async phase snapshot, ? concurrent hint+scope switch+notification pending |
| N6 | E incomplete full read retains short REST, invalid phase fallback |
| N7 | E only phase authoritative for scheduling, not CI conclusion; arbitrary hints must be ignored |
| N8 | E injected forward clock, ? rollback/reset and wall-clock leaps |
| N9 | E synthetic popup/card and fallback events, physical suspend/resume after hours unknown |
| N10 | E no secret in scheduled request/hint; native diagnostics/redaction separate |
| N11 | NA no entitlement |
| N12 | NA scheduler has no disk writes; native transport failure is N3 |

## Exact Stage 9 gaps (after global mapping)

- HY1: hint table invalid null/unknown kind, 14999/15000/15001 ms, tasks/all alternations, burst while busy, scope switch before queued task.
- HY2: periodic boundary 119999/120000 and 899999/900000, old healthy vs incomplete full, runner independent clock and no starvation.
- HY3: fake rollback of 5m during native cooldown, active online hybrid and fallback; record actual delayed/suppressed work and decide monotonic policy without inventing success.
- HY4: cross-order native phase promise, multiple state events and failed `relay_connection_status`, ensure latest event wins.
- HY5: actual KDE/Windows suspend/resume, delayed native websocket disconnect, REST reconciliation and rate gate; OS acceptance only.

Mutation targets: weaken exact online match, skip phaseRevision guard, let hint advance full clock, suppress trailing tasks permanently, defer REST after websocket drop, bypass rate cooldown for force, mark incomplete full healthy. Formal mutation execution pending. No source, tests, CI, Cloudflare or dev changes.

Mode B Stages 3–8 global PARTIAL.
