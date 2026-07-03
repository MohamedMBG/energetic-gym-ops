#Requires -Version 5.1
<#
One-shot installer for a client Windows laptop: installs Node.js + PostgreSQL
(via winget) if missing, bootstraps the app against a fresh local database,
then launches it. Re-running is safe (each step is skip-if-present).

Usage: right-click -> Run with PowerShell (will self-elevate for the winget installs).
#>

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$PgSuperPassword = 'GymOpsLocalPg2026!'
$PgWingetId = 'PostgreSQL.PostgreSQL.17'
$NodeWingetId = 'OpenJS.NodeJS.LTS'

function Write-Step($msg) { Write-Host "[install] $msg" -ForegroundColor Cyan }
function Write-Warn2($msg) { Write-Host "[install] $msg" -ForegroundColor Yellow }

# --- self-elevate (winget installs need admin) ---
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Step 'Relaunching elevated (UAC prompt)...'
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$($MyInvocation.MyCommand.Path)`""
    exit
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Error "winget not found. Install 'App Installer' from the Microsoft Store, then re-run this script."
    exit 1
}

# --- Node.js ---
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Step "Node.js already installed ($(node --version))"
} else {
    Write-Step 'Installing Node.js LTS...'
    winget install --id $NodeWingetId -e --silent --accept-package-agreements --accept-source-agreements
}

# --- PostgreSQL ---
$pgInstalled = (Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue) -or (Test-Path 'C:\Program Files\PostgreSQL')
if ($pgInstalled) {
    Write-Step 'PostgreSQL already installed, leaving existing password/config as-is'
} else {
    Write-Step 'Installing PostgreSQL 17 (this takes a few minutes)...'
    winget install --id $PgWingetId -e --silent --accept-package-agreements --accept-source-agreements `
        --override "--mode unattended --unattendedmodeui minimal --superpassword `"$PgSuperPassword`" --servicename postgresql-x64-17 --serverport 5432"
    $env:PGPASSWORD_FRESH_INSTALL = $PgSuperPassword
}

# --- refresh PATH in this process so newly installed node/npm/psql resolve without reopening the shell ---
$machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
$userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$env:Path = "$machinePath;$userPath"

# --- make sure the Postgres service is running ---
$pgService = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pgService -and $pgService.Status -ne 'Running') {
    Write-Step "Starting $($pgService.Name)..."
    Start-Service $pgService.Name
}
Start-Sleep -Seconds 3

# --- if a stale backend/.env points at a non-local database (e.g. copied from a dev machine), set it aside ---
$backendEnvPath = Join-Path $RepoRoot 'backend\.env'
if (Test-Path $backendEnvPath) {
    $content = Get-Content $backendEnvPath -Raw
    if ($content -match 'DATABASE_URL' -and $content -notmatch '(localhost|127\.0\.0\.1)') {
        $backup = Join-Path $RepoRoot 'backend\.env.bak'
        Write-Warn2 "backend/.env points at a non-local database, moving it to backend/.env.bak"
        Move-Item -Force $backendEnvPath $backup
    }
}

# --- bootstrap: create local db, apply schema, create owner account ---
Set-Location $RepoRoot
if ($env:PGPASSWORD_FRESH_INSTALL) { $env:PGPASSWORD = $env:PGPASSWORD_FRESH_INSTALL }
Write-Step 'Bootstrapping database and app...'
npm run setup:local
if ($LASTEXITCODE -ne 0) { Write-Error 'Bootstrap failed, see output above.'; exit 1 }

Write-Step 'Setup complete. Launching app via start.bat...'
Start-Process (Join-Path $RepoRoot 'start.bat')
