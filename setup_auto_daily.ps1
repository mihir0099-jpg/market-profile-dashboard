# Setup and verify daily automated tasks for Bhaichara Scanner & Market Profile Dashboard

$baseDir = "C:\Users\mihir\.gemini\antigravity\scratch\market-profile-dashboard"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " CONFIGURING DAILY AUTOMATED TASK SCHEDULERS" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Common settings for background resilience
$resilientSettings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0)

# Task 1: BhaicharaScannerAutoRun (Runs auto 1.bat Daily at 9:05 AM & At Logon)
$t1_daily = New-ScheduledTaskTrigger -Daily -At 09:05AM
$t1_logon = New-ScheduledTaskTrigger -AtLogOn
$t1_action = New-ScheduledTaskAction -Execute "$baseDir\auto 1.bat"

Register-ScheduledTask -TaskName "BhaicharaScannerAutoRun" -Trigger $t1_daily, $t1_logon -Action $t1_action -Settings $resilientSettings -Force | Out-Null
Write-Host "[OK] Task 'BhaicharaScannerAutoRun' updated (Triggers: Daily 9:05 AM + At Logon)" -ForegroundColor Green

# Task 2: MihirMarketProfileDashboard (Runs keep_alive.ps1 Daily at 9:00 AM & At Logon)
$t2_daily = New-ScheduledTaskTrigger -Daily -At 09:00AM
$t2_logon = New-ScheduledTaskTrigger -AtLogOn
$t2_action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$baseDir\keep_alive.ps1`""

Register-ScheduledTask -TaskName "MihirMarketProfileDashboard" -Trigger $t2_daily, $t2_logon -Action $t2_action -Settings $resilientSettings -Force | Out-Null
Write-Host "[OK] Task 'MihirMarketProfileDashboard' updated (Triggers: Daily 9:00 AM + At Logon)" -ForegroundColor Green

# Task 3: MihirNiftyGexScraper (Runs nifty_gex.py Daily at 3:45 PM)
$gexDir = "C:\Users\mihir\.gemini\antigravity\scratch\nifty_gex"
if (Test-Path "$gexDir\nifty_gex.py") {
    $t3_daily = New-ScheduledTaskTrigger -Daily -At 03:45PM
    $t3_action = New-ScheduledTaskAction -Execute "$gexDir\venv\Scripts\python.exe" -Argument "$gexDir\nifty_gex.py"

    Register-ScheduledTask -TaskName "MihirNiftyGexScraper" -Trigger $t3_daily -Action $t3_action -Settings $resilientSettings -Force | Out-Null
    Write-Host "[OK] Task 'MihirNiftyGexScraper' updated (Trigger: Daily 3:45 PM)" -ForegroundColor Green
}

Write-Host "`nVerifying daily task status..." -ForegroundColor Yellow

# Run status check
& "$baseDir\check_auto_status.ps1"

