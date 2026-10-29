# Mode B — consolidated GitHub collector and error-path test batch 03

**2026-10-29; base dev:** `07e01653c374c290bc73777f7889dcd9060ccc8f`.
**Mode B — Testing only.** This batch will be published with one
final `dev` fast-forward, including all docs and test code.
No intermediate ref updates or CI churn. Native Windows/KDE
acceptance remains after Mode B by owner decision.

## Step 1 analysis, root-risk review

Reviewed current production and regression assertions in:
`github-monitor.mjs`, `github-installations.mjs`,
`runner-collector.mjs`, `runner-state.mjs`,
`ci-failure-events.mjs`, and their direct `tests/*.test.mjs`.
Existing tests cover normal startup, stale account monitoring,
running/queued separation, job-vs-run units, basic pagination,
notification baselines, API 403/429, and nested concurrency.

Remaining branch boundaries warrant deterministic **new**
assertions, without changing production semantics:

1. Exact monitor refresh-delay thresholds, malformed/negative
   repository counts and conversion to a conservative interval.
2. Authorized repository selection: malformed names and external
   organizations rejected before REST reads; incomplete paginated
   installation inventory must not fabricate a selected account;
   partial explicit selections must report inaccessible repositories.
3. Narrow monitor refresh: unrelated group's coverage/timestamp,
   runner identities and known/unknown counts are preserved only
   within the exact same selected scope; failed targeted group
   invalidation must not repaint old counts as current.
4. Nested Actions collector: input validation prior to native
   calls, job-pagination limits, unique run ID deduplication,
   cross-repository coverage and correct partial error types.
5. CI completed run tracker: first baseline suppression,
   distinct run attempts, temporary HTTP failure and recovery,
   invalid full batch atomicity and account switching.
6. Safe user-facing failure projection: known native errors
   categorized exactly, unknown arbitrary strings redacted.

## Scoped positive/N-category selection

| Tested surface | Positive | N1 malformed | N2 bounds | N3 HTTP | N4 retry | N5 concurrency | N6 corrupt | N7 scope/auth | N8 locale/time | N9 cancel | N10 privacy | N11 billing | N12 storage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| monitor delay + selection | Existing | Add | Add | Add | N/A: no retry | Existing | Add | Add | N/A: no clock | N/A pure | Add | N/A | N/A |
| targeted merge/invalidate | Existing | Add | Add | N/A pure | N/A | Add scope isolation | Add | Add | Add clock preservation | N/A | Add | N/A | N/A |
| runner/job collector | Existing | Add | Add | Add | N/A | Add nested scope | Add | Add | Add checkedAt | N/A | Add | N/A | N/A |
| CI completed run tracker | Existing | Add | Add | Add | Add recovery | Add atomic validation | Add | Add | Add attempt timestamp | Add opt-out baseline | Add | N/A | N/A |

All new tests use offline fake `get(path)` transports, synthetic
account/repository names, bounded promise continuations and no
real credentials, Git writes or network access. New tests and
production modules remain separate; do not mock the subject
under test.

**Implementation:** one new stable Node test module with independent
domain-driven cases; retain old suites unchanged. No mutation to
production/auth contracts, release pipeline, or R2. If a failing
test detects a genuine production design defect, preserve its
assertion and follow the architectural stop-factor policy.

**Validation:** assess syntax and execute the new cases locally
against source-defined production functions if possible. A focused
V8 harness is not a substitute for `node --test` or full Node 24
STABLE on CI. Do not mark unrun Rust/Python/desktop gates as pass.

**Rollback:** revert only the test-source commit. Do not alter the
legacy Mode B matrices or weaken failing stable assertions.

**Status at plan creation:** NOT YET IMPLEMENTED OR SUBMITTED.
