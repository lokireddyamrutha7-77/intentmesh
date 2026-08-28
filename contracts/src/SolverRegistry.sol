// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISolverRegistry.sol";
import "./libraries/Errors.sol";
import "./libraries/Events.sol";
import "./types/ProtocolTypes.sol";

/**
 * @title SolverRegistry
 * @notice Canonical registry for solver identities, activation status, and chain-aware capabilities.
 * @dev Enforces solver self-management of operational status and capabilities with strict access boundaries.
 */
contract SolverRegistry is ISolverRegistry, Ownable, Events {
    using ProtocolTypes for ProtocolTypes.SolverProfile;

    mapping(address => ProtocolTypes.SolverProfile) private _solvers;

    // Chain capabilities: solver => chainId => supported
    mapping(address => mapping(uint64 => bool)) private _supportedChains;
    mapping(address => uint64[]) private _solverChains;

    // Token capabilities (chain-aware): solver => chainId => token => supported
    mapping(address => mapping(uint64 => mapping(address => bool))) private _supportedTokens;
    mapping(address => mapping(uint64 => address[])) private _solverTokens;

    modifier onlyRegisteredSolver() {
        if (_solvers[msg.sender].solver == address(0)) {
            revert Errors.SolverNotRegistered();
        }
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Registers a new solver identity.
     */
    function registerSolver(string calldata metadataURI) external override {
        if (msg.sender == address(0)) revert Errors.ZeroAddress();
        if (_solvers[msg.sender].solver != address(0)) revert Errors.SolverAlreadyRegistered();

        _solvers[msg.sender] = ProtocolTypes.SolverProfile({
            solver: msg.sender, isActive: true, registeredAt: uint64(block.timestamp), metadataURI: metadataURI
        });

        emit SolverRegistered(msg.sender, metadataURI);
        emit SolverStatusChanged(msg.sender, true);
    }

    /**
     * @notice Solvers self-manage operational activation status (active/inactive).
     */
    function setSolverStatus(bool isActive) external override onlyRegisteredSolver {
        _solvers[msg.sender].isActive = isActive;
        emit SolverStatusChanged(msg.sender, isActive);
    }

    /**
     * @notice Emergency administrative control for toggling solver activation.
     */
    function setSolverStatusByAdmin(address solver, bool isActive) external override onlyOwner {
        if (_solvers[solver].solver == address(0)) revert Errors.SolverNotRegistered();
        _solvers[solver].isActive = isActive;
        emit SolverStatusChanged(solver, isActive);
    }

    /**
     * @notice Adds a supported chain capability for the caller solver.
     */
    function addChainCapability(uint64 chainId) external override onlyRegisteredSolver {
        if (chainId == 0) revert Errors.InvalidChain();
        if (_supportedChains[msg.sender][chainId]) revert Errors.ChainAlreadySupported();

        _supportedChains[msg.sender][chainId] = true;
        _solverChains[msg.sender].push(chainId);

        emit SolverChainCapabilityAdded(msg.sender, chainId);
    }

    /**
     * @notice Removes a supported chain capability for the caller solver.
     */
    function removeChainCapability(uint64 chainId) external override onlyRegisteredSolver {
        if (!_supportedChains[msg.sender][chainId]) revert Errors.ChainNotSupported();

        _supportedChains[msg.sender][chainId] = false;

        // Remove from enumeration array
        uint64[] storage chains = _solverChains[msg.sender];
        uint256 len = chains.length;
        for (uint256 i = 0; i < len; i++) {
            if (chains[i] == chainId) {
                chains[i] = chains[len - 1];
                chains.pop();
                break;
            }
        }

        emit SolverChainCapabilityRemoved(msg.sender, chainId);
    }

    /**
     * @notice Adds a chain-aware token capability for the caller solver.
     */
    function addTokenCapability(uint64 chainId, address token) external override onlyRegisteredSolver {
        if (chainId == 0) revert Errors.InvalidChain();
        if (token == address(0)) revert Errors.ZeroAddress();
        if (!_supportedChains[msg.sender][chainId]) revert Errors.ChainNotSupported();
        if (_supportedTokens[msg.sender][chainId][token]) revert Errors.TokenAlreadySupported();

        _supportedTokens[msg.sender][chainId][token] = true;
        _solverTokens[msg.sender][chainId].push(token);

        emit SolverTokenCapabilityAdded(msg.sender, chainId, token);
    }

    /**
     * @notice Removes a chain-aware token capability for the caller solver.
     */
    function removeTokenCapability(uint64 chainId, address token) external override onlyRegisteredSolver {
        if (!_supportedTokens[msg.sender][chainId][token]) revert Errors.TokenNotSupported();

        _supportedTokens[msg.sender][chainId][token] = false;

        // Remove from enumeration array
        address[] storage tokens = _solverTokens[msg.sender][chainId];
        uint256 len = tokens.length;
        for (uint256 i = 0; i < len; i++) {
            if (tokens[i] == token) {
                tokens[i] = tokens[len - 1];
                tokens.pop();
                break;
            }
        }

        emit SolverTokenCapabilityRemoved(msg.sender, chainId, token);
    }

    // ==========================================
    // DISCOVERY READ METHODS
    // ==========================================

    function isSolverRegistered(address solver) external view override returns (bool) {
        return _solvers[solver].solver != address(0);
    }

    function isSolverActive(address solver) external view override returns (bool) {
        return _solvers[solver].solver != address(0) && _solvers[solver].isActive;
    }

    function getSolverProfile(address solver) external view override returns (ProtocolTypes.SolverProfile memory) {
        if (_solvers[solver].solver == address(0)) revert Errors.SolverNotRegistered();
        return _solvers[solver];
    }

    function isChainSupported(address solver, uint64 chainId) external view override returns (bool) {
        return _supportedChains[solver][chainId];
    }

    function isTokenSupported(address solver, uint64 chainId, address token) external view override returns (bool) {
        return _supportedTokens[solver][chainId][token];
    }

    function getSupportedChains(address solver) external view override returns (uint64[] memory) {
        return _solverChains[solver];
    }

    function getSupportedTokens(address solver, uint64 chainId) external view override returns (address[] memory) {
        return _solverTokens[solver][chainId];
    }
}
