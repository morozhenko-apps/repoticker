# Mode B: release artifact collection, canonical naming and verified manifest merge

Prepared parent `977b2691fef136849b3eac7378169e689ed0f0d1`; source baseline `a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Source: `scripts/release_assets.py` blob `e2a56854eec3579bf93206cd9193d32704c20b59`, 166 lines. Actual direct unit test source: `tests/test_release_assets.py` blob `5ad3e29ffd65e81ab32ceb2fc112bdc6182a8b04`, **5 Python unittest methods**. Additional workflow/source-contract suites: `tests/test_release_candidate_contract.py` (6 Python tests, blob `ea91f3a9b4acd57f0df24f21518d3af276ef4871`) and `tests/test_release_native_candidate_paths.py` (3 Python tests, blob `8e2eccfc0bece3f130b055e563c85319b7b77097`).

Mode B Stages 3–8 only. Existing Python unit tests execute real module functions with temporary files; workflow tests largely inspect source text. **No new test, build, release, artifact collection, upload or publication executed in this audit.**

## Existing executable direct `release_assets` assertions

| Existing Python test | Actual executed behavior and exact assertions |
| --- | --- |
| `test_artifact_names` | Real `canonical("1.2.3","linux",".deb")` -> `repoticker_1.2.3_amd64.deb`; Windows exe -> `RepoTicker-Setup-1.2.3-win-x64.exe` |
| `test_windows_collection_requires_whole_semver_source_token` | Real temporary Windows source candidate: `11.0.0`, `1.0.0.1`, `01.0.0` filenames rejected for requested `1.0.0`; exact `1.0.0` source accepted, exact copied bytes, SHA256 sidecar and part.json version verified |
| `test_windows_collection_rejects_ambiguous_exact_source_versions` | Two Windows installers with exact requested version -> ValueError and output directory does not exist, asserting failure **before copy** |
| `test_candidate_collection_rejects_noncanonical_requested_versions` | Requested empty, prefixed v, leading zero, extra version component and prerelease -> ValueError and no output directory |
| `test_merge_validates_all_platforms_and_bytes` | Actual temp manifest+dummy files for Linux/Windows/macOS successfully merged; Linux+Windows accepted without macOS; Linux alone rejected; corrupted DEB bytes rejected by checksum |

`test_release_candidate_contract.py` verifies that workflow uses current workspace version, exact source SHA receipt and does not publish on candidate builds; `test_release_native_candidate_paths.py` verifies changed source paths trigger unpublished OS candidate jobs. These tests **do not call** Python DEB extraction/identity checks or test the actual `merge` duplicate-path/schema-negative branches.

## Exact public function/method branch ledger

| Method | Independent executable decisions | E vs remaining |
| --- | --- | --- |
| `digest(path)` | Stream SHA256 in 1 MiB chunks, empty/exact chunk/remainder, read error | E small real file and copied artifact hash via tests; ? >1 MiB streamed read, byte changes beyond first chunk, unreadable/permission failure |
| `canonical(version,platform,ext)` | Four hardcoded suffix routes: deb/AppImage/exe/dmg, other suffix -> ValueError | E direct .deb/.exe; macOS and AppImage indirect through merge using generated expected filenames, but not direct unsupported suffix |
| `source_has_version(filename,version)` | Exact numeric token guarded on preceding/following digit/dot, not substring; accepted token plus surrounding legitimate punctuation | E 11.0.0/1.0.0.1/01.0.0 denial and exact match, ? unicode/numeric neighbors or multiple candidate tokens |
| `collect` version guard | Full SEMVER exact 0|nonzero-prefixed numeric components; malformed fails before filesystem changes | E five invalid version cases, ? huge components and platform key lookup |
| `collect` output preflight | If target exists AND nonempty => refuse; absent/empty permitted | E absent paths; ? nonempty target failure, permission denied and symlinked target |
| `collect` source discovery | For each required extension: recursive files, no symlink, exact version token, exclude any path whose component equals `debug`, exactly one qualifying candidate | E Windows zero/two/exact filename; ? symlink, debug path, folder vs file, Linux two required extensions and duplicate symlink edge |
| `collect` size guard | 0 < size < 350 MiB; zero/exact cap/above cap fail | Tests use small nonempty Windows source; ? zero/max/max-1 file without allocating huge memory (sparse file) |
| `collect` DEB metadata | `dpkg-deb -f` exact Package, Version, Architecture and Depends substring `libgtk-layer-shell0`; command errors propagate | No direct `test_release_assets.py` fixture for a real DEB metadata mismatch; OS candidate build external |
| `collect` DEB archive content | Extract **untrusted archive without executing it** to a new TemporaryDirectory, require `usr/bin/repoticker` and `usr/share/applications/repoticker.desktop`, exact Name field and one Exec target `repoticker` or `/usr/bin/repoticker` | S source, ? malformed DEB, symlinked extracted executable/desktop launcher, command quoting and extra/duplicate Exec |
| `collect` copy/receipt | Create output, copy exact bytes, write canonical sha256 line, add path/size/content type, emit platform `part.json` after all extensions | E Windows copy/checksum/receipt; ? failed copy, sidecar write/part.json failure and Linux two-extension partial completion |
| `merge` manifest read | JSON parse/missing fields, supported platform, unique platform, exact version equality | E valid three and two platforms, one missing, ? malformed JSON, duplicate manifest/platform, mismatched version, unrecognized platform |
| `merge` extension-set verification | `{Path(v["path"]).suffix for v in files}` must equal platform required extension set | E proper generated list; ? extra extension, missing type, **duplicated extension entries** when set equality masks duplicate count |
| `merge` path trust | Relative path exactly `platform/filename`, no absolute path or nested/other platform, local file at manifest parent + filename | E valid shape; ? traversal `../`, alternative path component, extra metadata and symbolic local file |
| `merge` bytes | Require local regular file, exact recorded size, exact SHA256 of current bytes, then map into catalog by relative path | E tampered bytes fail; ? mismatched size, symlink and duplicate/overwritten catalog key |
| `merge` required platforms | Linux+Windows both needed, macOS optional | E two/three success and Linux-only failure |
| `merge` output | Write schema=1, product=RepoTicker, requested version, fixed download base and catalog entries | E JSON output product; ? write failure should not overwrite prior authoritative manifest, parent missing |
| `main` CLI | Subcommands required, collect/merge flags required; catch ValueError/OSError/CalledProcessError -> exit(1) and diagnostic | Unit import bypasses CLI; ? invalid args, extraction error, redacted external process error and exit code |

## Safety boundary observations, **not confirmed defects**

- **RA1 partial collection hypothesis:** `collect` copies and writes a receipt for each extension **before checking the next**. With valid DEB but missing AppImage, it can leave a nonempty Linux output directory after throwing. Existing tests only prove no output on invalid version or ambiguous Windows single-extension selection. Characterize this via a deterministic temp fixture and decide whether cleanup is required by release candidate contract; do not silently claim atomic collect.
- **RA2 duplicate manifest entry hypothesis:** `merge` checks the **set of extensions**, not the number/uniqueness of manifest file entries; duplicate paths with equal extension may pass type check and overwrite the same catalog key. Whether this creates a trust or version provenance failure requires an exact fixture plus comparison to signed manifest contract. Do not introduce new acceptance/format rules without reviewing the public release schema.
- **RA3 receipt schema:** `merge` verifies recorded paths, sizes and SHA, but does not independently check `contentType` against `MIMES` or demand canonical target filenames. The download publisher's downstream checks may constrain this. Treat as an incomplete cross-module trust analysis, not an exploitation claim.
- **RA4 symlink/data integrity:** `collect` rejects symlink source files. `merge` uses `is_file` on a manifest-referenced local file which follows symlinks; trust assumptions differ. Determine whether parts are supplied exclusively by trusted internal CI jobs before classifying as a security defect.

## Positive / N1–N12

| Class | Status | Missing concrete outcome |
| --- | --- | --- |
| Positive | E partial | Exact Windows collect/receipt and multi-platform merge; actual Linux DEB verified export pending |
| N1 | E partial | Bad SemVer, ambiguous names, corrupted bytes; invalid DEB/archive/schema/path |
| N2 | E partial | Zero/two Windows candidates; zero/350 MiB boundary, multi-chunk hashing |
| N3 | NA | No external HTTP in these functions; subprocess/disk errors are N12 |
| N4 | E partial | Two platform merge and repeated canonicalization; re-run collect on nonempty target |
| N5 | ? | Source file replaced between discovery/hash, conflicting candidate jobs and shared output path |
| N6 | E partial | Missing platform/ambiguous candidates; wrong metadata/part JSON schema and older artifacts |
| N7 | E partial | Exact source version and canonical output; symlinked merge input/cross-directory path |
| N8 | NA | Version string lexical parsing, not date/time |
| N9 | OS | Native DEB/AppImage/NSIS installation and file manager; no UI in this module |
| N10 | ? | CLI error may include untrusted archive filenames; no secrets expected from artifacts |
| N11 | NA | No paid subscription |
| N12 | E partial | Local file checksums; partial output on failed copy/extraction/manifest write and disk-full |

## Stage 9 precise cases after global Stage 3–8

- RA1: build small actual DEB fixture with untrusted wrong Package/Version/Arch/Depends, missing executable/launcher, duplicate Exec, extract failure; assert no execution and deterministic failure. Use genuine dpkg-deb subprocess or external process adapter, not an alternate implementation of checks.
- RA2: Linux bundle with valid .deb plus intentionally missing AppImage and sidecar/file-write failure; assert exact output state after failure and compare with approved "candidate transaction" contract before any cleanup fix.
- RA3: merge malformed part JSON, duplicate platform/path/extension, bad size, wrong type, symlink, traversal and noncanonical relative names; preserve no published pointer and no arbitrary path read.
- RA4: 1 MiB−1 / 1 MiB / 1 MiB+1 chunk hashing and sparse 350 MiB threshold, ensure no copied invalid artifact.
- RA5: Python CLI invalid flags and subprocess failures with returned status 1 and no candidate promotion; real Linux and Windows OS candidate acceptance remains separate.

Mutants: weaken whole token, allow symlink, accept multiple candidates, omit DEB metadata/executable checks, skip SHA comparison, require macOS prematurely, accept one platform, drop version equality, overwrite catalog collisions, claim output complete before last extension. Count only failing executable assertions as kills.

No production, tests, CI, release pointers, tags, signing keys or external artifacts were modified.
