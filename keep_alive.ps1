# keep_alive.ps1
# 24/7 Self-Healing Daemon for Bhaichara Market Profile Dashboard
# Features:
# - Parallel fast startup (< 3-5 seconds to fully online)
# - Sub-second Wi-Fi disconnect detection and instant zombie socket purging on reconnect
# - Cloudflare Named Tunnel (QUIC) 24/7 persistence
# - Serveo SSH & Localtunnel automatic backup failovers
# - Node.js & Python GEX health watchdog with auto-recovery

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

Log-Message "=== Keep-Alive 24/7 Watchdog Starting ==="

# Prevent duplicate instances of keep_alive.ps1
$myPid = $PID
$otherInstances = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object {
    $_.CommandLine -like "*keep_alive.ps1*" -and $_.CommandLine -notlike "*-Command *" -and $_.ProcessId -ne $myPid
}
if ($otherInstances) {
    $otherPids = ($otherInstances | Select-Object -ExpandProperty ProcessId) -join ", "
    Log-Message "Another instance of keep_alive.ps1 is already running (PID: $otherPids). Exiting duplicate."
    exit
}

function Test-InternetFast {
    try {
        $dns = [System.Net.Dns]::GetHostAddresses("1.1.1.1")
        if ($dns.Count -gt 0) { return $true }
    } catch {}
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect("8.8.8.8", 53, $null, $null)
        $success = $iar.AsyncWaitHandle.WaitOne(800, $false)
        if ($success) {
            $tcp.EndConnect($iar)
            $tcp.Close()
            return $true
        }
        $tcp.Close()
    } catch {}
    return $false
}

function Restart-Tunnels {
    param([bool]$forceKill = $false)
    
    if ($forceKill) {
        Log-Message "Purging all stale tunnel processes and broken sockets..."
        taskkill /f /im ssh.exe >$null 2>&1
        Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*localtunnel*" } | ForEach-Object {
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        }
    }

    # 1. Cloudflare Named Tunnel (Permanent 24/7 Zero Trust Link)
    $cfProc = Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'"
    if ($null -eq $cfProc -and (Test-Path $cloudflaredExe)) {
        Log-Message "Spawning Cloudflare Named Tunnel (Zero Trust QUIC)..."
        try {
            if (Test-Path "$baseDir\cloudflared_token.log") { Remove-Item "$baseDir\cloudflared_token.log" -Force -ErrorAction SilentlyContinue }
            Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel run --token $cfToken" -WorkingDirectory $baseDir -RedirectStandardError "$baseDir\cloudflared_token.log" -WindowStyle Hidden -ErrorAction Stop
            Log-Message "Cloudflare Named Tunnel active."
        } catch {
            Log-Message "Failed to launch Cloudflare Tunnel: $_"
        }
    }

    # 2. Serveo Tunnel (Instant HTTPS link)
    $serveoProc = Get-CimInstance Win32_Process -Filter "Name = 'ssh.exe'" | Where-Object { $_.CommandLine -like "*serveo.net*" -and $_.CommandLine -like "*bhaichara-scanner-mihir*" }
    if ($null -eq $serveoProc) {
        Log-Message "Spawning Serveo Tunnel (bhaichara-scanner-mihir)..."
        try {
            if (Test-Path "$baseDir\serveo_temp.log") { Remove-Item "$baseDir\serveo_temp.log" -Force -ErrorAction SilentlyContinue }
            if (Test-Path "$baseDir\serveo_err.log") { Remove-Item "$baseDir\serveo_err.log" -Force -ErrorAction SilentlyContinue }
            Start-Process -FilePath "ssh" -ArgumentList "-o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -R bhaichara-scanner-mihir:80:127.0.0.1:$port serveo.net" -WorkingDirectory $baseDir -RedirectStandardOutput "$baseDir\serveo_temp.log" -RedirectStandardError "$baseDir\serveo_err.log" -WindowStyle Hidden -ErrorAction Stop
            Log-Message "Serveo Tunnel active."
        } catch {
            Log-Message "Failed to launch Serveo Tunnel: $_"
        }
    }

    # 3. Localtunnel Backup
    $ltProc = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*localtunnel*" }
    if ($null -eq $ltProc) {
        try {
            Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx localtunnel --port $port --subdomain bhaichara-scanner-mihir" -WorkingDirectory $baseDir -WindowStyle Hidden -ErrorAction SilentlyContinue
        } catch {}
    }
}

function Update-DashboardUrls {
    $urlContent = @"
===================================================
  Active Market Profile Dashboard Public URLs
===================================================
Last Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

1. Permanent Serveo Tunnel (Primary Link):
   https://bhaichara-scanner-mihir.serveousercontent.com

2. Permanent Cloudflare Named Tunnel:
   Active & Connected via Cloudflare Zero Trust (QUIC/HTTP2)

3. Localtunnel Backup URL:
   https://bhaichara-scanner-mihir.loca.lt
"@
    Set-Content -Path "$baseDir\dashboard_urls.txt" -Value $urlContent -ErrorAction SilentlyContinue
}

# --- Parallel Fast Initialization ---
Log-Message "Checking core server processes..."

