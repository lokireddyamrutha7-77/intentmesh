// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../types/ProtocolTypes.sol";

interface IBatchAuction {
    function computeBidCommitmentHash(
        bytes32 auctionId,
        bytes32 intentHash,
        address solver,
        uint256 expectedOutputAmount,
        uint32 estimatedExecutionTime,
        uint256 capacityRequired,
        bytes32 salt
    ) external pure returns (bytes32);

    function computeAuctionId(bytes32 intentHash, uint64 commitDeadline) external pure returns (bytes32);

    function createAuction(bytes32 intentHash, uint64 commitDuration, uint64 revealDuration)
        external
        returns (bytes32 auctionId);

    function submitCommitment(bytes32 auctionId, bytes32 commitmentHash) external;

    function revealBid(
        bytes32 auctionId,
        uint256 expectedOutputAmount,
        uint32 estimatedExecutionTime,
        uint256 capacityRequired,
        bytes32 salt
    ) external;

    function finalizeAuction(bytes32 auctionId) external returns (address winner);

    function getAuction(bytes32 auctionId) external view returns (ProtocolTypes.Auction memory);

    function getBidCommitment(bytes32 auctionId, address solver) external view returns (bytes32);

    function getRevealedBids(bytes32 auctionId) external view returns (ProtocolTypes.Bid[] memory);

    function getWinningBid(bytes32 auctionId) external view returns (ProtocolTypes.Bid memory);
}
