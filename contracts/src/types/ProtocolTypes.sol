// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ProtocolTypes
 * @notice Shared domain structures and enums for the IntentMesh protocol.
 */
library ProtocolTypes {
    /**
     * @notice Primary lifecycle states for an Intent.
     */
    enum IntentState {
        NONE,
        CREATED,
        VALIDATED,
        AUCTION_READY,
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

    /**
     * @notice States for competitive commit-reveal auctions.
     */
    enum AuctionState {
        NOT_STARTED,
        COMMIT,
        REVEAL,
        FINALIZED,
        CANCELLED
    }

    /**
     * @notice Status of cross-chain execution verification.
     */
    enum VerificationStatus {
        UNVERIFIED,
        VALID,
        INVALID,
        PENDING,
        REORGED,
        UNAVAILABLE
    }

    /**
     * @notice Operational failure types for reputation tracking.
     */
    enum FailureType {
        NONE,
        SOLVER_TIMEOUT,
        FALSE_PROOF,
        PARTIAL_FILL,
        CAPACITY_FAILURE,
        EXECUTION_REVERT
    }

    /**
     * @notice Canonical 11-field representation of an Intent.
     */
    struct Intent {
        bytes32 intentHash;
        address user;
        uint64 sourceChainId;
        address sourceToken;
        uint256 sourceAmount;
        uint64 destinationChainId;
        address destinationToken;
        address recipient;
        uint256 minOutputAmount;
        uint64 deadline;
        uint256 nonce;
        bytes32 verificationPolicy;
        uint64 createdAt;
    }

    /**
     * @notice Solver identity and metadata profile.
     */
    struct SolverProfile {
        address solver;
        bool isActive;
        uint64 registeredAt;
        string metadataURI;
    }

    /**
     * @notice Solver performance and reputation metrics.
     */
    struct SolverMetrics {
        address solver;
        uint32 successfulFills;
        uint32 failedFills;
        uint32 timeouts;
        uint32 proofFailures;
        uint64 totalLatencySeconds;
    }

    /**
     * @notice Capacity reservation record.
     */
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

    /**
     * @notice Verification proof structure submitted to verifier adapter.
     */
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

    /**
     * @notice Bid details submitted during commit-reveal auction.
     */
    struct Bid {
        bytes32 auctionId;
        bytes32 intentHash;
        address solver;
        uint256 expectedOutputAmount;
        uint32 estimatedExecutionTime;
        uint256 capacityRequired;
        bytes32 salt;
        bool revealed;
        bool valid;
    }

    /**
     * @notice Auction record structure.
     */
    struct Auction {
        bytes32 auctionId;
        bytes32 intentHash;
        uint64 commitDeadline;
        uint64 revealDeadline;
        uint64 createdAt;
        AuctionState state;
        address winner;
        bytes32 winningBidHash;
        uint256 winningOutputAmount;
    }
}
