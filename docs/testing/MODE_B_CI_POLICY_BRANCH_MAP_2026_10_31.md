# Mode B — CI admission and scope branch-to-test map (2026-10-31)

Source SHA: `faa65f15a7b1a28e35598d632c712707476186de`, branch `dev`. Target: Mode B Stages 3–8, **CI policy family only**. This is a current-source traceability increment, not a repository-wide branch inventory, per-branch execution trace, mutation result, or v1.0 release sign-off.

## Evidence distinction

[Preflight #41144112612](https://github.com/morozhenko-apps/repoticker/actions/runs/41144112612) at this SHA finished **success**: the `ui` job includes `tests/test_ci_policy.py`. Its JavaScript V8 pass count was **549/549**; that count excludes Python, Rust and platform acceptance. [Unpublished Windows/KDE candidate #41144112562](https://github.com/morozhenko-apps/repoticker/actions/runs/41144112562) succeeded but does not certify a physical installed OS session. Individual shell fault-injection below describes what existing test *assertions* exercise, not a newly recorded instrumented branch percentage.

The adjacent 2026-10-29 CI-only changes by another agent are owned source and intentionally **not edited** in this Mode B mapping. `AGENTS.md` requires non-polling CI and a docs-only commit must not trigger ordinary Preflight.

## Branch decisions and existing assertions

| ID | Exact source branch / invariant | Existing test assertion | Gap or acceptance limit |
| --- | --- | --- | --- |
| CI01 | `ci-pr-scope.sh`: missing `GITHUB_OUTPUT` exits before any classification | `test_GivenMissingMetadataOrExplicitDispatch_WhenClassified_ThenNoFalseSkipIsProduced` checks missing variable | Output path that is unwritable, or write itself failing, is governed by `set -e` but not separately injected |
| CI02 | `pull_request` only; `git rev-list --parents` must return exactly two merge parents | same missing-metadata test checks an unmerged/non-merge pull request fails | Corrupt Git metadata and failed `git rev-list` need separately attributed negative evidence |
| CI03 | No empty merge diff; failures must not become prose-only skips | same test checks malformed inputs, and real Git fixture exercises changes | Explicit unchanged-tree merge has not been asserted as an isolated exit case |
| CI04 | NUL-delimited `git diff --no-renames` classifies both rename sides | `test_GivenRealGitChanges_WhenClassified_ThenOnlyKnownProseSkipsAndBothRenameSidesCount` covers both code-to-doc and doc-to-code renames, newlines in path, deletion | Git errors/inaccessible object are not injected; exit behavior is inherited from `set -e` |
| CI05 | Exact prose-only allowlist: root README/AGENT/AGENTS, docs Markdown, .github/agents Markdown, etc.; unknown/nested paths require checks | real Git fixture covers docs MD-only, docs JSON, config, nested README, unknown, mixed source + prose | Each enumerated allowlist spelling has not been separately tested; this is a source contract, not exhaustively executed values |
| CI06 | `push` and `workflow_dispatch` always require verification; unsupported events fail | missing-metadata test covers both accepted events and rejects schedule/empty | GitHub event provenance itself cannot be simulated by local shell fixture |
| CI07 | `preflight.yml` push prose-only path filtering, PR unconditionally in scope | `test_GivenOrdinaryJobs_WhenParsed_ThenBudgetsDAGAndTrustRemainStrict` checks no PR path filter; shell classifier checks PR | GitHub-hosted path-filter behavior must be accepted by platform Actions semantics, not solely YAML parse |
| CI08 | Scope result `required=true` executes core, UI, desktop once; `false` skips all three | same YAML graph test verifies `needs: scope` and exact worker `if` | Simulated outcome tests do not exercise GitHub scheduler itself |
| CI09 | Final `Preflight result`: require `scope=success`; for true, worker results all `success`; for false, all `skipped`; else fail | `test_GivenDependencyOutcomes_WhenAdmissionRuns_ThenOnlyExactApplicableEvidencePasses` invokes actual Bash result step across all worker result permutations | GitHub job cancellation and missing output are represented by synthetic strings; provider runner behavior is external |
| CI10 | Worker-specific job deadlines 5/10/20 min; whole gate fails on missing job or continue-on-error | YAML graph test asserts exact budgets, job count, and no `continue-on-error` | Real timeout termination is not separately physically induced |
| CI11 | Credential isolation: checkout `persist-credentials:false`, `permissions:contents:read`, no secrets expression | trust assertions in YAML graph and `test_GivenManualStableGate_WhenParsed_ThenOnePassAndTrustedBoundariesRemain` | No evidence of a compromised external checkout action; CI runner security belongs to provider boundary |
| CI12 | Only trusted `dev` non-PR executions may write Rust cache; cache keys distinct | `test_GivenCachesAndCommands_WhenParsed_ThenOnlyTrustedWritersAndOneStablePassRemain`, strict policy test | Cache poisoning resistance is contract-based; not an executed attack simulation |
| CI13 | `--locked` Cargo commands and each stable suite exactly once; no 10× loops | same cache/commands and strict policy tests | Final frozen-RC **STABLE** gate has not yet been executed as a distinct release admission |
| CI14 | Native Linux desktop unit test and Windows acceptance candidate remain independent of docs-only skips | `test_release_native_gate_contract.py` checks required native commands, fail-closed desktop result, Windows candidate | Installed KDE/Windows validation and signed APT/public R2 readback are separate G2/G3/G8 gates |
| CI15 | `strict.yml` is manually dispatched; one stable pass; no auto 10× or PR cache writes | `test_GivenManualStableGate_WhenParsed_ThenOnePassAndTrustedBoundariesRemain` | The owner-approved final RC manual strict execution, known-FLAKY registration and exact-SHA evidence remain pending |

## Positive / N1–N12 applicability for this source family

**C** = existing case source names an applicable assertion (not proof of full variation coverage). **P** = applicable but still needs a specific fault/acceptance case. **NA** = not applicable at this pure CI-policy boundary.

| Flow | Positive | N1 | N2 | N3 | N4 | N5 | N6 | N7 | N8 | N9 | N10 | N11 | N12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PR merge diff classifier | C | C | C | NA¹ | C | P | C | NA² | NA³ | P | NA² | NA⁴ | NA⁵ |
| Workflow scope / admission | C | C | C | P | C | C | C | C | P | C | C | NA⁴ | NA⁵ |
| Rust/Node/Python stable gate | C | NA⁶ | C | P | C | C | C | C | P | C | P | NA⁴ | NA⁵ |
| Unpublished native platform candidate | C | NA⁶ | C | P | P | P | P | C | P | P | P | NA⁴ | NA⁵ |

¹ Classifier operates on locally supplied Git refs, not network provider errors. Git object failure is N6 rather than pretending a successful classification.

² Classifier does not consume credentials or emit secrets; only the changed-file paths are read. Paths are local trusted Git metadata, not external logs or UI rendering.

³ No clock, calendar, time zone, or translation decision. Job deadlines belong to the workflow row.

⁴ RepoTicker has no purchase/entitlement; N11 is not applicable to CI.

⁵ A test runner classifies/executes checks, it does not persist user application state. Git's temporary output file is covered under process failure tests, not a persisted app restore gate.

⁶ Workflow orchestration accepts fixed typed configurations; boundary N1 for user-provided inputs is checked at the workflow schema/classifier, not each stable test command.

## Remaining evidence to close this family at frozen RC

- Reconcile changed-file workflow scope and actual GitHub Actions provenance after any CI configuration changes.
- Decide whether isolated empty-diff, unwritable-output and missing-Git-object fault injections are warranted by source risk, and keep each as a separately traceable case if added.
- Verify current release tag provenance and package publishing **elsewhere**; CI policy mapping cannot close distribution integrity.
- Execute final STABLE and separately registered known-FLAKY (if any) once on the frozen RC SHA, with exact outcome records.
- Mark CI branch family ready only after those release gates; do not infer whole-product completion from 549 JS tests.

**Overall Mode B Stage 3–8 remains partial.** Rust core, native desktop, JS controller, Python release/distribution and shell-source maps have separate partial documents and require final reconciliation into the complete artifact-level Positive/N1–N12 matrix. No production code or workflow was changed by this documentation-only increment.
