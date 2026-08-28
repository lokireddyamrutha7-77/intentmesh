# IntentMesh Local Anvil Multi-Chain Starter Script (Windows PowerShell)

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   STARTING INTENTMESH LOCAL ANVIL EVM CHAINS       " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$anvilBin = "$env:USERPROFILE\.foundry\bin\anvil.exe"
if (-not (Test-Path $anvilBin)) {
    $anvilBin = "anvil"
}

Write-Host "[1/2] Starting Source Chain (Chain ID: 31337, Port: 8545)..." -ForegroundColor Green
Start-Process -FilePath $anvilBin -ArgumentList "--port 8545 --chain-id 31337" -WindowStyle Normal

Write-Host "[2/2] Starting Destination Chain (Chain ID: 31338, Port: 8546)..." -ForegroundColor Green
Start-Process -FilePath $anvilBin -ArgumentList "--port 8546 --chain-id 31338" -WindowStyle Normal

Write-Host "✓ Both Anvil local EVM nodes started successfully!" -ForegroundColor Green
Write-Host "  Source RPC:      http://127.0.0.1:8545 (31337)"
Write-Host "  Destination RPC: http://127.0.0.1:8546 (31338)"
