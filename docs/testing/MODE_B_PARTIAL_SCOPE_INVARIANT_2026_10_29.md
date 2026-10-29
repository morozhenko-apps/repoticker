# Mode B: prevent cross-scope partial monitor state reuse

Date: 2026-10-29. Baseline `e4e45d2b8c961bacd30662561a1fb740257046ff`. Scope: pure
`apps/desktop/ui/runner-collector.mjs::collectRunnerState` and
existing `tests/runner-collector.test.mjs`.

## Contract / observed root cause

The collector supports cheap `kind="runners"` and `kind="tasks"`
refreshes. Its `previousState` carries runner inventory,
task details and timestamps, but the implementation initially used
them without validating the previous `scope`. If a selected repository
set changed, a runners-only refresh could project the old selection's
job counts as complete under the new scope. If the organization changed,
a tasks-only refresh could reuse the other organization's runner
inventory. This risks misleading trusted counters and cross-scope
names in local UI. No transport data, credentials or account identifiers
are added to the public report.

Plausible boundaries examined: missing current scope validation;
selected repository changes during UI refresh; org switches; partial
refresh design; stale checkedAt timestamps; case/order differences;
previous incomplete coverage. Direct source analysis identifies
unconditional reuse of `previousState` as the root cause.
`scope` is already present on the normalized returned snapshot.

## Chosen invariant and treatment

- Previously fetched **runner inventory** is reusable only for the
  *same organization* (case-insensitive, GitHub owner semantics). A
  changed selection in that org does not invalidate org-wide runners.
- Previously fetched **task/job inventory** is reusable only for the
  same organization **and same normalized set** of selected repository
  names; order and case are semantically irrelevant. Missing
  provenance never authorizes reuse.
- Invalidated skipped components become `null`/unknown coverage,
  never fabricated zero, with `null` stale timestamp; independently
  fetched components remain usable and fresh.
- This does not solve an account/token-generation change within the
  same organization; native session invalidation must still gate
  auth identities. Cross-organization scope invalidation applies
  unconditionally at this pure projection boundary.

## Test matrix / mutation proofs

Positive: matching-scope refresh preserves previously complete
counters and timestamps. N1: missing/malformed provenance refuses
reuse. N4/N5: scope transition while an unrelated lane is refreshed.
N6: partial snapshots cannot masquerade as complete; stale timestamps
must disappear. N7/N10: no other organization's runner identity
may leak into a different org's results. N8: repository case/order
equivalence must preserve previous tasks. N12: an unavailable skipped
component remains unknown.

Mutations to detect: drop org comparison; ignore repo set;
incorrectly invalidate org-wide runners on selection-only changes;
mark unknown counts zero; retain checkedAt on invalidated data.

The source/test commit is isolated. Full STABLE suite runs only at the
final coherent gate. No live GitHub API, published release or
runner credentials touched.
