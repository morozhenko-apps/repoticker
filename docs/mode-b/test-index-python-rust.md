# Mode B existing test inventory: Python release contracts and Rust core integration

Exact source SHA `5b07a3273a27516af8ceb793f0d427a1bada964b`. Python Strict evidence: 98 release tests + 6 CI-policy tests (104 total), all success. Rust core: successful unit/integration in Strict; Rust tests may be inline in production modules in addition to the two integration files below. `fn` discovery for Rust test attributes is a heuristic; do not use counts as the CI result.

Files **15**, Python declarations **104**, Rust integration declarations **33**.

### `tests/test_ci_policy.py`

Declared test functions **6**; suite classes: `class CIPolicyTests(unittest.TestCase):`. The actual runner's outcomes remain authoritative.

- L22 `def test_GivenOrdinaryJobs_WhenParsed_ThenBudgetsDAGAndTrustRemainStrict(self):`
- L47 `def test_GivenCachesAndCommands_WhenParsed_ThenOnlyTrustedWritersAndOneStablePassRemain(self):`
- L67 `def test_GivenDependencyOutcomes_WhenAdmissionRuns_ThenOnlyExactApplicableEvidencePasses(self):`
- L107 `def test_GivenRealGitChanges_WhenClassified_ThenOnlyKnownProseSkipsAndBothRenameSidesCount(self):`
- L120 `def test_GivenMissingMetadataOrExplicitDispatch_WhenClassified_ThenNoFalseSkipIsProduced(self):`
- L129 `def test_GivenManualStableGate_WhenParsed_ThenOnePassAndTrustedBoundariesRemain(self):`

### `tests/test_release_apt_integration.py`

Declared test functions **1**; suite classes: `class SignedAptIntegration(unittest.TestCase):`. The actual runner's outcomes remain authoritative.

- L18 `def test_given_real_signed_flat_apt_when_verified_then_direct_deb_and_catalog_are_identical(self):`

### `tests/test_release_assets.py`

Declared test functions **5**; suite classes: `class ReleaseAssetsTest(unittest.TestCase):`. The actual runner's outcomes remain authoritative.

- L12 `def test_artifact_names(self):`
- L16 `def test_windows_collection_requires_whole_semver_source_token(self):`
- L46 `def test_windows_collection_rejects_ambiguous_exact_source_versions(self):`
- L57 `def test_candidate_collection_rejects_noncanonical_requested_versions(self):`
- L66 `def test_merge_validates_all_platforms_and_bytes(self):`

### `tests/test_release_candidate_contract.py`

Declared test functions **6**; suite classes: `class ReleaseCandidateContract(unittest.TestCase):`. The actual runner's outcomes remain authoritative.

- L13 `def test_locked_workspace_packages_match_both_cargo_and_tauri(self):`
- L23 `def test_candidate_linux_and_windows_collect_current_workspace_version(self):`
- L32 `def test_candidate_bundles_have_sha_receipts_and_cannot_publish(self):`
- L43 `def test_linux_candidate_reports_bundler_errors_without_weakening_gates(self):`
- L51 `def test_candidate_changes_to_version_or_lockfile_trigger_both_builds(self):`
- L64 `def test_publication_restricted_to_main_matching_tag_and_protected_env(self):`

### `tests/test_release_lockfile_contract.py`

Declared test functions **2**; suite classes: `class CargoLockfileContract(unittest.TestCase):`. The actual runner's outcomes remain authoritative.

- L9 `def test_workspace_lockfile_is_tracked_policy_not_ignored(self):`
- L19 `def test_all_cargo_quality_gates_refuse_implicit_resolution(self):`

### `tests/test_release_native_candidate_paths.py`

Declared test functions **3**; suite classes: `class NativeAcceptancePaths(unittest.TestCase):`. The actual runner's outcomes remain authoritative.

- L31 `def test_every_critical_source_family_triggers_unpublished_cross_os_acceptance(self):`
- L53 `def test_documentation_only_commits_do_not_trigger_expensive_os_bundles(self):`
- L64 `def test_unpublished_windows_and_kde_gates_remain_required(self):`

### `tests/test_release_native_gate_contract.py`

Declared test functions **3**; suite classes: `class NativeDesktopPreflightContract(unittest.TestCase):`. The actual runner's outcomes remain authoritative.

- L9 `def test_native_tests_execute_in_desktop_job(self):`
- L16 `def test_windows_native_unit_gate_is_in_unpublished_candidate_workflow(self):`
- L23 `def test_desktop_result_remains_required_and_fail_closed(self):`

### `tests/test_release_provisioning.py`

