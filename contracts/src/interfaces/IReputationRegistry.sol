// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../types/ProtocolTypes.sol";

interface IReputationRegistry {
    function recordExecution(address solver, bool success, uint64 latency, ProtocolTypes.FailureType failureType)
        external;

    function getSolverMetrics(address solver) external view returns (ProtocolTypes.SolverMetrics memory);
}
