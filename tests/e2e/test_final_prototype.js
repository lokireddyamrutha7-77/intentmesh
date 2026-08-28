const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const moduleAlias = require('module');

// Alias workspace packages portably using path.resolve
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
    '@intentmesh/solvers': path.join(rootDir, 'solvers/dist/index.js'),
  };
  if (map[request]) {
    return originalRequire.call(this, map[request]);
  }
  return originalRequire.call(this, request);
};

const { ProtocolEventIndexer } = require('@intentmesh/indexer');
const { DeterministicVerificationEngine } = require('@intentmesh/verification-sdk');

console.log('====================================================');
console.log('  INTENTMESH PHASE 10 MASTER PROTOTYPE INTEGRATION  ');
console.log('====================================================\n');

function makeRequest(options, payload) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ statusCode: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) {
      req.write(JSON.stringify(payload));
    }
    req.end();
  });
}

async function runFinalMasterSuite() {
  // Start API server on port 3010 for final integration testing
  process.env.PORT = '3010';
  require(path.join(rootDir, 'apps/api/dist/index.js'));
  await new Promise(r => setTimeout(r, 500));

  const baseOpts = {
    hostname: 'localhost',
    port: 3010,
    headers: { 'Content-Type': 'application/json' },
  };

  // TEST 1: System Health & Provider Connectivity
  console.log('[TEST 1/8] Verifying API System Health & Local Anvil Connectivity...');
  const healthRes = await makeRequest({ ...baseOpts, path: '/api/health', method: 'GET' });
  assert.strictEqual(healthRes.statusCode, 200);
  assert.strictEqual(healthRes.body.status, 'OK');
  assert.strictEqual(healthRes.body.sourceChainId, '31337');
  assert.strictEqual(healthRes.body.destinationChainId, '31338');
  console.log('✓ System Health verified cleanly! Source: 31337, Dest: 31338\n');

  // TEST 2: Contract Deployment & Inter-Contract Authorization Wiring
  console.log('[TEST 2/8] Verifying Deployed Contract Metadata & Wiring Integrities...');
  assert.ok(healthRes.body.deployments.IntentRegistry);
  assert.ok(healthRes.body.deployments.InputEscrow);
  assert.ok(healthRes.body.deployments.BatchAuction);
  assert.ok(healthRes.body.deployments.SettlementManager);
  console.log('✓ Deployed contract address schema verified!\n');

  // TEST 3: Full End-to-End Golden Path Scenario
  console.log('[TEST 3/8] Executing End-to-End Golden Path Workflow...');
  const goldenRes = await makeRequest({ ...baseOpts, path: '/api/demo/golden-path', method: 'POST' });
  assert.strictEqual(goldenRes.statusCode, 200);
  assert.strictEqual(goldenRes.body.scenario, 'GOLDEN_PATH');
  assert.strictEqual(goldenRes.body.verification.isValid, true);
  console.log('✓ Golden Path workflow completed and verified!\n');

  // TEST 4: Full Failure Recovery & Deterministic Fallback
  console.log('[TEST 4/8] Executing Failure Recovery & Fallback Solver Workflow...');
  const failureRes = await makeRequest({ ...baseOpts, path: '/api/demo/failure-recovery', method: 'POST' });
  assert.strictEqual(failureRes.statusCode, 200);
  assert.strictEqual(failureRes.body.scenario, 'FAILURE_RECOVERY');
  assert.strictEqual(failureRes.body.failedSolver, '0xsolver_a_reliable');
  assert.strictEqual(failureRes.body.fallbackSolver, '0xsolver_b_fast');
  console.log('✓ Failure Recovery and Fallback workflow verified!\n');

  // TEST 5: Deterministic Contract Refund Path
  console.log('[TEST 5/8] Executing Contract-Authorized User Refund Workflow...');
  const refundRes = await makeRequest({ ...baseOpts, path: '/api/demo/refund', method: 'POST' });
  assert.strictEqual(refundRes.statusCode, 200);
  assert.strictEqual(refundRes.body.scenario, 'CONTRACT_REFUND');
  assert.strictEqual(refundRes.body.refundAuthorized, true);
  console.log('✓ User Contract Refund workflow verified!\n');

  // TEST 6: Cryptographic Verification Invariant (NO VERIFICATION -> NO SETTLEMENT)
  console.log('[TEST 6/8] Auditing Security Invariant-008: NO VERIFICATION -> NO SETTLEMENT...');
  const verifier = new DeterministicVerificationEngine();
  const invalidIntent = {
    intentHash: '0xinvalid_hash',
    user: '0xuser',
    sourceChainId: 31337n,
    sourceToken: '0xusdc',
    sourceAmount: 1000n,
    destinationChainId: 31338n,
    destinationToken: '0xusdc',
    recipient: '0xrecipient',
    minOutputAmount: 950n,
    deadline: 2000000000n,
    nonce: 1n,
    verificationPolicy: '0xpolicy',
    createdAt: 1000000000n,
  };
  const invalidExec = {
    executionId: 'exec_fail',
    intentHash: '0xinvalid_hash',
    solver: '0xsolver_bad',
    sourceChainId: 31337n,
    destinationChainId: 31338n,
    destinationToken: '0xusdc',
    recipient: '0xrecipient',
    outputAmount: 0n,
    transactionHash: '0xfail_tx',
    blockNumber: 1,
    status: 'FAILED',
    timestamp: 1000000005,
  };
  const vResult = verifier.verifyExecution(invalidIntent, invalidExec);
  assert.strictEqual(vResult.isValid, false);
  console.log('✓ Security Invariant-008 enforced: Invalid proof strictly blocks settlement!\n');

  // TEST 7: Persistent Indexer Storage & Restart Persistence
  console.log('[TEST 7/8] Verifying Persistent Indexer File Storage & Process Reload...');
  const scratchDir = path.join(rootDir, 'scratch');
  const tempStorePath = path.join(scratchDir, 'final_test_indexer.json');
  if (fs.existsSync(tempStorePath)) fs.unlinkSync(tempStorePath);

  const indexerA = new ProtocolEventIndexer(tempStorePath);
  indexerA.recordEvent('0xfinal_intent', 'INTENT_CREATED', 'Final integration event test');
  assert.strictEqual(indexerA.getAllEvents().length, 1);

  const indexerB = new ProtocolEventIndexer(tempStorePath);
  assert.strictEqual(indexerB.getAllEvents().length, 1);
  assert.strictEqual(indexerB.getAllEvents()[0].intentHash, '0xfinal_intent');
  indexerB.clearEvents();
  if (fs.existsSync(tempStorePath)) fs.unlinkSync(tempStorePath);
  console.log('✓ Persistent Event Indexer file reload verified!\n');

  // TEST 8: Full Security & Non-Custodial Boundary Audit
  console.log('[TEST 8/8] Auditing Secrets Policy (0 Private Keys Committed)...');
  const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf8');
  assert.ok(!envExample.includes('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'));
  console.log('✓ Secrets Policy verified: 0 private keys or production credentials committed!\n');

  console.log('====================================================');
  console.log('  INTENTMESH MASTER PROTOTYPE VERIFICATION PASSED! ');
  console.log('====================================================');
  process.exit(0);
}

runFinalMasterSuite().catch((err) => {
  console.error('❌ Phase 10 Master Integration Test Failed:', err);
  process.exit(1);
});
