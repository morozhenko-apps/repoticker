# Mode B: startup diagnostics native method and privacy assertion receipts

Production source `apps/desktop/src-tauri/src/startup_diagnostics.rs`, blob `0c51d81114b9d9d78daa2ab745adaac65121665a`, at `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Audit classification parent `dfee45b2bdbb56df089d36fe050f9c2f2340dd7a`. This is source and existing-test review, not test execution.

## Stage 3: exact eight previously unresolved lexical entries

| Line | Callable or test | Status | Branch/side-effect owner and missing evidence |
| ---: | --- | --- | --- |
| 9 | `initialize` | P_NATIVE | OnceLock first init vs repeated init; monotonic Instant origin never reset |
| 13 | `enabled` | P_NATIVE | Lazy environment snapshot: exactly `"1"` enables, missing/other values disable; OnceLock caches first result |
| 17 | `write` | P_NATIVE | Disabled return vs enabled stderr output; process-relative numbers, static stage labels; direct captured stderr absent |
| 35 | `Span::new` | P_NATIVE | enabled => started Instant; disabled => None, no output |
| 44 | `Drop for Span::drop` | P_NATIVE | started Some => write elapsed; None => no output; checked no duplicate finalization |
| 53 | `allowed_stage` | E_PARTIAL | Real inline Rust test invokes allowlist: `card.start`, `settings.config_auth_ready`, and five unsafe strings. Other nine valid labels and boundary lookalikes unasserted |
| 71 | `trace_startup_stage` | P_NATIVE | disabled returns before stage matching; enabled+allowlisted writes; enabled+unknown silently rejects; command/event stderr not directly tested |
| 85 | `only_fixed_nonsecret_startup_milestones_are_accepted` | TEST_ONLY | One existing inline unit test, not a production callable, not executed in this pass |

The `Span` type declaration and `impl` blocks were previously classified; no change to those records.

## Stage 4–8: source-exact branch/negative/interaction plan

- **SD1 allowlist table (N1/N2/N10):** exercise all 11 admitted literal milestones; reject empty, alternate case, whitespace, newline, path, token-like text, `stage=...`, suffix/prefix, Unicode confusables and embedded control characters. Assert returned exact static string and zero accepted unrecognized input. Existing direct test is partial, not a blanket privacy pass.
- **SD2 environment gating (Positive/N6/N8/N10):** isolate each test process because `ENABLED: OnceLock<bool>` cannot be reset; `REPOTICKER_STARTUP_DEBUG=1`, unset, `0`, `true`, and changed env after initialization. Assert precisely once cached behavior, no disabled logging and only finite stage names. No host environment mutation or global test-order dependencies.
- **SD3 startup clock and Span lifecycle (Positive/N2/N5/N8/N9/N10):** initialized vs lazy origin, two spans, early/normal drop, non-negative process-relative elapsed and duration; capture synthetic stderr via an injected sink only if a behavior-preserving testability seam is needed. No wall-clock timezone sensitivity and no mandatory disk/network flow.
- **SD4 native IPC privacy (N1/N5/N7/N10):** actual `trace_startup_stage` call in enabled and disabled isolated processes; prove unrecognized strings never reach stderr and allowed entries use no raw user-provided text. This requires a real command or source-exact native adapter, not JS fake-IPC consumer tests.
- **Non-applicable:** N3 network, N4 retry/idempotent requests, N11 monetization, N12 storage are not part of this module's contract; N7 applies only to the local IPC data-to-log boundary, not remote authorization.

**Mutation targets:** change `== Ok("1")` to accept another value; remove `enabled` check; change `allowed_stage` fallback from `None` to user string; remove `started` conditional; bypass fixed-label mapping. Each must fail the corresponding newly planned deterministic assertion.

No production change, test addition, suite execution, CI, deployment or OS acceptance was performed. Stage 3 remains incomplete globally.
