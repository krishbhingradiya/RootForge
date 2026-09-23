@echo off
setlocal enabledelayedexpansion

title RootForge - AI Solution Builder (Windows)

echo ========================================================
echo  ROOTFORGE - AI SOLUTION BUILDER (WINDOWS DEV SERVER)
echo ========================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not found in PATH.
    echo Please install Node.js (v18+ recommended) from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if node_modules exist
if not exist "node_modules" (
    echo [INFO] First time setup detected. Installing root dependencies...
    call npm install
)

if not exist "backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    call npm --prefix backend install
    call npm --prefix backend run prisma:generate
)

if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    call npm --prefix frontend install
)

echo [INFO] Starting Backend (Port 5005) and Frontend (Port 5175)...
echo Press Ctrl+C anytime to stop both servers.
echo.

npm run dev
