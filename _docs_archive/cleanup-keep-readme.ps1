<#
    cleanup-keep-readme.ps1
    Safely removes all files and folders in the current directory except README.md (and optionally .git).

    Usage:
      # Dry run (default): lists items that would be removed
      powershell -ExecutionPolicy Bypass -File .\cleanup-keep-readme.ps1

      # Execute deletion (interactive confirmation):
      powershell -ExecutionPolicy Bypass -File .\cleanup-keep-readme.ps1 -Execute

      # Execute deletion and force (no confirmation):
      powershell -ExecutionPolicy Bypass -File .\cleanup-keep-readme.ps1 -Execute -Force

      # Remove .git as well (dangerous):
      powershell -ExecutionPolicy Bypass -File .\cleanup-keep-readme.ps1 -Execute -RemoveGit -Force

#>
param(
    [switch]$Execute,
    [switch]$Force,
    [switch]$RemoveGit
)

$base = Get-Location
$keep = @('README.md')
if (-not $RemoveGit) { $keep += '.git' }

Write-Host "Repository cleanup helper" -ForegroundColor Cyan
Write-Host "Working directory: $($base.Path)"
Write-Host "Keep list: $($keep -join ', ')"
Write-Host "Mode: " -NoNewline
if ($Execute) { Write-Host "Execute" -ForegroundColor Yellow } else { Write-Host "Dry-run" -ForegroundColor Green }

# Collect items to remove
$items = Get-ChildItem -Force -LiteralPath $base.Path | Where-Object {
    $name = $_.Name
    # skip the keep list
    if ($keep -contains $name) { return $false }
    # skip current and parent
    if ($name -in @('.', '..')) { return $false }
    return $true
}

if (-not $items) {
    Write-Host "Nothing to remove. Keep list covers all items." -ForegroundColor Green
    return
}

Write-Host "The following items would be removed:" -ForegroundColor Red
$items | ForEach-Object { Write-Host " - " $_.Name }

if (-not $Execute) {
    Write-Host "Dry-run complete. No files were changed." -ForegroundColor Green
    return
}

# Execution path
if (-not $Force) {
    $resp = Read-Host "Proceed with deletion of the above items? (Y/N)"
    if ($resp.ToUpper() -ne 'Y') {
        Write-Host "Aborting — no changes made." -ForegroundColor Yellow
        return
    }
}

# Delete each item
foreach ($it in $items) {
    try {
        $path = $it.FullName
        if ($it.PSIsContainer) {
            Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction Stop
            Write-Host "Removed folder: $($it.Name)" -ForegroundColor Gray
        } else {
            Remove-Item -LiteralPath $path -Force -ErrorAction Stop
            Write-Host "Removed file: $($it.Name)" -ForegroundColor Gray
        }
    } catch {
        Write-Warning "Failed to remove $($it.Name): $($_.Exception.Message)"
    }
}

# Optionally remove the script itself (this file)
$me = $MyInvocation.MyCommand.Path
if ($me -and (Test-Path $me)) {
    try {
        Remove-Item -LiteralPath $me -Force -ErrorAction SilentlyContinue
    } catch {}
}

Write-Host "Cleanup complete." -ForegroundColor Green

