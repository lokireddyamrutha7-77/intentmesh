// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BatchAuction.sol";
import "../src/CapacityRegistry.sol";
import "../src/InputEscrow.sol";
import "../src/IntentRegistry.sol";
import "../src/SettlementManager.sol";
import "../src/SolverBondManager.sol";
import "../src/SolverRegistry.sol";
import "../src/VerificationAdapter.sol";
import "../src/libraries/Errors.sol";
import "./MockERC20.sol";

contract AuctionAndSettlementTest is Test {
    SolverRegistry public solverRegistry;
    SolverBondManager public bondManager;
    CapacityRegistry public capacityRegistry;
    BatchAuction public auction;
    IntentRegistry public intentRegistry;
    VerificationAdapter public verificationAdapter;
    InputEscrow public inputEscrow;
    SettlementManager public settlementManager;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    address public solver = address(0x2222);
    address public user = address(0x1111);
    bytes32 public intentHash;

    function setUp() public {
        solverRegistry = new SolverRegistry();
        bondManager = new SolverBondManager();
        capacityRegistry = new CapacityRegistry(address(bondManager));
        bondManager.setLocker(address(capacityRegistry), true);

        inputEscrow = new InputEscrow();
        intentRegistry = new IntentRegistry();
        intentRegistry.setInputEscrow(address(inputEscrow));

        auction = new BatchAuction(
            address(intentRegistry), address(solverRegistry), address(bondManager), address(capacityRegistry)
        );

        capacityRegistry.setReservor(address(auction), true);

        verificationAdapter = new VerificationAdapter(address(intentRegistry));
        settlementManager = new SettlementManager(address(verificationAdapter), address(inputEscrow));

        tokenA = new MockERC20("TokenA", "TKA");
        tokenB = new MockERC20("TokenB", "TKB");

        tokenA.mint(user, 1_000_000);
        vm.prank(user);
        tokenA.approve(address(inputEscrow), type(uint256).max);

        vm.prank(solver);
        solverRegistry.registerSolver("ipfs://solver");

        vm.startPrank(solver);
        solverRegistry.addChainCapability(uint64(block.chainid));
        solverRegistry.addChainCapability(10);
        solverRegistry.addTokenCapability(uint64(block.chainid), address(tokenA));
        solverRegistry.addTokenCapability(10, address(tokenB));
        vm.stopPrank();

        vm.deal(solver, 10 ether);
        vm.prank(solver);
        bondManager.depositBond{value: 5 ether}();

        vm.prank(solver);
        capacityRegistry.declareCapacity(10, address(tokenB), 1_000_000);

        vm.prank(user);
        intentHash = intentRegistry.createAndFundIntent(
            uint64(block.chainid),
            address(tokenA),
            1000,
            10,
            address(tokenB),
            user,
            900,
            uint64(block.timestamp + 3600),
            keccak256("POLICY")
        );
    }

    function test_CommitAndRevealAuction() public {
        bytes32 auctionId = auction.createAuction(intentHash, 100, 100);

        bytes32 salt = keccak256("salt1");
        bytes32 commitmentHash = auction.computeBidCommitmentHash(auctionId, intentHash, solver, 950, 30, 1000, salt);

        vm.prank(solver);
        auction.submitCommitment(auctionId, commitmentHash);

        vm.warp(block.timestamp + 101);
        vm.prank(solver);
        auction.revealBid(auctionId, 950, 30, 1000, salt);

        vm.warp(block.timestamp + 101);
        address winner = auction.finalizeAuction(auctionId);
        assertEq(winner, solver);
    }

    function test_DuplicateCommitmentReverts() public {
        bytes32 auctionId = auction.createAuction(intentHash, 100, 100);

        bytes32 salt = keccak256("salt1");
        bytes32 commitmentHash = auction.computeBidCommitmentHash(auctionId, intentHash, solver, 950, 30, 1000, salt);

        vm.prank(solver);
        auction.submitCommitment(auctionId, commitmentHash);

        vm.prank(solver);
        vm.expectRevert(Errors.CommitmentAlreadySubmitted.selector);
        auction.submitCommitment(auctionId, commitmentHash);
    }

    function test_InvalidRevealReverts() public {
        bytes32 auctionId = auction.createAuction(intentHash, 100, 100);

        bytes32 salt = keccak256("salt1");
        bytes32 commitmentHash = auction.computeBidCommitmentHash(auctionId, intentHash, solver, 950, 30, 1000, salt);

        vm.prank(solver);
        auction.submitCommitment(auctionId, commitmentHash);

        vm.warp(block.timestamp + 101);
        vm.prank(solver);
        vm.expectRevert(Errors.CommitmentMismatch.selector);
        auction.revealBid(auctionId, 900, 30, 1000, salt);
    }

    function test_RevealAfterCloseReverts() public {
        bytes32 auctionId = auction.createAuction(intentHash, 100, 100);

        bytes32 salt = keccak256("salt1");
        bytes32 commitmentHash = auction.computeBidCommitmentHash(auctionId, intentHash, solver, 950, 30, 1000, salt);

        vm.prank(solver);
        auction.submitCommitment(auctionId, commitmentHash);

        vm.warp(block.timestamp + 250);
        vm.prank(solver);
        vm.expectRevert(Errors.AuctionNotInRevealState.selector);
        auction.revealBid(auctionId, 950, 30, 1000, salt);
    }

    function test_SettlementRequiresVerification() public {
        vm.expectRevert(Errors.VerificationRequired.selector);
        settlementManager.authorizeSettlement(intentHash, solver);
    }

    function test_DoubleSettlementReverts() public {
        bytes32 proofHash = keccak256("proof1");
        ProtocolTypes.VerificationProof memory proof = ProtocolTypes.VerificationProof({
            proofHash: proofHash,
            intentHash: intentHash,
            destinationChainId: 10,
            destinationToken: address(tokenB),
            recipient: user,
            deliveredAmount: 950,
            blockTimestamp: uint64(block.timestamp),
            proofData: ""
        });

        verificationAdapter.verifyProof(intentHash, proof);

        settlementManager.authorizeSettlement(intentHash, solver);

        vm.expectRevert(Errors.AlreadySettled.selector);
        settlementManager.authorizeSettlement(intentHash, solver);
    }
}
