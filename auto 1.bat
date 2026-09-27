@echo off
title Bhaichara Scanner Launcher - Auto 1
echo ===================================================
echo   Starting Bhaichara Market Profile Dashboard (Auto 1)
echo ===================================================
cd /d "C:\Users\mihir\.gemini\antigravity\scratch\market-profile-dashboard"

:: Quick cleanup of stray lock files
del /f /q keep_alive.lock >nul 2>&1

:: Check if Port 3001 is already healthy
powershell -NoProfile -ExecutionPolicy Bypass -Command "$h = $false; try { $r = [System.Net.WebRequest]::Create('http://127.0.0.1:3001/health'); $r.Timeout=2000; $res = $r.GetResponse(); if ([int]$res.StatusCode -eq 200) { $h = $true }; $res.Close() } catch {}; if ($h) { Write-Host '>>> Port 3001 is already HEALTHY & ONLINE.' -ForegroundColor Green } else { Write-Host '>>> Launching Keep-Alive Watchdog in background...' -ForegroundColor Yellow; Start-Process 'powershell.exe' -ArgumentList '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File keep_alive.ps1' -WorkingDirectory 'C:\Users\mihir\.gemini\antigravity\scratch\market-profile-dashboard' -WindowStyle Hidden }"

:: Open public dashboard
start "" "https://bhaichara-scanner-mihir.serveousercontent.com"

:: Ensure Auto 2 (TradingView Master Dashboard) is also running in background
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue; if (-not $c) { Start-Process 'powershell.exe' -ArgumentList '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\Users\mihir\.gemini\antigravity\scratch\tradingview-dashboard\run_all_day.ps1' -WorkingDirectory 'C:\Users\mihir\.gemini\antigravity\scratch\tradingview-dashboard' -WindowStyle Hidden }"

echo ===================================================
echo   Bhaichara 24/7 Self-Healing Daemon is ACTIVE.
echo   All tunnels and AI engines running in background.
echo ===================================================
ping 127.0.0.1 -n 3 > nul
exit /b 0
