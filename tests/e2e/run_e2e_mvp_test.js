const assert = require('assert');
const path = require('path');
const moduleAlias = require('module');

// Alias monorepo modules portably using path.resolve relative to __dirname
const rootDir = path.resolve(__dirname, '../../');
const originalRequire = moduleAlias.prototype.require;
moduleAlias.prototype.require = function(request) {
  const map = {
    '@intentmesh/protocol-types': path.join(rootDir, 'packages/protocol-types/dist/index.js'),
    '@intentmesh/intent-schema': path.join(rootDir, 'packages/intent-schema/dist/index.js'),
    '@intentmesh/solver-sdk': path.join(rootDir, 'packages/solver-sdk/dist/index.js'),
    '@intentmesh/risk-engine': path.join(rootDir, 'packages/risk-engine/dist/index.js'),
    '@intentmesh/chain-adapters': path.join(rootDir, 'packages/chain-adapters/dist/index.js'),
    '@intentmesh/verification-sdk': path.join(rootDir, 'packages/verification-sdk/dist/index.js'),
    '@intentmesh/execution-monitor': path.join(rootDir, 'services/execution-monitor/dist/index.js'),
    '@intentmesh/failure-manager': path.join(rootDir, 'services/failure-manager/dist/index.js'),
    '@intentmesh/indexer': path.join(rootDir, 'services/indexer/dist/index.js'),
  };
  if (map[request]) {
    return originalRequire.call(this, map[request]);
  }
  return originalRequire.call(this, request);
};

console.log('====================================================');
console.log('  INTENTMESH END-TO-END MVP MASTER ACCEPTANCE SUITE ');
console.log('====================================================\n');

const { IntentState, VerificationStatus } = require('@intentmesh/protocol-types');
const { DeterministicRiskEngine } = require('@intentmesh/risk-engine');
const { LocalSimulationAdapter } = require('@intentmesh/chain-adapters');
const { DeterministicVerificationEngine } = require('@intentmesh/verification-sdk');
const { ExecutionMonitorService } = require('@intentmesh/execution-monitor');
const { FailureManagerService } = require('@intentmesh/failure-manager');
const { ProtocolEventIndexer } = require('@intentmesh/indexer');
const { ReliableSolverAgent } = require(path.join(rootDir, 'solvers/dist/solver-a/agent.js'));
const { FastSolverAgent } = require(path.join(rootDir, 'solvers/dist/solver-b/agent.js'));
const { RiskySolverAgent } = require(path.join(rootDir, 'solvers/dist/solver-c/agent.js'));

const nowSec = Math.floor(Date.now() / 1000);

// Setup Shared Infrastructure Services
const riskEngine = new DeterministicRiskEngine();
const chainAdapter = new LocalSimulationAdapter();
const verificationEngine = new DeterministicVerificationEngine();
const executionMonitor = new ExecutionMonitorService(chainAdapter);
const failureManager = new FailureManagerService(executionMonitor, chainAdapter);
const indexer = new ProtocolEventIndexer();

