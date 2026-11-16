# Mode B: R2 release publisher, signed APT and public readback method ledger

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Python release owner `scripts/r2_release.py` blob `b0fe41c6304733d44dd5a35cdaba6e3e906fffe2` (486 lines), audit parent `5b02d788ddeea00411f72692a377cfdbf9e917ba`.

**All 19 lexical entries** now classified: 1 previous CLASS_DECL (`_RejectPublicRedirect`), and 18 callable/inline entries below. The real `tests/test_release_r2_contract.py` blob `114b14eba531c683180d0252c5fb6dcd0c37e7ad` has **67 `def test_...` declarations**. The tests import actual `r2_release` and invoke `source_map`, `publish`, `upload`, public readback, etc. using isolated temporary files and synthetic fake boto3/urllib HTTP; they do not publish to hosted R2. `tests/test_release_retention_contract.py` checks workflow source requirements (static); `tests/test_release_apt_integration.py` calls real local dpkg/gpg/apt when installed, not hosted production APT. No new test execution.

## Exact executable or nested owners

| Line | Method | Evidence | Verified test assertion / open branch |
| ---: | --- | --- | --- |
| 39 | `def digest(path):` | E_PARTIAL | Release test verifies manifest digest for approved immutable files |
| 47 | `def safe_file(path):` | E_PARTIAL | Direct 0, >350MiB and dangling symlink rejection |
| 56 | `def platform_files(release, platform, version, commit):` | I_PARTIAL | Executed through source_map, exact platform/manifest/sidecar admission |
| 97 | `def verify_signed_apt_indexes(inrelease, index):` | E_PARTIAL | Direct signed index SHA256 rows, duplicates/mismatch, CRLF |
| 152 | `def verify_apt_package_catalog(packages, compressed, pool, version):` | E_PARTIAL | Direct package catalog field+gzip identity and malformed rows |
| 217 | `def apt_files(apt, linux_deb, version):` | I_PARTIAL | Executed by source_map signed APT provenance; synthetic gpgv |
| 242 | `def source_map(release, apt, version, commit):` | E_PARTIAL | Direct isolated two-platform source map, malformed version/commit |
| 258 | `def latest_manifest(immutable, version, commit):` | E_PARTIAL | Direct latest immutable artifact pointer only |
| 260 | `def item(key):` | INLINE | Private nested item in latest_manifest, no extra exported API |
| 278 | `def content_type(path):` | I_PARTIAL | Used by upload; content-type exact policy no direct assertion |
| 287 | `def redirect_request(self, req, fp, code, msg, headers, newurl):` | I_PARTIAL | Redirect denial reached by controlled urllib handler fixture |
| 291 | `def _verified_public_opener(request, timeout):` | I_PARTIAL | No redirect handler tested via public_readback fake opener |
| 300 | `def public_readback(path, relative, opener=_verified_public_opener):` | E_PARTIAL | Direct 200/full SHA/length, 302/403/truncated/network fail |
| 333 | `def object_head(client, key):` | E_PARTIAL | Direct HEAD 404 vs forbidden/500/unknown |
| 344 | `def object_etag(head):` | I_PARTIAL | ETag validated through upload CAS and competing publisher tests |
| 354 | `def upload(client, key, file, immutable, expected_latest=_NO_SNAPSHOT):` | E_PARTIAL | Direct conditional PUT, HEAD metadata and private readback cases |
| 403 | `def publish(release, apt, version, commit, run_id, output, account, access_key, secret):` | E_PARTIAL | Direct offline mocked boto3 publish sequencing; latest.json last |
| 468 | `def main():` | P | CLI main argument validation not invoked by 67-case Python file |

## Existing deep assertions, not to duplicate

1. **Identity:** `source_map` ensures exact platform/version/commit and only approved Linux/Windows artifacts. 0/oversized files, unexpected sidecars, symlinks (including dangling), checksum mismatch, duplicate manifest entry and wrong provenance are rejected before remote S3 client creation.
2. **Signed APT:** `verify_signed_apt_indexes` checks actual InRelease SHA256 records for Packages and Packages.gz including CRLF, duplicate/missing, old valid signed hash with new index files; `verify_apt_package_catalog` checks exact package name `repoticker`, version, amd64, DEB digest/size, one record, gzip matches plain. APT producer signature is verified via `gpgv` in `apt_files`. Fixture tests mock subprocess where stated; the separate real local APT integration test proves dpkg/gpgv behavior only if platform dependencies are present.
3. **One immutable artifact:** `publish` first uploads immutable canonical artifacts and verifies public URL bytes, then mutable Packages/Packages.gz, **signed InRelease last among APT**, and only then writes `latest.json` pointer. A failed public readback anywhere prevents final receipt. A failed old/latest collision refuses before remote writes.
4. **Atomic object CAS:** `upload` uses single-part `put_object` with `IfNoneMatch:"*"` on absent and `IfMatch` for replacement, followed by full private S3 readback; immutable conflicting digest refuses. Tests explicitly exercise competing writers, 412, missing/forbidden/500 HEAD, forged metadata, truncation, oversize, stale latest pointer and same-content idempotent recovery.
5. **Public readback:** fake external URL opener tests 200 only, full body length+SHA256 across chunks, no redirects even with matching bytes, user-agent presence and wrong/403/302/network response rejection. A private readback alone is not enough to issue a release receipt.
6. **Retention:** workflow contract uses protected environment, separate release job, one-day staging artifact expiry and explicit post-publication cleanup. These assertions are largely **source-only** and must not be labelled as hosted release or successful cleanup run.

## Open independent branches and human gates

- `main` CLI argument parsing, missing boto3, permissions and refused local output path need a deterministic CLI subprocess or direct `main` harness, not live production flags.
- Signing trust: source tests validate malformed index and authenticated local fixture; they do not verify the actual production GPG public key custody or approved `apt-release` environment. Never use a real signing secret in a test.
- **Partial multi-object publication is not atomic**: Packages/Packages.gz/InRelease may be updated before latest.json. On failure, clients verify GPG and retry; the publisher cannot claim all remote objects rolled back. Changing publication transaction policy is architecture STOP FACTOR.
- Remote CDN cache, stale regional edge, revocation, 412 under true concurrent hosted writers, HTTPS issuer and cloud IAM require human-controlled production acceptance, not use of owner's live account during audit.
- N1 malformed files/paths, N2 0/350MiB and index limits, N3 S3/CDN failures, N4 idempotency/retries, N5 concurrent publisher, N6 damaged provenance, N7 keys/environment/URL, N8 release time/clock, N9 cancellation, N10 keys/diagnostic leakage and N12 receipt filesystem failures apply; N11 NA.

Stage 3–8 PARTIAL. All changes are docs-only; tests, hosted R2, live keys, workflow and user installed app were not changed/executed.
