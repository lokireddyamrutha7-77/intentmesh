#!/usr/bin/env bash

# IntentMesh Local Contract Deployment Script (POSIX Shell)

echo "===================================================="
echo "   DEPLOYING INTENTMESH CONTRACTS TO LOCAL ANVIL    "
echo "===================================================="

cd contracts

echo "[1/2] Deploying Protocol Contracts to Source Chain (31337)..."
forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast

echo "[2/2] Deploying Protocol Contracts to Destination Chain (31338)..."
forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8546 --broadcast

cd ..

echo "✓ Deployment complete! JSON metadata saved under contracts/deployments/"
