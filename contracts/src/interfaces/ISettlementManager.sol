// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISettlementManager {
    function authorizeSettlement(bytes32 intentHash, address solver) external;

    function authorizeRefund(bytes32 intentHash, address user, string calldata reason) external;

    function isSettled(bytes32 intentHash) external view returns (bool);
}
