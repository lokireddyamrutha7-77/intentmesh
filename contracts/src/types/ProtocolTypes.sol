// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ProtocolTypes
 * @notice Shared protocol types, enums, and structures for IntentMesh.
 */
library ProtocolTypes {
    /// @notice Lifecycle state of an Intent
    enum IntentState {
        NONE,
        CREATED,
        VALIDATED,
        AUCTION_OPEN,
        BIDS_LOCKED,
        WINNER_SELECTED,
        CAPACITY_RESERVED,
        EXECUTING,
        FULFILMENT_PENDING,
        VERIFICATION_PENDING,
        SETTLEMENT,
        COMPLETED,
        EXPIRED,
        FAILED,
        REFUNDED,
        REORGED
    }

    /// @notice Verification status returned by VerificationAdapter
    enum VerificationStatus {
        UNVERIFIED,
        VALID,
        INVALID,
        PENDING,
        REORGED,
        UNAVAILABLE
    }

    /// @notice Categories of execution or protocol failures
    enum FailureType {
        NONE,
        SOLVER_TIMEOUT,
        PARTIAL_FILL,
        FALSE_PROOF,
        VERIFIER_UNAVAILABLE,
        CHAIN_REORG,
        CAPACITY_FAILURE,
        EXECUTION_REVERT,
        INTENT_EXPIRY
    }

    /// @notice Canonical Intent definition
    struct Intent {
        bytes32 intentHash;
        address user;
        address inputToken;
        uint256 inputAmount;
        uint64 destinationChainId;
        address destinationToken;
        address recipient;
        uint256 minOutputAmount;
        uint64 deadline;
        uint256 nonce;
    }

    /// @notice Sealed bid commitment submitted during auction
    struct BidCommitment {
        bytes32 intentHash;
        address solver;
        bytes32 commitmentHash;
        uint64 timestamp;
    }

    /// @notice Revealed Bid details
    struct Bid {
        bytes32 intentHash;
        address solver;
        uint256 proposedOutputAmount;
        uint64 executionDeadline;
        uint256 feeAmount;
        bytes32 nonce;
    }

    /// @notice Solver registration profile
    struct SolverProfile {
        address solver;
        bool isActive;
        uint64 registeredAt;
        string metadataURI;
    }

    /// @notice Capacity reservation liability record
    struct CapacityReservation {
        bytes32 reservationId;
        bytes32 intentHash;
        address solver;
        uint64 destinationChainId;
        address token;
        uint256 amount;
        uint64 expiryTimestamp;
        bool isReleased;
    }

    /// @notice Verification proof payload
    struct VerificationProof {
        bytes32 proofHash;
        bytes32 intentHash;
        uint64 destinationChainId;
        address destinationToken;
        address recipient;
        uint256 deliveredAmount;
        uint64 blockTimestamp;
        bytes proofData;
    }

    /// @notice Historical solver execution metrics
    struct SolverMetrics {
        uint32 successfulFills;
        uint32 failedFills;
        uint32 timeouts;
        uint32 proofFailures;
        uint64 totalLatencySeconds;
    }
}
