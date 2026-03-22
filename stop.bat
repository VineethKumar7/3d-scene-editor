@echo off
REM 3D Scene Editor - Stop Script (Windows)
REM Stops the development server

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo 🛑 3D Scene Editor - Stopping...

set FOUND=0

REM Try PID file first
if exist ".server.pid" (
    set /p PID=<.server.pid
    echo    Stopping server ^(PID: !PID!^)...
    taskkill /PID !PID! /F >nul 2>nul
    del .server.pid >nul 2>nul
    set FOUND=1
)

REM Kill any process on port 5173
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
    echo    Found server on port 5173 ^(PID: %%a^)
    taskkill /PID %%a /F >nul 2>nul
    set FOUND=1
)

if !FOUND!==1 (
    echo ✅ Server stopped
) else (
    echo ℹ️  No server running
)

pause
