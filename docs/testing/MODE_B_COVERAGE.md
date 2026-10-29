# Mode B — coverage measurement ledger

Baseline: 2026-10-29. **Stage 8 is not yet complete.**
Do not turn source test counts into measured function/branch coverage.

| Source family | Runtime test gate | Current measurement | Missing acceptance |
| --- | --- | --- | --- |
| Desktop JS (.mjs) | Preflight Node 24 test pass with V8 source coverage | Pending exact-SHA CI; no percentages copied or fabricated | Per-file branch/function/line report from CI; non-executed branches and mutation assessment |
| Rust core | `cargo test --locked -p repoticker-core` | CI pending exact-SHA; no per-module branch coverage instrumentation | Real source coverage and mutation results |
| Rust native desktop | Preflight Linux desktop `cargo test --locked -p repoticker --bin repoticker` | Newly wired; result unknown | Verify compiler+native tests and Windows-specific conditional code via the Windows native candidate test job |
| Python release scripts | `python3 -m unittest discover -s tests -p test_release_*.py -v` | CI pending exact-SHA; no measured Python branch coverage | Real coverage and signed-publication mutation review |
| Platform installation and localization | Product-owner acceptance attested separately | No reconstructed logs or per-locale reviewer receipts | Retain owner attestation distinct from independent OS/native proof |

The new V8 flag runs during the **existing** Node test execution, not
a second independent test-suite pass. CI log is the measurement source.
No coverage goal/threshold is invented here; the Stage 12 criterion
remains every material executable branch accounted for with observed
results, justified exclusions and independent mutation evidence.

## Risk-focused mutation candidates

- Delete scope identity guard in runner collector (cross-org old data).
- Change repo selection equality to organization-only (incorrect queue).
- Remove installation malformed-row rejection or conflict guards.
- Change `< ttlMs` to `<= ttlMs` in billing cache.
- Change `started >= saved.at` to unconditional cache reuse.
- Treat incomplete job/runner coverage as zero rather than null.
- Allow release-verifier HTTP redirects (external origin accepted).
- Remove locked Cargo dependency graph and native Rust tests from CI.

Each candidate is a **designed mutation**, not a measured killed
mutant. Only the final executed mutants and assertions may be counted
in the Mode B final report. No claim of global coverage success.

## First executed Mode B checkpoint — SHA c5072013 / 2026-10-29

**Actual CI output**, not a projection or assumed pass:

- [Preflight 40959460474](https://github.com/morozhenko-apps/repoticker/actions/runs/40959460474)
  failed. Node ran 494 tests: 492 pass, 2 fail. The existing
  12 deterministic mutation-review tests all **passed** (each
  original invariant asserted and its source mutant rejected).
- Node V8 `all files` summary: **63.32% lines, 58.31% branches,
  49.65% functions**. These are whole selected UI-source results,
  not whole-repository coverage and not a Mode B success.
- Linux native Tauri: 64 pass, 2 fail. Windows native Tauri:
  68 pass, 2 fail with the same `project_billing` number representation.
  OS candidate run
  [40959460394](https://github.com/morozhenko-apps/repoticker/actions/runs/40959460394)
  also failed, although KDE bundling succeeded.
- Rust format gate failed on four Rust files, preventing the core
  tests/Clippy in that Preflight attempt. Their source tests were
  **not executed in that job**.

### Root-cause remediation prepared after the failed run

`docs/testing/MODE_B_CI_FAILURE_FIXES_2026_10_29.md` documents
all four distinct failures, the identified causes and the fixes.
The follow-up code/test commit preserves native source JSON-number
representation in billing, uses 1000 distinct mock installation
identities for ten full pages, supplies explicit authorized
`scope` to the old retained-runner fixture and applies the
exact reported Rust formatting. Also adds a native regression for
integral and fractional billing quantities. This remains pending
a new exact-SHA CI result until that new push completes.

**Stage 12 is still open.** Current instrumented JS branch coverage
is 58.31%; Rust/Python per-branch numbers and whole-product mutation
scores have not yet been measured. The 12/12 chosen JS source
mutants cannot be extrapolated into 100% global mutation coverage.
