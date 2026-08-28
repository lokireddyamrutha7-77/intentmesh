// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SolverRegistry.sol";
import "../src/SolverBondManager.sol";
import "../src/libraries/Errors.sol";

contract SolverRegistryAndBondTest is Test {
    SolverRegistry public registry;
    SolverBondManager public bondManager;
    address public solver = address(0x2222);
    address public locker = address(0x4444);

    function setUp() public {
        registry = new SolverRegistry();
        bondManager = new SolverBondManager();
        bondManager.setLocker(locker, true);
    }

    function test_SolverRegistrationAndStatus() public {
        vm.prank(solver);
        registry.registerSolver("ipfs://metadata");

        assertTrue(registry.isSolverActive(solver));

        vm.prank(solver);
        registry.setSolverStatus(false);
        assertFalse(registry.isSolverActive(solver));
    }

    function test_BondDepositLockAndWithdraw() public {
        vm.deal(solver, 10 ether);
        vm.prank(solver);
        bondManager.depositBond{value: 5 ether}();

        assertEq(bondManager.getTotalBond(solver), 5 ether);
        assertEq(bondManager.getAvailableBond(solver), 5 ether);

        vm.prank(locker);
        bondManager.lockBond(solver, 2 ether);
        assertEq(bondManager.getLockedBond(solver), 2 ether);
        assertEq(bondManager.getAvailableBond(solver), 3 ether);

        // Cannot withdraw locked portion
        vm.prank(solver);
        vm.expectRevert(Errors.BondLocked.selector);
        bondManager.withdrawBond(4 ether);

        // Can withdraw unencumbered portion
        vm.prank(solver);
        bondManager.withdrawBond(3 ether);
        assertEq(bondManager.getAvailableBond(solver), 0 ether);
    }
}
