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
| 3 | Exhaustive Test Inventory | METHOD DISCOVERY PREPARED; SEMANTIC REVIEW OPEN | 80 production files, 707 lexical named method/type entries (218 public/export candidates), 9 static dictionary or top-level command entrypoints; exact public/anonymous and cfg classification pending |
| 4 | Executable Branch Map | ALL MAJOR FAMILIES PREMAPPED; OUTCOME MAP PARTIAL | Relay, Settings/Quota/Card, Git/OAuth, release/monitor, native OS, UI helpers and locales mapped; ~1721 lexical anchors still need exact executable outcomes + assertion evidence |
| 5 | Positive and N1–N12 matrix | INITIAL FILE MATRIX COMPLETE; EVIDENCE PENDING | 80 file rows × 13 columns populated with '?' or reasoned NA; method-level coverage needs actual assertions before upgrading '?'. |
| 6 | Meaningful Interaction Matrix | CASE REGISTER PREPARED; EXHAUSTIVENESS OPEN | 51 case groups listed including 10 platform physical groups, with N1–N12 tags and independent state combinations; not implemented-test counts |
| 7 | Coverage estimation | PRELIMINARY | Method planning floors and 51 grouped obligations documented, exact tests per semantic branch not yet reconciled with existing assertions |
| 8 | File-level Coverage Map | FILE COVERAGE INDEXED; ASSERTIONS PENDING | 80/80 production files and 707 method/type candidates indexed; node UI branch coverage 46.28% on instrumented modules; no global branch-level PASS |
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
- [Native KDE/Windows surface, vault, Relay transport and shutdown branch map](mode-b/branch-map-native-platform.md)
- [UI helpers, 20-language localization and presentation branch map](mode-b/branch-map-helpers-locales.md)
- [Method-level production source register (lexical discovery, not coverage)](mode-b/method-level-discovery.md)
- [Mode B planned negative/interaction case register (51 scenario groups)](mode-b/planned-case-register.md)
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

## Historical Mode B plan reconciliation

GitHub issue #10 ('Mode B before v1.0') remains OPEN. It links to
docs/testing/MODE_B_PLAN.md, MODE_B_INVENTORY.md, MODE_B_BRANCH_MAP.md
and VERSION_ROADMAP_TO_1_0.md from the October work. None of these
historical docs/testing paths are present in the current dev Git tree;
do not claim those links still provide current SSOT evidence.
Current canonical evidence lives in this document and docs/mode-b/.
The original AGENT.md Stage 1–12 contract remains mandatory; an
outdated issue checkbox marked Stage 3 complete in October cannot
substitute for rescanning the 2026-11 production tree.
Source and test inventory at baseline: 80/80 executable production
files, 77 JavaScript test modules (747 test declarations) and 13
Python suites (104 declarations), plus Rust inline/integration tests.
These declaration counts prove coverage inventory reconciliation,
**not** full method or branch behavior coverage.

## Current prepared documentation commits (not merged to dev)

- 21d74704e126edeb258b2be7fdb5e15db659a3b4: Settings, Quota,
  main card branch map and interaction gaps.
- 5d9015d186a5a861c24f33eed63fadc866099c6e: Git safety,
  OAuth, ETag and rate-limiter decision map.
- 405e0fdbef352faa56aeaeb0f752e8cb28dde3c0: release/Apt/R2
  and GitHub monitoring map.
- ac8c59a0711275804bc30a3a1f3ec1b91f996baa: ledger update.

No production code, tests, workflow, hosted Cloudflare bindings or
release branch have been changed. Because current dev is the Git
production branch of the operator-owned Cloudflare Worker, these
documentation-only commits are not published until a safe boundary
is available. Pushing dev may start a new Worker deployment even for
documentation updates.
## Later checkpoint: Native, helpers and source method register

The current audit now also has verified source-level reviews for
native KDE/Windows surfaces, OS vault and WSS, UI helper and locale
semantics, and a single register of **707 lexically discovered
method/type signatures across all 80 source files** (218 named as
public/exported). Nine files contain static locale dictionaries or
top-level shell entrypoints rather than ordinary named operations.
These numbers are **not** AST-confirmed executable method totals or
coverage. The method register explicitly lists the remaining tasks:
anonymous handlers, Rust cfg/macro boundaries and all expression-level
branches need review.

The case register organizes **51 scenario groups**: 10 require
physical platform acceptance and 41 concern executable or planned
unit/integration/UI contracts. Counts by N categories are group
applicability, not tests implemented. Existing tests may already cover
parts of these groups and must be credited before new tests are written.

The owner previously attested to acceptance of all 20 contextual
localizations on 2026-10-29, and the L10N issue #16 is closed.
Do not ask the owner to repeat the entire language review.
Mode B continues to require executable N8/RTL/DST/unknown-data
tests, which a manual acceptance alone does not prove.

Potential additional privacy/schema concern: `github_monitor_publish`
accepts `runner_state` as unconstrained JSON beyond `counts`
and `coverage` object existence/size; the privacy contract says the
native monitor does not store credentials. This **source-level
discrepancy** is tracked in issue #25, without claiming observed
real-world token disclosure. A production schema tightening may be a
security boundary/API decision and must follow STOP FACTOR rules
before implementation. Do not add an assertion silently assuming a
new, unapproved projection schema.

