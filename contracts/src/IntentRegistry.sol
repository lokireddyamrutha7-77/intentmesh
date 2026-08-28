// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IInputEscrow.sol";
import "./interfaces/IIntentRegistry.sol";
import "./libraries/Errors.sol";
import "./libraries/Events.sol";
import "./types/ProtocolTypes.sol";

/**
 * @title IntentRegistry
 * @notice Canonical registry for intent creation, validation, hash integrity, nonces, and lifecycle state tracking.
 * @dev Does NOT hold user funds directly. Interacts with InputEscrow for source-side asset custody.
 */
contract IntentRegistry is IIntentRegistry, Ownable, Events {
    using ProtocolTypes for ProtocolTypes.Intent;

    mapping(bytes32 => ProtocolTypes.Intent) private _intents;
    mapping(bytes32 => ProtocolTypes.IntentState) private _intentStates;
    mapping(address => uint256) private _userNonces;
    mapping(address => bool) public authorizedCallers;

    address public inputEscrow;

    modifier onlyAuthorized() {
        if (msg.sender != owner() && !authorizedCallers[msg.sender]) {
            revert Errors.Unauthorized();
        }
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setInputEscrow(address _inputEscrow) external onlyOwner {
        if (_inputEscrow == address(0)) revert Errors.ZeroAddress();
        inputEscrow = _inputEscrow;
    }

    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        if (caller == address(0)) revert Errors.ZeroAddress();
        authorizedCallers[caller] = authorized;
    }

    /**
     * @notice Computes deterministic canonical hash binding all 11 economically/security-relevant fields.
     */
    function computeIntentHash(
        address user,
        uint64 sourceChainId,
        address sourceToken,
        uint256 sourceAmount,
        uint64 destinationChainId,
        address destinationToken,
        address recipient,
        uint256 minOutputAmount,
        uint64 deadline,
        uint256 nonce,
        bytes32 verificationPolicy
    ) public pure override returns (bytes32) {
        return keccak256(
            abi.encode(
                user,
                sourceChainId,
                sourceToken,
                sourceAmount,
                destinationChainId,
                destinationToken,
                recipient,
                minOutputAmount,
                deadline,
                nonce,
                verificationPolicy
            )
        );
    }

    /**
     * @notice Creates, validates, hashes, consumes nonce, and funds an intent into InputEscrow.
     * @dev Advances state: CREATED -> VALIDATED -> AUCTION_READY.
     */
    function createAndFundIntent(
        uint64 sourceChainId,
        address sourceToken,
        uint256 sourceAmount,
        uint64 destinationChainId,
        address destinationToken,
        address recipient,
        uint256 minOutputAmount,
        uint64 deadline,
        bytes32 verificationPolicy
    ) external override returns (bytes32 intentHash) {
        if (inputEscrow == address(0)) revert Errors.ZeroAddress();

        // 1. Validation Checks
        if (sourceToken == address(0)) revert Errors.InvalidSourceToken();
        if (destinationToken == address(0)) revert Errors.InvalidDestinationToken();
        if (recipient == address(0)) revert Errors.InvalidRecipient();
        if (sourceAmount == 0) revert Errors.InvalidAmount();
        if (minOutputAmount == 0) revert Errors.InvalidMinimumOutput();
        if (deadline <= block.timestamp) revert Errors.InvalidDeadline();
        if (sourceChainId != uint64(block.chainid) || sourceChainId == 0 || destinationChainId == 0) {
            revert Errors.InvalidChain();
        }
        if (verificationPolicy == bytes32(0)) revert Errors.InvalidVerificationPolicy();

        // 2. Nonce Handling
        uint256 nonce = _userNonces[msg.sender];
        _userNonces[msg.sender] = nonce + 1;
        emit NonceConsumed(msg.sender, nonce);

        // 3. Compute Canonical Intent Identity
        intentHash = computeIntentHash(
            msg.sender,
            sourceChainId,
            sourceToken,
            sourceAmount,
            destinationChainId,
            destinationToken,
            recipient,
            minOutputAmount,
            deadline,
            nonce,
            verificationPolicy
        );

        if (_intents[intentHash].user != address(0)) revert Errors.IntentAlreadyExists();

        // 4. Store Intent Record & Initial State
        _intents[intentHash] = ProtocolTypes.Intent({
            intentHash: intentHash,
            user: msg.sender,
            sourceChainId: sourceChainId,
            sourceToken: sourceToken,
            sourceAmount: sourceAmount,
            destinationChainId: destinationChainId,
            destinationToken: destinationToken,
            recipient: recipient,
            minOutputAmount: minOutputAmount,
            deadline: deadline,
            nonce: nonce,
            verificationPolicy: verificationPolicy,
            createdAt: uint64(block.timestamp)
        });

        _intentStates[intentHash] = ProtocolTypes.IntentState.CREATED;
        emit IntentCreated(intentHash, msg.sender, nonce);

        _intentStates[intentHash] = ProtocolTypes.IntentState.VALIDATED;
        emit IntentValidated(intentHash);

        // 5. Fund Escrow (InputEscrow pulls funds from msg.sender via SafeERC20)
        IInputEscrow(inputEscrow).lockFunds(intentHash, sourceToken, sourceAmount, msg.sender);

        // 6. Transition to AUCTION_READY
        _intentStates[intentHash] = ProtocolTypes.IntentState.AUCTION_READY;
        emit IntentEscrowLocked(intentHash, sourceToken, sourceAmount);
        emit IntentStateChanged(intentHash, ProtocolTypes.IntentState.AUCTION_READY);
    }

    /**
     * @notice Updates state of an intent (authorized callers only).
     */
    function updateIntentState(bytes32 intentHash, ProtocolTypes.IntentState newState)
        external
        override
        onlyAuthorized
    {
        if (_intents[intentHash].user == address(0)) revert Errors.IntentNotFound();
        _intentStates[intentHash] = newState;
        emit IntentStateChanged(intentHash, newState);
    }

    function getIntent(bytes32 intentHash) external view override returns (ProtocolTypes.Intent memory) {
        if (_intents[intentHash].user == address(0)) revert Errors.IntentNotFound();
        return _intents[intentHash];
    }

    function getIntentState(bytes32 intentHash) external view override returns (ProtocolTypes.IntentState) {
        return _intentStates[intentHash];
    }

    function getUserNonce(address user) external view override returns (uint256) {
        return _userNonces[user];
    }
}
