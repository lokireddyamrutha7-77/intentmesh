# IntentMesh — Master Demonstration & Evaluation Guide

This guide explains how to start, inspect, and evaluate the complete IntentMesh MVP prototype across local EVM nodes, off-chain backend orchestration, persistent indexer, and web dashboard.

---

## 1. Quick Start Commands

### Step 1: Install Dependencies
```bash
pnpm install
```

### Step 2: Launch Local Anvil EVM Nodes
```bash
# Terminal 1: Source Chain (Port 8545, Chain ID 31337)
pnpm anvil:source

# Terminal 2: Destination Chain (Port 8546, Chain ID 31338)
pnpm anvil:destination
```

### Step 3: Deploy Smart Contracts
```bash
pnpm deploy:local
```

### Step 4: Launch Backend Orchestrator API
```bash
pnpm start:api
```

### Step 5: Launch Web Dashboard
```bash
pnpm dev:web
```
Open **http://localhost:5173** in your browser.

---

## 2. Interactive Dashboard Demonstration Walkthrough

### Scenario 1: Golden Path End-to-End Demo
1. Open the Web Dashboard at `http://localhost:5173`.
2. Navigate to **🚀 Demo Control Center**.
3. Click **RUN GOLDEN PATH DEMO**.
4. **Evaluator Observation**:
   - Intent created and 1,000 USDC locked into `InputEscrow`.
   - Batch auction opened and sealed bids collected.
   - Deterministic risk engine evaluates solver historical performance.
   - Solver C selected as winning bidder offering 997 USDC output.
   - Destination execution confirmed on Chain `31338`.
   - `SettlementManager` runs 7-point cryptographic verification checklist (`VALID`).
   - 1,000 USDC escrow released to Solver C.

### Scenario 2: Failure Recovery & Fallback Demo
1. Navigate to **🚀 Demo Control Center**.
2. Click **RUN FAILURE RECOVERY DEMO**.
3. **Evaluator Observation**:
   - Primary Solver A selected but suffers simulated execution timeout/failure.
   - `ExecutionMonitorService` detects failure and reports to `FailureManagerService`.
   - `FailureManagerService` automatically evaluates ranked candidate bids and selects Fallback Solver B.
   - Solver B executes fill on destination chain.
   - 7-point verification passes and settlement completes cleanly.

### Scenario 3: Contract-Authorized Refund Demo
1. Navigate to **🚀 Demo Control Center**.
2. Click **RUN CONTRACT REFUND DEMO**.
3. **Evaluator Observation**:
   - Primary solver execution fails and no safe fallback solver is available.
   - Verification fails $\rightarrow$ settlement remains strictly blocked (**Invariant-008: NO VERIFICATION ➔ NO SETTLEMENT**).
   - `SettlementManager` authorizes full user contract refund.

---

## 3. Key Pages & Features to Inspect

- **Overview (`/dashboard`)**: System metrics, active auctions, solver health, live event ticker.
- **Intents List (`/intents`)**: Intent table and 9-stage visual lifecycle timeline.
- **Create Intent (`/create-intent`)**: Non-custodial intent form with client-side validation and `InputEscrow` custody explanation.
- **Batch Auctions (`/auctions`)**: Commit-reveal stage tracker (`COMMIT` $\rightarrow$ `REVEAL` $\rightarrow$ `RANKING` $\rightarrow$ `FINALIZATION` $\rightarrow$ `WINNER`).
- **Solvers Registry (`/solvers`)**: Solver profiles, ETH bond collateral, and Chain-Aware Token Capability Matrix.
- **Risk Engine (`/risk`)**: Deterministic 5-factor risk score, 14-day primary $\rightarrow$ 90-day fallback lookback indicator, and AI non-authoritative advisory badge.
- **Executions (`/executions`)**: Source/destination transaction hashes and 7-point verification checklist.
- **Live Events (`/events`)**: Real-time event log powered by persistent `ProtocolEventIndexer`.
