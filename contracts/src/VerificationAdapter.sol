// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./types/ProtocolTypes.sol";
import "./libraries/Errors.sol";
import "./libraries/Events.sol";
import "./interfaces/IVerificationAdapter.sol";
import "./interfaces/IIntentRegistry.sol";

/**
 * @title VerificationAdapter
 * @notice Deterministically verifies cross-chain fulfilment proof payloads against target intent specs.
 * @dev Enforces proof uniqueness (INVARIANT-007) and exact param checks (INVARIANT-008, 009, 010, 011).
 */
contract VerificationAdapter is IVerificationAdapter, Ownable, Events {
    using ProtocolTypes for ProtocolTypes.VerificationProof;

    mapping(bytes32 => bool) private _consumedProofs;
    mapping(bytes32 => ProtocolTypes.VerificationStatus) private _statuses;

    IIntentRegistry public intentRegistry;

    constructor(address _intentRegistry) Ownable(msg.sender) {
        if (_intentRegistry == address(0)) revert Errors.ZeroAddress();
        intentRegistry = IIntentRegistry(_intentRegistry);
    }

    /**
     * @notice Evaluates and verifies a proof payload deterministically against registered Intent parameters.
     */
    function verifyProof(bytes32 intentHash, ProtocolTypes.VerificationProof calldata proof)
        external
        override
        returns (bool)
    {
        if (_consumedProofs[proof.proofHash]) {
            revert Errors.ProofAlreadyConsumed();
        }

        ProtocolTypes.Intent memory intent = intentRegistry.getIntent(intentHash);

        if (proof.destinationChainId != intent.destinationChainId) {
            _statuses[intentHash] = ProtocolTypes.VerificationStatus.INVALID;
            revert Errors.ChainMismatch();
        }
        if (proof.destinationToken != intent.destinationToken) {
            _statuses[intentHash] = ProtocolTypes.VerificationStatus.INVALID;
            revert Errors.TokenMismatch();
        }
        if (proof.recipient != intent.recipient) {
            _statuses[intentHash] = ProtocolTypes.VerificationStatus.INVALID;
            revert Errors.RecipientMismatch();
        }
        if (proof.deliveredAmount < intent.minOutputAmount) {
            _statuses[intentHash] = ProtocolTypes.VerificationStatus.INVALID;
            revert Errors.OutputAmountTooLow();
        }
        if (proof.blockTimestamp > intent.deadline) {
            _statuses[intentHash] = ProtocolTypes.VerificationStatus.INVALID;
            revert Errors.IntentExpired();
        }

        _consumedProofs[proof.proofHash] = true;
        _statuses[intentHash] = ProtocolTypes.VerificationStatus.VALID;

        emit VerificationSubmitted(intentHash, proof.proofHash);
        emit VerificationResultRecorded(intentHash, ProtocolTypes.VerificationStatus.VALID);

        return true;
    }

    function getVerificationStatus(bytes32 intentHash)
        external
        view
        override
        returns (ProtocolTypes.VerificationStatus)
    {
        return _statuses[intentHash];
    }

    function isProofConsumed(bytes32 proofHash) external view override returns (bool) {
        return _consumedProofs[proofHash];
    }
}
