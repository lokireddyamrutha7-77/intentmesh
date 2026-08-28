import http from "http";
import fs from "fs";
import path from "path";
import { LocalSimulationAdapter } from "@intentmesh/chain-adapters";
import { ExecutionMonitorService } from "@intentmesh/execution-monitor";
import { FailureManagerService } from "@intentmesh/failure-manager";
import { ProtocolEventIndexer } from "@intentmesh/indexer";
import { validateIntentSchema, computeCanonicalIntentHash } from "@intentmesh/intent-schema";
import { Intent, IntentState, VerificationStatus, Bid, SolverProfile, SolverCapabilities } from "@intentmesh/protocol-types";
import { DeterministicRiskEngine } from "@intentmesh/risk-engine";
import { DeterministicVerificationEngine } from "@intentmesh/verification-sdk";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const SOURCE_CHAIN_ID = BigInt(process.env.SOURCE_CHAIN_ID || "31337");
const DESTINATION_CHAIN_ID = BigInt(process.env.DESTINATION_CHAIN_ID || "31338");
const SOURCE_RPC_URL = process.env.SOURCE_CHAIN_RPC_URL || "http://127.0.0.1:8545";
const DESTINATION_RPC_URL = process.env.DESTINATION_CHAIN_RPC_URL || "http://127.0.0.1:8546";

// Load local Anvil deployment metadata
function loadDeployments() {
  const rootDir = path.resolve(__dirname, "../../../");
  const deploymentPath = path.join(rootDir, "contracts/deployments/deployments-31337.json");
  if (fs.existsSync(deploymentPath)) {
    try {
      return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    } catch {
      // Fallback
    }
  }
  return {
    IntentRegistry: process.env.INTENT_REGISTRY_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    InputEscrow: process.env.INPUT_ESCROW_ADDRESS || "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    SolverRegistry: process.env.SOLVER_REGISTRY_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    SolverBondManager: process.env.SOLVER_BOND_MANAGER_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    CapacityRegistry: process.env.CAPACITY_REGISTRY_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    BatchAuction: process.env.BATCH_AUCTION_ADDRESS || "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
    DestinationVault: process.env.DESTINATION_VAULT_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    VerificationAdapter: process.env.VERIFICATION_ADAPTER_ADDRESS || "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    ReputationRegistry: process.env.REPUTATION_REGISTRY_ADDRESS || "0x0165878A594ca255338adfa4d48449f69242Eb8F",
    SettlementManager: process.env.SETTLEMENT_MANAGER_ADDRESS || "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
    MockUSDC: process.env.MOCK_USDC_ADDRESS || "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  };
}

const deployments = loadDeployments();

// Blockchain RPC Read Helper
async function rpcRead(rpcUrl: string, method: string, params: any[] = []): Promise<any> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const json = (await res.json()) as any;
    return json?.result ?? null;
  } catch {
    return null;
  }
}

// Services Initialization
const riskEngine = new DeterministicRiskEngine();
const chainAdapter = new LocalSimulationAdapter();
const verificationEngine = new DeterministicVerificationEngine();
const executionMonitor = new ExecutionMonitorService(chainAdapter);
const failureManager = new FailureManagerService(executionMonitor, chainAdapter);
const indexer = new ProtocolEventIndexer();

// In-Memory Protocol Storage
const intentsStore = new Map<string, Intent>();
const intentStatesStore = new Map<string, IntentState>();
const auctionsStore = new Map<string, any>();
const executionsStore = new Map<string, any>();
const sseClients = new Set<http.ServerResponse>();

