# Mode B: R2 private upload, ETag-CAS concurrency, publication ordering and receipt gate

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; `scripts/r2_release.py` blob `b0fe41c6304733d44dd5a35cdaba6e3e906fffe2`, functions `object_head`, `object_etag`, `upload`, `publish`, `main` (source lines 333–485). Test file `tests/test_release_r2_contract.py` blob `114b14eba531c683180d0252c5fb6dcd0c37e7ad`, 67 unittest methods overall.

The Python tests execute **real `upload` and `publish`** with an in-memory `FakeS3` and simulated provider HTTP errors/ETags, plus injected public readback and GPG stubs. No Cloudflare credentials, network R2 publication, CI job, release pointer, AWS endpoint or production source was touched in this audit. Prepared parent `d4b4e24bfeab9dd3e2170c1f5193608b1f622df6`, branch `audit/mode-b-testing`.

## Actual uploader test assertions (verified test bodies)

| Test group | Specific production assertion |
| --- | --- |
| `test_given_flat_distribution_when_missing_file_is_uploaded_to_isolated_bucket_and_sha_verified_then_contract_is_enforced`; `test_immutable_create_is_single_part_atomic_if_none_match` | Real `upload` calls conditional `put_object` with bucket `app-dist`, `dist/RepoTicker/` prefix, SHA256 metadata, immutable cache policy, exact ContentLength, `IfNoneMatch="*"`, and private byte readback |
| `test_given_flat_distribution_when_immutable_identical_blob_is_reused_without_upload_then_contract_is_enforced`; `test_existing_immutable_object_without_sha_metadata_is_rejected`; `test_given_flat_distribution_when_immutable_conflict_rejects_without_overwriting_existing_bytes_then_contract_is_enforced` | Same SHA immutable object reused with no write; absent/mismatched metadata rejects immutable replacement without writing |
| `test_forged_identical_sha_metadata_does_not_hide_corrupt_stored_bytes`; `test_given_flat_distribution_when_private_readback_mismatch_fails_before_public_proof_then_contract_is_enforced` | Even metadata containing expected SHA is insufficient; real `get_object` body digest/size must match |
| `test_private_readback_truncated_and_oversized_are_both_rejected`; `test_private_s3_get_failure_is_not_treated_as_proof_of_uploaded_bytes` | Too short/long streamed data and GET exception fail closed |
| `test_given_flat_distribution_when_forbidden_head_does_not_turn_into_an_unverified_upload_then_contract_is_enforced`; `test_500_head_failure_never_becomes_missing_immutable_object`; `test_missing_head_error_metadata_is_not_equivalent_to_404` | 403, 500 or unknown `head_object` failure do not equal absent object, result propagates and no write occurs |
| `test_given_flat_distribution_when_mutable_index_updates_with_no_store_cache_control_then_contract_is_enforced`; `test_mutable_replacement_uses_original_etag_compare_and_swap`; `test_existing_mutable_without_valid_etag_fails_before_write` | Mutable update has `no-store`, ETag/IfMatch strict, invalid/missing ETag blocks write |
| `test_second_writer_cannot_replace_newly_created_immutable_key`; `test_competing_mutable_writer_causes_412_without_clobber` | `FakeS3` injects competing writer immediately before put; returned 412 leaves competitor's object intact |
| `test_idempotent_mutable_readback_reuses_same_content_without_write` | Same SHA existing mutable object is not rewritten, still read back |
| `test_latest_pointer_compare_and_swap_is_pinned_to_pre_apt_snapshot`; `test_same_latest_pointer_recovery_does_not_rewrite_r2`; `test_latest_pointer_creation_rejects_competing_new_object` | Real `upload` verifies latest ETag has not changed since original snapshot; same-pointer recovery no rewrite; new pointer creation with competition fails |

## Exact upload method and branch map

