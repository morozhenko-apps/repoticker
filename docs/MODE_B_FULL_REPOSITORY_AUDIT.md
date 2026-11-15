# RepoTicker Mode B: full-repository testing audit (SSOT)

This audit follows the operator-supplied `AGENT.md` **Mode B** Testing contract,
not merely the release-delta additions in `docs/MODE_B_RELEASE_GATE.md`.
The original inventory was taken at source baseline
`5b07a3273a27516af8ceb793f0d427a1bada964b`. GitHub comparison verifies
that the later published `dev` baseline
`a3ba7fa30fc4c81890d3075f94142942d001cbf3` is 21 commits ahead,
zero behind, with changes to **Markdown files only**, so application,
tests, CI and distribution source are unchanged between these two SHAs.
The branch maps refer to the latter SHA for a single unambiguous baseline.
This document records decisions and evidence for another agent to resume
without relying on conversation context.

## Working branch and commit ownership

As of 2026-11-13, the **named, fetchable Git branch**
[`audit/mode-b-testing`](https://github.com/morozhenko-apps/repoticker/tree/audit/mode-b-testing)
owns all Mode B audit documentation commits. An earlier tool-based audit
created 54 linked Git commit objects but did **not** move a branch reference,
which made normal `git fetch` unable to discover them and exposed the
unreferenced history to eventual garbage collection. This operational
mistake has been corrected by creating the named branch at
`e8a689d76b44e6be9e5829b8ba61dd6bb6f227aa`.

**Current continuation rule:** fetch the branch head from GitHub and
advance this branch by fast-forward only, with an expected-head
compare-and-swap; do not create further unreferenced audit commits.
To work locally: `git fetch origin audit/mode-b-testing`, followed by
`git switch --track origin/audit/mode-b-testing` (or switch directly
if the local branch already exists). Record exact commit SHAs and test
evidence in issue #10; never treat a commit object without a branch as a
published or fetchable result.

GitHub's `dev` remains the original published
`a3ba7fa30fc4c81890d3075f94142942d001cbf3` baseline as last
verified during this continuation. The project has a Cloudflare-linked
Worker, and `dev`/production branch pushes may have external side
effects; do not update `dev`, `main`, tags or Worker configuration as
part of these documentation-only inventory commits. Before any later
merge or release, review CI/path filters and Cloudflare deployment
behavior separately. The audit branch is **not** equivalent to a verified
build, test pass, PR, preview deployment or feature release.

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

**Current Stage 3 checkpoint (documentation only):** originally 707 lexical candidate records; source inspection discovered and inserted the missed Linux Wayland relative-pointer callback at `linux_surface.rs:51`. **Current physically rendered inventory (2026-11-15): 728 rows, all provisionally tagged, zero '?' remain (11 later source-confirmed callable additions).** The old 708 count correctly tracked numbered lexical candidates (707 original + one Wayland callback) but excluded nine `—` placeholder artifacts already present in the earlier 716-row Markdown. The current 717-row total includes both types. This arithmetic is reconciled; exhaustive Stage 3 is still unsigned. Since the earlier 455/707 checkpoint, 121 entries were classified across WSS Relay (14), Windows Geometry (14), Linux Layer Shell (26 + one new callback), R2 publisher (18), Quota/Billing (24), Cloudflare Relay protocol (9), RunnerState (9) and native MonitorCache (6). These counts include non-production FFI declarations and test-only functions. **No suites executed in this pass, 717 is not test coverage**. A real AST/FFI/cfg/anonymous-closure inventory remains necessary before Stage 3 completion. [Method inventory](mode-b/method-level-discovery.md), [missing Wayland callback](mode-b/method-assertions-linux-layer-shell.md), [native NM1 trust decision](mode-b/method-assertions-native-monitor-cache.md) and focused assertion maps retain the exact branch owners.

### Stage 4–8 continued evidence: native gesture and GitHub/Worker trust

[Bounded source-exact four-file closure slice](mode-b/stage-4-8-trust-closure-slice.md) now maps exact existing Node assertions, untested branch outcomes, Positive/N1–N12 relevance, seven cross-boundary interactions, per-file E/P/OS and **16 additional independently observable test bodies minimum**. The number is not a global test estimate or an executed result. The `safeRunUrl` vs `safeActionsJobUrl` admissible URL policy remains STOP for any implementation change. The global Stage 4–8 gates remain PARTIAL.

### Stage 4–8 continued: Card/monitor/scan race evidence

[Source-exact main-card, monitor and scan closure slice](mode-b/stage-4-8-card-monitor-scan-slice.md) maps the existing seven scan tests and four monitor suites (30, 12, 11 and 26 test bodies), while keeping the missing **real app.mjs import/DOM/Tauri harness** distinct from source regex assertions. It names eight cross-domain races and a bounded **15 independent new test bodies minimum**; actual case execution and physical OS evidence remain outstanding. No production trust or persistence policy changed; Stages 3–8 globally remain PARTIAL.

### Stage 4–8 continued: native Git dispatcher, graceful Quit, and Relay credential custody

[Native Git/Keyring method-to-assertion slice](mode-b/stage-4-8-native-git-keyring-slice.md) separates real Core Rust and Settings JS evidence from source-only native command checks. It names nine multi-axis interactions and a local **14 independent additional test body minimum** without claiming pass evidence. The native A2 command harness and OS Keyring seam remain open. `relay_secret.rs` may restore a taken draft after Settings Cancel when a vault write fails (RS1 source-derived hypothesis) or lose it on a blocking task join failure (RS2); **no production semantics are changed and no defect is claimed confirmed**. Global stages 3–8 remain PARTIAL.

### Global Stage 3–8 source/matrix arithmetic checkpoint

[Independent register and evidence migration reconciliation](mode-b/stage-3-8-global-evidence-consistency.md) confirms the exact **80 file path sets** match the source-map registry, Stage 5, Stage 8, method headings and the source-equivalent production Git tree. There are **717 provisionally typed candidate rows**, not 717 executable methods. The global Stage 5 matrix currently has 1,040 applicability/evidence cells: **810 unknown `?`**, **230 provisional NA `✖`**, and **no full-file `✔`**. This is a documentation signoff deficiency, **not** a claim that all tests fail or no source methods are tested. Three bounded slices estimate 16+15+14 new independent test bodies locally, without global deduplication. Stages 3–8 remain PARTIAL.

### First Stage 4–8 branch-to-test evidence migration

[Crosswalk from source decisions to actual Node assertions](mode-b/method-evidence-crosswalk-ui-worker.md) now provides exact blob/line provenance for `scan-refresh.mjs`, `native-drag.mjs`, `webhook-verify.mjs` and `worker.mjs`. **41 existing test bodies reviewed: 37 invoke actual production methods, 4 are source-only contracts**. Four Stage 8 `Covered`/`Remaining` rows now link this evidence without granting a full Stage 5 `✔`: aggregate matrix still has 810 `?` and 230 provisional `✖`. Physical KDE, hosted Worker and incomplete negative branches remain open; no suites rerun.

### Second Stage 4–8 evidence migration: GitHub monitor projections

[Four more exact method/test receipts](mode-b/method-evidence-crosswalk-monitor-projections.md) now reconcile `status-metrics.mjs`, `github-installations.mjs`, `ci-status.mjs` and `github-errors.mjs`. The register documents 16 relevant existing test bodies and unresolved zero/MAX, 10-page pagination, CI scope and raw-error DOM boundaries. Across two crosswalks, **eight of 80 Stage 8 file rows** now contain real E/I assertion evidence plus named P/OS gaps. This **does not** turn their global Stage 5 `?` into `✔` or replace full AST source coverage. All suites deferred.

### Third Stage 4–8 evidence migration: Git Core and JSON preferences

[Direct Rust source and test receipts](mode-b/method-evidence-crosswalk-core-git-config.md) reconcile actual `git.rs` integration tests against enrolled path admission, Safe Pull/Push/Sync, no-force refs/hooks, owned Fetch cancellation and `config_store.rs` against atomic backup/recovery/16-thread transactions. Two Stage 8 Covered/Remaining rows now include E/P/OS evidence; **10 of 80** mapped so far. Native Tauri A2, denied fsync/rename, cross-process and Windows acceptance remain outstanding. No Stage 5 `✔`, no code/test/CI execution.

### Fourth Stage 4–8 evidence migration: real Settings controller

[Selected real Settings WebView method-to-assertion links](mode-b/method-evidence-crosswalk-settings-controller.md) tie actual `settings.mjs` import under fake external Tauri and DOM to existing OAuth generation, Cancel, multi-write Apply, staged Relay secret and postcommit readback cases. This establishes meaningful **JS controller** E, not native Keyring acceptance. Stage 8 has sourced receipts in **11/80** files; full Stage 5 cells remain unknown where independent P/OS cases exist. Mode B globally PARTIAL, no suite rerun.

### Fifth Stage 4–8 assertion migration: Quota and native OAuth

[Direct source/fixture crosswalk](mode-b/method-evidence-crosswalk-quota-native-oauth.md) now maps `quota.mjs` as a genuinely executed JS controller under fake external Tauri event/IPC and `github_native.rs`/`github_session.rs` as pure Rust credential-record, error projection and epoch-state evidence only. **21 existing test bodies were inspected, of which 20 invoke the real subject/helper and one checks literal reason labels.** Actual HTTP, OS Keyring, Tauri commands and AS1–AS3 stale-auth race hypotheses remain P/OS; **14/80 Stage 8 rows** now have E/P/OS receipts. No overall Stage 5 `✔` or actual new test coverage is claimed.

### Sixth Stage 4–8 migration: large risk-focused batch, 17 production files

[Relay and SQLite Hub](mode-b/bulk-crosswalk-relay.md), [GitHub HTTP/projections and monitor](mode-b/bulk-crosswalk-github.md) and [native lifecycle](mode-b/bulk-crosswalk-native.md) reconcile 17 additional files against exact existing assertions, separating real source E, fake external adapters, source-only S and remaining P/OS/HOST. The Hub suite uses actual in-memory SQLite with transactional rollback, not a mocked Durable Object data model. `autostart.rs` remains **source-contract only**, and native `github_monitor_publish`, Keyring, Quit, WSS and HTTP all remain unexecuted in this batch. **31 of 80 Stage 8 rows** now link detailed crosswalk receipts: **30 E/I partial, one S/P only**. Global Stage 3 AST census and 810 Stage 5 `?` entries remain open; no suite was run and no Stage 9 permission implied.

### Seventh Stage 4–8 source-to-test evidence migration: 25 UI and OS files

[UI domain/Git/runner source assertions](mode-b/bulk-crosswalk-ui-domain.md), [About and locale projections](mode-b/bulk-crosswalk-ui-locale.md), and [platform evidence ledger](mode-b/bulk-crosswalk-platform.md) reconcile 25 more exact production artifacts. Direct evidence includes runner permission/page cap, bounded nested requests, CI tracker atomic rejects, real About WebView import, Unicode and 20-locale projection tests, and four actual Windows `placement` Rust assertions. **Linux Layer Shell and KSNI, plus icon pixel conversion have no direct real native tests in the inspected suites; source contracts remain S.** Stage 8 now has **56/80 linked rows: 52 with partial real E/I evidence, four S/OS-only** including prior autostart. Stage 3 AST completeness, all remaining Stage 4–8 outcomes and 810 global Stage 5 unknowns remain open. No tests/build/CI/OS acceptance executed in this pass.

### Eighth Stage 4–8 evidence migration: all 80 source files now linked, planning gates NOT complete

[Core entrypoints](mode-b/bulk-crosswalk-core-entrypoints.md), [locale-only data](mode-b/bulk-crosswalk-locale-dictionaries.md), and [release/CI tooling](mode-b/bulk-crosswalk-release-tooling.md) cover the final **24** unlinked source paths with exact immutable blobs, inspected tests and independent gaps. The full **80/80 Stage 8 path ledger** now links focused evidence, split **63 E partial** (existing tests execute real subject/core helper), **12 S** (structure/syntax-only, including app.mjs, Cloudflare index.ts, native Wayland/KSNI, certain scripts), and **5 D** (data-only locale assertions). The main Rust source has real inline pure helper tests but its Tauri dispatch still lacks native acceptance. R2 publication has strong offline direct tests; source-only provisioning/install controls cannot be counted as actual remote operations. The numbers are an **indexing audit**, not measured file or branch coverage. All Stage 5 totals stay 810 unknown/230 provisional NA, and the 717 lexical source artifacts still need AST/cfg/anonymous-handler census. Stage 9 not started; no source/test/CI/build/deployment actions in this continuation.

### 80/80 file-routing checkpoint: evidence index is NOT a completed Mode B gate

[Global coverage-routing closure and next Stage 3–8 gates](mode-b/stage-3-8-file-routing-closure.md) is the current handoff: **80/80** files linked, evidence classification **63 E (partial real method/source assertion), 12 S (static/syntax only), 5 D (locale dictionary value assertion)**. The per-file source routing milestone is complete; full method AST/cfg census, 810 Stage 5 unknowns, method-by-method branch maps, interaction deduplication and physical native/host acceptance remain PARTIAL. Do not authorize Stage 9 from this counter.

### Stage 3 continued: identified 11 omitted JS callable declarations (2026-11-15)

[Source-line verification across all 80 files](mode-b/stage-3-lexical-reconciliation-2026-11-15.md) corrected the lexical register from 717 to **728 provisional entries** (719 numbered + nine non-method placeholders). The new rows cover Worker private routing, Hub HTTP `fetch` and response helpers, CI tracker methods and native drag gesture methods. Existing test assertions remain E/I partial. Thirteen test-only Rust helpers were excluded. This is **not** an AST/cfg or anonymous callback exhaustiveness proof; Stage 3–8 still PARTIAL and the Stage 5 cells remain 810 `?` / 230 provisional `✖` / 0 `✔`. Stage 9 remains blocked.

### Stage 3 callback ownership expansion: Card, Settings, Quota, Monitor and About

[27 source-backed grouped event-flow owners](mode-b/stage-3-ui-event-handler-ownership.md) now distinguish actual registered UI/Tauri callbacks from test-only source regex and separately tested helper modules. Card A1 still has **no verified imported-controller execution**. Settings/Quota/Monitor/About have E_PARTIAL event subsets with fake only external Tauri/HTTP/DOM, and real host acceptance remains P/OS. This 27-group planning annex is **not additive to the 728 provisional named/source artifacts** pending AST deduplication; Stage 3–8 remain PARTIAL and no tests/CI were run.

### Stage 3 AST reconciliation tool added (2026-11-15)

[Read-only parser-backed inventory script](mode-b/tools/ast-reconciliation.mjs) and [usage/evidence limits](mode-b/tools/README.md) are now available for running in a RepoTicker checkout. It parses JS/TS via TypeScript and Python via stdlib AST against exact immutable Git objects and identifies missing callable source lines; Rust cfg/FFI and shell are deliberately marked pending. The script was syntax-checked and exercised only against a two-file temporary diagnostic Git fixture; **it has NOT been executed against the actual RepoTicker baseline** because this agent's local container lacks the repository Git checkout and direct GitHub network. The baseline remains accessible via connected GitHub reading tools. Stage 3 AST exhaustiveness and all Stage 4–8 acceptance remain PARTIAL, with no Stage 9 tests authorized.

### Stage 3/4 exact native IPC command provenance (2026-11-15)

[55 registered Tauri command-to-WebView caller ledger](mode-b/native-ipc-command-registration-audit.md) verifies 33 main.rs + 22 external native `#[tauri::command]` declarations and exactly 55 `generate_handler!` entries, with no annotations orphaned or excess. UI source uses 46 distinct literal calls and 3 fixed dynamic menu mappings; 6 registered commands have no direct UI literal caller, which does not prove non-use or authorization safety. Native command security/permissions must be characterized in real Tauri host (N7, A2/O3/NM1), not assumed from `generate_handler!` or plugin capability JSON. Stage 3–8 remain PARTIAL, no tests run.

## Twelve-stage progress ledger

| Stage | Contract | State | Completion evidence / next action |
| --- | --- | --- | --- |
| 1 | Repository Scan | COMPLETE | Tracked tree, test suites, strict and preflight workflow entrypoints inventoried |
| 2 | Risk and invariant analysis | COMPLETE | Risk families and fail-closed requirements documented below |
| 3 | Exhaustive Test Inventory | 80/80 FILE ROUTES COMPLETE; 728/728 SOURCE ROWS TRIAGED; AST EXHAUSTIVENESS OPEN | Zero '?' remain in rendered rows, but AST/anonymous/cfg completeness remains unresolved; the nine non-method placeholder rows are now explicitly reconciled; E/I tags document only partial assertion ownership. NM1 nested JSON trust, A1 main-card harness and native OS/Keyring/Relay remain unverified. No AST-aware exhaustive signoff. |
| 4 | Executable Branch Map | ALL MAJOR FAMILIES PREMAPPED; OUTCOME MAP PARTIAL | Relay, Settings/Quota/Card, Git/OAuth, release/monitor, native OS, UI helpers and locales mapped; ~1721 lexical anchors still need exact executable outcomes + assertion evidence |
| 5 | Positive and N1–N12 matrix | INITIAL FILE MATRIX COMPLETE; EVIDENCE PENDING | 80 file rows × 13 columns populated with '?' or reasoned NA; method-level coverage needs actual assertions before upgrading '?'. |
| 6 | Meaningful Interaction Matrix | CASE REGISTER PREPARED; EXHAUSTIVENESS OPEN | 51 case groups listed including 10 platform physical groups, with N1–N12 tags and independent state combinations; not implemented-test counts |
| 7 | Coverage estimation | PRELIMINARY | Method planning floors and 51 grouped obligations documented, exact tests per semantic branch not yet reconciled with existing assertions |
| 8 | File-level Coverage Map | ALL 80 SOURCE MAPS ROUTED; ASSERTION CLOSURE PENDING | 80/80 source files route to a focused map; 728 currently rendered lexical/missed callback entries still need per-branch E/P/OS/NA evidence; Node UI branch coverage 46.28% on instrumented modules only. |
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
- [Native monitor cache exact method/branch map](mode-b/branch-map-monitor-cache.md)
- [Native GitHub rate gate exact method/branch map](mode-b/branch-map-rate-gate.md)
- [Native GitHub ETag cache exact method/branch map](mode-b/branch-map-etag-cache.md)
- [Native Relay endpoint and WebSocket URL branch map](mode-b/branch-map-relay-endpoint.md)
- [Native OAuth wire parser and redaction branch map](mode-b/branch-map-oauth-wire.md)
- [Native OAuth session and Keyring branch map](mode-b/branch-map-auth-session.md)
- [Native GitHub REST read client and response projection map](mode-b/branch-map-rest-client.md)
- [Native GitHub OAuth HTTP and Keyring adapter map](mode-b/branch-map-native-oauth-adapters.md)
- [Native CI notification admission and delivery branch map](mode-b/branch-map-ci-notifications.md)
- [Native WSS relay supervisor, phases and frame branch map](mode-b/branch-map-relay-transport.md)
- [Native Git Safe Pull, Safe Push and Safe Sync branch map](mode-b/branch-map-git-safe-operations.md)
- [Owned Git subprocess and Fetch cancellation branch map](mode-b/branch-map-git-owned-processes.md)
- [Tauri main Git admission, Fetch/Sync/Quit concurrency map](mode-b/branch-map-main-git-admission.md)
- [Git enrollment, shallow discovery and inspect branch map](mode-b/branch-map-git-discovery.md)
- [Atomic JSON preferences, recovery and transaction branch map](mode-b/branch-map-config-store.md)
- [Canonical GitHub origin and enrolled native opener branch map](mode-b/branch-map-github-origin-opener.md)
- [Native Settings, persisted scope and side-effect ordering map](mode-b/branch-map-main-settings-scope.md)
- [Main card app.mjs controller and A1/A2 event map](mode-b/branch-map-main-card-controller.md)
- [Cloudflare Relay hub SQLite, WebSocket and DO controller map](mode-b/branch-map-relay-hub-sqlite.md)
- [Cloudflare Worker webhook and native private subscription map](mode-b/branch-map-relay-worker-router.md)
- [Cloudflare TypeScript Durable Object and Worker entrypoint L9 map](mode-b/branch-map-relay-cloudflare-entry.md)
- [Relay protocol, bounded body and raw HMAC L1 branch map](mode-b/branch-map-relay-protocol-crypto.md)
- [Native Relay Secret Keyring and Settings draft transaction map](mode-b/branch-map-relay-secret-keyring.md)
- [Native autostart and privacy-limited startup diagnostics map](mode-b/branch-map-autostart-startup.md)
- [Windows popup geometry, DPI, topmost and Win32 region ownership map](mode-b/branch-map-windows-geometry.md)
- [Linux KDE Wayland GTK Layer Shell geometry and drag map](mode-b/branch-map-linux-layer-shell.md)
- [Linux KSNI tray and native 20-locale action branch map](mode-b/branch-map-native-tray-i18n.md)
- [Embedded tray PNG, RGBA and Linux ARGB conversion map](mode-b/branch-map-native-tray-icon.md)
- [Release asset discovery, canonical receipts and merge branch map](mode-b/branch-map-release-assets.md)
- [Release source versions, three-manifest bump and tag admission map](mode-b/branch-map-release-version.md)
- [Signed local APT package snapshot and GPG verification map](mode-b/branch-map-apt-signed-snapshot.md)
- [APT signing subkey and offline primary authority map](mode-b/branch-map-apt-signing-authority.md)
- [R2 source provenance, signed index and strict platform manifest assertion map](mode-b/branch-map-r2-source-provenance.md)
- [R2 exact public HTTP readback and redirect rejection map](mode-b/branch-map-r2-public-readback.md)
- [R2 conditional upload, CAS and publication receipt gate map](mode-b/branch-map-r2-upload-publish.md)
- [Release receipt validation and GitHub artifact cleanup map](mode-b/branch-map-release-retention.md)
- [Runner REST collector pagination, shared concurrency and scope map](mode-b/branch-map-runner-collector-exact.md)
- [Pure runner/job classification, coverage and idempotent duplicates map](mode-b/branch-map-runner-state-classification.md)
- [GitHub monitor authorization, cache transaction and async races map](mode-b/branch-map-github-monitor-controller.md)
- [Completed CI runs, silent-baseline alerts and exact identity projection](mode-b/branch-map-ci-events-and-status.md)
- [Hybrid relay hints, fallback and REST 15-minute safety schedule](mode-b/branch-map-hybrid-reconciliation.md)
- [Preflight PR scope, Git Bash admission and manual Strict gate](mode-b/branch-map-ci-preflight-admission.md)
- [Unpublished Windows/KDE, Wrangler and native relay lock CI candidates](mode-b/branch-map-ci-native-relay-candidates.md)
- [Exact-main protected release tag DAG, signed APT, R2 and cleanup](mode-b/branch-map-ci-protected-release.md)
- [Tauri Wayland bridge build.rs toolchain and target gating](mode-b/branch-map-native-build-script.md)
- [Linux QA installer SHA admission, reinstall and payload identity map](mode-b/branch-map-linux-qa-installer.md)
- [Linux/Windows autostart read-only acceptance CLI and redaction map](mode-b/branch-map-autostart-acceptance-cli.md)
- [Developer Pillow icon importer, asset sizes and partial-write map](mode-b/branch-map-icon-import-tool.md)
- [Source-level 80-file to branch-map coverage reconciliation register](mode-b/source-map-reconciliation-register.md)
- [GitHub billing UTC report, scoped cache and no invented free allowance](mode-b/branch-map-github-billing.md)
- [Core bounded worker concurrency and atomic shutdown inline Rust assertions](mode-b/branch-map-core-bounded-shutdown.md)
- [About window actual DOM controller and native IPC test map](mode-b/branch-map-about-window-controller.md)
- [Core pure Safe Sync and OAuth Device Flow state policy tests](mode-b/branch-map-core-sync-device-policy.md)
- [Compact metric safe counts and stale monitor presentation merge](mode-b/branch-map-metric-presentation.md)
- [Quota detached WebView native kind authority and asynchronous race map](mode-b/branch-map-quota-async-controller.md)
- [Twenty-locale registry, cardinal plural and card accessibility tests](mode-b/branch-map-localized-counts-and-card.md)
- [GitHub installation authorized pagination and finite redacted errors](mode-b/branch-map-installation-error-provenance.md)
- [GitHub Actions run/job URL admission and summary projection](mode-b/branch-map-model-github-url-admission.md)
- [Repository menu geometry, Git/CI row precedence and scan queue](mode-b/branch-map-repository-menu-scan-queue.md)
- [Card view geometry, native drag gesture and browser menu suppression](mode-b/branch-map-view-drag-contextmenu.md)
- [Quota hover projection, Unicode runner names and bounded sizing](mode-b/branch-map-quota-details-sizing.md)
- [Isolated GPG signer and protected GitHub subkey provisioning shell](mode-b/branch-map-apt-provisioning-shell.md)
- [Immutable 20-locale bundles, Settings/Quota exact-key and bidi projections](mode-b/branch-map-locale-bundles-projection.md)
- [Stage 3–8 method-assertion closure queue and Stage 9 prerequisites](mode-b/stage-3-8-assertion-closure-queue.md)
- [Method assertions: compact status confidence truth table](mode-b/method-assertions-status-metrics.md)
- [Method assertions: GitHub Monitor/Hybrid controller ownership and races](mode-b/method-assertions-github-monitor.md)
- [Method assertions: detached Quota DOM/Tauri private callbacks and kind race](mode-b/method-assertions-quota-controller.md)
- [Method assertions: local Git UI geometry, safe sync and scan single-flight](mode-b/method-assertions-git-ui-queue.md)
- [Stage 3 Rust type and impl-block declaration classification (73 noncallable entries)](mode-b/method-declaration-classification.md)
- [Method assertions: main app.mjs controller owner map and A1 harness contract](mode-b/method-assertions-main-card-controller.md)
- [Method assertions: actual imported Settings controller and native custody gaps](mode-b/method-assertions-settings-controller.md)
- [Method assertions: GitHub runner and CI notification collectors](mode-b/method-assertions-runner-ci-collectors.md)
- [Method assertions: native main.rs Tauri IPC and OS command ownership](mode-b/method-assertions-native-main-ipc.md)
- [Method assertions: Relay secret custody, Keyring faults and platform-only functions](mode-b/method-assertions-relay-secret-native.md)
- [Method assertions: native GitHub OAuth session, public events and generation safety](mode-b/method-assertions-github-auth-session.md)
- [Method assertions: GitHub credential record, Keyring adapter and HTTPS transport](mode-b/method-assertions-github-native-adapter.md)
- [Method assertions: Rust Git core direct integration, cancellation and platform branches](mode-b/method-assertions-git-core.md)
- [Method assertions: Config JsonStore atomic writes, backup recovery and failure boundaries](mode-b/method-assertions-config-store.md)
- [Method assertions: native GitHub ETag, rate gate and OAuth wire schema](mode-b/method-assertions-github-cache-rate-wire.md)
- [Method assertions: native WSS Relay supervisor and bounded reconnect](mode-b/method-assertions-relay-transport-supervisor.md)
- [Method assertions: Windows placement, z-order and rounded-region ownership](mode-b/method-assertions-windows-geometry.md)
- [Method assertions: KDE Wayland Layer Shell, relative-pointer callback and drag lifecycle](mode-b/method-assertions-linux-layer-shell.md)
- [Method assertions: R2 publisher public/private readback, signed APT and latest CAS](mode-b/method-assertions-r2-publisher.md)
- [Method assertions: Quota hover confidence, Unicode and native-backed billing](mode-b/method-assertions-quota-billing-models.md)
- [Method assertions: Cloudflare Relay allowlists, bounded upload and bearer trust](mode-b/method-assertions-cloudflare-relay-protocol.md)
- [Method assertions: Runner state lane classification and strict coverage confidence](mode-b/method-assertions-runner-state.md)
- [Method assertions: native MonitorCache, bounded projection and NM1 trust contract](mode-b/method-assertions-native-monitor-cache.md)
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
semantics, and a provisional register of **717 rendered lexical/source-reconciled
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

Remaining Stage 3–8 work: audit the provisional 717-row source-method register
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

## Completed group-level triage (not complete Mode B)

All **51 scenario groups** in the
[planned-case-register.md](mode-b/planned-case-register.md) now have
a concrete disposition after source and runnable test-body review:

| Status | Groups | Interpretation |
| --- | ---: | --- |
| E_PARTIAL | 31 | Real existing assertions establish **some** required outcomes; unfinished independent branches still planned |
| NEW_GAP_CONFIRMED | 7 | No matching direct behavioral assertion found for the specified outcome; write tests after Stages 3–8 |
| PHYSICAL | 10 | KDE/Windows/Keyring/native compositor acceptance, not derivable from unit/regex tests |
| NEW_HARNESS | 1 | Instrument real `app.mjs` main controller under external IPC/DOM adapters |
| NEEDS_ADAPTER | 1 | Native credential-store failure path needs a contract-seamed adapter, no altered behavior |
| ARCH_STOP_IF_FIX | 1 | Monitor IPC schema restriction might change trust/public contract; decision required before fixing |

The **seven confirmed missing groups** are L1 (body reader absent
with claimed length), L4 (DO automatic ping response), L7 (DO
webSocketClose), L8 (backward-clock history/rate behavior), L9
(Cloudflare TypeScript DO adapter), Q3 (out-of-order popup kind/
locale/scope) and A2 (double Fetch/Safe Sync admission/cancellation).
No arbitrary new test quota is inferred from these seven groups.

Group triage is **not** the Stage 4/8 per-method completion required
by the Mode B SSOT. The original method-level extractor had 707 lexical
candidates and 1,721 prior control-flow anchors; exact branch-to-
assertion coverage remains to be reconciled, including anonymous
callbacks, early returns, cfg paths and compound conditions. The
instrumented UI branch coverage remains at its baseline 46.28% and
`app.mjs` is not measured. We must not skip these gaps or mark
Stage 9 completed.

## Inventory appendices

The per-file method inventory, branch map, Positive/N1–N12 matrix,
interaction matrix, mutation mapping and evidence are populated
incrementally in subsequent **documentation commits** before writing
any Mode B test implementation. A missing entry is a known coverage gap,
not implicit coverage.
