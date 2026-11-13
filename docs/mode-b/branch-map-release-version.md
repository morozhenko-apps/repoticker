# Mode B: canonical release versions, three-file bump and strict tag admission

Prepared parent `2fe9308e42cf15e0cc71f63fa72c686c73bb0c60`; production baseline `a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Source `scripts/release_version.py` blob `d7837e2fd2851713b365880c226a4600df73cb9a`, 84? lines (use blob for stable identity).
Direct real Python module tests: `tests/test_release_version.py` blob `317a1af4da2e069e8b987c5c2fa5be9823f6f69c`, **3 unittest methods**, plus `tests/test_release_candidate_contract.py` source/manifest checks (6 tests), `tests/test_release_lockfile_contract.py` (2 static tests), and `tests/test_release_strict_contract.py` (3 static workflow tests).

Mode B Stage 3–8 assertion reconciliation only. No version file was edited, no test or CI ran, no tag or release was created.

## Existing direct behavior assertions

| Existing test | Exact executed checks |
| --- | --- |
| `test_repo_markers_agree` | Calls real `versions()` on checked-out three markers; requires MAJOR.MINOR.PATCH form; reads Tauri config and checks active bundle, Apache-2.0 license and presence of `icons/icon.icns` |
| `test_tag_validation_is_strict` | Invokes real Python CLI with matching current `v<version>` tag and asserts exit 0; invokes mismatched `v0.0.0-bad` and asserts nonzero |
| `test_bump_in_isolated_copy` | Uses three actual temporary files by patching only module path constants, calls real `bump` sequentially: `0.1.0` patch→`0.1.1`, minor→`0.2.0`, major→`1.0.0`; final `versions()` agrees |

The candidate/lockfile/strict tests assert Cargo.lock and workflow script wiring rather than executing branch failures in `bump`. They verify that intended release packaging is protected, not transactionality of the three-manifest writer.

## Every method and independent decision

| Method | Branches/inputs | Existing and missing evidence |
| --- | --- | --- |
| module constants `ROOT`, `CARGO`, `TAURI`, `SEMVER` | Exactly two known Cargo manifests plus Tauri JSON; zero/leading-zero SemVer restrictions; user does not choose arbitrary filesystem destination through CLI | E current paths and happy-case parser; ? malformed/extra-large SemVer components, mixed manifest formats |
| `versions` read | Read both TOML package.version plus Tauri JSON version; parse/read errors may propagate; same values and valid SemVer return string | E current repository passes; ? missing package/version field, missing file, invalid TOML/JSON, read-only or permission denied |
| `versions` validation | If disagreement **or** non-SemVer -> ValueError with fixed message, no mutation | E happy matching; ? mismatched Cargo↔Tauri, leading zeros, extra prerelease/metadata and absent values |
| `bump(which)` admission | Calls `versions()` first, maps only major/minor/patch, numeric increment of chosen segment and resets lower segments to zero | E sequential 0.1.0→0.1.1→0.2.0→1.0.0; ? overflow and invalid `which` via direct API (KeyError) |
| `bump` Cargo patch | For each Cargo file regex replaces first matching `^version = "<old>"`; if missing/unchanged -> ValueError | E two simple isolated files; ? package/nonpackage `version` field ambiguity, no matching line, double keys, unsupported whitespace |
| `bump` writes | Calls `path.write_text(updated)` separately for Cargo core and desktop; then updates Tauri JSON | E success; ? I/O failure during any individual write, unexpected halfway state, unchanged original formatting |
| `bump` final verification | Re-read all versions, `assert versions()==new`, return version | E three sequential happy bumps; ? failure after one or two writes, incomplete/semantically invalid Tauri document |
| `main` CLI parser | `--bump` exclusive with `--check-tag`, choice among major/minor/patch, no flags defaults to read current versions | E matching and wrong tag; ? dual flags, malformed args, unsupported bump choice, default output |
| `main` tag check | Exact `"v"+current`, mismatch ValueError and exit(1), no Git tag creation | E one matching and one mismatched case; ? uppercase V, leading zero, injection-like strings and whitespace |
| `main` error handler | Only `ValueError` caught for fixed status+message; `OSError`, TOML/JSON exceptions, KeyError or failed assertion propagate nonzero without this message | Source behavior; ? exact exit code/message on invalid source/read/parse and separate public error policy |

## Required cross-module invariants and observations

- Three version markers must remain synchronized before any release candidate is tagged; `test_release_candidate_contract` also checks Cargo.lock versions match both packages and source version.
- Candidate builds on `dev` are unpublished; protected release workflow validates matching `main` commit and `vMAJOR.MINOR.PATCH` tag before publication. The version script does not create tags or publish.
- **RV1 partial-write hypothesis:** `bump` writes Cargo core, Cargo desktop, then Tauri sequentially. If second or third write fails, earlier files have already changed; the current code contains no explicit rollback or staging. Existing test only exercises all three successful writes and does not establish transactional behavior. A deterministic denied-second-write fixture should characterize exact bytes left on disk before deciding whether release versioning requires atomic multi-file preflight/staging/rollback. **No defect reproduction or production fix claimed.**
- **RV2 possible regex association:** `PACKAGE_VERSION` finds the first standalone `version = "..." ` line in each whole Cargo.toml, not explicitly a parsed `[package]` section anchor. Current manifests are presumed valid and tested, but a synthetic TOML with `version` preceding `[package]` could cause mismatch or unexpected substitution. Characterize via real method with temporary file before classifying.
- **RV3 CLI error expectations:** the handler catches only ValueError; real unreadable/invalid JSON may give a traceback. This is not automatically a credential leak (input paths are fixed), but error user experience should be checked under packaging policy.

## Positive / N1–N12

| Class | Status | Required independent outcome |
| --- | --- | --- |
| Positive | E partial | Three synchronized versions, correct patch/minor/major bumps and matching tag |
| N1 | E partial | Wrong tag; mismatched/invalid SemVer, broken TOML/JSON and missing keys |
| N2 | E partial | 0.1.0, 1.0.0, major/minor/patch; very large components |
| N3 | NA | No network/service |
| N4 | E happy / ? failure | Repeated bumps are intentionally increments; failed bump rerun must not silently corrupt prior versions |
| N5 | ? | Concurrent two bump processes, tagged release simultaneously changing source |
| N6 | E current config / ? | Missing/invalid/legacy manifest, drift from Cargo.lock |
| N7 | E source route | Fixed manifest paths, strict tag matches; no arbitrary path via CLI |
| N8 | NA | SemVer numeric identity, no timezones/clock |
| N9 | NA | No GUI runtime |
| N10 | ? | File path/exception detail exposure from parse failures; no secret in normal input |
| N11 | NA | No paid entitlement |
| N12 | ? | Multi-file partial write, filesystem permission failures and recovery |

## Stage 9 exact new tests and mutation review

- RV1: bad TOML/JSON, missing version, inconsistent three files, leading zero and prerelease, assert error **before any write**.
- RV2: patch/minor/major independent fresh copies, 0→1 carry, upper large numbers and source file formatting; assert exact canonical three-version agreement and no unrelated manifest fields touched.
- RV3: inject controlled failure at second Cargo write and Tauri write via external filesystem adapter (or real permission-denied controlled temp files); record exact original/new file bytes and authorize any rollback policy change before implementing.
- RV4: synthetic Cargo.toml with other TOML table version before `[package]`; verify precise package update and contract; use genuine `tomllib` read.
- RV5: CLI wrong/missing/mutually exclusive flags and unexpected read errors, protect no tags/published pointers; integration with package provenance/source SHA only.
- Mutants: relax SemVer, skip one source, allow mismatched tag, update one Cargo only, omit final verification, wrongly increment/reset semver, match unrelated version field or report success after failed write. Assertions must fail under real mutation execution, not assumption.

No source, tests, CI workflow, tags or OS files altered. Global Stage 3–8 remains PARTIAL.
