// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SolverRegistry.sol";
import "../src/BatchAuction.sol";
import "../src/IntentRegistry.sol";
import "../src/VerificationAdapter.sol";
import "../src/InputEscrow.sol";
import "../src/SettlementManager.sol";
import "../src/libraries/Errors.sol";

contract AuctionAndSettlementTest is Test {
    SolverRegistry public solverRegistry;
    BatchAuction public auction;
    IntentRegistry public intentRegistry;
    VerificationAdapter public verificationAdapter;
    InputEscrow public inputEscrow;
    SettlementManager public settlementManager;

    address public solver = address(0x2222);
    address public user = address(0x1111);
    address public tokenA = address(0x3333);
    address public tokenB = address(0x4444);
    bytes32 public intentHash;

    function setUp() public {
        solverRegistry = new SolverRegistry();
        auction = new BatchAuction(address(solverRegistry));
        intentRegistry = new IntentRegistry();
        verificationAdapter = new VerificationAdapter(address(intentRegistry));
        inputEscrow = new InputEscrow();
        settlementManager = new SettlementManager(address(verificationAdapter), address(inputEscrow));

        vm.prank(solver);
        solverRegistry.registerSolver("ipfs://solver");

        vm.prank(user);
        intentHash = intentRegistry.registerIntent(tokenA, 1000, 10, tokenB, user, 900, uint64(block.timestamp + 3600));
    }

    function test_CommitAndRevealAuction() public {
        uint64 commitDeadline = uint64(block.timestamp + 100);
        uint64 revealDeadline = uint64(block.timestamp + 200);
        uint64 execDeadline = uint64(block.timestamp + 500);

        auction.createAuction(intentHash, commitDeadline, revealDeadline);

        bytes32 nonce = keccak256("nonce1");
        bytes32 commitmentHash = keccak256(abi.encode(solver, uint256(950), execDeadline, uint256(10), nonce));

        vm.prank(solver);
        auction.commitBid(intentHash, commitmentHash);

        vm.warp(block.timestamp + 150);
        vm.prank(solver);
        auction.revealBid(intentHash, 950, execDeadline, 10, nonce);

        auction.finalizeAuction(intentHash, solver);
        assertEq(auction.getWinningSolver(intentHash), solver);
    }

    function test_DuplicateCommitmentReverts() public {
        uint64 commitDeadline = uint64(block.timestamp + 100);
        uint64 revealDeadline = uint64(block.timestamp + 200);

        auction.createAuction(intentHash, commitDeadline, revealDeadline);

        bytes32 nonce = keccak256("nonce1");
        bytes32 commitmentHash = keccak256(abi.encode(solver, uint256(950), uint64(1000), uint256(10), nonce));

        vm.prank(solver);
        auction.commitBid(intentHash, commitmentHash);

        vm.prank(solver);
        vm.expectRevert(Errors.BidAlreadyCommitted.selector);
        auction.commitBid(intentHash, commitmentHash);
    }

    function test_InvalidRevealReverts() public {
        uint64 commitDeadline = uint64(block.timestamp + 100);
        uint64 revealDeadline = uint64(block.timestamp + 200);
        uint64 execDeadline = uint64(block.timestamp + 500);

        auction.createAuction(intentHash, commitDeadline, revealDeadline);

        bytes32 nonce = keccak256("nonce1");
        bytes32 commitmentHash = keccak256(abi.encode(solver, uint256(950), execDeadline, uint256(10), nonce));

        vm.prank(solver);
        auction.commitBid(intentHash, commitmentHash);

        vm.warp(block.timestamp + 150);
        vm.prank(solver);
        vm.expectRevert(Errors.InvalidReveal.selector);
        auction.revealBid(intentHash, 900, execDeadline, 10, nonce); // Wrong amount (900 != 950)
    }

    function test_RevealAfterCloseReverts() public {
        uint64 commitDeadline = uint64(block.timestamp + 100);
        uint64 revealDeadline = uint64(block.timestamp + 200);
        uint64 execDeadline = uint64(block.timestamp + 500);

        auction.createAuction(intentHash, commitDeadline, revealDeadline);

        bytes32 nonce = keccak256("nonce1");
        bytes32 commitmentHash = keccak256(abi.encode(solver, uint256(950), execDeadline, uint256(10), nonce));

        vm.prank(solver);
        auction.commitBid(intentHash, commitmentHash);

        vm.warp(block.timestamp + 250); // After reveal deadline
        vm.prank(solver);
        vm.expectRevert(Errors.RevealWindowClosed.selector);
        auction.revealBid(intentHash, 950, execDeadline, 10, nonce);
    }

    function test_SettlementRequiresVerification() public {
        vm.expectRevert(Errors.VerificationRequired.selector);
        settlementManager.authorizeSettlement(intentHash, solver);
    }

    function test_DoubleSettlementReverts() public {
        // Register proof to make verification valid
        bytes32 proofHash = keccak256("proof1");
        ProtocolTypes.VerificationProof memory proof = ProtocolTypes.VerificationProof({
            proofHash: proofHash,
            intentHash: intentHash,
            destinationChainId: 10,
            destinationToken: tokenB,
            recipient: user,
            deliveredAmount: 950,
            blockTimestamp: uint64(block.timestamp),
            proofData: ""
        });

        verificationAdapter.verifyProof(intentHash, proof);

        // First settlement authorization passes
        settlementManager.authorizeSettlement(intentHash, solver);

        // Second settlement authorization must revert with AlreadySettled()
        vm.expectRevert(Errors.AlreadySettled.selector);
        settlementManager.authorizeSettlement(intentHash, solver);
    }
}
