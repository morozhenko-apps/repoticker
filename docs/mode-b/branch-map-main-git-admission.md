# Mode B: Tauri Git action admission, concurrent Fetch, Safe Sync and Quit (A2)

Production baseline a3ba7fa30fc4c81890d3075f94142942d001cbf3. Source apps/desktop/src-tauri/src/main.rs (blob 5ab66298bcaa50668a228d0ef62b99aecb17d134), method block around 301-498, 598-620, 1797-1841. Native dependencies: crates/repoticker-core/src/git.rs, bounded.rs, shutdown.rs and UI app.mjs. Prepared parent 9ae9d5fa91b0497b37425e54a6f8fe0eaaa44700.

This is detailed Stage 3–8 source/behavior review only; A2 remains **NEW_GAP_CONFIRMED** for a real Tauri dispatcher concurrency integration assertion. JS regex tests and Linux core process tests are valuable, but they do not execute the native Tauri execute or OperationLock path.

## Actual evidence and trust partition

- Rust main.rs inline tests safe_sync_accounts_for_every_discovered_repo_state, fetch_remains_unfiltered_and_legacy_pull_retains_narrow_eligibility and unsupported_operations_never_schedule_a_checkout exercise should_schedule_git_target with real decision inputs. These establish selected target admission, **not** the command/lock pipeline.
- Rust core git_integration safe_sync_pushes_strictly_ahead_clean_branch_without_force_or_worktree_changes and safe_sync_skips_dirty_and_diverged_and_no_upstream exercise the real Git decision and state but **not** duplicate Tauri invocation.
- Rust core FetchCancellation tests exercise real owned subprocess cancellation with barriers, not main.rs shared OperationLock/ActiveFetch registration.
- JS git-fetch-cancel.test.mjs, git-process-timeout.test.mjs, graceful-quit.test.mjs and git-concurrency-routing.test.mjs read Rust source strings and assert ordering/structure. They are static contracts only for main.rs.
- Some JS card event tests use a fake Tauri invoke and DOM. They do not certify two native Git actions launched concurrently.

## Method and independent control-flow decisions

| Native function / surface | Actual decisions and observations | E/S and remaining |
| --- | --- | --- |
| ActiveFetchLease::drop | Acquire active registry mutex and clear Option; poisoned mutex skips clear but no panic | S source; ? real loss of operation owner and registry teardown under poisoning |
| git_action_result | Fetched, Updated count, Pushed count, AlreadyCurrent, Skipped reason, exact FETCH_CANCELLED, other errors, always carries chosen local path in authorized UI result | Pure Rust enum mapper; ? direct branch-to-output table including timeout unknown vs cancel and no leaked tokens |
| should_schedule_git_target | fetch/safe_sync true without inspect; legacy safe_pull only FastForward; unsupported command false | E main.rs inline Rust decision tests; should not introduce synthetic inspect calls for fetch/sync |
| execute initial | unknown operation rejects before OperationLock; mutex lock poisoned -> public error; ShutdownSignal before/after Fetch token publication -> reject | S static ordering; ? actual command with poison and shutdown interleavings; target selector must not run on rejection |
| execute Fetch lease | publish one Arc<FetchCancellation> after operation lock, RAII cleanup on every return; second shutdown check cancels late published token | S; ? old token identity while a queued second Fetch begins, no cross-cancel; real native state fixture |
| execute selection | read_config error; discover roots + per-root failures; requested path must equal currently discovered enrolled canonical path; no unauthorized checkout | E Git core enrollment tests; ? command-level selected path error, changed enrollment and partial discovery failure counts |
| execute target filtering | fetch and safe_sync all discovered checkouts; legacy safe_pull only FastForward; target order stable; zero-target begin/finish events | E pure target selection; ? actual full execute selection and event sequence, no discovery-induced mutation |
| execute Fetch batch | bounded_map with concurrency=4, individual fetch_with_cancel per path, start/complete notifications; per-repo outcome retained | Core owned-fetch E and bounded_map tests candidate; ? native batch 0/1/4/5 repos, separate error/cancel outcomes and event order |
| execute Safe Sync / Safe Pull | one checkout at a time, fresh git::safe_sync or safe_pull for each target, sequential progress, no Fetch token and no cancellation of non-Fetch mutations | Git core real integration E; ? native mixed repo and duplicate command queue; lock release on error/unwind |
| notify_progress + finish | begins, per repo start/complete with exact fields, finish once on successful execute; event emit failures ignored | S source; ? phase/count/status payload, no provider secret, emit rejected and partial failure statuses |
| cancel_git_fetch | read active registry independent of OperationLock, missing token -> false, live token -> cancel return, poison/error propagated | S static JS contract; ? native effective command with no Fetch, active Fetch, already cancelled, and concurrent lease drop |
| perform_git_action | spawn_blocking of execute, join error mapped to string, returns vector of ActionResult | S; ? actual Tauri IPC and async request lifecycle under app quit |
| request_quit | ShutdownSignal.begin true exactly once; background worker reads active Fetch, cancels if present, waits OperationLock and app.exit(0); poisoned registries refuse exit | S JS source test, core ShutdownSignal domain test; ? native repeated Quit and single worker, active Fetch, queued Safe Sync, cancellation failure, blocking lock |
| dispatch_menu_action | spawn_blocking execute, emits finished event with result even for failed operation | S; ? simultaneous tray and button actions, late event after window hide/Quit |
| Main window/UI | four buttons, Fetch doubles as Cancel in UI, safe sync scheduler, progress state; a caller may bypass UI disable through direct allowed Tauri IPC | S/JS consumer tests; ? real command contract without depending on UI single-flight assumptions |