| Function or decision | Both positive/negative outcomes | Evidence / further |
| --- | --- | --- |
| `object_head` | Real `head_object`; **only** HTTP 404 in `ResponseMetadata.HTTPStatusCode` -> None; every other provider exception propagated | E 404 implicit via upload, E explicit 403/500/missing metadata exception |
| `object_etag` | None head -> None; ETag must be quoted nonempty 1..128 chars with no internal quote/CRLF; bad type/length rejected | E missing ETag; ? parameterized malformed/truncated/129-character tag |
| `upload` source preflight | Digest source, `safe_file` <= 350 MiB before remote head; invalid file does not create object | E source safe_file tests + source_map preflight; ? source file write during upload |
| `upload` immutable | Existing SHA same -> no upload, but **always private GET readback**; wrong/missing SHA -> fail; absent -> conditional IfNoneMatch "*" | E all paths with fabricated/failing metadata, private byte check |
| `upload` mutable | Existing same SHA reuse+valid ETag; different SHA requires IfMatch(existing ETag); absent requires IfNoneMatch; CacheControl no-store | E existing/different/absent, E malformed ETag failure |
| `upload` latest expected snapshot | `expected_latest` supplied: current ETag equals pre-APT snapshot, else fail before write; identity uses opaque quoted ETag, not SHA alone | E competing pointer changes, same unchanged pointer, absent create collision |
| `upload` private GET | Iterates body in max 1 MiB chunks, refuses >source bytes, requires final exact length and SHA | E truncated/oversized/forged/failed GET; ? fault after first stream chunk, reported content-length disagreement |
| `publish` credentials/run | Account ID exactly 32 lowercase hex, nonempty access key/secret, decimal run ID >0; reject before any S3 connection | E missing credentials and invalid run IDs; ? account uppercase/nonhex, weird numeric strings and secret redaction |
| `publish` local existence | Prior receipt path or symlink refuses immediately; `repoticker-latest-publish.json` name refuses before source map and is checked **again** before writing | E prior receipt, dangling receipt/latest symlink and injected late local collision |
| `publish` source preflight | `source_map` validates platform/versions/apt signature before `boto3.client`; client constrained to configured R2 account and one retry budget | E invalid version/commit and tampered source fail without creating S3 fake client; ? external boto import/config failure |
| `publish` ordering | Snapshot `latest.json` HEAD first, then sorted immutable file upload + public readback; mutable Packages, Packages.gz + public proof; then signed InRelease + public proof; lastly mutable latest.json CAS + public proof | E one-binary/11-object/last-two `InRelease`→`latest.json` sequence and failure injection at immutable/mutable/InRelease |
| `publish` final receipt | `latest_manifest` only immutable binaries; second local name check; write local latest manifest; upload latest; verify public latest; **only then** write local publication receipt | E happy receipt, no receipt after missing credentials/invalid source/failed latest readback or concurrent CAS |
| `main` CLI | Required release/apt/version/commit/run-id/receipt args; unguarded environment indexing for three R2 secret values | Tests call `publish` directly, not real CLI; ? missing env raises KeyError and report hygiene |

## Real publish-level tests and transaction boundaries

- `test_given_flat_distribution_when_flat_publication_preserves_single_binary_and_publishes_latest_last_then_contract_is_enforced`: actual `publish` runs through fake S3; exact **11 object keys**, one DEB, latest is final object and `InRelease` the penultimate public proof, receipt has 2 artifact groups and approved version.
- `test_failed_immutable_public_readback_stops_before_mutable_indexes`: fake failure while checking AppImage blocks later mutable publication and receipt.
- `test_failed_mutable_public_readback_cannot_publish_signed_commit_marker`: failing Packages check prevents InRelease and latest.
- `test_failed_inrelease_readback_never_writes_latest_pointer`: no latest pointer after signed InRelease proof fails.
- `test_competing_latest_publisher_after_apt_start_does_not_get_overwritten`: another writer replaces latest during APT index writes, upload refuses with no latest write/receipt.
- `test_given_prior_publication_receipt_when_republishing_then_no_client_or_remote_write`, `test_existing_latest_manifest_refuses_before_source_map_or_network`, `test_dangling_latest_symlink_is_rejected_without_creating_target`, `test_dangling_receipt_symlink_is_rejected_before_any_artifact_read`, `test_late_local_latest_manifest_collision_is_still_rejected`: early/late local guards.
- `test_given_flat_distribution_when_failed_final_latest_readback_never_emits_deletion_receipt_then_contract_is_enforced` and `test_failed_public_readback_has_no_receipt_even_when_private_latest_committed`: **the private latest may already be committed when final PUBLIC proof fails**, but local publication receipt is absent. This distinction is explicitly asserted.

