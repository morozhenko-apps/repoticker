# Mode B: native GitHub REST read client, authorization and response projection

Source SHA: a3ba7fa30fc4c81890d3075f94142942d001cbf3; file: apps/desktop/src-tauri/src/github_api.rs; source blob: 842bb1ba94bfb31924093575ffec262f6e9f3e46.
Prepared documentation parent: c5d0b20a1dc7c2d716f3fa99b7628eb343dee226.
Status: Stage 3–8 partial assertion reconciliation, not newly executed tests or a production fix.

## Review of 13 existing Rust tests

| Test or family | Verified assertions against actual source |
| --- | --- |
| rest_client_reuses_connections_but_never_stores_auth_headers | Same OnceLock Client is reused; a newly built request has no default Authorization header. Does not exercise an authenticated network call. |
| only_documented_read_routes_are_allowed and paths_reject_encoded_traversal_duplicate_queries_and_write_operations | Real valid_path accepts ten concrete read routes; rejects 20 ordinary negative routes plus 11 adversarial URL/query examples. |
| completed_run_projection_is_minimal_and_rejects_invalid_facts; mode_b_native_completed_run_projection_rejects_impossible_dates | Actual project keeps four selected run fields; rejects invalid ID/attempt/conclusion/timestamp; excludes actor/title/head_repository payloads. |
| mode_b_completed_run_timestamp_enforces_calendar_and_leap_year | Real timestamp validator accepts leap days and rejects invalid month/day/hour/minute/second, 1900 leap and non-Z offset. |
| response_projection_retains_no_oauth_or_repository_secrets; repository_and_runner_projections_never_forward_arbitrary_provider_fields | Actual project strips named private provider fields from repositories and runners. Does not mean every projected value is deeply validated. |
| projection_exposes_only_actions_minutes_and_minimal_identity; billing_projection_never_exposes_other_products_or_private_metadata; mode_b_billing_projection_preserves_integer_and_fractional_number_types | Login/plan projection is narrow, mismatch org rejected; billing filters product=Actions, unitType=minutes and preserves original integer or fractional grossQuantity while stripping charge/account metadata. |
| github_rest_failures_distinguish_permissions_and_rate_limits_without_provider_text | Exact 401, 403 permission, 403 quota, 404, 429 and generic 502 public messages. |
| oversized_or_broken_provider_pages_are_not_treated_as_empty | Missing, null, numeric or 101-item installations reject; genuinely empty list accepted. |

All are inline Rust tests of real validators/projectors or client construction. None directly invokes Tauri github_api_get with fake authenticated transport and streamed HTTP chunks. Source review is not a new Rust execution result.

## Method-level decisions, already asserted branches and open cases

| Production method | Branches and security invariants | Evidence versus remaining branches |
| --- | --- | --- |
| GitHubRestClient::client | OnceLock uninitialized or cached, successful build or fixed failure; no redirects and 15s timeout | E reused no-default-auth Client; ? builder failure, redirect/timeout via an external HTTP fixture |
| api_http_failure | 401; 403 with remaining=0 or any Retry-After present; 403 permission; 404; 429; other statuses | E all classes; ? malformed but present Retry-After, 403 with reset-only; error label must be congruent with rate gate |
| valid_name | nonempty, up to 100 ASCII letters/digits/period/underscore/dash, not single/double dot | E implicit via path examples; ? exact 0/1/100/101, Unicode, forbidden controls and mixed-case identity |
| valid_utc_second_timestamp | 20-byte exact UTC seconds, separators at fixed offsets, numeric fields, Gregorian leap/normal month lengths, year>0, hour<24/min<60/sec<60 | E leap days, 1900 century, 0/13 month, day 0/31, 24:00, 60 and timezone offset; ? year 0000/0001, 2100 century and byte/Unicode malformed string |
| valid_path raw guard | max 300 bytes, leading slash, percent/hash/double slash/backslash disallowed before Url parse | E encoded traversal, fragment, repeated key, unauthorized route; ? 300/301 byte, raw Unicode/whitespace, invalid URL parse and normalized dot segments |
| valid_path route selection | /user and /orgs/{name} no query; six read-only Actions/installation/runner/billing patterns, positive numeric IDs; unknown routes false | E each documented positive and many negatives; ? 1/u64::MAX/overflow IDs, empty/bad names, branch-by-branch invalid segments |
| valid_path query | unique keys; per_page=100 and page 1..10 mandatory for nonbilling; optional valid status/filter; year 2020..2100 and month 1..12 mandatory for billing | E 0/11 page, per_page wrong, unknown and duplicate params, billing month 13; ? page exact 10, billing year 2019/2020/2100/2101, month 0/1/12; conflicting route/status/filter pairs |
| project_billing | usageItems array, <=500; drop non-Actions or non-minutes; required sku/grossQuantity; sku 1..80 bytes; numeric finite and >=0; output only two fields | E integer/fractional, non-Actions filtering, invalid numeric string/negative, private field stripped; ? 500/501 items, exact 80/81-byte SKU, null/array/object quantity, 0/max safe and large exponent, NaN/Infinity from model boundaries |
| project identity | /orgs/{org} name matches login case-insensitively; /user valid login; plan name max 40 | E matching user/org and mismatched org; ? invalid plan omitted at 41, login 100/101, Unicode; project expects upstream valid_path, not independently an HTTP router |
| project generic collection | route-specific key, response array exists and <=100, fixed allowlisted item projections for installations, repositories, runners, jobs, workflow_runs, includes total_count from provider | E missing/wrong/101 installation and private fields stripping; ? all five collection types 0/100/101, corrupt nested fields, total_count type and shape; the total_count JSON value is copied without type validation, so do not call it guaranteed scalar or claim a token leak |
| project completed runs | exact 4 fields plus total_count; ID 1..2^53-1, attempt 1..1_000_000, fixed nine conclusions, strict UTC timestamp | E common invalids and calendar; ? lower/upper successful boundaries for both numeric IDs, each conclusion, malformed total_count |
| github_api_get preflight | Reject path before token; diagnostic stage only fixed IDs; rate cooldown rejects before network; obtain native token+ETag under vault lock; client failure | S only for actual Tauri command; needs injected native AppHandle/HTTP, zero network and no token access on invalid path/cooldown |
| github_api_get network | GET with API version, bearer and optional If-None-Match; 15s timeout, no redirects; network failure; 304 only matching fresh cache | S. Inject server response 200/304/401/403/404/429/500, redirects, broken socket; no provider body/headers/logs or paths in public error |
| github_api_get non-2xx | Invalidates ETag on 401/403/404; reads headers; bounded rate backoff; error message fixed, status-specific | Pure helper E, command ?; source header/rate interactions need execution with real rate gate and ETag cache |
| github_api_get response | Read streaming chunks with hard 2 MiB byte cap; chunk error; JSON parse error; allowlist project; generation recheck and save; return projected Value | Project E, command ?; exact cap, overflow, partial/truncated chunks, scope rotation during stream, concurrent 200/304 |
| github_api_get same-generation older 200 | ETagCache::save returns true when another newer request already saved a different tag, deliberately without overwriting cache | Existing ETag Rust test verifies cache preservation, NOT what an old github_api_get caller receives. Check whether an older projected response is returned despite newer cache state; source-derived possible stale UI race, not a proven defect |

