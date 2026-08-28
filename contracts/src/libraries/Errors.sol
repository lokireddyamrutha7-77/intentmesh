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

    // IntentRegistry & Validation Errors
    error InvalidIntent();
    error InvalidSourceToken();
    error InvalidDestinationToken();
    error InvalidRecipient();
    error InvalidAmount();
    error InvalidMinimumOutput();
    error InvalidDeadline();
    error InvalidChain();
    error InvalidVerificationPolicy();
    error NonceAlreadyUsed();
    error IntentAlreadyExists();
    error IntentExpired();
    error IntentNotFound();
    error IntentNotAuctionReady();
    error InvalidStateTransition();

    // InputEscrow Errors
    error EscrowNotFound();
    error EscrowAlreadyDeposited();
    error EscrowAlreadyLocked();
    error EscrowAmountMismatch();
    error InvalidEscrowState();

    // SolverRegistry Errors
    error SolverAlreadyRegistered();
    error SolverNotRegistered();
    error SolverInactive();
    error ChainAlreadySupported();
    error ChainNotSupported();
    error TokenAlreadySupported();
    error TokenNotSupported();

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
    error AuctionNotFound();
    error AuctionNotInCommitState();
    error AuctionNotInRevealState();
    error AuctionNotReadyToFinalize();
    error AuctionAlreadyFinalized();
    error BidAlreadyCommitted();
    error BidNotCommitted();
    error InvalidReveal();
    error CommitmentMismatch();
    error CommitmentAlreadySubmitted();
    error CommitmentNotFound();
    error RevealAlreadySubmitted();
    error RevealDeadlinePassed();
    error MaxBidsReached();
    error NoValidBids();

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
