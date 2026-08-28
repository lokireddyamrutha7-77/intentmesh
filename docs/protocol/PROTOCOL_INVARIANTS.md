# IntentMesh Protocol Invariants

This document establishes the mandatory protocol invariants for IntentMesh. Every system state transition, smart contract operation, and verification check must satisfy these invariants.

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

## Invariant Catalog

### INVARIANT-001: Nonce Uniqueness
* **Statement**: Every `Intent` must have a globally unique user nonce that cannot be reused for intent registration.
* **Why It Matters**: Prevents replay attacks where an intent payload is submitted or executed multiple times.
* **Enforcement Layer**: `IntentRegistry` smart contract (on-chain mapping).
* **Future Test Location**: `tests/unit/contracts/IntentRegistry.test.ts` & `contracts/test/IntentRegistry.t.sol`.

### INVARIANT-002: Intent Hash Integrity
* **Statement**: The cryptographic hash of an `Intent` must be calculated deterministically over canonical fields (user, inputToken, inputAmount, destinationChain, destinationToken, recipient, minOutput, deadline, nonce) and remain immutable throughout its lifecycle.
* **Why It Matters**: Ensures intent terms cannot be tampered with or modified post-creation.
* **Enforcement Layer**: `IntentRegistry` smart contract & `packages/intent-schema`.
* **Future Test Location**: `tests/unit/packages/intent-schema.test.ts`.

### INVARIANT-003: Bid Commitment Integrity
* **Statement**: A solver `Bid` commitment hash must cryptographically bind the bid parameters (solver address, proposed output amount, execution time limit, fee structure) prior to auction resolution.
* **Why It Matters**: Prevents solvers from altering their bid commitments after learning competitor pricing.
* **Enforcement Layer**: `BatchAuction` smart contract.
* **Future Test Location**: `tests/unit/contracts/BatchAuction.test.ts`.

### INVARIANT-004: Bid-to-Intent Binding
* **Statement**: A `Bid` can only be evaluated, winning-selected, or executed if its `intentHash` explicitly matches the target registered `Intent`.
* **Why It Matters**: Guarantees bids cannot be stolen, reassigned, or misapplied to a different user's intent.
* **Enforcement Layer**: `BatchAuction` & `CapacityRegistry` smart contracts.
* **Future Test Location**: `tests/integration/auction-to-capacity.test.ts`.

### INVARIANT-005: Capacity Conservation
* **Statement**: The sum of active locked `CapacityReservation` liabilities for a solver across all active intents must never exceed their unencumbered posted bond balance in `SolverBondManager`.
* **Why It Matters**: Prevents solver over-leveraging and guarantees full collateral coverage for potential slashable defaults.
* **Enforcement Layer**: `CapacityRegistry` & `SolverBondManager` smart contracts.
* **Future Test Location**: `tests/unit/contracts/CapacityRegistry.test.ts`.

### INVARIANT-006: Reservation Limits
* **Statement**: A single `CapacityReservation` cannot exceed the solver's unallocated bond capacity at the exact block of reservation.
* **Why It Matters**: Protects protocol capital adequacy and avoids single-intent concentration risk.
* **Enforcement Layer**: `CapacityRegistry` smart contract.
* **Future Test Location**: `contracts/test/CapacityRegistry.t.sol`.

### INVARIANT-007: Proof Uniqueness
* **Statement**: A `VerificationProof` can be consumed for settlement exactly once; duplicate proof submissions for the same intent must revert.
* **Why It Matters**: Prevents double-settlement or double-claiming of user escrow funds.
* **Enforcement Layer**: `VerificationAdapter` & `SettlementManager` smart contracts.
* **Future Test Location**: `tests/unit/contracts/VerificationAdapter.test.ts`.

### INVARIANT-008: Exact Destination Chain
* **Statement**: Fulfilment output delivery must occur on the exact `destinationChain` specified in the `Intent`.
* **Why It Matters**: Prevents solvers from delivering tokens on cheaper or unintended blockchains.
* **Enforcement Layer**: `VerificationAdapter` smart contract.
* **Future Test Location**: `tests/integration/verification-chain-adapter.test.ts`.

### INVARIANT-009: Exact Output Token
* **Statement**: Fulfilment output delivery must use the exact `destinationToken` address specified in the `Intent`.
* **Why It Matters**: Prevents solvers from delivering unapproved, counterfeit, or low-liquidity substitute tokens.
* **Enforcement Layer**: `VerificationAdapter` smart contract.
* **Future Test Location**: `tests/unit/contracts/VerificationAdapter.test.ts`.

