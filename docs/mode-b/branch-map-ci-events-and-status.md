# Mode B: completed CI run collector, silent-baseline notification tracker and status identity

Baseline source `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
`apps/desktop/ui/ci-failure-events.mjs` blob `f78945f0b73010c1d700279413532672c8c9f7fb` (176 source lines);
`apps/desktop/ui/ci-status.mjs` blob `8884f58ad7829afcec65f3b56c3f0c0422b5d172` (36 lines).
Direct behavioral test sources: `tests/ci-failure-events.test.mjs` blob `acc3c6323852ebd1ef33a872020019d54b9c6554` (**19** Node tests), `tests/ci-status.test.mjs` blob `ccfda170372ebd4eb92267f8890976470fdffd97` (**4** Node tests), plus monitor orchestration tests. These execute real subject functions with an injected **external** native REST `get` and deterministic fixtures, not OS toast notifications.
Prepared parent `82bfed163e88fe0159ce78f5a670c859a7b0df70` on `audit/mode-b-testing`; docs only. No test executed this turn.

## CI collector executable branches

| Method or guard | Actual independent decisions | Existing test-body evidence / missing |
| --- | --- | --- |
| `canonicalUtc` | Strict `YYYY-MM-DDTHH:mm:ssZ` format, Date.parse finite, round-trip exact string; invalid dates/normalized timestamps fail | E `Mode B: impossible calendar dates and normalized UTC timestamps never enter CI history`, leap-day UTC accepted; ? 23:59:59, leap seconds and offset, DST boundaries |
| `validateSelection` | Account ASCII name 1..100 not dot/dotdot; 1..100 fully qualified repo names, same owner case-insensitively; duplicate repo case-insensitive denied | E `Given unsafe scope or configuration When collecting Then no request is made`, malformed second repo never partially mutates first history in mode-b edges; ? 100/101 ASCII labels across every field |
| `validRun` | id positive safe integer, run_attempt positive integer <=1,000,000, conclusion in fixed set of nine, updated_at canonical UTC | E invalid facts, impossible dates, correct leap-day; ? each endpoint exact 0/1/max/+1 and all nine conclusions |
| `collectRecentCompleted` admission | Valid scope, get function, maxPages 1..2, concurrency 1..4 before any GET | E invalid input no REST, bounded concurrency; ? every concurrency 1/4 boundary and wrong type cases |
| `collectRecentCompleted` pages | For each selected repo, GET `/repos/{repo}/actions/runs?status=completed&per_page=100&page={page}`; require array <=100 and every `validRun`; stop on <100 or maxPages | E valid paginated API with caps, malformed/101 response fails current repo; ? exact 100→1 vs 100×2 with many other repos, no completeness marker when window cap reached |
| `collectRecentCompleted` per-repo failure | Catch malformed response/denial for one repo and return `{repository,error:"unavailable"}`; others intact and return positions stable under parallel work | E `Given one repository fails When another succeeds Then healthy history stays intact`, `Given completed API When paginated Then limits and per-repository errors are isolated`; ? delayed inversion of completion order and middle failure at page 2 |
| `createCiFailureTracker` constructor | `maxRemembered` integer 200..1000; invalid -> throw; scope starts null, history Map empty | E default tracker in many tests; ? 199/200/1000/1001 and eviction behavior |
| `reset` | Clear scope and all per-repo history, future observation silent first time | E startup/logout and mode-scope reset; ? reset while live collect pending, handled at controller revision layer |
| `observe` preflight | Mode off/failures/successes/both; selected scope valid; observations array, unique authorized repository; each error exactly unavailable and no runs; each successful runs length <=200, valid runs, unique id/attempt | E invalid observations don't partially mutate history, mode defaults off, selected repo validation; ? all 200/201 boundary and cross-run duplicates in one result |
| `observe` scope key | `mode:lowercaseAccount:sortedRepoNames` means case/order change of same selected set does not silently rebaseline, changed mode/account/repo selection does | E `Mode B CI tracker: scope order change is not a different security scope`, switching mode does not replay, changed account or repo resets |
| `observe` silent baseline | New scope or first repo snapshot sets history and emits **no** alerts, even if completed failures predate startup | E first snapshot silent, then run3 failure alerts once; E new repo scope silent |
| `observe` failed source | An `error:"unavailable"` snapshot deletes only that repo history. Its first recovered successful read is silent; healthy other repo histories unchanged | E `Given failed or missing source...` and `Given one repository fails When another succeeds...` |
| `observe` outcome bits | Same run id+attempt stores independent failure bit 1 and success bit 2; mode gates alert on newly observed allowed bit only; stale alternating API reads cannot replay same bit | E `Both mode retains distinct success/failure facts through stale API alternation`, repeated failure no duplicate, successes-only mode, nonfailures never emit |
| `observe` history memory | For each run move key to end, OR prior bits; bound each repo's Map to maxRemembered by deleting oldest; store only ID/attempt/conclusion bit, no provider actor/title/token | S source, ? direct 200/500/1000 and oldest eviction replay, bounded memory per repo |
| `observe` result | Return bounded facts with repository/id/attempt/conclusion/updated_at only, not remote URL/job title; controller further caps to 5 OS notifications/refresh | E run identity and silent initial alert; ? provider row containing attacker-controlled extras and exact output allowlist proof |

## CI status projection

| Method | Decisions and guarantees | Evidence / gap |
| --- | --- | --- |
| `identity` | Exactly two valid ASCII account/repo components, case-insensitive, reject URI, nested path, dots, nonstring | E `ci-status.test.mjs` wrong org, folder-only, fork/path and URI invalid |
| `projectLatestCiStatuses` | Account valid and <=100 observations, each one authorized unique repo; malformed/duplicated scope -> entire return null | E cross-scope and duplicate provider identity rejected; ? 100/101 and wrong observation type |
| `projectLatestCiStatuses` outcome | First run's success/failure only accepted, all other conclusions, absent, unreadable -> null; does not guess CI state from local Git cleanliness | E green/red vs dirty/behind, unknown cancelled/empty/unavailable cases |
| `ciOutcomeForRepo` | Only exact `github_repo` origin identity under matching account and actual Map, otherwise null | E no guessed folder/fork/wrong account, case-insensitive exact match; ? malformed `statuses.account` with attacker-crafted Map and property getters |

## Cross-module and source-only uncertainty

- **CI tracker history is process-local**; after app restart a first seen failure is silent by design. This is tested. It is not an at-least-once persistent message queue.
- **A complete GitHub run page is not a full historical scan**; collector caps at 1 or 2 pages and deliberately builds a bounded recent window. A 200-row window is not equivalent to knowing that no older completed runs exist.
- **Runners permission denied + complete jobs**: monitor may still call `collectRecentCompleted`, whereas any job/installation/rate failure disallows trusted CI status+notifications. Native `ci_run_notify` applies *additional* authorization and permission checks (mapped in `branch-map-ci-notifications.md`).
- **Races**: collector may resolve after logout or scope switch; CI module itself does not know the current native account. Monitor's `selectionRevision` is responsible for dropping stale results before alert call. Tests pairwise demonstrate it; three-way notification+scope/cooldown sequence remains planned.
- **Time**: canonicalUtc strictly validates completed-run timestamp; monitor scheduler uses wall clock for throttle separately. Date validity and clock rollback are separate concerns; don't treat timestamp validation as a mitigation for time rollback.
- **Privacy**: `collectRecentCompleted` returns only projected fields from native `github_api_get`; tracker alert output is allowlisted but no OS notification delivery or Tauri authorization occurs in Node tests.

## Positive / N1–N12

| Class | Actual evidence / missing independent test |
| --- | --- |
| Positive | E real completed-run fetching, scope and silent-first-alert tracker, status projection |
| N1 | E invalid scope, malformed run/response, duplicate observation and unsafe repo IDs |
| N2 | E 100-page limits, positive/run bounds and bounded concurrency; ? 199/200/201 and maxRemembered 200/1000 |
| N3 | E per-repo denied/malformed REST and isolated recovery; native DNS/429 only at outer API |
| N4 | E repeat suppression, failure/success independent monotonic bits, rebaseline on recover |
| N5 | E controller stale-scope suppression, ? concurrent tracker.observe with delayed provider read through controller |
| N6 | E corrupted/outdated UTC input and missing-run source, no fabricated alert |
| N7 | E selected owner, reject foreign provider rows and wrong account CI status |
| N8 | E impossible normalized UTC and valid leap day, ? DST/offset and backend wall-clock rollback |
| N9 | E startup reset/scope change at controller boundary, OS Quit/send pending separate |
| N10 | E only fixed run facts, no title/actor/URL to OS notify payload; native logs separate |
| N11 | NA no subscription or paywall |
| N12 | NA no local storage; in-memory Map eviction is N2 |

## Stage 9 exact remaining cases (after full global Stage 3–8)

- CI1: table all nine conclusions and valid/invalid run identity bounds, UTC leap/offset/DST, malformed fields; no unsafe partial tracker mutation.
- CI2: completed response exactly 99/100/101 and 100→1 on page 2, 2 full pages bounded recent window, concurrent repositories finishing reverse order, provider denial on second page.
- CI3: tracker maxRemembered exact 199/200/1000/1001; insert >limit unique attempts and check oldest eviction/new alert versus later recent monotonic duplicate.
- CI4: 200/201 run facts, duplicate id+attempt across page boundary, corrupted second repository with valid first; entire validation should occur before history mutation.
- CI5: integrated runner-only 403 with completed-read success, then logout before native notify promise, stale response cannot show old account status or alert.
- CI6: status projector account 100/101 observations, URI/traversal/case-sensitive duplicate identity, null conclusion output, never infer Git cleanliness.

Mutations targeted: allow bad UTC, off-by-one page/concurrency, erase unknown history globally on one denied repo, emit baseline alert, re-notify same run/attempt after alternating stale status, merge cross-account, treat cancelled as success, insert raw provider title/URL in alert. Formal mutation runs not executed.

Stage 3–8 global PARTIAL; no production, tests, CI, network, notifications, dev branch or release modifications.
