# Mode B: native owned Git process / Fetch cancellation and deadline branch audit

Production baseline a3ba7fa30fc4c81890d3075f94142942d001cbf3; crates/repoticker-core/src/git.rs, blob 5b92830d50e9a3d9a97487e3b78454bf3e64de55, process-control source around lines 27–365 and 389–570 plus inline tests around 1673–2164. Prepared parent b69d11444bfd5bbcdf82c5e22e492e4997302518.

Stage 3–8 **partial**. Source and test bodies were inspected; no new process or test was started during this review. The production polling interval of 15 milliseconds is existing implementation, not an invitation to add magic sleeps in new tests.

## Actual executable Rust test evidence

| Existing test | Actual scope and final-state assertions |
| --- | --- |
| failed_termination_can_be_retried_without_resignalling_other_children | Registers PIDs 41/42, injects termination error for 41 and success 42, asserts targeted set contains only 42, retry signals only 41, subsequent Cancel returns false, both unregister, sets empty. |
| failed_target_unregistered_before_retry_is_not_signalled_again | Failed cancel of PID 55, unregister, retry skips stale PID and cancellation state remains true. |
| spawn_registration_cleanup_never_hides_unknown_outcomes | Simulates terminated/reaped success and independent failure/both failure; outcome unknown is preserved when cleanup incomplete, never falsely classified as FETCH_CANCELLED. |
| completed_fetch_result_is_not_overwritten_by_late_or_sibling_cancel | Successful child still succeeds even when targeted; signalled exit maps only targeted child to FETCH_CANCELLED; ordinary exit 7 and actual timeout remain distinct. |
| cancelling_two_owned_fetch_children_yields_two_distinct_cancelled_results | Launches two real shell-owned process groups with distinct workers, uses registration barriers, calls one cancellation and verifies two distinct FETCH_CANCELLED results and cleared running/targeted sets. |
| cancelled_before_launch_does_not_start_a_child | Cancel twice, child spawn/register callbacks must not execute; exact FETCH_CANCELLED result. |
| cancelling_after_registration_terminates_the_process_group | Real Unix group with descendant, channel synchronization, cancel and exact FETCH_CANCELLED result. |
| cancel_between_spawn_and_registration_prevents_a_leaked_child | Controlled cancellation callback after actual child spawn but before register, no callback for successful registration, exact FETCH_CANCELLED result. |
| timeout_terminates_only_its_owned_child_group | Real 150ms deadline, child and helper fail bounded, unrelated process survives; test itself owns and cleans its fixture processes. |
| large_captured_output_does_not_block_waiting_on_child_pipes | Real 200,000-byte stdout plus stderr marker completes with exact counts; concurrent drain works. |
| fetch_deadline_does_not_claim_user_cancellation | Real timed-out Fetch returns deadline/possible partial refs, cancellation object remains unrequested. |
| outbound_timeout_reports_remote_outcome_unknown | Real bounded hung remote command returns unknown-outcome message, not user cancellation. |
| completed_drain_errors_are_distinct_from_inherited_pipe_timeouts | Channel sends read error or disconnect; exact error classes remain distinct from held-open pipe timeout. |
| helper_holding_pipe_after_parent_exit_is_stopped_without_killing_unrelated_process | Linux real shell helper inherits pipe, owned group stops, unrelated process stays alive and PID is verified exited/zombie. |
| bounded_execution_returns_valid_exit_status_and_stderr | Actual subprocess exit 7 with exact stdout/stderr remains observable. |

These are real executable inline process tests on Unix/Linux, not UI mocks. Windows cancellation is implemented separately and cannot inherit their evidence.

## Methods/branches and identified incomplete coverage

