// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./types/ProtocolTypes.sol";
import "./libraries/Errors.sol";
import "./libraries/Events.sol";
import "./interfaces/IBatchAuction.sol";
import "./interfaces/ISolverRegistry.sol";

/**
 * @title BatchAuction
 * @notice Commit-reveal batch auction for solver bidding.
 * @dev Protects sealed bids prior to reveal window.
 */
contract BatchAuction is IBatchAuction, Ownable, Events {
    struct AuctionRecord {
        uint64 commitDeadline;
        uint64 revealDeadline;
        address winningSolver;
        bool isClosed;
    }

    mapping(bytes32 => AuctionRecord) private _auctions;
    // intentHash => solver => commitmentHash
    mapping(bytes32 => mapping(address => bytes32)) private _commitments;
    // intentHash => solver => Bid
    mapping(bytes32 => mapping(address => ProtocolTypes.Bid)) private _revealedBids;

    ISolverRegistry public solverRegistry;

    constructor(address _solverRegistry) Ownable(msg.sender) {
        if (_solverRegistry == address(0)) revert Errors.ZeroAddress();
        solverRegistry = ISolverRegistry(_solverRegistry);
    }

    function createAuction(bytes32 intentHash, uint64 commitDeadline, uint64 revealDeadline)
        external
        override
        onlyOwner
    {
        if (_auctions[intentHash].commitDeadline > 0) revert Errors.AuctionAlreadyExists();
        if (commitDeadline <= block.timestamp || revealDeadline <= commitDeadline) revert Errors.InvalidParameters();

        _auctions[intentHash] = AuctionRecord({
            commitDeadline: commitDeadline, revealDeadline: revealDeadline, winningSolver: address(0), isClosed: false
        });

        emit AuctionCreated(intentHash, commitDeadline, revealDeadline);
    }

    function commitBid(bytes32 intentHash, bytes32 commitmentHash) external override {
        if (!solverRegistry.isSolverActive(msg.sender)) revert Errors.SolverInactive();
        AuctionRecord storage auction = _auctions[intentHash];
        if (auction.commitDeadline == 0 || block.timestamp > auction.commitDeadline) revert Errors.AuctionClosed();
        if (_commitments[intentHash][msg.sender] != bytes32(0)) revert Errors.BidAlreadyCommitted();

        _commitments[intentHash][msg.sender] = commitmentHash;
        emit BidCommitted(intentHash, msg.sender, commitmentHash);
    }

    function revealBid(
        bytes32 intentHash,
        uint256 proposedOutputAmount,
        uint64 executionDeadline,
        uint256 feeAmount,
        bytes32 nonce
    ) external override {
        AuctionRecord storage auction = _auctions[intentHash];
        if (block.timestamp <= auction.commitDeadline || block.timestamp > auction.revealDeadline) {
            revert Errors.RevealWindowClosed();
        }

        bytes32 storedCommitment = _commitments[intentHash][msg.sender];
        if (storedCommitment == bytes32(0)) revert Errors.BidNotCommitted();

        bytes32 computedHash =
            keccak256(abi.encode(msg.sender, proposedOutputAmount, executionDeadline, feeAmount, nonce));
        if (computedHash != storedCommitment) revert Errors.InvalidReveal();

        _revealedBids[intentHash][msg.sender] = ProtocolTypes.Bid({
            intentHash: intentHash,
            solver: msg.sender,
            proposedOutputAmount: proposedOutputAmount,
            executionDeadline: executionDeadline,
            feeAmount: feeAmount,
            nonce: nonce
        });

        emit BidRevealed(intentHash, msg.sender, proposedOutputAmount);
    }

    function finalizeAuction(bytes32 intentHash, address winningSolver) external override onlyOwner {
        AuctionRecord storage auction = _auctions[intentHash];
        if (auction.commitDeadline == 0 || auction.isClosed) revert Errors.AuctionClosed();
        if (!solverRegistry.isSolverActive(winningSolver)) revert Errors.SolverInactive();

        auction.winningSolver = winningSolver;
        auction.isClosed = true;

        emit AuctionClosed(intentHash, winningSolver);
    }

    function getWinningSolver(bytes32 intentHash) external view override returns (address) {
        return _auctions[intentHash].winningSolver;
    }

    function getBidCommitment(bytes32 intentHash, address solver) external view override returns (bytes32) {
        return _commitments[intentHash][solver];
    }
}
