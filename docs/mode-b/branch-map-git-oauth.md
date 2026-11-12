# Mode B semantic branch mapping: Git safety, OAuth, ETag and rate control

Baseline: a3ba7fa30fc4c81890d3075f94142942d001cbf3. Stage 4 is PARTIAL.

Evidence labels: E = examined executable domain assertions; C = candidate test named but individual assertions not yet fully mapped; P = proposed missing/interaction case. JS tests reading Rust strings are source contracts, not Rust execution. Stage 12 is not closed.

## Git decision and guarded mutations

| Real production rule | Observable decisions/outcomes | Existing suite candidate | Evidence and remaining check |
| --- | --- | --- | --- |
| classify_sync (core/lib.rs:32) | NoUpstream > OperationInProgress > LocalChanges > Diverged > LocalAhead > FastForward > UpToDate; max u64 | inline Rust simultaneous_unsafe_states_respect_fail_closed_priority; very_large_commit_counts_preserve_direction_without_overflow | E: actual decision function and exact asserted outcomes |
| normalize_root/discover/resolve_enrolled_checkout | missing/relative, tracked/ignored worktree, linked enrollment; input canonicalized before operation | git_integration: missing_root_and_relative_path_rejected; linked_worktree_requires_explicit_root_enrollment | C: inspect mutation-sensitive assertions and symlink/race boundary |
| inspect/inspect_all | dirty, detached, no upstream, concurrent marker, per-repo error and stable input order | git_integration: bounded_inspect_preserves_input_order_and_per_repository_errors; operation_markers_still_block_safe_pull_after_single_admin_dir_resolution | C: inspect truthful unknown/partially inspected after transport failure |
| fetch/fetch_with_cancel | valid checkout; cancel before command, after spawn, after register, timeout and actual Git failure; fetch never changes working tree | Rust inline cancelled_before_launch_does_not_start_a_child; completed_fetch_result_is_not_overwritten_by_late_or_sibling_cancel | C: partial refs after interruption and distinct sibling results |
| run_cancellable_command_with_timeout | spawn/registration/reap failure, process-group cleanup, timeout vs cancelled, pipe drain | Rust inline failed_termination_can_be_retried_without_resignalling_other_children; large_captured_output_does_not_block_waiting_on_child_pipes | C: independent process child cleanup injected failures |
| safe_pull_with_checkpoints/pull_source_unchanged | clean behind and exact branch, upstream, both OIDs rechecked after each checkpoint; --ff-only; zero mutation on mismatch | Rust inline switching_active_branch_after_second_check_cannot_advance_wrong_branch; external_commit_after_second_check_is_not_overwritten_or_merged | C: final merge failure and race after final check |
| parse_single_remote_branch | absent, duplicate, malformed line, exact branch ref, 40/64 hex OID | Rust inline accepts_one_exact_ref_and_oid; refuses_absent_ambiguous_or_malformed_remote_branch | C: trailing whitespace and embedded tab |
| safe_push_with_checkpoint/safe_push | only local-ahead, safe branch, exact same-named upstream, pinned URL/tip, remote check, non-force, no tags | Rust integration safe_push_refuses_to_recreate_deleted_upstream_branch; mirror_mode_cannot_turn_safe_sync_into_an_all_refs_push | C: test each compound guard independently |
| safe_sync | behind->pull, ahead->push, current->AlreadyCurrent, dirty/diverged/unknown->skip; never both directions | Rust integration safe_sync_keeps_offline_fast_forward_for_clean_behind_branch; safe_sync_skips_dirty_and_diverged_and_no_upstream | C: double dispatch and active Quit interaction |

## OAuth, expiry and cache

| Real production rule | Observable decisions/outcomes | Existing suite candidate | Evidence and remaining check |
| --- | --- | --- | --- |
| DeviceSession::new/next_poll/receive/cancel | challenge bounds, poll clock, slow_down, terminal invalidation, cancellation, late success | Rust github_auth.rs refuses_phishing_urls_invalid_user_codes_and_overflow; terminal_device_phases_reject_late_success_and_cancellation | C: cancellation crossed with new native authorization generation |
| TokenExpiration::decide | before/within/after refresh margin, clock rollback, u64 saturation | Rust github_auth.rs refresh_policy_handles_exact_margin_and_saturated_time; mode_b_refresh_lifetime_precedes_stale_access_token_lifetime | C: failed Keyring write mid refresh |
| github_session::github_begin/poll_authorization | new/old epoch, concurrent begin, pending, denied, terminal errors; safe public reason | Rust newer_attempt_invalidates_prior_polling_generation; competing_native_auth_generations_reject_outdated_completions | C: old success after new Disconnect must not touch stored credential |
| github_session::github_access_token_with_cache/github_disconnect | cached/expired, Keyring read/write denial, invalidate ETag, no false connected | Rust session tests and Settings real-UI IPC fixtures | P: injected Keyring write failure under concurrent refresh |
| GitHubETagCache::snapshot/not_modified/save/invalidate | 304 only matching path, auth generation and ETag; 200 freshness; exact size limit; no billing caching | Rust cache tests mode_b_stale_conditional_reply_cannot_replay_after_logout_and_new_login; projected_json_at_exact_maximum_is_allowed_but_one_byte_over_is_not | C: interleaved 304 lookup and cross-account 200 |
| GitHubRateGate::defer/backoff_duration | 429 with/without Retry-After, reset headers, 403 permission, no shorter concurrent cooldown | Rust rate_gate_respects_retry_after_then_reset_and_bounded_fallback; concurrent_defer_calls_never_shorten_an_existing_cooldown | C: invalid header and time rollback combined |

## Interaction matrix (Stage 6)
| Combined independent dimensions | Invariant |
| --- | --- |
| Git dirty/ahead/behind/upstream x external branch switch during remote inspection | never mutate the wrong checkout or force changes |
| Configured push remote x deleted/advanced branch x custom push defaults | no upstream recreation, tag upload or all-refs push |
| Owned Fetch child x cancellation before/after registration x timeout | only owned process groups terminated; unknown outcome never reported as success |
| Device Flow old/new epoch x slow_down x cancellation | stale success cannot store a new bearer after cancel |
| OAuth scope change x ETag 304/200 and pending network reply | old private cache never crosses account generations |
| 429/403/401 response x absent or invalid reset x clock rollback | bounded cooldown and permission classification |
| Normal Quit x owned Fetch x concurrent Safe Sync | single shutdown ownership and no Git mutation after quit |

## Planned mutation-sensitive gaps
- G1 (N4/N5/N7): separately flip each Safe Push source/remote/upstream equality and verify zero side effects
- G2 (N5/N12): remove either Safe Pull final pinned-ref recheck and observe race assertion fail
- G3 (N4/N5): after-spawn/after-register cancellation with reaping failure never becomes Completed
- G4 (N1/N2): parse remote ref and commit OID exact boundaries, never accept ambiguous result
- O1 (N5/N10): old Device Flow result cannot persist token after newer auth generation or cancellation
- O2 (N2/N8): rolled-back clock and slow_down never permit early device poll
- O3 (N5/N12): credential store failure cannot publish connected or stale ETag data
- E1 (N4/N5/N6): 304 must not reuse private data across path/epoch/account
- R1 (N2/N3/N8): 429 without Retry-After and malformed reset metadata retain bounded cooldown

No tests may be implemented until the entire repository Stages 3-8 are reconciled. These are candidate *missing decisions*; inspect existing assertions before adding any duplicates.
