@echo off
title Bhaichara Scanner Launcher
echo ===================================================
echo   Starting Bhaichara Market Profile Dashboard
echo ===================================================
cd /d "C:\Users\mihir\.gemini\antigravity\scratch\market-profile-dashboard"

:: Kill any stray node on port 3001, python GEX, or ssh tunnel processes first to clean up ports
echo Cleaning up previous instances...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$conn = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue; if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }"
taskkill /f /im ssh.exe >nul 2>&1
wmic process where "commandline like '%%app.py%%'" call terminate >nul 2>&1

:: Remove old lock file
del /f /q keep_alive.lock >nul 2>&1

echo.
echo Launching Keep-Alive Monitor in background...
start /b powershell.exe -NoProfile -ExecutionPolicy Bypass -File "keep_alive.ps1"

echo.
echo Dashboard services are starting in the background.
echo They will automatically monitor and restart if they crash.
echo.
:: Launching browser to active dashboard...
ping 127.0.0.1 -n 6 > nul

start "" "https://bhaichara-scanner-mihir.serveousercontent.com"

echo ===================================================
echo Note: This window will close. The dashboard remains active.
echo ===================================================
ping 127.0.0.1 -n 6 > nul
