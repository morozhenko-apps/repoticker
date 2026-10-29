# Mode B Stage 1–3: Git safety and GitHub authorization source map

**Read baseline:** `756d29a241d0b02119381f05ca9953dd1725a095`, 2026-10-29.
**Status:** DIRECT SOURCE INSPECTION, PARTIAL STAGE 3. Not a
completed branch map, test matrix, coverage count or passing test run.
**Scope:** 13 current Rust implementation files; 249
syntactically matched named `fn` entrypoints, including test helpers.
This extraction does not capture Rust closure callbacks, trait
implementations, conditional compilation, macro expansion or
individual executable branches. Their manual enumeration remains
mandatory before Stage 3–8 completion.

## Risk priorities (Stage 2)

1. C / Core Git: explicitly enrolled roots, dirty/detached/diverged
   rejection, fetch vs Safe sync separation, concurrent remote move,
   no force push, graceful cancellation, persistence rollback.
2. C / Authentication: device-code expiry and minimum poll interval,
   refresh/revocation races, OS credential writes, OAuth reply schema,
   GitHub installation/scope allowlists, user-initiated disconnect.
3. C / API: 401, 403, 404, 429, transport failures, bounded body,
   pagination and ETag/304, response freshness, scope-aware partial
   counters (unknown is never zero).
4. H / Cache/runtime: stale monitor responses, in-flight dedup,
   shutdown, bounded concurrency, revision isolation, offline
   fallback without leaking credentials or provider payloads.

## Directly inspected function index

These are candidate *artifacts*, not proof that every branch/callback
has been mapped. File risk refers to the most sensitive behavior
within the file. Per-function N1–N12 requires Stage 3 refinement.

