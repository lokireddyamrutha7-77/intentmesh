# IntentMesh Commit-Reveal Batch Auction Specification

This document defines the **Sealed Commit-Reveal Batch Auction Architecture, Bounded Scaling Model, Atomic Finalization Logic, and Solver Agent Integration** implemented in Phase 4–5.

---

## 1. Architectural Principles

The IntentMesh auction mechanism coordinates competitive bidding among independent solvers to select the optimal verified outcome for user intents.

Key invariants enforced in Phase 4–5:
1. **Sealed Commit-Reveal Privacy**: During the `COMMIT` window, solvers submit cryptographically hashed commitments:
   $$\text{commitment} = \text{keccak256}(\text{abi.encode}(\text{auctionId}, \text{intentHash}, \text{solver}, \text{expectedOutputAmount}, \text{estimatedExecutionTime}, \text{capacityRequired}, \text{salt}))$$
   Raw bid parameters are revealed only during the `REVEAL` window.
2. **Bounded Scalability Model**: Each auction enforces `MAX_BIDS_PER_AUCTION = 32`, guaranteeing gas-safe finalization loops and preventing gas-exhaustion denial-of-service attacks.
3. **Atomic Winner Capacity Reservation & Recheck**:
   - Capacity is **not** consumed during commitment or reveal (`COMMIT/REVEAL` → zero capacity lock).
   - At `finalizeAuction`, candidate solvers are evaluated in baseline rank order.
   - For candidate 1, the protocol re-validates registration, active status, chain/token capabilities, available bond, and current available capacity at finalization time.
   - Upon successful revalidation, `CapacityRegistry.reserveCapacity` locks candidate 1's required capacity atomically with marking the auction `FINALIZED`.
   - If candidate 1 fails any revalidation or capacity reservation, the protocol falls back atomically to candidate 2, candidate 3, etc. If no candidate passes -> `AuctionState.CANCELLED`.
4. **Deterministic Baseline Winner Selection**:
   - Primary: Highest `expectedOutputAmount`
   - Secondary: Lowest `estimatedExecutionTime`
   - Tie-breaker: Ascending `uint160(solver)` address
5. **AI Non-Authority Boundary**: AI has zero authority over commitments, reveals, bid validation, capacity reservation, or finalization. All state transitions are 100% deterministic smart contract functions.

---

## 2. Auction Lifecycle States

| State | Allowed Operations | Transition Trigger |
| :--- | :--- | :--- |
| `NOT_STARTED` | `createAuction` | `createAndFundIntent` advances intent to `AUCTION_READY` |
| `COMMIT` | `submitCommitment` | `block.timestamp <= commitDeadline` |
| `REVEAL` | `revealBid` | `block.timestamp > commitDeadline && block.timestamp <= revealDeadline` |
| `FINALIZED` | View queries | `finalizeAuction` called after `revealDeadline` with a valid winner |
| `CANCELLED` | View queries | `finalizeAuction` called after `revealDeadline` with zero valid bids |

---

## 3. Solver Agents (`solvers/`)

Three software solver agents are implemented under `solvers/`:

1. **Solver A — Reliable (`solvers/solver-a/agent.ts`)**:
   - Conservative parameters: 3% above `minOutputAmount`, standard 60s execution time.
2. **Solver B — Fast (`solvers/solver-b/agent.ts`)**:
   - Speed-oriented parameters: 2% above `minOutputAmount`, rapid 15s execution time.
3. **Solver C — Risky (`solvers/solver-c/agent.ts`)**:
   - Aggressive output parameters: 5% above `minOutputAmount`, higher timing variance (120s), strictly adhering to protocol safety invariants.

---

## 4. Phase 6 Extension Point

`BatchAuction.sol` isolates baseline competition ranking inside `_isBetterBid`:

> *"Phase 4–5 ranking is baseline competition-only. Phase 6 introduces risk-aware deterministic ranking."*
