// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISolverBondManager {
    function depositBond() external payable;

    function lockBond(address solver, uint256 amount) external;

    function unlockBond(address solver, uint256 amount) external;

    function withdrawBond(uint256 amount) external;

    function slashBond(address solver, uint256 amount, address recipient) external;

    function getTotalBond(address solver) external view returns (uint256);

    function getLockedBond(address solver) external view returns (uint256);

    function getAvailableBond(address solver) external view returns (uint256);
}