Declared test functions **2**; suite classes: `class SigningPassphraseIntegration(unittest.TestCase):`. The actual runner's outcomes remain authoritative.

- L30 `def test_isolated_correct_and_incorrect_passphrases(self):`
- L73 `def test_github_secret_write_is_after_verification(self):`

### `tests/test_release_r2_contract.py`

Declared test functions **67**; suite classes: `class PublicationFixture(unittest.TestCase):`, `class Reply:`, `class IdentifiedPublicReadbackTests(unittest.TestCase):`, `class Reply:`, `class RedirectingTransport:`, `class ExactPublicTransport:`, `class UploadSafetyTests(unittest.TestCase):`, `class NotFound(Exception):`, `class Forbidden(Exception):`, `class Body:`, `class PreconditionFailed(Exception):`, `class FakeS3:`, `class ServiceError(Exception):`. The actual runner's outcomes remain authoritative.

- L121 `def test_given_flat_distribution_when_isolated_exact_source_map_contains_signed_apt_and_release_files_then_contract_is_enforced(self):`
- L139 `def test_given_flat_distribution_when_signed_apt_indexes_match_actual_sizes_and_digest_with_lf_and_crlf_then_contract_is_enforced(self):`
- L148 `def test_given_flat_distribution_when_old_signed_apt_index_must_reject_new_indexes_then_contract_is_enforced(self):`
- L156 `def test_given_flat_distribution_when_signed_apt_index_rejects_wrong_size_digest_missing_and_duplicate_then_contract_is_enforced(self):`
- L187 `def test_given_flat_distribution_when_packages_control_exactly_binds_signed_index_to_approved_deb_then_contract_is_enforced(self):`
- L197 `def test_given_flat_distribution_when_signed_but_wrong_package_control_fields_fail_before_publication_then_contract_is_enforced(self):`
- L239 `def test_given_flat_distribution_when_separately_signed_gzip_must_expand_to_identical_packages_then_contract_is_enforced(self):`
- L258 `def test_given_flat_distribution_when_corrupt_manifest_and_wrong_git_provenance_rejected_then_contract_is_enforced(self):`
- L266 `def test_given_flat_distribution_when_modified_bundle_bytes_rejected_then_contract_is_enforced(self):`
- L272 `def test_given_flat_distribution_when_unexpected_release_sidefile_and_symlink_rejected_then_contract_is_enforced(self):`
- L284 `def test_given_flat_distribution_when_staged_apt_deb_must_match_validated_linux_deb_then_contract_is_enforced(self):`
- L290 `def test_given_flat_distribution_when_public_readback_verifies_full_body_and_size_then_contract_is_enforced(self):`
- L307 `def test_given_flat_distribution_when_latest_manifest_points_only_to_immutable_approved_artifacts_then_contract_is_enforced(self):`
- L383 `def test_given_flat_distribution_when_flat_publication_preserves_single_binary_and_publishes_latest_last_then_contract_is_enforced(self):`
- L401 `def test_given_flat_distribution_when_failed_final_latest_readback_never_emits_deletion_receipt_then_contract_is_enforced(self):`
- L407 `def test_competing_latest_publisher_after_apt_start_does_not_get_overwritten(self):`
- L414 `def test_failed_public_readback_has_no_receipt_even_when_private_latest_committed(self):`
- L421 `def test_given_flat_distribution_when_receipt_cannot_be_emitted_with_missing_credentials_then_contract_is_enforced(self):`
- L427 `def test_given_prior_publication_receipt_when_republishing_then_no_client_or_remote_write(self):`
- L444 `def test_given_invalid_run_id_when_publishing_then_validation_precedes_remote_access(self):`
- L462 `def test_existing_latest_manifest_refuses_before_source_map_or_network(self):`
- L475 `def test_dangling_latest_symlink_is_rejected_without_creating_target(self):`
- L489 `def test_dangling_receipt_symlink_is_rejected_before_any_artifact_read(self):`
- L502 `def test_failed_immutable_public_readback_stops_before_mutable_indexes(self):`
- L512 `def test_failed_mutable_public_readback_cannot_publish_signed_commit_marker(self):`
- L520 `def test_failed_inrelease_readback_never_writes_latest_pointer(self):`
- L526 `def test_late_local_latest_manifest_collision_is_still_rejected(self):`
- L534 `def test_invalid_source_files_fail_before_opening_a_remote_s3_client(self):`
- L543 `def test_invalid_source_version_and_commit_are_rejected_before_signing(self):`
- L554 `def test_zero_and_oversized_release_file_are_rejected_without_reading(self):`
- L564 `def test_release_safe_file_rejects_dangling_symlink_without_following_it(self):`
- L572 `def test_manifest_duplicate_file_entry_cannot_become_an_approved_artifact(self):`
- L580 `def test_platform_manifest_symlink_is_not_a_verified_manifest(self):`
- L588 `def test_signed_apt_keyring_symlink_is_refused_before_running_gpgv(self):`
- L598 `def test_signed_apt_directory_symlink_is_not_a_verified_source(self):`
- L605 `def test_signed_non_utf8_packages_catalog_is_rejected_as_corrupt(self):`
- L648 `def test_given_release_assets_when_public_readback_then_request_identifies_repoticker(self):`
- L667 `def test_default_readback_rejects_any_redirect_before_accepting_matching_bytes(self):`
- L703 `def test_default_readback_installs_no_redirect_policy_for_successful_exact_url(self):`
- L728 `def test_given_multichunk_response_when_readback_then_complete_sha_and_size_are_verified(self):`
- L737 `def test_given_non200_or_edge_rejection_when_readback_then_no_success_receipt(self):`
- L752 `def test_given_invalid_public_bytes_when_readback_then_checksum_and_size_fail_closed(self):`
- L769 `def test_every_non_success_public_status_is_rejected_before_read(self):`
- L778 `def test_missing_local_source_aborts_without_issuing_a_public_request(self):`
- L785 `def test_network_error_is_propagated_without_a_verified_receipt(self):`
- L793 `def test_same_size_multichunk_corruption_fails_full_digest_check(self):`
- L876 `def test_given_flat_distribution_when_missing_file_is_uploaded_to_isolated_bucket_and_sha_verified_then_contract_is_enforced(self):`
- L885 `def test_given_flat_distribution_when_immutable_identical_blob_is_reused_without_upload_then_contract_is_enforced(self):`
- L892 `def test_given_flat_distribution_when_immutable_conflict_rejects_without_overwriting_existing_bytes_then_contract_is_enforced(self):`
- L899 `def test_given_flat_distribution_when_mutable_index_updates_with_no_store_cache_control_then_contract_is_enforced(self):`
- L905 `def test_given_flat_distribution_when_private_readback_mismatch_fails_before_public_proof_then_contract_is_enforced(self):`
- L911 `def test_given_flat_distribution_when_forbidden_head_does_not_turn_into_an_unverified_upload_then_contract_is_enforced(self):`
- L920 `def test_500_head_failure_never_becomes_missing_immutable_object(self):`
- L928 `def test_missing_head_error_metadata_is_not_equivalent_to_404(self):`
- L934 `def test_existing_immutable_object_without_sha_metadata_is_rejected(self):`
- L940 `def test_forged_identical_sha_metadata_does_not_hide_corrupt_stored_bytes(self):`
- L947 `def test_private_readback_truncated_and_oversized_are_both_rejected(self):`
- L957 `def test_private_s3_get_failure_is_not_treated_as_proof_of_uploaded_bytes(self):`
- L969 `def test_immutable_create_is_single_part_atomic_if_none_match(self):`
- L976 `def test_second_writer_cannot_replace_newly_created_immutable_key(self):`
- L987 `def test_mutable_replacement_uses_original_etag_compare_and_swap(self):`
- L995 `def test_competing_mutable_writer_causes_412_without_clobber(self):`
- L1006 `def test_existing_mutable_without_valid_etag_fails_before_write(self):`
- L1014 `def test_idempotent_mutable_readback_reuses_same_content_without_write(self):`
- L1022 `def test_latest_pointer_compare_and_swap_is_pinned_to_pre_apt_snapshot(self):`
- L1036 `def test_same_latest_pointer_recovery_does_not_rewrite_r2(self):`
- L1049 `def test_latest_pointer_creation_rejects_competing_new_object(self):`

