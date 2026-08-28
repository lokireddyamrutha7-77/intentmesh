// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./libraries/Errors.sol";
import "./libraries/Events.sol";
import "./interfaces/IDestinationVault.sol";

/**
 * @title DestinationVault
 * @notice Destination-side vault receiving output token fills from solvers.
 */
contract DestinationVault is IDestinationVault, Ownable, ReentrancyGuard, Events {
    using SafeERC20 for IERC20;

    struct FulfilmentRecord {
        address token;
        uint256 amount;
        address recipient;
        bool isReleased;
    }

    mapping(bytes32 => FulfilmentRecord) private _fulfilments;
    address public settlementManager;

    modifier onlySettlementManager() {
        if (msg.sender != settlementManager && msg.sender != owner()) {
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
     * @notice Receives output tokens from solver on destination chain.
     */
    function depositFulfilment(bytes32 intentHash, address token, uint256 amount, address recipient)
        external
        override
        nonReentrant
    {
        if (token == address(0) || recipient == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.ZeroAmount();
        if (_fulfilments[intentHash].amount > 0) revert Errors.InvalidParameters();

        _fulfilments[intentHash] =
            FulfilmentRecord({token: token, amount: amount, recipient: recipient, isReleased: false});

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Releases output tokens to final recipient after verified settlement.
     */
    function releaseFulfilment(bytes32 intentHash) external override onlySettlementManager nonReentrant {
        FulfilmentRecord storage record = _fulfilments[intentHash];
        if (record.amount == 0 || record.isReleased) revert Errors.InvalidParameters();

        record.isReleased = true;
        IERC20(record.token).safeTransfer(record.recipient, record.amount);
    }

    function getFulfilmentAmount(bytes32 intentHash) external view override returns (uint256) {
        return _fulfilments[intentHash].amount;
    }

    function getFulfilmentRecipient(bytes32 intentHash) external view override returns (address) {
        return _fulfilments[intentHash].recipient;
    }
}
