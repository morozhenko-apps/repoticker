# Mode B activation — source-validation first, OS acceptance afterwards

**Owner decision (2026-10-29):** Start Mode B testing immediately after
the existing L10N-20 implementation pass. Execute full Windows/KDE
installed acceptance **after** Mode B instead of using independent locale
acceptance as a prerequisite to starting Mode B. This supersedes only
the *sequencing* in the earlier L10N-first campaign documents. It does
**not** waive the 20/20 independent language/context acceptance, OS
visual/input/accessibility QA, Git safety, signed distribution checks,
or exact-SHA passing CI before the final v1.0 release.

**Working source:** `dev` at `2309e85e6d5e20be1f8c7819a5b3a777db1a644a` (entry baseline).
**Mode:** B — Testing. **No version tag, main promotion, GitHub release,
signed APT update, or R2 upload is authorized.**

## Execution sequence

1. **Stages 1–2 / current source scan and risks.** Rescan the GitHub
   recursive tree against `MODE_B_CURRENT_FILES.md`. Prior 2026-10-21
   inventory and branch-map samples are historical, not current
   measured coverage. Prioritize no-force Git safety, explicit root
   enrollment, GitHub OAuth/keyring/permission/rate-gate boundaries,
   unknown vs zero, native cancellation/geometry/autostart and
   signed immutable installers/APT/R2 publication.
2. **Stage 3 / complete current function inventory.** Record each
   function/command/entrypoint/callback with file, risk, level,
   expected test cases, applicable Positive/N1–N12. Include current
   localization, runner-name provenance and exact readback verifier.
   Do not confuse a file-level register with Stage 3 completion.
3. **Stages 4–8 / exhaustive executable-branch map and test plan.**
   Source-to-branch/positive-negative matrix; every N/A must have a
   reason. Cover real interactions: dirty + concurrent fetch, revoked
   OAuth + stale monitor event, signed release + denied readback,
   Arabic bidi + unknown counts, and cancel-after-close.
   Estimate current missing cases and map test files to source.
4. **Stages 9–10 / implement and mutation-review.** Add real
   deterministic tests only after the Stage 3–8 inventory/matrices
   are complete. Retain all stable safety assertions; fix root causes,
   never reduce coverage for a green build.
5. **Stage 11 / final executions.** Execute the complete stable Node,
   Python release, Rust core and desktop-format/Clippy/compile gates
   against an exact candidate SHA; execute separately identified
   known-flaky group once if it exists. Physical tests requiring real
   KDE/Windows remain pending until the following OS acceptance stage.
   Report exit codes and outputs, not inferred status.
6. **Stage 12 / transparent completion.** All relevant N1–N12,
   branch, invariant, mutation and interaction requirements must pass
   for the tested scope before describing Mode B source testing as
   complete. **Then** collect independent 20/20 contextual reviewers
   and Windows/KDE installed acceptance. Release is blocked until all
   required gates pass.

## Environment and evidence boundaries

The current ChatGPT connector can read/write GitHub repository content,
trees and commits. Its local shell has Node 22/Python 3 but **no cargo**,
and `git ls-remote` to github.com fails DNS resolution. A GitHub
contents/tree inspection and static source checks are **not** a full
test-suite execution. The GitHub workflow has an existing stable
`Preflight` gate (Rust format/core/Clippy, JS Node 24,
Python release, desktop Linux `cargo check`); code pushes trigger
it externally, and its status must **not** be polled by the agent.
The final gate requires externally supplied/observed exact-SHA
execution results or a real executable environment. Do not claim a
passed suite based on a newly added test source.

**Current Mode B state:** ACTIVATED; Stage 1 initiated; Stages 3–12
not yet complete. L10N/physical acceptance: explicitly deferred,
not passed. Release remains BLOCKED.
