# Mode B: current repoticker-core function and risk/branch matrix

**Snapshot:** 2026-10-29; `dev` at `926881e03bbea57f0ad5abeae096795c83e3f15f`.
**Mode:** B (Testing); **scope:** all six `crates/repoticker-core/src` implementation files, their embedded unit tests, `git_integration.rs` and `github_remote.rs`.
**Status:** current-source **Stage 3 file-family inventory** and **Stage 4–8 risk/branch planning slice**. This document is NOT the complete repository-wide inventory, full per-function executable branch coverage or accepted Mode B test run.

## 1. Verified production entrypoint register

Direct inspection of all six complete source files, cutting at their first test-only module. **78 syntactically matched function declarations**, of which **32 are public**. OS-specific variants (e.g. Unix and Windows `terminate_fetch_group`) count separately. Trait `fmt`, `Drop::drop`, callback closures, the external `kill` declaration and macro-expanded behavior are not all public functions, but appear here for completeness. Tests themselves are excluded from these counts; implementation-specific closures and error arms must still be mapped before Stage 4 acceptance.

| Source | Named entries | Public | Every named declaration and source line |
| --- | ---: | ---: | --- |
| `lib.rs` | 1 | 1 | `classify_sync:31` (public) |
| `bounded.rs` | 1 | 1 | `bounded_map:7` (public) |
| `config_store.rs` | 12 | 4 | `backup_path:14`, `sibling_name:21`, `create_private:30`, `drop:47`, `sync_directory:54`, `atomic_replace:66`, `load:94`, `quarantine_corrupt:102`, `read_json:127` (public), `save_json:163` (public), `read:181` (public), `update:186` (public) |
| `git.rs` | 57 | 19 | `fmt:20`, `configure_background_child:40`, `configure_background_child:47`, `check_git_process_startup:53`, `is_git_process_startup_failure:62`, `git_command:74`, `is_cancelled:102` (public), `cancel:112` (public), `cancel_with:116`, `register:149`, `unregister:161`, `terminate_fetch_group:172`, `kill:177`, `terminate_fetch_group:190`, `terminate_fetch_group:223`, `classify_fetch_completion:232`, `fetch_was_interrupted:245`, `fetch_was_interrupted:251`, `fetch_was_interrupted:257`, `unregistered_fetch_cleanup_error:264`, `run_cancellable_command:286`, `run_cancellable_command_with_timeout:301`, `drain_git_pipe:387`, `receive_owned_pipe:400`, `wait_owned_child:436`, `run_bounded_command:506`, `invoke:526`, `stderr:554`, `required:560`, `optional:572`, `looks_like_checkout:583`, `verified_checkout:588`, `ignored_child:600`, `validate_ignored_child_names:617` (public), `discover_with_ignored:642` (public), `discover:697` (public), `discover_all_with_ignored:701` (public), `discover_all:717` (public), `resolve_enrolled_checkout_with_ignored:722` (public), `resolve_enrolled_checkout:739` (public), `normalize_root:743` (public), `inspect_all:773` (public), `inspect:793` (public), `git_operation_in_progress:863`, `github_remote_to_browser_url:885` (public), `github_origin_url:914` (public), `fetch:924` (public), `fetch_with_cancel:935` (public), `commit_oid:964`, `pull_source_unchanged:976`, `safe_pull_with_checkpoints:993`, `safe_push_source_unchanged:1045`, `parse_single_remote_branch:1069`, `safe_push:1092` (public), `safe_push_with_checkpoint:1098`, `safe_sync:1222` (public), `safe_pull:1234` (public) |
| `github_auth.rs` | 5 | 5 | `new:55` (public), `next_poll:91` (public), `receive:107` (public), `cancel:135` (public), `decide:156` (public) |
| `shutdown.rs` | 2 | 2 | `begin:11` (public), `is_requested:15` (public) |

Each public method above is a testable artifact. Private production helpers are implementation/branch artifacts and may be exercised through public contracts, except where a deterministic test seam is necessary to prove an otherwise inaccessible safety decision. Do not equate an existing test name with asserted branch coverage.

