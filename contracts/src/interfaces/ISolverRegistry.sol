// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../types/ProtocolTypes.sol";

interface ISolverRegistry {
    function registerSolver(string calldata metadataURI) external;

    function setSolverStatus(bool isActive) external;

    function setSolverStatusByAdmin(address solver, bool isActive) external;

    function addChainCapability(uint64 chainId) external;

    function removeChainCapability(uint64 chainId) external;

    function addTokenCapability(uint64 chainId, address token) external;

    function removeTokenCapability(uint64 chainId, address token) external;

    function isSolverRegistered(address solver) external view returns (bool);

    function isSolverActive(address solver) external view returns (bool);

    function getSolverProfile(address solver) external view returns (ProtocolTypes.SolverProfile memory);

    function isChainSupported(address solver, uint64 chainId) external view returns (bool);

    function isTokenSupported(address solver, uint64 chainId, address token) external view returns (bool);

    function getSupportedChains(address solver) external view returns (uint64[] memory);

    function getSupportedTokens(address solver, uint64 chainId) external view returns (address[] memory);
}
