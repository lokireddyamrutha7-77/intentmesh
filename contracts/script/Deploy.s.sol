// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/IntentRegistry.sol";
import "../src/InputEscrow.sol";
import "../src/SolverRegistry.sol";
import "../src/SolverBondManager.sol";
import "../src/CapacityRegistry.sol";
import "../src/BatchAuction.sol";
import "../src/DestinationVault.sol";
import "../src/VerificationAdapter.sol";
import "../src/ReputationRegistry.sol";
import "../src/SettlementManager.sol";
import "../test/MockERC20.sol";

/**
 * @title DeployScript
 * @notice Deterministic deployment script for IntentMesh smart contracts on local Anvil EVM environments.
 * @dev Deploys contracts in dependency order, configures inter-contract permissions, and outputs machine-readable JSON metadata.
 */
contract DeployScript is Script {
    function run() external {
        // Standard Anvil Account #0 private key default for local development only
        uint256 deployerPrivateKey =
            vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address deployer = vm.addr(deployerPrivateKey);

        console.log("----------------------------------------------------");
        console.log("   INTENTMESH CONTRACT DEPLOYMENT SETUP             ");
        console.log("----------------------------------------------------");
        console.log("Deployer Address:", deployer);
        console.log("Target Chain ID: ", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy independent registries & managers
        SolverRegistry solverRegistry = new SolverRegistry();
        SolverBondManager bondManager = new SolverBondManager();
        CapacityRegistry capacityRegistry = new CapacityRegistry(address(bondManager));
        IntentRegistry intentRegistry = new IntentRegistry();
        InputEscrow inputEscrow = new InputEscrow();
        DestinationVault destinationVault = new DestinationVault();
        ReputationRegistry reputationRegistry = new ReputationRegistry();

        // 2. Deploy dependent verification & auction contracts
        VerificationAdapter verificationAdapter = new VerificationAdapter(address(intentRegistry));
        BatchAuction batchAuction = new BatchAuction(
            address(intentRegistry), address(solverRegistry), address(bondManager), address(capacityRegistry)
        );
        SettlementManager settlementManager = new SettlementManager(address(verificationAdapter), address(inputEscrow));

        // 3. Deploy Local Demo Token (MockUSDC) & Fund Solvers
        MockERC20 mockUSDC = new MockERC20("Mock USDC Token", "USDC");
        mockUSDC.mint(deployer, 1_000_000 * 1e6);
        mockUSDC.mint(address(bytes20(hex"70997970C51812dc3A010C7d01b50e0d17dc79C8")), 500_000 * 1e6); // Solver A
        mockUSDC.mint(address(bytes20(hex"3C44CdDDB6a900fa2b585dd299e03d12FA4293BC")), 500_000 * 1e6); // Solver B
        mockUSDC.mint(address(bytes20(hex"90F79bf6EB2c4f8096638522f60758928276f470")), 500_000 * 1e6); // Solver C

        // 4. Configure Inter-Contract Authorizations & Dependencies
        intentRegistry.setInputEscrow(address(inputEscrow));
        intentRegistry.setAuthorizedCaller(address(batchAuction), true);

        inputEscrow.setSettlementManager(address(settlementManager));
        inputEscrow.setIntentRegistry(address(intentRegistry));

        capacityRegistry.setReservor(address(batchAuction), true);

        bondManager.setLocker(address(capacityRegistry), true);
        bondManager.setSettlementManager(address(settlementManager));

        destinationVault.setSettlementManager(address(settlementManager));
        reputationRegistry.setReporter(address(settlementManager), true);

        settlementManager.setCoordinator(deployer, true);

        vm.stopBroadcast();

        console.log("----------------------------------------------------");
        console.log("   DEPLOYED CONTRACT ADDRESSES                      ");
        console.log("----------------------------------------------------");
        console.log("SolverRegistry:     ", address(solverRegistry));
        console.log("SolverBondManager:  ", address(bondManager));
        console.log("CapacityRegistry:   ", address(capacityRegistry));
        console.log("IntentRegistry:     ", address(intentRegistry));
        console.log("InputEscrow:        ", address(inputEscrow));
        console.log("DestinationVault:   ", address(destinationVault));
        console.log("ReputationRegistry: ", address(reputationRegistry));
        console.log("VerificationAdapter:", address(verificationAdapter));
        console.log("BatchAuction:       ", address(batchAuction));
        console.log("SettlementManager:  ", address(settlementManager));
        console.log("MockUSDC:           ", address(mockUSDC));

        // Output structured deployment JSON artifact
        string memory jsonKey = "deployment";
        vm.serializeAddress(jsonKey, "IntentRegistry", address(intentRegistry));
        vm.serializeAddress(jsonKey, "InputEscrow", address(inputEscrow));
        vm.serializeAddress(jsonKey, "SolverRegistry", address(solverRegistry));
        vm.serializeAddress(jsonKey, "SolverBondManager", address(bondManager));
        vm.serializeAddress(jsonKey, "CapacityRegistry", address(capacityRegistry));
        vm.serializeAddress(jsonKey, "BatchAuction", address(batchAuction));
        vm.serializeAddress(jsonKey, "DestinationVault", address(destinationVault));
        vm.serializeAddress(jsonKey, "VerificationAdapter", address(verificationAdapter));
        vm.serializeAddress(jsonKey, "ReputationRegistry", address(reputationRegistry));
        vm.serializeAddress(jsonKey, "SettlementManager", address(settlementManager));
        string memory finalJson = vm.serializeAddress(jsonKey, "MockUSDC", address(mockUSDC));

        string memory filename =
            string(abi.encodePacked("deployments/deployments-", vm.toString(block.chainid), ".json"));
        vm.writeJson(finalJson, filename);
        console.log("----------------------------------------------------");
        console.log("Deployment artifact written to:", filename);
        console.log("----------------------------------------------------");
    }
}
