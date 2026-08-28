// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../types/ProtocolTypes.sol";

interface ICapacityRegistry {
    function declareCapacity(uint64 chainId, address token, uint256 capacity) external;

    function reserveCapacity(
        bytes32 intentHash,
        address solver,
        uint64 chainId,
        address token,
        uint256 amount,
        uint64 expiry
    ) external returns (bytes32 reservationId);

    function releaseCapacity(bytes32 reservationId) external;

    function getReservation(bytes32 reservationId) external view returns (ProtocolTypes.CapacityReservation memory);

    function getDeclaredCapacity(address solver, uint64 chainId, address token) external view returns (uint256);

    function getReservedCapacity(address solver, uint64 chainId, address token) external view returns (uint256);

    function getAvailableCapacity(address solver, uint64 chainId, address token) external view returns (uint256);
}
