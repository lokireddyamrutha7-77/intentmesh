# IntentMesh Phased Implementation Plan

This document outlines the 17-phase execution roadmap for IntentMesh. Each phase builds sequentially upon previous deliverables to achieve a complete, security-conscious, end-to-end intent execution marketplace with a local deterministic demo.

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

## Roadmap Overview

```
Phase 0: Architecture
  └─► Phase 1: Smart Contract Foundation
        └─► Phase 2: Intent System
              └─► Phase 3: Solver Registry & SDK
                    └─► Phase 4: Solver Agents
                          └─► Phase 5: Auction
                                └─► Phase 6: Risk Engine
                                      └─► Phase 7: Capacity & Winner Selection
                                            └─► Phase 8: Execution
                                                  └─► Phase 9: Verification
                                                        └─► Phase 10: Settlement
                                                              └─► Phase 11: Failure Recovery
                                                                    └─► Phase 12: Frontend
                                                                          └─► Phase 13: Realtime Infrastructure
                                                                                └─► Phase 14: Security Testing
                                                                                      └─► Phase 15: E2E Integration
                                                                                            └─► Phase 16: Demo Hardening
```

---

## Detailed Phase Specifications

### Phase 0: Architecture
* **Objective**: Define core protocol design, domain boundaries, invariants, state machine, smart contract specifications, and implementation plan.
* **Inputs**: Initial project vision, system domain requirements.
* **Outputs**: `ARCHITECTURE.md`, `STATE_MACHINE.md`, `PROTOCOL_INVARIANTS.md`, `CONTRACTS.md`, `PHASED_PLAN.md`.
* **Dependencies**: None.
* **Acceptance Criteria**: All 5 design documents exist, use consistent terminology, pass cross-document invariant checks, and describe a complete local deterministic system without placeholder logic.

### Phase 1: Smart Contract Foundation
* **Objective**: Set up smart contract development workspace, build environment, testing framework, and base interfaces.
* **Inputs**: Phase 0 design documents, `contracts/` directory structure.
* **Outputs**: Foundry/Hardhat configuration, base interfaces (`IIntentRegistry`, `IInputEscrow`, `ISolverRegistry`, `ISettlementManager`), core error types, and `ProtocolEvent` declarations.
* **Dependencies**: Phase 0.
* **Acceptance Criteria**: Contracts workspace compiles clean; base interfaces and events defined according to `CONTRACTS.md`.

### Phase 2: Intent System
* **Objective**: Implement `IntentRegistry` and `InputEscrow` contracts along with TypeScript intent parsing/hashing package.
* **Inputs**: Phase 1 contract base, `packages/intent-schema`, `packages/protocol-types`.
* **Outputs**: `IntentRegistry.sol`, `InputEscrow.sol`, intent hashing library, unit tests for intent creation, validation, and escrow locking.
* **Dependencies**: Phase 1.
* **Acceptance Criteria**: Nonce uniqueness (`INVARIANT-001`) and intent hash integrity (`INVARIANT-002`) verified by automated unit tests.

### Phase 3: Solver Registry and SDK
* **Objective**: Implement `SolverRegistry` and `SolverBondManager` contracts and `packages/solver-sdk`.
* **Inputs**: Phase 2 intent system.
* **Outputs**: `SolverRegistry.sol`, `SolverBondManager.sol`, TypeScript Solver SDK for bid construction and monitoring.
* **Dependencies**: Phase 2.
* **Acceptance Criteria**: Solvers can register, deposit bond collateral, query intent feeds via SDK, and withdraw unencumbered bond balance.

### Phase 4: Solver Agents
* **Objective**: Implement reference solver agents (`solvers/solver-a`, `solvers/solver-b`, `solvers/solver-c`) and shared solver logic (`solvers/shared`).
* **Inputs**: Phase 3 Solver SDK.
* **Outputs**: Three independent reference solver implementations capable of automated pricing, intent monitoring, and bid creation.
* **Dependencies**: Phase 3.
* **Acceptance Criteria**: Solver agents automatically construct valid signed bids upon discovering active intents.

### Phase 5: Auction
* **Objective**: Implement `BatchAuction` contract and off-chain auction orchestration service.
* **Inputs**: Phase 4 solver agents, Phase 2 intent system.
* **Outputs**: `BatchAuction.sol`, auction submission, commitment locking, and bid aggregation logic.
* **Dependencies**: Phase 4.
* **Acceptance Criteria**: Auction opens upon intent creation, collects bids, locks commitments at deadline, and enforces bid integrity (`INVARIANT-003`, `INVARIANT-004`).

### Phase 6: Risk Engine
* **Objective**: Implement deterministic risk evaluation package (`packages/risk-engine`) and non-authoritative AI advisory scoring interface.
* **Inputs**: Phase 5 auction output, solver performance metrics.
* **Outputs**: Deterministic bid scoring function, reputation parser, risk ranking engine, AI risk advisory wrapper.
* **Dependencies**: Phase 5.
* **Acceptance Criteria**: Bids are deterministically scored; AI advisories are annotated as non-binding (`INVARIANT-016`); risky/overleveraged bids are filtered out.

