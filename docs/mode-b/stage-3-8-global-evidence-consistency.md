# Mode B Stage 3–8 global register consistency and evidence migration checkpoint

**Audit source provenance.** Published audit parent `c1f186b7233d80105a2d67163aba773408de438d`; production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Read-only inspection of the audit Markdown and the exact GitHub `dev` tree. This is not an AST parser, test execution, metric coverage report, or approval for Stage 9.

## Mechanical reconciliation performed

| Source of truth | Verified count | Independent check |
| --- | ---: | --- |
| `source-map-reconciliation-register.md` | **80** distinct production paths | Parse each `Production file` table row, reject duplicates |
| Published `dev` recursive Git tree | **80/80** paths exist | Compare every exact path above against `dev` objects; zero missing |
| `full-matrix-and-coverage.md` Stage 5 | **80** artifact rows × **13** dimensions | Compare path set against source-map register, not just counts |
| `full-matrix-and-coverage.md` Stage 8 | **80** file rows | Compare exact path set against Stage 5 and source-map register |
| `method-level-discovery.md` | **80** exact file headings | Set equality with source-map register |
| `method-level-discovery.md` source records | **717** | 708 numbered candidates and nine `—` source artifacts; zero unclassified `?` row tags |
| Stage 5 Positive + N1–N12 cells | **1,040** | 80 × 13 with **810 `?`**, **230 `✖`**, **zero `✔`** at this checkpoint |

**Do not misread the last line:** zero `✔` in the *aggregate* matrix indicates **no migration of specific assertion evidence to its file-level applicability cells**, not zero existing executable test coverage. Direct real assertions are already inspected in source-specific branch maps and method receipts. The 230 `✖` values reflect the matrix's *provisional applicability assessment*; a code dependency or independent side effect must reopen inappropriate NA.

The 717 candidate rows include Rust type/impl/FFI declarations, test-only functions, inline closures, locale dictionaries and shell entrypoints. They are not 717 production methods. An AST/cfg/anonymous-handler reconciliation must still establish exhaustive callable discovery.

## Evidence migration rules (Stage 4/5/8)

For each actual executable branch, record:
1. Exact source path, source line, **fixed `dev` blob SHA**, method and guard or decision expression.
2. A unique **observable outcome** with concrete expected result, including branch equivalence rationale.
3. Existing **real subject invocation** and exact assertion/test path (E), or indirect invocation (I) plus independent assertion. Source regex, test name, mock of subject, and historic passing count are insufficient.
4. Remaining unproved condition P, native physical OS, or justified NA. Don't conflate native Tauri/Keyring tests with JS fake IPC.
5. Relevant Positive and N1–N12 applicability for each meaningful method, then roll up to file cell. Only mark `✔` if all applicable method outcomes for that cell are proven; otherwise keep `?` and link the actual partial evidence.
6. Scope and mutation-kill claim only after the mutant is **actually executed**; planned mutations remain hypotheses.
7. Global Stage 8 per-file ledger must link those branch records. Host/OS acceptance cannot be closed by isolated Node/Python/Rust tests.

Avoid a blanket find-and-replace converting `?` to `✔`, and do not assign artificial numerical branch coverage from the 1,721 lexical branch anchors.

## Three bounded Stage 4–8 slices already mapped

| Slice | Files / high-risk boundaries | Minimum additional independent test bodies (local estimate) | Current signoff |
| --- | --- | ---: | --- |
| [URL, drag and Worker trust](stage-4-8-trust-closure-slice.md) | `model.mjs`, `native-drag.mjs`, `webhook-verify.mjs`, `worker.mjs` | 16 | PARTIAL |
| [Card/monitor/scan races](stage-4-8-card-monitor-scan-slice.md) | `app.mjs`, `github-monitor.mjs`, `scan-refresh.mjs` | 15 | PARTIAL |
| [Native Git/Quit/Keyring](stage-4-8-native-git-keyring-slice.md) | `main.rs`, `relay_secret.rs`; cross-file Core Git/ShutdownSignal | 14 | PARTIAL |

Arithmetic **16 + 15 + 14 = 45 local planned test bodies**, **not** a global distinct Stage 7 estimate: case IDs and inter-module outcomes may overlap; all other 80-file branch maps remain to be deduplicated. Existing tests are not recounted as new. Physical acceptance is separate.

## Release-gate blockers and prioritized closure path

| Owner / blocker | Evidence and prerequisite | Completion rule |
| --- | --- | --- |
| **A1 main-card controller** | `app.mjs` has source contracts and direct tests of imported helpers, but no proven real main-card import in reviewed tests | Test actual app controller with a minimal faithful DOM plus fake only external Tauri event/IPC, deferred scan and monitor, no fake domain logic |
| **A2 native Git dispatch + Quit** | Rust Core Git/cancellation/shutdown direct tests exist, Tauri `execute`/lock/active token is still source-only | Native command/integration fixture with real command core; temp Git repositories, barriers, no owner's repos or external processes |
| **O3 / RS1, RS2 OS Keyring** | Rust draft and JS Settings tests exist; OS vault write/read/delete and close-versus-commit need a controlled dependency seam | Characterize native store success/failure/race; *do not silently fix* draft restoration or security policy |
| **NM1 nested `runner_state`** | Trust boundary requires architectural decision on nested unknown fields; observed source behavior alone does not authorize rejecting fields | STOP for contract-changing implementation; write source-preserving characterization with explicit expected authority boundaries |
| **Browser URL safety** | `safeRunUrl` accepts broader URL forms than `safeActionsJobUrl` | Characterize both direct functions and trace native opener before deciding on changing policy |
| **Stage 4–8 global completeness** | 810 `?` aggregate cells; 80 routed files with partial method-to-branch evidence | Evidence migration with branch-specific E/P/OS/NA, independent negative cases and interaction trace; no fake pass |
| **AST inventory** | Lexical count and one recovered Wayland callback; anonymous/cfg/extern patterns may be absent | Source-derived, repeatable AST/cfg reconciliation across actual 80 production files |
| **Stage 9+ gates** | Planning not globally signed, no new tests executed | Only after Stages 3–8 actual signoff: test implementation, mutation review, one final STABLE and separately designated FLAKY run, physical acceptance, seven YES checks |

## Next bounded evidence migration package

Start with the real existing `tests/scan-refresh.test.mjs` and `tests/native-drag.test.mjs`: enumerate their direct assertions against source branch outcomes and mark exactly which portions of Stage 5 Positive/N1/N2/N4/N5 they support, **without upgrading an entire file cell** when independent gaps remain. Next match `tests/mode-b-relay-worker.test.mjs` against HTTP branches in `worker.mjs`, including 65,536/65,537 limits, Origin/Cookie, DO failure and 503 redaction. Then do the same for native Rust Core functions, with OS gates kept separate.

The next complete deliverable is a *branch-to-test crosswalk for a bounded file family*, not mass promotion of the 810 `?` entries. If the new crosswalk reveals a production defect, document evidence and follow root-cause/STOP rules before code changes.

**Result:** 80/80 file sets consistent; 717/717 visible rows typed; 1,040/1,040 matrix cells populated, but **no aggregate file-cell has been promoted to demonstrated coverage**. Stages 3–8 globally PARTIAL; no testing/CI/build/OS changes.
