// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./libraries/Errors.sol";
import "./libraries/Events.sol";
import "./interfaces/IInputEscrow.sol";

/**
 * @title InputEscrow
 * @notice Source-side escrow for user input tokens.
 * @dev Transfers occur strictly via SafeERC20 with caller authorization restrictions.
 */
contract InputEscrow is IInputEscrow, Ownable, ReentrancyGuard, Events {
    using SafeERC20 for IERC20;

    struct EscrowRecord {
        address token;
        uint256 amount;
        address depositor;
        bool isReleased;
    }

    mapping(bytes32 => EscrowRecord) private _escrows;
    address public settlementManager;

    modifier onlySettlementManager() {
        if (msg.sender != settlementManager) {
            revert Errors.Unauthorized();
        }
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setSettlementManager(address _settlementManager) external onlyOwner {
        if (_settlementManager == address(0)) revert Errors.ZeroAddress();
        settlementManager = _settlementManager;
    }

    /**
     * @notice Locks user input tokens into escrow for a specific intent.
     */
    function lockFunds(bytes32 intentHash, address token, uint256 amount, address depositor)
        external
        override
        nonReentrant
    {
        if (token == address(0) || depositor == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.ZeroAmount();
        if (_escrows[intentHash].amount > 0) revert Errors.EscrowAlreadyDeposited();

        _escrows[intentHash] = EscrowRecord({token: token, amount: amount, depositor: depositor, isReleased: false});

        IERC20(token).safeTransferFrom(depositor, address(this), amount);
        emit FundsLocked(intentHash, token, amount);
    }

    /**
     * @notice Releases escrowed funds to winning solver after settlement authorization.
     */
    function releaseFunds(bytes32 intentHash, address recipient) external override onlySettlementManager nonReentrant {
        EscrowRecord storage record = _escrows[intentHash];
        if (record.amount == 0 || record.isReleased) revert Errors.EscrowNotFound();
        if (recipient == address(0)) revert Errors.ZeroAddress();

        record.isReleased = true;
        uint256 amount = record.amount;
        address token = record.token;

        IERC20(token).safeTransfer(recipient, amount);
        emit FundsReleased(intentHash, recipient, amount);
    }

    /**
     * @notice Refunds escrowed funds back to user upon intent failure or expiry.
     */
    function refundFunds(bytes32 intentHash, address user) external override onlySettlementManager nonReentrant {
        EscrowRecord storage record = _escrows[intentHash];
        if (record.amount == 0 || record.isReleased) revert Errors.EscrowNotFound();
        if (user == address(0)) revert Errors.ZeroAddress();

        record.isReleased = true;
        uint256 amount = record.amount;
        address token = record.token;

        IERC20(token).safeTransfer(user, amount);
        emit FundsRefunded(intentHash, user, amount);
    }

    function getEscrowAmount(bytes32 intentHash) external view override returns (uint256) {
        return _escrows[intentHash].amount;
    }

    function getEscrowToken(bytes32 intentHash) external view override returns (address) {
        return _escrows[intentHash].token;
    }
}
