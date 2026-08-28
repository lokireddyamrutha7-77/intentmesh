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

## Phase 1 Implementation Status Summary

| Contract Name | Implementation Status (Phase 1) | Scope Boundary |
| :--- | :--- | :--- |
| `IntentRegistry` | **IMPLEMENTED** | Registration, hashing, nonce tracking (`_userNonces`), state metadata |
| `InputEscrow` | **IMPLEMENTED** | SafeERC20 asset locking, restricted release/refund boundaries |
| `SolverRegistry` | **IMPLEMENTED** | Solver profile registration, metadata URI, active status tracking |
| `SolverBondManager` | **IMPLEMENTED (Phase 1 Scoped)** | Native ETH collateral deposits, locking, unlocking, and penalty interface foundation (Full slashing policy deferred to Phase 11) |
| `CapacityRegistry` | **IMPLEMENTED** | Declared, reserved, and available capacity accounting per (solver, chain, token); bond lock integration |
| `ReputationRegistry` | **IMPLEMENTED** | Metric storage foundation (`successfulFills`, `failedFills`, `timeouts`, `latency`) |
| `DestinationVault` | **IMPLEMENTED** | Destination-side output token fill accounting and release boundaries |
| `VerificationAdapter` | **IMPLEMENTED** | Deterministic proof verification over chain, token, recipient, minimum amount, deadline, and proof uniqueness (`INVARIANT-007`) |
| `BatchAuction` | **IMPLEMENTED** | Sealed commit-reveal auction window, commitment hashing (`INVARIANT-003`), reveal validation, winner designation |
| `SettlementManager` | **IMPLEMENTED (Phase 1 Scoped)** | Authorization boundary requiring valid verification (`INVARIANT-008`, `INVARIANT-010`) (Full payment/refund orchestration deferred to Phase 10) |

---

## Modular Design & Prevention of God Contracts

IntentMesh enforces a strict separation of concerns across single-responsibility contracts. No single contract holds omnipotent authority over user funds, solver collateral, auction logic, and verification state simultaneously. Payouts and fund transfers require explicit, state-verified authorization across distinct single-purpose contracts.

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

### 1. IntentRegistry
* **Responsibility**: Authoritative registry for intent registration, validation, nonce tracking, and lifecycle status tracking.
* **State Owned**: `mapping(bytes32 => Intent) private _intents;`, `mapping(bytes32 => IntentState) private _intentStates;`, `mapping(address => uint256) private _userNonces;`.
* **State Read**: User nonces, intent status, intent specs.
* **State Modify**: Intent status, user nonces, intent records.
* **Important Functions / Interfaces**:
  * `function registerIntent(address inputToken, uint256 inputAmount, uint64 destinationChainId, address destinationToken, address recipient, uint256 minOutputAmount, uint64 deadline) external returns (bytes32 intentHash)`
  * `function updateIntentState(bytes32 intentHash, IntentState newState) external`
  * `function getIntent(bytes32 intentHash) external view returns (Intent memory)`
* **Events**: `event IntentRegistered(bytes32 indexed intentHash, address indexed user, uint256 nonce);`, `event NonceConsumed(address indexed user, uint256 nonce);`, `event IntentStateChanged(bytes32 indexed intentHash, uint8 newState);`.
* **Security Assumptions**: Only authorized contracts can update state. Nonces are strictly monotonic.
* **Dependencies**: `ProtocolTypes`, `Errors`, `Events`.

### 2. InputEscrow
* **Responsibility**: Holds user input tokens during intent execution; releases funds to solver or returns funds to user upon settlement instructions.
* **State Owned**: `mapping(bytes32 => EscrowRecord) private _escrows;`.
* **State Read**: Escrow balances, lock status.
* **State Modify**: Lock/unlock escrow balances.
* **Important Functions / Interfaces**:
  * `function lockFunds(bytes32 intentHash, address token, uint256 amount, address depositor) external`
  * `function releaseFunds(bytes32 intentHash, address recipient) external`
  * `function refundFunds(bytes32 intentHash, address user) external`
* **Events**: `event FundsLocked(bytes32 indexed intentHash, address indexed token, uint256 amount);`, `event FundsReleased(bytes32 indexed intentHash, address indexed recipient, uint256 amount);`, `event FundsRefunded(bytes32 indexed intentHash, address indexed user, uint256 amount);`.
* **Security Assumptions**: Payout functions (`releaseFunds`, `refundFunds`) are restricted exclusively to `SettlementManager`.
* **Dependencies**: `IERC20`, `SafeERC20`, `ReentrancyGuard`.

