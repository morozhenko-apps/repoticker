# Mode B — R2, APT and release-publication branch-to-test evidence

**Read baseline SHA:** `0d68dd31c1ad906e62f4fe514f94d4d59eebdb4c`, 2026-10-29.
Source: `scripts/r2_release.py`, `tests/test_release_r2_contract.py`,
`.github/workflows/desktop-release-candidates.yml`.
**Stage 4 slice only.** The tests are named inspection candidates,
not executed PASS evidence. `E` = explicit test candidate;
`P` = additional test/contract required; `S` = source YAML only.
Immutable publication is an important business rule but is
not exhaustively proved by the current tests.

| Branch ID | Source location | Decision/invariant | Existing test/source candidate | Mapping | Missing boundary/mutation requirement |
| --- | --- | --- | --- | --- | --- |
| R201 | public_readback:284–287 | source stat/read/digest failure | PublicationFixture::test_given_flat_distribution_when_public_readback_verifies_full_body_and_size_then_contract_is_enforced | **E+P** | Missing source/permission/read error and no external request |
| R202 | public_readback:291–295 | identified Request: GET + exact UA, 45s | IdentifiedPublicReadbackTests::test_given_release_assets_when_public_readback_then_request_identifies_repoticker | **E** | Wrong UA, POST, URL path, timeout mutation must fail |
| R203 | public_readback:295–297 | HTTP 200 only; non200 201,206,403 | IdentifiedPublicReadbackTests::test_given_non200_or_edge_rejection_when_readback_then_no_success_receipt | **E** | 301 redirect can be followed by urllib; terminal response needs 200 |
| R204 | public_readback:299–305 | streaming bounded total: oversized body early reject | IdentifiedPublicReadbackTests::test_given_invalid_public_bytes_when_readback_then_checksum_and_size_fail_closed | **E** | Body with malicious stream returning beyond requested chunk size / memory amplification |
| R205 | public_readback:305–311 | complete body length and SHA256 equality | IdentifiedPublicReadbackTests::test_given_multichunk_response_when_readback_then_complete_sha_and_size_are_verified; test_given_invalid_public_bytes_when_readback_then_checksum_and_size_fail_closed | **E** | Same-size wrong SHA and truncated/empty/HTML are asserted; compare digest equality mutation |
| R206 | upload:314–322 | HEAD result: 404 only means absent, other error propagates | UploadSafetyTests::test_given_flat_distribution_when_forbidden_head_does_not_turn_into_an_unverified_upload_then_contract_is_enforced | **E** | Head returns missing metadata, wrong backend info or atypical client exception |
| R207 | upload:324–327 | immutable existing key sha metadata unequal -> refuse | UploadSafetyTests::test_given_flat_distribution_when_immutable_conflict_rejects_without_overwriting_existing_bytes_then_contract_is_enforced | **E** | SHA collision/malformed SHA metadata vs existing body; private get_object |
| R208 | upload:324–329 | immutable identical key reused vs mutable overwritten | UploadSafetyTests::test_given_flat_distribution_when_immutable_identical_blob_is_reused_without_upload_then_contract_is_enforced; test_given_flat_distribution_when_mutable_index_updates_with_no_store_cache_control_then_contract_is_enforced | **E** | Concurrent publisher between HEAD and upload is not guarded by conditional write |
| R209 | upload:328–333 | ContentType/CacheControl and exact bucket key | UploadSafetyTests::test_given_flat_distribution_when_missing_file_is_uploaded_to_isolated_bucket_and_sha_verified_then_contract_is_enforced | **E** | Verify all MIME/type keys, immutable CacheControl vs mutable |
| R210 | upload:334–342 | private S3 get/readback full len+sha, reject divergence | UploadSafetyTests::test_given_flat_distribution_when_private_readback_mismatch_fails_before_public_proof_then_contract_is_enforced | **E** | get_object failure, body chunks empty/malformed/oversized |
| R211 | publish:345–349 | account/access keys and run-id validated | PublicationFixture::test_given_flat_distribution_when_receipt_cannot_be_emitted_with_missing_credentials_then_contract_is_enforced | **E+P** | run-id zero/negative/non-digit; account length/charset; no credential leakage |
| R212 | publish:348–351 | preexisting receipt refused before writing | No focused assertion located in inspected contract suite | **P** | Must fail closed with no writes on re-run |
| R213 | publish:352–359 | source_map validation and boto3 client scoping | PublicationFixture::test_given_flat_distribution_when_flat_publication_preserves_single_binary_and_publishes_latest_last_then_contract_is_enforced | **E+P** | Failed client/session signature or unauthorized missing key |
| R214 | publish:360–363 | immutable objects each upload then public readback | PublicationFixture::test_given_flat_distribution_when_flat_publication_preserves_single_binary_and_publishes_latest_last_then_contract_is_enforced | **E** | Readback 403 on an intermediate object must block all mutable/latest writes |
| R215 | publish:364–374 | mutable Packages + Packages.gz first, InRelease last | PublicationFixture::test_given_flat_distribution_when_flat_publication_preserves_single_binary_and_publishes_latest_last_then_contract_is_enforced | **E** | Failure after first mutable write leaves recoverable partial APT; APT client must verify GPG |
| R216 | publish:378–389 | latest.json final pointer after native checks | PublicationFixture::test_given_flat_distribution_when_flat_publication_preserves_single_binary_and_publishes_latest_last_then_contract_is_enforced; test_given_flat_distribution_when_failed_final_latest_readback_never_emits_deletion_receipt_then_contract_is_enforced | **E** | Known last-pointer write succeeded but public readback failed -> external latest may advance without verified receipt; recovery policy |
| R217 | publish:390–405 | receipt only after latest public verification | PublicationFixture::test_given_flat_distribution_when_failed_final_latest_readback_never_emits_deletion_receipt_then_contract_is_enforced | **E** | Receipt write exception / unlinked latest pointer / cleanup ordering |
| R218 | source_map/apt_files | manifest, signed package catalog, no unexpected sidecars/symlinks | PublicationFixture::test_given_flat_distribution_when_signed_but_wrong_package_control_fields_fail_before_publication_then_contract_is_enforced; test_given_flat_distribution_when_corrupt_manifest_and_wrong_git_provenance_rejected_then_contract_is_enforced | **E** | Manifest path traversal/signature index mismatch must be tested by exact source path |
| R219 | desktop-release-candidates.yml:2–9 | tag-only trigger, serialized workflow group | Workflow source: concurrency group repoticker-signed-release and cancel-in-progress:false; no runtime test | **S** | Outside GitHub writers are not serialized; source YAML does not prove external R2 lock |
| R220 | desktop-release-candidates.yml:20–33 | main HEAD, tag+version+Cargo.lock validation | Release pipeline test candidate: tests/test_release_version.py; no observed run | **S+P** | Tags created simultaneously with main move; provenance acceptance |
| R221 | desktop-release-candidates.yml:191–229 | cleanup only after verified publish; GitHub release last | tests/test_release_retention_contract.py; publication receipt tests | **E+P** | Failed public latest readback must not authorize deletion |