## 2. Stage 3: test inventory by public behavior and existing candidates

Codes: **C** critical data/security, **H** high OS/reliability. Test levels **U** Rust unit/state, **I** filesystem/Git integration, **P** installed-OS runtime. Scenario targets are independent **planned branch/boundary cases**, not a claim about numbers of new test methods.

| Public behavior (all entrypoints covered) | Risk / level | Existing named evidence candidates | Planned minimum scenarios | Open boundary groups |
| --- | --- | --- | ---: | --- |
| `classify_sync` | C/U | `simultaneous_unsafe_states_respect_fail_closed_priority`, `very_large_commit_counts_preserve_direction_without_overflow`, six initial decisions | 12 | All decision precedence combinations; no worktree mutation |
| `bounded_map` | H/U | `limits_parallelism_and_completes_every_task`, `empty_tasks_and_zero_limit_are_safe`, `blocked_worker_does_not_hold_available_slots_idle`, `callbacks_remain_on_the_coordinator_with_monotonic_counts`, `a_worker_panic_propagates_without_orphaned_workers` | 10 | 0/1/max worker limits, panic and callback ordering, no abandoned scoped threads |
| `read_json`, `save_json`, `JsonStore::read`, `JsonStore::update` | C/U+I | `missing_config_and_backup_return_none_for_caller_defaults`, `atomic_save_preserves_previous_valid_snapshot`, `invalid_primary_recovers_prior_config_and_quarantines_original_bytes`, `missing_primary_recovers_from_valid_backup`, `two_invalid_copies_fail_closed_without_overwriting_files`, `backup_write_error_leaves_original_primary_unchanged`, `concurrent_changes_are_serialized_as_complete_transactions`, `unchanged_transaction_skips_disk_write_and_backup_rotation` | 24 | Truncated/corrupt backup, permission failure in each atomic step, symlink policy, fsync/rename ambiguity, lock poisoning |
| `FetchCancellation::is_cancelled`, `FetchCancellation::cancel`, `fetch_with_cancel` | C/U+I+P | `failed_termination_can_be_retried_without_resignalling_other_children`, `completed_fetch_result_is_not_overwritten_by_late_or_sibling_cancel`, `cancel_between_spawn_and_registration_prevents_a_leaked_child`, `cancelling_two_owned_fetch_children_yields_two_distinct_cancelled_results` | 22 | Register/cancel race, owned-PID scope, timeout versus user cancellation, Unix/Windows termination, drain failures |
| `validate_ignored_child_names`, `discover_with_ignored`, `discover`, `discover_all_with_ignored`, `discover_all` | C/U+I | `discovery_is_shallow_ignores_snapshots_and_invalid_worktrees`, `custom_ignored_child_folders_affect_only_implicit_shallow_discovery`, `ignore_names_are_exact_validated_bounded_and_unicode_capable` | 18 | 0/1/100/101 rules, symlink paths, linked worktrees, broken child vs global Git failure |
| `normalize_root`, `resolve_enrolled_checkout_with_ignored`, `resolve_enrolled_checkout` | C/I | `missing_root_and_relative_path_rejected`, `enrolled_checkout_resolution_accepts_only_canonical_discovered_repositories`, `linked_worktree_requires_explicit_root_enrollment` | 16 | HOME/USERPROFILE, inaccessible roots, paths escaping explicit enrollment, revalidation races |
| `inspect`, `inspect_all` | C/I | `bounded_inspect_preserves_input_order_and_per_repository_errors`, `all_git_operation_markers_resolve_under_absolute_git_dir_in_linked_worktree`, `operation_markers_still_block_safe_pull_after_single_admin_dir_resolution` | 18 | Detached/unborn/invalid state, malformed ahead/behind, failed Git process, dirty submodules, ordered errors |
| `github_remote_to_browser_url`, `github_origin_url` | H/U+I | `canonicalizes_supported_https_scp_and_ssh_github_remotes`, `rejects_untrusted_hosts_credentials_extra_paths_and_url_tricks`, `resolves_real_local_git_origin_without_network_or_worktree_changes` | 14 | Credential/query/scheme/host injection, percent encoding, extra segments, no outbound network |
| `fetch`, `safe_pull`, `safe_push`, `safe_sync` | C/I+P | `fetch_only_changes_remote_refs_and_safe_pull_fast_forwards`, `safe_pull_uses_fetched_refs_without_implicit_network`, `safe_sync_pushes_strictly_ahead_clean_branch_without_force_or_worktree_changes`, `safe_push_refuses_remotely_advanced_tip_before_a_network_write`, `mirror_mode_cannot_turn_safe_sync_into_an_all_refs_push` | 38 | Pinned OID and ref identity, 2 checkpoint races, no force, hook settings, network outcome unknown |
| `DeviceSession::new`, `next_poll`, `receive`, `cancel` | C/U | `device_challenge_rejects_boundary_values_and_untrusted_codes`, `consecutive_slow_down_replies_never_enable_early_polling`, `terminal_device_phases_reject_late_success_and_cancellation` | 24 | Every response variant, expiry +/-1, saturating arithmetic, terminal permanence |
| `TokenExpiration::decide` | C/U | `refresh_policy_handles_exact_margin_and_saturated_time`, `rotated_access_token_policy_refreshes_before_expiration` | 8 | Refresh expiry precedence, exact boundary, overflow and zero margin |
| `ShutdownSignal::begin`, `is_requested` | C/U | `multiple_quit_requests_have_exactly_one_owner`, `queued_operation_cannot_start_after_quit_is_requested`, `shutdown_signal_stays_set_for_fetch_registration_race` | 6 | One owner, monotonic shutdown, operations refused after stop |

