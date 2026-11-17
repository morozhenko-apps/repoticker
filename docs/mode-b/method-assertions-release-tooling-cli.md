# Mode B: release tooling script and method assertion receipts

Source-equivalent baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; audit parent `bd216ec77542d3243d9db17e6d1e8db3b67af197`. This is documentation, not test execution or permission to publish.

## Corrected Stage 3 inventory arithmetic

Physical Markdown row count: **717**, previously claimed **708**. Before classification, 688 rows were tagged and **29** were `?` (not 20); this pass tags all 29. The historical register at `72f399a16fe6a869796210c31e99226d6d8a3c43` already had 716 rendered rows: 707 numbered candidates plus **nine `—` placeholder artifacts** (five locale dictionaries, four top-level scripts). Adding the Wayland callback gives 708 numbered candidates and 717 total rows. There is **no unexplained nine-row provenance discrepancy**. **717/717 is only a classified lexical candidate register**, not 717 executable methods, complete AST discovery, test coverage, or Stage 3 signoff.

## Source-true method and test evidence

| Source | Classification | Existing real assertion and remaining Stage 9 obligations |
| --- | --- | --- |
| `apt_repository.py` | `invoke`, `sha256`, `package_field` I_PARTIAL; `assemble`, `verify` E_PARTIAL; `main` P_CLI | `tests/test_release_apt_integration.py` calls actual assembly + verify with temporary DEB/GPG and isolated apt-get, asserts catalog and tampered InRelease rejection; skip-conditional on installed Debian tools. Missing external command failures, wrong deps/metadata, fingerprint length, 0/1 flat archive, CLI args |
| `cleanup-published-artifacts.mjs` | `isSha`, `listRunArtifacts` I_PARTIAL; `validateR2Receipt`, `deletePublishedArtifacts` E_PARTIAL; `main` P_CLI | `tests/artifact-retention.test.mjs` calls actual receipt validator and cleanup with fake network request, proves no premature DELETE, correct provenance, redacted 2-archive removal, post-delete readback and idempotence. Missing page 10/11 cap, late listing failure, 204 failure and malformed CLI env/args |
| `release_assets.py` | `digest`, `source_has_version` I_PARTIAL; `canonical`, `collect`, `merge` E_PARTIAL; `main` P_CLI | `tests/test_release_assets.py` directly asserts canonical filenames, exact version token, ambiguous Windows source, wrong semver, checksums and merge platform requirements. Missing Linux DEB Exec spoofing, symlink and output permission cases |
| `release_version.py` | `versions`, `bump` E_PARTIAL; `main` I_PARTIAL | `tests/test_release_version.py` calls actual versions/bump on isolated fixture; launches real CLI --check-tag good/bad. Missing malformed marker and partial-write characterization |
| `verify_signing_key.py` | `validate` E_PARTIAL; `main` P_CLI | `tests/test_release_signing.py` checks real subkey-only inventory, full-primary rejection, missing signing secret and mismatch. Missing 39/40/41 fingerprints, malformed GPG lines, CLI failure/no-leak |
| `verify_signing_passphrase.sh` | `cleanup` I_PARTIAL | `tests/test_release_provisioning.py` runs actual script with disposable GPG for correct/wrong passphrase and corrupt key, thereby invoking trap indirectly. Trap cleanup/agent teardown and interruption are not directly asserted |
| `provision_apt_key.sh` | `cleanup_signing_validation` P_SHELL | Source contract orders validation before gh secret set; no real key provisioning and no captured EXIT trap result. Test with stub external tools, disposable GPG/Drive mount fixture, never user's key or GitHub secrets |
| `accept_autostart_linux.sh` | SCRIPT_ENTRY | Top-level read-only Bash, needs controlled XDG home/ps/grep fixture plus physical KDE login |
| `accept_autostart_windows.ps1` | SCRIPT_ENTRY | Top-level read-only PowerShell, needs controlled registry/process fixture and real Windows acceptance |
| `ci-pr-scope.sh` | SCRIPT_ENTRY | Top-level CI event/merge-diff guard, needs isolated Git 2-parent merge + docs-only/non-doc tests and invalid GITHUB_OUTPUT/event |
| `install_qa_linux.sh` | SCRIPT_ENTRY | `tests/linux-qa-installer.test.mjs` runs `bash -n`, source contract assertions only. Runtime pre-sudo provenance, install and byte comparison not executed; fixture only with fake sudo/apt or disposable namespace |
| `tools/import_icon.py` | `main` P_CLI | Image conversion CLI needs isolated destination tree, 31/32px square/non-square, corrupt source, permission denial and byte/pixel parity. No direct asserted execution inspected |

## Stage 4–8 scenarios and release trust

Positive/N1/N2: exact versions, marker synchronization, 39/40/41 fingerprint, 0/1/100/101 artifacts, 350 MiB boundary, bad URLs/receipt fields, APT index and checksum checks. N3/N12: missing external executables and permission-denied folders, failing GitHub listing, failed signing/passphrase, invalid output. N4/N5: idempotent cleanup and concurrent artifact publication/deletion, interrupted version update, trap teardown. N6/N7/N10: reject foreign SHA/paths, never leak full private keys or log secrets; keep all hosted R2/GitHub Secrets operations outside tests. N8: UTC Release date and deterministic gzip metadata. N9: OS login/Quit/failed installation/interrupt. N11: NA.

Each missing outcome must acquire a traceable direct assertion (E) or remain planned (P)/physical (OS). Avoid claiming a script is covered from regex alone. Stage 3–8 remain PARTIAL despite zero visible `?`. The row-count discrepancy is resolved; AST-aware exhaustive method discovery remains an audit blocker. No source, tests, CI or distribution side effects performed.
