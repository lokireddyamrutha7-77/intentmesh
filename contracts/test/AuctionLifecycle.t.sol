// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BatchAuction.sol";
import "../src/CapacityRegistry.sol";
import "../src/InputEscrow.sol";
import "../src/IntentRegistry.sol";
import "../src/SolverBondManager.sol";
import "../src/SolverRegistry.sol";
import "../src/libraries/Errors.sol";

contract MockERC20ForAuctionTest {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "balance");
        require(allowance[from][msg.sender] >= amount, "allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
}

contract AuctionLifecycleTest is Test {
    IntentRegistry public intentRegistry;
    InputEscrow public inputEscrow;
    SolverRegistry public solverRegistry;
    SolverBondManager public bondManager;
    CapacityRegistry public capacityRegistry;
    BatchAuction public auctionEngine;
    MockERC20ForAuctionTest public tokenUSDC;

    address public user = address(0x1111);
    address public solverA = address(0x2222);
    address public solverB = address(0x3333);
    address public solverC = address(0x4444);
    address public recipient = address(0x5555);

    uint64 public chainMainnet;
    uint64 public chainOptimism = 10;
    bytes32 public intentHash;

    function setUp() public {
        chainMainnet = uint64(block.chainid);

        tokenUSDC = new MockERC20ForAuctionTest();
        inputEscrow = new InputEscrow();
        intentRegistry = new IntentRegistry();
        intentRegistry.setInputEscrow(address(inputEscrow));

        solverRegistry = new SolverRegistry();
        bondManager = new SolverBondManager();
        capacityRegistry = new CapacityRegistry(address(bondManager));
        bondManager.setLocker(address(capacityRegistry), true);

        auctionEngine = new BatchAuction(
            address(intentRegistry), address(solverRegistry), address(bondManager), address(capacityRegistry)
        );

        // Authorize auction engine in capacity registry
        capacityRegistry.setReservor(address(auctionEngine), true);

        // Register solvers
        vm.prank(solverA);
        solverRegistry.registerSolver("ipfs://solver-a");
        vm.prank(solverB);
        solverRegistry.registerSolver("ipfs://solver-b");
        vm.prank(solverC);
        solverRegistry.registerSolver("ipfs://solver-c");

        // Add capabilities for solvers
        address[3] memory solvers = [solverA, solverB, solverC];
        for (uint256 i = 0; i < 3; i++) {
            vm.startPrank(solvers[i]);
            solverRegistry.addChainCapability(chainMainnet);
            solverRegistry.addChainCapability(chainOptimism);
            solverRegistry.addTokenCapability(chainMainnet, address(tokenUSDC));
            solverRegistry.addTokenCapability(chainOptimism, address(tokenUSDC));
            vm.stopPrank();

            // Fund bond & declare capacity
            vm.deal(solvers[i], 100 ether);
            vm.prank(solvers[i]);
            bondManager.depositBond{value: 50 ether}();

            vm.prank(solvers[i]);
            capacityRegistry.declareCapacity(chainOptimism, address(tokenUSDC), 1_000_000 * 1e6);
        }

        // User creates and funds intent
        tokenUSDC.mint(user, 1000 * 1e6);
        vm.prank(user);
        tokenUSDC.approve(address(inputEscrow), 1000 * 1e6);

        vm.prank(user);
        intentHash = intentRegistry.createAndFundIntent(
            chainMainnet,
            address(tokenUSDC),
            1000 * 1e6,
            chainOptimism,
            address(tokenUSDC),
            recipient,
            950 * 1e6,
            uint64(block.timestamp + 1000),
            bytes32("policy")
        );
    }

    function test_AuctionCreation() public {
        bytes32 auctionId = auctionEngine.createAuction(intentHash, 60, 60);
        assertTrue(auctionId != bytes32(0));

        ProtocolTypes.Auction memory auc = auctionEngine.getAuction(auctionId);
        assertEq(auc.intentHash, intentHash);
        assertEq(uint8(auc.state), uint8(ProtocolTypes.AuctionState.COMMIT));
    }

    function test_RevertDuplicateAuctionCreation() public {
        auctionEngine.createAuction(intentHash, 60, 60);
        vm.expectRevert(Errors.AuctionAlreadyExists.selector);
        auctionEngine.createAuction(intentHash, 60, 60);
    }

    function test_CommitAndRevealFlow() public {
        bytes32 auctionId = auctionEngine.createAuction(intentHash, 60, 60);

        bytes32 saltA = bytes32("saltA");
        bytes32 commitA =
            auctionEngine.computeBidCommitmentHash(auctionId, intentHash, solverA, 980 * 1e6, 60, 1000 * 1e6, saltA);

        bytes32 saltB = bytes32("saltB");
        bytes32 commitB =
            auctionEngine.computeBidCommitmentHash(auctionId, intentHash, solverB, 990 * 1e6, 15, 1000 * 1e6, saltB);

        // Submit commitments
        vm.prank(solverA);
        auctionEngine.submitCommitment(auctionId, commitA);

        vm.prank(solverB);
        auctionEngine.submitCommitment(auctionId, commitB);

        // Warp to reveal window
        vm.warp(block.timestamp + 61);

        // Reveal bids
        vm.prank(solverA);
        auctionEngine.revealBid(auctionId, 980 * 1e6, 60, 1000 * 1e6, saltA);

        vm.prank(solverB);
        auctionEngine.revealBid(auctionId, 990 * 1e6, 15, 1000 * 1e6, saltB);

        // Warp to after reveal deadline
        vm.warp(block.timestamp + 61);

        // Finalize auction -> Solver B should win because 990 > 980
        address winner = auctionEngine.finalizeAuction(auctionId);
        assertEq(winner, solverB);

        ProtocolTypes.Auction memory auc = auctionEngine.getAuction(auctionId);
        assertEq(uint8(auc.state), uint8(ProtocolTypes.AuctionState.FINALIZED));
        assertEq(auc.winner, solverB);
        assertEq(auc.winningOutputAmount, 990 * 1e6);
    }

    function test_RevertCommitmentMismatchOnReveal() public {
        bytes32 auctionId = auctionEngine.createAuction(intentHash, 60, 60);

        bytes32 saltA = bytes32("saltA");
        bytes32 commitA =
            auctionEngine.computeBidCommitmentHash(auctionId, intentHash, solverA, 980 * 1e6, 60, 1000 * 1e6, saltA);

        vm.prank(solverA);
        auctionEngine.submitCommitment(auctionId, commitA);

        vm.warp(block.timestamp + 61);

        // Tamper salt -> should revert with CommitmentMismatch
        vm.prank(solverA);
        vm.expectRevert(Errors.CommitmentMismatch.selector);
        auctionEngine.revealBid(auctionId, 980 * 1e6, 60, 1000 * 1e6, bytes32("wrongSalt"));
    }

    function test_FallbackCandidateWhenWinnerLacksCapacity() public {
        bytes32 auctionId = auctionEngine.createAuction(intentHash, 60, 60);

        bytes32 saltA = bytes32("saltA");
        bytes32 commitA =
            auctionEngine.computeBidCommitmentHash(auctionId, intentHash, solverA, 980 * 1e6, 60, 1000 * 1e6, saltA);

        bytes32 saltB = bytes32("saltB");
        bytes32 commitB =
            auctionEngine.computeBidCommitmentHash(auctionId, intentHash, solverB, 990 * 1e6, 15, 1000 * 1e6, saltB);

        vm.prank(solverA);
        auctionEngine.submitCommitment(auctionId, commitA);
        vm.prank(solverB);
        auctionEngine.submitCommitment(auctionId, commitB);

        vm.warp(block.timestamp + 61);
        vm.prank(solverA);
        auctionEngine.revealBid(auctionId, 980 * 1e6, 60, 1000 * 1e6, saltA);
        vm.prank(solverB);
        auctionEngine.revealBid(auctionId, 990 * 1e6, 15, 1000 * 1e6, saltB);

        // Now solver B (top candidate) drops its declared capacity to 0 before finalization
        vm.prank(solverB);
        capacityRegistry.declareCapacity(chainOptimism, address(tokenUSDC), 0);

        vm.warp(block.timestamp + 61);

        // Finalize -> Solver B fails revalidation -> Fallback solver A wins!
        address winner = auctionEngine.finalizeAuction(auctionId);
        assertEq(winner, solverA);
    }

    function test_NoValidBidsCancelledState() public {
        bytes32 auctionId = auctionEngine.createAuction(intentHash, 60, 60);
        vm.warp(block.timestamp + 122);

        // Finalize with no reveals -> Auction cancelled
        address winner = auctionEngine.finalizeAuction(auctionId);
        assertEq(winner, address(0));

        ProtocolTypes.Auction memory auc = auctionEngine.getAuction(auctionId);
        assertEq(uint8(auc.state), uint8(ProtocolTypes.AuctionState.CANCELLED));
    }

    function testFuzz_CommitmentHashReproduction(uint96 expectedOutput, uint32 execTime, uint96 capacity, bytes32 salt)
        public
        view
    {
        bytes32 auctionId = bytes32("auc1");
        bytes32 iHash = bytes32("intent1");

        bytes32 hash1 =
            auctionEngine.computeBidCommitmentHash(auctionId, iHash, solverA, expectedOutput, execTime, capacity, salt);
        bytes32 hash2 =
            auctionEngine.computeBidCommitmentHash(auctionId, iHash, solverA, expectedOutput, execTime, capacity, salt);
        assertEq(hash1, hash2);

        // Modifying salt produces different hash
        bytes32 hashDiffSalt = auctionEngine.computeBidCommitmentHash(
            auctionId, iHash, solverA, expectedOutput, execTime, capacity, keccak256(abi.encode(salt))
        );
        assertTrue(hash1 != hashDiffSalt);
    }
}
