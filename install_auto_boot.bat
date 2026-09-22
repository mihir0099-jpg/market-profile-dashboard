@echo off
title Install Bhaichara Scanner to Windows Startup
echo =========================================================
echo   Setting up 24/7 Silent Auto-Boot on Laptop Startup
echo =========================================================

set  STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set VBS_SCRIPT=%STARTUP_FOLDER%\LaunchBhaicharaDaemon.vbs

echo Set WshShell = CreateObject(WScript.Shell) > %VBS_SCRIPT%
echo WshShell.Run powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\Users\mihir\.gemini\antigravity\scratch\market-profile-dashboard\keep_alive.ps1, 0, False >> %VBS_SCRIPT%

echo.
echo [SUCCESS] Silent Auto-Start registered in Windows Startup!
echo Whenever you start or restart your laptop, the Bhaichara
echo Market Profile server, Cloudflare tunnel, and ML engine
echo will start automatically in the background in less than 3 seconds.
echo =========================================================
pause
