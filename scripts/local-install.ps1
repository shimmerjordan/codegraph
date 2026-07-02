# Build the current branch and link it as the global `codegraph` for
# hands-on testing on Windows. Replaces any existing global install for as
# long as the npm link is in place. PowerShell twin of local-install.sh.
#
# Usage:
#   .\scripts\local-install.ps1          # build + link
#   .\scripts\local-install.ps1 -Undo    # unlink + restore the published version

param([switch]$Undo)

$ErrorActionPreference = 'Stop'

# Repo root = this script's parent directory.
Set-Location (Join-Path $PSScriptRoot '..')

$pkg = node -p "require('./package.json').name"
$version = node -p "require('./package.json').version"
$branch = git rev-parse --abbrev-ref HEAD

if ($Undo) {
  Write-Host "-> unlinking $pkg"
  try { npm unlink -g "$pkg" 2>$null | Out-Null } catch { }
  Write-Host "-> reinstalling published $pkg"
  npm install -g "$pkg"
  $where = (Get-Command codegraph -ErrorAction SilentlyContinue).Source
  Write-Host "done: global codegraph -> $where"
  exit 0
}

Write-Host "-> building $pkg $version ($branch)"
# build:all also builds the dashboard web UI into dist/dashboard/public so a
# linked branch build serves the real dashboard page, not the "UI not built" one.
npm run build:all

Write-Host "-> linking globally"
npm link

$linked = (Get-Command codegraph -ErrorAction SilentlyContinue).Source
if (-not $linked) { $linked = "(not on PATH)" }
Write-Host ""
Write-Host "OK global codegraph now points to this branch"
Write-Host "  binary:  $linked"
Write-Host "  branch:  $branch"
Write-Host "  version: $version"
Write-Host ""
Write-Host "Open the monitoring dashboard (this does NOT auto-start it):"
Write-Host "  codegraph dashboard"
Write-Host ""
Write-Host "To restore the published version:"
Write-Host "  .\scripts\local-install.ps1 -Undo"
