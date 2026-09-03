# check_status.ps1

Write-Host "--- Checking Scheduled Task (MihirMarketProfileDashboard) ---" -ForegroundColor Cyan
$task = Get-ScheduledTask -TaskName "MihirMarketProfileDashboard" -ErrorAction SilentlyContinue
if ($task) {
    Write-Host "Task exists. State: $($task.State)" -ForegroundColor Green
    $taskInfo = $task | Get-ScheduledTaskInfo
    Write-Host "Last Run Time : $($taskInfo.LastRunTime)"
    Write-Host "Last Run Result: $($taskInfo.LastTaskResult)"
    Write-Host "Next Run Time : $($taskInfo.NextRunTime)"
} else {
    Write-Host "Scheduled Task 'MihirMarketProfileDashboard' does not exist." -ForegroundColor Yellow
}

Write-Host "`n--- Checking keep_alive.ps1 Process ---" -ForegroundColor Cyan
$kpProc = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object { $_.CommandLine -like "*keep_alive.ps1*" }
if ($kpProc) {
    Write-Host "keep_alive.ps1 is running. Details:" -ForegroundColor Green
    $kpProc | ForEach-Object {
        $owner = $_ | Invoke-CimMethod -MethodName GetOwner -ErrorAction SilentlyContinue
        Write-Host "  - PID: $($_.ProcessId) | Created: $($_.CreationDate) | Owner: $($owner.Domain)\$($owner.User)"
        Write-Host "    Cmd: $($_.CommandLine)"
    }
} else {
    Write-Host "keep_alive.ps1 is NOT running." -ForegroundColor Red
}

Write-Host "--- Checking Dashboard Components ---" -ForegroundColor Cyan
$nodeProc = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*server.js*" }
if ($nodeProc) {
    Write-Host "Node backend server is RUNNING (PID: $($nodeProc.ProcessId))" -ForegroundColor Green
} else {
    Write-Host "Node backend server is NOT running" -ForegroundColor Red
}

$pythonProc = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object { $_.CommandLine -like "*app.py*" }
if ($pythonProc) {
    Write-Host "Python GEX server is RUNNING (PID: $($pythonProc.ProcessId))" -ForegroundColor Green
} else {
    Write-Host "Python GEX server is NOT running" -ForegroundColor Red
}

$sshProc = Get-CimInstance Win32_Process -Filter "Name = 'ssh.exe'"
if ($sshProc) {
    Write-Host "SSH Tunnel Processes are RUNNING:" -ForegroundColor Green
    $sshProc | ForEach-Object {
        $owner = $_ | Invoke-CimMethod -MethodName GetOwner -ErrorAction SilentlyContinue
        Write-Host "  - PID: $($_.ProcessId) | Created: $($_.CreationDate) | Owner: $($owner.Domain)\$($owner.User)"
        Write-Host "    Cmd: $($_.CommandLine)"
    }
} else {
    Write-Host "SSH Tunnel Processes are NOT running" -ForegroundColor Red
}