## A2 interaction matrix and exact expected state

| Independent operations | Expected invariant / diagnostic output |
| --- | --- |
| Fetch button invoked twice during first in-flight Fetch | Both requests must not overlap in Git mutation, and each child must have distinct cancellation ownership; code's OperationLock **serializes**, it does not necessarily coalesce queued requests. Confirm intended double-click semantics separately rather than asserting coalescence without a contract |
| Fetch starts, then Safe Sync | Safe Sync acquires OperationLock only after Fetch ends or its cancellation cleanup finishes; no branch mutation while Fetch targets remain running |
| Safe Sync starts, then Fetch | Fetch starts only after Safe Sync releases lock; Cancel sees None while Safe Sync holds lock |
| Two Safe Sync requests, local branch initially ahead | First may push, second must re-inspect and normally report AlreadyCurrent; exact returned outcomes and one remote mutation need real temporary remote fixture |
| Fetch cancellation before/after token publish | Before publication: cancel returns false, pending fetch may still begin; Quit second shutdown check cancels after publication. No promise that a Cancel click before Fetch starts will cancel a future not-yet-created token |
| Cancel while Fetch emits per-repo status | Some children may finish and report fetched while targeted children report cancelled; transport/cleanup errors must remain error |
| Quit during active Fetch, queued Safe Sync | Quit marks shutdown, requests cancellation, waits lock, queued action sees shutdown and does not mutate, then process exits if cleanup completed |
| Quit while Safe Sync running | No process-group signal against Safe Sync; shutdown waits current lock and prevents queued operations, then exits |
| Same-path selected vs unselected, enrollment changed during operation | Execute matches only currently discovered enrollment; Git core verifies checkout again before acting; no arbitrary path request |
| Mutex poison or failed config/disk read | Public error, no success event masquerading as completed mutation, no hidden child |

## Positive and N1–N12

| Category | Status | Outstanding native evidence |
| --- | --- | --- |
| Positive | E partial / S | Target decision and Git core tested, actual Tauri execute progress and lock not |
| N1 | E partial | Unknown operation, invalid path, malformed selection and empty root at native IPC |
| N2 | E partial / ? | 0/1/4/5 Fetch parallelism, hundreds of targets and progress counts |
| N3 | E partial / ? | External network/Git timeout under native dispatcher, not just Git core |
| N4 | ? A2 | Double Fetch/Sync invocation, retry after Cancel/partial success |
| N5 | ? A2 | OperationLock, ActiveFetch Arc and Quit races across actual Tauri command |
| N6 | E partial / ? | Removed checkout, changed enrollment/config, poison/unavailable registry |
| N7 | E partial / ? | Path enrollment in Git core; Tauri exposed commands and synthetic request bypass |
| N8 | NA | No calendar/locale logic in Git action admission |
| N9 | ? / OS | Close, window hide, Quit, two UI origins, post-Quit events |
| N10 | E partial / ? | Exact UI result fields; actual Git stderr/paths and progress log privacy |
| N11 | NA | No paid entitlement |
| N12 | ? | Locked config, read errors, OperationLock poison and subprocess cleanup |

## Stage 9 A2 test design, no implementation yet

- MA1: contract-seamed execute with managed OperationLock, ActiveFetch and ShutdownSignal; the real decision, lease and event projection run against a deterministic temporary Git fixture; fake only Tauri external AppHandle/OS operations.
- MA2: use barriers to start simultaneous Fetch + Fetch, Fetch + Safe Sync, Sync + Sync, and Cancel at before/after lease publication; verify exact operations, local/remote commits and all progress/finished event counts. No arbitrary sleeps.
- MA3: Quit while active/queued, cancellation cleanup fails or succeeds, registry/operation lock poison, no new Git mutation after shutdown; assert no double exit.
- MA4: whitelist/enrollment/invalid path, zero/1/4/5 repo target batching and mixed per-repo success/error/cancel with exact stable ordering and statuses.
- MA5: OS KDE/Windows acceptance with shell-owned Fetch children plus tray-triggered Quit, no unrelated PIDs terminated; this does not replace deterministic integration.

Mutations to kill: remove OperationLock, move shutdown gate before/after lease only, clear token before worker joins, skip repo enrollment, let Cancel hold operation mutex, swap completion status to cancelled globally, ignore per-repo errors, call safe_sync concurrently for same checkout. Each requires an observable failing native test.

**No defect is claimed solely because two queued Fetch requests are serialized rather than coalesced.** A policy change to Cancel semantics or activity coalescing is a possible user-visible contract and must be separately decided if needed. Existing O3/ARCH_STOP concerns remain independent.

No production source/tests/CI/published branches or OS state changed. A2 remains NEW_GAP_CONFIRMED; global Mode B Stage 3–8 remain PARTIAL.
