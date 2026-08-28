# IntentMesh Local Contract Deployment Script (Windows PowerShell)

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   DEPLOYING INTENTMESH CONTRACTS TO LOCAL ANVIL    " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$forgeBin = "$env:USERPROFILE\.foundry\bin\forge.exe"
if (-not (Test-Path $forgeBin)) {
    $forgeBin = "forge"
}

Push-Location "contracts"

Write-Host "[1/2] Deploying Protocol Contracts to Source Chain (31337)..." -ForegroundColor Green
& $forgeBin script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast

Write-Host "[2/2] Deploying Protocol Contracts to Destination Chain (31338)..." -ForegroundColor Green
& $forgeBin script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8546 --broadcast

Pop-Location

Write-Host "✓ Deployment complete! JSON metadata saved under contracts/deployments/" -ForegroundColor Green
