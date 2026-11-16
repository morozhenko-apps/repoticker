# Mode B: non-function production entrypoints and static data

Baseline source `a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Nine files have no named userland function in lexical inventory; that is **not missing scope**. Five are static locale dictionaries, four are executable shell/PowerShell entrypoints.

Evidence legend: `E_PARTIAL` = real command executed with assertions; `E_CANDIDATE` = consumer/key-parity tests require full inspection; `S_OS` = syntax/source contract only, real native/CLI behavior not proven.

| Artifact | Testable subject | Branch / negative / privacy obligations | Existing candidate | Evidence | Gap |
| --- | --- | --- | --- | --- | --- |
| apps/desktop/ui/locale-auth.mjs | Pure immutable AUTH_TERMS dictionary | All 20 locale keys, placeholders, auth/device codes not translated or exposed | localization-20.test.mjs; locale-errors.test.mjs; settings-github-confirm.test.mjs | E_CANDIDATE | No executable entrypoint branches; validations occur in consuming controllers. Verify each exact key/placeholder and RTL presentation. |
| apps/desktop/ui/locale-card.mjs | Pure immutable CARD_TERMS dictionary | 20 locales, placeholders, clean/dirty/unknown semantics, safe Git verbs | localization-20.test.mjs; card-i18n.test.mjs | E_CANDIDATE | No executable entrypoint branches; check complete key and dynamic consumer mapping. |
| apps/desktop/ui/locale-extended.mjs | Pure immutable EXTENDED_TERMS dictionary | All 20 translations and no untranslated/extra status strings | localization-20.test.mjs | E_CANDIDATE | Consumer-facing plural, RTL and rendering remains separate. |
| apps/desktop/ui/locale-surface.mjs | Pure immutable SURFACE_TERMS dictionary | 20 detached surface translations; billing failure and unknown captions | surface-i18n.test.mjs; localization-20.test.mjs | E_CANDIDATE | No native rendered accessibility guarantee from dictionary shape. |
| apps/desktop/ui/locale-workflow.mjs | Pure immutable WORKFLOW_TERMS dictionary | Complete localized Git/CI status keys, avoid private provider string substitution | localization-20.test.mjs; locale-errors.test.mjs | E_CANDIDATE | Source dictionary has no dynamic `if`; producer-side redaction must be tested elsewhere. |
| scripts/accept_autostart_linux.sh | Executable top-level Bash acceptance command | XDG autostart missing vs existing; 0/multiple .desktop; legacy Exec warning; enabled/disabled flags; no full path/secret logging | autostart-integration.test.mjs (structural only) | S_OS | Needs actual env-faked shell/grep/ps integration with tmp HOME; physical KDE login launch still OS. |
| scripts/accept_autostart_windows.ps1 | Executable top-level PowerShell acceptance command | HKCU Run key missing/present, stale legacy value, zero/one/multiple Start Menu .lnk; no absolute paths/PII | autostart-integration.test.mjs (structural only) | S_OS | Needs Windows PowerShell command/registry adapter tests or physical host acceptance. |
| scripts/ci-pr-scope.sh | Executable top-level CI admission Bash command | PR merge two parents; docs-only vs source; rename both ways; delete; weird newline names; missing GITHUB_OUTPUT; unsupported event; explicit push/dispatch always required | tests/test_ci_policy.py: test_GivenRealGitChanges_WhenClassified_ThenOnlyKnownProseSkipsAndBothRenameSidesCount; test_GivenMissingMetadataOrExplicitDispatch_WhenClassified_ThenNoFalseSkipIsProduced | E_PARTIAL | Inspected Python tests launch real Bash script in a temporary real Git repository: 14 cases with exact required=true/false; unsupported events and missing output fail. Duplicate PR input variations not exhaustively enumerated. |
| scripts/install_qa_linux.sh | Executable top-level Bash package installer/launcher | wrong argc/run SHA, missing command, legacy package, failed CI run, wrong SOURCE_SHA, invalid checksum, wrong DEB fields, running app, reinstall byte comparison, exec only verified binary | tests/linux-qa-installer.test.mjs (bash -n and source contracts); tests/test_release_native_candidate_paths.py | S_OS | Existing tests run Bash parser and regex, NOT install flow. Need contract fake CLI and temp artifact fixture, physical DEB/AppImage acceptance after final SHA. |

## Verified exceptional case: CI admission script

`tests/test_ci_policy.py` starts a **real git repository** and executes `scripts/ci-pr-scope.sh` in a subprocess. It validates docs-only vs executable changes, rename both directions, deletes, hidden/unusual/newline paths, empty or unsupported event and missing GITHUB_OUTPUT. This is behavioral integration evidence, not a regex check, and must not be duplicated merely because `ci-pr-scope.sh` has no named functions.

## Remaining case obligations

- `install_qa_linux.sh`: requires mock-by-contract for `gh`, `dpkg-deb`, `apt`, `cmp`, filesystem and `pgrep`; never allow an installer test to run real `sudo apt` or alter the QA host. Reject checksum and source mismatch before any privileged mutation.
- Linux/Windows autostart acceptance scripts: require missing/disabled/legacy/autostart variants without printing username/full Exec path, plus one real platform smoke per OS.
- Immutable locale dictionaries: structural parity and correct consumer projections (all 20) are applicable; N3/N12 should be assigned to IO/storage consumers, not fake tests on JSON strings.
- No case is declared completed solely because the script is executable. Stage 4 expression/return mapping and Stage 8 assertion links remain open.

