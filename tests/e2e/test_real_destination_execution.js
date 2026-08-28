const assert = require("assert");
const fs = require("fs");
const path = require("path");
const http = require("http");
const moduleAlias = require("module");

// Alias workspace packages portably using path.resolve
const rootDir = path.resolve(__dirname, "../../");
const originalRequire = moduleAlias.prototype.require;
moduleAlias.prototype.require = function (request) {
  const map = {
    "@intentmesh/protocol-types": path.join(rootDir, "packages/protocol-types/dist/index.js"),
    "@intentmesh/intent-schema": path.join(rootDir, "packages/intent-schema/dist/index.js"),
    "@intentmesh/solver-sdk": path.join(rootDir, "packages/solver-sdk/dist/index.js"),
    "@intentmesh/risk-engine": path.join(rootDir, "packages/risk-engine/dist/index.js"),
    "@intentmesh/chain-adapters": path.join(rootDir, "packages/chain-adapters/dist/index.js"),
    "@intentmesh/verification-sdk": path.join(rootDir, "packages/verification-sdk/dist/index.js"),
    "@intentmesh/execution-monitor": path.join(rootDir, "services/execution-monitor/dist/index.js"),
    "@intentmesh/failure-manager": path.join(rootDir, "services/failure-manager/dist/index.js"),
    "@intentmesh/indexer": path.join(rootDir, "services/indexer/dist/index.js"),
    "@intentmesh/solvers": path.join(rootDir, "solvers/dist/index.js"),
  };
  if (map[request]) {
    return originalRequire.call(this, map[request]);
  }
  return originalRequire.call(this, request);
};

const { EVMChainAdapter, LocalSimulationAdapter } = require("@intentmesh/chain-adapters");
const { ExecutionMonitorService } = require("@intentmesh/execution-monitor");
const { FailureManagerService } = require("@intentmesh/failure-manager");
const { computeCanonicalIntentHash } = require("@intentmesh/intent-schema");
const { DeterministicVerificationEngine } = require("@intentmesh/verification-sdk");

console.log(`====================================================`);
console.log(`  REAL DESTINATION EXECUTION ACCEPTANCE SUITE       `);
console.log(`====================================================\n`);

function jsonRpcCall(urlStr, method, params) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const payload = JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params });
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
        timeout: 3000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.result);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function getErc20Balance(rpcUrl, tokenAddress, ownerAddress) {
  const padAddr = ownerAddress.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const data = "0x70a08231" + padAddr;
  const hex = await jsonRpcCall(rpcUrl, "eth_call", [{ to: tokenAddress, data }, "latest"]);
  return BigInt(hex || "0x0");
}

