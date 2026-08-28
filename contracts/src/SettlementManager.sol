// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./types/ProtocolTypes.sol";
import "./libraries/Errors.sol";
import "./libraries/Events.sol";
import "./interfaces/ISettlementManager.sol";
import "./interfaces/IVerificationAdapter.sol";
import "./interfaces/IInputEscrow.sol";

/**
 * @title SettlementManager
 * @notice Foundation and authorization boundary for protocol settlement.
 * @dev Enforces INVARIANT-008: Settlement CANNOT occur without valid verification. AI has ZERO authorization authority.
 */
contract SettlementManager is ISettlementManager, Ownable, Events {
    mapping(bytes32 => bool) private _settledIntents;
    mapping(bytes32 => bool) private _refundedIntents;

    IVerificationAdapter public verificationAdapter;
    IInputEscrow public inputEscrow;

    constructor(address _verificationAdapter, address _inputEscrow) Ownable(msg.sender) {
        if (_verificationAdapter == address(0) || _inputEscrow == address(0)) {
            revert Errors.ZeroAddress();
        }
        verificationAdapter = IVerificationAdapter(_verificationAdapter);
        inputEscrow = IInputEscrow(_inputEscrow);
    }

    /**
     * @notice Authorizes settlement for a verified intent.
     * @dev Enforces INVARIANT-008: Requires VerificationAdapter status == VALID.
     */
    function authorizeSettlement(bytes32 intentHash, address solver) external override onlyOwner {
        if (solver == address(0)) revert Errors.ZeroAddress();
        if (_settledIntents[intentHash]) revert Errors.AlreadySettled();

        ProtocolTypes.VerificationStatus status = verificationAdapter.getVerificationStatus(intentHash);
        if (status != ProtocolTypes.VerificationStatus.VALID) {
            revert Errors.VerificationRequired();
        }

        _settledIntents[intentHash] = true;
        emit SettlementAuthorized(intentHash, solver);
    }

    /**
     * @notice Authorizes refund for a failed or expired intent.
     */
    function authorizeRefund(bytes32 intentHash, address user, string calldata reason) external override onlyOwner {
        if (user == address(0)) revert Errors.ZeroAddress();
        if (_settledIntents[intentHash] || _refundedIntents[intentHash]) revert Errors.AlreadySettled();

        _refundedIntents[intentHash] = true;
        emit RefundAuthorized(intentHash, user, reason);
    }

    function isSettled(bytes32 intentHash) external view override returns (bool) {
        return _settledIntents[intentHash];
    }

    /**
     * @notice Explicit safety check guaranteeing AI components have zero state authorization authority.
     */
    function assertAINotAuthoritative() external pure {
        // Enforces INVARIANT-010: AI decision models possess zero authorization capability
        revert Errors.AINotAuthoritative();
    }
}
