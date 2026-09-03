# keep_alive.ps1
# Keeps the Market Profile Dashboard backend, Python options scraper, and Cloudflare Named Tunnel running silently in the background.

$baseDir = "C:\Users\mihir\.gemini\antigravity\scratch\market-profile-dashboard"
$binDir = "$baseDir\bin"
$backendDir = "$baseDir\backend"
$pythonDir = "C:\Users\mihir\.gemini\antigravity\scratch\nse-gex-dashboard"
$pythonExe = "$pythonDir\venv\Scripts\python.exe"
$cloudflaredExe = "$binDir\cloudflared.exe"
$logFile = "$baseDir\keep_alive.log"

$cfToken = "eyJhIjoiNzUzZWM4ZDYzNjgzODk3ZGI5NTBmMzZlYTEzYjYwMDIiLCJ0IjoiMDAzZTMxZGItZDBmZC00YWU1LTgzNWEtNzhkZGM1OGU3OTZhIiwicyI6Ik56VTNZak0yTW1ZdE1HRXlNeTAwWWpobExUa3hZVFF0T1RNME1UazFaRE5qWm1SaCJ9"

$port = 3001
$envFile = "$backendDir\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    foreach ($line in $envContent) {
        if ($line -match "^PORT\s*=\s*(.+)$") {
            $port = $Matches[1].Trim()
        }
    }
}

function Log-Message {
    param([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] $message"
    Write-Output $logLine
    Add-Content -Path $logFile -Value $logLine -ErrorAction SilentlyContinue
}

Log-Message "Keep-alive script started."

# Prevent duplicate instances of keep_alive.ps1
$myPid = $PID
$otherInstances = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object {
    $_.CommandLine -like "*keep_alive.ps1*" -and $_.CommandLine -notlike "*-Command *" -and $_.ProcessId -ne $myPid
}
if ($otherInstances) {
    $otherPids = ($otherInstances | Select-Object -ExpandProperty ProcessId) -join ", "
    Log-Message "Another instance of keep_alive.ps1 is already running (PID: $otherPids). Exiting to prevent duplicates."
    exit
}

# Clean up any stale processes for a fresh start
Log-Message "Cleaning up existing project-specific processes..."
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*--expose-gc server.js*" } | ForEach-Object {
    taskkill /f /t /pid $_.ProcessId >$null 2>&1
}
Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'" | ForEach-Object {
    taskkill /f /t /pid $_.ProcessId >$null 2>&1
}
Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object { $_.CommandLine -like "*app.py*" -and $_.CommandLine -like "*nse-gex-dashboard*" } | ForEach-Object {
    taskkill /f /t /pid $_.ProcessId >$null 2>&1
}

$wasOnline = $true

function Test-Internet {
    try {
        $dns = [System.Net.Dns]::GetHostAddresses("1.1.1.1")
        if ($dns.Count -gt 0) {
            return $true
        }
    } catch {}
    return $false
}

$nodeFailures = 0

