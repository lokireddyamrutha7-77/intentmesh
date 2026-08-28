// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "forge-std/Test.sol";
import "../src/CapacityRegistry.sol";
import "../src/SolverBondManager.sol";
import "../src/SolverRegistry.sol";
import "../src/libraries/Errors.sol";

contract SolverRegistryTest is Test {
    SolverRegistry public registry;
    SolverBondManager public bondManager;
    CapacityRegistry public capacityRegistry;

    address public owner = address(this);
    address public solverA = address(0x2222);
    address public solverB = address(0x3333);
    address public attacker = address(0x9999);
    address public tokenUSDC = address(0x4444);
    address public tokenWETH = address(0x5555);

    uint64 public chainMainnet = 1;
    uint64 public chainOptimism = 10;

    function setUp() public {
        registry = new SolverRegistry();
        bondManager = new SolverBondManager();
        capacityRegistry = new CapacityRegistry(address(bondManager));

        vm.prank(solverA);
        registry.registerSolver("ipfs://solver-a");

        vm.prank(solverB);
        registry.registerSolver("ipfs://solver-b");
    }

    function test_RegistrationAndProfile() public view {
        assertTrue(registry.isSolverRegistered(solverA));
        assertTrue(registry.isSolverActive(solverA));

        ProtocolTypes.SolverProfile memory profile = registry.getSolverProfile(solverA);
        assertEq(profile.solver, solverA);
        assertTrue(profile.isActive);
        assertEq(profile.metadataURI, "ipfs://solver-a");
    }

    function test_RevertDuplicateRegistration() public {
        vm.prank(solverA);
        vm.expectRevert(Errors.SolverAlreadyRegistered.selector);
        registry.registerSolver("ipfs://duplicate");
    }

    function test_StatusSelfManagement() public {
        vm.prank(solverA);
        registry.setSolverStatus(false);
        assertFalse(registry.isSolverActive(solverA));

        vm.prank(solverA);
        registry.setSolverStatus(true);
        assertTrue(registry.isSolverActive(solverA));
    }

    function test_RevertUnauthorizedStatusModification() public {
        // Attacker calling setSolverStatus directly reverts with SolverNotRegistered
        vm.prank(attacker);
        vm.expectRevert(Errors.SolverNotRegistered.selector);
        registry.setSolverStatus(false);

        // Attacker calling setSolverStatusByAdmin reverts with OwnableUnauthorizedAccount
        bytes memory expectedRevert = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker);
        vm.prank(attacker);
        vm.expectRevert(expectedRevert);
        registry.setSolverStatusByAdmin(solverA, false);
    }

    function test_AdminStatusModification() public {
        registry.setSolverStatusByAdmin(solverA, false);
        assertFalse(registry.isSolverActive(solverA));
    }

    function test_ChainCapabilities() public {
        vm.startPrank(solverA);
        registry.addChainCapability(chainMainnet);
        registry.addChainCapability(chainOptimism);
        vm.stopPrank();

        assertTrue(registry.isChainSupported(solverA, chainMainnet));
        assertTrue(registry.isChainSupported(solverA, chainOptimism));
        assertFalse(registry.isChainSupported(solverB, chainMainnet));

        uint64[] memory chains = registry.getSupportedChains(solverA);
        assertEq(chains.length, 2);
        assertEq(chains[0], chainMainnet);
        assertEq(chains[1], chainOptimism);

        // Remove chain capability
        vm.prank(solverA);
        registry.removeChainCapability(chainMainnet);

        assertFalse(registry.isChainSupported(solverA, chainMainnet));
        uint64[] memory updatedChains = registry.getSupportedChains(solverA);
        assertEq(updatedChains.length, 1);
        assertEq(updatedChains[0], chainOptimism);
    }

    function test_RevertDuplicateChainCapability() public {
        vm.startPrank(solverA);
        registry.addChainCapability(chainMainnet);

        vm.expectRevert(Errors.ChainAlreadySupported.selector);
        registry.addChainCapability(chainMainnet);
        vm.stopPrank();
    }

    function test_RevertRemovingNonexistentChain() public {
        vm.prank(solverA);
        vm.expectRevert(Errors.ChainNotSupported.selector);
        registry.removeChainCapability(chainMainnet);
    }

    function test_ChainAwareTokenCapabilities() public {
        vm.startPrank(solverA);
        registry.addChainCapability(chainMainnet);
        registry.addChainCapability(chainOptimism);

        // Add USDC on Mainnet
        registry.addTokenCapability(chainMainnet, tokenUSDC);
        // Add USDC on Optimism
        registry.addTokenCapability(chainOptimism, tokenUSDC);
        // Add WETH on Optimism
        registry.addTokenCapability(chainOptimism, tokenWETH);
        vm.stopPrank();

        assertTrue(registry.isTokenSupported(solverA, chainMainnet, tokenUSDC));
        assertFalse(registry.isTokenSupported(solverA, chainMainnet, tokenWETH));

        assertTrue(registry.isTokenSupported(solverA, chainOptimism, tokenUSDC));
        assertTrue(registry.isTokenSupported(solverA, chainOptimism, tokenWETH));

        address[] memory optTokens = registry.getSupportedTokens(solverA, chainOptimism);
        assertEq(optTokens.length, 2);

        // Remove token capability
        vm.prank(solverA);
        registry.removeTokenCapability(chainOptimism, tokenUSDC);

        assertFalse(registry.isTokenSupported(solverA, chainOptimism, tokenUSDC));
        assertTrue(registry.isTokenSupported(solverA, chainMainnet, tokenUSDC));
    }

    function test_RevertDuplicateTokenCapability() public {
        vm.startPrank(solverA);
        registry.addChainCapability(chainMainnet);
        registry.addTokenCapability(chainMainnet, tokenUSDC);

        vm.expectRevert(Errors.TokenAlreadySupported.selector);
        registry.addTokenCapability(chainMainnet, tokenUSDC);
        vm.stopPrank();
    }

    function test_RevertTokenCapabilityWithoutChain() public {
        vm.prank(solverA);
        vm.expectRevert(Errors.ChainNotSupported.selector);
        registry.addTokenCapability(chainMainnet, tokenUSDC);
    }

    function test_BondAndCapacityIntegrationRead() public {
        vm.deal(solverA, 10 ether);
        vm.prank(solverA);
        bondManager.depositBond{value: 5 ether}();

        vm.prank(solverA);
        capacityRegistry.declareCapacity(chainMainnet, tokenUSDC, 1000);

        assertEq(bondManager.getAvailableBond(solverA), 5 ether);
        assertEq(capacityRegistry.getDeclaredCapacity(solverA, chainMainnet, tokenUSDC), 1000);
    }
}
