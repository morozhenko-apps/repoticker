# Mode B: signed flat APT snapshot, local DEB identity and readback verification

Baseline production `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Module `scripts/apt_repository.py`, blob `21d659168d836a2ae994257c5e25d13d5443acb0` (125 source lines). Prepared branch `audit/mode-b-testing`, parent `e8a689d76b44e6be9e5829b8ba61dd6bb6f227aa`.
Test evidence: `tests/test_release_apt_integration.py`, blob `bcb3366446f4f6bd88a1b6f85e75326db52c7170` (one test under an external Debian/GPG/APT tool availability skip); `tests/test_release_r2_contract.py` verifies lower-level index/catalog functions separately; `tests/test_release_provisioning.py` tests independent signing-subkey workflow. No tests or APT commands were executed in this audit continuation.

## Existing executable behavior established by actual test bodies

The sole integration test creates a minimal **real Debian archive** with `dpkg-deb --build` in a temporary directory, creates a temporary Ed25519 GPG key, calls the **real** `apt_repository.assemble` and `verify`, inspects the flat `Release`, `Packages`, `Packages.gz` and exactly six output files, and compares the copy of the DEB byte-for-byte with its input. Using an isolated `APT_CONFIG`, it runs real `apt-get update`, `apt-cache policy` and `apt-get download` against a local `file://` source and asserts candidate version and downloaded bytes. It then modifies the signed InRelease cleartext (Origin string) and asserts that `verify` rejects it via actual `gpgv`.

**Important:** the test class is `@unittest.skipUnless` for actual Debian/APT tools; a successful overall Python process does not by itself prove this test ran rather than skipped. No hosted APT publication is established.

## Method/branch-to-assertion map

| Source function | Independent outcomes and trust contract | E vs additional requirement |
| --- | --- | --- |
| `invoke` | Run exact external binary args, captured stdout, optional env/bytes, `check=True` failure throws | E real dpkg/gpgv on positive and tampered path; ? subprocess failure per stage, stderr privacy |
| `sha256` | 1 MiB chunked SHA256 of local file, read errors propagate | E `Release` generated signed checksums consumed and verified by R2 helpers; ? >1 MiB stream and late chunk mutation |
| `package_field` | `dpkg-deb -f` direct requested metadata; decode and strip, tool failures propagate | E real built DEB in happy test; ? missing/invalid package, changed UTF-8, forged field duplicate |
| `assemble`: input validation | DEB, GPG home, passphrase file exist; output directory absent or empty; Package=repoticker, Version=requested, Architecture=amd64; Depends contains libgtk-layer-shell0; 40-character fingerprint | E valid exact metadata path; ? each absent/wrong path and metadata branch, nonempty output, invalid fingerprint, symlinked path and whitespace |
| `assemble`: local copy/index | Create output; copy `repoticker_VERSION_amd64.deb`; call `dpkg-scanpackages` in flat root, require exactly one package stanza and expected filename | E real local DEB+index; ? zero/two stanzas, changed filename, `dpkg-scanpackages` fails after copy, partial snapshot handling |
| `assemble`: deterministic metadata | Write `Packages`, deterministic gzip (`mtime=0`, empty filename); UTC `Release` with two SHA256 entries and no Valid-Until; version/catalog mapping | E successful gpgv + APT read; ? two runs gzip byte repeat, Date UTC boundary, bad clock, gzip write failure |
| `assemble`: signing/key export | GPG loopback clearsign with SHA256 and dedicated fingerprint; export public keyring, reject empty output, then `verify` locally before returning | E actual temp signing and valid key export; ? bad passphrase, signer unavailable, gpg returns nonzero, no private key in output, empty keyring |
| `verify`: gpgv | Verify `InRelease` against supplied keyring; reject tampered signed cleartext | E actual changed Origin causes `subprocess.CalledProcessError`; ? wrong signer/keyring and revoked/expired key |
| `verify`: index digest/catalog | Execute `verify_signed_apt_indexes`; require exactly one `repoticker_*_amd64.deb`; validate Packages/Packages.gz against DEB via `verify_apt_package_catalog` | E valid full archive, R2 lower-level tests; ? zero/two packages, corrupt gzip/Packages, mismatched DEB after sign |
| `main`: CLI | Require all --deb/--out/--version/--gpg-home/--fingerprint/--passphrase-file, run assemble; errors do not silently return a successful receipt | E direct module only, CLI is not invoked by integration suite; ? flag error, missing input, output cleanup |

## Independent scenario interactions

- **Signed metadata × exact original DEB bytes × apt-get download:** E tested end-to-end on a local isolated APT source. Not evidence of a deployed repo or publication approval.
- **Signed Release × corrupted InRelease:** E tamper causes gpgv rejection, not an accepted apt-get package.
- **Missing dependency/wrong architecture × valid GPG key:** ? Failure should occur before package copying/signing and without a usable repo snapshot.
- **Signer failure × local output directory already created:** ? A partial `Packages`/`Release` can remain; production R2 publisher must never mistake local prepared files for a verified release. Do not assume an atomic local directory transaction.
- **Timestamp × gzip byte reproducibility:** gzip deterministic mtime is explicit; Release UTC timestamp intentionally changes. Compare gzip bytes separately from Release content, do not demand identical whole directory across different times.
- **Incorrect signing key × public readback:** local signature validation precedes R2. No R2 calls should be made from `apt_repository.assemble`.

## Positive and N1–N12

| Case | Evidence / open decision |
| --- | --- |
| Positive | E when toolchain available: real DEB, real GPG signature, real local APT update/download |
| N1 | ? invalid package/version/arch, dependencies, fingerprint, GPG export, index mismatch |
| N2 | E one DEB, ? none/two and boundary checks in flat catalog |
| N3 | NA: local subprocess; no network requirement for `file://` integration |
| N4 | ? repeated assemble must refuse nonempty output; idempotence belongs to publication layer |
| N5 | ? concurrent directories/signer processes, no shared mutable state assumed |
| N6 | E tampered InRelease, ? bad/legacy Packages, keyring changes and stale signatures |
| N7 | E exact package name/architecture, dedicated key and signed metadata; ? symlinks, missing authority |
| N8 | E UTC date used, ? clock rollback and signed metadata Date boundary without Valid-Until |
| N9 | NA |
| N10 | ? external process stderr and private passphrase file path must not enter public receipts |
| N11 | NA |
| N12 | E actual local signed files, ? disk-full/write failure/rollback and partial snapshot quarantine |

## Stage 9 / mutation obligations (after full Stages 3–8)

- AP1: per-field DEB metadata failures and missing signing inputs before any output; real dpkg fixture or external subprocess adapter.
- AP2: wrong GPG passphrase, failed `gpg --clearsign` and empty public key export; no success receipt, no public promotion.
- AP3: corrupt signed `Release`, hash mismatch, gzip mismatch, altered archived DEB, duplicated or missing package entry; actual `verify` must fail.
- AP4: simulate fault after copying DEB, after Packages write and after Release write; characterize incomplete directory before deciding local atomicity.
- AP5: test availability gate exposes SKIP versus RUN evidence, plus physical APT client behavior on supported Linux.
- Kill mutations: accept wrong Arch, omit dependency, disable fingerprint validation, accept two package stanzas, omit gzip hash, skip gpgv, skip catalog parity, report success despite failed signing.

No mutation or test was run. No production source, CI, secrets, release tags or deployment changed; global Mode B Stage 3–8 remains PARTIAL.
