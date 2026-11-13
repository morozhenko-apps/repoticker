# Mode B: verified GitHub artifact retention, no premature deletion and cross-run isolation

Source baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, module `scripts/cleanup-published-artifacts.mjs` blob `1fd265283923d48825bc401e9d437cfffee855d0` (148 source lines). Direct JS test file `tests/artifact-retention.test.mjs` blob `5e5e0968ab8e558ee08b0f1aff3cd4428f8490b2`, **12 Node tests** invoke the actual exported `validateR2Receipt` or `deletePublishedArtifacts` with a synthetic HTTP `request`. `tests/test_release_retention_contract.py` blob `6a4f99be9922f9d873aa73210a81966404663d81` has **two static workflow assertions**: staged archives expire after 1 day; cleanup follows readback. The tests do not delete real GitHub artifacts or access an Actions-write credential.

Prepared parent `a2eede156d660f031812066d2c4889c7f5a51285` on `audit/mode-b-testing`. Mode B method/branch evidence only; no tests or GitHub DELETE executed.

## Exact observed assertions in tests

- `Given_a_release_When_cleanup_requires_verified_public_R2_receipt_before_any_network_call_Then_cleanup_contract_holds`: real `validateR2Receipt` accepts good fixture and rejects empty platforms, wrong origin, malformed commit, duplicate/foreign names, altered public readback. Injected network callback is not called after invalid receipt.
- `Given_a_release_When_cleanup_cannot_delete_source_archives_unless_final_latest.json_is_verified_Then_cleanup_contract_holds`: missing final pointer, wrong URL, truncated size, tampered SHA and HTTP 404 all deny **any** GitHub request.
- `Given_a_release_When_cleanup_deletes_only_matching_artifacts_and_independently_confirms_removal_Then_cleanup_contract_holds`: actual deletion procedure removes exactly Linux/Windows archive IDs 101/102, leaves foreign artifact 111, calls post-delete listing, returns 2; second invocation finds no approved archives and returns 0 without deletion.
- `Given_a_release_When_foreign_commit_SHA_refuses_deletion_Then_cleanup_contract_holds`: artifact from a different Git SHA cannot authorize DELETE.
- `Given_a_release_When_Mode_B_missing_or_malformed_publication_receipts_never_trigger_GitHub_DELETE_Then_cleanup_contract_holds`: missing per-platform files, wrong status/hash/size/URL, invalid run ID denied before network.
- `Given_a_release_When_Mode_B_GitHub_artifact_listing_errors_and_ambiguous_matches_block_cleanup_Then_cleanup_contract_holds`: 403, non-array, >100 entries, duplicated names reject with zero DELETE.
- `Given_a_release_When_Mode_B_failed_delete_and_failed_post-delete_confirmation_cannot_report_completion_Then_cleanup_contract_holds`: DELETE status 503 and status 204 with still-listed artifact both reject completion.
- `Given_a_release_When_Mode_B_cleanup_with_no_credentials_or_missing_archived_runs_must_fail_closed_or_be_idempotent_Then_cleanup_contract_holds`: no token => no HTTP; zero archived matches => return 0.
- `Given_a_release_When_Mode_B_complete_platform_receipts_reject_wrong_file_sets_before_any_GitHub_request_Then_cleanup_contract_holds`: 14 corrupt URL/file-set cases rejected, including missing/extra/duplicate/checksum, foreign platform/version, query/fragment/userinfo/port, percent-encoded/relative traversal and wrong extension.
- `Given_a_release_When_Mode_B_mixed-run_receipt_cannot_authorize_cleanup_of_either_archive_Then_cleanup_contract_holds`: different run IDs denied before request.
- `Given_a_release_When_Mode_B_verify_both_archive_provenances_before_deleting_either_Then_cleanup_contract_holds`: bad second archive commit/id or duplicate name prevents **deletion of the good first archive**; only one read-only inventory before first destructive request.
- `Given_a_release_When_Mode_B_same_archive_ID_reused_for_two_distinct_platform_names_must_not_delete_Then_cleanup_contract_holds`: duplicate ID shared between two names blocked, no DELETE.

## Every production method and branch

