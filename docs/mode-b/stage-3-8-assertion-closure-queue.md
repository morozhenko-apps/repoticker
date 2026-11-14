# Mode B: Stage 3–8 method-assertion closure queue after 80/80 source routing

Production source baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, named audit branch `audit/mode-b-testing`, parent `f42fd195cd2fc757e5daa14db668cf90023757ed`.

## Exact state: source routing finished, required planning gates not yet signed

- **Complete source navigation:** `source-map-reconciliation-register.md` routes **80 unique production files / 80 focused source maps**, zero group-only or inventory-only routes. A focused map may cover more than one file. This is **not** an executable test-coverage percentage.
- **Stage 3:** `method-level-discovery.md` now has **455/707 lexically classified, partially assertion-linked or explicitly planned entries; 252 remain '?'**. Since the 296 checkpoint, 159 source entries from native Relay Keyring (29), OAuth session (24), OAuth HTTP/Keyring adapter (13), Rust Git Core (61), JsonStore (12), and ETag/RateGate/OAuth wire (20) have been mapped, including 8 TEST_ONLY Rust test functions and 2 FFI declarations that are **not production methods**. Actual 132-test Settings controller fixture exists, app.mjs still A1 NEW_HARNESS, actual Tauri AppHandle/OS Keyring/OAuth network A2/O3 remain untested. This is NOT an AST-based method coverage percentage; cfg, anonymous callbacks, per-method branch/N1–N12 and interaction closure remain open.
- **Stage 4:** `full-matrix-and-coverage.md` records ~1721 lexical branch anchors, not 1721 independently proven executable branches. Existing focused maps provide true/false/invalid/race outcomes for many high-risk methods, but not every one of 707 candidate entries has a complete, individually signed executable branch ledger.
- **Stage 5:** 80-file × (Positive + N1–N12) matrix has explicit known `?` and reasoned `✖` but no comprehensive per-method `✔` sign-off. A source title/test count is not an assertion.
- **Stage 6:** 51 grouped cross-product cases exist, with useful added race examples in newer maps. No exhaustive all-pairs/effective independence proof; OS smoke must be separated from fake-IPC evidence.
- **Stage 7:** Planning floor is preliminary until **existing direct tests vs truly missing independent cases** are reconciled; no fabricated new-test count.
- **Stage 8:** File-level coverage index and branch maps are navigable, but **no complete function-by-function E/P/NA/OS closure register** or updated baseline coverage instrumenting `app.mjs`.
- **Stage 9 remains blocked** by the user's Mode B SSOT until Stages 3–8 are actually signed. The fact that no new tests have been written is deliberate compliance, not test execution evidence. The 747 JS / 104 Python tests cited in SSOT are historical baseline results, not rerun during these docs-only commits.

## Separate the executable test queue from policy STOP factors

