# Mode B — executable branch and test map (Stage 4)

> **Priority correction (2026-10-22):** The owner confirmed that the
> comprehensive Mode B inventory, exhaustive branch mapping, Positive/N1–N12
> matrix, mutation audit and final report belong to the **v0.9.0 RC** gate,
> not the current v0.2.0 development stage. This file preserves preliminary
> exploratory evidence only. **It does not block implementing features,
> fixing defects or writing their required regression tests for v0.2–v0.8.**
> Resume and rescan this audit at v0.9.0 against the then-current source;
> existing inventories must not be treated as exhaustive current coverage.

Status: **PARKED PARTIAL PRELIMINARY MAP for v0.9.0**, source-verified subset only (2026-10-21).
Source baseline: `dev` as inspected by GitHub contents API.
Reference: [complete artifact inventory](MODE_B_INVENTORY.md).
Do **not** write new tests until all current production functions are
enumerated here, then Stage 5 Positive/N1–N12 matrix, Stage 6
interaction map, Stage 7 estimates and Stage 8 coverage map exist.

Evidence key:
- `E`: branch has an **existing named test candidate** from inspected
  source; assertive coverage of all boundary variants remains unverified.
- `P`: must plan/implement or strengthen a test after Stage 4–8.
- `N/A`: only with explicit safety justification.
- This file is **not measured branch coverage**. Test bodies and
  side effects must be mapped exactly before changing `E` to Covered.

## Verified branch groups: local Git decision policy

Source: `crates/repoticker-core/src/lib.rs::classify_sync`.

| Branch ID / ordered actual code decision | Existing candidate / additional planned checks | Status |
| --- | --- | --- |
| G01 `!has_upstream` → NoUpstream | `missing_upstream_blocks_automatic_pull`; combination with dirty, operation-in-progress, ahead/behind to verify priority | E + P |
| G02 `git_operation_in_progress` → GitOperationInProgress | `unfinished_operation_blocks_automatic_pull`; combine no upstream/dirty/diverged to prove ordering | E + P |
| G03 `!worktree_clean` → LocalChanges | `modified_or_untracked_files_block_automatic_pull`; combined behind/ahead and unfinished operation | E + P |
| G04 `ahead>0 && behind>0` → Diverged | `local_commits_do_not_get_rebased_or_merged`; numeric 1 and u64::MAX and dirty precedence | E + P |
| G05 `ahead>0` → LocalAhead | Same test; `ahead=1`, max, behind=0; no branch mutation | E + P |
| G06 `behind>0` → FastForward with exact commits | `clean_behind_branch_allows_fast_forward`; `behind=1` and max, no implicit network | E + P |
| G07 fallthrough `UpToDate` | `up_to_date_branch_does_not_pull`; zero/zero clean | E |

`classify_sync` cannot alone verify real Git mutations. Integration
tests in `crates/repoticker-core/tests/git_integration.rs` must
independently prove the `git.rs::safe_pull` adapter's FF-only behavior
under time-of-check/time-of-use races, interruptions and hook influence.

## Verified branch groups: Device Flow policy

Source: `crates/repoticker-core/src/github_auth.rs`.
Current candidate suite: seven Rust unit tests embedded in the module.

