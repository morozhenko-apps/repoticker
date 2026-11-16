# Mode B: bounded GitHub runner and workflow job collector, exact REST outcomes

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; production `apps/desktop/ui/runner-collector.mjs` blob `b34ee1f4d934166eda922ceab3de15bf19ff2714` (198 source lines). Real behavioral test bodies: `tests/runner-collector.test.mjs` blob `fc845b159457762cd0ee8555fd139bb8e58abff4` (**22** tests) and `tests/mode-b-monitor-edges.test.mjs` blob `ab8e2f268e30b8e3fd968f8adf0c526531982d22` (26 tests across multiple monitor modules). The tests call real `collectRunnerState` and inject only external `get` and `now`. No actual GitHub API call or new test execution occurred. Named branch `audit/mode-b-testing`, prepared parent `b2b5b835404884eb25c7781050f4cad8661ab5d3`.

## Method and executable branch mapping

| Method / decision | Real production behavior | Evidence / exact unverified branch |
| --- | --- | --- |
| `getPages` initial page | Require payload with array under exact `key`, length <=100; malformed/101 throws | E runner payload null/absent/101 and job malformed/oversize tests; ? malformed nested runner/job row classified by projector |
| `getPages` completion | Page length <100 is conclusive; exactly 100 advances until maxPages and remains **incomplete** if cap reached | E runner 100/maxPages=1 -> unknown, E complete [] -> authoritative zero; ? 100 followed by 1 on second page in each of runner/runs/jobs paths |
| `boundedMap` | At most `parallel` map workers, result order equals input positions despite async completion | E concurrent global limiter and queue tests; ? reversed-completion exact ordering and rejected nested worker interleaving |
| `limitRequests` | FIFO `pending`, only `active < limit` dispatch, finally releases slot on resolve or reject; one shared budget even nested job paging | E global maximum <=2 and error released active=0 from `global cap releases failed requests`; ? FIFO under alternating nested slow/fast tasks and repeated failure bursts |
| `collectRunnerState` kind | Only `all`, `runners`, `tasks`; runners-only never calls runs/jobs, tasks-only never calls runner inventory; independent clock preservation | E targeted runners/tasks real tests; E invalid kind `publish` preflight |
| scope validation | Org name 1..100 ASCII NAME not dot/dotdot, nonempty repo selection with each org/repo name, same owner and <=100 selected, no malformed limits | E 0/9 concurrency, 0/101 page bounds, 100-char valid, 101-char invalid, wrong org/traversal/empty; **0 external requests** |
| repository dedup | `new Set(repositories)` exact-case dedup, max 100 after dedup; do not cross owner | E normal selection and case/order scope tests; ? case-variant duplicates within one request, mixed-case 100/101 |
| prior runner reuse | Previous runners permitted only for same org (case-insensitive), even if repo selection changes | E changed selection preserved org runners; ? malformed old runner object and scope switch during pending request |
| prior task reuse | Previous task jobs only when identical set (case-insensitive) and same org, exact array length; changed repo set invalidates and old task timestamp null | E changed repository selection yields running/queued null, unchanged order/case retains; ? duplicate/reordered prior names with same set but unequal length |
| runner inventory | `GET /orgs/{org}/actions/runners`, pagination up to maxRunnerPages; errors create `runners` reason, jobs independently collected | E runner denied/invalid/100-only unknown, jobs still complete and counts known |
| queued + in_progress | Two run status pages per selected repo, run IDs must be positive safe ints, duplicate ID across statuses only queried once; untrusted run ID marks task incomplete | E same-run dedup and malformed run ID tests; ? 100/101 run-boundary with conflicting statuses and partial result |
| active run cap | Only first `maxActiveRunsPerRepo` unique run IDs queried; more unique runs -> complete false, observed jobs retained but totals unknown | E cap=1 with two runs, exactly one job query and observed queued=1, queued total=null |
| nested jobs | GET jobs with `filter=latest`, up to maxJobPages, jobs may be partial; one repo error doesn't fabricate full task totals | E malformed jobs, denied repository, independent runner inventory, error reason redacted |
| errors | Per-repo error `{scope,reason}` uses fixed `githubFailureReason` not raw provider message; runner scope separately | E rate-limit, permission denied, unavailable, JSON error does not contain `ghu_PRIVATE` |
| `summarizeRunnerState` call | Jobs passed from real successful/partial collections; incomplete coverage never authoritative zero | E incomplete pages yield null totals, complete empty gives zero; runner and job coverage independent |
| checkedAt fields | `now()` injected; clocks updated only when own group coverage true; unrequested group uses explicit previous clock else fallback `checkedAt` | E preserved old tasks clock, runners timestamp now, failed task null; ? invalid clock, clock rollback while previousState clocks later than now |
| return | `scope` copied, fixed errors, own coverage and count groups; no bearer token anywhere in UI collector | E selected/denied/partial outcomes; full native REST adapter remains separate |