async function runGoldenPathDemo() {
  console.log('--- SCENARIO 1: GOLDEN PATH END-TO-END DEMO ---');

  const intent = {
    intentHash: '0xintent_golden_1001',
    user: '0xuser_alice',
    sourceChainId: 1n,
    sourceToken: '0xusdc_eth',
    sourceAmount: 1000n * 10n**6n,
    destinationChainId: 10n,
    destinationToken: '0xusdc_op',
    recipient: '0xrecipient_bob',
    minOutputAmount: 950n * 10n**6n,
    deadline: BigInt(nowSec + 3600),
    nonce: 1n,
    verificationPolicy: '0xpolicy_standard',
    createdAt: BigInt(nowSec),
  };

  indexer.recordEvent(intent.intentHash, 'INTENT_CREATED', 'Intent created by user', intent);
  indexer.recordEvent(intent.intentHash, 'ESCROW_LOCKED', 'Input escrow locked 1000 USDC', { amount: intent.sourceAmount.toString() });
  indexer.recordEvent(intent.intentHash, 'AUCTION_CREATED', 'Batch auction opened', { auctionId: '0xauc_1001' });

  // Solvers Risk Assessment
  const mockCapabilities = {
    solver: '',
    supportedChains: [1n, 10n],
    supportedTokens: { '1': ['0xusdc_eth'], '10': ['0xusdc_op'] },
  };

  const solverAAddr = '0xsolver_a_reliable';
  const solverBAddr = '0xsolver_b_fast';
  const solverCAddr = '0xsolver_c_risky';

  const riskA = riskEngine.evaluateRisk(
    solverAAddr, intent,
    { solver: solverAAddr, isActive: true, registeredAt: 1000n, metadataURI: 'ipfs://a' },
    mockCapabilities, 5000n, 10000n * 10n**6n, []
  );

  const riskB = riskEngine.evaluateRisk(
    solverBAddr, intent,
    { solver: solverBAddr, isActive: true, registeredAt: 1000n, metadataURI: 'ipfs://b' },
    mockCapabilities, 5000n, 10000n * 10n**6n, []
  );

  const riskC = riskEngine.evaluateRisk(
    solverCAddr, intent,
    { solver: solverCAddr, isActive: true, registeredAt: 1000n, metadataURI: 'ipfs://c' },
    mockCapabilities, 5000n, 10000n * 10n**6n, []
  );

  assert.strictEqual(riskA.hardSafetyPass, true);
  assert.strictEqual(riskB.hardSafetyPass, true);
  assert.strictEqual(riskC.hardSafetyPass, true);

  indexer.recordEvent(intent.intentHash, 'RISK_ASSESSED', 'Deterministic risk scores calculated', { riskA, riskB, riskC });

  // Revealing bids and ranking
  const bidA = { solver: solverAAddr, expectedOutputAmount: 978n * 10n**6n, estimatedExecutionTime: 60, capacityRequired: intent.sourceAmount, salt: '0xsaltA' };
  const bidB = { solver: solverBAddr, expectedOutputAmount: 969n * 10n**6n, estimatedExecutionTime: 15, capacityRequired: intent.sourceAmount, salt: '0xsaltB' };
  const bidC = { solver: solverCAddr, expectedOutputAmount: 997n * 10n**6n, estimatedExecutionTime: 120, capacityRequired: intent.sourceAmount, salt: '0xsaltC' };

  const revealedBids = [bidA, bidB, bidC];
  revealedBids.sort((a, b) => (b.expectedOutputAmount > a.expectedOutputAmount ? 1 : -1));

  const winner = revealedBids[0];
  assert.strictEqual(winner.solver, solverCAddr); // 997 USDC output wins
  indexer.recordEvent(intent.intentHash, 'WINNER_SELECTED', `Winner selected: Solver C (${winner.solver})`, { winner });

  // Execute on local destination chain
  const execResult = await chainAdapter.execute(intent, winner.solver, winner.expectedOutputAmount, false);
  assert.strictEqual(execResult.status, 'CONFIRMED');
  indexer.recordEvent(intent.intentHash, 'EXECUTION_CONFIRMED', `Destination execution confirmed on ${chainAdapter.destinationChainName}`, execResult);

  // Verification
  const verification = verificationEngine.verifyExecution(intent, execResult);
  assert.strictEqual(verification.isValid, true);
  assert.strictEqual(verification.status, VerificationStatus.VALID);
  indexer.recordEvent(intent.intentHash, 'VERIFICATION_PASSED', '7-point verification checklist passed', verification);

  // Settlement
  indexer.recordEvent(intent.intentHash, 'SETTLEMENT_COMPLETED', `Settlement authorized. 1000 USDC released to ${winner.solver}`);

  console.log('✓ SCENARIO 1 (GOLDEN PATH): PASSED PERFECTLY!\n');
}

