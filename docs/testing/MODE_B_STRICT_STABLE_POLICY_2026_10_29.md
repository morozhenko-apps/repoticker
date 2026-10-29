# Mode B strict stable verification policy

Date: 2026-10-29. Initial source: `dev` at `1dcd784938f9782c3197bb1ae138dd384169e212`.
Mode B — testing infrastructure; this is not a release or a complete
Stage 3–12 campaign report.

## Confirmed issue and rationale

The manual `.github/workflows/strict.yml` runs a ten-pass
`cargo test --locked -p repoticker-core` / `node --test tests/*.test.mjs`
loop. The approved current Mode B strategy requires one normal STABLE
gate at final completion; repeatability loops are allowed only as
explicitly justified diagnostics of a known race. Ten uniform repetitions
consume runner time and do not supply the missing per-branch, mutation,
native OS or locale acceptance evidence.

Six plausible sources of excess work to check were: repeated Rust tests,
repeated JS tests, scheduled trigger, duplicate push/PR trigger,
unbounded workflow retries, and duplicate downstream desktop builds.
Direct workflow inspection identifies the explicit `for pass in {1..10}`
loop as the cause within strict.yml; the workflow has only
`workflow_dispatch` and no other jobs. No timer, workflow retry or
automatic trigger is present in the source. No runtime bug is implied.

## Smallest compatible change

Retain the workflow name, manual-only trigger, `strict-${{ github.ref }}`
serialized concurrency and existing Rust/JS test commands. Replace the
ten-run loop with a single stable execution of Rust fmt, Rust core tests,
Clippy and Node tests, and add the existing Python release contract suite.
Install the same required Python release dependencies as in Preflight.
Do not turn failures into successful results; no `continue-on-error`,
skips or `|| true`. Do not declare a known-FLAKY group absent from a
written inventory; if it is later registered, run it as a **separate**
explicitly visible job/gate, never merged into the stable exit status.

This is a manual supplementary source-quality gate; Preflight independently
owns Linux desktop compilation. Full Windows/KDE physical and 20-locale
review remain separate mandatory v1 acceptance. No main/tag/R2 writes.

## Regression and evidence

Add `tests/test_release_strict_contract.py` to assert manual dispatch
only; each required stable command appears exactly once; mandatory
toolchain/Node/release dependencies are present; no repeat loop,
skip or failure-suppression flags. The file is included in Preflight's
existing `test_release_*.py` discovery and does not depend on external
YAML libraries.

Pre-submit isolated validation of the planned files (not a repository
stable run): PyYAML BaseLoader parsed manual dispatch and nine YAML steps;
`python -m unittest discover` of the isolated test file ran 3/3 PASS.
This does **not** prove GitHub Actions runtime or a frozen RC gate.

Before any version 1.0 release, execute the official Preflight and
approved final stable/known-flaky protocol on the candidate SHA;
capture exact run time, SHA, status and physical evidence. Do not
poll external CI after submission.

Rollback: revert the isolated workflow and contract-test code commit.
Retaining plan documentation is harmless. No published build changes.