### 3. SolverRegistry
* **Responsibility**: Registers authorized solvers, manages solver metadata, active status, and operational keys.
* **State Owned**: `mapping(address => SolverProfile) private _solvers;`.
* **State Read**: Solver status, operational profiles.
* **State Modify**: Register solver, update solver status.
* **Important Functions / Interfaces**:
  * `function registerSolver(string calldata metadataURI) external`
  * `function setSolverStatus(address solver, bool isActive) external`
  * `function isSolverActive(address solver) external view returns (bool)`
* **Events**: `event SolverRegistered(address indexed solver, string metadataURI);`, `event SolverStatusChanged(address indexed solver, bool isActive);`.
* **Security Assumptions**: Solvers must be active to participate in auctions or reserve capacity.
* **Dependencies**: `ProtocolTypes`.

### 4. SolverBondManager
* **Responsibility**: Manages solver collateral deposits, unencumbered bond balances, collateral locking, and penalty authorization interface foundation.
* **State Owned**: `mapping(address => uint256) private _totalBonds;`, `mapping(address => uint256) private _lockedBonds;`.
* **State Read**: Total, locked, and available solver bond balances.
* **State Modify**: Deposit bond, withdraw bond, lock/unlock bond, slash bond interface.
* **Important Functions / Interfaces**:
  * `function depositBond() external payable`
  * `function lockBond(address solver, uint256 amount) external`
  * `function unlockBond(address solver, uint256 amount) external`
  * `function withdrawBond(uint256 amount) external`
  * `function slashBond(address solver, uint256 amount, address recipient) external`
* **Events**: `event BondDeposited(address indexed solver, address indexed token, uint256 amount);`, `event BondLocked(address indexed solver, uint256 amount);`, `event BondUnlocked(address indexed solver, uint256 amount);`, `event BondWithdrawn(address indexed solver, address indexed token, uint256 amount);`, `event BondSlashed(address indexed solver, uint256 amount, address indexed recipient);`.
* **Security Assumptions**: Locked bond cannot be withdrawn by solvers (`INVARIANT-005`). `slashBond` is restricted to `SettlementManager`. Full objective failure policy deferred to Phase 11.
* **Dependencies**: `ReentrancyGuard`.

### 5. BatchAuction
* **Responsibility**: Collects sealed solver bids for an intent, validates bid signatures/commitments, and enforces commit-reveal auction windows.
* **State Owned**: `mapping(bytes32 => AuctionRecord) private _auctions;`, `mapping(bytes32 => mapping(address => bytes32)) private _commitments;`.
* **State Read**: Intent specs, solver registration, sealed commitments.
* **State Modify**: Record commitments, reveal bids, finalize auction.
* **Important Functions / Interfaces**:
  * `function createAuction(bytes32 intentHash, uint64 commitDeadline, uint64 revealDeadline) external`
  * `function commitBid(bytes32 intentHash, bytes32 commitmentHash) external`
  * `function revealBid(bytes32 intentHash, uint256 proposedOutputAmount, uint64 executionDeadline, uint256 feeAmount, bytes32 nonce) external`
  * `function finalizeAuction(bytes32 intentHash, address winningSolver) external`
* **Events**: `event AuctionCreated(bytes32 indexed intentHash, uint64 commitDeadline, uint64 revealDeadline);`, `event BidCommitted(bytes32 indexed intentHash, address indexed solver, bytes32 commitmentHash);`, `event BidRevealed(bytes32 indexed intentHash, address indexed solver, uint256 proposedOutputAmount);`, `event AuctionClosed(bytes32 indexed intentHash, address indexed winningSolver);`.
* **Security Assumptions**: Bids cannot be revealed after reveal deadline. Winning selection requires active solver status.
* **Dependencies**: `ISolverRegistry`.

### 6. CapacityRegistry
* **Responsibility**: Tracks solver active liabilities and enforces capacity reservation limits per (solver, chain, token).
* **State Owned**: `mapping(address => mapping(uint64 => mapping(address => uint256))) private _declaredCapacity;`, `mapping(address => mapping(uint64 => mapping(address => uint256))) private _reservedCapacity;`, `mapping(bytes32 => CapacityReservation) private _reservations;`.
* **State Read**: Solver liabilities, bond balances, declared capacity.
* **State Modify**: Declare capacity, reserve capacity, release capacity.
* **Important Functions / Interfaces**:
  * `function declareCapacity(uint64 chainId, address token, uint256 capacity) external`
  * `function reserveCapacity(bytes32 intentHash, address solver, uint64 chainId, address token, uint256 amount, uint64 expiry) external returns (bytes32 reservationId)`
  * `function releaseCapacity(bytes32 reservationId) external`
