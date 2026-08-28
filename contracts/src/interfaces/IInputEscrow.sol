// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IInputEscrow {
    function lockFunds(bytes32 intentHash, address token, uint256 amount, address depositor) external;

    function releaseFunds(bytes32 intentHash, address recipient) external;

    function refundFunds(bytes32 intentHash, address user) external;

    function getEscrowAmount(bytes32 intentHash) external view returns (uint256);

    function getEscrowToken(bytes32 intentHash) external view returns (address);
}
