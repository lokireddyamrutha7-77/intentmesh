import http from "http";
import { LocalSimulationAdapter } from "@intentmesh/chain-adapters";
import { ExecutionMonitorService } from "@intentmesh/execution-monitor";
import { FailureManagerService } from "@intentmesh/failure-manager";
import { ProtocolEventIndexer } from "@intentmesh/indexer";
import { Intent } from "@intentmesh/protocol-types";
import { DeterministicRiskEngine } from "@intentmesh/risk-engine";
import { DeterministicVerificationEngine } from "@intentmesh/verification-sdk";

const PORT = 3001;

const riskEngine = new DeterministicRiskEngine();
const chainAdapter = new LocalSimulationAdapter();
const verificationEngine = new DeterministicVerificationEngine();
const executionMonitor = new ExecutionMonitorService(chainAdapter);
const failureManager = new FailureManagerService(executionMonitor, chainAdapter);
const indexer = new ProtocolEventIndexer();

const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || "/";

  if (url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "OK", protocol: "IntentMesh MVP API", timestamp: Date.now() }));
    return;
  }

  if (url === "/api/events") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(indexer.getAllEvents()));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint not found" }));
});

server.listen(PORT, () => {
  console.log(`IntentMesh Backend API listening on http://localhost:${PORT}`);
});
