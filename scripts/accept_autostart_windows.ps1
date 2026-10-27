# Read-only login-launch acceptance; safe for unprivileged PowerShell.
# Does not print registry value commands, absolute paths or user names.
$ErrorActionPreference = "Stop"
Write-Output "RepoTicker login-launch acceptance (Windows)"
Write-Output ("UTC: " + (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
$names = @("repo-ticker", "RepoTicker", "repoticker", "repoticker-desktop")
$processes = @(Get-Process | Where-Object { $names -contains $_.ProcessName })
Write-Output ("RepoTicker process count: " + $processes.Count)
$runPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
if (Test-Path $runPath) {
  $values = (Get-ItemProperty -Path $runPath).PSObject.Properties |
    Where-Object { $_.Name -notlike "PS*" -and (
        $_.Name -match "(?i)repoticker|repo.ticker" -or
        [string]$_.Value -match "(?i)repoticker|repo-ticker") }
  Write-Output ("Current-user startup Run values: " + @($values).Count)
  $values | ForEach-Object { Write-Output ("Startup value name: " + $_.Name) }
} else {
  Write-Output "Current-user startup Run values: 0"
}
$startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
$shortcuts = @(Get-ChildItem -Path $startup -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match "(?i)repoticker|repo.ticker" })
Write-Output ("Current-user Startup folder matching files: " + $shortcuts.Count)
Write-Output "Check Settings checkbox and real sign-in separately."
