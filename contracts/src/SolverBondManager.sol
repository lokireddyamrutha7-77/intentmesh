// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./libraries/Errors.sol";
import "./libraries/Events.sol";
import "./interfaces/ISolverBondManager.sol";

/**
 * @title SolverBondManager
 * @notice Manages solver bond deposits, collateral locking, unlocking, and slashing interface foundation.
 * @dev Implements Phase 1 secure bond accounting and authorization boundaries. Full slashing policy belongs to Phase 11.
 */
contract SolverBondManager is ISolverBondManager, Ownable, ReentrancyGuard, Events {
    mapping(address => uint256) private _totalBonds;
    mapping(address => uint256) private _lockedBonds;
    mapping(address => bool) public authorizedLockers;
    address public settlementManager;

    modifier onlyLocker() {
        if (!authorizedLockers[msg.sender] && msg.sender != owner()) {
            revert Errors.Unauthorized();
        }
        _;
    }

    modifier onlySettlementManager() {
        if (msg.sender != settlementManager && msg.sender != owner()) {
            revert Errors.Unauthorized();
        }
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setLocker(address locker, bool authorized) external onlyOwner {
        if (locker == address(0)) revert Errors.ZeroAddress();
        authorizedLockers[locker] = authorized;
    }

    function setSettlementManager(address _settlementManager) external onlyOwner {
        if (_settlementManager == address(0)) revert Errors.ZeroAddress();
        settlementManager = _settlementManager;
    }

    /**
     * @notice Deposit native ETH collateral as bond.
     */
    function depositBond() external payable override nonReentrant {
        if (msg.value == 0) revert Errors.ZeroAmount();
        _totalBonds[msg.sender] += msg.value;
        emit BondDeposited(msg.sender, address(0), msg.value);
    }

    /**
     * @notice Locks solver bond collateral for active capacity reservation.
     */
    function lockBond(address solver, uint256 amount) external override onlyLocker {
        if (solver == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.ZeroAmount();
        if (getAvailableBond(solver) < amount) revert Errors.InsufficientBond();

        _lockedBonds[solver] += amount;
        emit BondLocked(solver, amount);
    }

    /**
     * @notice Unlocks solver bond collateral after capacity release.
     */
    function unlockBond(address solver, uint256 amount) external override onlyLocker {
        if (solver == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.ZeroAmount();
        if (_lockedBonds[solver] < amount) revert Errors.InvalidBondAmount();

        _lockedBonds[solver] -= amount;
        emit BondUnlocked(solver, amount);
    }

    /**
     * @notice Withdraws unencumbered solver bond collateral.
     */
    function withdrawBond(uint256 amount) external override nonReentrant {
        if (amount == 0) revert Errors.ZeroAmount();
        if (getAvailableBond(msg.sender) < amount) revert Errors.BondLocked();

        _totalBonds[msg.sender] -= amount;
        emit BondWithdrawn(msg.sender, address(0), amount);

        (bool success,) = msg.sender.call{value: amount}("");
        if (!success) revert Errors.InvalidParameters();
    }

    /**
     * @notice Narrowly scoped slashing authorization interface foundation for future objective penalties (Phase 11).
     */
    function slashBond(address solver, uint256 amount, address recipient)
        external
        override
        onlySettlementManager
        nonReentrant
    {
        if (solver == address(0) || recipient == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.ZeroAmount();
        if (_totalBonds[solver] < amount) revert Errors.InsufficientBond();

        _totalBonds[solver] -= amount;
        if (_lockedBonds[solver] > _totalBonds[solver]) {
            _lockedBonds[solver] = _totalBonds[solver];
        }

        emit BondSlashed(solver, amount, recipient);

        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert Errors.InvalidParameters();
    }

    function getTotalBond(address solver) external view override returns (uint256) {
        return _totalBonds[solver];
    }

    function getLockedBond(address solver) external view override returns (uint256) {
        return _lockedBonds[solver];
    }

    function getAvailableBond(address solver) public view override returns (uint256) {
        if (_totalBonds[solver] <= _lockedBonds[solver]) return 0;
        return _totalBonds[solver] - _lockedBonds[solver];
    }
}