| Track / relevant source | What remains to map before Stage 9 | Proposed deterministic case IDs and exact proof needed | Stage 9 prerequisites |
| --- | --- | --- | --- |
| T01 `status-metrics.mjs` | `shown`, `compactStatus` exact 0/1/MAX and `coverage.runners/jobs` combinations | MP1–MP3; direct `import` of real helper; independent known/unknown and unsafe-sum assertions | Ready to finalize N1/N2 matrix |
| T02 `model.mjs` | `safeRunUrl` vs `safeActionsJobUrl` userinfo/query/hash/port and path normalization | MD1–MD2; behavior **characterization first**, no implicit security-policy edit | Need native-opener trace for any behavior change (STOP FACTOR if material) |
| T03 `github-installations.mjs` | second-page provider failure, 9×100+99 vs 10×100, conflicts after page boundary | INS1–INS3; fake `get`, request exact paths, no downstream repo collection after denial | Ready to finalize request trust cases |
| T04 `github-monitor.mjs` | wall-clock rollback, cooldown, force/refresh, 3-way scope/publish/CI race | GM2–GM5 and HY1–HY3 with deferred native invoke + fake clock | Need approved monotonic vs wall-clock *expected behavior* before changing scheduler |
| T05 `quota.mjs` | overlapping `get_usage_popup_kind` vs direct callback/new event, same-scope GET dedup, failed listener | Q3-1–Q3-4 on **real imported** Quota controller | Native kind authority contract must be established before a product change |
| T06 `app.mjs` | actual top-level card DOM/Tauri event and scan/native command sequencing | A1-T1 plus full case map for menu/hover/fetch/CI/repo count; genuine controller, not regex-only | A1 new deterministic harness; native external adapters by contract |
| T07 `scan-refresh.mjs` | callback throws, multiple invalidations and failure propagation | SC1–SC3; real subject with controllable deferred scan, no sleeps | Define callback failure semantics from actual caller |
| T08 `view.mjs`, `repo-menu.mjs` | 0/1/9/10/11/MAX sizes/counts and exact above/below geometry | VW1–VW2, RM-T1; direct real pure functions | Straight source contract |
| T09 `native-drag.mjs` | failed stop, late old start rejection vs newer gesture, no concurrent native seat claims | DG1 with real subject and deferred native start/stop | Independent physical KDE acceptance later |
| T10 `quota-details.mjs`, `quota-size.mjs` | malformed nested metric, split/legacy timestamps, 38 Unicode graphemes, 118/320 exact bounds | QD1–QD3, QS1; no real compositor | Test with actual `Intl`/fake time zone; OS layout later |
| T11 locale projection/dictionaries | full plural cardinal table and malicious/unknown provider text, preserved raw names | LC1–LC5, LB1–LB3; pure actual imported methods, no real provider | Existing 20-language parity test already counts, don't rewrite it |
| T12 `build.rs`, Linux installer | missing compiler/scanner, corrupt SHA/provenance, pre-sudo refusal | NB1–NB4 and LI1–LI3; fake tools / disposable temp root, **never live sudo apt on owner host** | Full success/exec only disposable container/namespace |
| T13 `provision_apt_key.sh`, GPG verifier | 39/40/41 fingerprints, wrong key, no GitHub secret write before validation | APS1–APS4, ephemeral GPG and fake `gh`, no real owner keys | **No live GitHub Secrets or Google Drive backup mutation** |
| T14 native Auth, ETag and Keyring | stale token/disconnect after in-flight read, unable Keyring and rollback | Existing O3 / auth-session maps; real source under injected credential storage | Rust external Keyring seam without altering trust contract |
| T15 native Git IPC / Quit | queued direct native Git operation vs UI Fetch-as-Cancel, one Quit owner | A2 / G2 integration; real OperationLock/ShutdownSignal and native command entry | Avoid changing Git authorization semantics |
| T16 native monitor nested IPC | unknown nested JSON fields rejected vs preserved | NM1 native monitor trust boundary | **Architectural STOP FACTOR: no production change before user choice** |
| T17 CI / release | Preflight actual Bash scope, signed APT/R2 and protected release metadata | CI-A3/A4, CR1–CR5; keep live environment and R2 outside tests | External `apt-release` reviewer settings only owner can verify |
| T18 physical platforms | KDE/Windows tray, WebView, focus, Keyring, native GPG, NSIS/DEB installation | OS1 etc., deterministic host checklist tied to exact source SHA | Owner/controlled real machines, not fake DOM pass |

Each ID above is a **family of independent outcomes**, **not one test** and not a completed Stage 9 implementation. Stage 7 will count table cases and existing test credits only after the artifact-to-branch assertion ledger is reconciled. Do not add representative single-token tests merely to increase totals.

## Concrete closure procedure (remaining planning work)

1. **Normalize Stage 3 method inventory:** traverse original 707 lexical entries, classify Rust type/impl declarations and JS static catalog records as data-only (with structural tests), anonymous closures under owning entrypoints, real Rust/JS/Python/Shell methods, and cfg-gated OS commands. Preserve source line and source SHA.
2. **For each real executable method:** record branch ID; preconditions; positive and every meaningful negative outcome; existing source-true test + assertion match (E), otherwise planned named table case (P), OS-only obligation (OS), or NA with reason. Never label assertion proof by test filename alone.
3. **Update Stage 5 file and per-method N1–N12 cells:** E if reviewed direct assertion satisfies scenario, P for missing test, `✖` for truly nonapplicable; do not turn all P into E just because map linked.
4. **Join Stage 6 cross-domain interactions:** known scope/cancel/Keyring/relay/clock races, not Cartesian every input. Distinguish confirmed pairwise and missing three-way cases; isolate policy STOP from unrelated test mapping.
5. **Stage 7 and Stage 8:** count actual planned new cases per public/executable method and mark traceable E/P/OS totals; report baseline instrumented UI 46.28% **only for included modules**, not entire app.
6. **Stage 3–8 sign-off:** perform an independent consistency check of every 80-file method row, all Positive/N columns and 51 interaction groups. Only then begin Stage 9 test-only commits. Do not run suites until final Stage 11, except permitted focused diagnostics of a real discovered defect.
7. **Stage 10–12:** mutation review, final complete STABLE once, known FLAKY once and physical OS evidence separately. If tool environment lacks local repo or native build, report unexecuted checks, do not fabricate them.

## Resume, risk and evidence

The audit branch is documentation-only; `dev`/main release workflows and Cloudflare-linked deployment must not be touched. The two material STOP areas are **NM1 nested monitor field trust** and any changed `safeRunUrl` external link admission contract. Nonsecurity source-pure test design can proceed without asking for permission.

A future agent can start with `source-map-reconciliation-register.md`, open the owning focused map, inspect the exact production SHA and real test bodies, then fill the matching row of `method-level-discovery.md` and `full-matrix-and-coverage.md`. The original `?` entries are expected and are not a claim that existing tests fail.

No code, tests, CI, hosted environment, user credentials or OS installation were touched by writing this plan.