**Total per-scenario target: 210** across the above risk-oriented groups, inclusive of existing candidates where adequate. This is **an initial Stage 7 estimate**, not a measured test count, not permission to sample just one scenario per group, and not authorization to write tests before global Stage 3–8 closure. Scenario target totals may change after detailed per-function branch enumeration and must not be claimed as completed cases.

## 3. Stage 4: additional source-confirmed branch decisions to map into final tests

The precise `classify_sync`, pull and push branches already have
[Git safety map](MODE_B_GIT_SAFE_SYNC_BRANCH_EVIDENCE_2026_10_29.md) IDs GS01–GS07, GP01–GP05 and GSP01–GSP10. That map remains a candidate reference. The following rows extend the *previously unmapped core helpers*. **E** means a plausible existing named test candidate, **P** an unproven branch/edge; neither is measured coverage.

| ID | Actual branch and externally observable invariant | Candidate / remaining work |
| --- | --- | --- |
| CORE01 | `bounded_map`: empty tasks -> zero workers/results, `limit=0` clamps to one | E: `empty_tasks_and_zero_limit_are_safe`; P: callback count with empty list |
| CORE02 | `bounded_map`: completed job frees slot immediately; completion callbacks coordinator-only, completion counts monotonic | E: `blocked_worker_does_not_hold_available_slots_idle`, `callbacks_remain_on_the_coordinator_with_monotonic_counts` |
| CORE03 | Worker panics -> propagate after scope termination, not dropped result/deadlock | E: `a_worker_panic_propagates_without_orphaned_workers`; P: simultaneous panic/result order |
| CORE04 | `read_json`: valid primary wins even if backup malformed; missing primary+backup -> None | E: missing/valid fixtures; P: malformed backup with valid primary |
| CORE05 | Invalid primary + valid backup -> quarantine original then atomic restore; invalid/missing backup -> error/no silent reset | E: `invalid_primary_recovers_prior_config_and_quarantines_original_bytes`, `two_invalid_copies_fail_closed_without_overwriting_files` |
| CORE06 | Failed quarantine/atomic replace returns error; staging cleanup and backup must not silently corrupt last good config | E: backup-write error; P: every create/write/fsync/rename failure and cleanup status |
| CORE07 | `JsonStore::update`: changed=true -> atomic save; changed=false -> no disk write; callback error -> no commit | E: `unchanged_transaction_skips_disk_write_and_backup_rotation`; P: callback error, lock poisoned, concurrent error recovery |
| CORE08 | `FetchCancellation`: first cancellation selects owned running PIDs only, subsequent cancel retries previously failed PID only | E: `failed_termination_can_be_retried_without_resignalling_other_children` |
| CORE09 | Spawn/cancel before registration -> terminate and reap owned child; incomplete cleanup -> explicit unknown outcome | E: `cancel_between_spawn_and_registration_prevents_a_leaked_child`, `spawn_registration_cleanup_never_hides_unknown_outcomes` |
| CORE10 | Child finishes while Cancel targets sibling -> completed result preserved, not recoded as cancelled | E: `completed_fetch_result_is_not_overwritten_by_late_or_sibling_cancel` |
| CORE11 | Timeout/pipe inherited by descendant -> bounded cleanup and unknown outcome; never claim normal completion | E: `helper_holding_pipe_after_parent_exit_is_stopped_without_killing_unrelated_process`, `outbound_timeout_reports_remote_outcome_unknown`; P: Windows installed equivalent |
| CORE12 | Git root canonicalization; exact enrolled shallow discovery; ignored only direct children and never implicit linked worktree | E: discovery/enrollment integration tests; P: symlink race and global Git startup failure |
| CORE13 | `inspect`: detached HEAD -> absent branch/upstream, no false FF; ahead/behind malformed -> explicit error | E: integration checks on no upstream; P: malformed rev-list output/failed Git command |
| CORE14 | `github_remote_to_browser_url`: only exact supported GitHub schemes and two safe path segments; invalid -> None | E: three `github_remote.rs` tests; P: complete injection/Unicode/URL matrix |
| CORE15 | `DeviceSession::new`: exact GitHub verification URL, code charset/len, expires/interval 1..3600, checked timestamp adds | E: `device_challenge_rejects_boundary_values_and_untrusted_codes`; P: independent min/max adjacent variants |
| CORE16 | `next_poll`: terminal->Stop, expiry->Expired, early->Wait, eligible->Ready and saturated future scheduling | E: `cannot_poll_more_often_than_github_interval`, `refresh_policy_handles_exact_margin_and_saturated_time` (different function); P: next_poll saturation test |
| CORE17 | `receive`: 9 response discriminants -> pending/slowdown/denied/expired/authorized/failed; no late terminal success | E: `terminal_device_phases_reject_late_success_and_cancellation`, `unsupported_or_invalid_credentials_end_the_attempt`; P: full response-by-time matrix |
| CORE18 | `TokenExpiration::decide`: expired refresh wins; access within margin refreshes; else use access token | E: `refresh_policy_handles_exact_margin_and_saturated_time`; P: exact split at refresh==now |
| CORE19 | `ShutdownSignal::begin`: AtomicBool swap allows one owner; subsequent calls never reset status | E: three shutdown tests; P: concurrent operation admission with real caller |
| CORE20 | `stderr`/Git error propagation may include command arguments and filesystem paths; no raw private names/paths in public logs | **P:** inspect desktop log/diagnostics sinks and verify redaction boundary; no leakage confirmed from this review |

