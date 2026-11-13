# Mode B: GitHub installation inventory authorization and bounded redacted provider failures

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, audit parent `e28b1213c11f3596f10c1f3f840617f2c2eb43a7` on `audit/mode-b-testing`.
- `apps/desktop/ui/github-installations.mjs` blob `5bba2eae8f490a6b70f2e013f2aaaef4f4f66382`, 38 lines, real exported `listAvailableInstallations`.
- `apps/desktop/ui/github-errors.mjs` blob `a4003a56c41c6a5967e157cd066601ab8f9bbe3b`, 62 lines, `githubFailureReason`, `githubFailureMessage`, `mostImportantGithubFailure`.
- Direct behavioral assertion sources: `tests/github-installations-mode-b.test.mjs` blob `e41f478dc877eb8ca683546dcd01423771ff4999` (**7 tests**), `tests/github-errors.test.mjs` blob `f8a48f9260877700f48dea1be142a32e19bf7aa7` (**4 tests**), and `tests/mode-b-api-boundaries.test.mjs` for 100/101 and downstream scope invalidation (21 cross-module tests). Sources inspected, **no new execution**. Native GitHub HTTP adapter and installations permission validation are separately mapped in `branch-map-rest-client.md` and `branch-map-github-monitor-controller.md`.

## Existing real executable installation assertions

| Test / important branch | Direct observed result |
| --- | --- |
| empty and complete inventories | `[]` response makes `{items:[],complete:true}`; two valid items preserve name/id order, page=1 queried |
| invalid row | null/empty/missing ID, ID 0/-1/2^53, empty/dotdot/traversal/name slash, missing account all reject **before next page** |
| same installation on overlapping pages | first page exactly 100 distinct, next page includes same ID and same owner with different letter case plus one new; emits 101 distinct installations, preserves first seen owner casing and `complete:true` |
| conflicting ID or owner | same ID different name, same casefold owner different ID all throw `Conflicting installations response`; no ambiguous scope authorization |
| malformed page | null, {}, nonarray, 101 entries immediately throw `Invalid installations response` |
| corrupted account prevents repository reads | real `collectForAccount` with invalid installation row throws before any downstream collector call, one installations request only |
| boundary name | ASCII 100-char owner valid, 101 invalid |
| API boundary suite cross-check | exact 100+1 on pages, 101 array invalid, incomplete 10 full pages cannot be treated as complete and used for guessed owner authority |

## `listAvailableInstallations` branch table

| Executable branch/decision | E = asserted; ? = not directly asserted |
| --- | --- |
| `get("/user/installations?per_page=100&page=N")` up to 10 | E page1, 100+1 two-page behavior; ? exact request URLs for page 2..10 under all-full inventory |
| response must contain `installations` array length <=100 | E [] as known complete, malformed/no array/101 fails |
| row `account.login` 1..100 ASCII [A-Za-z0-9_.-], not "."/".." | E zero/100/101, traversal, wrong type effectively via missing account; ? exact one character and Unicode confusables |
| ID must positive safe integer | E 0/-1/2^53 and valid; ? exactly MAX_SAFE_INTEGER |
| `seenIds` and `seenOwners` maps | E identical repeated row dedup (case insensitive), duplicate ID with different owner fails, duplicate owner with different ID fails |
| first-seen canonical rendering | E original "team1" stays after "TEAM1" replay, unique order preserved |
| page length <100 | E complete=true; reaching ten exactly 100 pages returns `complete:false`; not a false zero | E cross-module bounded case, ? 999/1000 last page and late permission failure |
| provider rejection | Native `get` exception propagates; not rewritten to empty result | ? direct 403/429/page2 timeout and cancellation |
| caller trust boundary | Scope selected from **complete** installation evidence or explicitly authorized repo; cannot select arbitrary account from truncated list | E downstream corrupt prevention and selected-repo tests; physical native OAuth/generation remains separate |