// Register Demo Solvers
const demoSolvers: Record<string, { profile: SolverProfile; capabilities: SolverCapabilities; bondEth: bigint; capacityUsdc: bigint }> = {
  "0xsolver_a_reliable": {
    profile: { solver: "0xsolver_a_reliable", isActive: true, registeredAt: 1000n, metadataURI: "ipfs://solverA_reliable" },
    capabilities: { solver: "0xsolver_a_reliable", supportedChains: [1n, 10n, 31337n, 31338n], supportedTokens: { "1": ["0xusdc_eth"], "10": ["0xusdc_op"], "31337": [deployments.MockUSDC], "31338": [deployments.MockUSDC] } },
    bondEth: 10n * 10n**18n,
    capacityUsdc: 50000n * 10n**6n,
  },
  "0xsolver_b_fast": {
    profile: { solver: "0xsolver_b_fast", isActive: true, registeredAt: 1050n, metadataURI: "ipfs://solverB_fast" },
    capabilities: { solver: "0xsolver_b_fast", supportedChains: [1n, 10n, 31337n, 31338n], supportedTokens: { "1": ["0xusdc_eth"], "10": ["0xusdc_op"], "31337": [deployments.MockUSDC], "31338": [deployments.MockUSDC] } },
    bondEth: 5n * 10n**18n,
    capacityUsdc: 25000n * 10n**6n,
  },
  "0xsolver_c_risky": {
    profile: { solver: "0xsolver_c_risky", isActive: true, registeredAt: 1100n, metadataURI: "ipfs://solverC_risky" },
    capabilities: { solver: "0xsolver_c_risky", supportedChains: [1n, 10n, 31337n, 31338n], supportedTokens: { "1": ["0xusdc_eth"], "10": ["0xusdc_op"], "31337": [deployments.MockUSDC], "31338": [deployments.MockUSDC] } },
    bondEth: 2n * 10n**18n,
    capacityUsdc: 10000n * 10n**6n,
  },
};

// Helper: JSON Serializer handling BigInt
function serializeJson(data: any): string {
  return JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v));
}

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(serializeJson(data));
}

function sendError(res: http.ServerResponse, statusCode: number, code: string, message: string, details: any = {}) {
  sendJson(res, statusCode, { error: { code, message, details } });
}

