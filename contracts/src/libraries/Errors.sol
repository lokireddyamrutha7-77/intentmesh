// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Errors
 * @notice Custom Solidity revert errors for IntentMesh protocol.
 */
library Errors {
    // General Errors
    error ZeroAddress();
    error ZeroAmount();
    error Unauthorized();
    error InvalidParameters();

    // IntentRegistry Errors
    error InvalidIntent();
    error IntentAlreadyExists();
    error NonceAlreadyUsed();
    error IntentExpired();
    error InvalidDeadline();

    // InputEscrow Errors
    error EscrowNotFound();
    error EscrowAlreadyDeposited();
    error InvalidEscrowState();

    // SolverRegistry Errors
    error SolverAlreadyRegistered();
    error SolverNotRegistered();
    error SolverInactive();

    // SolverBondManager Errors
    error InsufficientBond();
    error BondLocked();
    error InvalidBondAmount();

    // CapacityRegistry Errors
    error InsufficientCapacity();
    error CapacityExceeded();
    error ReservationNotFound();
    error ReservationExpired();
    error ReservationAlreadyReleased();

    // BatchAuction Errors
    error AuctionClosed();
    error AuctionNotClosed();
    error AuctionAlreadyExists();
    error BidAlreadyCommitted();
    error BidNotCommitted();
    error InvalidReveal();
    error RevealWindowClosed();

    // VerificationAdapter Errors
    error InvalidProof();
    error ProofAlreadyConsumed();
    error ChainMismatch();
    error TokenMismatch();
    error RecipientMismatch();
    error OutputAmountTooLow();

    // SettlementManager Errors
    error VerificationRequired();
    error AlreadySettled();
    error InvalidSettlementState();

    // Security & AI Bounds
    error AINotAuthoritative();
}
