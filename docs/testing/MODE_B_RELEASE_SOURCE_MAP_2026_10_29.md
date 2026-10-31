# Mode B source scan — publication, signing and install workflows

**Source SHA:** `883c20e05181d453d45d07ff41656abecf7409a0`. **Stage:** 1–3 partial,
not a completed test inventory or acceptance. Directly inspected
12 script/workflow files; 59 syntactic function/class
names. Shell pipelines and YAML job steps require explicit branch
mapping; their blank function counts do NOT imply no behavior.

## Release invariants (Stage 2)

- **Critical:** Only build/tag from an approved, immutable source
  SHA; no public version until stage-12 source gate and physical
  acceptance. Do not mutate existing version keys, APT metadata
  or old R2 objects. The terminal `latest` pointer is published
  last only after verification and provenance.
- **Critical:** signed APT Release/InRelease metadata, rotated
  key/fingerprint validation, rollback and key custody,
  deterministic assets and SHA-256 checked downloads.
- **Critical:** identified HTTP GET for public R2 readback
  `RepoTicker-ReleaseVerifier/1.0`, strict HTTP 200, bounded
  body, full size+digest, non-200/403/HTML rejection; never infer
  a successful upload from a successful unsigned web request.
- **High:** install/uninstall preserves or securely cleans
  user-owned configuration/OS credentials under documented
  platform policy; QA scripts must not actually publish artifacts.
- **Negative categories:** N1 malformed URL/key/version,
  N2 size/version/limit, N3 DNS/HTTP/403/429/timeout,
  N4 concurrent publish, N5 staged/rollback/final-pointer
  reordering, N6 malformed manifest/checksum, N7 untrusted
  artifact/path traversal, N8 signing expiration, N9 idempotent
  re-run, N10 auth/token isolation, N12 disk/full read-only.
  N11 paid entitlements are not applicable (RepoTicker is free).

## Direct source index

| Path | Risk C/H | Named syntactic entries | Name:line |
| --- | --- | ---: | --- |
| `scripts/apt_repository.py` | C | 6 | invoke:17, sha256:21, package_field:29, assemble:33, verify:100, main:112 |
| `scripts/r2_release.py` | C | 14 | digest:39, safe_file:47, platform_files:56, verify_signed_apt_indexes:97, verify_apt_package_catalog:152, apt_files:217, source_map:242, latest_manifest:258, item:260, content_type:278, public_readback:284, upload:314, publish:344, main:398 |
| `scripts/release_assets.py` | C | 5 | digest:24, canonical:32, collect:44, merge:99, main:129 |
| `scripts/release_version.py` | C | 3 | versions:24, bump:32, main:56 |
| `scripts/verify_signing_key.py` | C | 2 | validate:8, main:32 |
| `scripts/provision_apt_key.sh` | H | 1 | cleanup_signing_validation:65 |
| `scripts/verify_signing_passphrase.sh` | C | 1 | cleanup:18 |
| `scripts/cleanup-published-artifacts.mjs` | C | 27 | REPO:8, BASE:9, NAMES:10, isSha:11, validateR2Receipt:13, latest:26, version:41, approved:42, expectedUrls:59, actualUrls:60, listRunArtifacts:79, result:80, url:82, response:84, payload:88, deletePublishedArtifacts:97, runId:100, artifacts:104, approved:105, matches:107, artifact:110, removed:122, response:124, remaining:130, main:138, receipt:142, removed:143 |
| `scripts/accept_autostart_linux.sh` | H | 0 | Workflow/shell entrypoint; inspect executable commands |
| `scripts/accept_autostart_windows.ps1` | H | 0 | Workflow/shell entrypoint; inspect executable commands |
| `scripts/install_qa_linux.sh` | H | 0 | Workflow/shell entrypoint; inspect executable commands |
| `.github/workflows/preflight.yml` | H | 0 | Workflow/shell entrypoint; inspect executable commands |

## Existing stable execution contract

Read `.github/workflows/preflight.yml` directly: jobs are
`format_and_core`, `ui`, `desktop`, and dependent
`preflight`. UI includes `node --test tests/*.test.mjs`
and `python3 -m unittest discover -s tests -p
'test_release_*.py' -v`; Rust core, fmt, Clippy and desktop compile
are separate. This source scan cannot run full tests locally:
the container has Python/Node 22, no cargo and cannot resolve
github.com. No CI run results were read, and the code has not
been published/deployed. Stage 4–8 branch and interaction
matrix, mutation review and final release readback remain open.
