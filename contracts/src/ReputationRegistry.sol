// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./types/ProtocolTypes.sol";
import "./libraries/Errors.sol";
import "./libraries/Events.sol";
import "./interfaces/IReputationRegistry.sol";

/**
 * @title ReputationRegistry
 * @notice Stores objective execution performance metrics for solvers.
 * @dev Metrics are consumed deterministically by the off-chain risk engine.
 */
contract ReputationRegistry is IReputationRegistry, Ownable, Events {
    mapping(address => ProtocolTypes.SolverMetrics) private _metrics;
    mapping(address => bool) public authorizedReporters;

    modifier onlyReporter() {
        if (!authorizedReporters[msg.sender] && msg.sender != owner()) {
            revert Errors.Unauthorized();
        }
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setReporter(address reporter, bool authorized) external onlyOwner {
        if (reporter == address(0)) revert Errors.ZeroAddress();
        authorizedReporters[reporter] = authorized;
    }

    /**
     * @notice Records solver execution metrics after completion or failure.
     */
    function recordExecution(address solver, bool success, uint64 latency, ProtocolTypes.FailureType failureType)
        external
        override
        onlyReporter
    {
        if (solver == address(0)) revert Errors.ZeroAddress();

        ProtocolTypes.SolverMetrics storage m = _metrics[solver];

        if (success) {
            m.successfulFills += 1;
            m.totalLatencySeconds += latency;
        } else {
            if (failureType == ProtocolTypes.FailureType.SOLVER_TIMEOUT) {
                m.timeouts += 1;
            } else if (failureType == ProtocolTypes.FailureType.FALSE_PROOF) {
                m.proofFailures += 1;
            } else {
                m.failedFills += 1;
            }
        }

        emit ReputationUpdated(solver, m.successfulFills, m.failedFills, m.timeouts);
    }

    function getSolverMetrics(address solver) external view override returns (ProtocolTypes.SolverMetrics memory) {
        return _metrics[solver];
    }
}