## Known partial transaction semantics, not new bugs

1. **RP1 irreversible previous uploads:** R2 publishing spans multiple independently atomic objects; `publish` deliberately has no global multi-object transaction. Earlier immutable/index objects can exist after later failure. A failure must never fabricate a successful final receipt; existing tests cover this.
2. **RP2 latest private commit ≠ verified public release:** final public readback may fail after private `latest.json` was successfully written, with no receipt; tests explicitly acknowledge this. Recovery must compare the original ETag/current same pointer and verify public bytes. Do **not** promise rollback or deletion of already committed latest.
3. **RP3 possible local retry friction (SOURCE HYPOTHESIS):** `latest_path.write_text` precedes latest upload/readback. On a failed final public proof, a subsequent `publish` using the **same output directory** hits the early existing-latest-path refusal before safe replay, unless the operator archives/removes that local candidate manually or uses a clean workspace. The in-memory S3 upload has a same-pointer retry contract, but the top-level same-directory invocation remains strict. Characterize via a deterministic second invocation and the approved recovery policy before proposing changes.
4. **RP4 mutable APT transient mismatch:** Packages/Packages.gz are written before InRelease, absent by-hash; readers arriving mid-release may temporarily detect mismatch and must fail GPG validation/retry. This limitation is documented in source, not hidden by test success.
5. **RP5 race against source mutation during multi-file publish:** existing tests validate source bytes before remote access and remote bytes after each put, but in-flight local source replacement and concurrent two release publish processes under different credentials are not physically covered.

## Positive / N1–N12

| Category | State and precise missing behavior |
| --- | --- |
| Positive | E conditional immutable/mutable upload, private+public checks, signed order and final verified receipt |
| N1 | E bad metadata, ETag, creds/run, failed readback and malformed local paths |
| N2 | E 404 vs 403/500 and 412; ? ETag 1/128/129, oversized stream 1 MiB+1 fault |
| N3 | E fake HEAD/GET/PUT failure and network edge errors; physical R2 access unavailable here |
| N4 | E matching immutable and mutable reuse, same latest CAS recovery; same-dir replay after failed public proof ? |
| N5 | E competing immutable/mutable/latest writers, late local latest collision; ? simultaneously published new immutable key from actual Cloudflare |
| N6 | E stale/missing SHA, old signed indexes and prior manifest; ? partial remote cleanup policy |
| N7 | E exact source SHA/version keys, conditional writes and restricted account namespace |
| N8 | NA (source/version identities are not timestamps) |
| N9 | NA |
| N10 | E no credentials included in public receipt, ? exception output from live botocore failure |
| N11 | NA |
| N12 | E private truncated/corrupt S3 body and no receipt; ? disk-full while writing local latest/receipt |

## Stage 9 remaining exact test cases (not repetitive happy cases)

- RP-T1: real `upload` with malformed quoted ETag 0/1/128/129/CRLF and unexpected provider error shape; ensure no conditional write.
- RP-T2: private streaming body raises after first chunk; output cannot be marked verified; local source file replaced after hash before upload/public proof.
- RP-T3: `publish` with last public latest failure, then same-dir restart, characterize exact local file state vs intended operator recovery contract; no secret/remote access without authorization.
- RP-T4: two concurrent release publishers with original latest absent/present and in-flight APT mutations, synthetic CAS barrier at actual `upload`. Tests should kill stale-snapshot acceptance without changing the public protocol.
- RP-T5: release CLI with missing secrets, malformed args and unreadable output, fixed exit safety/redaction.
- RP-T6: physical R2 publication of exact owner-approved signed release, scoped credentials and public CDN readback is a **separate owner release gate**, not test-only audit.

Mutation sensitivities: treat 500 as 404, use S3 upload_file (loss of conditional object atomicity), remove private GET, skip SHA/size, allow IfMatch missing, update latest before InRelease, accept mismatched snapshot, write receipt before final public readback, retry by blindly overwriting latest. The existing test suite already directly checks many of these; **no mutation run**.

Overall Mode B Stage 3–8 PARTIAL. No source/test/CI files or production refs changed.
