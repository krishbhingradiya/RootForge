#!/usr/bin/env bash
# RootForge — AI Solution Builder macOS / Linux Dev Launcher

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "========================================================"
echo " ROOTFORGE — AI SOLUTION BUILDER (DEV SERVER)"
echo "========================================================"
echo ""

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is not installed or not in PATH."
  echo "Please install Node.js (v18+) from https://nodejs.org/"
  exit 1
fi

# Check root node_modules
if [ ! -d "node_modules" ]; then
  echo "[INFO] Installing root dependencies..."
  npm install
fi

# Check backend node_modules
if [ ! -d "backend/node_modules" ]; then
  echo "[INFO] Installing backend dependencies..."
  npm --prefix backend install
  npm --prefix backend run prisma:generate
fi

# Check frontend node_modules
if [ ! -d "frontend/node_modules" ]; then
  echo "[INFO] Installing frontend dependencies..."
  npm --prefix frontend install
fi

echo "[INFO] Starting Backend (Port 5005) & Frontend (Port 5175)..."
echo "Press Ctrl+C to stop both servers."
echo ""

npm run dev
