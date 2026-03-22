@echo off
REM 3D Scene Editor - Start Script (Windows)
REM Ensures dependencies are installed and starts the dev server

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo 🏗️  3D Scene Editor - Starting...

REM Check for Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js is not installed.
    echo    Install from: https://nodejs.org/ ^(LTS recommended^)
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%a in ('node -v') do set NODE_VER=%%a
for /f "tokens=1 delims=." %%a in ('node -v') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%

echo ✅ Node.js detected

REM Check for npm
where npm >nul 2>nul
if errorlevel 1 (
    echo ❌ npm is not installed.
    pause
    exit /b 1
)

echo ✅ npm detected

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencies folder exists
)

REM Stop existing server if running
if exist ".server.pid" (
    set /p OLD_PID=<.server.pid
    echo 🛑 Stopping existing server...
    taskkill /PID !OLD_PID! /F >nul 2>nul
    del .server.pid >nul 2>nul
)

REM Also kill any process on port 5173
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>nul
)

echo 🚀 Starting development server...
echo.
echo ✅ Server starting...
echo 🌐 Open http://localhost:5173 in your browser
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start in foreground (Windows batch doesn't handle background well)
call npm run dev
