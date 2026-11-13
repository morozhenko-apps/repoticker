# Mode B: Core Rust bounded worker pool and atomic shutdown admission

Production unchanged at `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Source files:
- `crates/repoticker-core/src/bounded.rs` blob `b41e0b9d9c2de13f4555e63f5378b409d82dad4a`, 243 source lines, one public `bounded_map` plus **five real inline Rust unit tests**.
- `crates/repoticker-core/src/shutdown.rs` blob `a9d8147a71efe78efbd3dbd7ef0c5d6109aa4733`, 80 source lines, `ShutdownSignal::begin/is_requested` plus **three real inline Rust unit tests**.
- Parent `6c04e11e3721a4510b33767737c5558160355f27` in named `audit/mode-b-testing`.

These tests call the **actual Rust production methods**, use deterministic barriers/channels/atomics and prove more than the prior group source-map title suggested. None were executed during this documentation turn; source and assertions were inspected. The 10-second `recv_timeout` in tests is an anti-hang bound, not a production polling interval. No live Tauri Quit, Git thread or OS process touched.

## Bounded work: direct real test assertions

| Actual test | Production branches and observable evidence |
| --- | --- |
| `limits_parallelism_and_completes_every_task` | 12 tasks, limit 4, initial four worker barrier, max concurrent workers exactly 4, all 12 starts/completions, callbacks `done=1..12`, all 12 results present and correct after sorting |
| `empty_tasks_and_zero_limit_are_safe` | Empty task vector invokes neither callback; `limit=0` clamps to 1 and processes input [1,2,3] in input order with final done=3 |
| `blocked_worker_does_not_hold_available_slots_idle` | First worker held at Condvar, other five tasks start/finish before release, then all six results collected: rolling admission of work as slots free |
| `callbacks_remain_on_the_coordinator_with_monotonic_counts` | Start/complete callbacks run on caller/coordinating thread, monotonic `already_done` and `completed` with total=9 |
| `a_worker_panic_propagates_without_orphaned_workers` | Panicking worker executes under `catch_unwind`, is transmitted over channel, caller resumes unwind; test `catch_unwind` observes Err. Rust scoped threads join on unwind; test does **not** separately assert a final active-thread count in panic scenario |

## `bounded_map` line-of-control decision table

| Decision | Positive/negative paths | Evidence / missing |
| --- | --- | --- |
| task length and `parallelism = limit.max(1).min(total)` | 0 tasks -> no spawn, 0 limit -> one serial worker, limit 4/12 -> at most 4 | E direct; ? limit >task count and exactly 1 task with arbitrary limit |
| initial spawn loop / `start_next` | first min(limit, tasks) get started callback and worker; exhausted pending iterator returns false | E 12 and empty; ? started callback panics prior spawn |
| worker body | catch panic and send `Ok/Err` through mpsc; receiver sees each outcome | E panic propagates, E successful task, ? multiple simultaneous worker panics and channel send failure |
| coordinator `recv` | receives **completion order**, not input order; calls `completed(&result, done,total)`, pushes result, starts next pending | E callback monotonic, rolling admission; output order **not guaranteed** to equal input order when tasks finish out of order |
| `running` count and refill | decrement on reply; only refill if `start_next` can pop pending; exit when running=0 | E maximum concurrency and no blocked slot stall |
| callback thread-affinity | both `started` and `completed` must be on caller thread; `work` executes worker threads | E explicit current thread ID assertions for each callback |
| unwind ordering | worker panic is delivered, coordinator `resume_unwind`, scoped threads join rather than abandon | E caller receives panic; ? workers with independent blockers delaying unwinding and started/completed callback throws |

**Important correction:** output `Vec<R>` is **completion-ordered**. The first 12-worker test **sorts** `results` before asserting the set. Do not assert a stable input-order mapping or write a mutant test requiring it; this API's documented guarantee is completion count and concurrency, not order.

## Shutdown ownership: direct real test assertions

| Actual test | Production branch/interaction |
| --- | --- |
| `multiple_quit_requests_have_exactly_one_owner` | Eight simultaneous callers rendezvous at barrier, exactly one `begin()` returns true, others false; `is_requested` true, second begin false |
| `queued_operation_cannot_start_after_quit_is_requested` | Lock held, queued operation waits; `begin()` occurs first, after lock release queued thread checks `is_requested` and returns false |
| `shutdown_signal_stays_set_for_fetch_registration_race` | Initial false; first begin true; multiple reads true; repeated begin false; flag never resets |

`ShutdownSignal` is an atomic Boolean using `swap(true, AcqRel)` and `load(Acquire)`. The source has **no reset**. These tests prove cross-thread single winner and a controlled queued-operation-after-Quit scenario. They do **not** execute real Tauri `main.rs` dispatch or cancel a native Git child process: the A2 controller/IPC gap remains open.

## Cross-module interactions and outstanding cases

- Native `OperationLock` serialization and `ShutdownSignal` are separate guards. A second direct native Git request may queue, then be rejected once Quit is requested, while UI Fetch-as-Cancel has its own click behavior. **A2 remains unverified at the actual Tauri command boundary.**
- Returning outputs in completion order is intentional; consumers must not bind result positions to task identity unless the result carries identity. Existing callback tests do not prove user-facing Git row identity survives arbitrary reorder in the native caller.
- A worker panic can abort the coordination before remaining results are delivered. That is a fail-fast error (not silently tolerated partial success); inspect caller panic propagation and no orphaned subprocesses.
- The real shutdown side effects (stop fetch, disable UI actions, close WebView, remove tray and exit process) are managed by native `main.rs` and remain distinct OS acceptance.
- Independent tasks can complete while first is blocked, proven by Condvar; no production `sleep` was needed.

## Positive / N1–N12

| Class | Direct evidence and still needed |
| --- | --- |
| Positive | E actual Rust pool 12/4 and controlled atomic Quit ownership |
| N1 | E worker panic, zero-limit/empty, queued after shutdown; ? started/completed callback panic |
| N2 | E zero tasks/limit, 4/12, one blocked and 9 callbacks; ? limit > total and 1 task |
| N3 | NA pure local threading; caller's external Git/API errors separate |
| N4 | E repeated shutdown begin idempotent; bounded_map repeat with same tasks not directly asserted |
| N5 | E 8 concurrent Quit, rolling 6-task, worker panic; ? callback panic and multi-error order |
| N6 | NA no stored cache/DB in this module |
| N7 | E admission-after-Quit false, native IPC authorization still separate |
| N8 | NA no wall-clock logic (10-second test timeout only) |
| N9 | E synthetic Quit signal, no physical native app shutdown |
| N10 | NA no provider credentials or logs |
| N11 | NA |
| N12 | E panicking worker fail-fast, Rust thread spawn/system resource exhaustion is not simulated |

## Incremental Stage 9 candidates (only after global Stages 3–8)

- BS1: `bounded_map` limit > input size and single item, assert exact callbacks/concurrency without assuming input-order output.
- BS2: completion order intentionally reverse under deterministic barriers, assert identity-preserving completed results and caller callbacks, not sorted order.
- BS3: panic in `started` or `completed` with active workers, assert no permanently blocked scoped threads and no falsely completed publication; use bounded channels, avoid sleep.
- BS4: native `main.rs` Tauri command integration: queued Git operation blocked behind lock, Quit wins, queued request fails before remote Git side effect, and actual Fetch cancellation does not orphan process.
- BS5: physical KDE/Windows shutdown/pending requests and tray/window behavior after Quit, separately from this pure atomic test.

Mutation targets: permit active>limit, skip refill on completed task, miscount done, move callbacks onto workers, swallow worker panic, let two Quit owners win, or reset flag. Existing direct tests kill many of these logically; no mutation testing was run. Global Stage 3–8 PARTIAL.
