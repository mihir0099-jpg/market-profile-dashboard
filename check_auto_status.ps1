# Script to verify auto daily scheduled tasks and process health
$tasks = @("BhaicharaScannerAutoRun", "MihirMarketProfileDashboard", "MihirNiftyGexScraper")
$baseDir = "C:\Users\mihir\.gemini\antigravity\scratch\market-profile-dashboard"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " AUTOMATED DAILY TASKS STATUS CHECK" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

foreach ($t in $tasks) {
    Write-Host "Task: $t" -ForegroundColor Yellow
    $taskObj = Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue
    if ($taskObj) {
        $info = Get-ScheduledTaskInfo -TaskName $t
        Write-Host "  State                      : $($taskObj.State)"
        Write-Host "  Enabled                    : $($taskObj.Settings.Enabled)"
        Write-Host "  Start When Available (Missed): $($taskObj.Settings.StartWhenAvailable)"
        Write-Host "  Disallow If On Batteries   : $($taskObj.Settings.DisallowStartIfOnBatteries)"
        Write-Host "  Last Run Time              : $($info.LastRunTime)"
        Write-Host "  Last Task Result           : $($info.LastTaskResult)"
        Write-Host "  Next Run Time              : $($info.NextRunTime)"
    } else {
        Write-Host "  NOT FOUND!" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " LIVE PROCESSES & ENDPOINTS HEALTH" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Keep-alive process
$keepAlive = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*keep_alive.ps1*" }
if ($keepAlive) {
    Write-Host "Keep-Alive Process       : RUNNING (PID: $(($keepAlive.ProcessId -join ', ')))" -ForegroundColor Green
} else {
    Write-Host "Keep-Alive Process       : NOT RUNNING!" -ForegroundColor Red
}

# Node Backend
try {
    $nodeRes = Invoke-RestMethod -Uri "http://127.0.0.1:3001/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "Node Backend (Port 3001) : RUNNING & HEALTHY ($($nodeRes.status))" -ForegroundColor Green
} catch {
    Write-Host "Node Backend (Port 3001) : ERROR / DOWN ($($_.Exception.Message))" -ForegroundColor Red
}

# Primary Serveo Tunnel
$serveoUrl = "https://bhaichara-scanner-mihir.serveousercontent.com"
try {
    $serveoRes = Invoke-RestMethod -Uri "$serveoUrl/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "Primary Serveo Tunnel    : RUNNING & HEALTHY ($($serveoRes.status))" -ForegroundColor Green
    Write-Host "  URL                    : $serveoUrl" -ForegroundColor Cyan
} catch {
    Write-Host "Primary Serveo Tunnel    : DOWN / CONNECTING (Serveo server outage / connection timed out)" -ForegroundColor Yellow
    Write-Host "  Requested URL          : $serveoUrl" -ForegroundColor DarkGray
}

# Cloudflare Backup Tunnel
try {
    $cfUrl = $null
    if (Test-Path "$baseDir\dashboard_urls.txt") {
        $uContent = Get-Content "$baseDir\dashboard_urls.txt" -Raw
        $cfMatch = [regex]::Match($uContent, "https://[a-zA-Z0-9-]+\.trycloudflare\.com")
        if ($cfMatch.Success) {
            $cfUrl = $cfMatch.Value.Trim()
        }
    }
    if ($cfUrl) {
        $cfRes = Invoke-RestMethod -Uri "$cfUrl/health" -TimeoutSec 10 -ErrorAction Stop
        Write-Host "Cloudflare Live Tunnel   : RUNNING & HEALTHY ($($cfRes.status))" -ForegroundColor Green
        Write-Host "  Live Access URL        : $cfUrl" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Cloudflare Live Tunnel   : ERROR / DOWN ($($_.Exception.Message))" -ForegroundColor Red
}
