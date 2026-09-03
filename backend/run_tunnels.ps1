# Infinite auto-reconnect loop for public tunnels with SSH Keep-Alives
$ErrorActionPreference = "Continue"

Write-Host "============================================="
Write-Host "Starting Auto-Reconnecting Tunnel Service..."
Write-Host "SSH Keep-Alives are enabled (60s intervals)"
Write-Host "============================================="

while ($true) {
    Write-Host "[Tunnel] Launching Serveo Tunnel..." -ForegroundColor Green
    # -o ServerAliveInterval=30 sends packets to keep connection alive
    # -o ServerAliveCountMax=3 drops and reconnects if server is unresponsive
    ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R bhaichara-scanner-mihir:80:localhost:3001 serveo.net
    
    Write-Host "[Tunnel] Serveo disconnected or reset. Auto-reconnecting in 5 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}
