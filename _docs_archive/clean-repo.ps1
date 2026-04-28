<#
Run this script locally to remove common build artifacts and unwanted files
before committing and pushing to GitHub. It prompts for confirmation before deleting.

Usage:
  Open PowerShell in the repo root and run:
    .\clean-repo.ps1
#>

param(
  [switch]$Force
)

Write-Host "This will remove common build artifacts (safe for repo upload)."
if (-not $Force) {
  $confirm = Read-Host "Proceed to delete .next, out, dist, build, .vercel, node_modules, and temporary files? (y/n)"
  if ($confirm -ne 'y') {
    Write-Host "Aborted by user. No files were removed."
    exit 0
  }
} else {
  Write-Host "Force mode: proceeding without confirmation."
}

$pathsToRemove = @(
  '.next',
  'out',
  'dist',
  'build',
  '.vercel',
  '.vercel_build_output',
  'node_modules',
  '.DS_Store',
  'Thumbs.db'
)

foreach ($p in $pathsToRemove) {
  $full = Join-Path -Path (Get-Location) -ChildPath $p
  if (Test-Path $full) {
    try {
      Remove-Item -LiteralPath $full -Recurse -Force -ErrorAction Stop
      Write-Host "Removed: $p"
    } catch {
      Write-Warning ("Could not remove {0}: {1}" -f $p, $_)
    }
  }
}

Write-Host "Cleanup complete. You can now run `git status` and continue with commit/push steps."
