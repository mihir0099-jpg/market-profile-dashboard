# Infinite auto-reconnect loop for public tunnels with SSH Keep-Alives & Localtunnel fallback
$ErrorActionPreference = "Continue"

Write-Host "============================================="
Write-Host "Starting Auto-Reconnecting Tunnel Service..."
Write-Host "============================================="

while ($true) {
    Write-Host "[Tunnel] Launching Serveo Tunnel..." -ForegroundColor Green
    ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R bhaichara-scanner-mihir:80:127.0.0.1:3001 serveo.net
    
    Write-Host "[Tunnel] Serveo tunnel reset. Trying Localtunnel fallback..." -ForegroundColor Yellow
    cmd /c "npx localtunnel --port 3001 --subdomain bhaichara-scanner-mihir"

    Write-Host "[Tunnel] Tunnel disconnected. Auto-reconnecting in 5 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}
