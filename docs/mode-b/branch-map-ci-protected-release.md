# Mode B: protected exact-main tag release DAG, signed APT, R2 publication and cleanup

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; `.github/workflows/desktop-release-candidates.yml` blob `a445d1302525a48402c6ae52e4fcc9e6a0741c9d` (228 source lines). Prepared parent `65b823fcfd68974cf8dd1c47170bdf7c3c0be820`, named branch `audit/mode-b-testing`.
Direct structural test bodies: `tests/test_release_candidate_contract.py` (**6 tests**, one calls real release_version and parses current Cargo.lock, others text-check workflow); `tests/test_release_retention_contract.py` blob `6a4f99be9922f9d873aa73210a81966404663d81` (**2 Python static tests**); `tests/test_release_strict_contract.py` (manual stable suite contracts); `tests/test_release_lockfile_contract.py` (Cargo.lock declarations). Real release helper behavior is tested separately in `test_release_version.py`, `test_release_assets.py`, `test_release_apt_integration.py`, `test_release_r2_contract.py` and `artifact-retention.test.mjs`, with detailed maps in `branch-map-release-version.md`, `branch-map-release-assets.md`, `branch-map-apt-signed-snapshot.md`, `branch-map-r2-upload-publish.md` and `branch-map-release-retention.md`.

**No live GitHub release, R2 call, key import, tag, CI workflow or test suite was executed.** Workflow declaration is not proof that a GitHub environment has actually enabled reviewer protection; external environment policy must be verified separately.

## Exact release job DAG and independent branches

| Entry/job | Explicit source contract and negative outcome | Evidence/remaining |
| --- | --- | --- |
| Trigger | Only pushes to tag pattern `v*`; no dev branch push publishing trigger | E textual workflow inspection; ? GitHub real tag filter |
| `validate`: tag | Exact `v(0|[1-9][0-9]*)` semver triplet, source commit exactly `origin/main^{commit}`, three version markers `release_version.py --check-tag`, committed Cargo.lock and `cargo metadata --locked`; abort before builds on mismatch | E real Python version matching + static workflow test; **? actual GH ref SHA/main race and forged/moved tag during job** |
| Linux after validate | Locked Tauri Linux DEB/AppImage build, exact version and `release_assets.py collect`, verify SHA256 sidecars, stage `repoticker-linux`, `retention-days:1`, fail if missing files | E source contract tests and helper tests; ? real build/installer |
| Windows after validate | Windows NSIS from locked source, exact version and artifact collect, stage `repoticker-windows`, `retention-days:1`, fail missing | E source contract tests; OS acceptance, unsigned code-signature UX remains outside CI |
| macOS | Explicit `if: ${{ false }}` stub, no macOS release artifact | S exact source, not a completed macOS gate |
| `publish` dependencies | `needs:[validate,linux,windows]`, `environment:apt-release`; only after valid artifacts and required environment | E static `test_publication_restricted_to_main_matching_tag_and_protected_env` checks exact source strings; actual environment reviewer rules external |
| publish secret setup | Validate GPG primary fingerprint 40 hex and R2 account 32 lowercase hex; `umask 077`, private GPG homedir; import only signing subkey via secrets, validate offline primary/subkey authority, cleanup temporary inventory/import | E `verify_signing_key` synthetic and signing-provisioning tests; ? actual production GitHub Secrets and approved fingerprint |
| signed APT | Build local DEB-based signed flat APT snapshot via `apt_repository.py` with protected subkey/passphrase file | E real local ephemeral GPG+APT integration test *if prerequisites available*; not equivalent to production APT public readback |
| R2 publish | Run `r2_release.py` with exact GITHUB_SHA and GITHUB_RUN_ID, locally verify platform/metadata and APT, upload immutable then signed mutable APT and latest last, require exact public CDN SHA/size before receipt | E 67 direct isolated FakeS3 Python test bodies, no live R2/CDN proof |
| receipt handoff | Write base64 representation of verified receipt to job output only after publisher returns success, for downstream deletion; no binary GitHub attachments | E structural retention tests and real `publish` FakeS3 receipt gating |
| private-key cleanup | `if:always()` kills isolated gpg-agent and removes `$RUNNER_TEMP/private`; `gpgconf ... || true` is best-effort cleanup only, not a quality-gate bypass | Source; ? physical failure of cleanup and job log privacy |
| `cleanup` | `needs:[validate,linux,windows,publish]`, scoped `actions:write`; decode receipt, call `cleanup-published-artifacts.mjs --verified-receipt`; delete only two temporary GH archive IDs after exact provenance/verified public latest | E 12 direct Node cleanup tests with fake HTTP; ? actual GH DELETE and independent archive list readback |
| `github-release` | `needs:[validate,publish,cleanup]`, scoped `contents:write`; `gh release create --verify-tag`, **text-only** notes and direct R2 links; no GitHub binary attachment | E static source tests, ? actual GitHub release permission, duplicate/create failure, rate-limit recovery |