| Branch ID / code decision | Existing named test candidates | Additional required coverage |
| --- | --- | --- |
| A01 `DeviceSession::new`: exact `VERIFY_URL`; user-code empty/len>32/ASCII uppercase-digit-hyphen; expires_in and interval 1..=3600; overflow of started_at+expires/interval | `refuses_phishing_urls_invalid_user_codes_and_overflow` | Empty, 1/32/33 chars, lowercase, Unicode, interval/expiry 0/1/3600/3601, distinct overflow branches (N1,N2,N7,N8) |
| A02 poll interval clamps to GitHub minimum 5 | `cannot_poll_more_often_than_github_interval` | 1,4,5,6,3600 and timestamp overflow (N2,N8) |
| A03 `next_poll`: nonwaiting terminal → Stop; now>=expiry → Expired; now<next → Wait; else Ready and updated timer | `cannot_poll_more_often_than_github_interval`; `denied_expired_and_cancelled_sessions_are_terminal` | all terminal phase values; expiry-1/expiry/expiry+1; saturating timer and rollover (N2,N8,N9) |
| A04 `receive`: nonwaiting leaves terminal unchanged; already-expired override; AuthorizationPending; SlowDown; AccessDenied; ExpiredToken; Authorized; credential-error and UnknownFailure → Failed | `slowdown_extends_current_and_future_poll_intervals`; `denied_expired_and_cancelled_sessions_are_terminal`; `authorization_requires_a_nonexpired_active_challenge`; `unsupported_or_invalid_credentials_end_the_attempt` | last valid instant, multi-slow_down saturation and subsequent effective interval, all terminal state permanence, response/order matrix (N3,N4,N5,N8,N9) |
| A05 `cancel`: only AwaitingUser may become Cancelled; all terminal phases preserved | `denied_expired_and_cancelled_sessions_are_terminal` | cancel-after-success/deny/expire/fail and double cancel (N4,N5,N9) |
| A06 `TokenExpiration::decide`: refresh expired → Reauthorize; pre-access-expiry margin → Refresh; else UseAccessToken | `rotated_access_token_policy_refreshes_before_expiration` | exact `now + margin = expiry`, refresh expiry same as access expiry, u64 overflow, zero margin (N2,N5,N8) |

Runtime `github_session.rs` and keyring adapter **cannot** be marked
covered by these pure state-machine tests. A separate integration
boundary with fake clock/OS-keyring contract is required; native
refresh-logout races, failed writes and provider 429 are still open.

## Verified branch groups: Actions job/runner classification

Source: `apps/desktop/ui/runner-state.mjs`.
Current suites: `tests/runner-state.test.mjs` (11 top-level cases)
and `tests/runner-collector.test.mjs` (6).

| Branch ID / decision | Existing candidate | Required distinct variants |
| --- | --- | --- |
| R01 `normalizeLabels`: nonarray → null; string/object.name; empty/invalid label abort; normalization/dedup | `runner labels accept GitHub string and object representations` | null, scalar, empty list, malformed array values, object.name missing/number, whitespace/Unicode, duplicates, mix (N1,N2,N6) |
| R02 `runnerLabelCompatible`: valid requested self-hosted, valid available, all labels subset; otherwise false | `queue for unsupported self-hosted labels is still counted in totals`; explicit label test | missing self-hosted, group-only, unknown labels, case normalization, duplicate/empty, subset/superset (N1,N6,N7) |
| R03 `isStandardGitHubHostedLabel`: OS prefix + supported suffix pattern, else false | `GitHub-hosted labels are recognized without inventing plan capacity` | ubuntu/windows/macos, latest/slim/numeric/dotted, malformed/private labels, Unicode/empty (N1,N6) |
| R04 `classifyJobLane`: invalid job unknown; known integer runner_id selfHosted; invalid/missing labels unknown; self-hosted label; standard hosted label; otherwise unknown | `primary running/queued counters include hosted and self-hosted jobs`, `missing job labels affect lane confidence` | known ID overrides labels, unknown positive ID, unsafe ID, conflicting labels, invalid shape, hosted suffix groups (N1,N6,N7) |
| R05 `summarizeRunnerState`: runner array validation, duplicate/invalid runner marks incomplete; ready/busy/offline counts; sort name/id | `capacity counts busy, idle and offline`; `conflicting jobs and duplicate runner inventory fail closed` | invalid values, collision, equal names stable tie-breaker, empty-known vs missing inventory (N1,N2,N6) |
| R06 job array validation, unique ID dedup/conflict, allowed statuses, malformed entries → jobsComplete false | `conflicting jobs and duplicate runner inventory fail closed` | duplicate identical/conflicting order, malformed id/status, complete flag false with observed jobs, empty-known vs absent (N1,N2,N5,N6) |
| R07 running vs queued vs waiting/pending/requested vs completed; incompatible labels tracked only with complete runners | `waiting environment approval does not inflate queued jobs`; `queue for unsupported self-hosted labels` | all statuses, unknown labels, empty inventory, only partial runner coverage (N2,N6,N7) |
| R08 `coverage` and `counts` are independent: jobsComplete != runnersComplete; unmatched queues unknown without inventory; unclassified lanes flag | `inaccessible runner inventory cannot erase complete hosted/job totals`; `incomplete jobs pagination makes totals unknown` | four coverage combinations, malformed payload combinations, no double count on duplicate jobs (N5,N6,N7) |
| R09 `checkedAt`: valid parseable string or null | derived formatting tests | UTC/timezone equivalent, DST, invalid date, nonstring, monotonic interpretation (N1,N8) |