| Function | Independent decisions and safety invariants | Coverage status / missing test branches |
| --- | --- | --- |
| configure_background_child / git_command | Windows no console; all platforms use argv with -C checkout and GIT_TERMINAL_PROMPT=0; Windows-specific creation flags vs Unix no-op | S + existing windows-git-process.test.mjs fixture tests; OS Windows actual startup/accessibility pending |
| check_git_process_startup / is_git_process_startup_failure | Windows NTSTATUS C0000142 diagnostic vs ordinary failure; Unix always no special case | E via cfg Windows/Unix inline tests where run; no combined OS smoke claimed |
| FetchCancellation::is_cancelled | normal lock reads flag; poisoned Mutex fail-closed true | E normal; ? deterministic poisoned lock |
| FetchCancellation::cancel / cancel_with | lock poison => error; first cancel sets flag; pending running-targeted diff; errors accumulated but successful PIDs recorded; retry only unresolved; already cancelled+empty => false | E two PID retry and stale unregister; ? poison, three mixed failures and concurrent cancel thread ordering |
| FetchCancellation::register | poisoned lock error; cancelled returns false; running inserts PID (idempotent BTreeSet) | E normal and already cancelled; ? poison and duplicate registration |
| FetchCancellation::unregister | poisoned lock error; removes running and returns whether this PID targeted | E targeted and untargeted; ? poisoned lock, unregister unknown PID |
| terminate_fetch_group Unix | u32->i32 conversion failure; negative PID signals owned group with SIGKILL; ESRCH treated as already absent; other signal error rejects | E real owned termination and unrelated survival; ? u32 beyond i32 MAX, ESRCH/permission injection; do not send real signals to fake PIDs |
| terminate_fetch_group Windows | taskkill /PID /T /F; spawn failure; exit success/failure; try_wait error; deadline with owned taskkill cleanup | ? OS-specific contract fake/Windows physical acceptance, no Unix proxy |
| terminate_fetch_group unsupported target | fixed unsupported error for non-Unix/non-Windows | cfg-only defensive branch, not an available target |
| classify_fetch_completion | targeted+actual interrupted exit => FETCH_CANCELLED; untargeted success/failure unchanged; original Err not masked | E exact Unix signal 9, normal exit 0, normal exit 7, Err timeout; Windows interrupted classification requires native evidence |
| fetch_was_interrupted | Unix exited due to signal vs normal nonzero; Windows any nonzero; other always false | E Unix; ? Win32 taskkill exit and child whose exit code signals unrelated failure |
| unregistered_fetch_cleanup_error | both cleanup results successful preserve original; independently failed termination/reap or both => unknown | E complete full 2x2 matrix and exact message |
| run_cancellable_command / _with_timeout | cancelled before spawn; spawn failure; private process group; cancel between spawn and register; register fail/poison; cancel after register; wait error; unregister error; map targeted completion | E pre-spawn/after-spawn/after-register real process and timeout; ? failed spawn, injected poison, failure of termination AND reap during registration, completion/cancel race across two groups |
| drain_git_pipe | thread reads entire stream; successful bytes, read error, sender dropped | E large pipes, fake error receiver; ? actual reader read error and detached thread cleanup |
| receive_owned_pipe | complete Ok bytes; IO error; sender disconnected; timed out inherited fd; successful owned group cleanup vs failed/unconfirmed cleanup; always unknown on timeout | E reader-error/disconnected and Linux real inherited-fd success cleanup; ? failed cleanup injection/no re-signal of already-exited child, timeout branch with helper escaped group |
| wait_owned_child | missing stdout/stderr; try_wait success/pending/error; bounded timeout; attempt terminate; reaping success/failure; timeout message; after exit drain stdout/stderr | E real success, stderr/200KB, timeout and inherited pipes; ? absent pipe, wait syscall failure, termination failure, denied cleanup, hard reaping timeout (external process adapter) |
| run_bounded_command | spawn failure vs owned stdout/stderr process with timeout | E success, nonzero exit, real deadline; ? spawn fails and pipes unavailable |
| invoke | merge worktree mutation uses direct output without force kill; push uses 120s unknown-outcome timeout; ls-remote 45s; fetch 120s; others 20s; checks Windows DLL initialization | E selected via integration/process tests; ? each timeout routing independent and testable without waiting full 20–120 seconds |
| stderr / required | whitespace-trimmed stderr max 500 Unicode scalar chars; command errors include verb/arguments; nonzero exit vs success | E in actual fixture output; ? 499/500/501 chars, Unicode length, stderr privacy/remote URL and credential output. Do not assume error message is secret-free without inspecting emitted command context |
| fetch / fetch_with_cancel | checkout validation, Fetch only remote refs, cancelled before/after verification, Git process startup/exit errors, network timeout partial ref warning | E real fetch and cancellation; ? invalid checkout race and partial remote-tracking refs under interrupted network |
| Main Tauri dispatch | operation lock/admission, one active Fetch authority, user cancellation / Quit, conflicting Safe Sync and Fetch | JS git-concurrency tests use real UI helpers/source contracts; A2 remains NEW_GAP_CONFIRMED for real main/native admission |

