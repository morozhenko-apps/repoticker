# Mode B: GitHub Actions billing provenance, UTC reporting and multi-scope async cache

Source-equivalent baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; `apps/desktop/ui/github-billing.mjs` blob `b976af815accd1fcab79b7c7ddbdbc96cb8bddd6` (174 source lines).
Actual direct test source `tests/github-billing.test.mjs` blob `a2699124eb8f0a2920a33612937d857957c796c2` (**14 Node tests**), and detached-popup `tests/quota-mode-b.test.mjs` blob `4c5b8eadc240fcb3de61652885c7d3d0b5d60e6f` (10 controller tests, several involving billing). Parent `a78de1b03d8273a74b6a08ea643116c925c6f542`, named branch `audit/mode-b-testing`.

Tests import and execute **real billing functions** with an injected external `get`, deterministic `Date` and fake clock; one `source contracts keep billing route exact, native-projected and token-free` test instead inspects Rust/UI source text. No live GitHub billing API, native OAuth/Keyring, user private plans or newly executed test suite are involved.

## Existing direct executable branch evidence

| Source function / decision | Separate observed outcomes | Exact test assertions / remaining |
| --- | --- | --- |
| `billingMonth` | Date object must contain finite timestamp; use UTC fullYear/month, not local offset | E invalid Date(NaN) rejects; E 2026-12-31 23:59:59Z vs 2027-01-01 00:00Z, +02:00 and -02:00 offset changes |
| `knownPersonalAllowance` | Case-insensitive **free→2000**, **pro→3000**, other/null→null | E direct values including Team/Enterprise unknown; plan SKU is NOT proof of remaining quota |
| `knownOrganizationAllowance` | Case-insensitive **free→2000**, **team→3000**, Enterprise/null unknown | E direct values including Team capitalization; no entitlement guess for Enterprise |
| `reportedActionsMinutes` payload | Require `usageItems` array of length <=500, zero valid, every item named valid SKU and finite nonnegative numeric grossQuantity | E 0/1/499/500/501, null/bad item, bad type, negative, infinity, fractional 5+2.5 |
| `reportedActionsMinutes` accumulation | Sum raw SKU quantities but refuse when `Math.ceil(total)` ceases to be safe integer | E exactly MAX_SAFE_INTEGER accepted, MAX_SAFE_INTEGER+1 accumulated rejects; ? fractional near boundary and overflow after 500 inputs |
| `collectBillingUsage` required `get` | Wrong transport type immediate throw, no billing requests | ? direct wrong get and missing organization branch |
| organization input | Invalid name -> unavailable and **no** organization billing endpoint call; plan and usage independent `Promise.allSettled` | E invalid `../bad`, org admin 403 while personal known, org usage success/plan fail, plan success/usage fail |
| organization plan provenance | Recognize plan only when returned login exactly matches requested organization case-insensitively and plan.name length <=40 | E valid owner path/plan, unavailable plan returns unknown; ? wrong returned login owner with apparently valid plan, login wrong type/41-char |
| organization usage | Malformed/denied usage keeps reported null even if plan allowance known; usage success with denied plan retains reported | E both independent fail groups; `state=ready` if either reported or known allowance and remaining remains null |
| personal identity | `GET /user` failure or invalid login -> unavailable; personal plan known only when string <=40 | E missing identity and unsupported plan; ? malformed login type, 100/101-byte identity and absent `plan` |
| personal usage | Exact `/users/{account.login}/settings/billing/usage/summary?year=&month=`; failed/invalid usage marks personal unavailable while org untouched | E exact four fixed paths and month, personal denied/malformed still known included; returned remaining always null |
| `createBillingCache` constructor | Valid `get` and `now`, safe TTL>=60000; invalid configuration throws | E 60000 active, normal 600000; ? invalid now/get/TTL 59999, 2^53 |
| `clear` / disconnected | generation++, clear saved and pending; disconnected `load` returns null with no new GET | E disconnect followed by new collection, old previous data not reused |
| scope key | lowercased organization + UTC year-month, switch clears saved/pending and increments generation | E old pending organization cannot poison new cache, old response returned only to original caller; E normal scope changes |
| same-key pending | Reuse pending promise instead of duplicate four GET requests under simultaneous hovers | E two concurrent loads, requests count 4 not 8 |
| TTL hit/boundary | Return saved within `started>=saved.at` and `started-saved.at<ttlMs`; exactly TTL expiry fetches again | E direct refresh at TTL boundary and after clock reversal; no stale indefinite freshness after backward clock jump |
| failure cache | On top-level rejected `collectBillingUsage`, save `null` for same scope and throttle repeated errors; stale generation may not overwrite current | E cache invalidation after scope and clock; ? explicit error during all requests and same-scope fast repeat |

