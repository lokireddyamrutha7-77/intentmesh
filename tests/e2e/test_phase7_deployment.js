const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('  INTENTMESH PHASE 7 LOCAL ANVIL DEPLOYMENT SMOKE   ');
console.log('====================================================\n');

const rootDir = path.resolve(__dirname, '../../');
const contractsDir = path.join(rootDir, 'contracts');

function getForgeCommand() {
  const foundryBin = path.join(process.env.USERPROFILE || process.env.HOME || '', '.foundry/bin/forge.exe');
  if (fs.existsSync(foundryBin)) {
    return `"${foundryBin}"`;
  }
  return 'forge';
}

const forgeCmd = getForgeCommand();

// 1. Run Foundry Phase 7 Native EVM Deployment Smoke Test Suite
console.log('[1/3] Running Phase 7 Native EVM Deployment Smoke Test...');
try {
  const output = execSync(`${forgeCmd} test --match-contract Phase7DeploymentSmokeTest -vvv`, {
    cwd: contractsDir,
    encoding: 'utf8',
  });
  console.log(output);
  console.log('✓ Phase 7 EVM Smoke Test Suite PASSED cleanly!\n');
} catch (err) {
  console.error('❌ Phase 7 EVM Smoke Test Failed:', err.stdout || err.message);
  process.exit(1);
}

// 2. Execute DeployScript to output local deployment JSON artifact
console.log('[2/3] Executing DeployScript to generate machine-readable metadata...');
try {
  const scriptOutput = execSync(`${forgeCmd} script script/Deploy.s.sol:DeployScript`, {
    cwd: contractsDir,
    encoding: 'utf8',
  });
  console.log(scriptOutput);
  console.log('✓ DeployScript executed cleanly!\n');
} catch (err) {
  console.error('❌ DeployScript Execution Failed:', err.stdout || err.message);
  process.exit(1);
}

// 3. Inspect generated deployment JSON metadata artifact
console.log('[3/3] Verifying generated deployment metadata artifact...');
const artifactPath = path.join(contractsDir, 'deployments/deployments-31337.json');

if (!fs.existsSync(artifactPath)) {
  console.error(`❌ Missing deployment artifact at ${artifactPath}`);
  process.exit(1);
}

const metadata = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const requiredContracts = [
  'IntentRegistry',
  'InputEscrow',
  'SolverRegistry',
  'SolverBondManager',
  'CapacityRegistry',
  'BatchAuction',
  'DestinationVault',
  'VerificationAdapter',
  'ReputationRegistry',
  'SettlementManager',
  'MockUSDC',
];

console.log('Deployed Contract Addresses Verified:');
for (const name of requiredContracts) {
  const addr = metadata[name];
  if (!addr || typeof addr !== 'string' || !addr.startsWith('0x') || addr.length !== 42 || addr === '0x0000000000000000000000000000000000000000') {
    console.error(`❌ Invalid or zero address for ${name}: ${addr}`);
    process.exit(1);
  }
  console.log(`  ✓ ${name.padEnd(20)}: ${addr}`);
}

console.log('\n====================================================');
console.log('  PHASE 7 ANVIL DEPLOYMENT & INTEGRATION PASSED!   ');
console.log('====================================================');