CORE20 is deliberately a privacy **review target**, not an asserted confirmed vulnerability. The source creates path-bearing errors; proving whether any public log leaks those strings requires tracing the native/UI error boundary.

## 4. Stage 5: Positive + N1–N12 applicability for all public functions

Legend: `E` existing test candidate, **assertion adequacy unmeasured**; `P` planned/unverified; `X` not applicable (reason follows). Rows group public entrypoints listed in Section 2; the final required per-function matrix is still outstanding. No empty cells.

| Flow grouping | Pos | N1 | N2 | N3 | N4 | N5 | N6 | N7 | N8 | N9 | N10 | N11 | N12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `classify_sync` | E | X | E | X | X | E | X | X | X | X | X | X | X |
| `bounded_map` | E | X | E | X | X | E | P | X | X | P | X | X | X |
| Config JSON + transaction | E | E | P | P | P | E | E | P | X | P | P | X | P |
| Fetch cancellation + owned subprocess | E | P | E | E | E | E | P | P | P | E | P | X | P |
| Discovery + enrollment + normalization | E | E | E | P | X | P | E | E | X | P | P | X | P |
| Inspection and branch status | E | P | E | E | X | E | E | E | X | P | P | X | P |
| GitHub origin/URL browser normalization | E | E | E | X | X | E | E | E | X | P | P | X | P |
| Fetch, pull, push, safe sync | E | P | E | E | P | E | E | E | X | P | P | X | P |
| Device Flow | E | E | E | X | P | E | E | E | E | E | E | X | X |
| Token expiry decision | E | X | E | X | X | P | X | X | E | P | X | X | X |
| Shutdown signal | E | X | E | X | E | E | X | X | X | E | X | X | X |

