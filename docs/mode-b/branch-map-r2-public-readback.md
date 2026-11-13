# Mode B: R2 exact-origin public readback and complete HTTP response verification

Source: `scripts/r2_release.py` blob `b0fe41c6304733d44dd5a35cdaba6e3e906fffe2`, methods `_RejectPublicRedirect.redirect_request`, `_verified_public_opener`, `public_readback` (source lines 284–327). Test source `tests/test_release_r2_contract.py` blob `114b14eba531c683180d0252c5fb6dcd0c37e7ad`, including `IdentifiedPublicReadbackTests`. Baseline production `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Prepared parent `113e2f0cb0b34915b1f4761a68617f2947f139b4` on `audit/mode-b-testing`.

**Direct executable tests in source, not newly run.** These tests execute the real `public_readback` method with a deterministic fake external HTTP response or patched `urllib` opener. They do NOT prove the real public Cloudflare custom domain is reachable today or that the CDN actually serves the bytes.

## Existing exact assertion-to-branch review

| Actual test | What is asserted against the real subject |
| --- | --- |
| `test_given_release_assets_when_public_readback_then_request_identifies_repoticker` | For Linux AppImage, Windows setup, InRelease and latest.json: exact GET/URL/method/body none, User-Agent `RepoTicker-ReleaseVerifier/1.0 (...)`, `timeout=45`, one opener call, HTTP 200 and matching returned SHA/size |
| `test_default_readback_rejects_any_redirect_before_accepting_matching_bytes` | Default opener installs `_RejectPublicRedirect`; synthetic 302 to unrelated URL raises before returning even identical expected bytes |
| `test_default_readback_installs_no_redirect_policy_for_successful_exact_url` | Same handler still permits 200 response at exact original URL; SHA/size correct |
| `test_given_multichunk_response_when_readback_then_complete_sha_and_size_are_verified` | 1 MiB+1 response, exact size/hash, bounded `read(1048576)` called three times (including final EOF) |
| `test_given_non200_or_edge_rejection_when_readback_then_no_success_receipt` | HTTP 201/206/403 rejected before body read; synthetic HTTPError 403 propagated as same object |
| `test_given_invalid_public_bytes_when_readback_then_checksum_and_size_fail_closed` | Empty, short, extra, same-size altered, and HTML edge challenge bodies rejected |
| `test_every_non_success_public_status_is_rejected_before_read` | 301,302,304,400,401,404,409,429,500,503 rejected with no body read |
| `test_missing_local_source_aborts_without_issuing_a_public_request` | Deleted source file causes FileNotFoundError before opener invocation |
| `test_network_error_is_propagated_without_a_verified_receipt` | URL error from injected opener propagates, never returns verified result |
| `test_same_size_multichunk_corruption_fails_full_digest_check` | 1 MiB+1 response where only last byte differs is rejected |
| `test_given_flat_distribution_when_public_readback_verifies_full_body_and_size_then_contract_is_enforced` | The actual `public_readback` returns matching sha+size for a real small temporary release file, rejects different bytes |

Additional **real publish-level tests** call the actual `publish` with isolated fake S3 and injected public results: `test_failed_immutable_public_readback_stops_before_mutable_indexes`, `test_failed_mutable_public_readback_cannot_publish_signed_commit_marker`, `test_failed_inrelease_readback_never_writes_latest_pointer`, `test_failed_public_readback_has_no_receipt_even_when_private_latest_committed`, `test_given_flat_distribution_when_failed_final_latest_readback_never_emits_deletion_receipt_then_contract_is_enforced`. Full transaction ordering is mapped separately.

## Method-by-method executable branches

| Method/region | Positive and negative outcomes | Evidence/gap |
| --- | --- | --- |
| `_RejectPublicRedirect.redirect_request` | All HTTP redirect attempts throw fixed ValueError rather than follow unapproved mirror | E synthetic 302; ? 301/303/307/308 using the real handler under fake urllib transport |
| `_verified_public_opener` | Construct `urllib.request.build_opener(_RejectPublicRedirect)`, open exact Request at timeout 45 | E synthetic transport inspects handler and exact request |
| `public_readback`: local source | `path.stat().st_size`, buffered SHA256 before network; absent source errors before HTTP | E missing source denies opener, hash/size in normal and multichunk tests |
| HTTP request | GET exact `BASE + relative`, identified agent, no body, timeout 45 | E four named paths, both success and edge error |
| status | Exact 200 accepted; non-200 rejected **before body read** | E 201,206,301,302,304,4xx,5xx; unknown arbitrary status inherits same guard |
| body iteration | Repeated `read(1 MiB)` until EOF; reject when length > local size immediately | E 1 MiB+1 and extra body; ? streaming source failure after partial reads |
| final validation | Require byte length exact **and** SHA256 exact, including same-size altered bytes/challenge HTML | E short/extra/empty/same-size and last-byte corruption |
| return metadata | Fixed public URL, source and readback digests and sizes, readback_status=200; absent on failed path | E exact values on four paths |
| publication interplay | Each binary/index/commit pointer public-readback must succeed before next group and receipt | E fake-S3 failure-injection tests, no live R2/Cloudflare assertion |

## Remaining nontrivial interactions

1. **Browser/WAF challenge vs 200 HTML:** Already covered as byte mismatch, even when HTTP status equals 200. No claim that an external WAF is currently blocking.
2. **Redirect with correct bytes:** Existing default-opener 302 test proves fail-closed; add 301/303/307/308 if exact redirect-code distinction matters, not redundant normal 302 cases.
3. **Source replacement between local size/hash, HTTP readback and pointer receipt:** If file changes while publisher operates, bound `length` and source digest were captured earlier; later stages might compare changed local files. Establish exact outcome using a deterministic fixture before any TOCTOU security conclusion.
4. **Chunked transfer failure:** A stream that raises OSError/IncompleteRead after first chunk should not return a receipt; exceptions currently naturally propagate, but no direct truncated-then-error fixture exists.
5. **Actual public CDN provenance:** Tests prove the URL and policy of the verifier, not that a Cloudflare edge fulfills it. This is an owner release acceptance gate, not part of a doc-only audit.

## Positive/N1–N12 map

| Class | Status and remaining |
| --- | --- |
| Positive | E precise 200 payload and identified GET, multiple paths, SHA and sizes |
| N1 | E wrong HTTP status and body, source missing; ? response object protocol errors |
| N2 | E 1 MiB+1, 0/truncated/oversized body; ? exactly 1 MiB and streaming fault |
| N3 | E simulated 403,500,503 and URLError; ? real TLS/CDN failure |
| N4 | E deterministic readback repeated per path; server cache staleness only physical |
| N5 | E publish-level competing pointer separately; ? local source replacement mid-read |
| N6 | E stale/foreign content rejected; missing optional headers do not prove anything |
| N7 | E no redirect, exact namespace, no browser impersonation |
| N8 | NA no wall clock requirements |
| N9 | NA no UI |
| N10 | E stable identifying agent; no token in request; simulated network errors may include untrusted URL in exception |
| N11 | NA |
| N12 | E missing file and network exception; ? local read I/O fault, partial stream failure |

## Stage 9 incremental gaps (only after global Stage 3–8)

- PR1: fake external stream raises after a valid first chunk; assert no verified result and no receipt at publish layer.
- PR2: 301/303/307/308 exact-origin redirect policy, with matching bytes on target, fail closed.
- PR3: replace approved source between hash/stat/readback, verify no successful contradictory receipt under agreed immutable candidate snapshot contract.
- PR4: HTTP response lacking `status` / malformed body API and return metadata never falsely claim success.
- PR5: public custom-domain readback of exact downloaded release SHA/size remains **physical** owner approval, not a synthetic unit check.

Mutation targets: loosen status==200 to 2xx, remove no-redirect handler, skip last digest check, read only first chunk, permit extra bytes, accept HTML challenge, pass sensitive token in URL, emit receipt before public readback. The direct existing tests already exercise many of these; no mutation run was performed.

No code, tests, CI, secrets or infrastructure were changed; global Mode B Stages 3–8 remain PARTIAL.