## Positive plus N1–N12 status for this source file

| Category | State | Remaining obligation |
| --- | --- | --- |
| Positive | E partial | Pure allowlisted route/projection and client reuse proven; actual GET 200/304 untested |
| N1 | E partial | Route, name and JSON validation; per-field type/empty/Unicode matrix incomplete |
| N2 | E partial | Calendar and 101 page; 300/301 path, 100/101 page, 2 MiB and 500/501 billing not fully executed |
| N3 | ? | Real native GET error 401/403/404/429/503, timeout and midstream fail |
| N4 | E partial / ? | ETag helper tests but HTTP retry/idempotency and stale older response return missing |
| N5 | E partial / ? | ETag generations tested, asynchronous native HTTP races not |
| N6 | E partial | Missing/invalid provider list rejected; nested corruption/projection variants incomplete |
| N7 | E partial / ? | Read routes and minimal projection; Tauri command and request header/source boundary to verify |
| N8 | E partial | Gregorian UTC tested; full date boundary/overflow cases incomplete |
| N9 | OS | App quits during read; transport must not publish to destroyed UI |
| N10 | E partial / ? | Field-level private stripping proven; total_count unvalidated Value and raw HTTP/log privacy need explicit tests |
| N11 | NA | No RepoTicker paid entitlement; GitHub billing informational |
| N12 | NA here | No disk writes in HTTP command; cache memory poison and vault Keyring failure belong to their own modules |

## Stage 9 test obligations (NOT implemented)

- API1: table-driven valid_path predicate, query and numeric boundaries; mutations in key uniqueness, read-only route allowlist and ID limits must fail.
- API2: real project/project_billing exact independent field, array and numeric boundaries; assert full output keys and absence of canary fields. Include total_count trust/typing as a *behavior observation*; schema tightening would need a documented security/API contract choice.
- API3: Tauri command using deterministic HTTP/credential/rate/ETag adapters, exercising 200,304,401,403,404,429,503, redirects, timeout and JSON streaming at 2 MiB/-1/+1. No external GitHub traffic, real credentials or token-bearing logs.
- API4: controlled concurrency, old and new auth generations with in-flight 200/304, cache invalidation and same-generation late older 200. Assert both cache and each caller-visible projection. No arbitrary sleeps.
- API5: permission-boundary smoke on actual desktop/usage windows, plus platform Quit during an in-flight request (OS acceptance separate).

Mutation guards: force arbitrary route true, remove key dedup, page 10 cap, send without bearer, skip generation check, change status 403 mapping, read unbounded stream, forward provider JSON, remove project validation, trust outdated 200. Each important guard must be killed by an executable assertion, not only source text.

Rollback: this documentation commit is independent of source or tests. Mode B Stage 3–8 global map and final evidence remain incomplete.
