# RepoTicker Windows physical acceptance: unpublished v0.2 candidate

**Recorded:** 2026-10-25. **Mode:** Gate 2/3 physical QA, no product release.
A Windows test machine is available per owner confirmation. Real desktop
sign-in, keyring, tray and installer behavior have **not** yet been tested.
This checklist contributes to [the same five-row Gate 2 ledger](GATE_2_ACCEPTANCE.md),
not a new mandatory development gate.

## Candidate provenance

- CI workflow: https://github.com/morozhenko-apps/repoticker/actions/runs/40227612556
- Result: **SUCCESS**, both Linux and Windows jobs completed; artifacts uploaded.
- Source SHA: `40aff5ec3a68e3053bf881bae9dafc2030250b3e`.
- Windows artifact: `repoticker-acceptance-windows`, artifact ID `12612521927`.
- GitHub expiry: **2026-11-01 20:00 UTC** (download before expiry).
- Expected EXE: `RepoTicker-Setup-0.2.0-win-x64.exe`. **Unsigned**.
- The candidate declares `0.2.0`, the same version as the published stable;
  installing over a valuable production copy is **not** part of this plan.

## Read-only integrity gate

Download and extract the Windows artifact via the workflow **Artifacts**
section. Open PowerShell in its extracted directory; do not execute the
installer until the check below succeeds. PowerShell is included on Windows;
no Rust/Python/CI runner installation is required.

~~~powershell
$ErrorActionPreference = "Stop"
$sourceExpected = "40aff5ec3a68e3053bf881bae9dafc2030250b3e"
$installer = "RepoTicker-Setup-0.2.0-win-x64.exe"
$sourceActual = (Get-Content -LiteralPath ".\SOURCE_SHA.txt" -Raw).Trim()
if ($sourceActual -cne $sourceExpected) { throw "Wrong SOURCE_SHA" }

$line = (Get-Content -LiteralPath ".\$installer.sha256" -Raw).Trim()
$record = [regex]::Match($line, '^([a-fA-F0-9]{64})  (.+)$')
if (-not $record.Success) { throw "Invalid checksum record" }
if ($record.Groups[2].Value -cne $installer) { throw "Unexpected filename" }
$hash = (Get-FileHash -LiteralPath ".\$installer" -Algorithm SHA256).Hash
if ($hash -ine $record.Groups[1].Value) { throw "Checksum mismatch" }
Write-Output "PASS: source SHA and Windows installer checksum"
~~~

This proves integrity/provenance only, **not** publisher trust, malware
safety, physical startup or uninstall behavior. Do not install on failure.
Neither the command nor its expected successful output includes tokens,
repository names, private filesystem paths or the registry Exec value.

## One bounded Windows physical test session

Use a **test user/profile** and an expendable installation. Verify any
existing RepoTicker instance has been closed without interrupting other
desktop work. Do not manually edit the Run registry key or delete a stable
production installation. Use the read-only script
`scripts/accept_autostart_windows.ps1` from the same repository checkout
to capture sanitized snapshots at the following points.

1. **Fresh start:** install the candidate, launch once, verify one tray icon,
   initially hidden card and default unchecked **Launch at login**. Snapshot.
2. **Cancel:** check the box in Settings then press Cancel. Reopen Settings;
   the OS startup entry must remain absent, checkbox unchecked. Snapshot.
3. **Enable:** check the box and press OK. Exactly one user startup registration
   must exist; check process count and one registration. Snapshot.
4. **Login:** sign out of the **test user** and sign back in, with running
   workloads protected. Verify one tray process, card initially hidden,
   no automatic Fetch or Safe sync. Launch the same EXE manually and confirm
   no second tray process or forced focus. Snapshot.
5. **Disable:** uncheck and press OK. The user startup registration disappears;
   reopening Settings reflects OS state. Snapshot.
6. **Lifecycle (Gate 3, same session):** on the disposable installation only,
   test upgrade/reinstallation and uninstall with startup previously enabled.
   Check for stale startup pointers. Any surviving enabled entry is FAIL.
   Restore test-user settings and remove test-only installation afterwards.

For each failure, note expected/actual, timestamp (UTC), exact source SHA,
installer SHA256, OS build, and a screenshot or sanitized script output.
Do not record credentials, executable paths, registry commands, wallet data
or private repo names. Report PASS/FAIL/DEFER by scenario and roll the
result into **row 5** of [Gate 2](GATE_2_ACCEPTANCE.md).
Other four Gate 2 runtime checks use the parent ledger's existing scenarios.

**Limits:** This procedure does not assert that Windows acceptance occurred.
CI/connector access cannot sign in to the operator's Windows desktop.
No Git-core work or main/tag/release publication is authorized here.