### `tests/test_release_retention_contract.py`

Declared test functions **2**; suite classes: `class ReleaseArtifactRetention(unittest.TestCase):`. The actual runner's outcomes remain authoritative.

- L10 `def test_given_release_when_staged_then_both_archives_expire_after_one_day(self):`
- L30 `def test_given_release_when_finalized_then_cleanup_and_text_only_notes_follow_public_readback(self):`

### `tests/test_release_signing.py`

Declared test functions **1**; suite classes: `class SigningIdentityTests(unittest.TestCase):`. The actual runner's outcomes remain authoritative.

- L29 `def test_subkey_only_authority(self):`

### `tests/test_release_strict_contract.py`

Declared test functions **3**; suite classes: `class StrictStablePolicyContract(unittest.TestCase):`. The actual runner's outcomes remain authoritative.

- L16 `def test_given_strict_workflow_when_triggered_then_only_explicit_dispatch_is_allowed(self):`
- L21 `def test_given_mode_b_stable_suite_when_strict_runs_then_each_required_command_runs_once(self):`
- L36 `def test_given_stable_gate_when_failing_then_no_repeat_or_quarantine_can_hide_failure(self):`

### `tests/test_release_version.py`

Declared test functions **3**; suite classes: `class VersionContract(unittest.TestCase):`. The actual runner's outcomes remain authoritative.