| File | Risk | Named Rust functions | Name:line |
| --- | --- | ---: | --- |
| `crates/repoticker-core/src/bounded.rs` | H | 6 | bounded_map:7, limits_parallelism_and_completes_every_task:80, empty_tasks_and_zero_limit_are_safe:115, blocked_worker_does_not_hold_available_slots_idle:137, callbacks_remain_on_the_coordinator_with_monotonic_counts:184, a_worker_panic_propagates_without_orphaned_workers:213 |
| `crates/repoticker-core/src/config_store.rs` | C | 27 | backup_path:14, sibling_name:21, create_private:30, drop:47, sync_directory:54, atomic_replace:66, load:94, quarantine_corrupt:102, read_json:127, save_json:163, read:181, update:186, default_language:220, new:230, pref:241, drop:250, missing_config_and_backup_return_none_for_caller_defaults:256, atomic_save_preserves_previous_valid_snapshot:262, invalid_primary_recovers_prior_config_and_quarantines_original_bytes:279, missing_primary_recovers_from_valid_backup:308, two_invalid_copies_fail_closed_without_overwriting_files:321, invalid_primary_without_backup_never_resets_preferences:333, backup_write_error_leaves_original_primary_unchanged:341, stale_temporary_file_does_not_override_valid_config:353, old_schema_with_omitted_default_field_is_still_supported:365, concurrent_changes_are_serialized_as_complete_transactions:378, unchanged_transaction_skips_disk_write_and_backup_rotation:406 |
| `crates/repoticker-core/src/git.rs` | C | 92 | fmt:20, configure_background_child:40, configure_background_child:47, check_git_process_startup:53, is_git_process_startup_failure:62, git_command:74, is_cancelled:102, cancel:112, cancel_with:116, register:149, unregister:161, terminate_fetch_group:172, kill:177, terminate_fetch_group:190, terminate_fetch_group:223, classify_fetch_completion:232, fetch_was_interrupted:245, fetch_was_interrupted:251, fetch_was_interrupted:257, unregistered_fetch_cleanup_error:264, run_cancellable_command:286, run_cancellable_command_with_timeout:301, drain_git_pipe:387, receive_owned_pipe:400, wait_owned_child:436, run_bounded_command:506, invoke:526, stderr:554, required:560, optional:572, looks_like_checkout:583, verified_checkout:588, ignored_child:600, validate_ignored_child_names:617, discover_with_ignored:642, discover:697, discover_all_with_ignored:701, discover_all:717, resolve_enrolled_checkout_with_ignored:722, resolve_enrolled_checkout:739, normalize_root:743, inspect_all:773, inspect:793, git_operation_in_progress:863, github_remote_to_browser_url:885, github_origin_url:914, fetch:924, fetch_with_cancel:935, commit_oid:964, pull_source_unchanged:976, safe_pull_with_checkpoints:993, safe_push_source_unchanged:1045, parse_single_remote_branch:1069, safe_push:1092, safe_push_with_checkpoint:1098, safe_sync:1222, safe_pull:1234, loader_failure_reports_ntstatus_without_leaking_command_or_repo_path:1250, ordinary_failure_remains_a_regular_git_exit_status:1262, headless_git_command_executes_without_losing_output:1272, headless_child_creation_preserves_exit_status:1282, drop:1311, git:1316, new:1334, unchanged:1389, moving_upstream_to_equally_distant_commit_aborts_without_changes:1398, repointing_upstream_to_equally_distant_ref_aborts_without_changes:1422, moving_upstream_after_second_check_aborts_before_merge:1442, switching_active_branch_after_second_check_cannot_advance_wrong_branch:1466, external_commit_after_second_check_is_not_overwritten_or_merged:1493, remapping_selected_upstream_after_second_check_aborts:1516, ahead_with_bare_remote:1535, switching_branch_while_remote_tip_is_checked_blocks_safe_push:1558, repointing_upstream_while_remote_tip_is_checked_blocks_safe_push:1579, changing_push_remote_during_remote_probe_blocks_safe_push:1603, failed_termination_can_be_retried_without_resignalling_other_children:1644, failed_target_unregistered_before_retry_is_not_signalled_again:1686, spawn_registration_cleanup_never_hides_unknown_outcomes:1700, completed_fetch_result_is_not_overwritten_by_late_or_sibling_cancel:1746, cancelling_two_owned_fetch_children_yields_two_distinct_cancelled_results:1783, cancelled_before_launch_does_not_start_a_child:1829, cancelling_after_registration_terminates_the_process_group:1846, cancel_between_spawn_and_registration_prevents_a_leaked_child:1875, accepts_one_exact_ref_and_oid:1897, refuses_absent_ambiguous_or_malformed_remote_branch:1916, timeout_terminates_only_its_owned_child_group:1940, large_captured_output_does_not_block_waiting_on_child_pipes:1965, fetch_deadline_does_not_claim_user_cancellation:1980, outbound_timeout_reports_remote_outcome_unknown:1998, completed_drain_errors_are_distinct_from_inherited_pipe_timeouts:2013, helper_holding_pipe_after_parent_exit_is_stopped_without_killing_unrelated_process:2035, bounded_execution_returns_valid_exit_status_and_stderr:2107 |
| `crates/repoticker-core/src/github_auth.rs` | C | 13 | new:55, next_poll:91, receive:107, cancel:135, decide:156, challenge:171, refuses_phishing_urls_invalid_user_codes_and_overflow:176, cannot_poll_more_often_than_github_interval:199, slowdown_extends_current_and_future_poll_intervals:212, denied_expired_and_cancelled_sessions_are_terminal:223, authorization_requires_a_nonexpired_active_challenge:248, unsupported_or_invalid_credentials_end_the_attempt:266, rotated_access_token_policy_refreshes_before_expiration:279 |
| `crates/repoticker-core/src/lib.rs` | C | 8 | classify_sync:31, clean:59, clean_behind_branch_allows_fast_forward:70, up_to_date_branch_does_not_pull:78, local_commits_do_not_get_rebased_or_merged:83, modified_or_untracked_files_block_automatic_pull:89, unfinished_operation_blocks_automatic_pull:96, missing_upstream_blocks_automatic_pull:103 |
| `crates/repoticker-core/src/shutdown.rs` | C | 5 | begin:11, is_requested:15, multiple_quit_requests_have_exactly_one_owner:27, queued_operation_cannot_start_after_quit_is_requested:52, shutdown_signal_stays_set_for_fetch_registration_race:72 |
| `apps/desktop/src-tauri/src/github_api.rs` | C | 13 | client:26, api_http_failure:42, valid_name:57, valid_path:67, project_billing:152, project:185, github_api_get:331, rest_client_reuses_connections_but_never_stores_auth_headers:437, only_documented_read_routes_are_allowed:453, completed_run_projection_is_minimal_and_rejects_invalid_facts:494, response_projection_retains_no_oauth_or_repository_secrets:538, projection_exposes_only_actions_minutes_and_minimal_identity:552, github_rest_failures_distinguish_permissions_and_rate_limits_without_provider_text:599 |
| `apps/desktop/src-tauri/src/github_etag_cache.rs` | H | 11 | valid_etag:34, cacheable:43, snapshot:49, unchanged:66, not_modified:74, invalidate:88, save:96, only_matching_conditional_entry_can_supply_304:144, generation_change_blocks_in_flight_and_old_cached_private_data:167, late_http_200_does_not_replace_newer_cache_value:190, cap_and_etag_validation_prevent_unbounded_or_malformed_cache:206 |
| `apps/desktop/src-tauri/src/github_native.rs` | C | 18 | device_challenge_fields:21, fmt:49, from_lease:61, decode:80, entry:100, load:105, replace:114, clear:123, new:139, submit:149, begin:188, poll:195, refresh:209, record:231, github_app_device_challenge_requests_only_its_public_client_id:242, token_bundle_serializes_as_one_keychain_entry_and_never_debug_logs_secrets:249, malformed_and_stale_keychain_values_fail_closed:261, expiry_arithmetic_rejects_overflow_and_inconsistent_refresh:278 |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs` | C | 12 | device_code:26, fmt:32, fmt:49, object:65, valid_ascii_token:76, parse_device_challenge:80, parse_token_reply:108, valid_device_response_keeps_private_code_out_of_debug:162, known_device_errors_are_mapped_without_leaking_server_text:179, bearer_grants_require_lease_expiration_and_refresh_rotation:202, oauth_destinations_and_publisher_client_id_are_fixed:226, invalid_unbounded_or_unknown_oauth_replies_fail_closed:237 |
| `apps/desktop/src-tauri/src/github_rate_gate.rs` | C | 9 | remaining_seconds:18, defer:29, bounded_seconds:38, backoff_duration:47, now_unix:68, github_api_cooldown_seconds:77, rate_gate_respects_retry_after_then_reset_and_bounded_fallback:86, permission_errors_never_enter_rate_gate:115, remaining_time_is_monotonic_and_does_not_shorten_existing_gate:126 |
| `apps/desktop/src-tauri/src/github_session.rs` | C | 29 | default:47, invalidate:56, active:62, progress:66, set_progress:73, unix_now:110, public_error:117, reason_category:139, publish_with_reason:155, publish:174, cancel_pending:178, read_credential:185, store_credential:191, delete_credential:197, github_flow_status:205, github_auth_status:214, github_begin:244, poll_authorization:281, valid_user_code:383, github_copy_user_code:396, github_cancel:406, github_disconnect:411, github_access_token_with_cache:428, github_open_device_page:469, all_auth_failures_are_redacted_and_actionable:489, clipboard_accepts_only_public_github_user_codes:511, terminal_auth_codes_do_not_expose_provider_response_bodies:528, stages_and_errors_are_safe_and_recoverable_without_webview_events:542, newer_attempt_invalidates_prior_polling_generation:571 |
| `apps/desktop/src-tauri/src/monitor_cache.rs` | H | 6 | default:21, read:33, github_monitor_snapshot:55, default_status_is_unknown_until_wallet_verification:69, monitor_projection_uses_only_expected_fields:77, github_monitor_publish:95 |

## Existing suites to reconcile, not assumed passing

`cargo test --locked -p repoticker-core` and
`cargo clippy --locked -p repoticker-core --all-targets -- -D warnings`
are part of the actual `.github/workflows/preflight.yml` stable gate.
Native desktop compilation is a distinct `cargo check --locked -p
repoticker` job. Current GitHub connector has no shell cargo,
and the local shell cannot resolve github.com, so no Rust test
has been executed by this source-scan step.

Next: audit all named functions' actual branches and Rust closure
decisions; complete remaining native OS/release/JS source maps and
Positive/N1–N12 matrices before writing additional Mode B tests.