## Critical interactions and mutation-sensitive gaps

1. **G3 owned-child partial cleanup:** registered vs unregistered process, signal failure vs child already exited, reap timeout vs later completion, PID reused. Only owned PID/group may be targeted and no cleanup failure may be reported as harmless success. Real Unix tests cover important rows, deterministic external adapter still needed for rare syscall failures.
2. **A2 duplicate admission:** two UI clicks, Fetch running while Safe Sync requested, Cancel arriving before/after process registration, Quit while OperationLock acquired. Native Tauri main.rs must reject or serialize conflicting commands without accidental second mutation. No false claim that existing JS tests execute that native dispatcher.
3. **Platform split:** Unix process_group and SIGKILL, Windows taskkill /T and CreateNoWindow each require platform-appropriate acceptance. Windows should not be marked E merely because Linux tests run.
4. **Outcomes:** actual finished Fetch success is authoritative even if another child was cancelled; real timeout or cleanup failure is not FETCH_CANCELLED; timed-out Push has **unknown remote outcome** and must not be retried automatically.
5. **Resource safety:** inherited stdout/stderr in descendants cannot strand the GUI or kill unrelated processes. Real Linux test proves one case; injection of escaped helper/denied kill remains an independent branch.
6. **Data disclosure:** required(...) includes args.join and captured stderr. Test whether a supplied remote URL or Git helper echoes sensitive strings; do not claim confirmed leak without reproducing. A fix changing diagnostics privacy contract is a security decision.

## Positive + N1–N12

| Class | State | Meaningful remaining proof |
| --- | --- | --- |
| Positive | E partial | actual Fetch/owned subprocess normal exit and successful stderr preservation |
| N1 | E partial | malformed PID/command, invalid checkout, sanitized stderr |
| N2 | E partial | timeouts and large pipes; exact 500-character, 20/45/120s deadline route and overflow |
| N3 | E partial / ? | process/network timeout tested; DNS/SSH remote error and unresponsive helper failure |
| N4 | E partial / ? | repeated Cancel, failed termination retry; duplicate native command admission pending |
| N5 | E partial / ? | spawn/register/cancel barriers proven; syscall failure and double Fetch/Safe Sync pending |
| N6 | E partial / ? | invalid checkout and stale process registers; corrupted fetch ref state pending |
| N7 | E partial / ? | private process ownership proven on Unix; Windows and error output redaction pending |
| N8 | NA | monotonic Instant deadlines, no locale/date arithmetic; host clock rollback not relevant |
| N9 | E partial / OS | cancellation before/after spawn, Quit/OS process death |
| N10 | E partial / ? | fixed cancellation errors; raw Git stderr and args potentially private, inspect contract |
| N11 | NA | no paid entitlement |
| N12 | E partial / ? | cleanup and pipe failure; working tree read-only/disk full and signal denial injection pending |

## Stage 9 cases planned after complete repository Stage 3–8 mapping

- GP1/G3: parameterize FetchCancellation poisoned/normal locks, duplicate IDs, three-PID mixed success/failure, repeated cancellation and unregister, no duplicate signalling. Mock external termination only, not FetchCancellation.
- GP2/G3: inject spawn failure, failed registration, signal/reap errors, stdout/stderr missing or broken and stream inherited beyond parent exit; assert deterministic ownership and exact unknown-outcome classification. Do not hardcode sleeps.
- GP3/G3: OS-specific process group lifecycle for Linux and Windows under supervised fixtures; no unrelated child killed. Place Windows runs in native acceptance, not the Linux-only suite.
- GP4/G3: individual deadline/status routing for push, fetch, ls-remote, merge and local commands; preserve unknown push outcome vs partial Fetch refs. Avoid full real deadlines via external wait adapter.
- GP5/A2: real Tauri operation dispatch with external Git subprocess controller and two concurrent actions/Cancel/Quit, single mutation and safe child cleanup; exact error/event accounting.

Mutation guard examples: skip cancelled precheck, insert targeted without kill, clear error on failed reap, treat ordinary nonzero as cancellation, terminate all system Git PIDs, drop process-group isolation, change deadline status to success, remove child pipe concurrent drain, omit second in-flight shutdown gate. Every mutation must fail an observable test to count.

No production source, test code, worker, secrets, release or CI changed. Overall Mode B Stage 3–8 remains PARTIAL.
