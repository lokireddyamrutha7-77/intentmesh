# IntentMesh Solver Interface & SDK Specification

This document details the **Solver Identity, Capabilities, Bond & Capacity Integration, SDK Interface, and Structural Eligibility Logic** implemented in Phase 3.

---

## 1. Architectural Scope & Independent Solver Model

In IntentMesh, **solvers are independent execution participants**. The protocol does not assume that solvers are controlled by the same organization or backend infrastructure. Multiple solver identities interact with protocol smart contracts autonomously via standardized, typed interfaces.

Phase 3 establishes:
1. **Solver Identity & Registration** (`SolverRegistry.sol`)
2. **Operational Activation Toggling** (Self-managed status control)
3. **Chain Capabilities & Chain-Aware Token Capabilities**
4. **Solver Bond & Liquidity Capacity Integration**
5. **TypeScript Solver SDK** (`@intentmesh/solver-sdk`)
6. **Structural Eligibility Engine** (`evaluateEligibility`)

> [!NOTE]
> Phase 3 does **NOT** implement competitive auction bidding, quote generation, risk scoring, AI analysis, route optimization, execution, verification, or settlement workflows. Those belong to later phases.

---

## 2. Solver Identity & Capability Model

### Registration & Profile
* **Registration**: Solvers call `registerSolver(string metadataURI)`. Each address maps to a unique `SolverProfile`.
* **Immutability & Non-Collision**: Zero-address registration, duplicate registration, and profile overwriting are strictly rejected.
* **Self-Managed Activation Status**: Solvers manage their own operational state (`ACTIVE` ↔ `INACTIVE`) via `setSolverStatus(bool isActive)`. Arbitrary accounts cannot alter a solver's status. Emergency admin control (`setSolverStatusByAdmin`) is narrowly scoped to `onlyOwner`.

### Chain & Token Capabilities
* **Chain Capabilities**: Solvers declare supported chains (`addChainCapability(chainId)`, `removeChainCapability(chainId)`).
* **Chain-Aware Token Capabilities**: Tokens are explicitly associated with specific chain IDs (e.g. `Chain 1 + USDC` vs `Chain 10 + USDC`). Duplicate capabilities and additions without supporting the underlying chain revert deterministically.
* **Discovery Queries**: `SolverRegistry` exposes view functions for off-chain services:
  * `isSolverRegistered(solver)`
  * `isSolverActive(solver)`
  * `isChainSupported(solver, chainId)`
  * `isTokenSupported(solver, chainId, token)`
  * `getSupportedChains(solver)`
  * `getSupportedTokens(solver, chainId)`

---

## 3. Strict Contract Boundaries

To prevent god contracts, protocol responsibilities remain modularly segregated:
- **`SolverRegistry`**: Identity, profile metadata, activation status, chain capabilities, token capabilities.
- **`SolverBondManager`**: Collateral deposits, locked/available bond balances, lock/unlock boundaries.
- **`CapacityRegistry`**: Declared, reserved, and available liquidity capacity per `(solver, chain, token)`.

No contract duplicates storage or state ownership of another.

---

## 4. TypeScript Solver SDK (`@intentmesh/solver-sdk`)

The `@intentmesh/solver-sdk` package provides strongly typed TypeScript abstractions for solver integration:

- **Keyless Architecture**: Contains zero private keys, zero hardcoded wallets, and zero hardcoded RPC endpoints. Signer and provider dependencies are explicitly injected via `ISolverContractAdapter`.
- **Core Modules**:
  - `SolverClient`: Typed client interface for registration, status toggling, capabilities management, bond/capacity lookups, and structural eligibility checks.
  - `evaluateEligibility`: Deterministic evaluator for structural eligibility.

### Structural Eligibility Logic (`evaluateEligibility`)
Given an `Intent`, `SolverProfile`, and `SolverCapabilities`, `evaluateEligibility` computes structural eligibility and returns machine-readable reason enums:

| Reason Enum | Meaning |
| :--- | :--- |
| `ELIGIBLE` | Solver meets all structural requirements for intent execution. |
| `SOLVER_UNREGISTERED` | Solver address is not registered in `SolverRegistry`. |
| `SOLVER_INACTIVE` | Solver has deactivated its operational status. |
| `SOURCE_CHAIN_UNSUPPORTED` | Solver has not declared capability for `intent.sourceChainId`. |
| `DESTINATION_CHAIN_UNSUPPORTED` | Solver has not declared capability for `intent.destinationChainId`. |
| `SOURCE_TOKEN_UNSUPPORTED` | Solver has not declared capability for `intent.sourceToken` on `intent.sourceChainId`. |
| `DESTINATION_TOKEN_UNSUPPORTED` | Solver has not declared capability for `intent.destinationToken` on `intent.destinationChainId`. |
| `EXPIRED_INTENT` | Intent deadline has elapsed. |

---

## 5. Security & Verification Assumptions

- **Ownership Integrity**: A solver cannot modify another solver's profile, status, capabilities, bond, or capacity.
- **Identities**: Solver identity is bound to its EVM address.
- **Key Safety**: The SDK never stores, prints, or exposes transaction credentials.
