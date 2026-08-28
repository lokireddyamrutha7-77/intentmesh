# IntentMesh Smart Contract Architecture

This document defines the roles, state boundaries, function interfaces, event signatures, security assumptions, and inter-contract dependencies for the IntentMesh smart contract ecosystem.

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

## Implementation Status Summary (Phase 7 Completed)

| Contract Name | Implementation Status | Scope Boundary |
| :--- | :--- | :--- |
| `IntentRegistry` | **IMPLEMENTED (Phase 2)** | Canonical intent creation (`createAndFundIntent`), 11-field hash binding (`computeIntentHash`), per-user nonces, state transitions (`CREATED` → `VALIDATED` → `AUCTION_READY`) |
| `InputEscrow` | **IMPLEMENTED (Phase 2)** | SafeERC20 asset locking triggered during `createAndFundIntent`, per-intent custody accounting, restricted release/refund boundaries |
| `SolverRegistry` | **IMPLEMENTED (Phase 3)** | Solver profile registration, metadata URI, solver self-status management, chain capabilities, chain-aware token capabilities, discovery read queries |
| `SolverBondManager` | **IMPLEMENTED (Phase 1)** | Native ETH collateral deposits, locking, unlocking, and penalty authorization interface foundation (Slashing policy deferred to Phase 11) |
| `CapacityRegistry` | **IMPLEMENTED (Phase 1)** | Declared, reserved, and available capacity accounting per (solver, chain, token); bond lock integration |
| `ReputationRegistry` | **IMPLEMENTED (Phase 1)** | Metric storage foundation (`successfulFills`, `failedFills`, `timeouts`, `latency`) |
| `DestinationVault` | **IMPLEMENTED (Phase 1)** | Destination-side output token fill accounting and release boundaries |
| `VerificationAdapter` | **IMPLEMENTED (Phase 1)** | Deterministic proof verification over chain, token, recipient, minimum amount, deadline, and proof uniqueness (`INVARIANT-007`) |
| `BatchAuction` | **IMPLEMENTED (Phase 4–5)** | Sealed commit-reveal auction window, 7-field commitment hashing, bounded participant model (`MAX_BIDS_PER_AUCTION = 32`), reveal validation, atomic winner capacity reservation, deterministic baseline ranking |
| `SettlementManager` | **IMPLEMENTED (Phase 1)** | Authorization boundary requiring valid verification (`INVARIANT-008`, `INVARIANT-010`) (Multi-contract settlement orchestration deferred to Phase 10) |

---

## Modular Design & Prevention of God Contracts

IntentMesh enforces a strict separation of concerns across single-responsibility contracts:
- **`IntentRegistry`**: Stores intent metadata, nonces, hashes, and lifecycle state. **Never holds ERC20 user funds**.
- **`InputEscrow`**: Custodies source ERC20 assets per `intentHash`. **Does not handle intent validation or state logic**.

```
                        ┌─────────────────────────┐
                        │     IntentRegistry      │
                        └────────────┬────────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               ▼                     ▼                     ▼
    ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
    │    InputEscrow     │ │    BatchAuction    │ │   SolverRegistry   │
    └──────────┬─────────┘ └─────────┬──────────┘ └─────────┬──────────┘
               │                     │                      │
               │                     ▼                      ▼
               │           ┌────────────────────┐ ┌────────────────────┐
               │           │  CapacityRegistry  │ │ SolverBondManager  │
               │           └─────────┬──────────┘ └────────────────────┘
               │                     │
               ▼                     ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                        SettlementManager                         │
    └──────────┬────────────────────────────────────────────┬──────────┘
               │                                            │
               ▼                                            ▼
    ┌────────────────────┐                        ┌────────────────────┐
    │VerificationAdapter │                        │ ReputationRegistry │
    └────────────────────┘                        └────────────────────┘
```

---

## Contract Specifications

### 1. IntentRegistry (Phase 2 Enhanced)
* **Responsibility**: Authoritative canonical registry for intent creation, multi-parameter validation, field-binding hashing, per-user monotonic nonces, and lifecycle state tracking (`CREATED` → `VALIDATED` → `AUCTION_READY`).
* **State Owned**: `mapping(bytes32 => Intent) private _intents;`, `mapping(bytes32 => IntentState) private _intentStates;`, `mapping(address => uint256) private _userNonces;`, `address public inputEscrow;`.
* **Important Functions**:
  * `function createAndFundIntent(uint64 sourceChainId, address sourceToken, uint256 sourceAmount, uint64 destinationChainId, address destinationToken, address recipient, uint256 minOutputAmount, uint64 deadline, bytes32 verificationPolicy) external returns (bytes32 intentHash)`
  * `function computeIntentHash(...) external pure returns (bytes32)`
  * `function getIntent(bytes32 intentHash) external view returns (Intent memory)`
  * `function getIntentState(bytes32 intentHash) external view returns (IntentState)`
  * `function getUserNonce(address user) external view returns (uint256)`
* **Events**: `event IntentRegistered(...)`, `event IntentCreated(...)`, `event IntentValidated(...)`, `event NonceConsumed(...)`, `event IntentEscrowLocked(...)`, `event IntentStateChanged(...)`.

### 2. InputEscrow (Phase 2 Enhanced)
* **Responsibility**: Custodies source-side user ERC20 tokens strictly per `intentHash` using `SafeERC20`.
* **State Owned**: `mapping(bytes32 => EscrowRecord) private _escrows;`.
* **Important Functions**:
  * `function lockFunds(bytes32 intentHash, address token, uint256 amount, address depositor) external`
  * `function releaseFunds(bytes32 intentHash, address recipient) external`
  * `function refundFunds(bytes32 intentHash, address user) external`
* **Events**: `event FundsLocked(...)`, `event FundsReleased(...)`, `event FundsRefunded(...)`.
