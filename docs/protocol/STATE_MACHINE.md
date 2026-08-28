# IntentMesh Protocol State Machine

This document defines the complete state machine lifecycle for an `Intent` within IntentMesh, detailing primary states, terminal states, allowed state transitions, state invariants, and failure recovery branches.

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

## 1. Lifecycle Overview & Mapping

The 8 conceptual stages of the IntentMesh protocol map directly to formal implementation states as follows:

| Conceptual Stage | Primary Implementation State |
| :--- | :--- |
| 1. User intent | `CREATED` → `VALIDATED` |
| 2. Discover solvers | `AUCTION_OPEN` |
| 3. Construct routes | `AUCTION_OPEN` (Solver side) |
| 4. Competitive bids | `BIDS_LOCKED` |
| 5. Select execution | `WINNER_SELECTED` → `CAPACITY_RESERVED` |
| 6. Cross-chain fill | `EXECUTING` → `FULFILMENT_PENDING` |
| 7. Verify settlement | `VERIFICATION_PENDING` |
| 8. Release payment | `SETTLEMENT` → `COMPLETED` |

---

## 2. Implementation States Specification

### CREATED
* **Purpose**: Initial registration of an `Intent` by a user.
* **Entry Conditions**: User submits raw intent payload and input tokens to `InputEscrow`.
* **Allowed Transitions**: `VALIDATED`, `EXPIRED`, `FAILED`.
* **Forbidden Transitions**: `AUCTION_OPEN`, `WINNER_SELECTED`, `SETTLEMENT`, `COMPLETED`.
* **Invariants**: Input tokens locked in `InputEscrow`; intent hash generated.

### VALIDATED
* **Purpose**: Confirm intent parameters meet protocol rules (min output, valid deadline, non-zero amount).
* **Entry Conditions**: Intent structure parsed and verified by `IntentRegistry`.
* **Allowed Transitions**: `AUCTION_OPEN`, `EXPIRED`, `FAILED`.
* **Forbidden Transitions**: `CAPACITY_RESERVED`, `EXECUTING`, `SETTLEMENT`.
* **Invariants**: Nonce is unique (`INVARIANT-001`); Intent hash verified (`INVARIANT-002`).

### AUCTION_OPEN
* **Purpose**: Open window for solvers to discover the `Intent` and submit competitive bids.
* **Entry Conditions**: `IntentRegistry` signals valid intent; `BatchAuction` starts timer.
* **Allowed Transitions**: `BIDS_LOCKED`, `EXPIRED`.
* **Forbidden Transitions**: `WINNER_SELECTED`, `EXECUTING`, `COMPLETED`.
* **Invariants**: Solvers can submit/update `Bid` commitments bound to the intent.

### BIDS_LOCKED
* **Purpose**: Freeze bid submission window; prepare for risk assessment and ranking.
* **Entry Conditions**: Auction submission deadline reached.
* **Allowed Transitions**: `WINNER_SELECTED`, `EXPIRED`, `FAILED`.
* **Forbidden Transitions**: `AUCTION_OPEN` (no new bids), `EXECUTING`, `SETTLEMENT`.
* **Invariants**: Bid hash integrity preserved (`INVARIANT-003`); Bid bound to Intent (`INVARIANT-004`).

### WINNER_SELECTED
* **Purpose**: Select optimal solver based on cost and `RiskAssessment`.
* **Entry Conditions**: Deterministic risk engine evaluates locked bids and designates winner.
* **Allowed Transitions**: `CAPACITY_RESERVED`, `CAPACITY_FAILURE`, `EXPIRED`.
* **Forbidden Transitions**: `SETTLEMENT`, `COMPLETED`.
* **Invariants**: Winning solver must be registered in `SolverRegistry`.

### CAPACITY_RESERVED
* **Purpose**: Lock solver collateral exposure in `CapacityRegistry`.
* **Entry Conditions**: Winner selected; solver has sufficient available bond balance.
* **Allowed Transitions**: `EXECUTING`, `CAPACITY_FAILURE`, `EXPIRED`.
* **Forbidden Transitions**: `COMPLETED`, `SETTLEMENT` (without execution/verification).
* **Invariants**: Active capacity reservation matches winning bid liability (`INVARIANT-005`, `INVARIANT-006`).

### EXECUTING
* **Purpose**: Winning solver conducts cross-chain transaction to satisfy intent.
* **Entry Conditions**: `CapacityReservation` confirmed on-chain.
* **Allowed Transitions**: `FULFILMENT_PENDING`, `EXECUTION_REVERT`, `SOLVER_TIMEOUT`, `EXPIRED`.
* **Forbidden Transitions**: `SETTLEMENT`, `COMPLETED` (direct jump forbidden).
* **Invariants**: Solver capacity locked; execution window active.

