// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../types/ProtocolTypes.sol";

interface ISolverRegistry {
    function registerSolver(string calldata metadataURI) external;

    function setSolverStatus(address solver, bool isActive) external;

    function getSolverProfile(address solver) external view returns (ProtocolTypes.SolverProfile memory);

    function isSolverActive(address solver) external view returns (bool);
}