### INVARIANT-010: Exact Recipient
* **Statement**: Fulfilment output tokens must be delivered to the exact `recipient` address specified in the `Intent`.
* **Why It Matters**: Guarantees user funds reach the intended target account or contract address.
* **Enforcement Layer**: `VerificationAdapter` smart contract.
* **Future Test Location**: `tests/integration/end-to-end-flow.test.ts`.

### INVARIANT-011: Minimum Output
* **Statement**: The actual delivered token amount in a `Fulfilment` must be greater than or equal to the `minOutput` specified in the `Intent`.
* **Why It Matters**: Protects users against slippage exploits, partial fills, or solver under-delivery.
* **Enforcement Layer**: `VerificationAdapter` smart contract.
* **Future Test Location**: `tests/unit/contracts/VerificationAdapter.test.ts`.

### INVARIANT-012: Deadline Enforcement
* **Statement**: An `Intent` cannot transition to `SETTLEMENT` if the verification proof timestamp or block timestamp exceeds the specified intent `deadline`.
* **Why It Matters**: Enforces time bounds and allows users to safely reclaim expired escrowed funds.
* **Enforcement Layer**: `IntentRegistry`, `VerificationAdapter`, & `SettlementManager`.
* **Future Test Location**: `tests/unit/contracts/SettlementManager.test.ts`.

### INVARIANT-013: Finality Requirement
* **Statement**: A `VerificationProof` is only valid if the destination chain transaction has reached protocol-defined finality depth.
* **Why It Matters**: Protects against chain reorgs invalidating fulfilment after funds have already been released to the solver.
* **Enforcement Layer**: `VerificationAdapter` & `chain-adapters`.
* **Future Test Location**: `tests/simulations/reorg-simulation.test.ts`.

### INVARIANT-014: Settlement-After-Verification
* **Statement**: `SettlementManager` can release escrowed user funds to a solver ONLY AFTER `VerificationAdapter` has recorded a verified status for the target `Intent`.
* **Why It Matters**: Eliminates optimistic or unverified payouts.
* **Enforcement Layer**: `SettlementManager` smart contract.
* **Future Test Location**: `tests/unit/contracts/SettlementManager.test.ts`.

### INVARIANT-015: No Silent Verification Downgrade
* **Statement**: Protocol security parameters and verification threshold checks cannot be modified or bypassed for an already active `Intent`.
* **Why It Matters**: Guarantees users that intent safety guarantees will not degrade mid-execution.
* **Enforcement Layer**: `VerificationAdapter` smart contract.
* **Future Test Location**: `tests/security/invariants-check.test.ts`.

### INVARIANT-016: AI Non-Authority
* **Statement**: AI components and off-chain advisory models possess zero state-change authorization; contract calls for settlement, refund, capacity lock, or bond slashing from non-authorized keys must revert regardless of AI output.
* **Why It Matters**: Prevents non-deterministic AI hallucinations or prompt injections from compromising protocol capital or financial state.
* **Enforcement Layer**: Smart contract access control (`onlySettlementManager`, `onlyIntentRegistry`).
* **Future Test Location**: `tests/security/access-control.test.ts`.

### INVARIANT-017: Timeout Capacity Release
* **Statement**: If an intent expires or execution times out without valid proof, the associated solver `CapacityReservation` must be released back to the solver's unencumbered balance (minus any applicable penalty).
* **Why It Matters**: Prevents solver capacity from becoming permanently locked or frozen due to abandoned or failed intents.
* **Enforcement Layer**: `CapacityRegistry` & `SettlementManager` smart contracts.
* **Future Test Location**: `tests/unit/contracts/CapacityRegistry.test.ts`.

### INVARIANT-018: Verifier Failure Separation
* **Statement**: If verification fails due to infrastructure/verifier node unavailability (and not solver fault), solver bond slashing must not occur.
* **Why It Matters**: Ensures solvers are not unfairly penalized for third-party verifier outages.
* **Enforcement Layer**: `SettlementManager` & `FailureManager`.
* **Future Test Location**: `tests/simulations/verifier-outage.test.ts`.

### INVARIANT-019: Complete Intent Traceability
* **Statement**: Every state transition from `CREATED` to `COMPLETED` or `REFUNDED` must emit a structured `ProtocolEvent` containing the `intentHash` and current timestamp.
* **Why It Matters**: Guarantees full auditability and deterministic off-chain indexer state reconstruction.
* **Enforcement Layer**: All IntentMesh smart contracts (`IntentRegistry`, `InputEscrow`, `BatchAuction`, `CapacityRegistry`, `VerificationAdapter`, `SettlementManager`).
* **Future Test Location**: `tests/integration/indexer-traceability.test.ts`.