| Source method | Decision/guarantee | Evidence and remaining |
| --- | --- | --- |
| `isSha` | Type string plus exact lowercase 64-hex | E bad/mismatched receipt hashes; ? upper-case, 63/65 edge individually |
| `validateR2Receipt` root | Schema/product/base URL/exact SemVer/40-char lowercase source SHA, exactly two distinct approved artifact names | E good and many malformed fixtures; ? wrong schema type, zero-prefix SemVer and alternate-case SHA |
| `validateR2Receipt` final pointer | Fixed `BASE+"latest.json"`, SHA equality, positive safe integer byte size, exact readback size and status 200 | E five pointer mutations, rejects before requests |
| `validateR2Receipt` run scope | Both artifact `run_id` values match; each positive safe integer; no cross-run archive deletion | E mixed-run and zero-run denial |
| `validateR2Receipt` file list | Exact 4 Linux and 2 Windows canonical file URLs for requested version, no duplicate/foreign URL; SHA/status/byte count validated | E 14 file-set/URL negatives and good receipt, no arbitrary download origin |
| `listRunArtifacts` (private) | GitHub run endpoint, Bearer+Accept header, per_page 100, pages 1..10; status==200, JSON artifacts array <=100; page under 100 => complete; full 10 pages => fail closed | E first page and 403/malformed/101 entries; **? exactly 100→next page, page 10 terminal and 1000 overflow**, actual request headers and read failures |
| `deletePublishedArtifacts` preflight | Validate receipt then require token; fetch complete inventory **before any DELETE**; select at most one match per approved name; missing name idempotent; cross-run SHA and artifact ID scope check | E malicious second record, same ID, wrong commit, missing token, absent archives; ? rate limit mid-pagination |
| `deletePublishedArtifacts` destructive phase | DELETE approved IDs one-by-one, require HTTP 204; after each perform fresh full listing and ensure removed ID/name absent, then increment count | E successful 2, 503 failed DELETE, 204 still-listed, leave foreign artifact; ? first delete succeeds but later 403/list fail, subsequent retry and no false completion |
| `main` CLI | Exactly `node ... --verified-receipt PATH`, read and parse JSON, GH_TOKEN environment, call delete, report count or error with exitCode=1 | Node test imports exported subjects but does **not** run command-line `main`; ? bad args, malformed receipt file, unreadable path, error hygiene |

## Cross-service invariants and failure transparency

- **Public R2 readback success is an authorization precondition for deleting temporary GitHub archives.** A private R2 HEAD/GET success alone is insufficient, and final latest.json readback cannot be substituted with an earlier immutable binary success.
- **Every file must be the approved release artifact.** Version/commit/run, six exact URLs, SHA/size/status and two archive names must match; a foreign run's second platform must block deletion of both.
- **Deletion is intentionally not atomic across GitHub artifacts**: if Linux archive was deleted but Windows deletion fails, later runs must be idempotent and not infer that failed second delete succeeded. Current test covers initial idempotence and first-delete failures, not all partial sequence failures.
- **Risk RC1 (unverified pagination boundary):** `listRunArtifacts` uses `<=10` pages of up to 100 items. A full page advances; an exactly 1000-item full last page produces an error, never success. The existing negative test only checks a *single* returned array of 101, not the legitimate 100/100/99 multi-page chain, and no test asserts request headers across pagination. Test before claiming complete provider pagination coverage.
- **Risk RC2 (unverified cross-run race):** successful read-only preflight is before DELETE; provider archive may disappear after listing. A resulting non-204 fails and is not silently treated as successful. No physical GitHub mutation permitted in this mode.
- **No ownership of public signing keys:** this cleanup tool accepts a receipt generated by the publisher but does not itself perform GPG or HTTP readback, only validates the receipt fields. Provenance of the receipt bytes is a separate trust boundary; never call a caller-created lookalike receipt independently authenticated.

## Positive / N1–N12

| Category | Evidence and remaining |
| --- | --- |
| Positive | E real helper validation and two approved GitHub DELETEs via isolated request fake; E retry returns 0 |
| N1 | E malformed receipt/file, invalid artifact id/name/run, 403/list failure |
| N2 | E listing 101 invalid; ? exactly 100/101 across pages and 10-page cap |
| N3 | E fake 403/503/error status, ? actual HTTP timeouts/429 and JSON failure |
| N4 | E repeat after successful cleanup, missing items idempotent; ? partial two-item cleanup retry |
| N5 | E two-item preflight, ambiguous IDs, ? stale list and concurrent external deletion after first item |
| N6 | E wrong-source run/commit, missing artifacts; ? previous run retained/expiry state |
| N7 | E exact allowlist and URL path, cannot cross GitHub org/repo by arbitrary receipt |
| N8 | NA, only fixed version identity and source run, not time |
| N9 | NA |
| N10 | E Bearer in request headers by source, not in receipt or delete URL; ? CLI exception redaction |
| N11 | NA |
| N12 | E DELETE 503 and still-listed response, ? JSON parse error, fail after first success |

## Stage 9 planned incremental cases after full inventory sign-off

- RC-T1: exact pages 100→next 1, 100×10 cap, 99 immediate terminate, 403 on page 2, JSON failure, 429 and malformed page. Assert no DELETE until full inventory succeeds.
- RC-T2: fail second archive deletion **after first successful deletion**, then repeat with first absent; assert only second can be removed without touching unrelated assets.
- RC-T3: malformed real JSON receipt CLI and absent/invalid GH_TOKEN without leaking token in stderr, exitCode=1.
- RC-T4: provider removes archive between preflight and DELETE; no false 2-count success and no foreign mutation.
- RC-T5: workflow trigger/retention is static policy evidence only; actual cleanup is an owner release operation and not to be performed in a test-only audit.

Mutation kills: remove latest pointer verified guard, change count to accept duplicate file URLs, accept foreign run/commit, delete first before inspecting second, treat 403 as empty, truncate pagination silently, allow duplicate artifact IDs, skip post-delete confirmation, accept non-204 as deletion. Existing direct tests target most; no mutation engine or new test execution occurred.

Stage 3–8 global state remains PARTIAL. No source, tests, actions runs, provider artifacts, CI or release were altered.
