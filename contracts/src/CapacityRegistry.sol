// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./types/ProtocolTypes.sol";
import "./libraries/Errors.sol";
import "./libraries/Events.sol";
import "./interfaces/ICapacityRegistry.sol";
import "./interfaces/ISolverBondManager.sol";

/**
 * @title CapacityRegistry
 * @notice Tracks declared, reserved, and available liquidity capacity for solvers across target chains and tokens.
 * @dev Enforces invariant: Reserved Capacity <= Available Capacity <= Declared Capacity.
 */
contract CapacityRegistry is ICapacityRegistry, Ownable, Events {
    using ProtocolTypes for ProtocolTypes.CapacityReservation;

    // solver => chainId => token => declaredCapacity
    mapping(address => mapping(uint64 => mapping(address => uint256))) private _declaredCapacity;
    // solver => chainId => token => reservedCapacity
    mapping(address => mapping(uint64 => mapping(address => uint256))) private _reservedCapacity;
    // reservationId => CapacityReservation
    mapping(bytes32 => ProtocolTypes.CapacityReservation) private _reservations;
    mapping(address => bool) public authorizedReservors;

    ISolverBondManager public bondManager;

    modifier onlyReservor() {
        if (!authorizedReservors[msg.sender] && msg.sender != owner()) {
            revert Errors.Unauthorized();
        }
        _;
    }

    constructor(address _bondManager) Ownable(msg.sender) {
        if (_bondManager == address(0)) revert Errors.ZeroAddress();
        bondManager = ISolverBondManager(_bondManager);
    }

    function setReservor(address reservor, bool authorized) external onlyOwner {
        if (reservor == address(0)) revert Errors.ZeroAddress();
        authorizedReservors[reservor] = authorized;
    }

    /**
     * @notice Solvers declare their available liquidity capacity for a specific chain and token.
     */
    function declareCapacity(uint64 chainId, address token, uint256 capacity) external override {
        if (token == address(0)) revert Errors.ZeroAddress();
        _declaredCapacity[msg.sender][chainId][token] = capacity;
        emit CapacityUpdated(msg.sender, chainId, token, capacity);
    }

    /**
     * @notice Reserves solver capacity for a winning intent bid.
     * @dev Enforces INVARIANT-004: Reserved capacity must not exceed declared/available capacity & available bond balance.
     */
    function reserveCapacity(
        bytes32 intentHash,
        address solver,
        uint64 chainId,
        address token,
        uint256 amount,
        uint64 expiry
    ) external override onlyReservor returns (bytes32 reservationId) {
        if (solver == address(0) || token == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.ZeroAmount();
        if (expiry <= block.timestamp) revert Errors.ReservationExpired();

        uint256 availCap = getAvailableCapacity(solver, chainId, token);
        if (availCap < amount) revert Errors.CapacityExceeded();

        uint256 availBond = bondManager.getAvailableBond(solver);
        if (availBond < amount) revert Errors.InsufficientBond();

        reservationId = keccak256(abi.encode(intentHash, solver, chainId, token, amount, expiry, block.timestamp));
        if (_reservations[reservationId].amount > 0) revert Errors.InvalidParameters();

        _reservations[reservationId] = ProtocolTypes.CapacityReservation({
            reservationId: reservationId,
            intentHash: intentHash,
            solver: solver,
            destinationChainId: chainId,
            token: token,
            amount: amount,
            expiryTimestamp: expiry,
            isReleased: false
        });

        _reservedCapacity[solver][chainId][token] += amount;
        bondManager.lockBond(solver, amount);

        emit CapacityReserved(reservationId, intentHash, solver, amount);
    }

    /**
     * @notice Releases a capacity reservation after settlement or expiry.
     */
    function releaseCapacity(bytes32 reservationId) external override onlyReservor {
        ProtocolTypes.CapacityReservation storage res = _reservations[reservationId];
        if (res.amount == 0) revert Errors.ReservationNotFound();
        if (res.isReleased) revert Errors.ReservationAlreadyReleased();

        res.isReleased = true;
        _reservedCapacity[res.solver][res.destinationChainId][res.token] -= res.amount;
        bondManager.unlockBond(res.solver, res.amount);

        emit CapacityReleased(reservationId, res.intentHash, res.solver, res.amount);
    }

    function getReservation(bytes32 reservationId)
        external
        view
        override
        returns (ProtocolTypes.CapacityReservation memory)
    {
        if (_reservations[reservationId].amount == 0) revert Errors.ReservationNotFound();
        return _reservations[reservationId];
    }

    function getDeclaredCapacity(address solver, uint64 chainId, address token)
        external
        view
        override
        returns (uint256)
    {
        return _declaredCapacity[solver][chainId][token];
    }

    function getReservedCapacity(address solver, uint64 chainId, address token)
        external
        view
        override
        returns (uint256)
    {
        return _reservedCapacity[solver][chainId][token];
    }

    function getAvailableCapacity(address solver, uint64 chainId, address token)
        public
        view
        override
        returns (uint256)
    {
        uint256 declared = _declaredCapacity[solver][chainId][token];
        uint256 reserved = _reservedCapacity[solver][chainId][token];
        if (declared <= reserved) return 0;
        return declared - reserved;
    }
}
