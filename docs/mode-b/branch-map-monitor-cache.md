# Mode B: native monitor cache method/branch reconciliation

Production SHA: `a3ba7fa30fc4c81890d3075f94142942d001cbf3`; parent documentation HEAD: `71e2e2f9a430d1416bc36003f434207301dbe3df`.
Source: `apps/desktop/src-tauri/src/monitor_cache.rs`, blob `e7546ea54546823e7781e508b9cde126460cdf72`.
**Status: Stage 3–8 PARTIAL.** This is source/test-body inspection, not test execution, an exploit claim, or permission to change the IPC schema.

## Actual existing evidence

- Rust inline `default_status_is_unknown_until_wallet_verification` calls `MonitorCache::default().read()` and asserts false/None/checking. This covers the initial state and normal mutex read.
- Rust `monitor_projection_uses_only_expected_fields` serializes a constructed `MonitorPresentation` and asserts precisely three **outer** keys; it does **not** inspect arbitrary nested runner JSON and does not invoke publish.
- `tests/monitor-presentation.test.mjs`: actual UI merge/reconcile assertions and *static source* assertion that the getter reads the cache without scanning local Git. The Rust getter is not executed by this JS test.
- `tests/mode-b-native-monitor-races.test.mjs`: actual `startGithubMonitoring` JS state/revision/cancellation behavior, but a *fake native invoke* for `github_monitor_publish`; no Rust validator, lock, event, or Tauri IPC authorization is executed.
- `main.rs` registers both Tauri commands and manages one shared `MonitorCache`; `capabilities/default.json` permits the `main` window, and `usage-events.json` only grants `usage` event listening. Do not infer every effective custom-command authorization edge from these static files alone.

Evidence labels in this file: **E** = test calls the real relevant Rust method, **S** = static/source-level only, **?** = no verified direct assertion, **OS** = platform/runtime acceptance needed.

## All production method and branch outcomes

| Method / decision | Existing evidence | Unverified exact outcome |
| --- | --- | --- |
| `CacheState::default` initializes connected=false, summary=None, pending-verification message | E Rust default test | No additional branch present. Do not call initial false status confirmed unauthorized or disconnected. |
| `MonitorCache::read` normal mutex lock and cloned tuple | E Rust default read | Valid published data must read as an independent clone, not an alias. |
| `MonitorCache::read` poisoned mutex recovers with `into_inner` | ? | Deterministic poison-and-join, then read; no panic or mixed tuple. |
| `github_monitor_snapshot` returns only three presentation fields from managed state | E for separately constructed serializer; S for actual getter body | Execute getter with real managed cache after publish, reject and disconnect; ensure no local Git scan. |
| `github_monitor_publish` `runner_state=None` skips shape/size validation | ? | Valid connected/disconnected None and status; no fabricated metrics. |
| `runner_state=Some`: missing/non-object `counts` OR `coverage` rejects | ? | Cross-table null/absent/array/string/number for each key; no cache mutation or event on rejection. |
| `Some` valid `counts`/`coverage` accepts additional keys | Source evidence, issue #25 | Non-secret canary readback (observation only); unknown-key rejection/projection remains an architectural STOP FACTOR if proposed. |
| Serialized runner JSON size `<=262144` vs `>262144` | ? | Valid JSON at exact 262143, 262144, 262145 **bytes**; one-byte edge must reject with unchanged state and zero event. |
| `serde_json::to_vec(Value)` error maps to over-limit | ? | `Value` is a JSON value, not arbitrary serializer: classify defensive branch/unreachable with valid type rather than invent an impossible fixture. |
| `message=None` or no LF with bytes `<=180` is accepted | ? | None, empty, 179/180 bytes, multibyte UTF-8 counts. |
| `message` bytes `>180` OR contains LF rejects | ? | 181 bytes and single LF regardless of length, no cache change/event. CR-only is **currently accepted**; do not silently tighten. |
| On successful validation mutex lock normal/poisoned; replaces three fields | ? | Sequential writes, concurrent read/write without partial state, poisoned-lock recovery. |
| `connected=true` retains passed JSON, `false` clears passed JSON | JS producer fixture only | Native connected→disconnected readback, stale state absent while supplied message remains. |
| Successful publication emits `repoticker-monitor-updated` after unlock, ignores emit error, returns Ok | S JS event listener contract | One event for each accepted publish (including identical state), zero for rejected; event has no secret payload. Characterize current Ok on failed emit without assuming successful UI delivery. |

## Per-surface Positive and N1–N12 status

| Category | State | Required evidence |
| --- | --- | --- |
| Positive | E partial / ? | Default and constructed projection proven; publish/readback/event not directly tested in Rust. |
| N1 | ? | Absent/wrong-type summary keys and malformed status. |
| N2 | ? | 262143/262144/262145 JSON bytes; 179/180/181 status UTF-8 bytes. |
| N3 | NA | Cache has no network I/O; upstream provider failures tested in JS monitor. |
| N4 | ? | Repeat publication should produce the currently coded event behavior, no assumed dedup. |
| N5 | ? | Poisoned mutex, reader/writer interleavings, JS revision races vs native write. |
| N6 | ? | Corrupt shapes and clearing stale JSON on disconnect. |
| N7 | ? / STOP | JSON shape guard; effective command invocation permissions and unknown-key trust contract. |
| N8 | NA | No time or timezone logic in this module. UTF-8 boundaries belong to N2. |
| N9 | OS | Shutdown while publication/event listener active. |
| N10 | ? / STOP | Benign canary and message leakage checks; issue #25, **no proven credential exposure**. |
| N11 | NA | No paid entitlements. |
| N12 | ? / OS | Poison recovery and emitter failure; no persistent disk storage here. |

## Exact planned tests and mutation review (Stage 9, not implemented)

- **MC1 Positive/N6:** native cache default → accepted JSON publish → snapshot → disconnected publish → snapshot. Assert all three fields, clone behavior, and emitted event sequencing.
- **MC2 N1/N2:** table-driven summary shape, JSON serialized byte limit and UTF-8 status length/newline; every rejected call must leave previously accepted cache state unchanged and emit no event.
- **MC3 N4/N5/N12:** deterministic poisoned mutex, concurrent read/write, repeated same-state publish and failed event sink. Do not introduce sleeps; test real locking.
- **MC4 N7/N10:** canary-only additional JSON key, actual Tauri caller permissions and source-to-sink redaction. Decide issue #25 *before* expecting a changed reject/project contract.
- **MC5 OS/N9:** Qt/KDE? **No**: actual application uses GTK/WebKitGTK on KDE and WebView2 on Windows. Run native shutdown/readback acceptance, not JS regex.

Mutation guards to kill: shape `||`→`&&`; size `>`→`>=`; message bytes `>`→`>=`; remove LF guard; replace conditional disconnected clear with unconditional keep; move validation after state write; remove event; remove poisoned-lock fallback. Each requires an exact failing assertion, not a source-text existence check.

Testability: the Tauri command currently couples `AppHandle`, validation, state mutation and emission. If a native harness cannot inject these deterministically, plan a behavior-preserving pure validator + explicit cache/event adapter *after* global Stage 3–8 signoff. Do not change public IPC schema or auth boundaries without architectural review.

## Exit state

This reconciles **one** high-risk Rust source file at method/branch level; it does not close the global 80-file inventory, anonymous closures/cfg branches, 51 case groups, Stage 9 implementation, mutation execution, final stable/flaky gate, or physical acceptance. No production source, tests, workflows, secrets, release tags, branch refs or hosted Worker have changed.
