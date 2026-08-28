// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./types/ProtocolTypes.sol";
import "./libraries/Errors.sol";
import "./libraries/Events.sol";
import "./interfaces/ISolverRegistry.sol";

/**
 * @title SolverRegistry
 * @notice Maintains registered solver profiles and active status.
 */
contract SolverRegistry is ISolverRegistry, Ownable, Events {
    mapping(address => ProtocolTypes.SolverProfile) private _solvers;

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Registers a new solver.
     */
    function registerSolver(string calldata metadataURI) external override {
        if (_solvers[msg.sender].solver != address(0)) {
            revert Errors.SolverAlreadyRegistered();
        }

        _solvers[msg.sender] = ProtocolTypes.SolverProfile({
            solver: msg.sender, isActive: true, registeredAt: uint64(block.timestamp), metadataURI: metadataURI
        });

        emit SolverRegistered(msg.sender, metadataURI);
        emit SolverStatusChanged(msg.sender, true);
    }

    /**
     * @notice Updates active status for a solver.
     */
    function setSolverStatus(address solver, bool isActive) external override {
        if (msg.sender != owner() && msg.sender != solver) {
            revert Errors.Unauthorized();
        }
        if (_solvers[solver].solver == address(0)) {
            revert Errors.SolverNotRegistered();
        }

        _solvers[solver].isActive = isActive;
        emit SolverStatusChanged(solver, isActive);
    }

    function getSolverProfile(address solver) external view override returns (ProtocolTypes.SolverProfile memory) {
        if (_solvers[solver].solver == address(0)) revert Errors.SolverNotRegistered();
        return _solvers[solver];
    }

    function isSolverActive(address solver) external view override returns (bool) {
        return _solvers[solver].solver != address(0) && _solvers[solver].isActive;
    }
}