- L16 `def test_repo_markers_agree(self):`
- L24 `def test_tag_validation_is_strict(self):`
- L37 `def test_bump_in_isolated_copy(self):`

### `crates/repoticker-core/tests/git_integration.rs`

Declared test functions **30**. The actual runner's outcomes remain authoritative.

- L109 `fn discovery_is_shallow_ignores_snapshots_and_invalid_worktrees() {`
- L121 `fn fetch_only_changes_remote_refs_and_safe_pull_fast_forwards() {`
- L144 `fn untracked_and_dirty_files_skip_without_stashing() {`
- L162 `fn divergent_commits_skip_without_merge() {`
- L178 `fn branch_with_no_upstream_skips() {`
- L188 `fn explicitly_enrolled_root_can_be_the_repository_itself() {`
- L197 `fn missing_root_and_relative_path_rejected() {`
- L203 `fn safe_pull_uses_fetched_refs_without_implicit_network() {`
- L223 `fn enrolled_checkout_resolution_accepts_only_canonical_discovered_repositories() {`
- L250 `fn linked_worktree_requires_explicit_root_enrollment() {`
- L274 `fn bounded_inspect_preserves_input_order_and_per_repository_errors() {`
- L301 `fn operation_markers_still_block_safe_pull_after_single_admin_dir_resolution() {`
- L327 `fn all_git_operation_markers_resolve_under_absolute_git_dir_in_linked_worktree() {`
- L368 `fn custom_ignored_child_folders_affect_only_implicit_shallow_discovery() {`
- L403 `fn ignore_names_are_exact_validated_bounded_and_unicode_capable() {`
- L439 `fn built_in_exclusions_remain_enforced_without_custom_configuration() {`
- L459 `fn safe_sync_pushes_strictly_ahead_clean_branch_without_force_or_worktree_changes() {`
- L495 `fn safe_sync_keeps_offline_fast_forward_for_clean_behind_branch() {`
- L510 `fn safe_sync_fails_closed_when_remote_advanced_beyond_stale_tracking_ref() {`
- L530 `fn safe_sync_skips_dirty_and_diverged_and_no_upstream() {`
- L556 `fn safe_push_rejects_split_push_url_or_nonmatching_upstream_branch() {`
- L599 `fn safe_push_respects_failing_pre_push_hook_without_bypassing_hooks() {`
- L617 `fn safe_push_refuses_to_recreate_deleted_upstream_branch() {`
- L644 `fn safe_push_refuses_remotely_advanced_tip_before_a_network_write() {`
- L711 `fn configured_ignore_all_cannot_hide_dirty_submodule_from_safe_push() {`
- L751 `fn configured_ignore_all_cannot_hide_dirty_submodule_from_safe_pull() {`
- L781 `fn safe_sync_uses_configured_origin_when_second_remote_is_present() {`
- L817 `fn custom_hookspath_pre_push_failure_blocks_safe_sync_without_mutation() {`
- L855 `fn safe_push_uses_explicit_upstream_despite_custom_default_push_settings() {`
- L920 `fn mirror_mode_cannot_turn_safe_sync_into_an_all_refs_push() {`

### `crates/repoticker-core/tests/github_remote.rs`

Declared test functions **3**. The actual runner's outcomes remain authoritative.

- L55 `fn canonicalizes_supported_https_scp_and_ssh_github_remotes() {`
- L69 `fn rejects_untrusted_hosts_credentials_extra_paths_and_url_tricks() {`
- L91 `fn resolves_real_local_git_origin_without_network_or_worktree_changes() {`


## Evidence quality and open mappings

- Release tests use isolated temporary directories, signed catalogs and S3/R2 adapters where applicable; confirm transactional rollback and readback, not merely regex on scripts.
- Python 104 declaration count should reconcile with Strict 98+6 exactly; if not, find decorators or generated cases before coverage claims.
- Rust module tests in `src/*.rs`, desktop `src-tauri/src/*.rs`, plus two integration files must be mapped separately to every public method. Core Rust tests do not physically simulate Wayland/KDE or Windows Keyring.
- Tests on `main.rs` beyond inline `#[cfg(test)]` declarations may be defined after the test module; inventory must not truncate trailing production operations. See audited continuation appendix.
