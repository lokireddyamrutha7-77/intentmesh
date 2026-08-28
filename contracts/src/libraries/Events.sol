// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../types/ProtocolTypes.sol";

/**
 * @title Events
 * @notice Standardized event declarations for IntentMesh protocol.
 */
abstract contract Events {
    // IntentRegistry Events
    event IntentRegistered(bytes32 indexed intentHash, address indexed user, uint256 nonce);
    event IntentCreated(bytes32 indexed intentHash, address indexed user, uint256 nonce);
    event IntentValidated(bytes32 indexed intentHash);
    event NonceConsumed(address indexed user, uint256 nonce);
    event IntentStateChanged(bytes32 indexed intentHash, ProtocolTypes.IntentState newState);

    // InputEscrow Events
    event FundsLocked(bytes32 indexed intentHash, address indexed token, uint256 amount);
    event IntentEscrowLocked(bytes32 indexed intentHash, address indexed token, uint256 amount);
    event FundsReleased(bytes32 indexed intentHash, address indexed recipient, uint256 amount);
    event FundsRefunded(bytes32 indexed intentHash, address indexed user, uint256 amount);

    // SolverRegistry Events
    event SolverRegistered(address indexed solver, string metadataURI);
    event SolverStatusChanged(address indexed solver, bool isActive);
    event SolverChainCapabilityAdded(address indexed solver, uint64 indexed chainId);
    event SolverChainCapabilityRemoved(address indexed solver, uint64 indexed chainId);
    event SolverTokenCapabilityAdded(address indexed solver, uint64 indexed chainId, address indexed token);
    event SolverTokenCapabilityRemoved(address indexed solver, uint64 indexed chainId, address indexed token);

    // SolverBondManager Events
    event BondDeposited(address indexed solver, address indexed token, uint256 amount);
    event BondLocked(address indexed solver, uint256 amount);
    event BondUnlocked(address indexed solver, uint256 amount);
    event BondWithdrawn(address indexed solver, address indexed token, uint256 amount);
    event BondSlashed(address indexed solver, uint256 amount, address indexed recipient);

    // CapacityRegistry Events
    event CapacityUpdated(address indexed solver, uint64 indexed chainId, address indexed token, uint256 capacity);
    event CapacityReserved(
        bytes32 indexed reservationId, bytes32 indexed intentHash, address indexed solver, uint256 amount
    );
    event CapacityReleased(
        bytes32 indexed reservationId, bytes32 indexed intentHash, address indexed solver, uint256 amount
    );

    // BatchAuction Events
    event AuctionCreated(
        bytes32 indexed auctionId, bytes32 indexed intentHash, uint64 commitDeadline, uint64 revealDeadline
    );
    event BidCommitted(
        bytes32 indexed auctionId, bytes32 indexed intentHash, address indexed solver, bytes32 commitmentHash
    );
    event BidRevealed(
        bytes32 indexed auctionId,
        bytes32 indexed intentHash,
        address indexed solver,
        uint256 expectedOutputAmount,
        uint32 estimatedExecutionTime,
        uint256 capacityRequired
    );
    event AuctionFinalized(
        bytes32 indexed auctionId,
        bytes32 indexed intentHash,
        address indexed winningSolver,
        uint256 winningOutputAmount,
        bytes32 winningBidHash
    );
    event AuctionCancelled(bytes32 indexed auctionId, bytes32 indexed intentHash, string reason);

    // VerificationAdapter Events
    event VerificationSubmitted(bytes32 indexed intentHash, bytes32 proofHash);
    event VerificationResultRecorded(bytes32 indexed intentHash, ProtocolTypes.VerificationStatus status);

    // SettlementManager Events
    event SettlementAuthorized(bytes32 indexed intentHash, address indexed solver);
    event RefundAuthorized(bytes32 indexed intentHash, address indexed user, string reason);
    event ReputationUpdated(address indexed solver, uint32 successfulFills, uint32 failedFills, uint32 timeouts);
}
