# Restart script to ensure auto daily background services start clean
Write-Host "Stopping any stale keep_alive, node, python, ngrok, cloudflared, or ssh processes..." -ForegroundColor Yellow

Get-CimInstance Win32_Process | Where-Object { 
    $_.CommandLine -like "*keep_alive.ps1*" -or 
    $_.CommandLine -like "*server.js*" -or 
    $_.Name -eq "cloudflared.exe" -or
    $_.Name -eq "ngrok.exe" -or
    $_.Name -eq "ssh.exe" -or
    $_.Name -eq "ssh"
} | ForEach-Object {
    Write-Host "Stopping process PID $($_.ProcessId): $($_.Name)"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 3

Write-Host "Triggering MihirMarketProfileDashboard scheduled task..." -ForegroundColor Green
Start-ScheduledTask -TaskName "MihirMarketProfileDashboard" -ErrorAction SilentlyContinue

Start-Sleep -Seconds 8

Write-Host "Verifying status..." -ForegroundColor Green
& "C:\Users\mihir\.gemini\antigravity\scratch\market-profile-dashboard\check_auto_status.ps1"
