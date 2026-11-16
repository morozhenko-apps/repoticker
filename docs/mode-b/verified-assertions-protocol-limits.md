# Mode B: inspected input validation and hard boundaries

Baseline source `a3ba7fa30fc4c81890d3075f94142942d001cbf3`; reviewed existing runnable JS test bodies only. No new CI or mutation execution.

| Group | Evidence from real subject imports | Remaining uncovered observable variants |
| --- | --- | --- |
| L2 | `tests/mode-b-relay-protocol.test.mjs` invokes actual `boundedRequestBody` with empty/exact/over limit; wrong claimed length, fractional/NaN/Infinity limit, incremental overflow and midstream reader error all reject. | Non-byte reader chunks, cancellation failure, explicit content-length nonzero with absent reader. |
| L3 | Same test file calls `cursorFromUrl` and checks missing/valid cursor, duplicated `after`, unknown params, invalid decimal and overlong value. | Exactly 48-character complete query boundary with safe encoded `%` variants; explicit request truncation security. |
| S3 | `tests/settings-github-confirm.test.mjs` invokes real Settings with fake Tauri IPC to select exactly 100 repos, block 101st with zero `github_set_monitor_org`, then undo extra and persist 100. `tests/github-installations-mode-b.test.mjs` executes 0/2, 100+1 paginated, duplicate/conflicting identity, 101-item malformed page, and exact 100/101-character owner label cases; partial row rejection halts future provider calls. | Combined owner change during second page, 101 rows across pagination and stale account candidate acceptance; native auth scope still requires real platform acceptance. |

These are **E_PARTIAL**, not complete coverage of the entire group. Planned tests must target the concrete residual outcome only, never blindly duplicate existing boundary cases.