## Verified source-test claims versus gaps

- `test_release_candidate_contract.py` checks correct locked workspace version, candidate collection/version and the release workflow's exact tag/main/environment/R2 source strings. This does **not** execute a tag push.
- `test_release_retention_contract.py` parses two `actions/upload-artifact` stanzas and requires `retention-days: 1` for Linux/Windows; checks both download-artifact uses and text-only GitHub Release dependency after publish+cleanup. Actual retention expiration cannot be claimed from the config test.
- The **publisher's own runtime** has stronger test evidence than workflow structural assertions: e.g., forged SHA metadata, raced latest ETag, failed final public latest readback with private latest already committed and no receipt.
- Protected environment rules (required reviewers, branch tags allowed, secrets authorized) live in GitHub settings; the YAML name alone cannot prove a real approval gate. Owner-only release authorization remains necessary.
- `github-release` is downstream of cleanup: if temporary GitHub Actions artifact deletion fails, the source DAG does not proceed to text-only GitHub Release. This is intentional according to exact `needs`.

## Positive / N1–N12 and interactions

| Class | Existing vs open |
| --- | --- |
| Positive | E structural DAG, real helper tests, signed local APT fixture; live release untested |
| N1 | E invalid SemVer, wrong source metadata, bad receipt via helper; workflow tag command failure ? |
| N2 | E exactly two stage archives/1-day retention and Linux/Windows payload; max artifact sizes via helper |
| N3 | E fake R2/GitHub errors; live GitHub Secrets, signing service, CDN unavailable |
| N4 | E helper idempotence/reused SHA; same-tag live rerun and local R2 replay after failed receipt ? |
| N5 | E fake competing latest writer; live race tag/main/approval and two concurrently publishing workflows ? |
| N6 | E invalid part manifests, SHA, signed package catalog; old release index recovery ? |
| N7 | E exact owner/main/tag, scoped GPG subkey and per-job write permissions by source; external environment approval settings ? |
| N8 | E version identity not wall-clock; signed APT Date and retention are external |
| N9 | OS Windows/KDE/Keyring physical acceptance not supplied by build logs |
| N10 | E no direct credential in release notes; secret log redaction and best-effort cleanup runtime ? |
| N11 | NA |
| N12 | E signed package byte mismatches; disk-full/failed uploads/partial remote state ? |

## Stage 9 and final owner approval

- CR1: classify all malformed tag/version, mismatched actual `origin/main`, stale/moved tag, and signing prerequisites before any publish action; use an isolated Git repo with real Bash validator rather than string matching.
- CR2: exercise actual cleanup receipt/approval chain with fake external GitHub/R2 adapters; no live permanent DELETE without explicit owner release action.
- CR3: verify expiry and artifact IDs in hosted job evidence at exact release SHA; do not silently assume YAML retention is runtime protection.
- CR4: documented external `apt-release` rules and signing subkey custody need owner-side verification, not test/CI mock.
- CR5: physical Windows and KDE install/uninstall, unsigned NSIS confirmation, click focus and signed Linux APT consumer are separate acceptance steps.

Mutants: accept tag not matching main, remove --locked, bypass protected env, import full primary private key, stage release with no readback, publish latest before signed InRelease, delete GH artifacts before final latest proof, attach unsigned executable to GitHub Release. Do not claim mutation kills without executable failing tests.

Mode B global Stage 3–8 PARTIAL, Stage 9 not started. Source/test/workflow/branch ref `dev` untouched.
