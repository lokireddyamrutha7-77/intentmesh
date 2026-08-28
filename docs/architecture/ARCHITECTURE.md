# IntentMesh Protocol Architecture

IntentMesh is a modular, security-conscious cross-chain intent execution marketplace. This document outlines the complete system architecture, domain responsibilities, data flow, and authority hierarchy.

---

## Canonical Protocol Terminology

All protocol documents consistently adhere to the following domain entities:
* **`Intent`**: User-defined outcome specification with locked input tokens.
* **`Bid`**: Solver proposal submitted during auction specifying price, routing, and time bounds.
* **`Solver`**: Specialized actor competing to execute user intents.
* **`CapacityReservation`**: Collateralized liability lock in `CapacityRegistry`.
* **`Execution`**: Solver action carrying out the cross-chain trade/fill.
* **`Fulfilment`**: Verified delivery of output assets into `DestinationVault`.
* **`VerificationProof`**: Cryptographic/on-chain proof validating enrolment terms.
* **`Settlement`**: Financial release of escrowed assets to solver upon verified completion.
* **`RiskAssessment`**: Quantitative evaluation and AI advisory analysis of solver bids.
* **`ProtocolEvent`**: On-chain event emission for observability and indexing.

---

## 1. High-Level Architecture Overview

IntentMesh decouples intent creation from execution and settlement. Users specify desired outcomes without dictating specific routing steps or execution vectors. Solvers compete to fulfill user intents, subject to risk evaluation, capacity checks, deterministic verification, and automated settlement.

### End-to-End Data Flow Pipeline

```
[ USER INTENT ]
      │
      ▼
[ SOLVER COMPETITION ]
      │
      ▼
[ RISK-AWARE SELECTION ]
      │
      ▼
[ CAPACITY RESERVATION ]
      │
      ▼
[ EXECUTION ]
      │
      ▼
[ FULFILMENT VERIFICATION ]
      │
      ▼
[ SETTLEMENT / RECOVERY ]
```

---

## 2. Major System Domains

### 1. Origination
* **Responsibility**: Manages user intent creation, validation, nonces, and input asset escrow.
* **Core Entities**: `Intent`, `InputEscrow`, `IntentRegistry`.
* **Data Flow**:
  1. User submits an `Intent` along with input assets.
  2. `InputEscrow` locks the user's funds.
  3. `IntentRegistry` registers the validated `Intent` and emits a `ProtocolEvent` (`IntentCreated`).

### 2. Competition
* **Responsibility**: Discovers solvers, hosts open/sealed batch auctions, collects commitments, and organizes competitive bidding.
* **Core Entities**: `BatchAuction`, `Bid`, `Solver`.
* **Data Flow**:
  1. Solvers receive `ProtocolEvent` notifications for newly registered intents.
  2. Solvers submit cryptographic `Bid` commitments detailing proposed execution terms, fees, and execution time bounds.
  3. `BatchAuction` aggregates bids for auction evaluation.

### 3. Risk Evaluation
* **Responsibility**: Evaluates bids and solvers deterministically using risk rules, financial exposure, solver reputation, and optional advisory metrics.
* **Core Entities**: `RiskAssessment`, deterministic risk engine, AI advisory engine.
* **Data Flow**:
  1. Deterministic risk engine evaluates all submitted `Bid` candidates against system parameters (reputation, latency, exposure limits).
  2. AI engine optionally provides non-authoritative advisory metrics (`RiskAssessment` annotations).
  3. Bids failing risk evaluation are filtered out prior to winner selection.

### 4. Fulfilment
* **Responsibility**: Selects winning solvers, locks solver capacity, and executes cross-chain trades/fills.
* **Core Entities**: `CapacityReservation`, `Execution`, `DestinationVault`.
* **Data Flow**:
  1. Winning `Solver` is selected based on combined cost and `RiskAssessment`.
  2. `CapacityRegistry` records a `CapacityReservation` against the solver's bonded capacity.
  3. The `Solver` triggers cross-chain `Execution` to deliver output tokens into `DestinationVault`.