**X reasons:** N1 applies only to paths/codes/requests received from outside the typed domain boundary; pure fixed-shape state values have no parse step. N3 is N/A for pure state helpers with no I/O (not for Git subprocesses or config files). N4 is N/A where no retry or repeatable state transition exists. N8 is N/A when neither time nor localization affects the function; Git subprocess deadlines are N8-sensitive. N9 means no user-driven cancellation/interrupt boundary in the pure classifier. N10 is marked planned for error/UI/log-bearing code, not for in-memory pure arithmetic. N11 is always N/A: free application without purchase/entitlements. N12 is N/A without storage or filesystem side effects. Unknowns remain P rather than fabricated coverage.

## 5. Stage 6–8 interaction and mutation review plan

- Enrolled root × symlink/worktree × custom ignored child × injected Git startup failure: discovery must not silently broaden scope or falsely suppress all repos.
- Dirty submodule × branch ahead/behind × in-progress Git operation × modified upstream: choose the most restrictive refusal without fetch/push.
- `safe_push` linked checkout × changed branch/ref/URL while `ls-remote` is in flight × server fast-forward refusal: no force and no mutation of the wrong remote.
- Two owned Fetch children × Cancel targeted only one × first completed successfully × second timeout: preserve per-child outcome; unknown is not cancelled.
- Config primary validity × backup validity × write/rename failure × concurrent update: last good bytes survive or a failure is reported; no silent defaults.
- Device Flow terminal state × expired timestamp × later Authorized × cancellation: terminal status remains final.
- GitHub origin with credential, custom host, query, extra path or unsafe encoding: browser must open only canonical github.com/owner/repo.
- Quit racing with queued Fetch and in-flight process: new work disallowed while existing owned child cleanup is tracked.

Mutation candidates to kill: remove dirty/op-in-progress priority; change `ff-only` or pinned OID to moving refs; drop remote URL equality or explicit non-force refspec; treat failed child termination as successful Cancel; suppress config backup/restore error; turn `next_poll` terminal/expired into Ready; relax GitHub origin allowlist; drop shutdown AcqRel admission.

**Source-to-test coverage summary (NOT measured):** `lib.rs` decision tests; `bounded.rs` scoped-thread tests; `config_store.rs` persistence tests; `git.rs` in-module child/race tests plus `git_integration.rs` and `github_remote.rs`; `github_auth.rs` Device Flow tests; `shutdown.rs` concurrency tests. A test method name does not establish exact branch coverage; source coverage instrumentation and mutation evidence remain outstanding for all six files.

## 6. Required next gate

Finish the same function/branch/N-category reconciliation for the remaining native/Tauri, JS UI, release, shell and workflow source artifacts. Resolve branch and negative matrix P cells, **then** execute Stage 9 additions and Stage 10 mutation checks. This subset does not authorize early marking of Stage 3–8 COMPLETE and is not a claim that 210 cases already passed.

**Validation:** direct GitHub source inspection only in this docs batch. The previous `82eba6f6` Preflight completed SUCCESS in #40935078253; it does not prove this document's plans as passed tests. **No test run, candidate build or R2 publication was started by this documentation update.** No publication timestamp is applicable; source SHA, branch and authoring date are recorded above.
