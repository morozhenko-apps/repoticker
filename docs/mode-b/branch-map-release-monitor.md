# Mode B semantic branches: release publication and GitHub monitoring

Baseline: a3ba7fa30fc4c81890d3075f94142942d001cbf3.
Stage 4 is PARTIAL. These public rules are mapped to existing candidate suites, not automatically certified E. Tests are already run successfully at baseline; assertion-level mutation evidence is still pending.

Evidence: C = candidate test source/description matches the actual operation but each branch assertion must be checked; OS = platform-native acceptance not replaced by a static contract.

## Public release and distribution rules

| Public production rule | Distinct decisions / safety contract | Existing test candidate | Gap still to inspect |
| --- | --- | --- | --- |
| scripts/release_assets.py collect/merge | wrong version/platform, missing/excess DEB/AppImage/NSIS; symlink refusal; checksum sidecar equality; exact package identity | test_release_assets.py; test_release_candidate_contract.py; test_release_native_candidate_paths.py | C: verify per-platform checksum/symlink failure and no partial output |
| scripts/apt_repository.py assemble/verify | private GPG key custody, exact Debian dependency, one package, archive bytes, signature validation and immutable output | test_release_apt_integration.py; test_release_signing.py; test_release_provisioning.py | C: injected mid-index write and signing failure with no public snapshot |
| scripts/r2_release.py safe_file/platform_files | never follow symlink, forbid empty/oversized file, strict platform/version/source map | test_release_r2_contract.py: zero_and_oversized_release_file; release_safe_file_rejects_dangling_symlink | C: denial of read permission before S3 client creation |
| r2_release.py verify_signed_apt_indexes/verify_apt_package_catalog | signed SHA256 covers exact Packages and gzip and DEB; corrupt/duplicate/nonUTF8 fail closed | test_release_r2_contract.py: signed_apt_index_rejects_wrong_size_digest_missing_and_duplicate; packages_control_exactly_binds_signed_index | C: verify malformed continuation and contradictory architecture |
| r2_release.py public_readback | no redirects; exact URL; HTTP 200; complete body length + digest including chunked/S3 mismatch | test_release_r2_contract.py: same_size_multichunk_corruption_fails_full_digest_check; default_readback_rejects_any_redirect | C: timeout after partial body and error redaction |
| r2_release.py upload | private HEAD failures 403/500 not missing; immutable if-none-match; byte/readback check; mutable CAS by ETag | test_release_r2_contract.py: 500_head_failure_never_becomes_missing_immutable_object; second_writer_cannot_replace_newly_created_immutable_key; competing_mutable_writer_causes_412_without_clobber | C: broken precondition metadata and multiple competing writers |
| r2_release.py publish | validate source and signing before network; stage immutable files; mutable indexes; latest last; receipt only after public verification; replay is idempotent | test_release_r2_contract.py: failed_public_readback_has_no_receipt_even_when_private_latest_committed; competing_latest_publisher_after_apt_start_does_not_get_overwritten | C: failure at every intermediate public readback and no invalid receipt |
| scripts/release_version.py bump | semver exact, only permitted source manifests, no partial file rewrites on mismatch | test_release_version.py; test_release_strict_contract.py | C: invalid version and readonly filesystem rollback |
| scripts/install_qa_linux.sh | verify exact run SHA, checksum, reinstall same version, compare installed bytes before launch | linux-qa-installer.test.mjs; release native candidate path tests | OS: physical KDE install AppImage/DEB acceptance |
| scripts/cleanup-published-artifacts.mjs | delete only intended released artifact names; preserve tagged immutable release and out-of-scope files | artifact-retention.test.mjs; test_release_retention_contract.py | C: provider pagination, partial deletion and retry race |
| GitHub workflows (strict, preflight, desktop candidates, relay dry-run) | CI gating conditions; no publish on dev candidate; exact Node; signing and artifact checks | test_ci_policy.py; test_release_strict_contract.py; test_release_native_gate_contract.py | OS: downloaded checksummed Linux/Windows candidate; no actual release |

## GitHub monitor and runner state

| Public production rule | Distinct decisions / safety contract | Existing test candidate | Gap still to inspect |
| --- | --- | --- | --- |
| github-monitor.mjs monitorRefreshDelay/listInstalledRepositories | bounded pagination, zero vs incomplete, explicit owner and authorized installation | github-monitor.test.mjs: installation pagination preserves truncation evidence; unbounded org repository sets not silently represented as complete | C: 0,1,100,101 across auth + denied page |
| collectForAccount | selected repositories only; unknown or missing runners/jobs; permission denial and rate limits | github-monitor.test.mjs: inaccessible or missing repository list cannot fabricate zero jobs; revoked selected repository never fabricates complete job counts | C: stale install vs partial selected repo scope |
| mergeMetricGroup/invalidateMetricGroup | targeted updates keep unrelated metrics and clocks; account change invalidates | github-monitor.test.mjs: targeted metric merge preserves unrelated coverage; manual metric refresh never merges identities from different account | C: duplicate rapid refresh and late all-result |
| startGithubMonitoring / refresh | auth false, pending, cooldown, first snapshot, account change, logout, failed collection, old async reply | github-monitor.test.mjs: delayed native publication cannot overwrite later disconnect; scope changes during async cooldown read cannot publish old account result | C: all pairwise state sequences with offline and time rollback |
| runner-collector.mjs getPages/boundedMap | per-scope caps, external errors, bound concurrency, preserve ordering, no empty-as-complete | runner-collector.test.mjs; mode-b-monitor-edges.test.mjs | C: provider page malformed at exact limit after first successful page |
| runner-collector.mjs collectRunnerState | GitHub hosted and self-hosted lanes, selected repo, run ID dedup, partial source coverage | runner-collector.test.mjs; runner-state.test.mjs; mode-b-monitor-edges.test.mjs | C: permission mismatch with one stale runner and mixed jobs |

## Planned interactions (Stage 6)

| State composition | Required effect |
| --- | --- |
| Signed APT index x exact DEB x mutable latest pointer | never publish a pointer to an unverified or wrong package |
| Competing immutable upload x private HEAD 500 x public readback | fail closed and no overwrite; error never fabricated as absence |
| Signed index exists x corrupted gzip x HTTP 200 readback | reject despite nominal success, no latest/receipt |
| GitHub auth loss x stale runner collection x ETag reuse | no old account/private fields; unknown remains unknown |
| Manual task-only refresh x runner cache x active cooldown | no unnecessary API rate violation or loss of unrelated covered metrics |
| Selected repo revoked x incomplete jobs page x quota period changed | do not fabricate zero or show last-good stale account |

## Risk-based candidate case IDs (not yet implemented)

- D1 N3/N12: inject release write failure at each publication boundary and assert no receipt/latest pointer.
- D2 N4/N5: competing upload create and mutable ETag race cannot clobber signed target.
- D3 N1/N2/N6/N7: exact incorrect archive/sidecar bytes and package fields fail before remote access.
- D4 N3/N10: HTTP 200 with truncated/tainted public readback must not become verified success.
- M1 N3/N5: targeted monitor refresh after partial denied page and cross-account scope switch.
- M2 N4/N5/N8: backoff/cooldown boundary while manual refresh and logout overlap.
- M3 N1/N2/N6: malformed runner pages 0/1/max/max+1 preserve partial/unknown semantics.

**Before Stage 9**: compare each candidate against assertions already present in 67 R2 release tests and the real monitor tests. Do not create redundant tests or accidentally invoke live R2/GitHub. For production changes, follow separate root-cause and architectural-decision rules.