## Verified branch groups: organization/personal billing collector

Source: `apps/desktop/ui/github-billing.mjs`.
Current suite: `tests/github-billing.test.mjs` (10 named cases).

| Branch ID / decision | Existing candidate | Additional planned variations |
| --- | --- | --- |
| B01 `billingMonth`: valid Date UTC or invalid class/clock | `only recognized direct-owner plans provide documented included allowances` | UTC year and month boundary, ±timezone equivalent, invalid class/NaN (N1,N8) |
| B02 personal/organization plan switch: only Free/Pro vs Free/Team; unknown/custom null | same | each supported case, casefold, all unsupported and nonstring (N1,N6,N7) |
| B03 gross quantity: usageItems array and <=500; required safe SKU/number; nonnegative, finite, sum bounded | `strict billing projections reject malformed, negative and enormous minutes` | 0/1/500/501, unsafe SKU, empty SKU, negative zero, decimal, rounding near MAX_SAFE_INTEGER (N1,N2,N6) |
| B04 `collectBillingUsage`: callable get required; scope safe name; org plan and org usage **independent settled results** | `billing requests use fixed owner paths`; `organization admin rejection is isolated`; `organization plan denial does not erase available usage` | independent success/failure/partial/malformed Cartesian sample, swapped org identity, invalid slug, 403/404/429 (N3,N5,N6,N7) |
| B05 personal: `/user` fetch fail/invalid login; supported plan; usage succeeds/fails; preserve plan after billing failure | `unsupported owner, missing identity and unknown plans fail closed`; `malformed personal usage is unavailable` | login formats, denied user, 429, malformed plan/missing name/length>40, partial owner independently (N1,N3,N6,N7) |
| B06 `createBillingCache`: dependency validation, disconnected clear, keyed organization/month, hit TTL vs expiry, in-flight dedup, generation invalidation, rejected request fallback | `billing cache coalesces concurrent reads` | exact TTL-1/TTL/TTL+1, month rollover, org casefold, permission/auth transition, older in-flight resolves later, failed read/backoff (N2,N3,N4,N5,N8,N9) |
| B07 free remaining is **never** inferred from gross SKU usage | `billing requests use fixed owner paths`; `billing hover stacks only compact verified owner fields` | high usage, 0 usage, plan unknown, multiple SKU; assert `remaining:null` (N6,N7,N10) |

## Remaining scope for Stage 4

Current branch groups above map four central production modules. They
are a **partial map**, not the completion of Stage 4. Remaining files
listed in `MODE_B_INVENTORY.md` require equally precise branch-to-test
enumeration, especially native keyring/HTTP/Git adapters, settings
transaction, OS surface lifecycle, release signing and R2 Worker.
No unlisted module is implicitly covered.

Next: inspect each remaining source function and test assertion; finish
Stage 4, then proceed to exhaustive Stage 5–8 matrices. No test code
written and no STABLE/known-FLAKY execution claimed in this stage.

## Mode B current-source branch coverage increment — 2026-10-29

The new tests and fixes are in the unpromoted code ancestry of
`dev`. Their presence is **not** a result from executing tests.
This register supplements, rather than replaces, the exhaustive
source-to-branch map still required for every remaining artifact.

