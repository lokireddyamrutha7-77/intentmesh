// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../types/ProtocolTypes.sol";

/**
 * @title Events
 * @notice Standardized protocol events emitted by IntentMesh contracts.
 */
interface Events {
    // Intent Events
    event IntentRegistered(bytes32 indexed intentHash, address indexed user, uint256 nonce);
    event NonceConsumed(address indexed user, uint256 nonce);
    event IntentStateChanged(bytes32 indexed intentHash, ProtocolTypes.IntentState newState);

    // Escrow Events
    event FundsLocked(bytes32 indexed intentHash, address indexed token, uint256 amount);
    event FundsReleased(bytes32 indexed intentHash, address indexed recipient, uint256 amount);
    event FundsRefunded(bytes32 indexed intentHash, address indexed user, uint256 amount);

    // Solver Events
    event SolverRegistered(address indexed solver, string metadataURI);
    event SolverStatusChanged(address indexed solver, bool isActive);

    // Bond Events
    event BondDeposited(address indexed solver, address indexed token, uint256 amount);
    event BondLocked(address indexed solver, uint256 amount);
    event BondUnlocked(address indexed solver, uint256 amount);
    event BondWithdrawn(address indexed solver, address indexed token, uint256 amount);
    event BondSlashed(address indexed solver, uint256 amount, address indexed recipient);

    // Capacity Events
    event CapacityUpdated(address indexed solver, uint64 indexed chainId, address indexed token, uint256 capacity);
    event CapacityReserved(
        bytes32 indexed reservationId, bytes32 indexed intentHash, address indexed solver, uint256 amount
    );
    event CapacityReleased(
        bytes32 indexed reservationId, bytes32 indexed intentHash, address indexed solver, uint256 amount
    );

    // Reputation Events
    event ReputationUpdated(address indexed solver, uint32 successfulFills, uint32 failedFills, uint32 timeouts);

    // Auction Events
    event AuctionCreated(bytes32 indexed intentHash, uint64 commitDeadline, uint64 revealDeadline);
    event BidCommitted(bytes32 indexed intentHash, address indexed solver, bytes32 commitmentHash);
    event BidRevealed(bytes32 indexed intentHash, address indexed solver, uint256 proposedOutputAmount);
    event AuctionClosed(bytes32 indexed intentHash, address indexed winningSolver);

    // Verification Events
    event VerificationSubmitted(bytes32 indexed intentHash, bytes32 proofHash);
    event VerificationResultRecorded(bytes32 indexed intentHash, ProtocolTypes.VerificationStatus status);

    // Settlement Events
    event SettlementAuthorized(bytes32 indexed intentHash, address indexed solver);
    event SolverPaid(bytes32 indexed intentHash, address indexed solver, uint256 amount);
    event RefundAuthorized(bytes32 indexed intentHash, address indexed user, string reason);
}
