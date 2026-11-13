# Mode B planned-case reconciliation register (not implementation)

Production baseline: `a3ba7fa30fc4c81890d3075f94142942d001cbf3`. This register combines the more specific branch/interaction maps with a stable ID for each missing-or-verification-needed **scenario group**.

**No tests implemented in this register.** `VERIFY` means an existing test may already kill the mutation and needs assertion review; `NEW_HARNESS` means the real app controller is not instrumented by Node coverage; `PHYSICAL` cannot be certified using browser-only mocks; `NEEDS_ADAPTER` requires preserving the public contract; `ARCH_STOP_IF_FIX` signals a possible security schema change that must follow the explicit architectural decision process.

Each group includes multiple boundaries/outcomes and is **not** a promise that one token test covers a whole category. The final test count by category will be derived from actual implemented and verified tests after branch-to-assertion reconciliation. Overlaps are explicitly cross-tagged; no unexecuted test is counted as PASS.

| Case group | Domain | N applicability | Level | Required observable assertion / boundaries | Existing candidate | State |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Relay | N1,N6,N7 | Unit | no reader vs nonzero Content-Length; fail closed with no hang | mode-b-relay-protocol | VERIFY |
| L2 | Relay | N1,N2,N3 | Unit | non-byte stream chunks and failed cancel; exact body cap; bounded error | mode-b-relay-protocol | VERIFY |
| L3 | Relay | N2,N7 | Unit | cursor query too long/duplicate/unknown; reject before DO access | mode-b-relay-protocol | VERIFY |
| L4 | Relay | N4,N5 | Integration | Durable Object constructor auto-response supported/unsupported; install once | relay-hub | VERIFY |
| L5 | Relay | N1,N6,N7,N12 | Integration | bad JSON/internal schema receives 400/422 and performs no SQL write | relay-hub | VERIFY |
| L6 | Relay | N3,N5 | Integration | 0 subscribers, failed websocket close/send, backpressured buffer; healthy peers unaffected | relay-hub | VERIFY |
| L7 | Relay | N4,N5 | Integration | webSocketClose with socket open/closed; no double close or leaked handler | relay-hub | VERIFY |
| L8 | Relay | N2,N8 | Integration | clock rollback across rate limit/history expiry cannot bypass 120/min and 24h | relay-hub | VERIFY |
| L9 | Relay | N4,N9 | Integration | Cloudflare RelayHub public adapter delegates each callback to controller | relay-worker | VERIFY |
| S1 | Settings | N5,N6,N7 | Integration | stale Keyring status vs reopened Hybrid window and newer phase; no false online | settings-github-confirm | VERIFY |
| S2 | Settings | N4,N5,N12 | Integration | ordered save+commit with each failure injected; stage preserved/rolled back; no double store | settings-github-confirm | VERIFY |
| S3 | Settings | N1,N2,N6,N9 | Unit/Integration | 0,1,100,101 repository and installation page; malformed rows fail closed | settings-github-confirm | VERIFY |
| S4 | Settings | N9,N10 | DOM | picker keyboard Home/End/Escape/Tab and RTL; restored focus, Cancel not persisted | settings-github-confirm | VERIFY |
| Q1 | Quota | N5,N8 | Integration | old owner billing rejection after scope switch cannot overwrite newer successful reply | quota-mode-b | VERIFY |
| Q2 | Quota | N3,N9,N10 | DOM | native listener rejects/missing; bounded unavailable, no raw error or fake auth failure | quota-mode-b | VERIFY |
| Q3 | Quota | N5,N6 | DOM | out-of-order kind vs locale/scope update, latest user-selected view wins | quota-mode-b | VERIFY |
| A1 | Main card | N4,N5,N9 | DOM | real app.mjs via Tauri/DOM external adapter, queued hide/render/refresh and double-click | ui;scan-refresh | NEW_HARNESS |
| A2 | Main card | N2,N5,N9 | Integration | double Fetch and Safe Sync contention: one Git mutation, targeted child cancellation | git_integration;git-fetch-cancel | VERIFY |
| A3 | Main card | N6,N10 | DOM | incomplete CI/runner data stays unknown, no token/provider body in DOM | github-monitor;ui | VERIFY |
| G1 | Git core | N4,N5,N7 | Integration | each push route invariant independently flipped; local+remote refs unchanged | git_integration | VERIFY | E_PARTIAL |
| G2 | Git core | N5,N12 | Integration | both pinned-ref checks abort when external branch or upstream tip changes | git_integration | VERIFY | E_PARTIAL |
| G3 | Git core | N4,N5 | Integration | cancel after spawn/register with failed termination/reaping; outcome remains unknown | git.rs inline | VERIFY |
| G4 | Git core | N1,N2,N7 | Unit | invalid remote-branch reply; 0/multiple lines; exact 40/64 hex and mismatched ref | git.rs inline | VERIFY |
| O1 | OAuth | N5,N7,N10 | Unit/Integration | old Device Flow authorized after newer generation/cancel; no store/event | github_auth.rs;github_session.rs | VERIFY |
| O2 | OAuth | N2,N8 | Unit | rolled-back clock plus repeated slow_down never polls early | github_auth.rs | VERIFY | E_PARTIAL |
| O3 | OAuth | N5,N10,N12 | Integration | credential write/delete failure cannot publish connected or stale cached credentials | github_session.rs | NEEDS_ADAPTER |
| E1 | ETag | N4,N5,N6 | Unit | 304 after path/epoch/scope changes refuses private stale projection | github_etag_cache.rs | VERIFY | E_PARTIAL |
| R1 | Rate gate | N2,N3,N8 | Unit | 429 without Retry-After plus invalid reset and backward clock remains bounded | github_rate_gate.rs | VERIFY | E_PARTIAL |
| D1 | Distribution | N3,N12 | Integration | isolated failure at each staged signed-publication boundary leaves no receipt/latest | test_release_r2_contract.py | VERIFY |
| D2 | Distribution | N4,N5 | Integration | concurrent immutable/create + mutable CAS does not overwrite other producer | test_release_r2_contract.py | VERIFY |
| D3 | Distribution | N1,N2,N6,N7 | Integration | bad signature/package fields/checksum/symlink reject before remote access | test_release_r2_contract.py;test_release_assets.py | VERIFY |
| D4 | Distribution | N3,N10 | Integration | HTTP 200 truncation or tainted readback cannot certify release | test_release_r2_contract.py | VERIFY |
| M1 | Monitor | N3,N5 | Integration | task-only refresh with partial page while owner switches | github-monitor.test.mjs | VERIFY |
| M2 | Monitor | N4,N5,N8 | Integration | cooldown boundary during forced refresh, logout, and late response | github-monitor.test.mjs | VERIFY |
| M3 | Monitor | N1,N2,N6 | Unit | runner page 0/1/page limit/+1 and corrupt field never fabricates complete counts | runner-collector.test.mjs | VERIFY |
| H1 | Helpers | N1,N2,N7 | Unit | safe GitHub URLs reject encoded hostile paths, credentials, fragments, overflow IDs | model.mjs;quota-details.test.mjs | VERIFY |
| H2 | Localization | N1,N2,N8 | Unit | plural categories 0/1/2/5/11/21; invalid count and timezone/DST, all 20 locales | locale-counts-and-notifications;localization-20 | VERIFY |
| H3 | Helpers | N5,N6 | Integration | selected owner x old billing/runner x late CI status; never cross identities | github-billing.test.mjs;github-monitor.test.mjs | VERIFY |
| H4 | Helpers | N3,N4,N10 | Unit | provider errors redacted at native producer, not hidden through translation only | github-errors.test.mjs;locale-errors.test.mjs | VERIFY |
| H5 | UI native | N9,N10 | Platform | keyboard focus and translated accessibility on both KDE and Windows | ui-layout;settings-visual-controls | PHYSICAL |
| H6 | Settings storage | N6,N8,N12 | Integration | corrupt saved locale and OS denied write fall back without inconsistent transactional state | settings-github-confirm;config_store | VERIFY |
| OS-A1 | Native OS | N3,N5,N12 | Platform | autostart registration readback mismatch and rollback under OS failure | autostart-integration | PHYSICAL |
| OS-L1 | Native OS | N5,N9 | Platform | KDE Layer Shell show/hide/drag/resize at high DPI and two screens | native-drag;quota-surface | PHYSICAL |
| OS-L2 | Native OS | N4,N9 | Platform | tray open/close/Quit exactly once with no lingering WebKit children | graceful-quit | PHYSICAL |
| OS-W1 | Native OS | N2,N9 | Platform | negative monitor coordinates + DPI/window clipping + focus, Win32 errors | windows-tray-physical-regressions | PHYSICAL |
| OS-K1 | Native OS | N3,N7,N10,N12 | Platform | Linux/Windows Keyring unavailable/locked/revoked, no credential in event/trace | relay_secret.rs | PHYSICAL |
| OS-K2 | Native OS | N4,N5,N9 | Platform | late native relay password dialog and Cancel/OK cannot commit wrong draft | relay_secret.rs | PHYSICAL |
| OS-R1 | Native OS | N3,N4,N5 | Platform | replace WSS stalled handshake with new auth scope, abort previous supervisor task | relay_transport.rs | PHYSICAL |
| OS-R2 | Native OS | N3,N10 | Platform | native WSS failure reason redaction and user-facing Settings phase with REST authority | relay-native-diagnostics | PHYSICAL |
| OS-Q1 | Native OS | N4,N5,N9 | Platform | Quit during Fetch/relay shutdown in polling/Hybrid, no new WebKit SIGABRT | graceful-quit | PHYSICAL |
| NM1 | Monitor IPC | N1,N6,N7,N10 | Integration | extra canary field in runner_state rejected/projected; current contract needs decision | issue#25 | ARCH_STOP_IF_FIX |