## Redacted failure classification: exact source and test assertions

| Method | Direct behavior and evidence |
| --- | --- |
| `githubFailureReason` | Maps **only fixed exact strings** from native error output to seven finite categories; 10 actual message classes tested with both strings and real Error objects. All provider-shaped unknown strings / token paths / non-Error objects become `unavailable` |
| `githubFailureMessage` | Fixed safe message for unauthorized, permission_denied, rate_limited, not_found, network, incomplete, unavailable; special `scope=runners` permission denial says authorized jobs remain visible. No raw provider exception interpolation |
| `mostImportantGithubFailure` | Empty/nonarray→null; malformed/unknown-only entries→unavailable; prioritize unauthorized (6) > rate_limited (5) > network (4) > permission_denied (3) > not_found (2) > incomplete (1) > unavailable (0), no resource name in result |
| localization | Existing fourth `github-errors` test calls `surfaceText` for **all 20 locales** × **seven reason templates**, plus runners permission override and asserts exact local translations |
| cross-service | Runner inventory permission denied must not mask otherwise verified job counts; GitHub Monitor/runner collector real tests cover independent knowledge for other modules |

## Unverified independent branches worth testing

- **INS1** exactly ten pages of 100 returning incomplete, 9 full + final 99 returning complete, malformed 10th page; assert exact sequential URL and absence of downstream authorized selection. The broader Mode B API suite has some cap evidence; avoid duplicate cases that already execute the same branch.
- **INS2** provider 403 or timeout on page 2 after 100 valid accounts; propagate denial rather than return the partial first page as authoritative, no repository query. This crosses N3/N5.
- **INS3** duplicate identity conflict arriving only on page 2 and same ID/name with different letter case after many rows; assert no bypass of both maps.
- **ERR1** all fixed native messages (11 source keys) versus currently asserted mapping and cross-realm Error objects; unknown output stays `unavailable`. The current 10-item table does **not** assert the remaining fixed `"GitHub authorization rejected."` and `"GitHub is unreachable."` literals explicitly (although fixed-category branches are represented).
- **ERR2** complete priority pair table (6>5>4>3>2>1>0), wrong type inputs, tied reasons, malformed entries inserted among valid rows and runner override only for exact permission_denied.
- **ERR3** real native provider IPC error after account disconnect and concurrent old monitor request, ensure fixed safe UI message; JS pure classification is not evidence of a native transport redaction failure.

## Privacy, authority and negative matrix

| N class | Actual evidence / still open |
| --- | --- |
| Positive | E direct 7 installation and 4 error suites, active identity and full results |
| N1 | E invalid IDs, owner names, malformed arrays, unknown provider strings; ? unusual error object |
| N2 | E 0/100/101 owner/page/ID 2^53; ? exactly MAX ID, 999/1000 pagination |
| N3 | E fake provider failure in monitor/collector; direct installations page2 rejection ? |
| N4 | E exact duplicate installation idempotence, ? repeat after failed page |
| N5 | E conflicting identities reject, ? stale account switch while page2 pending |
| N6 | E malformed page and old owner casing, no fabricated complete |
| N7 | E no arbitrary account selection from invalid inventory; native authorization per request separate |
| N8 | Locale not a trust input for IDs; 20 localized fixed errors E |
| N9 | Native reconnect/disconnect UI race belongs to monitor |
| N10 | E raw token-looking provider exceptions never in visible reason; real native error logging separate |
| N11 | NA no entitlements |
| N12 | NA no local storage; native Keyring outside |

Stage 9 should add only the uncovered conditions above after global Stage 3–8 closure. Mutation targets: treat array 101 as valid, report complete at 10th full page, allow duplicate IDs with different owners, return partial on a 403, put `error.message` in UI, make unauthorized lower priority than network, call API for arbitrary owner. Existing tests kill many; no mutation runner executed. All app/CI/code untouched; global audit PARTIAL.
