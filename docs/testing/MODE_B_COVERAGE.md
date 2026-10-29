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
