# RepoTicker Mode B: full-repository testing audit (SSOT)

This audit follows the operator-supplied `AGENT.md` **Mode B** Testing contract,
not merely the release-delta additions in `docs/MODE_B_RELEASE_GATE.md`.
It covers all applicable code at source baseline
`5b07a3273a27516af8ceb793f0d427a1bada964b`. This document records decisions and evidence for another
agent to resume without relying on conversation context.

## Scope and acceptance boundary

The repository has 239 tracked files at the audit baseline. Application
code spans the Rust Git domain, desktop/Tauri native boundary, WebView
controllers and UI projections, operator-owned Cloudflare relay, release
distribution scripts and CI contracts. Static translations, styles and
simple data definitions remain in scope for structural/integration contracts
but do **not** count as a substitute for executable business-rule coverage.
Existing tests are retained and must be mapped before planning additional
tests. The previous relay-specific matrix is evidence, not the full inventory.

**No architecture or public behavior change is authorized by Mode B.**
If new tests expose a production defect, apply the repository's root-cause
protocol and separately document any necessary correction; stop for
architectural decisions affecting API, persistence or trust boundaries.
No deployments, release tags, main promotion, Cloudflare changes, or
credential access are part of this test audit. GitHub `dev` is connected
to Cloudflare for the worker: avoid publishing application/Worker source
changes merely to report test progress.

## Execution capability and evidence

- This agent can read and create GitHub Git objects and update an approved
  branch. Its isolated tool environment has no DNS access to clone the
  repository and no local Rust/Node26 toolchain aligned with CI.
  Source-exact test outcomes must come from GitHub CI or owner-run commands.
