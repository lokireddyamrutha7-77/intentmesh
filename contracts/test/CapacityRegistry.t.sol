// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CapacityRegistry.sol";
import "../src/SolverBondManager.sol";
import "../src/libraries/Errors.sol";

contract CapacityRegistryTest is Test {
    SolverBondManager public bondManager;
    CapacityRegistry public capacityRegistry;
    address public solver = address(0x2222);
    address public token = address(0x3333);
    address public reservor = address(0x4444);
    bytes32 public intentHash = keccak256("intent1");

    function setUp() public {
        bondManager = new SolverBondManager();
        capacityRegistry = new CapacityRegistry(address(bondManager));

        bondManager.setLocker(address(capacityRegistry), true);
        capacityRegistry.setReservor(reservor, true);

        vm.deal(solver, 10 ether);
        vm.prank(solver);
        bondManager.depositBond{value: 5 ether}();
    }

    function test_CapacityDeclarationAndReservation() public {
        vm.prank(solver);
        capacityRegistry.declareCapacity(10, token, 1000);

        assertEq(capacityRegistry.getDeclaredCapacity(solver, 10, token), 1000);
        assertEq(capacityRegistry.getAvailableCapacity(solver, 10, token), 1000);

        vm.prank(reservor);
        bytes32 resId =
            capacityRegistry.reserveCapacity(intentHash, solver, 10, token, 400, uint64(block.timestamp + 3600));

        assertEq(capacityRegistry.getReservedCapacity(solver, 10, token), 400);
        assertEq(capacityRegistry.getAvailableCapacity(solver, 10, token), 600);

        vm.prank(reservor);
        capacityRegistry.releaseCapacity(resId);

        assertEq(capacityRegistry.getReservedCapacity(solver, 10, token), 0);
        assertEq(capacityRegistry.getAvailableCapacity(solver, 10, token), 1000);
    }

    function test_RevertReservationExceedingCapacity() public {
        vm.prank(solver);
        capacityRegistry.declareCapacity(10, token, 500);

        vm.prank(reservor);
        vm.expectRevert(Errors.CapacityExceeded.selector);
        capacityRegistry.reserveCapacity(intentHash, solver, 10, token, 600, uint64(block.timestamp + 3600));
    }
}
