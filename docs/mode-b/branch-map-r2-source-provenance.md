# Mode B: R2 publisher local source/provenance, exact platform manifests and APT signed indexes

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; `scripts/r2_release.py` blob `b0fe41c6304733d44dd5a35cdaba6e3e906fffe2`, 485 source lines. Direct test file `tests/test_release_r2_contract.py` blob `114b14eba531c683180d0252c5fb6dcd0c37e7ad` contains **67 actual Python unittest methods**, source and checks reviewed, not run this turn. Existing tests instantiate the actual publisher methods against temporary files and stubbed external GPG/S3 transports; they are **not real Cloudflare uploads**. The independent signed APT integration test with ephemeral real GPG/apt-get is detailed in `branch-map-apt-signed-snapshot.md`.

Prepared parent `c58b7f98848881fe96d7555e07e0b9abbd3e1ebc`, branch `audit/mode-b-testing`. Stage 3–8 only. E = direct method/behavior assertion in test; S = static/source-derived; ? = not matched to a direct assertion.

## Direct assertions already present

- `test_given_flat_distribution_when_isolated_exact_source_map_contains_signed_apt_and_release_files_then_contract_is_enforced`: calls actual `source_map` against fixture and confirms one DEB upload key, immutable signing keyring and release files, exactly three mutable signed-index representations, two named platform artifact groups and absence of `apt/` or `releases/` duplicate roots.
- `test_given_flat_distribution_when_signed_apt_indexes_match_actual_sizes_and_digest_with_lf_and_crlf_then_contract_is_enforced`, `test_given_flat_distribution_when_old_signed_apt_index_must_reject_new_indexes_then_contract_is_enforced`, `test_given_flat_distribution_when_signed_apt_index_rejects_wrong_size_digest_missing_and_duplicate_then_contract_is_enforced`: direct signed index validator, both LF/CRLF, stale index, wrong size/digest, missing/duplicate indexes and SHA section, malformed hash/PGP envelope.
- `test_given_flat_distribution_when_packages_control_exactly_binds_signed_index_to_approved_deb_then_contract_is_enforced`, `test_given_flat_distribution_when_signed_but_wrong_package_control_fields_fail_before_publication_then_contract_is_enforced`: real control parser, valid folded noncritical Description; 12 independently mutated Package/Version/Architecture/Filename/traversal/Size/SHA/missing/duplicate/extra stanza/folded critical fields, all rejected.
- `test_given_flat_distribution_when_separately_signed_gzip_must_expand_to_identical_packages_then_contract_is_enforced`: compressed wrong bytes, truncated/invalid gzip and concatenated gzip members all rejected after signed-index file-hash update.
- `test_given_flat_distribution_when_corrupt_manifest_and_wrong_git_provenance_rejected_then_contract_is_enforced`, `test_given_flat_distribution_when_modified_bundle_bytes_rejected_then_contract_is_enforced`, `test_given_flat_distribution_when_unexpected_release_sidefile_and_symlink_rejected_then_contract_is_enforced`, `test_given_flat_distribution_when_staged_apt_deb_must_match_validated_linux_deb_then_contract_is_enforced`: actual wrong platform, modified file/sidecar, extra release file or linked package, staged DEB differs.
- `test_invalid_source_version_and_commit_are_rejected_before_signing`, `test_zero_and_oversized_release_file_are_rejected_without_reading`, `test_release_safe_file_rejects_dangling_symlink_without_following_it`, `test_manifest_duplicate_file_entry_cannot_become_an_approved_artifact`, `test_platform_manifest_symlink_is_not_a_verified_manifest`, `test_signed_apt_keyring_symlink_is_refused_before_running_gpgv`, `test_signed_apt_directory_symlink_is_not_a_verified_source`, `test_signed_non_utf8_packages_catalog_is_rejected_as_corrupt`: actual rejection paths for forged source/metadata/links and invalid bytes. For these `source_map` cases the fixture patches GPG `subprocess.run`, so **signature authenticity is not proved by these R2 tests alone**.

## Exact module methods and decisions

