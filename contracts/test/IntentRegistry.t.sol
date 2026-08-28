// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/IntentRegistry.sol";
import "../src/libraries/Errors.sol";

contract IntentRegistryTest is Test {
    IntentRegistry public registry;
    address public user = address(0x1111);
    address public tokenA = address(0x2222);
    address public tokenB = address(0x3333);

    function setUp() public {
        registry = new IntentRegistry();
    }

    function test_ValidRegistration() public {
        vm.prank(user);
        bytes32 hash = registry.registerIntent(tokenA, 1000, 10, tokenB, user, 900, uint64(block.timestamp + 3600));

        assertTrue(hash != bytes32(0));
        assertEq(uint256(registry.getIntentState(hash)), uint256(ProtocolTypes.IntentState.CREATED));
        assertEq(registry.getUserNonce(user), 1);
    }

    function test_NonceIncrement() public {
        vm.startPrank(user);
        registry.registerIntent(tokenA, 1000, 10, tokenB, user, 900, uint64(block.timestamp + 3600));
        assertEq(registry.getUserNonce(user), 1);

        registry.registerIntent(tokenA, 2000, 10, tokenB, user, 1800, uint64(block.timestamp + 3600));
        assertEq(registry.getUserNonce(user), 2);
        vm.stopPrank();
    }

    function test_RevertExpiredDeadline() public {
        vm.prank(user);
        vm.expectRevert(Errors.InvalidDeadline.selector);
        registry.registerIntent(tokenA, 1000, 10, tokenB, user, 900, uint64(block.timestamp - 1));
    }

    function test_RevertZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(Errors.ZeroAmount.selector);
        registry.registerIntent(tokenA, 0, 10, tokenB, user, 900, uint64(block.timestamp + 3600));
    }
}