## Existing direct assertions (not inferred from names alone)

- `capped runner pagination cannot report a confident zero` and `Mode B runner collector: one full runner page without a next page is unknown`: exact 100-item page under cap=1 gives runners coverage=false, `busy=null`, `checkedAtRunners=null`; jobs can independently remain complete.
- `Mode B runner collector: complete empty API is authoritative zero`: exact 3 requests (runners + queued + in_progress), `coverage.runners/jobs=true`, `running/queued/busy=0`, both timestamps populated.
- `global cap releases failed requests without fabricating complete job counts`: concurrency=2, maximum active <=2, pending releases after failed nested job, `coverage.jobs=false`, `queued=null`, independent runners true, error does not expose private token-looking string.
- `Mode B: changed repository selection cannot inherit previous task counts`: new runners-only request after changed selected repos returns no previous jobs, task counts null/time null, runner capacity remains usable.
- `Mode B: invalid collector bounds and unsafe scopes fail before any GitHub request` and name-limits test: invalid org, repo, page bounds, concurrency and kind never invoke provider. Valid exact 100-byte names yield authoritative zero.
- `Mode B runner collector: job-run cap preserves partial evidence but no false totals`: one of two runs selected, 1 observed queued, confident queued=null.

## Interactions requiring distinct proof

1. Per-repo run truncation x nested job failure x runner permission denied: preserve all independent error scope records and never report whole queue as complete.
2. Runner-only refresh x repo selection change: same-org runner cache is permitted, previous task identities are not, even if last cached task numbers look healthy.
3. Shared request budget x 100-page boundaries x rapid forced monitor refresh: one `collectRunnerState` call has a cap; monitor controller's simultaneous calls/busy gate are separate and cannot be inferred from this cap.
4. Provider timeout while a nested job holds one slot: all pending work must settle; the source limiter frees slots when a rejected promise settles, but a never-settling external `get` is not assigned a fabricated timeout.
5. Backward device clock is not checked for monotonicity in collector; reported timestamps come from injected `now`, but rate gate is owned by monitor. Do not invent corrected time behavior.

## Positive and N1–N12

| Class | State / remaining |
| --- | --- |
| Positive | E direct real collector with empty, queued, running, jobs and host runners |
| N1 | E invalid org/repo/kind/bounds before requests, malformed runner and jobs pages |
| N2 | E 0/100/101 and caps; ? 100→1 second page per endpoint and concurrency 1/8 exact |
| N3 | E injected 403/429/API error, bounded fixed reason; ? native transport timeout/abort |
| N4 | E same-run duplicate and partial retries; ? overlapping monitor invocations |
| N5 | E shared max-active concurrency and failed slot release; ? out-of-order delayed result under scope switch |
| N6 | E malformed run IDs/old scope, no stale confident totals; ? old schema missing multiple fields |
| N7 | E allowlisted account scope and URLs, no token stored by module |
| N8 | E fixed `now` timestamp, ? wall-clock rollback across partial refresh |
| N9 | ? interruption in nested GET with offline/disconnect; JS controller guards separately |
| N10 | E fixed error reason, token-looking input not in serialized errors; native logging ? |
| N11 | NA no entitlement |
| N12 | NA collector has no disk writes; runtime state failure belongs to native adapter |

## Stage 9 after remaining global Stages 3–8

- RCOL1 table: per endpoint exactly 99/100/101, then 100+1 and 100×page cap; assert `complete` and no fabricated zeros, exact request paths.
- RCOL2 delayed queue with 1/8 limit and rejection mid-batch, assert max concurrent and FIFO order, unchanged original result order and zero active promises after settlement; avoid sleeps.
- RCOL3 combine runner-only denied + partially complete selected repos + malformed run ID, preserve scope-specific errors and metrics independently.
- RCOL4 old scope order/case/corrupt cache and changed selection with targeted refresh, assert no private job carry across account.
- RCOL5 process/clock fail/out-of-order native response under actual controller adapter, no stale publication.

Mutation targets: `<100`→`<=100`, cap removal, unbounded Promise.all, allow 101 pages, accept raw provider error, carry tasks after changed repository set, mark incomplete as zero, reset unrelated timestamp. No mutation suite was run.

Mode B Stage 3–8 PARTIAL. No production, tests, CI, Cloudflare, release or dev branch changes.