### Phase 7: Capacity and Winner Selection
* **Objective**: Implement `CapacityRegistry` contract and integrate winner selection logic.
* **Inputs**: Phase 6 risk engine, Phase 5 auction.
* **Outputs**: `CapacityRegistry.sol`, capacity reservation logic, winner selection finalizer.
* **Dependencies**: Phase 6.
* **Acceptance Criteria**: Winner selection locks solver capacity; capacity conservation (`INVARIANT-005`) and reservation limits (`INVARIANT-006`) strictly enforced.

### Phase 8: Execution
* **Objective**: Implement `DestinationVault` contract, `packages/chain-adapters`, and solver cross-chain execution pipeline.
* **Inputs**: Phase 7 winner selection, Phase 4 solver agents.
* **Outputs**: `DestinationVault.sol`, local chain adapters, simulated cross-chain fill execution logic.
* **Dependencies**: Phase 7.
* **Acceptance Criteria**: Winning solver successfully executes cross-chain fill delivering output tokens into `DestinationVault`.

### Phase 9: Verification
* **Objective**: Implement `VerificationAdapter` contract and `packages/verification-sdk`.
* **Inputs**: Phase 8 execution, `DestinationVault`.
* **Outputs**: `VerificationAdapter.sol`, `VerificationSDK`, proof generator and validation functions.
* **Dependencies**: Phase 8.
* **Acceptance Criteria**: Verification adapter deterministically verifies chain (`INVARIANT-008`), token (`INVARIANT-009`), recipient (`INVARIANT-010`), and amount (`INVARIANT-011`); enforces proof uniqueness (`INVARIANT-007`).

### Phase 10: Settlement
* **Objective**: Implement `SettlementManager` and `ReputationRegistry` contracts.
* **Inputs**: Phase 9 verification output, Phase 2 escrow, Phase 3 bond manager.
* **Outputs**: `SettlementManager.sol`, `ReputationRegistry.sol`, automated payout release logic.
* **Dependencies**: Phase 9.
* **Acceptance Criteria**: Payout releases input escrow to solver ONLY after valid verification (`INVARIANT-014`); capacity released; solver reputation updated.

### Phase 11: Failure Recovery
* **Objective**: Implement `services/failure-manager` and automated refund/slashing pathways for all error branches.
* **Inputs**: Phase 10 settlement engine, Phase 8 execution monitor.
* **Outputs**: Refund execution scripts, bond slashing handler, timeout auto-canceller.
* **Dependencies**: Phase 10.
* **Acceptance Criteria**: Automatically recovers user funds and releases/slashes solver capacity on timeouts, partial fills, false proofs, or execution reverts.

### Phase 12: Frontend
* **Objective**: Implement `apps/web` user interface for intent creation, real-time intent status tracking, and solver competition view.
* **Inputs**: Phase 2 intent system, Phase 10 settlement engine.
* **Outputs**: Next.js/Vite frontend application in `apps/web`.
* **Dependencies**: Phase 11.
* **Acceptance Criteria**: Users can connect wallet, configure intent parameters, submit intent, and view real-time lifecycle state progression.

### Phase 13: Realtime Infrastructure
* **Objective**: Implement `services/indexer`, `services/execution-monitor`, and `apps/api`.
* **Inputs**: All contract event interfaces, Phase 12 frontend.
* **Outputs**: Event indexer service, WebSocket event push gateway, API server in `apps/api`.
* **Dependencies**: Phase 12.
* **Acceptance Criteria**: Indexer synchronizes on-chain `ProtocolEvent` logs in real-time; backend API exposes intent status endpoints.

### Phase 14: Security Testing
* **Objective**: Conduct comprehensive automated invariant testing, access control audits, and failure injection suite.
* **Inputs**: Complete codebase across contracts, services, and packages.
* **Outputs**: `tests/security/` test suite, invariant verification report, fuzzing test cases.
* **Dependencies**: Phase 13.
* **Acceptance Criteria**: All 19 protocol invariants (`INVARIANT-001` through `INVARIANT-019`) pass automated stress tests and fuzzing without violations.

### Phase 15: End-to-End Integration
* **Objective**: Assemble full end-to-end integration test suite in `tests/e2e/` and `tests/simulations/`.
* **Inputs**: All components from Phase 1 through 14.
* **Outputs**: Automated end-to-end test runner executing multi-solver auctions, cross-chain fills, verification, and settlement in a local node environment.
* **Dependencies**: Phase 14.
* **Acceptance Criteria**: Complete end-to-end user intent flow completes automatically from creation to settlement in local test environment.

### Phase 16: Deployment/Demo Hardening
* **Objective**: Create reproducible deployment scripts (`contracts/script/`), local demo orchestrator (`scripts/`), and demo documentation (`docs/demo/`).
* **Inputs**: Complete integrated system.
* **Outputs**: Local multi-node demo environment script, step-by-step demo guide, system setup commands.
* **Dependencies**: Phase 15.
* **Acceptance Criteria**: Single command launches full local deterministic demo showcasing intent creation, solver competition, risk evaluation, execution, verification, and settlement.