**Status remains PARTIAL**. No new automated tests, mutations,
or final CI execution are claimed in this documentation slice.
The baseline strict and preflight results belong to
`5b07a3273a27516af8ceb793f0d427a1bada964b`, and
`dev` source was last observed at
`a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
No unapproved Cloudflare production deploy is justified by a
documentation-only update; publication to `dev` remains held.

## Source-verified assertion checkpoint (Git safety and auth)

On 2026-11-13, inspected executable Rust test assertions for G1,
G2, O2, E1 and R1 (Git safe push/final checkpoint, Device Flow
slowdown/terminal, ETag auth epoch and rate gate status). These
are **E_PARTIAL** case credits, not full branch completion.
See [verified-assertions-git-auth.md](mode-b/verified-assertions-git-auth.md).
Do not reproduce already verified assertions simply to increase counts.

Historical issue #23 was closed `not_planned` on owner request:
an isolated WebKit child SIGABRT cannot be attributed to RepoTicker.
**It is no longer an open P0 release blocker**. Native shutdown
acceptance remains in the Mode B physical matrix; a fresh repeatable
crash would be a new evidence-backed defect.

## Confirmed existing Settings, Quota and Relay assertions

Additional source/body inspection credited existing controller and
Durable Object regression assertions for S1/S2/Q1/Q2/L5/L6 as
**E_PARTIAL**. This covers finite stale WSS events, single-flight
credential stage/save/commit failure handling, stale account billing,
sanitized popup errors, exact 512/513-byte Durable Object limits and
backpressure/throwing-socket isolation with persistent SQL write.
See [verified-assertions-settings-quota-relay.md](mode-b/verified-assertions-settings-quota-relay.md).
Native OS Keyring, malformed internal JSON and socket.close failures
are still unknown. No test-run or mutation result is claimed.

## Protocol and 100-repository boundary verification

The exact-source protocol validator and Settings inventories were reviewed
against executable JS assertions. Current L2/L3/S3 case evidence includes
body size/claim limits, cursor ambiguity and 100/101 repository selection.
See [verified-assertions-protocol-limits.md](mode-b/verified-assertions-protocol-limits.md).
Each group remains partially covered until all listed variants are
implemented or proved by another existing assertion.

## Current inspected-assertion checkpoint (2026-11-13)

**No additional production or test code has been written or executed.**
Existing executable assertions were inspected and partly credited in 14
case groups: G1/G2/O2/E1/R1, S1/S2/Q1/Q2/L5/L6, and L2/L3/S3.
`E_PARTIAL` means **specific** outputs and mutations have matching
assertions; uninspected independent branches remain planned.

- [Git/OAuth/ETag executable assertion receipts](mode-b/verified-assertions-git-auth.md)
- [Settings/Quota/Relay executable assertion receipts](mode-b/verified-assertions-settings-quota-relay.md)
- [Protocol body/cursor and 100/101 selected repositories](mode-b/verified-assertions-protocol-limits.md)
- [Static dictionaries and shell/PowerShell entrypoint coverage](mode-b/branch-map-entrypoints.md)

`ci-pr-scope.sh` is additionally confirmed to have real subprocess
integration tests with temporary Git repositories, rather than merely
regex-based tests. In contrast, `install_qa_linux.sh` needs an
isolated CLI contract fake to test failed SHA/checksum/package verification
**without executing privileged `sudo apt` operations**.

The unconfirmed historical WebKit issue #23 is CLOSED and no longer
blocks release as an active speculative P0. Mode B native Quit smoke
remains separately applicable.

Remaining Stage 3–8 work: audit the complete 707-method lexical register
(anonymous callbacks, Rust conditional compilation and short-circuit
branches) and inspect assertions for remaining group-level `VERIFY`
cases. Stage 9 implementation and Stage 11 final STABLE/FLAKY execution
still require completion of the mandatory earlier stages.
## Confirmed relay test gaps

Five Relay case groups (L1/L4/L7/L8/L9) are now
`NEW_GAP_CONFIRMED` after inspecting all applicable existing
relay tests. The [exact test specifications](mode-b/relay-exact-new-test-spec.md)
name owning source branches, external fixtures, strong assertions,
and mutation sensitivities. They are not implemented or executed.
The clock rollback policy is an unresolved invariant question,
not permission to invent behavior.

## Actual release-publication assertion review

The existing Python R2/APT tests execute real release functions
against offline adapters. D1/D2/D3/D4 gained `E_PARTIAL` evidence
for fail-closed publication stages, immutable/mutable compare-and-swap,
signed index checking and full public readback. See
[verified-assertions-release-r2.md](mode-b/verified-assertions-release-r2.md).
No hosted release or new test suite was executed.

## Inventory appendices

The per-file method inventory, branch map, Positive/N1–N12 matrix,
interaction matrix, mutation mapping and evidence are populated
incrementally in subsequent **documentation commits** before writing
any Mode B test implementation. A missing entry is a known coverage gap,
not implicit coverage.
