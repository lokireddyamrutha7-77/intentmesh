// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/InputEscrow.sol";
import "../src/IntentRegistry.sol";
import "../src/libraries/Errors.sol";
import "./MockERC20.sol";

contract IntentRegistryTest is Test {
    IntentRegistry public registry;
    InputEscrow public escrow;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    address public user = address(0x1111);
    bytes32 public policy = keccak256("POLICY");

    function setUp() public {
        registry = new IntentRegistry();
        escrow = new InputEscrow();

        registry.setInputEscrow(address(escrow));
        escrow.setIntentRegistry(address(registry));

        tokenA = new MockERC20("TokenA", "TKA");
        tokenB = new MockERC20("TokenB", "TKB");

        tokenA.mint(user, 1_000_000);
        vm.prank(user);
        tokenA.approve(address(escrow), type(uint256).max);
    }

    function test_ValidRegistration() public {
        vm.prank(user);
        bytes32 hash = registry.createAndFundIntent(
            uint64(block.chainid),
            address(tokenA),
            1000,
            10,
            address(tokenB),
            user,
            900,
            uint64(block.timestamp + 3600),
            policy
        );

        assertTrue(hash != bytes32(0));
        assertEq(uint256(registry.getIntentState(hash)), uint256(ProtocolTypes.IntentState.AUCTION_READY));
        assertEq(registry.getUserNonce(user), 1);
    }

    function test_NonceIncrement() public {
        vm.startPrank(user);
        registry.createAndFundIntent(
            uint64(block.chainid),
            address(tokenA),
            1000,
            10,
            address(tokenB),
            user,
            900,
            uint64(block.timestamp + 3600),
            policy
        );
        assertEq(registry.getUserNonce(user), 1);

        registry.createAndFundIntent(
            uint64(block.chainid),
            address(tokenA),
            2000,
            10,
            address(tokenB),
            user,
            1800,
            uint64(block.timestamp + 3600),
            policy
        );
        assertEq(registry.getUserNonce(user), 2);
        vm.stopPrank();
    }

    function test_RevertExpiredDeadline() public {
        vm.prank(user);
        vm.expectRevert(Errors.InvalidDeadline.selector);
        registry.createAndFundIntent(
            uint64(block.chainid),
            address(tokenA),
            1000,
            10,
            address(tokenB),
            user,
            900,
            uint64(block.timestamp - 1),
            policy
        );
    }

    function test_RevertZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(Errors.InvalidAmount.selector);
        registry.createAndFundIntent(
            uint64(block.chainid),
            address(tokenA),
            0,
            10,
            address(tokenB),
            user,
            900,
            uint64(block.timestamp + 3600),
            policy
        );
    }
}
