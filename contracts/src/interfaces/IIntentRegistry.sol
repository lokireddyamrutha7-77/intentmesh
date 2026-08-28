// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../types/ProtocolTypes.sol";

interface IIntentRegistry {
    function createAndFundIntent(
        uint64 sourceChainId,
        address sourceToken,
        uint256 sourceAmount,
        uint64 destinationChainId,
        address destinationToken,
        address recipient,
        uint256 minOutputAmount,
        uint64 deadline,
        bytes32 verificationPolicy
    ) external returns (bytes32 intentHash);

    function computeIntentHash(
        address user,
        uint64 sourceChainId,
        address sourceToken,
        uint256 sourceAmount,
        uint64 destinationChainId,
        address destinationToken,
        address recipient,
        uint256 minOutputAmount,
        uint64 deadline,
        uint256 nonce,
        bytes32 verificationPolicy
    ) external pure returns (bytes32);

    function updateIntentState(bytes32 intentHash, ProtocolTypes.IntentState newState) external;

    function getIntent(bytes32 intentHash) external view returns (ProtocolTypes.Intent memory);

    function getIntentState(bytes32 intentHash) external view returns (ProtocolTypes.IntentState);

    function getUserNonce(address user) external view returns (uint256);
}