async function runRealDestinationExecutionTests() {
  const depsPath = path.join(rootDir, "contracts/deployments/deployments-31338.json");
  const deployments = fs.existsSync(depsPath)
    ? JSON.parse(fs.readFileSync(depsPath, "utf8"))
    : {
        DestinationVault: "0x09635F643e140090A9A8Dcd712eD6285858ceBef",
        MockUSDC: "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB",
      };

  const destRpc = "http://127.0.0.1:8546";
  const evmAdapter = new EVMChainAdapter({
    destinationRpcUrl: destRpc,
    destinationChainId: 31338n,
    destinationVaultAddress: deployments.DestinationVault,
    destinationTokenAddress: deployments.MockUSDC,
  });

  const localAdapter = new LocalSimulationAdapter();
  const verificationEngine = new DeterministicVerificationEngine();
  const executionMonitor = new ExecutionMonitorService(evmAdapter);
  const failureManager = new FailureManagerService(executionMonitor, evmAdapter);

  // Use distinct accounts: solver is 0x7099..., recipient is 0x3C44...
  const solverAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const recipientAddr = "0x3C44CdDDB6a900fa2b585dd299e03d12FA4293BC";
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const outputAmount = 980n * 10n**6n;

  const testIntent = {
    intentHash: "",
    user: "0xuser_dest_test",
    sourceChainId: 31337n,
    sourceToken: deployments.MockUSDC,
    sourceAmount: 1000n * 10n**6n,
    destinationChainId: 31338n,
    destinationToken: deployments.MockUSDC,
    recipient: recipientAddr,
    minOutputAmount: 950n * 10n**6n,
    deadline: nowSec + 3600n,
    nonce: BigInt(Date.now()),
    verificationPolicy: "0xpolicy_standard",
    createdAt: nowSec,
  };
  testIntent.intentHash = computeCanonicalIntentHash(testIntent);

  // 1. VERIFY SIMULATION EXPLICITLY LABELED
  console.log("[TEST 1/10] Verifying Local Simulation Adapter explicit labeling...");
  const simResult = await localAdapter.execute(testIntent, solverAddress, outputAmount, false);
  assert.strictEqual(simResult.isSimulated, true);
  assert.ok(simResult.transactionHash.startsWith("0x000"));
  console.log("✓ LocalSimulationAdapter explicitly flagged with isSimulated: true\n");

  // 2. READ BALANCES BEFORE EXECUTION (Req 17A, Req 7)
  console.log("[TEST 2/10] Reading Destination ERC20 Balances BEFORE Execution...");
  const recipientBalBefore = await getErc20Balance(destRpc, deployments.MockUSDC, recipientAddr);
  const solverBalBefore = await getErc20Balance(destRpc, deployments.MockUSDC, solverAddress);
  const vaultBalBefore = await getErc20Balance(destRpc, deployments.MockUSDC, deployments.DestinationVault);
  console.log(`✓ Recipient Balance Before: ${recipientBalBefore / 10n**6n} USDC (${recipientBalBefore.toString()} wei)`);
  console.log(`✓ Solver Balance Before:    ${solverBalBefore / 10n**6n} USDC (${solverBalBefore.toString()} wei)`);
  console.log(`✓ Vault Balance Before:     ${vaultBalBefore / 10n**6n} USDC (${vaultBalBefore.toString()} wei)\n`);

  // 3. EXECUTE REAL DESTINATIONVAULT.DEPOSITFULFILMENT (Req 17B, C, D, E)
  console.log("[TEST 3/10] Executing Real DestinationVault.depositFulfilment on Chain 31338...");
  const realResult = await evmAdapter.execute(testIntent, solverAddress, outputAmount, false);

  assert.strictEqual(realResult.status, "CONFIRMED");
  assert.ok(realResult.transactionHash.startsWith("0x"));
  assert.ok(!realResult.transactionHash.includes("000003eb"));
  assert.strictEqual(realResult.destinationChainId, 31338n);
  assert.strictEqual(realResult.outputAmount, outputAmount);
  assert.strictEqual(realResult.isSimulated, false);
  assert.ok(realResult.blockNumber > 0);
  console.log(`✓ Real EVM transaction confirmed! Tx Hash: ${realResult.transactionHash}, Block: ${realResult.blockNumber}, Gas: ${realResult.gasUsed}\n`);

  // 4. READ BALANCES AFTER EXECUTION & ASSERT EXACT DELTAS (Req 11, Req 12)
  console.log("[TEST 4/10] Reading Destination ERC20 Balances AFTER Execution & Asserting Money Flow (Req 11, 12)...");
  const recipientBalAfter = await getErc20Balance(destRpc, deployments.MockUSDC, recipientAddr);
  const solverBalAfter = await getErc20Balance(destRpc, deployments.MockUSDC, solverAddress);
  const vaultBalAfter = await getErc20Balance(destRpc, deployments.MockUSDC, deployments.DestinationVault);

  console.log(`✓ Recipient Balance After: ${recipientBalAfter / 10n**6n} USDC (${recipientBalAfter.toString()} wei)`);
  console.log(`✓ Solver Balance After:    ${solverBalAfter / 10n**6n} USDC (${solverBalAfter.toString()} wei)`);
  console.log(`✓ Vault Balance After:     ${vaultBalAfter / 10n**6n} USDC (${vaultBalAfter.toString()} wei)`);

  assert.strictEqual(recipientBalAfter, recipientBalBefore + outputAmount);
  assert.strictEqual(solverBalAfter, solverBalBefore - outputAmount);
  assert.strictEqual(vaultBalAfter - vaultBalBefore, 0n);
  console.log(`✓ Money-flow invariant VERIFIED: Recipient +${outputAmount / 10n**6n} USDC, Solver -${outputAmount / 10n**6n} USDC, Vault Net Delta 0 wei!\n`);

  // 5. ASSERT INTENT HASH ASSOCIATION & 7-POINT PROOF VERIFICATION
  console.log("[TEST 5/10] Verifying Intent Hash Association & 7-Point Cryptographic Proof...");
  assert.strictEqual(realResult.intentHash, testIntent.intentHash);
  const verification = verificationEngine.verifyExecution(testIntent, realResult);
  assert.strictEqual(verification.isValid, true);
  assert.strictEqual(verification.checks.intentHashMatch, true);
  assert.strictEqual(verification.checks.destinationChainMatch, true);
  assert.strictEqual(verification.checks.destinationTokenMatch, true);
  assert.strictEqual(verification.checks.recipientMatch, true);
  assert.strictEqual(verification.checks.minOutputSatisfied, true);
  assert.strictEqual(verification.checks.deadlineSatisfied, true);
  assert.strictEqual(verification.checks.transactionConfirmed, true);
  console.log("✓ All 7 cryptographic proof verification checks passed cleanly!\n");

  // 6. ASSERT SETTLEMENT OCCURS ONLY AFTER VERIFICATION
  console.log("[TEST 6/10] Auditing Settlement Gating (Settlement requires VALID status)...");
  const unverifiedResult = { ...realResult, status: "FAILED" };
  const failedVerification = verificationEngine.verifyExecution(testIntent, unverifiedResult);
  assert.strictEqual(failedVerification.isValid, false);
  console.log("✓ Security Invariant ENFORCED: Invalid proof strictly blocks settlement!\n");

  // 7. NEGATIVE TEST: WRONG DESTINATION CHAIN
  console.log("[TEST 7/10] Negative Test: Wrong Destination Chain...");
  const wrongChainResult = { ...realResult, destinationChainId: 99999n };
  const wrongChainVerif = verificationEngine.verifyExecution(testIntent, wrongChainResult);
  assert.strictEqual(wrongChainVerif.checks.destinationChainMatch, false);
  assert.strictEqual(wrongChainVerif.isValid, false);
  console.log("✓ Wrong destination chain ID correctly rejected!\n");

  // 8. NEGATIVE TEST: WRONG RECIPIENT
  console.log("[TEST 8/10] Negative Test: Wrong Recipient...");
  const wrongRecipientResult = { ...realResult, recipient: "0x0000000000000000000000000000000000009999" };
  const wrongRecipientVerif = verificationEngine.verifyExecution(testIntent, wrongRecipientResult);
  assert.strictEqual(wrongRecipientVerif.checks.recipientMatch, false);
  assert.strictEqual(wrongRecipientVerif.isValid, false);
  console.log("✓ Wrong recipient address correctly rejected!\n");

  // 9. NEGATIVE TEST: EXPIRED DEADLINE & INVALID INTENT HASH
  console.log("[TEST 9/10] Negative Test: Expired Deadline & Invalid Intent Hash...");
  const expiredIntent = { ...testIntent, deadline: nowSec - 1000n };
  const expiredVerif = verificationEngine.verifyExecution(expiredIntent, realResult);
  assert.strictEqual(expiredVerif.checks.deadlineSatisfied, false);
  assert.strictEqual(expiredVerif.isValid, false);

  const badHashResult = { ...realResult, intentHash: "0xbad_intent_hash_000000000000000000000000000000000000000000000000" };
  const badHashVerif = verificationEngine.verifyExecution(testIntent, badHashResult);
  assert.strictEqual(badHashVerif.checks.intentHashMatch, false);
  assert.strictEqual(badHashVerif.isValid, false);
  console.log("✓ Expired deadline and invalid intent hash correctly rejected!\n");

  // 10. NEGATIVE TEST: INSUFFICIENT DESTINATION BALANCE & FAILED TRANSACTION
  console.log("[TEST 10/10] Negative Test: Insufficient Destination Balance & Failed Transaction...");
  const brokeSolverRes = await evmAdapter.execute(testIntent, "0x0000000000000000000000000000000000000001", outputAmount, false);
  assert.strictEqual(brokeSolverRes.status, "FAILED");

  const simulatedFailedRes = await evmAdapter.execute(testIntent, solverAddress, outputAmount, true);
  assert.strictEqual(simulatedFailedRes.status, "FAILED");
  console.log("✓ Insufficient solver balance and failed transactions correctly handled!\n");

  console.log(`====================================================`);
  console.log(`  REAL DESTINATION EXECUTION SUITE PASSED CLEANLY!  `);
  console.log(`====================================================\n`);
}

runRealDestinationExecutionTests().catch((err) => {
  console.error("❌ Real Destination Execution Test Failed:", err);
  process.exit(1);
});
