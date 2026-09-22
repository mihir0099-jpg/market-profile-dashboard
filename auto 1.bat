@echo off
title Bhaichara Scanner Launcher
echo ===================================================
echo   Starting Bhaichara Market Profile Dashboard
echo ===================================================
cd /d "C:\Users\mihir\.gemini\antigravity\scratch\market-profile-dashboard"

:: Quick cleanup of stray lock files
del /f /q keep_alive.lock >nul 2>&1

echo.
echo Launching Keep-Alive 24/7 Watchdog in background...
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\Users\mihir\.gemini\antigravity\scratch\market-profile-dashboard\keep_alive.ps1"

echo Waiting for services to initialize...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready = $false; for ($i=0; $i -lt 25; $i++) { try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/health' -TimeoutSec 1 -ErrorAction Stop; if ($r.status -eq 'OK') { $ready = $true; break } } catch {}; Start-Sleep -Milliseconds 200 }; if ($ready) { Write-Host '>>> System ONLINE in ' (($i+1)*200) 'ms! Opening Dashboard...' -ForegroundColor Green } else { Write-Host '>>> Services launching in background...' -ForegroundColor Yellow }"

:: Open public dashboard immediately
start "" "https://bhaichara-scanner-mihir.serveousercontent.com"

echo ===================================================
echo   Bhaichara 24/7 Self-Healing Daemon is ACTIVE.
echo   All tunnels and AI engines running in background.
echo ===================================================
exit /b 0
