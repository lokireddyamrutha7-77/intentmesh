// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../types/ProtocolTypes.sol";

interface IBatchAuction {
    function createAuction(bytes32 intentHash, uint64 commitDeadline, uint64 revealDeadline) external;

    function commitBid(bytes32 intentHash, bytes32 commitmentHash) external;

    function revealBid(
        bytes32 intentHash,
        uint256 proposedOutputAmount,
        uint64 executionDeadline,
        uint256 feeAmount,
        bytes32 nonce
    ) external;

    function finalizeAuction(bytes32 intentHash, address winningSolver) external;

    function getWinningSolver(bytes32 intentHash) external view returns (address);

    function getBidCommitment(bytes32 intentHash, address solver) external view returns (bytes32);
}