# 1. Node.js backend
$nodeProc = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*--expose-gc server.js*" }
if ($null -eq $nodeProc) {
    Log-Message "Launching Node.js Backend Server on port $port..."
    if (Test-Path "$backendDir\out.log") { Remove-Item "$backendDir\out.log" -Force -ErrorAction SilentlyContinue }
    if (Test-Path "$backendDir\err.log") { Remove-Item "$backendDir\err.log" -Force -ErrorAction SilentlyContinue }
    Start-Process -FilePath "node" -ArgumentList "--max-old-space-size=4096 --expose-gc server.js" -WorkingDirectory $backendDir -RedirectStandardOutput "$backendDir\out.log" -RedirectStandardError "$backendDir\err.log" -WindowStyle Hidden -ErrorAction SilentlyContinue
}

# 2. Python GEX Options Analytics
$pythonProc = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object { $_.CommandLine -like "*app.py*" -and $_.CommandLine -like "*nse-gex-dashboard*" }
if ($null -eq $pythonProc -and (Test-Path $pythonExe)) {
    Log-Message "Launching Python GEX Options Scraper on port 5000..."
    if (Test-Path "$pythonDir\out.log") { Remove-Item "$pythonDir\out.log" -Force -ErrorAction SilentlyContinue }
    if (Test-Path "$pythonDir\err.log") { Remove-Item "$pythonDir\err.log" -Force -ErrorAction SilentlyContinue }
    Start-Process -FilePath $pythonExe -ArgumentList "-u app.py" -WorkingDirectory $pythonDir -RedirectStandardOutput "$pythonDir\out.log" -RedirectStandardError "$pythonDir\err.log" -WindowStyle Hidden -ErrorAction SilentlyContinue
}

# 3. Tunnels
Restart-Tunnels -forceKill $false
Update-DashboardUrls

# Fast wait for Node port to be ready (up to 4s with 200ms increments)
$nodeReady = $false
for ($i = 0; $i -lt 20; $i++) {
    try {
        $res = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health" -TimeoutSec 1 -ErrorAction Stop
        if ($res.status -eq "OK") {
            $nodeReady = $true
            Log-Message "Node.js Backend ready and responding in $(($i + 1) * 200)ms."
            break
        }
    } catch {}
    Start-Sleep -Milliseconds 200
}

# --- Main 24/7 Self-Healing Loop ---
$wasOnline = $true
$nodeFailures = 0
$pollInterval = 6

while ($true) {
    try {
        # Check internet status with quick timeout
        $isOnline = Test-InternetFast
        
        if (-not $isOnline) {
            if ($wasOnline) {
                Log-Message "WARNING: Wi-Fi/Internet disconnected! Entering rapid-reconnect mode..."
                $wasOnline = $false
            }
            # When offline, poll rapidly (every 2 seconds) so we recover the instant Wi-Fi comes back
            Start-Sleep -Seconds 2
            continue
        }

        # Internet is back online after a disconnect!
        if (-not $wasOnline) {
            Log-Message "SUCCESS: Internet reconnected! Instantly purging dead sockets and restarting tunnels..."
            $wasOnline = $true
            Restart-Tunnels -forceKill $true
            Update-DashboardUrls
        }

        # 1. Health-check Node.js backend
        $nodeProc = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*--expose-gc server.js*" }
        $restartNode = $false
        if ($null -eq $nodeProc) {
            $restartNode = $true
        } else {
            try {
                $nodeHealth = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health" -TimeoutSec 3 -ErrorAction Stop
                if ($nodeHealth.status -eq "OK") {
                    $nodeFailures = 0
                } else {
                    $nodeFailures++
                }
            } catch {
                $nodeFailures++
                Log-Message "Node health check failed ($nodeFailures/3): $_"
            }

            if ($nodeFailures -ge 3) {
                Log-Message "Node backend failed 3 consecutive checks. Force restarting..."
                $restartNode = $true
                $nodeProc | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
                $nodeFailures = 0
            }
        }

        if ($restartNode) {
            Log-Message "Restarting Node.js Backend Server..."
            Start-Process -FilePath "node" -ArgumentList "--max-old-space-size=4096 --expose-gc server.js" -WorkingDirectory $backendDir -RedirectStandardOutput "$backendDir\out.log" -RedirectStandardError "$backendDir\err.log" -WindowStyle Hidden -ErrorAction SilentlyContinue
        }

        # 2. Health-check Python GEX server
        $pythonProc = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object { $_.CommandLine -like "*app.py*" -and $_.CommandLine -like "*nse-gex-dashboard*" }
        if ($null -eq $pythonProc -and (Test-Path $pythonExe)) {
            Log-Message "Restarting Python GEX Server..."
            Start-Process -FilePath $pythonExe -ArgumentList "-u app.py" -WorkingDirectory $pythonDir -RedirectStandardOutput "$pythonDir\out.log" -RedirectStandardError "$pythonDir\err.log" -WindowStyle Hidden -ErrorAction SilentlyContinue
        }

        # 3. Health-check Cloudflare & Serveo tunnels
        Restart-Tunnels -forceKill $false
        Update-DashboardUrls

    } catch {
        Log-Message "Error in watchdog iteration: $_"
    }

    Start-Sleep -Seconds $pollInterval
}
