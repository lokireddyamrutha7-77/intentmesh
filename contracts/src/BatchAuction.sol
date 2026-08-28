// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IBatchAuction.sol";
import "./interfaces/ICapacityRegistry.sol";
import "./interfaces/IIntentRegistry.sol";
import "./interfaces/ISolverBondManager.sol";
import "./interfaces/ISolverRegistry.sol";
import "./libraries/Errors.sol";
import "./libraries/Events.sol";
import "./types/ProtocolTypes.sol";

/**
 * @title BatchAuction
 * @notice Sealed commit-reveal auction engine for competitive solver selection.
 * @dev Enforces bounded participant scaling, atomic winner capacity reservation, and full finalization revalidation.
 */
contract BatchAuction is IBatchAuction, Ownable, ReentrancyGuard, Events {
    uint256 public constant MAX_BIDS_PER_AUCTION = 32;

    IIntentRegistry public immutable intentRegistry;
    ISolverRegistry public immutable solverRegistry;
    ISolverBondManager public immutable bondManager;
    ICapacityRegistry public immutable capacityRegistry;

    mapping(bytes32 => ProtocolTypes.Auction) private _auctions;
    mapping(bytes32 => bytes32) private _intentToAuction;

    // auctionId => solver => commitmentHash
    mapping(bytes32 => mapping(address => bytes32)) private _commitments;
    // auctionId => list of committed solvers
    mapping(bytes32 => address[]) private _committedSolvers;
    // auctionId => list of revealed bids
    mapping(bytes32 => ProtocolTypes.Bid[]) private _revealedBids;

    constructor(address _intentRegistry, address _solverRegistry, address _bondManager, address _capacityRegistry)
        Ownable(msg.sender)
    {
        if (
            _intentRegistry == address(0) || _solverRegistry == address(0) || _bondManager == address(0)
                || _capacityRegistry == address(0)
        ) {
            revert Errors.ZeroAddress();
        }
        intentRegistry = IIntentRegistry(_intentRegistry);
        solverRegistry = ISolverRegistry(_solverRegistry);
        bondManager = ISolverBondManager(_bondManager);
        capacityRegistry = ICapacityRegistry(_capacityRegistry);
    }

    function computeBidCommitmentHash(
        bytes32 auctionId,
        bytes32 intentHash,
        address solver,
        uint256 expectedOutputAmount,
        uint32 estimatedExecutionTime,
        uint256 capacityRequired,
        bytes32 salt
    ) public pure override returns (bytes32) {
        return keccak256(
            abi.encode(
                auctionId, intentHash, solver, expectedOutputAmount, estimatedExecutionTime, capacityRequired, salt
            )
        );
    }

    function computeAuctionId(bytes32 intentHash, uint64 commitDeadline) public pure override returns (bytes32) {
        return keccak256(abi.encode(intentHash, commitDeadline));
    }

    /**
     * @notice Creates a new commit-reveal auction for an AUCTION_READY intent.
     */
    function createAuction(bytes32 intentHash, uint64 commitDuration, uint64 revealDuration)
        external
        override
        returns (bytes32 auctionId)
    {
        if (intentHash == bytes32(0) || commitDuration == 0 || revealDuration == 0) {
            revert Errors.InvalidParameters();
        }
        if (intentRegistry.getIntentState(intentHash) != ProtocolTypes.IntentState.AUCTION_READY) {
            revert Errors.IntentNotAuctionReady();
        }

        if (_intentToAuction[intentHash] != bytes32(0)) {
            bytes32 existingId = _intentToAuction[intentHash];
            if (_auctions[existingId].state != ProtocolTypes.AuctionState.CANCELLED) {
                revert Errors.AuctionAlreadyExists();
            }
        }

        uint64 commitDeadline = uint64(block.timestamp) + commitDuration;
        uint64 revealDeadline = commitDeadline + revealDuration;

        auctionId = computeAuctionId(intentHash, commitDeadline);

        _auctions[auctionId] = ProtocolTypes.Auction({
            auctionId: auctionId,
            intentHash: intentHash,
            commitDeadline: commitDeadline,
            revealDeadline: revealDeadline,
            createdAt: uint64(block.timestamp),
            state: ProtocolTypes.AuctionState.COMMIT,
            winner: address(0),
            winningBidHash: bytes32(0),
            winningOutputAmount: 0
        });

        _intentToAuction[intentHash] = auctionId;

        emit AuctionCreated(auctionId, intentHash, commitDeadline, revealDeadline);
    }

    /**
     * @notice Submits a sealed bid commitment during the COMMIT window.
     */
    function submitCommitment(bytes32 auctionId, bytes32 commitmentHash) external override nonReentrant {
        ProtocolTypes.Auction storage auction = _auctions[auctionId];
        if (auction.auctionId == bytes32(0)) revert Errors.AuctionNotFound();
        if (block.timestamp > auction.commitDeadline) revert Errors.AuctionNotInCommitState();
        if (commitmentHash == bytes32(0)) revert Errors.InvalidParameters();

        if (!solverRegistry.isSolverRegistered(msg.sender)) revert Errors.SolverNotRegistered();
        if (!solverRegistry.isSolverActive(msg.sender)) revert Errors.SolverInactive();

        if (_commitments[auctionId][msg.sender] != bytes32(0)) revert Errors.CommitmentAlreadySubmitted();
        if (_committedSolvers[auctionId].length >= MAX_BIDS_PER_AUCTION) revert Errors.MaxBidsReached();

        _commitments[auctionId][msg.sender] = commitmentHash;
        _committedSolvers[auctionId].push(msg.sender);

        emit BidCommitted(auctionId, auction.intentHash, msg.sender, commitmentHash);
    }

    /**
     * @notice Reveals a previously committed bid during the REVEAL window.
     */
    function revealBid(
        bytes32 auctionId,
        uint256 expectedOutputAmount,
        uint32 estimatedExecutionTime,
        uint256 capacityRequired,
        bytes32 salt
    ) external override nonReentrant {
        ProtocolTypes.Auction storage auction = _auctions[auctionId];
        if (auction.auctionId == bytes32(0)) revert Errors.AuctionNotFound();

        if (block.timestamp <= auction.commitDeadline || block.timestamp > auction.revealDeadline) {
            revert Errors.AuctionNotInRevealState();
        }

        bytes32 storedCommitment = _commitments[auctionId][msg.sender];
        if (storedCommitment == bytes32(0)) revert Errors.CommitmentNotFound();

        // Reconstruct commitment hash
        bytes32 computedHash = computeBidCommitmentHash(
            auctionId,
            auction.intentHash,
            msg.sender,
            expectedOutputAmount,
            estimatedExecutionTime,
            capacityRequired,
            salt
        );

        if (computedHash != storedCommitment) revert Errors.CommitmentMismatch();

        // Check duplicate reveal
        ProtocolTypes.Bid[] storage bids = _revealedBids[auctionId];
        uint256 len = bids.length;
        for (uint256 i = 0; i < len; i++) {
            if (bids[i].solver == msg.sender) revert Errors.RevealAlreadySubmitted();
        }

        ProtocolTypes.Intent memory intent = intentRegistry.getIntent(auction.intentHash);

        // Basic bid parameter validation
        bool valid = (expectedOutputAmount >= intent.minOutputAmount) && (expectedOutputAmount > 0)
            && (estimatedExecutionTime > 0) && (capacityRequired > 0) && solverRegistry.isSolverActive(msg.sender)
            && solverRegistry.isChainSupported(msg.sender, intent.sourceChainId)
            && solverRegistry.isChainSupported(msg.sender, intent.destinationChainId)
            && solverRegistry.isTokenSupported(msg.sender, intent.sourceChainId, intent.sourceToken)
            && solverRegistry.isTokenSupported(msg.sender, intent.destinationChainId, intent.destinationToken);

        bids.push(
            ProtocolTypes.Bid({
                auctionId: auctionId,
                intentHash: auction.intentHash,
                solver: msg.sender,
                expectedOutputAmount: expectedOutputAmount,
                estimatedExecutionTime: estimatedExecutionTime,
                capacityRequired: capacityRequired,
                salt: salt,
                revealed: true,
                valid: valid
            })
        );

        emit BidRevealed(
            auctionId, auction.intentHash, msg.sender, expectedOutputAmount, estimatedExecutionTime, capacityRequired
        );
    }

    /**
     * @notice Finalizes the auction after the reveal deadline, deterministically selecting the winning candidate and reserving capacity.
     */
    function finalizeAuction(bytes32 auctionId) external override nonReentrant returns (address winner) {
        ProtocolTypes.Auction storage auction = _auctions[auctionId];
        if (auction.auctionId == bytes32(0)) revert Errors.AuctionNotFound();
        if (block.timestamp <= auction.revealDeadline) revert Errors.AuctionNotReadyToFinalize();
        if (auction.state == ProtocolTypes.AuctionState.FINALIZED) revert Errors.AuctionAlreadyFinalized();
        if (auction.state == ProtocolTypes.AuctionState.CANCELLED) revert Errors.AuctionNotReadyToFinalize();

        ProtocolTypes.Bid[] memory bids = _revealedBids[auctionId];
        ProtocolTypes.Intent memory intent = intentRegistry.getIntent(auction.intentHash);

        // Sort / evaluate candidate bids in order of baseline ranking
        uint256 bidsLen = bids.length;
        if (bidsLen == 0) {
            auction.state = ProtocolTypes.AuctionState.CANCELLED;
            emit AuctionCancelled(auctionId, auction.intentHash, "NO_REVEALED_BIDS");
            return address(0);
        }

        // Sort bids array using baseline ranking
        ProtocolTypes.Bid[] memory sortedBids = new ProtocolTypes.Bid[](bidsLen);
        for (uint256 i = 0; i < bidsLen; i++) {
            sortedBids[i] = bids[i];
        }

        for (uint256 i = 0; i < bidsLen; i++) {
            for (uint256 j = i + 1; j < bidsLen; j++) {
                if (_isBetterBid(sortedBids[j], sortedBids[i])) {
                    ProtocolTypes.Bid memory temp = sortedBids[i];
                    sortedBids[i] = sortedBids[j];
                    sortedBids[j] = temp;
                }
            }
        }

        // Evaluate candidates in rank order with full atomic revalidation
        for (uint256 i = 0; i < bidsLen; i++) {
            ProtocolTypes.Bid memory candidate = sortedBids[i];
            if (!candidate.valid) continue;

            address solver = candidate.solver;

            // Recheck solver registration & active status
            if (!solverRegistry.isSolverRegistered(solver) || !solverRegistry.isSolverActive(solver)) {
                continue;
            }

            // Recheck chain & token capabilities
            if (
                !solverRegistry.isChainSupported(solver, intent.sourceChainId)
                    || !solverRegistry.isChainSupported(solver, intent.destinationChainId)
                    || !solverRegistry.isTokenSupported(solver, intent.sourceChainId, intent.sourceToken)
                    || !solverRegistry.isTokenSupported(solver, intent.destinationChainId, intent.destinationToken)
            ) {
                continue;
            }

            // Recheck current available capacity at finalization
            uint256 availableCapacity =
                capacityRegistry.getAvailableCapacity(solver, intent.destinationChainId, intent.destinationToken);
            if (availableCapacity < candidate.capacityRequired) {
                continue;
            }

            // Recheck current available bond balance at finalization
            uint256 availableBond = bondManager.getAvailableBond(solver);
            if (availableBond < candidate.capacityRequired) {
                continue;
            }

            // Attempt capacity reservation
            try capacityRegistry.reserveCapacity(
                auction.intentHash,
                solver,
                intent.destinationChainId,
                intent.destinationToken,
                candidate.capacityRequired,
                intent.deadline
            ) returns (
                bytes32
            ) {
                auction.state = ProtocolTypes.AuctionState.FINALIZED;
                auction.winner = solver;
                auction.winningOutputAmount = candidate.expectedOutputAmount;
                auction.winningBidHash = computeBidCommitmentHash(
                    auctionId,
                    auction.intentHash,
                    solver,
                    candidate.expectedOutputAmount,
                    candidate.estimatedExecutionTime,
                    candidate.capacityRequired,
                    candidate.salt
                );

                emit AuctionFinalized(
                    auctionId, auction.intentHash, solver, candidate.expectedOutputAmount, auction.winningBidHash
                );
                return solver;
            } catch {
                // If capacity reservation failed, continue to next best candidate
                continue;
            }
        }

        // If no candidate succeeded -> cancel auction safely
        auction.state = ProtocolTypes.AuctionState.CANCELLED;
        emit AuctionCancelled(auctionId, auction.intentHash, "NO_VALID_BIDS");
        return address(0);
    }

    /**
     * @dev Extension point for baseline deterministic ranking.
     * Evaluates candidate A against candidate B.
     * Primary: Higher expectedOutputAmount
     * Secondary: Lower estimatedExecutionTime
     * Tie-breaker: Ascending solver address (uint160(solver))
     */
    function _isBetterBid(ProtocolTypes.Bid memory candidate, ProtocolTypes.Bid memory currentBest)
        internal
        pure
        returns (bool)
    {
        if (!candidate.valid) return false;
        if (!currentBest.valid) return true;

        if (candidate.expectedOutputAmount > currentBest.expectedOutputAmount) {
            return true;
        } else if (candidate.expectedOutputAmount < currentBest.expectedOutputAmount) {
            return false;
        }

        // Same output amount -> compare execution time
        if (candidate.estimatedExecutionTime < currentBest.estimatedExecutionTime) {
            return true;
        } else if (candidate.estimatedExecutionTime > currentBest.estimatedExecutionTime) {
            return false;
        }

        // Same execution time -> tie-breaker by solver address
        return uint160(candidate.solver) < uint160(currentBest.solver);
    }

    // ==========================================
    // DISCOVERY READ METHODS
    // ==========================================

    function getAuction(bytes32 auctionId) external view override returns (ProtocolTypes.Auction memory) {
        return _auctions[auctionId];
    }

    function getBidCommitment(bytes32 auctionId, address solver) external view override returns (bytes32) {
        return _commitments[auctionId][solver];
    }

    function getRevealedBids(bytes32 auctionId) external view override returns (ProtocolTypes.Bid[] memory) {
        return _revealedBids[auctionId];
    }

    function getWinningBid(bytes32 auctionId) external view override returns (ProtocolTypes.Bid memory) {
        ProtocolTypes.Auction memory auction = _auctions[auctionId];
        if (auction.state != ProtocolTypes.AuctionState.FINALIZED || auction.winner == address(0)) {
            revert Errors.AuctionNotClosed();
        }

        ProtocolTypes.Bid[] memory bids = _revealedBids[auctionId];
        for (uint256 i = 0; i < bids.length; i++) {
            if (bids[i].solver == auction.winner) {
                return bids[i];
            }
        }

        revert Errors.NoValidBids();
    }
}
