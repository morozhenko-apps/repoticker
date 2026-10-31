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


## Batch 07 implementation checkpoint — submitted for exact-SHA CI

**Staged code/test commit:** `d3afba59f870e27a7ab40ef35a51f7ace9c5e840`. The only
production source change is `scripts/r2_release.py::publish`.
The existing receipt and `repoticker-latest-publish.json`
conflict checks now also reject dangling symlinks; both checks
run **before** source validation and S3 client construction.
The manifest check is repeated before the final `latest.json`
upload to reject a conflict arising during previous uploads.

**26 additional offline Python tests** were added to
`tests/test_release_r2_contract.py` (28 previously existing,
54 current test methods). Cases cover:

- Existing or dangling local receipt/manifest paths: reject before
  validating artifacts, opening the cloud client or changing R2.
- Public readback failure after immutable asset, mutable Packages
  and signed InRelease; no later pointer or verified receipt.
- Race where a local manifest file appears while InRelease is
  being verified: fail closed before writing `latest.json`.
- S3 HEAD 500/unknown exceptions, missing sha metadata, forged
  sha metadata with wrong bytes, shorter/longer private readback
  and S3 GET errors: reject without false verification.
- Public HTTP 301/302/304/400/401/404/409/429/500/503,
  missing local file, network exception and multichunk same-size
  tampering: no successful receipt.
- Invalid release version/commit, empty or too-large source
  file, dangling source symlink, duplicate native manifest entry,
  symlinked platform manifest/apt keyring/apt directory and a
  signed but non-UTF-8 Packages catalog.

**Validation evidence:** GitHub connector file reads and static
contract/structure checks of the staged exact source; total
tests are 54 and all planned paths and guards are present.
A static comparison against the previous production version
confirms the new early manifest check had been absent. The
**Python tests were NOT executed** here, because the local
container cannot resolve GitHub to obtain this staged repo.
Do not claim 26/26 PASS; the exact-SHA Python release suite
and full Node/Rust/desktop Preflight are pending external CI.
The workflow will be triggered by the final single branch
update; CI will not be polled.

**Unresolved architectural blockers:** different external R2
writers still have no atomic conditional immutable creation;
a failed public readback of an already-uploaded `latest.json`
still cannot prove the pointer was never mutated. No false
rollback, overwrite, forced fetch or incomplete release receipt
is introduced. These require independent architectural review
and are **not** declared solved by this batch.

**Other gates:** global Mode B branch/mutation evidence, CI stable
results, installed Linux KDE/Windows and independent L10N-20
physical acceptance. No release tag, main promotion, R2 object
mutation, provider key, runner inventory or GitHub configuration
changed in this batch.

**Delivery policy:** one docs planning commit, one code+tests
commit and one docs checkpoint commit are sent in a single
fast-forward to `dev`; no intermediate runner-triggering push.