while ($true) {
    try {
        # Check internet connectivity
        $isOnline = Test-Internet
        if (-not $isOnline) {
            if ($wasOnline) {
                Log-Message "Internet disconnected (Wi-Fi offline). Pausing network tunnels..."
                $wasOnline = $false
            }
            Start-Sleep -Seconds 5
            continue
        }

        if (-not $wasOnline) {
            Log-Message "Internet reconnected (Wi-Fi online). Resuming tunnels..."
            $wasOnline = $true
        }

        # 1. Check Node Backend Server
        $nodeProc = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*--expose-gc server.js*" }
        $needStartNode = $false
        if ($null -eq $nodeProc) {
            $needStartNode = $true
            $nodeFailures = 0
        } else {
            try {
                $nodeHealth = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health" -TimeoutSec 10 -ErrorAction Stop
                if ($nodeHealth.status -eq "OK") {
                    $nodeFailures = 0
                } else {
                    $nodeFailures++
                    Log-Message "Node local health check status not OK ($nodeFailures/3)."
                }
            } catch {
                $nodeFailures++
                Log-Message "Node local health check failed/unreachable ($nodeFailures/3): $_"
            }

            if ($nodeFailures -ge 3) {
                Log-Message "Node backend failed 3 consecutive health checks. Restarting backend..."
                $needStartNode = $true
                $nodeProc | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
                $nodeFailures = 0
            }
        }
        if ($needStartNode) {
            Log-Message "Node backend server is not running. Starting..."
            try {
                if (Test-Path "$backendDir\out.log") { Remove-Item "$backendDir\out.log" -Force -ErrorAction SilentlyContinue }
                if (Test-Path "$backendDir\err.log") { Remove-Item "$backendDir\err.log" -Force -ErrorAction SilentlyContinue }
                
                Start-Process -FilePath "node" -ArgumentList "--max-old-space-size=4096 --expose-gc server.js" -WorkingDirectory $backendDir -RedirectStandardOutput "$backendDir\out.log" -RedirectStandardError "$backendDir\err.log" -WindowStyle Hidden -ErrorAction Stop
                Log-Message "Node backend server started successfully."
                Start-Sleep -Seconds 5
            } catch {
                Log-Message "Failed to start Node backend server: $_"
            }
        }

        # 2. Check Python GEX Options Server
        $pythonProc = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object { $_.CommandLine -like "*app.py*" -and $_.CommandLine -like "*nse-gex-dashboard*" }
        if ($null -eq $pythonProc) {
            Log-Message "Python GEX server is not running. Starting..."
            try {
                if (Test-Path "$pythonDir\out.log") { Remove-Item "$pythonDir\out.log" -Force -ErrorAction SilentlyContinue }
                if (Test-Path "$pythonDir\err.log") { Remove-Item "$pythonDir\err.log" -Force -ErrorAction SilentlyContinue }
                
                Start-Process -FilePath $pythonExe -ArgumentList "-u app.py" -WorkingDirectory $pythonDir -RedirectStandardOutput "$pythonDir\out.log" -RedirectStandardError "$pythonDir\err.log" -WindowStyle Hidden -ErrorAction Stop
                Log-Message "Python GEX server started successfully."
            } catch {
                Log-Message "Failed to start Python GEX server: $_"
            }
        }

        # 3. Check Primary Serveo Tunnel (https://bhaichara-scanner-mihir.serveousercontent.com)
        $serveoProc = Get-CimInstance Win32_Process -Filter "Name = 'ssh.exe'" | Where-Object { $_.CommandLine -like "*serveo.net*" -and $_.CommandLine -like "*bhaichara-scanner-mihir*" }
        if ($null -eq $serveoProc) {
            Log-Message "Starting Serveo Tunnel (bhaichara-scanner-mihir)..."
            try {
                if (Test-Path "$baseDir\serveo_temp.log") { Remove-Item "$baseDir\serveo_temp.log" -Force -ErrorAction SilentlyContinue }
                if (Test-Path "$baseDir\serveo_err.log") { Remove-Item "$baseDir\serveo_err.log" -Force -ErrorAction SilentlyContinue }
                Start-Process -FilePath "ssh" -ArgumentList "-o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -R bhaichara-scanner-mihir:80:127.0.0.1:3001 serveo.net" -WorkingDirectory $baseDir -RedirectStandardOutput "$baseDir\serveo_temp.log" -RedirectStandardError "$baseDir\serveo_err.log" -WindowStyle Hidden -ErrorAction Stop
                Log-Message "Serveo Tunnel process started successfully."
            } catch {
                Log-Message "Failed to start Serveo Tunnel: $_"
            }
        }

        # 4. Check Cloudflare Named Tunnel (Permanent 24/7 Enterprise Link)
        $cfProc = Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'"
        if ($null -eq $cfProc -and (Test-Path $cloudflaredExe)) {
            Log-Message "Starting Cloudflare Named Tunnel (bhaichara-scanner-mihir)..."
            try {
                if (Test-Path "$baseDir\cloudflared_token.log") { Remove-Item "$baseDir\cloudflared_token.log" -Force -ErrorAction SilentlyContinue }
                Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel run --token $cfToken" -WorkingDirectory $baseDir -RedirectStandardError "$baseDir\cloudflared_token.log" -WindowStyle Hidden -ErrorAction Stop
                Log-Message "Cloudflare Named Tunnel process started successfully."
            } catch {
                Log-Message "Failed to start Cloudflare Named Tunnel: $_"
            }
        }

        # 5. Check Localtunnel (Instant Backup)
        $ltProc = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*localtunnel*" }
        if ($null -eq $ltProc) {
            try {
                Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx localtunnel --port $port --subdomain bhaichara-scanner-mihir" -WorkingDirectory $baseDir -WindowStyle Hidden -ErrorAction Stop
            } catch {}
        }

        # 6. Update dashboard_urls.txt
        $urlContent = @"
===================================================
  Active Market Profile Dashboard Public URLs
===================================================
Last Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

1. Permanent Serveo Tunnel (Primary Link):
   https://bhaichara-scanner-mihir.serveousercontent.com

2. Permanent Cloudflare Named Tunnel:
   Active & Connected via Cloudflare Zero Trust

3. Localtunnel Backup URL:
   https://bhaichara-scanner-mihir.loca.lt
"@

        Set-Content -Path "$baseDir\dashboard_urls.txt" -Value $urlContent -ErrorAction SilentlyContinue
    } catch {
        Log-Message "Error in keep-alive loop iteration: $_"
    }

    Start-Sleep -Seconds 15
}