### 5. Verification
* **Responsibility**: Deterministically verifies that fulfilment conditions (destination chain, output token, recipient, minimum amount, deadline) are fully met.
* **Core Entities**: `VerificationProof`, `VerificationAdapter`, `Fulfilment`.
* **Data Flow**:
  1. `DestinationVault` or cross-chain observer records output delivery and emits a `Fulfilment` event.
  2. `VerificationAdapter` ingests the `VerificationProof` and checks it against `Intent` specifications deterministically.
  3. Emits `ProtocolEvent` (`IntentVerified`).

### 6. Settlement
* **Responsibility**: Releases escrowed funds to winning solvers upon verified fulfilment, or executes refunds/slashing in failure cases.
* **Core Entities**: `SettlementManager`, `InputEscrow`, `SolverBondManager`.
* **Data Flow**:
  1. Upon receiving proof of valid verification, `SettlementManager` triggers `Settlement`.
  2. `InputEscrow` unlocks input assets and pays out the `Solver`.
  3. `CapacityRegistry` releases the locked `CapacityReservation`.
  4. If verification fails or expires, `SettlementManager` routes to recovery (refunding user and/or slashing solver bond).

### 7. Capital / Capacity
* **Responsibility**: Tracks solver bond collateral, active liability exposure, and available solver balance limits.
* **Core Entities**: `SolverBondManager`, `CapacityRegistry`, `SolverRegistry`.
* **Data Flow**:
  1. Solvers deposit bond collateral into `SolverBondManager`.
  2. `CapacityRegistry` ensures a solver's active total `CapacityReservation` never exceeds their unencumbered bond capacity.
  3. Bond capacity is returned upon successful `Settlement` or reduced upon slashing.

### 8. Observability
* **Responsibility**: Tracks system state, indexer synchronization, real-time monitors, and failure detection.
* **Core Entities**: `ProtocolEvent`, `Indexer`, `ExecutionMonitor`, `FailureManager`.
* **Data Flow**:
  1. All domain actions emit standardized `ProtocolEvent` logs.
  2. `Indexer` processes on-chain logs to maintain off-chain state synchronization.
  3. `ExecutionMonitor` watches pending execution deadlines and triggers `FailureManager` upon timeouts or anomalies.

---

## 3. Source-of-Truth Hierarchy

IntentMesh strictly enforces a rigid authority hierarchy across all operations:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Smart Contracts                                      │
│    Authoritative for financial, collateral & protocol   │
│    state.                                               │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Deterministic Verification                           │
│    Authoritative for fulfilment validity & proof logic. │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Backend Orchestration                                │
│    Coordinates data, monitors timers & off-chain flows. │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Deterministic Risk Engine                            │
│    Evaluates and ranks eligible solver bids.            │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 5. AI Engine (Advisory Only)                            │
│    Provides insights. CANNOT authorize settlement,      │
│    transfers, refunds, or slashing.                     │
└─────────────────────────────────────────────────────────┘
```

1. **Smart Contracts**: Absolute authority for all financial state, locked escrow, bond slash calculations, and token releases.
2. **Deterministic Verification**: Absolute authority for confirming whether a cross-chain output payload satisfies an `Intent`.
3. **Backend Orchestration**: Responsible for indexing events, broadcasting auction messages, and triggering verification adapter requests.
4. **Deterministic Risk Engine**: Responsible for algorithmic scoring and filtering of solver bids based on quantitative parameters.
5. **AI Engine**: Purely advisory. AI models provide non-binding risk assessments, anomaly warnings, and routing recommendations. **AI components must NEVER directly authorize settlement, fund transfers, refunds, capacity locks, or slashing.**

---

## 4. Architectural Guarantees & Constraints

* **Local Deterministic Support**: The architecture supports complete execution and testing in a local deterministic environment using simulated chain adapters and mock vaults.
* **No Unproven Dependencies**: Does not rely on ZK proof systems, threshold cryptography, third-party bridge tokens, DAO governance, or tokenomic incentives in its core layer.