| Function | Independently observable branch | Evidence and remaining |
| --- | --- | --- |
| `digest` | SHA256 buffered 1 MiB until EOF, file error | E hashes actual files in platform/manifest tests; ? late-chunk source file replacement |
| `safe_file` | Refuse symlink or missing/nonregular; require 1 <= size <= 350 MiB | E zero, sparse 350 MiB+1, dangling symlink, real file success; ? exactly 350 MiB boundary and file substitution after stat |
| `platform_files` | Base is directory but not symlink, part.json regular not symlink, exact platform/version, required canonical binary and .sha256 sidecar per extension | E good release, wrong platform, symlinked manifest/binary and missing directory cases; ? broken JSON, wrong version, missing sidecar, wrong SHA sidecar |
| `platform_files` exact directory | Require exactly expected canonical files plus part.json; reject any sidecar including extra unexpected name, unsafe symlinks | E extra unexpected sidefile and symlink; ? case-colliding/hidden files |
| `platform_files` manifest agreement | Compare exact `path: (sha256,size)` map and number of file entries with actual verified bytes; reject duplicates even if dict collapse makes same map | **E direct duplicate manifest entry** via `test_manifest_duplicate_file_entry_cannot_become_an_approved_artifact`; ? malformed entries/missing keys |
| `verify_signed_apt_indexes` envelope | Exact clearsigned envelope, SHA256 header, nonempty body, signature marker and closing marker; decode errors | E wrong envelope/section and LF/CRLF; ? truncated unicode/signed-end edge combinations |
| `verify_signed_apt_indexes` rows | Require single SHA256 section, valid 64-hex hash, size integer, two unique Packages/Packages.gz entries; verify both bytes and size | E wrong size/digest, absent/duplicate, stale hash, malformed row; ? duplicate SHA256 section explicit test |
| `verify_apt_package_catalog` parse | UTF-8, valid key/colon, unique fields, exactly one stanza, critical keys cannot fold; informational Description continuation accepted | E non-UTF8, duplicate SHA, folded critical, second stanza and positive folded Description; ? malformed keys with unconventional punctuation |
| `verify_apt_package_catalog` identity | Exact Package/Version/Architecture/Filename/Size/SHA256 match approved DEB | E all 6 keys, traversal and extra stanza; ? valid but source DEB replaced between digest and publish |
| `verify_apt_package_catalog` gzip | Read plain+compressed bounded chunks; reject mismatch, trailing decompressed bytes, bad/truncated/gzip multi-members | E four distinct corrupt gzip fixtures; ? >1 MiB boundary input and stream read I/O error |
| `apt_files` | Refuse symlinked APT directory and files, reject empty/oversized, compare staged DEB to validated source; gpgv signature required; validators called; output maps keyring immutable, indexes mutable | E bad symlinks/staged mismatch, source checks; **S GPG in test fixture, real ephemeral GPG covered separately in local apt integration** |
| `source_map` | Exact SemVer + lowercase 40-hex source commit; include only validated Linux+Windows and signed APT files; no overlap of mutable/immutable keys | E malformed source version/commit, exact map, E side-file/manifest/link rejection; ? intentionally injected collisions after map composition |
| `latest_manifest` | Schema/product/tag/commit; three immutable binary entries with fixed `BASE` URLs, hash/size; exclude mutable indexes as client downloads | E `test_given_flat_distribution_when_latest_manifest_points_only_to_immutable_approved_artifacts_then_contract_is_enforced`; ? mutation between local hash and pointer preparation |
| `content_type` | Packages and InRelease text/plain; known filename suffixes MIME map; unknown suffix octet-stream | E upload tests assert cache metadata for different keys; ? per-suffix exhaustive MIME assertions |

## Cross-script correction: release_assets.merge is not the final publication gate

`release_assets.merge` uses a set of extensions and, **within that earlier function alone**, duplicated manifest entries can collapse by set and overwrite a map key. But the downstream publisher's `platform_files` compares **both** manifest map equality **and** `len(files)==len(entries)`, and `test_manifest_duplicate_file_entry_cannot_become_an_approved_artifact` directly asserts that this duplicate fails. Therefore **do not claim duplicate-file entries can be published via the existing R2 flow** on present evidence. A separate `release_assets.merge` schema-normalization question remains, with downstream protection already demonstrated. The preexisting `branch-map-release-assets.md` RA2 is an upstream hypothesis, not evidence of successful publisher bypass.

## Positive / N1–N12

| Category | Evidence and remaining |
| --- | --- |
| Positive | E exact Linux/Windows/apt map and manifest, signed local index/DEB consistency |
| N1 | E mismatched version/platform/SHA/size/malformed fields and corrupt compressed indexes |
| N2 | E no/duplicate manifests and size 0 / 350 MiB+1; ? exactly 350 MiB and 1 MiB streaming |
| N3 | E subproc seam/GPG failure ordering candidate, not actual remote service |
| N4 | E manifest idempotent reads, immutable publish keys; source changes between validation and upload ? |
| N5 | ? source files swapped during staged validation and public upload |
| N6 | E old signed SHA vs new files, nonUTF8, duplicate fields/entries |
| N7 | E exact approved identity, symlinks refused, key namespace allowlist |
| N8 | NA here; Git commit/semver are identities, not wall clock; signed Date handled in APT |
| N9 | NA for publisher file mapping, physical installers separate |
| N10 | S fixed paths and no credential argument in source_map; error reflection of untrusted filename ? |
| N11 | NA |
| N12 | E file tampering/missing; ? disk failures and TOCTOU |

## Stage 9 incremental gap cases only after full global Stage 3–8

- R2-S1: exact bound 350 MiB, chunk boundary and stat/digest TOCTOU with external file replacement.
- R2-S2: malformed part.json list shape/entry value, missing manifest file/sidecar, unknown version, path collision and file symlink race.
- R2-S3: signed SHA256 repeated section/invalid envelopes, malformed control keys, >1 MiB gzip/plain read, I/O fault; do not duplicate already executed field mutation cases.
- R2-S4: source file replacement between `source_map` and actual private/public readback, receipt must not publish wrong source SHA.
- R2-S5: validate local real gpgv and APT acquisition separately from the patched `subprocess.run` used in R2 fixture.

Mutants already targeted by actual tests: drop length guard on manifest entries, accept wrong DEB SHA, skip gzip comparison, follow symlink, use wrong package filename, accept stale signed size/hash. Formal mutation kills not executed; global Stage 3–8 PARTIAL.