### FULFILMENT_PENDING
* **Purpose**: Cross-chain fill completed by solver; destination vault records arrival.
* **Entry Conditions**: Output tokens transferred to `DestinationVault` on destination chain.
* **Allowed Transitions**: `VERIFICATION_PENDING`, `PARTIAL_FILL`, `FALSE_PROOF`, `EXPIRED`.
* **Forbidden Transitions**: `COMPLETED`, `SETTLEMENT` (before verification).
* **Invariants**: Output tokens received in vault; pending deterministic verification.

### VERIFICATION_PENDING
* **Purpose**: `VerificationAdapter` evaluates proof against intent requirements.
* **Entry Conditions**: `Fulfilment` event submitted with `VerificationProof`.
* **Allowed Transitions**: `SETTLEMENT`, `FALSE_PROOF`, `VERIFIER_UNAVAILABLE`, `CHAIN_REORG`.
* **Forbidden Transitions**: `AUCTION_OPEN`, `EXECUTING`.
* **Invariants**: Destination chain (`INVARIANT-008`), token (`INVARIANT-009`), recipient (`INVARIANT-010`), and amount (`INVARIANT-011`) verified against `Intent`.

### SETTLEMENT
* **Purpose**: Transfer escrowed user funds to solver and release locked capacity.
* **Entry Conditions**: `VerificationAdapter` confirms valid proof (`INVARIANT-014`).
* **Allowed Transitions**: `COMPLETED`.
* **Forbidden Transitions**: `REFUNDED`, `FAILED`.
* **Invariants**: User funds transferred to solver; solver capacity reservation cleared.

### COMPLETED
* **Purpose**: Terminal state representing successful end-to-end intent execution.
* **Entry Conditions**: Settlement assets released; all capacity reservations unlocked.
* **Allowed Transitions**: None (Final state).
* **Forbidden Transitions**: All transitions.
* **Invariants**: Immutable terminal state.

---

## 3. Recovery & Terminal States

### EXPIRED
* **Purpose**: Terminal recovery state reached when intent deadline passes before completion.
* **Entry Conditions**: Current block timestamp > intent deadline.
* **Allowed Transitions**: `REFUNDED`.
* **Invariants**: Escrowed user funds unlocked for refund.

### FAILED
* **Purpose**: Terminal recovery state reached due to unrecoverable protocol or solver error.
* **Entry Conditions**: Execution revert, invalid proof, or capacity fault.
* **Allowed Transitions**: `REFUNDED`.
* **Invariants**: System state safely rolled back.

### REFUNDED
* **Purpose**: Terminal state confirming user input assets returned.
* **Entry Conditions**: `InputEscrow` returns locked input tokens to user.
* **Allowed Transitions**: None (Final state).
* **Invariants**: User escrow balance restored to zero; solver capacity released.

### REORGED
* **Purpose**: Recovery state triggered by destination chain reorganization invalidating a fill.
* **Entry Conditions**: Chain reorg detected within finality window.
* **Allowed Transitions**: `VERIFICATION_PENDING`, `FAILED`, `REFUNDED`.
* **Invariants**: Settlement halted until re-verification or reorg settlement rules apply.

---

## 4. Failure Branches & Recovery Matrix

```
┌──────────────────────┬─────────────────────────┬───────────────────────────────────────────┐
│ Failure Trigger      │ Transition Path         │ Recovery / Slashing Behavior              │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────────┤
│ SOLVER_TIMEOUT       │ EXECUTING → FAILED      │ Capacity released; solver bond penalized; │
│                      │ → REFUNDED              │ user refunded from InputEscrow.           │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────────┤
│ PARTIAL_FILL         │ FULFILMENT_PENDING      │ Insufficient fill rejected by verifier;   │
│                      │ → FAILED → REFUNDED     │ solver penalized; user input refunded.    │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────────┤
│ FALSE_PROOF          │ VERIFICATION_PENDING    │ Proof rejected; solver bond slashed;      │
│                      │ → FAILED → REFUNDED     │ user input refunded.                      │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────────┤
│ VERIFIER_UNAVAILABLE │ VERIFICATION_PENDING    │ Retries verification until deadline;      │
│                      │ → EXPIRED → REFUNDED    │ no bond slash if verifier fault.          │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────────┤
│ CHAIN_REORG          │ VERIFICATION_PENDING    │ Settlement halted; intent status reset to │
│                      │ → REORGED → REFUNDED    │ VERIFICATION_PENDING or REFUNDED.         │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────────┤
│ CAPACITY_FAILURE     │ WINNER_SELECTED         │ Winner selection invalidated; fallback to │
│                      │ → CAPACITY_FAILURE      │ runner-up bid or AUCTION_OPEN.            │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────────┤
│ EXECUTION_REVERT     │ EXECUTING → FAILED      │ Execution failed; capacity unencumbered;  │
│                      │ → REFUNDED              │ user refunded.                            │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────────┤
│ INTENT_EXPIRY        │ Any Active State        │ State halts; user input unlocked in       │
│                      │ → EXPIRED → REFUNDED    │ InputEscrow.                             │
└──────────────────────┴─────────────────────────┴───────────────────────────────────────────┘
```
