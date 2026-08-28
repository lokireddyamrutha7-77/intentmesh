// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDestinationVault {
    function depositFulfilment(bytes32 intentHash, address token, uint256 amount, address recipient) external;

    function releaseFulfilment(bytes32 intentHash) external;

    function getFulfilmentAmount(bytes32 intentHash) external view returns (uint256);

    function getFulfilmentRecipient(bytes32 intentHash) external view returns (address);
}
