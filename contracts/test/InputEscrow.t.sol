// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/InputEscrow.sol";
import "../src/libraries/Errors.sol";
import "./MockERC20.sol";

contract InputEscrowTest is Test {
    InputEscrow public escrow;
    MockERC20 public token;
    address public user = address(0x1111);
    address public solver = address(0x2222);
    address public manager = address(0x3333);
    bytes32 public intentHash = keccak256("intent1");

    function setUp() public {
        escrow = new InputEscrow();
        token = new MockERC20("Test", "TST");
        escrow.setSettlementManager(manager);

        token.mint(user, 10000);
        vm.prank(user);
        token.approve(address(escrow), 10000);
    }

    function test_ValidDepositAndRelease() public {
        vm.prank(user);
        escrow.lockFunds(intentHash, address(token), 1000, user);

        assertEq(escrow.getEscrowAmount(intentHash), 1000);
        assertEq(token.balanceOf(address(escrow)), 1000);

        vm.prank(manager);
        escrow.releaseFunds(intentHash, solver);

        assertEq(token.balanceOf(solver), 1000);
    }

    function test_ValidRefund() public {
        vm.prank(user);
        escrow.lockFunds(intentHash, address(token), 1000, user);

        vm.prank(manager);
        escrow.refundFunds(intentHash, user);

        assertEq(token.balanceOf(user), 10000);
    }

    function test_RevertUnauthorizedRelease() public {
        vm.prank(user);
        escrow.lockFunds(intentHash, address(token), 1000, user);

        vm.prank(solver);
        vm.expectRevert(Errors.Unauthorized.selector);
        escrow.releaseFunds(intentHash, solver);
    }
}
