#!/usr/bin/env bash

# IntentMesh Local Anvil Multi-Chain Starter Script (POSIX Shell)

echo "===================================================="
echo "   STARTING INTENTMESH LOCAL ANVIL EVM CHAINS       "
echo "===================================================="

echo "[1/2] Starting Source Chain (Chain ID: 31337, Port: 8545)..."
anvil --port 8545 --chain-id 31337 > /dev/null 2>&1 &
PID_SOURCE=$!

echo "[2/2] Starting Destination Chain (Chain ID: 31338, Port: 8546)..."
anvil --port 8546 --chain-id 31338 > /dev/null 2>&1 &
PID_DEST=$!

echo "✓ Both Anvil local EVM nodes started background processes ($PID_SOURCE, $PID_DEST)!"
echo "  Source RPC:      http://127.0.0.1:8545 (31337)"
echo "  Destination RPC: http://127.0.0.1:8546 (31338)"