- Already verified at this source revision: Strict quality gate
  [#43303685024](https://github.com/morozhenko-apps/repoticker/actions/runs/43303685024)
  completed success: 747 JavaScript tests passed, 98 Python release
  contract tests, 6 CI-policy tests, Rust core format/test/Clippy.
  Preflight [#43293012361](https://github.com/morozhenko-apps/repoticker/actions/runs/43293012361)
  completed success; Relay Worker dry run
  [#43293012155](https://github.com/morozhenko-apps/repoticker/actions/runs/43293012155)
  completed success. These are **baseline evidence only** until final
  Stage 11 on the actual last modified revision.
- Known-flaky category: no established quarantine identified in the current
  workflow. Do not infer a guaranteed absence of intermittent issues from
  a successful pass. Do not silently move failing stable tests.
- Physical Windows/KDE, OS Keyring and upstream provider acceptance remain
  independent from strict Node/Rust/Python gates. WebKit SIGABRT is tracked
  in [#23](https://github.com/morozhenko-apps/repoticker/issues/23).

## Twelve-stage progress ledger

| Stage | Contract | State | Completion evidence / next action |
| --- | --- | --- | --- |
| 1 | Repository Scan | COMPLETE | Tracked tree, test suites, strict and preflight workflow entrypoints inventoried |
| 2 | Risk and invariant analysis | COMPLETE | Risk families and fail-closed requirements documented below |
| 3 | Exhaustive Test Inventory | SOURCE AND TEST FILES INDEXED; METHOD REVIEW OPEN | 80/80 executable source files, 77 JS + 13 Python test files and 2 Rust integration sources indexed; line-by-line public method classification outstanding |
| 4 | Executable Branch Map | PARTIAL: CRITICAL DOMAINS REVIEWED | Relay, Settings/Quota/Card, Git/OAuth/ETag, release and monitor mapped to explicit outcomes and existing test candidates; 1,721 lexical anchors remain to classify across all methods |
| 5 | Positive and N1–N12 matrix | INITIAL FILE MATRIX COMPLETE; EVIDENCE PENDING | 80 file rows × 13 columns populated with '?' or reasoned NA; method-level coverage needs actual assertions before upgrading '?'. |
| 6 | Meaningful Interaction Matrix | PARTIAL: HIGH-RISK COMBINATIONS MAPPED | Relay, Settings, Git safety, OAuth/ETag, main card, Quota, GitHub monitor and release combinations enumerated; exhaustive pairwise/state coverage pending |
| 7 | Coverage estimation | INITIAL ESTIMATE ONLY | 707 extracted signatures and 1,721 source control-flow/return anchors; not a count of missing tests |
| 8 | File-level Coverage Map | FILE SKELETON COMPLETE; ASSERTIONS PENDING | 80/80 production files listed with function/branch candidates; no global branch-level PASS asserted |
| 9 | Implement every planned case | BLOCKED BY STAGES 3–8 | No representative sampling, no contract-weakening or mocking subject under test |
| 10 | Mutation Review | PENDING | Identify exact operator/guard/ordering/state mutations killed by key assertions |
| 11 | Final STABLE/FLAKY execution | PENDING NEW CHANGES | Once only after Stages 1–10. Baseline Strict PASS above is not a new final gate |
| 12 | Seven YES completion gate | NOT SATISFIED | No blanket completion until per-artifact and per-branch evidence exists |

## Business invariants and priority order

1. **Git safety (critical).** Only explicitly enrolled, verified checkouts;
   no unapproved working-tree mutation or forced remote push; new branch,
   upstream or concurrent remote changes abort conservatively; cancellation
   affects only owned process groups; an unknown outcome must stay unknown.
2. **Credential and privacy custody (critical).** GitHub OAuth/Keyring and
   Worker bearer are separate; no secret in WebView logs, diagnostics,
   public URL, forwarded payload or source; cancel discards drafts;
   auth generation/ETag races cannot revive expired private data.
3. **GitHub monitoring correctness (high).** REST is authoritative,
   incomplete pages never become zero; runner, quota and CI signals retain
   independent completeness; first snapshot/after-outage notification is
   silent; rate gates are monotone.
4. **Cloudflare relay (critical).** Signed raw-body webhook, explicit scoped
   allowlist and bounded payload, idempotent SQLite cursor/rate budget,
   authenticated native-only WSS, finite fallback and REST reconciliation;
   dashboard-managed runtime variables persist through deployment.
5. **Desktop transactions and lifecycle (high).** Settings OK/Cancel,
   cleanup verification, OS vault write failures, window-focus refresh,
   drag/quit races and Linux KDE/Windows geometry preserve user choice.
6. **Distribution and release (critical).** Exact source SHA, checksums,
   unsigned Windows acceptance, signed APT metadata, immutable publication
   and R2 public readback; failed steps never promote a release.
7. **Presentation and localization (medium).** Valid metrics, accessible
   controls and focus, 20 locales, deterministic time and quota displays.
   No false 'connected' or 'healthy' claim without independent evidence.

## Planned work and rollback points

A. **Inventory and mapping, docs only**: parse every core/native/UI/worker/
distribution module and existing test; produce exhaustive maps and honest
gaps in this document. If no gap remains for a branch, explain concrete
test evidence rather than manufacture redundant tests.

B. **Add test-only implementation**: deterministic table-driven cases for
all identified gaps, preserving domain implementation; external adapters
can be faked by contract. Group atomic commits per area. Do not run normal
suites between edits.

C. **Mutation audit**: verify representative operators, error guards,
ordering and transaction boundaries kill precisely identified regression
tests. Do not assert mutation coverage without execution evidence.

D. **Final strict validation and physical gates**: request one exact SHA
Strict STABLE run and applicable desktop acceptance; identify separate
known-FLAKY group if any. Collect KDE/Windows evidence before Stage 12.
No deploy is part of this audit.

Rollback: documentation and test commits can be reverted independently.
A future production bug fix gets its own scoped implementation commit;
a Cloudflare-connected push is reviewed for deployment side effects.
Without all seven Stage 12 answers supported by evidence, report PARTIAL
and the exact unverified coverage rather than a percentage invented from
case totals.

### Instrumented UI coverage correction

The exact-source Preflight UI coverage report identifies
**56.49% line, 46.28% branch and 47.62% function coverage** across
instrumented UI modules; `settings.mjs` alone is 50.58% branch
coverage and `app.mjs` is absent from the imported module set.
The [full executed report](mode-b/instrumented-ui-coverage.md) records
all measured modules and uncovered line ranges. These are materially
stronger evidence of gaps than lexical source counts. Completion Stage 12
remains NO until the missing executable behavior is exercised.

## Current audit index (continuation checkpoint)

The documentation-only work is organized in a separate `docs/mode-b/`
directory so permanent user/architecture documentation does not become a
development journal. It is source-derived and does not claim final coverage.

- [All 80 production files: status matrix and per-file gap ledger](mode-b/full-matrix-and-coverage.md)
- [Rust Git core and Cloudflare relay source inventory](mode-b/inventory-core-relay.md)
- [Tauri native orchestration / GitHub REST / OAuth inventory](mode-b/inventory-desktop-rust-core.md)
- [Tauri inline-test continuation correction](mode-b/inventory-main-continuation.md)
- [Linux/Windows native surfaces, Keyring and relay transport](mode-b/inventory-native-surfaces.md)
- [WebView Settings, GitHub monitor, UI controllers](mode-b/inventory-ui-controllers.md)
- [Runner/metric/scan and interaction utilities](mode-b/inventory-ui-utilities.md)
- [20-locale and pluralization data/control paths](mode-b/inventory-locales.md)
- [Remaining UI helpers and HTML/CSS structural contracts](mode-b/inventory-ui-final.md)
- [Release signing, R2, APT, install and CI tooling](mode-b/inventory-release-tooling.md)
- [Relay function-level inspected branch and N-cases](mode-b/branch-map-relay.md)
- [Settings/Quota/Card semantic map and planned negative cases](mode-b/branch-map-settings-quota-card.md)
- [Git safety, OAuth, ETag and rate gate semantic branch map](mode-b/branch-map-git-oauth.md)
- [R2/APT release and GitHub monitoring semantic branch map](mode-b/branch-map-release-monitor.md)
- [Existing JS test index part 1](mode-b/test-index-js-1.md),
  [part 2](mode-b/test-index-js-2.md),
  [part 3](mode-b/test-index-js-3.md),
  [part 4](mode-b/test-index-js-4.md),
  [part 5](mode-b/test-index-js-5.md),
  [part 6](mode-b/test-index-js-6.md)
- [Python release and Rust integration test index](mode-b/test-index-python-rust.md)

All JS test declaration counts reconcile to the exact-source completed
Strict result (**747/747**) without omitting a JS test file. Python
declarations reconcile to **98 release + 6 CI-policy = 104/104**.
These totals **do not** imply execution of every executable branch.

**Important correction:** a first lexical Rust pass truncated `main.rs`
at the first inline `#[cfg(test)]` despite production definitions
continuing later. The continuation appendix adds the omitted region,
and the initial counts remain explicitly *estimates*. AST-aware
classification and targeted assertion review are required before
Stage 3–8 can be signed off.

### Current unmerged checkpoint and publication boundary

Semantic source-review receipts were prepared in three separate
documentation commits on top of branch baseline
`a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
No production JS, Rust, Worker, secrets, CI workflow, test or release
source has been modified in this audit slice. Test implementation remains
gated by full Stages 3–8.

**Do not automatically fast-forward dev while Cloudflare Workers Builds
uses dev as its production branch.** A documentation-only push can still
trigger `wrangler deploy`; no cloud deployment was authorized for this
audit update. Keep new documentation in reviewable, unreferenced Git
objects until a safe publication boundary is established. No extra
working branch was created. The exact pending commit HEAD is documented
in the owner-facing completion receipt.

Current outstanding work, beyond these three critical-domain maps:
- Classify all remaining source method/type candidates, including
  Rust functions embedded after inline test modules, and all branch
  expression/early-return variants beyond lexical counts.
- Map native surface/Windows/KDE, UI helper, localization and
  release-script outcomes to exact assertions; label real execution
  separately from source-text contracts.
- Inspect each candidate test's assertions; mark specific file-level
  Positive/N1-N12 cells ✔ only when all applicable method-level
  outcome variants are actually covered.
- Plan and estimate every remaining concrete case and meaningful
  cross-domain combination before entering Stage 9.
- Later, execute all planned test additions, mutation review and
  one final exact-SHA STABLE gate, followed by physical platform
  acceptance. Existing #23 WebKit abort remains unresolved.

**Next actionable work:** manually reconcile branch outcomes and matched
assertions for Git safety and cancellation, OAuth/ETag, Tauri Settings,
GitHub monitor/runner/billing, cloud relay and distribution. Create a
concrete list of unsupported observable outcomes for each public
function; do not add new tests before the full global Stage 3–8 plan is
signed off per the Mode B SSOT. Then implement and run the final STABLE
suite once. Existing `#23` WebKitGTK native crash and `#24`
Cloudflare retention remain independent acceptance/risk records.

## Inventory appendices

The per-file method inventory, branch map, Positive/N1–N12 matrix,
interaction matrix, mutation mapping and evidence are populated
incrementally in subsequent **documentation commits** before writing
any Mode B test implementation. A missing entry is a known coverage gap,
not implicit coverage.
