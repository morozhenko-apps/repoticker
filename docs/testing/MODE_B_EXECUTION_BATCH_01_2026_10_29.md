# Mode B — test implementation batch 01 (fail-closed boundaries)

**Date:** 2026-10-29. **Source basis:** `cd0fea9029a429d6037f9dc11b6cf80a5f6f572e`.
**Primary mode:** B — Testing. User has authorized proceeding until
actual test submission; Windows/KDE installed acceptance remains
after Mode B. Mode B source gate is not yet accepted.

## Step 1–2: inspected branches and gaps

Source evidence:
- `MODE_B_GIT_SAFE_SYNC_BRANCH_EVIDENCE_2026_10_29.md`
- `MODE_B_R2_PUBLICATION_BRANCH_EVIDENCE_2026_10_29.md`
- `MODE_B_AUTH_RATE_BRANCH_EVIDENCE_2026_10_29.md`

The Git `ls-remote` parser **already has** focused in-module
positive and negative tests at `git.rs::remote_branch_parser_tests`.
Do not duplicate it. In `lib.rs::classify_sync`, simultaneous
unsafe conditions and u64 count boundaries have not been asserted
together; the explicit decision order is a safety contract.

In `github_auth.rs`, baseline cases cover the happy flow and
some expiration boundaries but not the full constructor 0/1/3600/3601
cross product, exact terminal-state transitions after a late reply,
multiple consecutive `slow_down` windows or saturated timestamp
handling. In `github_rate_gate.rs`, a 403 permission rejection is
already tested, but reset exact-time and malformed numeric header
precedence require explicit assertions.

In `r2_release.py::publish`, the code refuses an existing receipt
*before* source map, boto3 construction, S3 writes and public reads.
No focused test demonstrates this no-side-effect early exit, nor
invalid run ID before a client is created.

## Step 3–8: scoped function/test matrix

This is an **implementation slice** justified by the existing
domain-level maps, not a false claim that every function in the
application has been fully mapped.

| Function | Positive | N1 invalid | N2 boundaries | N3 network | N4 retry | N5 race | N6 corrupt | N7 auth | N8 time | N9 cancel | N10 privacy | N11 paid | N12 disk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `classify_sync` | existing | existing | **add** max counts | N/A pure | N/A pure | **add** priority combos | existing | N/A no auth | N/A no clock | N/A pure | N/A pure | N/A free | N/A pure |
| `DeviceSession::new/next_poll/receive/cancel` | existing | **add** invalid constructor | **add** 0/1/3600/3601/MAX | N/A pure | **add** multiple slowdowns | **add** terminal late reply | existing | existing | **add** exact expiry | **add** double cancel | existing | N/A free | N/A pure |
| `TokenExpiration::decide` | existing | N/A typed | **add** saturation | N/A pure | N/A pure | existing | N/A typed | existing | **add** equality | N/A pure | N/A pure | N/A free | N/A pure |
| `backoff_duration` | existing | **add** malformed headers | **add** reset boundaries | existing | existing | existing gate precedence | existing | **add** permission vs rate | **add** reset time | N/A pure | existing | N/A free | N/A pure |
| `publish` preflight | existing | **add** invalid run ID | existing | N/A blocked before network | **add** receipt idempotency | N/A pre-client | existing | existing | N/A no clock | N/A synchronous | no raw token output | N/A free | **add** existing file |

## Implementation and evidence contract

1. Add Rust domain-only tests in `lib.rs` and
   `github_auth.rs`, and native rate-gate unit tests in
   `github_rate_gate.rs`. No runtime Git command, native
   authorization policy or provider endpoint changes.
2. Add offline Python publication preflight tests to
   `tests/test_release_r2_contract.py`. These must fail
   before `boto3` or public network, using a sentinel
   output file and an explicit `boto3` poison fake.
3. This batch does NOT alter immutable R2 creation strategy,
   last-pointer commit semantics, or external object locking.
   Race gaps remain release blockers requiring independent
   architectural decisions/validation; mark them OPEN.
4. One atomic code+test commit for this bounded test tranche,
   separate from this `docs:` plan. Native Rust formatting
   and tests and full JS/Python preflight are external CI
   gates; no full-suite PASS without exact-SHA evidence.
5. Rollback by reverting only the new tests. Keep prior tests
   and all production assertions untouched. No tag, main
   merge, release workflow trigger or R2 write.

**Exit:** emit the code/test commit on `dev` so standard
Preflight and desktop candidate tests can process it.
Do not mark Mode B completed, but a **submitted test batch**
is an allowed user-requested stopping boundary.
