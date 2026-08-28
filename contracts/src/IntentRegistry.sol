// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./types/ProtocolTypes.sol";
import "./libraries/Errors.sol";
import "./libraries/Events.sol";
import "./interfaces/IIntentRegistry.sol";

/**
 * @title IntentRegistry
 * @notice Canonical registry for intent registration, hash integrity, nonces, and state transitions.
 * @dev Does NOT hold user funds or execute settlement.
 */
contract IntentRegistry is IIntentRegistry, Ownable, Events {
    using ProtocolTypes for ProtocolTypes.Intent;

    mapping(bytes32 => ProtocolTypes.Intent) private _intents;
    mapping(bytes32 => ProtocolTypes.IntentState) private _intentStates;
    mapping(address => uint256) private _userNonces;
    mapping(address => bool) public authorizedCallers;

    modifier onlyAuthorized() {
        if (msg.sender != owner() && !authorizedCallers[msg.sender]) {
            revert Errors.Unauthorized();
        }
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        if (caller == address(0)) revert Errors.ZeroAddress();
        authorizedCallers[caller] = authorized;
    }

    /**
     * @notice Registers a new user intent.
     * @dev Generates deterministic intent hash, consumes user nonce, and enforces deadline validity.
     */
    function registerIntent(
        address inputToken,
        uint256 inputAmount,
        uint64 destinationChainId,
        address destinationToken,
        address recipient,
        uint256 minOutputAmount,
        uint64 deadline
    ) external override returns (bytes32 intentHash) {
        if (inputToken == address(0) || destinationToken == address(0) || recipient == address(0)) {
            revert Errors.ZeroAddress();
        }
        if (inputAmount == 0 || minOutputAmount == 0) {
            revert Errors.ZeroAmount();
        }
        if (deadline <= block.timestamp) {
            revert Errors.InvalidDeadline();
        }

        uint256 nonce = _userNonces[msg.sender];
        _userNonces[msg.sender] = nonce + 1;
        emit NonceConsumed(msg.sender, nonce);

        intentHash = keccak256(
            abi.encode(
                msg.sender,
                inputToken,
                inputAmount,
                destinationChainId,
                destinationToken,
                recipient,
                minOutputAmount,
                deadline,
                nonce,
                block.chainid
            )
        );

        if (_intents[intentHash].user != address(0)) {
            revert Errors.IntentAlreadyExists();
        }

        _intents[intentHash] = ProtocolTypes.Intent({
            intentHash: intentHash,
            user: msg.sender,
            inputToken: inputToken,
            inputAmount: inputAmount,
            destinationChainId: destinationChainId,
            destinationToken: destinationToken,
            recipient: recipient,
            minOutputAmount: minOutputAmount,
            deadline: deadline,
            nonce: nonce
        });

        _intentStates[intentHash] = ProtocolTypes.IntentState.CREATED;

        emit IntentRegistered(intentHash, msg.sender, nonce);
        emit IntentStateChanged(intentHash, ProtocolTypes.IntentState.CREATED);
    }

    /**
     * @notice Updates the state of an existing intent.
     */
    function updateIntentState(bytes32 intentHash, ProtocolTypes.IntentState newState)
        external
        override
        onlyAuthorized
    {
        if (_intents[intentHash].user == address(0)) {
            revert Errors.InvalidIntent();
        }
        _intentStates[intentHash] = newState;
        emit IntentStateChanged(intentHash, newState);
    }

    function getIntent(bytes32 intentHash) external view override returns (ProtocolTypes.Intent memory) {
        if (_intents[intentHash].user == address(0)) revert Errors.InvalidIntent();
        return _intents[intentHash];
    }

    function getIntentState(bytes32 intentHash) external view override returns (ProtocolTypes.IntentState) {
        return _intentStates[intentHash];
    }

    function getUserNonce(address user) external view override returns (uint256) {
        return _userNonces[user];
    }
}
