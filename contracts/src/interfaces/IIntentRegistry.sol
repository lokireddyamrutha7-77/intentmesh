// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../types/ProtocolTypes.sol";

interface IIntentRegistry {
    function registerIntent(
        address inputToken,
        uint256 inputAmount,
        uint64 destinationChainId,
        address destinationToken,
        address recipient,
        uint256 minOutputAmount,
        uint64 deadline
    ) external returns (bytes32 intentHash);

    function updateIntentState(bytes32 intentHash, ProtocolTypes.IntentState newState) external;

    function getIntent(bytes32 intentHash) external view returns (ProtocolTypes.Intent memory);

    function getIntentState(bytes32 intentHash) external view returns (ProtocolTypes.IntentState);

    function getUserNonce(address user) external view returns (uint256);
}