* **Events**: `event CapacityUpdated(address indexed solver, uint64 indexed chainId, address indexed token, uint256 capacity);`, `event CapacityReserved(bytes32 indexed reservationId, bytes32 indexed intentHash, address indexed solver, uint256 amount);`, `event CapacityReleased(bytes32 indexed reservationId, bytes32 indexed intentHash, address indexed solver, uint256 amount);`.
* **Security Assumptions**: Total active liabilities for a solver can never exceed unencumbered bond balance or declared capacity (`INVARIANT-004`).
* **Dependencies**: `ISolverBondManager`.

### 7. DestinationVault
* **Responsibility**: Receives cross-chain output tokens on the destination chain and records fulfilment deposits.
* **State Owned**: `mapping(bytes32 => FulfilmentRecord) private _fulfilments;`.
* **State Read**: Fulfilment status, output amounts, recipient addresses.
* **State Modify**: Record fulfilment details upon token receipt.
* **Important Functions / Interfaces**:
  * `function depositFulfilment(bytes32 intentHash, address token, uint256 amount, address recipient) external`
  * `function releaseFulfilment(bytes32 intentHash) external`
* **Events**: `event FulfilmentRecorded(bytes32 indexed intentHash, address indexed token, uint256 amount, address indexed recipient);`.
* **Security Assumptions**: Accurately records incoming token transfers via SafeERC20.
* **Dependencies**: `IERC20`, `SafeERC20`, `ReentrancyGuard`.

### 8. VerificationAdapter
* **Responsibility**: Deterministically verifies fulfilment proof parameters against original intent specifications.
* **State Owned**: `mapping(bytes32 => bool) private _consumedProofs;`, `mapping(bytes32 => VerificationStatus) private _statuses;`.
* **State Read**: Intent parameters, fulfilment records, proof data.
* **State Modify**: Record proof consumption and verification status.
* **Important Functions / Interfaces**:
  * `function verifyProof(bytes32 intentHash, VerificationProof calldata proof) external returns (bool)`
  * `function getVerificationStatus(bytes32 intentHash) external view returns (VerificationStatus)`
* **Events**: `event VerificationSubmitted(bytes32 indexed intentHash, bytes32 proofHash);`, `event VerificationResultRecorded(bytes32 indexed intentHash, VerificationStatus status);`.
* **Security Assumptions**: Deterministic proof verification over exact destination chain, token, recipient, minimum amount, and deadline. Proof can only be consumed once (`INVARIANT-007`).
* **Dependencies**: `IIntentRegistry`.

### 9. ReputationRegistry
* **Responsibility**: Tracks historical solver performance metrics (successful fills, timeouts, slashings) to feed into risk evaluation.
* **State Owned**: `mapping(address => SolverMetrics) private _metrics;`.
* **State Read**: Solver performance history.
* **State Modify**: Increment success/failure counters.
* **Important Functions / Interfaces**:
  * `function recordExecution(address solver, bool success, uint64 latency, FailureType failureType) external`
  * `function getSolverMetrics(address solver) external view returns (SolverMetrics memory)`
* **Events**: `event ReputationUpdated(address indexed solver, uint32 successfulFills, uint32 failedFills, uint32 timeouts);`.
* **Security Assumptions**: Metrics updates are restricted to authorized reporters.
* **Dependencies**: `ProtocolTypes`.

### 10. SettlementManager
* **Responsibility**: Settlement authorization boundary requiring valid verification before payout authorization.
* **State Owned**: `mapping(bytes32 => bool) private _settledIntents;`, `mapping(bytes32 => bool) private _refundedIntents;`.
* **State Read**: Verification status, settlement records.
* **State Modify**: Mark intent authorized for settlement/refund.
* **Important Functions / Interfaces**:
  * `function authorizeSettlement(bytes32 intentHash, address solver) external`
  * `function authorizeRefund(bytes32 intentHash, address user, string calldata reason) external`
  * `function assertAINotAuthoritative() external pure`
* **Events**: `event SettlementAuthorized(bytes32 indexed intentHash, address indexed solver);`, `event RefundAuthorized(bytes32 indexed intentHash, address indexed user, string reason);`.
* **Security Assumptions**: `authorizeSettlement` requires `VerificationAdapter.getVerificationStatus(intentHash) == VerificationStatus.VALID` (`INVARIANT-008`). AI components have ZERO state authorization capability (`INVARIANT-010`). Full multi-contract payout orchestration deferred to Phase 10.
* **Dependencies**: `IVerificationAdapter`, `IInputEscrow`.