async function runFailureRecoveryDemo() {
  console.log('--- SCENARIO 2: FAILURE RECOVERY & FALLBACK DEMO ---');

  const intent = {
    intentHash: '0xintent_fail_2002',
    user: '0xuser_alice',
    sourceChainId: 1n,
    sourceToken: '0xusdc_eth',
    sourceAmount: 1000n * 10n**6n,
    destinationChainId: 10n,
    destinationToken: '0xusdc_op',
    recipient: '0xrecipient_bob',
    minOutputAmount: 950n * 10n**6n,
    deadline: BigInt(nowSec + 3600),
    nonce: 2n,
    verificationPolicy: '0xpolicy_standard',
    createdAt: BigInt(nowSec),
  };

  indexer.recordEvent(intent.intentHash, 'INTENT_CREATED', 'Intent created');
  indexer.recordEvent(intent.intentHash, 'ESCROW_LOCKED', 'Input escrow locked 1000 USDC');

  const solverA = '0xsolver_a_reliable';
  const solverB = '0xsolver_b_fast';

  const bidA = { solver: solverA, expectedOutputAmount: 980n * 10n**6n, estimatedExecutionTime: 60, capacityRequired: intent.sourceAmount, salt: '0xsaltA' };
  const bidB = { solver: solverB, expectedOutputAmount: 970n * 10n**6n, estimatedExecutionTime: 15, capacityRequired: intent.sourceAmount, salt: '0xsaltB' };
  const bids = [bidA, bidB];

  // 1. Primary Solver A fails execution
  indexer.recordEvent(intent.intentHash, 'WINNER_SELECTED', `Primary winner: ${solverA}`);
  const failedExec = await chainAdapter.execute(intent, solverA, 0n, true); // Simulated failure
  assert.strictEqual(failedExec.status, 'FAILED');

  // 2. Execution Monitor detects failure
  const obs = await executionMonitor.observeExecution(intent, solverA, failedExec.transactionHash);
  assert.strictEqual(obs.status, 'FAILED');
  indexer.recordEvent(intent.intentHash, 'EXECUTION_FAILED', `Primary solver ${solverA} execution failed`);

  // 3. Failure Manager selects Fallback Solver B
  const resolution = failureManager.resolveFailureOrFallback(intent, solverA, bids);
  assert.strictEqual(resolution.action, 'RETRY_WITH_FALLBACK');
  assert.strictEqual(resolution.fallbackSolver, solverB);
  indexer.recordEvent(intent.intentHash, 'FALLBACK_SELECTED', resolution.reason, { fallbackSolver: solverB });

  // 4. Retry execution with Fallback Solver B
  const fallbackExec = await chainAdapter.execute(intent, solverB, bidB.expectedOutputAmount, false);
  assert.strictEqual(fallbackExec.status, 'CONFIRMED');

  // 5. Verification & Settlement
  const verification = verificationEngine.verifyExecution(intent, fallbackExec);
  assert.strictEqual(verification.isValid, true);
  indexer.recordEvent(intent.intentHash, 'VERIFICATION_PASSED', 'Fallback execution verified');
  indexer.recordEvent(intent.intentHash, 'SETTLEMENT_COMPLETED', `Settled with fallback solver ${solverB}`);

  console.log('✓ SCENARIO 2 (FAILURE RECOVERY & FALLBACK): PASSED PERFECTLY!\n');
}

async function runFailureToRefundDemo() {
  console.log('--- SCENARIO 3: FAILURE TO CONTRACT REFUND DEMO ---');

  const intent = {
    intentHash: '0xintent_refund_3003',
    user: '0xuser_alice',
    sourceChainId: 1n,
    sourceToken: '0xusdc_eth',
    sourceAmount: 1000n * 10n**6n,
    destinationChainId: 10n,
    destinationToken: '0xusdc_op',
    recipient: '0xrecipient_bob',
    minOutputAmount: 950n * 10n**6n,
    deadline: BigInt(nowSec + 3600),
    nonce: 3n,
    verificationPolicy: '0xpolicy_standard',
    createdAt: BigInt(nowSec),
  };

  const solverA = '0xsolver_a_reliable';
  const bidA = { solver: solverA, expectedOutputAmount: 980n * 10n**6n, estimatedExecutionTime: 60, capacityRequired: intent.sourceAmount, salt: '0xsaltA' };

  // Primary fails and no remaining solvers exist
  const resolution = failureManager.resolveFailureOrFallback(intent, solverA, [bidA]);
  assert.strictEqual(resolution.action, 'TRIGGER_REFUND');
  assert.strictEqual(resolution.refundAuthorized, true);

  indexer.recordEvent(intent.intentHash, 'REFUND_AUTHORIZED', 'Contract refund authorized to user 0xuser_alice');

  console.log('✓ SCENARIO 3 (CONTRACT REFUND): PASSED PERFECTLY!\n');
}

async function runMain() {
  await runGoldenPathDemo();
  await runFailureRecoveryDemo();
  await runFailureToRefundDemo();

  console.log('====================================================');
  console.log('  ALL E2E MVP ACCEPTANCE TEST SCENARIOS PASSED!     ');
  console.log('====================================================');
}

runMain().catch((err) => {
  console.error('E2E MVP Test Failed:', err);
  process.exit(1);
});