## Specific cross-module trust boundaries

1. **Reported gross SKU minutes ≠ billable free-minute consumption:** `remaining` must always be **null**, including when known allowance and usage are both present. No subtraction is performed; multiple tests assert both org and personal null.
2. **Org plan and usage are independent authorities:** denying admin-only Actions usage does not erase known plan; denying plan endpoint does not discard valid usage. Both unknown produce unavailable state, not confident zero.
3. **Stored clock vs wall-clock rewind:** unlike `github-monitor.mjs`, billing cache explicitly checks `started >= saved.at`. The existing regression directly verifies an earlier timestamp triggers fresh collection. Do not transfer the monitor's separate clock-rollback hypothesis to this module.
4. **Account/scope isolation:** source uses generation before replacing cache. Old in-flight result may resolve to its older caller but is not installed into new scope; actual detached Quota consumer also has stale-owner tests.
5. **API trust:** UI `get` receives native-projected read-only GitHub API response. The test named `source contracts...token-free` reads source, but it does **not** establish live native token leakage/redaction behavior. Rust `github_api.rs` direct tests are mapped in `branch-map-rest-client.md`.
6. **Data-shape hypothesis GB1 (not reproduced):** `planResult.value?.login?.toLowerCase()` assumes non-null login is a string. An unexpected numeric/object login could throw rather than merely mark plan unknown. Establish native Rust projected type and execute malformed fixture before proposing a fix. The org name validation uses NAME regex that permits exact `.`/`..`; do not invent a native path-escape exploit without real GitHub transport authority tests.

## Positive / N1–N12

| Class | Evidence / precise gap |
| --- | --- |
| Positive | E real org/personal summary, allowance, cache, UTC month and popup consumer |
| N1 | E malformed SKU, usage, negative and provider denial; ? invalid transport/plan login type |
| N2 | E item 0/1/499/500/501 and MAX_SAFE_INTEGER; ? 59999 TTL, 40/41 plan, exact fractional overflow |
| N3 | E injected org/personal 403 and malformed response independent, not real REST |
| N4 | E same-scope concurrent hover coalescence, TTL and failed load backoff source; ? exact failure backoff outcome |
| N5 | E stale old owner result cannot poison new scope, ? same scope two quick clear/load generations |
| N6 | E unknown plans, stale clocks and missing identity yield null; ? old API response with extra data |
| N7 | E selected owner and fixed path, native bearer not in UI source; malformed login and native auth scope ? |
| N8 | E UTC New Year and offset; E backward billing clock refresh |
| N9 | E Quota UI fake IPC partial, physical popup lifecycle ? |
| N10 | E reported SKU not treated as secret or entitlement; arbitrary provider exception text never printed in billing result; native transport log ? |
| N11 | NA subscription entitlement unrelated to RepoTicker billing data |
| N12 | NA no disk writes; cache in memory only |

## Incremental Stage 9 tests after global source/case closure

- GB-T1: malformed `planResult.value.login`, owner mismatch, 40/41-char plans, org name `.`/`..`, personal numeric/101-char login; distinguish JS projection fault from native validated schema before any change.
- GB-T2: `get` not function, TTL 59999/60000/MAX_SAFE_INTEGER, simultaneous old/new pending/failure callbacks, assert scope isolation and no raw reason.
- GB-T3: billing grossQuantity fractional and safe numeric ceiling 2^53 boundaries; no inferred remaining even at exactly 2000/3000 reported.
- GB-T4: explicit cache failure backoff with rejected `get` (not just partial org 403), clear and retry; fake clock backward across UTC month rollover.
- GB-T5: actual native projected billing API schema+redaction and popup accessibility on KDE/Windows, separate from helper unit tests.

Mutation sensitivities: change getUTCMonth to local getMonth, accept >500, allow Infinity, subtract gross minutes from allowance, copy denied-plan failure into valid usage, reuse old scope cache, accept stale clock forever. Many are directly asserted already, but formal mutation execution has not happened. Global Mode B Stage 3–8 PARTIAL; no source/test/CI/provider operation modified.