| Branch group | Provenance and failure invariant | Current source tests |
| --- | --- | --- |
| COL01 kind=tasks with previous org different | old runners/counters/timestamp become unknown | `runner-collector.test.mjs`: Mode B org switch |
| COL02 kind=runners with selected repo set different | old jobs/clock become unknown, new runners stay valid | same: Mode B selection |
| COL03 scope names case/order differ but semantic selection equal | preserve existing jobs and timestamp | same: Mode B order/case |
| COL04 missing or contradictory previous scope | never trust old task coverage | same: Mode B missing scope |
| COL05 same org but repo change during tasks refresh | retain org-wide runners, replace jobs from new selection | same: Mode B same org |
| COL06 invalid org, repo names, kind, concurrency and every page bound | reject without any API request | same: Mode B invalid collector bounds |
| COL07 runner API malformed / 101 items | jobs stay independently complete; capacity unknown | same: Mode B oversize runner |
| COL08 job API malformed / 101 items | tasks unknown; verified org runner counts preserved | same: Mode B oversize job |
| INS01 installation row lacks safe ID/login | fail whole scope rather than silently skip one row | `github-installations-mode-b.test.mjs`: malformed |
| INS02 same ID/name across pages, case variation | one logical installation, no duplicate selector entries | same: overlap |
| INS03 same ID, different owner, or same owner different ID | fail closed; never choose an apparent sole account | same: conflict |
| INS04 response not an array / over 100 | reject incomplete provider projection | same: page shape |
| BILL01 UTC month at midnight with offset | use UTC billing period | `github-billing.test.mjs`: Mode B UTC boundaries |
| BILL02 SKU/cardinality/finite safe quantity 0/1/500/501 | reject bad provider quantity, do not claim safe totals | same: Mode B usage bounds |
| BILL03 old in-flight org result arrives after scope switch | old result must not overwrite current cached owner | same: Mode B stale org |
| BILL04 TTL-1/TTL, wall-clock rollback, disconnect | force fresh read at expired/unreliable boundaries | same: Mode B cache |
| STATE01 corrupted runner inventory versus valid jobs | runner capacity unknown, jobs remain complete | `runner-state.test.mjs`: Mode B malformed runner |
| STATE02 corrupted job inventory versus valid runners | job counters unknown, capacity remains valid | same: Mode B malformed jobs |
| STATE03 hosted/self-hosted label precedence | explicit self-hosted wins | same: Mode B lanes |
| STATE04 identical job IDs across pages | dedup counts only one job | same: Mode B duplicates |

**Mutation review design (not observed kills):**
The above scenario assertions are intended to detect removal of org/repo
comparisons, bypass of installation identity integrity, TTL boundary
off-by-one, fake-zero behavior and classification priority inversion.
A mutation score requires independently executing real source mutants.
No mutation outcome is inferred from these test names.

Native conditional code now receives platform-specific test execution:
Linux desktop `cargo test --locked -p repoticker --bin repoticker`
in Preflight, Windows same command in the unpublished Windows
acceptance job. Neither is equivalent to interactive installed OS QA.

- **INS05 — monitor integration:** `collectForAccount` must reject a mixed valid/corrupt installation inventory before invoking repository or task requests. `github-installations-mode-b.test.mjs` tests this with an injected read-only provider.

## Notification date validity — additional branch evidence

- CI01 Native GitHub completed-run `updated_at` accepts exact
  canonical UTC seconds only: year/day/month/leap/time cases in
  `github_api.rs` embedded Rust tests.
- CI02 JS notification tracker rejects normalized impossible dates
  rather than trusting `Date.parse` alone; test in
  `tests/ci-failure-events.test.mjs` proves no partially advanced
  history and valid leap day continues to notify once.
- CI03 Executable M11 mutation replaces canonical JS date comparison
  with unconditional acceptance and must be detected by the same
  notification invariant assertion.

These are source scenarios, not executed CI evidence or a general
percentage of native API branch coverage.
