# Mode B — API trust boundaries and incomplete-scope consistency (batch 04)

**Date:** 2026-10-29; **baseline:** `068690cf5aa04bc5f2912ca36a2e89715d196db3`; **primary mode:** B — Testing.
Batch plan is staged without updating the `dev` ref. Only one final
fast-forward publication is permitted after the complete changeset
and the focused validation. Windows/KDE and independent locale
acceptance follow Mode B and still gate the public v1 release.

## Stage 1 / source-to-branch review

Directly inspected `github-installations.mjs`, `github-monitor.mjs`,
`runner-collector.mjs`, `ci-failure-events.mjs`, current monitor
integration tests and Mode B batch 03. No network or credential data
are required for deterministic boundary tests.

**Confirmed defects / expected versus actual:**

- **D1 — incomplete installed repository scope:** `collectForAccount`
  correctly reports `coverage.jobs=false` when a bounded all-repos
  traversal did not reach the end, but clears only the headline
  running/queue counts. It leaves `runningLanes`,
  `queuedLanes`, lane job arrays, unclassified/observed counts
  and `checkedAtTasks` partially inconsistent. The independent
  runner inventory can still be valid. Existing
  `invalidateMetricGroup(state, "tasks")` now provides the
  contract-complete task invalidation operation.
- **D2 — invalid exact repository names:** the installation scope
  matcher checks only the first two slash-separated components of a
  returned `full_name`; an extra suffix can survive an unfiltered
  all-repos listing. The explicit scope validator permits literal
  `.` and `..` repository components and duplicate case variants,
  even though the downstream runner collector rejects some of them.
- **D3 — invalid API page cardinality:** unlike the completed CI-run
  collector, installation and runner/job pagination accept pages
  containing more than the requested `per_page=100`. A malformed
  oversized page can be treated as a valid partially known
  installation or runner/job inventory.

**Root cause differential (R1–R4):** (1) collection completion status
is propagated, but invalidation allowlist is incomplete (D1);
(2) network/HTTP error classification (not relevant: synthetic
successful malformed JSON reproduces D2/D3);
(3) stale account revision after async request (not required for
reproduction, already guarded by monitor revision);
(4) renderer translation/number formatter (not relevant: raw
state contains contradictory values);
(5) parser uses `split("/")` parts without checking exact arity (D2);
(6) validation omits the advertised API page cardinality (D3).
The fixes target D1, D2, D3 only, not generic retries or error masking.

## Scoped invariant-preserving correction

1. In the existing read-only GitHub installation parsers, reject
   pages with more than 100 entries. Filter malformed account names,
   reject `.`/`..` and enforce exactly `owner/repository` for
   each returned full name; no canonical URL rewriting or new scope.
   Reject case-insensitive duplicate names in the user-selected
   repository list *before* collecting Actions job data.
2. In the job/runner page helper, reject pages exceeding 100
   entries with the existing bounded `Unexpected GitHub API
   response` error, which the collector translates into unknown
   coverage. A bad page cannot become an authoritative zero.
3. On incomplete *unfiltered* installation inventory, reuse the
   existing `invalidateMetricGroup(state, "tasks")` rather than
   selectively nulling only headline fields. Preserve independent
   runner capacity, auth identity and the original collected state;
   add one bounded `incomplete` diagnostic. Explicit selected
   repositories still require all requested names and exact scope.
4. Add deterministic direct-API and cross-module regression tests:
   page 100 versus 101, malformed names and extra slash, scope
   duplication/invalid traversal, incomplete flags and derived
   metrics, filtered selection behavior, valid pages, runner/job
   oversized responses, known zeros versus unknown, and original
   provider-object immutability.

**No new persistence or public API, no expanded authorization,
no cache/scope rewrite, no new Git/R2 operation.** Failure handling
remains conservative and does not reveal provider data. These are
corrections to the established protocol validation and unknown-vs-zero
contract, not an authorization-policy redesign.

## Stage 3–8 scoped coverage map

| Function / branch | Positive | N1 malformed | N2 page bound | N3 HTTP | N4 retry | N5 async/scope | N6 response | N7 trust | N8 locale/time | N9 cancel | N10 privacy | N11 billing | N12 storage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| listAvailableInstallations | Existing | Add invalid names | Add 100/101 | Existing | N/A no retry | Existing | Add malformed arrays | Add dot names | N/A | N/A | Existing | N/A | N/A |
| listInstalledRepositories | Existing | Add nested/slashed | Add 100/101 | Existing | N/A | Existing | Add payloads | Add exact name match | N/A | N/A | Add no leakage | N/A | N/A |
| collectForAccount | Existing | Add selected dots/dup | Existing | Existing | N/A | Add scope isolation | Add partial inventory | Add fail-closed scope | N/A | N/A | Existing | N/A | N/A |
| collectRunnerState/getPages | Existing | Add broken payload | Add 101 list | Existing | N/A | Existing | Add jobs/runners/run pages | Existing | Existing timestamp | N/A | Existing | N/A | N/A |
| invalidateMetricGroup | Existing | N/A typed | Add all derived fields | N/A pure | N/A | Add cross-scope | Add stale groups | Existing | Check timestamps | N/A | Existing | N/A | N/A |

Existing named tests are candidate evidence, not executed results.
Mode B whole-project Stage 3–8 remains incomplete; this is a bounded
critical-flow slice with exact branch assertions.

## Rollback and validation

- Docs plan commit precedes code/tests; production repair plus direct
  regression tests form an atomic `fix:` commit. Final evidence is
  a separate `docs:` commit. Publish the complete chain in one
  `update_ref` fast-forward.
- Verify modified JS parses. Run focused test cases on actual GitHub
  source functions in an isolated JS executor. If feasible run the
  final full Node STABLE once. Never present isolated V8 as full Node.
- After final push the workflow may run; **do not poll** its status.
  Preserve immutable release resources, tags, main and Cloudflare R2.
- Remaining Mode B release blockers: exact-SHA stable Rust/Node/Python
  CI evidence, exhaustive branch/mutation review, R2 external writer
  atomicity/latest-pointer recovery and deferred physical UI/L10N
  acceptance.

**At plan creation:** implementation not yet committed or pushed.
