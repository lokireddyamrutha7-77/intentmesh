// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DestinationVault.sol";
import "../test/MockERC20.sol";

contract DestinationVaultTest is Test {
    DestinationVault public vault;
    MockERC20 public usdc;

    address public owner = address(this);
    address public solver = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
    address public recipient = address(0x1111111111111111111111111111111111111111);
    address public settlementManager = address(0x2222222222222222222222222222222222222222);

    bytes32 public constant INTENT_HASH = keccak256("test_intent_hash_001");

    function setUp() public {
        vault = new DestinationVault();
        usdc = new MockERC20("Mock USDC Token", "USDC");
        vault.setSettlementManager(settlementManager);

        usdc.mint(solver, 100_000 * 1e6);
    }

    function test_DepositFulfilment_ChangesDestinationTokenBalance() public {
        uint256 amount = 1000 * 1e6;

        uint256 solverBalanceBefore = usdc.balanceOf(solver);
        uint256 vaultBalanceBefore = usdc.balanceOf(address(vault));
        assertEq(vaultBalanceBefore, 0);

        vm.startPrank(solver);
        usdc.approve(address(vault), amount);
        vault.depositFulfilment(INTENT_HASH, address(usdc), amount, recipient);
        vm.stopPrank();

        uint256 solverBalanceAfter = usdc.balanceOf(solver);
        uint256 vaultBalanceAfter = usdc.balanceOf(address(vault));

        assertEq(solverBalanceAfter, solverBalanceBefore - amount);
        assertEq(vaultBalanceAfter, amount);
        assertEq(vault.getFulfilmentAmount(INTENT_HASH), amount);
        assertEq(vault.getFulfilmentRecipient(INTENT_HASH), recipient);
    }

    function test_ReleaseFulfilment_TransfersTokenToRecipient() public {
        uint256 amount = 1000 * 1e6;

        vm.startPrank(solver);
        usdc.approve(address(vault), amount);
        vault.depositFulfilment(INTENT_HASH, address(usdc), amount, recipient);
        vm.stopPrank();

        uint256 recipientBalanceBefore = usdc.balanceOf(recipient);

        vm.prank(settlementManager);
        vault.releaseFulfilment(INTENT_HASH);

        uint256 recipientBalanceAfter = usdc.balanceOf(recipient);
        assertEq(recipientBalanceAfter, recipientBalanceBefore + amount);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }
}