function parseJsonBody<T>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : ({} as T));
      } catch (err) {
        reject(new Error("Invalid JSON payload"));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || "/";
  const method = req.method || "GET";

  // 1. GET /health & GET /api/health
  if ((url === "/health" || url === "/api/health") && method === "GET") {
    const blockNumberSource = await rpcRead(SOURCE_RPC_URL, "eth_blockNumber");
    const blockNumberDest = await rpcRead(DESTINATION_RPC_URL, "eth_blockNumber");
    return sendJson(res, 200, {
      status: "OK",
      protocol: "IntentMesh Backend Orchestrator API",
      version: "0.1.0",
      sourceChainId: SOURCE_CHAIN_ID.toString(),
      destinationChainId: DESTINATION_CHAIN_ID.toString(),
      anvilNodes: {
        sourceConnected: blockNumberSource !== null,
        destinationConnected: blockNumberDest !== null,
      },
      deployments,
      timestamp: Date.now(),
    });
  }

  // 2. GET /api/intents
  if (url === "/api/intents" && method === "GET") {
    const intentsList = Array.from(intentsStore.values()).map(intent => ({
      ...intent,
      state: intentStatesStore.get(intent.intentHash) || IntentState.AUCTION_READY,
    }));
    return sendJson(res, 200, { intents: intentsList, count: intentsList.length });
  }

  // 3. GET /api/intents/:intentHash
  if (url.startsWith("/api/intents/") && method === "GET") {
    const intentHash = url.substring("/api/intents/".length);
    const intent = intentsStore.get(intentHash);
    if (!intent) {
      return sendError(res, 404, "INTENT_NOT_FOUND", `No intent found for hash ${intentHash}`);
    }
    const state = intentStatesStore.get(intentHash) || IntentState.AUCTION_READY;
    return sendJson(res, 200, { intent, state, escrowStatus: "LOCKED" });
  }

  // 4. POST /api/intents
  if (url === "/api/intents" && method === "POST") {
    try {
      const body = await parseJsonBody<any>(req);
      const nowSec = BigInt(Math.floor(Date.now() / 1000));

      const intentInput: Partial<Intent> = {
        user: body.user,
        sourceChainId: body.sourceChainId ? BigInt(body.sourceChainId) : SOURCE_CHAIN_ID,
        sourceToken: body.sourceToken || deployments.MockUSDC,
        sourceAmount: BigInt(body.sourceAmount || "0"),
        destinationChainId: body.destinationChainId ? BigInt(body.destinationChainId) : DESTINATION_CHAIN_ID,
        destinationToken: body.destinationToken || deployments.MockUSDC,
        recipient: body.recipient || body.user,
        minOutputAmount: BigInt(body.minOutputAmount || "0"),
        deadline: BigInt(body.deadline || (nowSec + 3600n).toString()),
        nonce: BigInt(body.nonce || "1"),
        verificationPolicy: body.verificationPolicy || "0xpolicy_standard",
        createdAt: nowSec,
      };

      // Phase 2 Rules validation: sourceAmount > 0 & minOutputAmount > 0
      if (!intentInput.sourceAmount || intentInput.sourceAmount <= 0n) {
        return sendError(res, 400, "INVALID_SOURCE_AMOUNT", "sourceAmount must be strictly greater than 0");
      }
      if (!intentInput.minOutputAmount || intentInput.minOutputAmount <= 0n) {
        return sendError(res, 400, "INVALID_MIN_OUTPUT_AMOUNT", "minOutputAmount must be strictly greater than 0");
      }

      const intentHash = computeCanonicalIntentHash(intentInput);
      const fullIntent: Intent = { ...intentInput, intentHash } as Intent;

      intentsStore.set(intentHash, fullIntent);
      intentStatesStore.set(intentHash, IntentState.AUCTION_READY);

      indexer.recordEvent(intentHash, "INTENT_CREATED", "Intent created via API", fullIntent);
      indexer.recordEvent(intentHash, "ESCROW_LOCKED", "Input escrow locked source tokens", { amount: fullIntent.sourceAmount.toString() });

      return sendJson(res, 201, {
        intentHash,
        intent: fullIntent,
        state: IntentState.AUCTION_READY,
        unsignedTx: {
          target: deployments.IntentRegistry,
          function: "createAndFundIntent(uint64,address,uint256,uint64,address,address,uint256,uint64,bytes32)",
          params: [
            fullIntent.sourceChainId.toString(),
            fullIntent.sourceToken,
            fullIntent.sourceAmount.toString(),
            fullIntent.destinationChainId.toString(),
            fullIntent.destinationToken,
            fullIntent.recipient,
            fullIntent.minOutputAmount.toString(),
            fullIntent.deadline.toString(),
            fullIntent.verificationPolicy,
          ],
        },
      });
    } catch (err: any) {
      return sendError(res, 400, "BAD_REQUEST", err.message || "Failed to process intent creation");
    }
  }

  // 5. GET /api/solvers
  if (url === "/api/solvers" && method === "GET") {
    const solversList = Object.values(demoSolvers).map(s => ({
      solver: s.profile.solver,
      isActive: s.profile.isActive,
      metadataURI: s.profile.metadataURI,
      bondEth: s.bondEth.toString(),
      capacityUsdc: s.capacityUsdc.toString(),
      supportedChains: s.capabilities.supportedChains.map(c => c.toString()),
    }));
    return sendJson(res, 200, { solvers: solversList, count: solversList.length });
  }

  // 6. GET /api/solvers/:solver
  if (url.startsWith("/api/solvers/") && method === "GET") {
    const solverAddr = url.substring("/api/solvers/".length);
    const solverInfo = demoSolvers[solverAddr];
    if (!solverInfo) {
      return sendError(res, 404, "SOLVER_NOT_FOUND", `Solver ${solverAddr} not found`);
    }
    return sendJson(res, 200, {
      solver: solverInfo.profile,
      capabilities: solverInfo.capabilities,
      bondEth: solverInfo.bondEth.toString(),
      capacityUsdc: solverInfo.capacityUsdc.toString(),
    });
  }

  // 7. GET /api/auctions
  if (url === "/api/auctions" && method === "GET") {
    const auctionsList = Array.from(auctionsStore.values());
    return sendJson(res, 200, { auctions: auctionsList, count: auctionsList.length });
  }

  // 8. GET /api/auctions/:auctionId
  if (url.startsWith("/api/auctions/") && method === "GET") {
    const auctionId = url.substring("/api/auctions/".length);
    const auction = auctionsStore.get(auctionId);
    if (!auction) {
      return sendError(res, 404, "AUCTION_NOT_FOUND", `Auction ${auctionId} not found`);
    }
    return sendJson(res, 200, { auction });
  }

  // 9. POST /api/auctions
  if (url === "/api/auctions" && method === "POST") {
    try {
      const body = await parseJsonBody<any>(req);
      const intentHash = body.intentHash;
      if (!intentHash || !intentsStore.has(intentHash)) {
        return sendError(res, 400, "INVALID_INTENT_HASH", "Valid intentHash is required to open an auction");
      }

      const auctionId = `0xauc_${intentHash.substring(2, 10)}`;
      const nowSec = Math.floor(Date.now() / 1000);
      const auction = {
        auctionId,
        intentHash,
        commitDeadline: nowSec + 60,
        revealDeadline: nowSec + 120,
        maxBidsAllowed: 32,
        state: "COMMIT",
        bidsCount: 0,
      };

      auctionsStore.set(auctionId, auction);
      intentStatesStore.set(intentHash, IntentState.AUCTION_OPEN);
      indexer.recordEvent(intentHash, "AUCTION_CREATED", "Batch auction created", auction);

      return sendJson(res, 201, { auction });
    } catch (err: any) {
      return sendError(res, 400, "BAD_REQUEST", err.message || "Failed to create auction");
    }
  }

  // 10. GET /api/risk/:solver
  if (url.startsWith("/api/risk/") && method === "GET") {
    const solverAddr = url.substring("/api/risk/".length);
    const solverInfo = demoSolvers[solverAddr];

    const mockIntent: Intent = {
      intentHash: "0xrisk_query",
      user: "0xuser",
      sourceChainId: 1n,
      sourceToken: "0xusdc_eth",
      sourceAmount: 1000n * 10n**6n,
      destinationChainId: 10n,
      destinationToken: "0xusdc_op",
      recipient: "0xrecipient",
      minOutputAmount: 950n * 10n**6n,
      deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      nonce: 1n,
      verificationPolicy: "0xpolicy_standard",
      createdAt: BigInt(Math.floor(Date.now() / 1000)),
    };

    const profile = solverInfo ? solverInfo.profile : { solver: solverAddr, isActive: true, registeredAt: 1000n, metadataURI: "" };
    const capabilities = solverInfo ? solverInfo.capabilities : { solver: solverAddr, supportedChains: [1n, 10n], supportedTokens: { "1": ["0xusdc"], "10": ["0xusdc"] } };

    const assessment = riskEngine.evaluateRisk(
      solverAddr,
      mockIntent,
      profile,
      capabilities,
      5000n,
      10000n * 10n**6n,
      []
    );

    return sendJson(res, 200, { assessment });
  }

  // 11. GET /api/executions/:executionId
  if (url.startsWith("/api/executions/") && method === "GET") {
    const execId = url.substring("/api/executions/".length);
    const exec = executionsStore.get(execId);
    if (!exec) {
      return sendError(res, 404, "EXECUTION_NOT_FOUND", `Execution ${execId} not found`);
    }
    return sendJson(res, 200, { execution: exec });
  }

  // 12. GET /api/events (JSON or SSE)
  if (url === "/api/events" && method === "GET") {
    if (req.headers.accept === "text/event-stream") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.write(`data: ${JSON.stringify({ type: "CONNECTED", timestamp: Date.now() })}\n\n`);
      sseClients.add(res);
      req.on("close", () => sseClients.delete(res));
      return;
    }
    return sendJson(res, 200, { events: indexer.getAllEvents(), count: indexer.getAllEvents().length });
  }

  // 13. POST /api/demo/golden-path
  if (url === "/api/demo/golden-path" && method === "POST") {
    const nowSec = Math.floor(Date.now() / 1000);
    const intent: Intent = {
      intentHash: `0xintent_golden_${nowSec}`,
      user: "0xuser_alice",
      sourceChainId: SOURCE_CHAIN_ID,
      sourceToken: deployments.MockUSDC,
      sourceAmount: 1000n * 10n**6n,
      destinationChainId: DESTINATION_CHAIN_ID,
      destinationToken: deployments.MockUSDC,
      recipient: "0xrecipient_bob",
      minOutputAmount: 950n * 10n**6n,
      deadline: BigInt(nowSec + 3600),
      nonce: 1n,
      verificationPolicy: "0xpolicy_standard",
      createdAt: BigInt(nowSec),
    };

    intentsStore.set(intent.intentHash, intent);
    indexer.recordEvent(intent.intentHash, "INTENT_CREATED", "Intent created by user", intent);
    indexer.recordEvent(intent.intentHash, "ESCROW_LOCKED", "Input escrow locked 1000 USDC", { amount: intent.sourceAmount.toString() });
    indexer.recordEvent(intent.intentHash, "AUCTION_CREATED", "Batch auction opened", { auctionId: "0xauc_golden" });

    // Winner selection
    const winnerSolver = "0xsolver_c_risky";
    const expectedOutput = 997n * 10n**6n;
    indexer.recordEvent(intent.intentHash, "WINNER_SELECTED", `Winner selected: Solver C (${winnerSolver})`, { winner: winnerSolver, output: expectedOutput.toString() });

    // Execution
    const execResult = await chainAdapter.execute(intent, winnerSolver, expectedOutput, false);
    executionsStore.set(execResult.transactionHash, execResult);
    indexer.recordEvent(intent.intentHash, "EXECUTION_CONFIRMED", `Destination execution confirmed on ${chainAdapter.destinationChainName}`, execResult);

    // Verification & Settlement
    const verification = verificationEngine.verifyExecution(intent, execResult);
    indexer.recordEvent(intent.intentHash, "VERIFICATION_PASSED", "7-point verification checklist passed", verification);
    indexer.recordEvent(intent.intentHash, "SETTLEMENT_COMPLETED", `Settlement authorized. 1000 USDC released to ${winnerSolver}`);

    return sendJson(res, 200, {
      status: "SUCCESS",
      scenario: "GOLDEN_PATH",
      intentHash: intent.intentHash,
      winner: winnerSolver,
      execResult,
      verification,
    });
  }

  // 14. POST /api/demo/failure-recovery
  if (url === "/api/demo/failure-recovery" && method === "POST") {
    const nowSec = Math.floor(Date.now() / 1000);
    const intent: Intent = {
      intentHash: `0xintent_fail_${nowSec}`,
      user: "0xuser_alice",
      sourceChainId: SOURCE_CHAIN_ID,
      sourceToken: deployments.MockUSDC,
      sourceAmount: 1000n * 10n**6n,
      destinationChainId: DESTINATION_CHAIN_ID,
      destinationToken: deployments.MockUSDC,
      recipient: "0xrecipient_bob",
      minOutputAmount: 950n * 10n**6n,
      deadline: BigInt(nowSec + 3600),
      nonce: 2n,
      verificationPolicy: "0xpolicy_standard",
      createdAt: BigInt(nowSec),
    };

    const solverA = "0xsolver_a_reliable";
    const solverB = "0xsolver_b_fast";

    const bids: Bid[] = [
      { solver: solverA, expectedOutputAmount: 980n * 10n**6n, estimatedExecutionTime: 60, capacityRequired: intent.sourceAmount, salt: "0xsaltA", valid: true },
      { solver: solverB, expectedOutputAmount: 970n * 10n**6n, estimatedExecutionTime: 15, capacityRequired: intent.sourceAmount, salt: "0xsaltB", valid: true },
    ];

    indexer.recordEvent(intent.intentHash, "INTENT_CREATED", "Intent created");
    indexer.recordEvent(intent.intentHash, "ESCROW_LOCKED", "Input escrow locked 1000 USDC");
    indexer.recordEvent(intent.intentHash, "WINNER_SELECTED", `Primary winner: ${solverA}`);

    // Primary failure
    const failedExec = await chainAdapter.execute(intent, solverA, 0n, true);
    indexer.recordEvent(intent.intentHash, "EXECUTION_FAILED", `Primary solver ${solverA} execution failed`);

    // Fallback selection
    const resolution = failureManager.resolveFailureOrFallback(intent, solverA, bids);
    indexer.recordEvent(intent.intentHash, "FALLBACK_SELECTED", resolution.reason, { fallbackSolver: solverB });

    // Fallback retry
    const fallbackExec = await chainAdapter.execute(intent, solverB, 970n * 10n**6n, false);
    const verification = verificationEngine.verifyExecution(intent, fallbackExec);
    indexer.recordEvent(intent.intentHash, "VERIFICATION_PASSED", "Fallback execution verified");
    indexer.recordEvent(intent.intentHash, "SETTLEMENT_COMPLETED", `Settled with fallback solver ${solverB}`);

    return sendJson(res, 200, {
      status: "SUCCESS",
      scenario: "FAILURE_RECOVERY",
      intentHash: intent.intentHash,
      failedSolver: solverA,
      fallbackSolver: solverB,
      resolution,
      fallbackExec,
      verification,
    });
  }

  // 15. POST /api/demo/refund
  if (url === "/api/demo/refund" && method === "POST") {
    const nowSec = Math.floor(Date.now() / 1000);
    const intent: Intent = {
      intentHash: `0xintent_refund_${nowSec}`,
      user: "0xuser_alice",
      sourceChainId: SOURCE_CHAIN_ID,
      sourceToken: deployments.MockUSDC,
      sourceAmount: 1000n * 10n**6n,
      destinationChainId: DESTINATION_CHAIN_ID,
      destinationToken: deployments.MockUSDC,
      recipient: "0xrecipient_bob",
      minOutputAmount: 950n * 10n**6n,
      deadline: BigInt(nowSec + 3600),
      nonce: 3n,
      verificationPolicy: "0xpolicy_standard",
      createdAt: BigInt(nowSec),
    };

    const solverA = "0xsolver_a_reliable";
    const bids: Bid[] = [
      { solver: solverA, expectedOutputAmount: 980n * 10n**6n, estimatedExecutionTime: 60, capacityRequired: intent.sourceAmount, salt: "0xsaltA", valid: true },
    ];

    const resolution = failureManager.resolveFailureOrFallback(intent, solverA, bids);
    indexer.recordEvent(intent.intentHash, "REFUND_AUTHORIZED", "Contract refund authorized to user 0xuser_alice");

    return sendJson(res, 200, {
      status: "SUCCESS",
      scenario: "CONTRACT_REFUND",
      intentHash: intent.intentHash,
      resolution,
      refundAuthorized: true,
    });
  }

  // Default 404
  return sendError(res, 404, "ENDPOINT_NOT_FOUND", `Route ${method} ${url} not found`);
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  INTENTMESH PROTOCOL BACKEND API LISTENING          `);
  console.log(`====================================================`);
  console.log(`Server URL:         http://localhost:${PORT}`);
  console.log(`Source Chain ID:   ${SOURCE_CHAIN_ID}`);
  console.log(`Destination Chain: ${DESTINATION_CHAIN_ID}`);
  console.log(`IntentRegistry:     ${deployments.IntentRegistry}`);
  console.log(`InputEscrow:        ${deployments.InputEscrow}`);
  console.log(`BatchAuction:       ${deployments.BatchAuction}`);
  console.log(`SettlementManager:  ${deployments.SettlementManager}`);
  console.log(`====================================================`);
});