## Stage 5 flow-level Positive/N1–N12, not full function matrix

| Flow | Positive | N1 invalid input | N2 bounds | N3 I/O | N4 retry | N5 race | N6 corrupt | N7 trust | N8 time | N9 cancel | N10 privacy | N11 entitlements | N12 filesystem |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| public_readback | E | P | E | E | N/A: no retry | P | E | E | N/A: no clock | N/A: synchronous | E | N/A: free | P |
| upload | E | P | E+P | E | P | P | E | E+P | N/A: no clock | P | E+P | N/A: free | P |
| publish orchestration | E | P | E+P | E | P | P | E | E+P | P | P | P | N/A: free | P |
| tag/workflow/cleanup | S | P | P | P | P | P | P | P | P | P | P | N/A: free | P |

## Confirmed implementation boundaries, not production failures

1. `public_readback` uses a RepoTicker-identified GET,
   accepts exactly HTTP 200 and requires complete source
   SHA-256 + size. The test suite contains captured-request,
   403/206, oversized, truncated and HTML challenge cases.
2. The release workflow serializes its own tag publication jobs
   via `repoticker-signed-release`, with
   `cancel-in-progress:false`. This prevents **workflow-group**
   overlap, not arbitrary external R2 clients.
3. **Investigate at Stage 9/10:** `upload` checks HEAD and
   then calls `client.upload_file` without an object creation
   precondition. Two independent writers targeting an identical
   previously missing immutable key could race between HEAD
   and upload. The existing tests verify sequential conflict
   detection but do **not** assert conditional atomic creation.
   This is a confirmed source-level concurrency gap, with
   real exploitability depending on external writer permissions
   and deployment policy. Do not call the bucket race-free.
4. The final `latest.json` mutation occurs before public
   verification. If the edge rejects that public readback,
   the code correctly refuses to emit a receipt, but the
   public pointer may already have changed. A recovery/
   independent-commit condition needs explicit Mode B
   validation; "no receipt" is not the same as "no mutation."
5. The full `source_map`, signed APT, readback and cleanup
   paths are **not** established as tested merely from
   the presence of Python test functions.

## Stage 10 mutation contracts

- Change `reply.status != 200` to accept 206/403: test
  must reject the mutant.
- Remove size check, checksum check or read-all loop:
  tests must detect corrupted/partial data.
- Treat HEAD 403 as 404, remove immutable mismatch check,
  skip private readback: test must catch unsafe behavior.
- Publish `latest.json` before `linux/InRelease`, or
  emit cleanup receipt before readback: order assertions
  must fail.
- Introduce an external competing writer with a conflicting
  immutable key between HEAD and PUT: test must prove
  fail-closed atomic behavior before Stage 12 is passed.

**Execution evidence:** no Python/Rust/Node test or CI result
was obtained for this source-inspection commit. The full
Stage 3–8 matrix for other modules remains incomplete;
do not publish or deploy R2 objects from Mode B.
