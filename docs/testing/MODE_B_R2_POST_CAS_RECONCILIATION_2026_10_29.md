# Mode B: post-CAS R2 publisher source-to-test reconciliation

Date: 2026-10-29. Source baseline: \`dev\` at \`82eba6f6cf8caa8596eecd90b737b00c3d6094b1\`.
Mode: B (testing); documentation-only Stage 3–8 **slice**, not global Mode B completion.
No production release, R2 access, local native execution, tag or \`main\` change.
The previous [R2 branch map](MODE_B_R2_PUBLICATION_BRANCH_EVIDENCE_2026_10_29.md)
was captured before conditional S3 writes were implemented and is **historical**, not an
accurate representation of the current \`upload()\` branches.

## Exact evidence and limitations

- Current \`scripts/r2_release.py\` is 470 lines with 16 named nested/top-level
  functions (\`latest_manifest.item\` included).
- Current \`tests/test_release_r2_contract.py\` has **65 declared** \`test_*\`
  methods across \`PublicationFixture\`, \`IdentifiedPublicReadbackTests\`
  and \`UploadSafetyTests\`. This is a static method count, not individual
  parameterized/subtest count or measured coverage.
- Exact-source [Preflight #40935078253](https://github.com/morozhenko-apps/repoticker/actions/runs/40935078253)
  on \`82eba6f6\` completed SUCCESS: JS/Python release-contract job,
  Rust formatting/core tests/Clippy, Linux desktop compile, aggregate gate.
  The report does not provide Python branch coverage or prove OS/R2 runtime.
- The S3 fake tests exercise actual \`upload()\` and \`publish()\` functions,
  not mocked domain logic; native R2 and public CDN are still untested.
- A candidate named below means a reviewed assertion entrypoint, **not**
  automated line/branch coverage or a mutation score.

## Stage 3: complete function inventory for this source file only

\`C\` = critical release integrity; \`H\` = high release/control risk.
Case targets are *minimum planned independent boundary scenarios*, not
claims of passing tests. N11 is N/A for every function: RepoTicker is free,
has no purchases or entitlements.

| Function | Risk / level | Principal observable contract | Existing candidate / planned independent cases | Relevant categories |
| --- | --- | --- | --- | --- |
| \`digest\` | C / unit | Streaming full SHA-256 of exact bytes | Fixture checksum and multichunk tests; target >=3 | Positive, N2,N6,N12 |
| \`safe_file\` | C / unit | Reject missing, link, empty, >350MiB | \`test_zero_and_oversized_release_file_are_rejected_without_reading\`, \`test_release_safe_file_rejects_dangling_symlink_without_following_it\`; target >=6 | Positive,N1,N2,N7,N12 |
| \`platform_files\` | C / integration | Exact canonical platform/version, manifest and sidecars | \`test_given_flat_distribution_when_isolated_exact_source_map_contains_signed_apt_and_release_files_then_contract_is_enforced\`, modified bundle/duplicate/unexpected/symlink tests; >=9 | Positive,N1,N2,N6,N7,N12 |
| \`verify_signed_apt_indexes\` | C / integration | Signed envelope's SHA section binds both indexes | signed/old/duplicate/missing/digest tests; >=9 | Positive,N1,N2,N6,N7,N12 |
| \`verify_apt_package_catalog\` | C / integration | Exactly one approved DEB and bounded identical gzip | signed control, bad fields, corrupt gzip/non-UTF8 tests; >=10 | Positive,N1,N2,N6,N7,N12 |
| \`apt_files\` | C / integration | Safe paths, matching staged DEB, gpgv before acceptance | staged mismatch, symlink, signed catalog tests; >=7 | Positive,N3,N6,N7,N12 |
| \`source_map\` | C / integration | Valid SemVer/40-hex commit, disjoint key spaces | exact source map, invalid version/commit, manifest tests; >=6 | Positive,N1,N2,N6,N7 |
| \`latest_manifest\` | C / unit | Pinned source, immutable download URLs and checksums | \`test_given_flat_distribution_when_latest_manifest_points_only_to_immutable_approved_artifacts_then_contract_is_enforced\`; >=4 | Positive,N1,N6,N7 |
| \`latest_manifest.item\` | C / unit | Per-key digest/size and canonical URL | Same manifest test; >=3 | Positive,N1,N6,N12 |
| \`content_type\` | H / unit | Strict index/plain versus extension/default MIME | S3 options tested in uploads; explicit per-key MIME table planned; >=4 | Positive,N1,N6 |
| \`public_readback\` | C / integration | Identified GET/200, 45s, full SHA and exact size | 8 \`IdentifiedPublicReadbackTests\` plus fixture case; >=13 | Positive,N1,N2,N3,N6,N7,N9,N10,N12 |
| \`object_head\` | C / integration | Only 404 means absent; 403/500/unknown propagate | head denied/500/broken; >=5 | Positive,N3,N5,N7 |
| \`object_etag\` | C / unit | Quoted ETag or fail; absent head is None | existing mutable without ETag, competing pointer; quoted/boundary table planned; >=7 | Positive,N1,N2,N5,N6 |
| \`upload\` | C / integration | Conditional PutObject, private integrity proof, no clobber | \`UploadSafetyTests\` CAS/create/reuse/412/ETag/readback cases; >=24 | Positive,N1,N2,N3,N4,N5,N6,N7,N9,N10,N12 |
| \`publish\` | C / integration | Preflight before client, original pointer snapshot, ordered APT, receipt last | \`PublicationFixture\` full/fail/collision/recovery cases; >=20 | Positive,N1,N2,N3,N4,N5,N6,N7,N9,N10,N12 |
| \`main\` | H / CLI | Required flags/secure env/exit propagation | Source CLI inspection only; direct negative CLI tests planned; >=4 | Positive,N1,N7,N9 |

This source inventory is not the repository-wide Stage 3 completion.
The broader mode maps for core Git, native Auth/REST, JS and UI remain active,
and source-specific omissions must be reconciled before global Stage 4–8 exit.

## Stage 4: current decision/branch map (conditional writer)

| ID | Actual branch / expected observable result | Existing named test candidate or gap |
| --- | --- | --- |
| CAS01 | \`object_head\` explicit HTTP 404 -> absent; any other error propagates | \`test_given_flat_distribution_when_forbidden_head_does_not_turn_into_an_unverified_upload_then_contract_is_enforced\`, \`test_500_head_failure_never_becomes_missing_immutable_object\`, \`test_missing_head_error_metadata_is_not_equivalent_to_404\` |
| CAS02 | \`object_etag\`: missing object -> None; wrong type, unquoted, CR/LF or overlong -> error | \`test_existing_mutable_without_valid_etag_fails_before_write\`; **P:** exhaustive malformed ETag table |
| CAS03 | \`upload\`: missing key -> \`IfNoneMatch="*"\` and streamed \`ContentLength\` | \`test_immutable_create_is_single_part_atomic_if_none_match\` |
| CAS04 | Another writer creates missing immutable key between HEAD and PUT -> 412, never overwrite | \`test_second_writer_cannot_replace_newly_created_immutable_key\` |
| CAS05 | Existing immutable with wrong or absent SHA metadata -> reject before write | \`test_given_flat_distribution_when_immutable_conflict_rejects_without_overwriting_existing_bytes_then_contract_is_enforced\`, \`test_existing_immutable_object_without_sha_metadata_is_rejected\` |
| CAS06 | Existing immutable with matching claimed SHA -> no PUT, but private body must be verified | \`test_given_flat_distribution_when_immutable_identical_blob_is_reused_without_upload_then_contract_is_enforced\`, \`test_forged_identical_sha_metadata_does_not_hide_corrupt_stored_bytes\` |
| CAS07 | Changed mutable key -> \`IfMatch\` original head ETag, cache \`no-store\` | \`test_mutable_replacement_uses_original_etag_compare_and_swap\`, \`test_given_flat_distribution_when_mutable_index_updates_with_no_store_cache_control_then_contract_is_enforced\` |
| CAS08 | Concurrent mutable replacement -> 412, never overwrite competitor | \`test_competing_mutable_writer_causes_412_without_clobber\` |
| CAS09 | Same-SHA mutable reuse -> no PUT, valid ETag needed, private integrity still checked | \`test_idempotent_mutable_readback_reuses_same_content_without_write\`, \`test_existing_mutable_without_valid_etag_fails_before_write\` |
| CAS10 | Pointer's saved pre-APT ETag differs from final HEAD -> no pointer promotion | \`test_latest_pointer_compare_and_swap_is_pinned_to_pre_apt_snapshot\`, \`test_competing_latest_publisher_after_apt_start_does_not_get_overwritten\` |
| CAS11 | Absent original pointer with late competing create -> conditional 412 | \`test_latest_pointer_creation_rejects_competing_new_object\` |
| CAS12 | Same original pointer bytes after earlier public failure -> verify without rewriting | \`test_same_latest_pointer_recovery_does_not_rewrite_r2\`; public failure: \`test_failed_public_readback_has_no_receipt_even_when_private_latest_committed\` |
| CAS13 | Private stream empty/partial/oversized/wrong SHA or S3 GET error -> no verified result | \`test_private_readback_truncated_and_oversized_are_both_rejected\`, \`test_private_s3_get_failure_is_not_treated_as_proof_of_uploaded_bytes\` |
| CAS14 | Credentials/run-id/receipt/latest path invalid -> reject before S3 client and writes | \`test_given_flat_distribution_when_receipt_cannot_be_emitted_with_missing_credentials_then_contract_is_enforced\`, invalid run, receipt/symlink/latest collision tests |
| CAS15 | Artifact/immutable public readback fails -> no mutable/APT/latest | \`test_failed_immutable_public_readback_stops_before_mutable_indexes\` |
| CAS16 | Mutable index / signed InRelease public failure -> no next commit point | \`test_failed_mutable_public_readback_cannot_publish_signed_commit_marker\`, \`test_failed_inrelease_readback_never_writes_latest_pointer\` |
| CAS17 | Output local path appears mid-flight -> refuse before writing final manifest/pointer | \`test_late_local_latest_manifest_collision_is_still_rejected\` |
| CAS18 | Final pointer public readback fails -> no verified deletion receipt, private pointer may exist | \`test_given_flat_distribution_when_failed_final_latest_readback_never_emits_deletion_receipt_then_contract_is_enforced\`, \`test_failed_public_readback_has_no_receipt_even_when_private_latest_committed\` |
| CAS19 | 200 response body exact SHA/size -> success; non-200/truncated/wrong bytes -> reject | Identified readback status, invalid bytes, multi-chunk tests; **P:** redirected public GET must prove same-origin policy, if required by public-edge contract |
| CAS20 | Signed APT/DEB mismatches or malformed source -> abort before any bucket mutation | \`PublicationFixture\` signed index, gzip, control, source-map, symlink and invalid source tests |
| CAS21 | CLI mandatory flags or missing environment -> fail without publication | **P:** direct CLI boundary/exit tests |
| CAS22 | Ordinary local failures during private readback/receipt-write -> no success receipt | Partial candidates; **P:** explicit permission/full-disk receipt-write and interruption boundaries |

\`E\` in earlier maps must not be silently upgraded to \`Covered\`
without branch coverage or test-body evidence. CAS14–CAS22 are grouped
decisions; each distinct early return, raise and exception path still needs
a per-branch expansion for complete Stage 4.

## Stage 5: flow-level Positive / N1–N12 reconciliation

Legend: \`E\` = named candidate exists but unmeasured; \`P\` = additional
boundary test/review planned; \`NA\` = not applicable with reason below.
No blank cells.

| Flow | Positive | N1 | N2 | N3 | N4 | N5 | N6 | N7 | N8 | N9 | N10 | N11 | N12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Artifact / signed APT verification | E | E | E | E | NA | P | E | E | NA | E | P | NA | P |
| Identified public GET readback | E | E | E | E | NA | P | E | E | NA | P | E | NA | P |
| S3 HEAD, ETag and conditional PUT | E | P | E | E | E | E | E | E | NA | P | P | NA | P |
| Publish ordering, pointer and receipt | E | E | E | E | E | E | E | E | NA | E | P | NA | P |
| CLI / environment entry | P | P | NA | P | NA | NA | NA | P | NA | P | P | NA | NA |

Explanations for N/A cells: N4 does not apply to static file verification
or single readback because those functions do not implement retries;
retry recovery is covered at publisher scope. N8 is out of scope for this
publisher's deterministic bytes and conditional object APIs because it
has no time-dependent authorization/clock decisions; signing key expiry
belongs to \`verify_signing_key.py\` / workflow signing review. N11 never
applies because there are no paid entitlements. CLI input has no bounded
collection or storage write of its own; delegated publisher storage errors
are planned in \`publish\`. N5 doesn't apply to standalone CLI argument
parsing; concurrent publication belongs to \`upload/publish\`.
Each row is a *flow* summary, not the required final per-function matrix.

## Stage 6–8: interactions, estimates and coverage limits

Important combined cases still requiring explicit branch assertions:

1. Prior pointer exists + competing writer after APT starts + signed
   InRelease verified -> competitor retained, no receipt.
2. Original pointer absent + concurrent creation + immutable objects
   already publicly verified -> 412, no pointer overwrite.
3. Immutable HEAD returns 403/500 + absent local receipt -> no bytes
   written and no misleading verified result.
4. Same-SHA immutable reuse + forged SHA metadata + wrong private bytes
   -> verification fails despite matching metadata.
5. Public latest write succeeded + public CDN 403/stale response +
   protected same-version recovery -> no premature cleanup; recovery
   may only validate unchanged pointer.
6. Pre-existing local dangling manifest symlink + valid signed source
   -> fail before cloud client creation; do not follow target.
7. Signed APT index validates but public Packages/InRelease readback
   fails -> no advancement to latest pointer.
8. Native installer/source SHA correct + recipient disk/permissions
   fail during final receipt write -> no success claim and recovery
   cannot force remote rollback.

For *this file*, the declared 65 methods are a baseline inventory,
not 65/65 accepted branch cases. At least **12–18 additional distinct
test scenarios** need assessment (ETag validation boundaries, receipt
filesystem failures, URL/redirect provenance, CLI/environment,
privacy of exceptions, interrupted private body, and mutation variants)
before setting a fixed Stage 7 total. This is an estimation range, not
an authorized shortcut or final test count. The 16 functions are all
listed above, but actual line/branch coverage and Stage 10 mutation
results are **NOT MEASURED**. Use the stable Python gate and targeted
mutation controls only after the repository-wide Stage 3–8 inventory
and matrix are reconciled.

### Explicit release limitations

Conditional single-object writes do not make the flat three-key APT
update a transaction; GitHub's protected release workflow must remain
the sole coordinated publisher. Existing public GET handling may follow
a 301/302 to another host: current tests assert the *initial* target URL,
not redirect-chain origin. This is a verification gap for public-edge
provenance, not evidence of a live exploit or permission to bypass CDN.
Public CDN 200 and private R2 200 are separate release requirements.

**Next gate:** finish all remaining source modules' per-function matrix
and branch mapping, then close planned gaps and execute final stable/
known-flaky gates on an exact frozen candidate. Do not claim Mode B
complete or publish 1.0 from this document.
