const assert = require('assert');
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

console.log('====================================================');
console.log('  INTENTMESH PHASE 8 BACKEND API ACCEPTANCE SUITE   ');
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

async function runApiTests() {
  // Start API server on port 3009 for testing
  process.env.PORT = '3009';
  require(path.join(rootDir, 'apps/api/dist/index.js'));

  // Give server time to bind
  await new Promise(r => setTimeout(r, 500));

  const baseOptions = {
    hostname: 'localhost',
    port: 3009,
    headers: { 'Content-Type': 'application/json' },
  };

  // 1. GET /health
  console.log('[1/10] Testing GET /api/health...');
  const health = await makeRequest({ ...baseOptions, path: '/api/health', method: 'GET' });
  assert.strictEqual(health.statusCode, 200);
  assert.strictEqual(health.body.status, 'OK');
  assert.strictEqual(health.body.sourceChainId, '31337');
  console.log('✓ Health endpoint verified!\n');

  // 2. POST /api/intents (Valid Creation)
  console.log('[2/10] Testing POST /api/intents (Valid Intent Creation)...');
  const validIntentPayload = {
    user: '0xuser_alice',
    sourceAmount: '1000000000',
    minOutputAmount: '950000000',
    recipient: '0xrecipient_bob',
  };
  const createRes = await makeRequest({ ...baseOptions, path: '/api/intents', method: 'POST' }, validIntentPayload);
  assert.strictEqual(createRes.statusCode, 201);
  assert.ok(createRes.body.intentHash);
  const createdHash = createRes.body.intentHash;
  console.log(`✓ Intent created! Canonical Hash: ${createdHash}\n`);

  // 3. POST /api/intents (Invalid Schema - Zero Amount)
  console.log('[3/10] Testing POST /api/intents (Invalid Zero Amount Handling)...');
  const invalidIntentPayload = { user: '0xuser_alice', sourceAmount: '0', minOutputAmount: '950000000' };
  const invalidRes = await makeRequest({ ...baseOptions, path: '/api/intents', method: 'POST' }, invalidIntentPayload);
  assert.strictEqual(invalidRes.statusCode, 400);
  assert.strictEqual(invalidRes.body.error.code, 'INVALID_SOURCE_AMOUNT');
  console.log('✓ Invalid intent correctly rejected with structured 400 error!\n');

  // 4. GET /api/intents/:intentHash
  console.log('[4/10] Testing GET /api/intents/:intentHash...');
  const getHashRes = await makeRequest({ ...baseOptions, path: `/api/intents/${createdHash}`, method: 'GET' });
  assert.strictEqual(getHashRes.statusCode, 200);
  assert.strictEqual(getHashRes.body.intent.intentHash, createdHash);
  console.log('✓ Intent state retrieved cleanly!\n');

  // 5. GET /api/solvers & /api/solvers/:solver
  console.log('[5/10] Testing GET /api/solvers & GET /api/solvers/:solver...');
  const solversRes = await makeRequest({ ...baseOptions, path: '/api/solvers', method: 'GET' });
  assert.strictEqual(solversRes.statusCode, 200);
  assert.ok(solversRes.body.solvers.length >= 3);

  const solverA = await makeRequest({ ...baseOptions, path: '/api/solvers/0xsolver_a_reliable', method: 'GET' });
  assert.strictEqual(solverA.statusCode, 200);
  assert.strictEqual(solverA.body.solver.solver, '0xsolver_a_reliable');
  console.log('✓ Solver registry endpoints verified!\n');

  // 6. POST /api/auctions & GET /api/auctions/:auctionId
  console.log('[6/10] Testing POST /api/auctions & GET /api/auctions/:auctionId...');
  const auctionRes = await makeRequest({ ...baseOptions, path: '/api/auctions', method: 'POST' }, { intentHash: createdHash });
  assert.strictEqual(auctionRes.statusCode, 201);
  assert.ok(auctionRes.body.auction.auctionId);

  const auctionId = auctionRes.body.auction.auctionId;
  const getAuctionRes = await makeRequest({ ...baseOptions, path: `/api/auctions/${auctionId}`, method: 'GET' });
  assert.strictEqual(getAuctionRes.statusCode, 200);
  assert.strictEqual(getAuctionRes.body.auction.auctionId, auctionId);
  console.log('✓ Commit-reveal auction endpoints verified!\n');

  // 7. GET /api/risk/:solver
  console.log('[7/10] Testing GET /api/risk/:solver...');
  const riskRes = await makeRequest({ ...baseOptions, path: '/api/risk/0xsolver_a_reliable', method: 'GET' });
  console.log('Risk Response Body:', JSON.stringify(riskRes.body, null, 2));
  assert.strictEqual(riskRes.statusCode, 200);
  assert.strictEqual(riskRes.body.assessment.hardSafetyPass, true);
  assert.ok(riskRes.body.assessment.riskScore >= 0);
  console.log(`✓ Risk engine API verified! Composite Score: ${riskRes.body.assessment.riskScore}\n`);

  // 8. POST /api/demo/golden-path
  console.log('[8/10] Testing POST /api/demo/golden-path...');
  const goldenRes = await makeRequest({ ...baseOptions, path: '/api/demo/golden-path', method: 'POST' });
  assert.strictEqual(goldenRes.statusCode, 200);
  assert.strictEqual(goldenRes.body.scenario, 'GOLDEN_PATH');
  assert.strictEqual(goldenRes.body.verification.isValid, true);
  console.log('✓ Demo Golden Path endpoint verified!\n');

  // 9. POST /api/demo/failure-recovery
  console.log('[9/10] Testing POST /api/demo/failure-recovery...');
  const failureRes = await makeRequest({ ...baseOptions, path: '/api/demo/failure-recovery', method: 'POST' });
  assert.strictEqual(failureRes.statusCode, 200);
  assert.strictEqual(failureRes.body.scenario, 'FAILURE_RECOVERY');
  assert.strictEqual(failureRes.body.resolution.fallbackSolver, '0xsolver_b_fast');
  console.log('✓ Demo Failure Recovery endpoint verified!\n');

  // 10. POST /api/demo/refund & GET /api/events
  console.log('[10/10] Testing POST /api/demo/refund & GET /api/events...');
  const refundRes = await makeRequest({ ...baseOptions, path: '/api/demo/refund', method: 'POST' });
  assert.strictEqual(refundRes.statusCode, 200);
  assert.strictEqual(refundRes.body.refundAuthorized, true);

  const eventsRes = await makeRequest({ ...baseOptions, path: '/api/events', method: 'GET' });
  assert.strictEqual(eventsRes.statusCode, 200);
  assert.ok(eventsRes.body.events.length > 5);
  console.log(`✓ Demo Refund and Event Ticker endpoints verified! Total events: ${eventsRes.body.events.length}\n`);

  console.log('====================================================');
  console.log('  ALL PHASE 8 BACKEND API ACCEPTANCE TESTS PASSED! ');
  console.log('====================================================');
  process.exit(0);
}

runApiTests().catch((err) => {
  console.error('❌ Phase 8 API Acceptance Test Failed:', err);
  process.exit(1);
});
