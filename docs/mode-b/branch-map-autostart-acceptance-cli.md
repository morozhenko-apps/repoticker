# Mode B: read-only Linux/Windows login-launch acceptance CLI and privacy guards

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; branch `audit/mode-b-testing` parent `fb98f82e7944cf78b18707d5b2c91671cbe4bdf4`.
Source `scripts/accept_autostart_linux.sh` blob `941b887b7895dc66adb657a105aeb3fe4032ddfe` (40 source lines), `scripts/accept_autostart_windows.ps1` blob `4d13a6afd80e8d9ed946db144d6bb3f8ccd94209` (29 source lines). `tests/autostart-integration.test.mjs` blob `b61f01dceebc7daf53941d986597fade071f6a46` has **three Node tests**; the test named `autostart acceptance warns on legacy executable after package rename` reads both shell sources and only asserts regexes on their text. It does **not** call `bash`/PowerShell to exercise either script. The remaining two tests check native autostart registration source and Settings localization/markup; `settingsText("ru",...)` is executed for two translations, unrelated to shell acceptance execution.

The native `autostart.rs` Tauri methods and their actual JS fake-IPC assertions are already mapped separately in `branch-map-autostart-startup.md`. The present map covers the **read-only operator acceptance scripts**, not registration/rollback.

## Linux script: every independently observable branch

| Conditional or operation | Exact source behavior | Evidence / direct test still required |
| --- | --- | --- |
| `set -euo pipefail` and fixed heading | Prints UTC, XDG_CURRENT_DESKTOP and XDG_SESSION_TYPE with "unknown" default | S; ? missing/present env, malformed UTF-8 desktop value and privacy of diagnostic |
| `ps -u "$(id -u)" -o comm=` | `awk` counts only five exact process-name alternatives (including truncated `repoticker-des` and `repoticker-desk`); process count integer | S; ? 0/1/2 exact names, near matches rejected, command fails |
| autostart dir selection | `XDG_CONFIG_HOME` if set, else `$HOME/.config`, append /autostart; no directory -> count 0 | S; ? XDG unset/set, directory absence, unexpanded path |
| desktop loop | `shopt -s nullglob`, loop only `*.desktop` in selected folder; file with matched Name/Exec/X-GNOME-Autostart-enabled counted; unrelated files ignored | S; ? 0, 1, >1, malformed .desktop, filenames containing spaces/newlines |
| stale executable | For a counted entry, if Exec includes `repoticker-desktop` or `repo-ticker`, print fixed warning | S static regex, ? real grep against legacy entry, valid modern no warning |
| enabled/disabled | If `Hidden=true` or `X-GNOME-Autostart-enabled=false`, print disabled/hidden; otherwise enabled/unspecified | S; ? case variants, both flags, malformed lines, whitespace |
| privacy | Prints **basename** of matched .desktop file; never prints the `Exec` value; uses name+counts not full paths | S source; ? a secret-looking Exec path injected into temp fixture must not appear in stdout/stderr |
| conclusion | Print fixed instruction: process/entry counts alone do not prove real sign-in or package removal | S, physical reboot/login remains OS |

## Windows PowerShell: every independently observable branch

| Conditional/operation | Exact source behavior | Evidence / required test |
| --- | --- | --- |
| `$ErrorActionPreference="Stop"` | Command error propagates rather than creating fake successful diagnostics | S; ? missing APPDATA, registry denied, PowerShell command failure |
| UTC / current process | Prints UTC and count among four exact process names from `Get-Process`; never prints PID or commandline | S; ? 0/1/multiple, near names and case matching |
| HKCU Run key | If `Test-Path` registry key true: read Get-ItemProperty PSObject.Properties; filter metadata `PS*`, property name regex or value contains RepoTicker patterns | S; ? key absent/present, unrelated values and named matching values |
| missing HKCU Run | If Test-Path false, print exactly 0 values | S; ? real script execution with injected safe registry provider |
| stale legacy Run value | Matching value contains `repoticker-desktop(.exe)?` -> warning, but do not print full command or registry data | S; ? safe legacy sample, modern no warning, path with mock secret marker must not leak |
| Startup folder | Under `$env:APPDATA/Microsoft/Windows/Start Menu/Programs/Startup`, count matching files by filename, suppress ordinary missing-folder errors | S; ? folder absent, unrelated/one/multiple, permission exception |
| final notice | Requires user to check Settings checkbox and **real login** separately | S; no test replaces actual Windows login behavior |

## Cross-OS privacy and product-invariant notes

1. These scripts are **observation-only** and cannot prove that OS autostart registration succeeded or that application launched after actual login. A diagnostic count of 1 may correspond to stale legacy executable or disabled entry, which must be separately reported.
2. Linux's process-name alternatives are truncated intentionally for process listings; the Windows exact process-name list differs. Their equivalence is a UI diagnostic contract, **not** an assertion that process-count output matches across operating systems.
3. User-controlled .desktop **basename** is displayed; source deliberately omits full Exec strings but an operator-created filename itself can contain personal information. No observed exposure is claimed. Test fake filenames with sensitive placeholders and agree masking requirements before changing semantics.
4. The Windows program reads registry values but never writes them. Direct tests must not modify the real HKCU Run key or user's Startup folder. Use isolated PowerShell provider mocks/temp APPDATA or disposable Windows instance.
5. No test runner should import real host process lists/registry into issue output; only redacted fixture values are appropriate.

## Positive / N1–N12

| Class | Observed proof / next requirement |
| --- | --- |
| Positive | S static tests for warning strings; actual CLI positive path ? |
| N1 | ? malformed/missing env, registry error and invalid .desktop |
| N2 | ? 0/1/2 entries, missing/duplicate flags, multiple processes |
| N3 | NA network not used |
| N4 | ? repeated read before/after toggle, no mutations by scripts |
| N5 | ? entry creation/removal during enumeration, actual startup race is OS |
| N6 | ? stale legacy name and malformed entry data |
| N7 | S no privileged install or registry writes, ? safe external provider handling |
| N8 | ? UTC formatting and environment locale/DST; scripts do not schedule actions |
| N9 | OS actual login, shutdown, duplicate launches |
| N10 | S suppress full Exec/registry value, ? leaked basename or provider error |
| N11 | NA |
| N12 | ? inaccessible file/registry and missing ps/PowerShell commands |

## Deterministic Stage 9 planned tests

- AA-L1: invoke actual `bash scripts/accept_autostart_linux.sh` with temp HOME/XDG_CONFIG_HOME, fake deterministic `id`/`ps`/`date` PATH helpers, and real local .desktop fixtures; assert 0/1/multiple counts and fixed warnings with no full Exec path.
- AA-L2: disabled/hidden, current vs stale executable, unrelated .desktop, filename with whitespace; never access actual ~/.config/autostart.
- AA-W1: execute real PowerShell script in a Windows disposable context with synthetic Get-Process/Get-ItemProperty/Test-Path/Get-ChildItem and temp APPDATA; compare key missing, present, stale, Start Menu entries and expected stdout.
- AA-P1: string canary for secret-like registry Exec and .desktop paths, assert no raw command/value in output; confirm user-readable warning.
- AA-OS: owner performs manual KDE/Windows login-cycle acceptance of autostart plugin registration and this script's observation; not replaceable by unit tests.

Potential mutations: print raw Exec, ignore Hidden=true, count unrelated startup entries, fail to warn on legacy command, treat absent Run key as present, omit process count, use wrong XDG_CONFIG_HOME root. Existing regex tests do not kill these runtime mutations. Global Mode B Stage 3–8 PARTIAL; no OS registration, test execution, source, CI or app changed.