## Group-count planning summary (NOT implemented-test counts)

Total scenario groups: 51. Native/physical groups: 10. Counts below are group applicability, **not test count, coverage or completion**:
- N1: 10 groups
- N2: 13 groups
- N3: 12 groups
- N4: 15 groups
- N5: 24 groups
- N6: 12 groups
- N7: 11 groups
- N8: 7 groups
- N9: 12 groups
- N10: 11 groups
- N12: 8 groups
- N11: 0 groups (NA: RepoTicker has no paid entitlement/purchase flow).

## Stage 9 readiness and ordering

1. For each VERIFY group, inspect the actual test body and verify each expected outcome, minimum/maximum boundary and mutation it kills. Subtract already-passing behavior so new test files do not merely duplicate current assertions.
2. Finish source AST/manual branches and all exported methods for the 80-file source map, including the nine data/command entrypoints without lexical method signatures and the main-card anonymous callbacks.
3. Reconcile exact method-level ✔ / reasoned ✖ / ? in the 80-file N1–N12 matrix and branch Coverage Map. Existing passing code-path percentages are not global branch coverage.
4. When all Stages 3–8 are signed off, implement remaining deterministic unit/integration cases using contract fakes. No changes to product trust/public APIs without architecture choice. Keep native physical results separate.
5. Stage 10 mutate key guards/ordering; Stage 11 once final STABLE and separately known-FLAKY, plus physical OS acceptance; Stage 12 must have seven evidence-backed YES answers.

## Specific release blockers

- `app.mjs` not instrumented in current Node UI coverage, not demonstrably 0%; plan executable lifecycle fixture (A1).
- `monitor_cache.rs` privacy/data-shape discrepancy is tracked as GitHub issue #25. The intended schema must be decided before tightening IPC production behavior.
- Intermittent `WebKitWebProcess` SIGABRT is tracked in GitHub issue #23; one normal exit is not closure.
- Cloudflare `ALLOWED_REPOSITORIES` retention proven for one deploy, but live WSS/webhook acceptance on current code remains a separate check (issue #24).


## Reviewed existing assertions

The cases G1, G2, O2, E1 and R1 are now `E_PARTIAL`: see [verified-assertions-git-auth.md](verified-assertions-git-auth.md) for exact runnable source assertions and still-uncovered combinations. This is NOT completion of the entire group or an N-category.
