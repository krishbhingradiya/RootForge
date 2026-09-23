# RootForge - Windows PowerShell Startup Script
$Host.UI.RawUI.WindowTitle = "RootForge - AI Solution Builder (PowerShell)"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " ROOTFORGE - AI SOLUTION BUILDER (WINDOWS POWERSHELL)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed or not in PATH. Download from https://nodejs.org/"
    exit 1
}

# Check Root node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing root dependencies..." -ForegroundColor Yellow
    npm install
}

# Check Backend node_modules
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "[INFO] Installing backend dependencies..." -ForegroundColor Yellow
    npm --prefix backend install
    npm --prefix backend run prisma:generate
}

# Check Frontend node_modules
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "[INFO] Installing frontend dependencies..." -ForegroundColor Yellow
    npm --prefix frontend install
}

Write-Host "[INFO] Launching Backend (Port 5005) & Frontend (Port 5175)..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor Gray
Write-Host ""

npm run dev
