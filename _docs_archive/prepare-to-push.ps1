param(
  [string]$RemoteUrl = "https://github.com/sarwansai8/Team.git",
  [string]$CommitMessage = "Initial commit: Healthcare portal with UI/UX enhancements",
  [switch]$Force,
  [switch]$CreateReadme,
  [switch]$OverwriteReadme
)

function Ensure-GitAvailable {
  try {
    git --version > $null 2>&1
    return $true
  } catch {
    return $false
  }
}

if (-not (Ensure-GitAvailable)) {
  Write-Error "git is not installed or not in PATH. Install Git (https://git-scm.com/download/win) and re-run this script."
  exit 1
}

if ($Force) {
  Write-Host "Force flag set: running cleanup (non-interactive)"
  $cleaner = Join-Path -Path (Get-Location) -ChildPath 'clean-repo.ps1'
  if (Test-Path $cleaner) {
    & $cleaner -Force 2>$null
  } else {
    Write-Warning "clean-repo.ps1 not found; skipping cleanup."
  }
}

if ($CreateReadme) {
  $readmePath = Join-Path -Path (Get-Location) -ChildPath 'README.md'
  if (Test-Path $readmePath -and -not $OverwriteReadme) {
    Write-Host "README.md already exists; use -OverwriteReadme to replace."
  } else {
    "# Team`n" | Out-File -FilePath $readmePath -Encoding utf8
    Write-Host "Created README.md"
  }
}

Write-Host "Initializing repository and creating initial commit..."
if (-not (Test-Path .git)) { git init }
git add .
try {
  git commit -m $CommitMessage
} catch {
  Write-Warning "No changes to commit or commit failed: $_"
}

git branch -M main
git remote remove origin -ErrorAction SilentlyContinue
git remote add origin $RemoteUrl

Write-Host "Pushing to $RemoteUrl ..."
git push -u origin main

if ($LASTEXITCODE -eq 0) { Write-Host "Push succeeded." } else { Write-Error "Push failed. Check output above for errors." }
