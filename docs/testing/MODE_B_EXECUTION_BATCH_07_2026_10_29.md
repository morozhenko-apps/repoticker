# Mode B batch 07 — signed-release preflight, immutable R2 and negative paths

**Date:** 2026-10-29. **Starting dev:** `71e4d086bfb1b57365fa407667a4263ba57e8b92`. **Primary mode:
B — Testing**. All changes are prepared as commits without updating
`dev`; publish one final fast-forward only after the complete batch.
No live Cloudflare access, GitHub Actions polling, owner data, release
tags or main changes.

## Root-cause evidence and safety constraints

Direct inspection of `scripts/r2_release.py`,
`tests/test_release_r2_contract.py`, `scripts/release_assets.py`,
`scripts/apt_repository.py` and current Mode B R2 branch map.

**Confirmed defect R2-LOCAL-01:** `publish()` already rejects an
existing receipt before constructing S3, but rejects an existing
`repoticker-latest-publish.json` file only **after** uploading all
immutable artifacts and mutating APT `Packages`/`Packages.gz`/
`InRelease`. Therefore a deterministic local filename collision
can produce remote changes before the refusal. A dangling receipt
or latest-manifest symlink also escapes `Path.exists()` and
can be followed when writing output, violating the no-overwrite
contract. This is a local preflight ordering and filesystem safety
flaw, not the unresolved remote object concurrency protocol.

Expected behavior: reject existing **or symlinked** output and
latest-manifest paths before artifact validation, S3 client
creation or remote write. Retain the late existence/symlink check
as a second guard against a later filesystem conflict; this does
not pretend to offer atomic cross-process publication.

### Root-cause alternatives ruled out

1. Cloudflare edge propagation or rate limiting cannot explain the
   deterministic failure with a pre-existing local file.
2. Signature, checksum or version mismatch is irrelevant: the
   collision is checked after otherwise valid files and upload.
3. GitHub Actions workflow concurrency controls only jobs in the
   configured group, not the local filename check.
4. Repeating public readback cannot undo a mutable APT index write.
5. Catch-and-ignore output collisions would break provenance and
   was rejected. Narrow early rejection reuses existing contract.
6. This defect does not authorize an unsafe R2 conditional-PUT
   workaround or auto-rollback of `latest.json`.

## Scope and test matrix

| Source seam | Positive | N1 malformed | N2 bounds | N3 HTTP/storage | N4 retries | N5 race | N6 corrupt | N7 auth/sign | N8 time | N9 abort | N10 privacy | N11 purchase | N12 filesystem |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `publish` preflight | existing | add path conflict | existing | add no-client guarantee | N/A no retries | add collision before writes | existing | existing | N/A | add no receipt | no secret leakage | N/A free | add symlink/dangling |
| `upload` immutable/mutable | existing | add wrong metadata | existing | add HEAD 500 / broken read | N/A | **OPEN external writer** | add short/large/corrupt body | existing | N/A | fail closed | no secret echo | N/A | only fake bytes |
| `public_readback` | existing | add missing source | add exact bytes | add non-200/HTTP failure | N/A | N/A | add multi-chunk corruption | N/A | bounded timeout | fail closed | no raw HTML | N/A | files bounded |
| `source_map`/APT catalog | existing | add wrong version/commit | add catalog records | N/A source-only | N/A | N/A | add malformed gzip and index | local GPG stub existing | N/A | fail before client | avoid paths | N/A | safe files/symlinks |

**Code:** a narrow production fix in `r2_release.py` and
offline deterministic regression tests in `test_release_r2_contract.py`.
Include request/body tests, private S3 head/get errors, and failed
publication points: no receipt unless full last-pointer readback.

**Validation:** inspect exact source contracts and run focused Python
test suite only if it can execute locally; otherwise submit to the
existing Python release Preflight without claiming green. Do not
start separate workflow runs or ask runners to rerun for partial
commits. Keep docs and code in distinct commits.

### Explicit architectural blockers not changed

- R2 immutable-object `HEAD` then `upload_file` lacks an atomic
  create-if-absent guarantee for **external concurrent writers**.
- `latest.json` is written before public verification, so a
  verification failure cannot prove that the public pointer was
  never mutated. Recovery/commit semantics need an owner-approved
  architecture and independent checks, not a testing-only patch.
- Native Windows/KDE, 20 independent locale reviews, final
  exact-SHA stable evidence and complete Mode B matrices remain
  open. No release promotion authorized.

**Rollback:** revert the production+test commit only. No changes to
the on-disk receipt format, S3 keys, signing policy or public API.

**At plan creation:** no executable change submitted, no CI run
observed.
