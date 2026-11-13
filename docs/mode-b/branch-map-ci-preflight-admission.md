# Mode B: Preflight PR scope admission and manually dispatched Strict stable gate

Source baseline: `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Branch `audit/mode-b-testing`, parent `70fbb829b47497b7a7836958e32624c5c543eef4`.
Source blobs: `scripts/ci-pr-scope.sh` `07058ff9932b4f14b9964b927522d62fb3b20b37` (25 source lines); `.github/workflows/preflight.yml` `4118a46be27a46fd1082a0ba6a1efb85826f237a` (164 lines); `.github/workflows/strict.yml` `611000e55bba0b5a4ba75a064fc0716aa34c2548` (52 lines). Direct test sources: `tests/test_ci_policy.py` `f43796c3caee41c958a598139064e48b9e03a681` (**6 Python tests**), `tests/test_release_native_gate_contract.py` `477e6213296800a28085788ef6662c134ebcf36d` (**3 static Python tests**), `tests/test_release_strict_contract.py` `7c529113db0e8eb66c3b496859bf62775ce260d9` (**3 static Python tests**).

**Evidence rule:** `test_ci_policy.py` parses actual YAML with PyYAML BaseLoader and directly executes the real Bash gate and `ci-pr-scope.sh` with temporary **real Git repositories**. Native-gate and strict-contract tests inspect workflow source only; they do **not** execute GitHub Actions. No CI run, Bash test suite or deployment was started by this continuation.

## Concrete direct assertions inspected

- `test_GivenOrdinaryJobs_WhenParsed_ThenBudgetsDAGAndTrustRemainStrict`: exact 5 jobs, timeouts 5/20/10/20/5, read-only top-level permissions, source-scope worker dependencies and exact `always()` aggregator, no job or step `continue-on-error`, no persisted checkout credentials or referenced `secrets`.
- `test_GivenCachesAndCommands_WhenParsed_ThenOnlyTrustedWritersAndOneStablePassRemain`: two distinct Rust cache keys; writes only on `dev` and not PRs; exact once for Rust core/desktop and Python release tests, every applicable `cargo test/check/clippy` uses `--locked`, no ten-pass loop.
- `test_GivenDependencyOutcomes_WhenAdmissionRuns_ThenOnlyExactApplicableEvidencePasses`: runs the **actual final Preflight Bash** for `REQUIRED=true` (each core/UI/desktop exactly success) and `false` (each exactly skipped). Any one failed, cancelled, empty or contradictory result fails; bad scope/missing/unknown required fails.
- `test_GivenRealGitChanges_WhenClassified_ThenOnlyKnownProseSkipsAndBothRenameSidesCount`: initializes temp Git, commits base, creates real PR branch and two-parent merge; invokes actual script with GITHUB_OUTPUT; only known prose paths skip; mixed source+docs, delete, rename **both directions**, newline filename, unknown config require full tests.
- `test_GivenMissingMetadataOrExplicitDispatch_WhenClassified_ThenNoFalseSkipIsProduced`: `push` and `workflow_dispatch` always require full tests; unknown event, absent output and unmerged PR fail closed.
- `test_GivenManualStableGate_WhenParsed_ThenOnePassAndTrustedBoundariesRemain`: Strict `workflow_dispatch` only, read-only permissions, exact one core/JS/Python test invocation, checkout credentials false and cache write only trusted `dev`.
- `test_release_native_gate_contract.py`: native Rust desktop `cargo test --locked -p repoticker --bin repoticker` appears exactly once in Preflight desktop; Windows candidate also covers this and core Windows process tests; aggregator requires desktop result.
- `test_release_strict_contract.py`: `workflow_dispatch` only; one pass per stable command, Node 26.13.0, no skips, silent quarantine, broad `continue-on-error`, forced repeated runs or test-name filtering.

## Exact `ci-pr-scope.sh` outcome ledger

| Branch | Meaningful outcome | Direct test / remaining |
| --- | --- | --- |
| `set -euo pipefail` plus required `GITHUB_OUTPUT` | Missing output path aborts, not a success/skip | E missing output; ? unwritable path and malformed path |
| Default `required=true` | `push` and manual dispatch always full checks; unknown event fails | E both and unknown event |
| `pull_request` merge parent count | Require exactly two parents on HEAD; an unmerged PR or unrelated initial commit fails | E unmerged PR refusal |
| `git diff --no-renames --name-only -z parent1 HEAD` | Full merge result, NUL path safety, both sides of rename reflected as removal/addition; empty diff refuses | E temp merge cases for both rename directions and newline path; ? escaped leading dash and invalid Git refs |
| Allowed prose paths | Only `docs/*.md`, `doc/*.md`, root README/AGENT/AGENTS/CHANGELOG/CONTRIBUTING, `.github/agents/*.md`, `.codex.md` are skippable | E root docs, nested docs, prose rename/delete; ? case-insensitive platform path edge |
| Any nonprose | JSON/config, UI-local README, `.unknown`, other md, source, mixed source+docs => `required=true` | E 14 concrete Git fixture cases |
| Output writer | Exactly `required=true\n` or `false\n`, read by dependent `scope` job | E exact output assertions; ? write I/O error |

## Preflight workflow branches and trust boundary

| Gate | Contract at exact source | Evidence / unverified |
| --- | --- | --- |
| Event selection | `push` only to `dev/main` with `paths-ignore` for known prose; PRs targeting `dev/main` have **no PR path filter**; `workflow_dispatch` manual | E YAML and classification tests, no live trigger run this turn |
| Scope job | checkout full git history (`fetch-depth:0`, no stored credentials), call real classifier; emits `required` | E script in temp Git; ? GitHub-specific PR synthetic merge topology outside fixture |
| format_and_core | Only if `required=true`, Rust fmt/core tests/Clippy `--locked`; 20 min | S exact job/commands; existing baseline Preflight success is separate historical evidence |
| ui | Only if `required=true`, Node 26.13.0 syntax of model/view/app, all Node `tests/*.test.mjs` with `--experimental-test-coverage`, release Python and CI policy tests; 10 min | S source and exact counts; measured UI coverage remains partial, `app.mjs` uninstrumented in report despite syntax check |
| desktop | Only if `required=true`, real Linux Tauri check and native Rust desktop tests; 20 min | S source; physical KDE and Windows acceptance are **not** implied by Linux compile |
| final `preflight` | `always()`, after scope/core/ui/desktop; accept only exactly 3 successes for source changes, or exactly 3 skipped for prose-only PR; never trust a failed/absent scope | **E actual Bash script tested with parameter combinations**; ? Github Actions cancellations/delayed jobs need hosting acceptance |
| Rust caches | Two distinct keys, no PR writer, dev-only save | E YAML structure assertion; no cache runtime claim |

## Strict stable gate and differences

`strict.yml` is **manual-only** (`workflow_dispatch`), with `cancel-in-progress:false` and read-only permissions; includes Rust fmt/core tests/Clippy, all Node tests, Python `test_release_*.py` and `test_ci_policy.py` **once each**. It does **not** itself include Linux `cargo test -p repoticker --bin repoticker` (native desktop tests are in Preflight and Windows acceptance). Do not call Strict alone equivalent to a complete OS STABLE/FLAKY/physical release gate.

## Cross-workflow gaps and proposed Stage 9 tests

- CI-A1: real Git merge fixture with prose-to-prose rename, source-to-doc and doc-to-source rename, missing output and empty merge, verify correct fail-closed scope. Most of these already tested; do not duplicate.
- CI-A2: assert exact 5-job DAG, every conditional worker and final gate admit only correct all-success/all-skipped states; existing Bash test robust, add failures only for genuinely missing states if found.
- CI-A3: hostile GITHUB_OUTPUT path or Git command failure, invalid event metadata and filenames unusual on Linux, no false skip.
- CI-A4: workflow YAML parser consistency, path-ignore list vs Bash prose allowlist drift and runtime Actions merge environment; record any difference as contract question, not auto-modify triggers.
- CI-A5: final Strict on exact last test commit after Stage 9/10, separately track Windows/KDE and native acceptance. No full suite after each doc.

Positive/N1–N12: Positive E real Git/bash scope and aggregator; N1 E invalid event/status; N2 E 5 jobs / path partitions; N3 NA no network in classifier (GitHub runners external); N4 E repeated scope distinct events; N5 ? GitHub cancel/skip race; N6 E malformed/unmerged merge; N7 E read-only/persist-credentials false; N8 NA no time logic; N9 ? cancelled Actions dependency; N10 E no secrets in workflow, runtime log/sandbox ?; N11 NA; N12 ? output file unwritable. Stage 3–8 remains PARTIAL. All code/test/workflow files unchanged.
