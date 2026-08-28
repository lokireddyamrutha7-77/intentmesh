// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/InputEscrow.sol";
import "../src/IntentRegistry.sol";
import "../src/libraries/Errors.sol";
import "../src/types/ProtocolTypes.sol";
import "./MockERC20.sol";

contract IntentCreationAndEscrowTest is Test {
    IntentRegistry public registry;
    InputEscrow public escrow;
    MockERC20 public sourceToken;
    MockERC20 public destToken;

    address public user = address(0x1111);
    address public user2 = address(0x2222);
    address public recipient = address(0x3333);
    address public solver = address(0x4444);
    address public attacker = address(0x9999);

    uint64 public sourceChainId;
    uint64 public destinationChainId = 10;
    bytes32 public defaultPolicy = keccak256("DEFAULT_POLICY");

    function setUp() public {
        sourceChainId = uint64(block.chainid);

        registry = new IntentRegistry();
        escrow = new InputEscrow();

        registry.setInputEscrow(address(escrow));
        escrow.setIntentRegistry(address(registry));

        sourceToken = new MockERC20("Source", "SRC");
        destToken = new MockERC20("Destination", "DST");

        sourceToken.mint(user, 1_000_000 * 10 ** 18);
        sourceToken.mint(user2, 1_000_000 * 10 ** 18);

        vm.prank(user);
        sourceToken.approve(address(escrow), type(uint256).max);

        vm.prank(user2);
        sourceToken.approve(address(escrow), type(uint256).max);
    }

    // ==========================================
    // A. VALID INTENT & CREATION FLOW
    // ==========================================

    function test_ValidIntentCreationAndEscrow() public {
        uint256 sourceAmount = 1000 * 10 ** 18;
        uint256 minOutputAmount = 950 * 10 ** 18;
        uint64 deadline = uint64(block.timestamp + 3600);

        uint256 userBalBefore = sourceToken.balanceOf(user);
        uint256 escrowBalBefore = sourceToken.balanceOf(address(escrow));

        vm.prank(user);
        bytes32 hash = registry.createAndFundIntent(
            sourceChainId,
            address(sourceToken),
            sourceAmount,
            destinationChainId,
            address(destToken),
            recipient,
            minOutputAmount,
            deadline,
            defaultPolicy
        );

        assertTrue(hash != bytes32(0));

        // State must be AUCTION_READY
        assertEq(uint256(registry.getIntentState(hash)), uint256(ProtocolTypes.IntentState.AUCTION_READY));

        // Escrow accounting checks
        assertEq(escrow.getEscrowAmount(hash), sourceAmount);
        assertEq(escrow.getEscrowToken(hash), address(sourceToken));
        assertEq(sourceToken.balanceOf(user), userBalBefore - sourceAmount);
        assertEq(sourceToken.balanceOf(address(escrow)), escrowBalBefore + sourceAmount);

        // Retrieve stored intent and verify fields
        ProtocolTypes.Intent memory intent = registry.getIntent(hash);
        assertEq(intent.user, user);
        assertEq(intent.sourceChainId, sourceChainId);
        assertEq(intent.sourceToken, address(sourceToken));
        assertEq(intent.sourceAmount, sourceAmount);
        assertEq(intent.destinationChainId, destinationChainId);
        assertEq(intent.destinationToken, address(destToken));
        assertEq(intent.recipient, recipient);
        assertEq(intent.minOutputAmount, minOutputAmount);
        assertEq(intent.deadline, deadline);
        assertEq(intent.nonce, 0);
        assertEq(intent.verificationPolicy, defaultPolicy);
    }

    // ==========================================
    // B. INVALID INTENT VALIDATIONS
    // ==========================================

    function test_RevertInvalidSourceToken() public {
        vm.prank(user);
        vm.expectRevert(Errors.InvalidSourceToken.selector);
        registry.createAndFundIntent(
            sourceChainId,
            address(0),
            1000,
            destinationChainId,
            address(destToken),
            recipient,
            900,
            uint64(block.timestamp + 3600),
            defaultPolicy
        );
    }

    function test_RevertInvalidDestinationToken() public {
        vm.prank(user);
        vm.expectRevert(Errors.InvalidDestinationToken.selector);
        registry.createAndFundIntent(
            sourceChainId,
            address(sourceToken),
            1000,
            destinationChainId,
            address(0),
            recipient,
            900,
            uint64(block.timestamp + 3600),
            defaultPolicy
        );
    }

    function test_RevertInvalidRecipient() public {
        vm.prank(user);
        vm.expectRevert(Errors.InvalidRecipient.selector);
        registry.createAndFundIntent(
            sourceChainId,
            address(sourceToken),
            1000,
            destinationChainId,
            address(destToken),
            address(0),
            900,
            uint64(block.timestamp + 3600),
            defaultPolicy
        );
    }

    function test_RevertZeroSourceAmount() public {
        vm.prank(user);
        vm.expectRevert(Errors.InvalidAmount.selector);
        registry.createAndFundIntent(
            sourceChainId,
            address(sourceToken),
            0,
            destinationChainId,
            address(destToken),
            recipient,
            900,
            uint64(block.timestamp + 3600),
            defaultPolicy
        );
    }

    function test_RevertZeroMinOutputAmount() public {
        vm.prank(user);
        vm.expectRevert(Errors.InvalidMinimumOutput.selector);
        registry.createAndFundIntent(
            sourceChainId,
            address(sourceToken),
            1000,
            destinationChainId,
            address(destToken),
            recipient,
            0,
            uint64(block.timestamp + 3600),
            defaultPolicy
        );
    }

    function test_RevertExpiredDeadline() public {
        vm.prank(user);
        vm.expectRevert(Errors.InvalidDeadline.selector);
        registry.createAndFundIntent(
            sourceChainId,
            address(sourceToken),
            1000,
            destinationChainId,
            address(destToken),
            recipient,
            900,
            uint64(block.timestamp - 1),
            defaultPolicy
        );
    }

    function test_RevertInvalidChainId() public {
        vm.prank(user);
        vm.expectRevert(Errors.InvalidChain.selector);
        registry.createAndFundIntent(
            99999, // Wrong source chain ID
            address(sourceToken),
            1000,
            destinationChainId,
            address(destToken),
            recipient,
            900,
            uint64(block.timestamp + 3600),
            defaultPolicy
        );
    }

    function test_RevertInvalidVerificationPolicy() public {
        vm.prank(user);
        vm.expectRevert(Errors.InvalidVerificationPolicy.selector);
        registry.createAndFundIntent(
            sourceChainId,
            address(sourceToken),
            1000,
            destinationChainId,
            address(destToken),
            recipient,
            900,
            uint64(block.timestamp + 3600),
            bytes32(0)
        );
    }

    // ==========================================
    // C. NONCE MANAGEMENT
    // ==========================================

    function test_NonceIncrementalAndIndependent() public {
        assertEq(registry.getUserNonce(user), 0);
        assertEq(registry.getUserNonce(user2), 0);

        vm.prank(user);
        registry.createAndFundIntent(
            sourceChainId,
            address(sourceToken),
            1000,
            destinationChainId,
            address(destToken),
            recipient,
            900,
            uint64(block.timestamp + 3600),
            defaultPolicy
        );

        assertEq(registry.getUserNonce(user), 1);
        assertEq(registry.getUserNonce(user2), 0); // user2 nonce unaffected

        vm.prank(user2);
        registry.createAndFundIntent(
            sourceChainId,
            address(sourceToken),
            500,
            destinationChainId,
            address(destToken),
            recipient,
            400,
            uint64(block.timestamp + 3600),
            defaultPolicy
        );

        assertEq(registry.getUserNonce(user2), 1);
    }

    // ==========================================
    // D. INTENT HASH INTEGRITY (11 FIELDS BINDING)
    // ==========================================

    function test_HashIntegrityFieldBinding() public view {
        address u = address(0x1111);
        uint64 sc = 1;
        address st = address(0x2222);
        uint256 sa = 1000;
        uint64 dc = 10;
        address dt = address(0x3333);
        address r = address(0x4444);
        uint256 mo = 900;
        uint64 dl = 3600;
        uint256 n = 0;
        bytes32 vp = keccak256("P");

        bytes32 baseHash = registry.computeIntentHash(u, sc, st, sa, dc, dt, r, mo, dl, n, vp);

        assertTrue(baseHash != registry.computeIntentHash(address(0x9999), sc, st, sa, dc, dt, r, mo, dl, n, vp)); // user
        assertTrue(baseHash != registry.computeIntentHash(u, 2, st, sa, dc, dt, r, mo, dl, n, vp)); // sourceChainId
        assertTrue(baseHash != registry.computeIntentHash(u, sc, address(0x9999), sa, dc, dt, r, mo, dl, n, vp)); // sourceToken
        assertTrue(baseHash != registry.computeIntentHash(u, sc, st, 2000, dc, dt, r, mo, dl, n, vp)); // sourceAmount
        assertTrue(baseHash != registry.computeIntentHash(u, sc, st, sa, 20, dt, r, mo, dl, n, vp)); // destinationChainId
        assertTrue(baseHash != registry.computeIntentHash(u, sc, st, sa, dc, address(0x9999), r, mo, dl, n, vp)); // destinationToken
        assertTrue(baseHash != registry.computeIntentHash(u, sc, st, sa, dc, dt, address(0x9999), mo, dl, n, vp)); // recipient
        assertTrue(baseHash != registry.computeIntentHash(u, sc, st, sa, dc, dt, r, 950, dl, n, vp)); // minOutputAmount
        assertTrue(baseHash != registry.computeIntentHash(u, sc, st, sa, dc, dt, r, mo, 7200, n, vp)); // deadline
        assertTrue(baseHash != registry.computeIntentHash(u, sc, st, sa, dc, dt, r, mo, dl, 1, vp)); // nonce
        assertTrue(
            baseHash != registry.computeIntentHash(u, sc, st, sa, dc, dt, r, mo, dl, n, keccak256("OTHER_POLICY"))
        ); // verificationPolicy
    }

    // ==========================================
    // E. ESCROW ACCOUNTING & ACCESS CONTROL
    // ==========================================

    function test_RevertInsufficientUserBalance() public {
        address poorUser = address(0x7777);
        vm.prank(poorUser);
        sourceToken.approve(address(escrow), type(uint256).max);

        vm.prank(poorUser);
        vm.expectRevert(); // ERC20InsufficientBalance
        registry.createAndFundIntent(
            sourceChainId,
            address(sourceToken),
            1000,
            destinationChainId,
            address(destToken),
            recipient,
            900,
            uint64(block.timestamp + 3600),
            defaultPolicy
        );
    }

    function test_RevertInsufficientUserAllowance() public {
        address unapprovedUser = address(0x8888);
        sourceToken.mint(unapprovedUser, 10000);

        vm.prank(unapprovedUser);
        vm.expectRevert(); // ERC20InsufficientAllowance
        registry.createAndFundIntent(
            sourceChainId,
            address(sourceToken),
            1000,
            destinationChainId,
            address(destToken),
            recipient,
            900,
            uint64(block.timestamp + 3600),
            defaultPolicy
        );
    }

    function test_RevertArbitraryEscrowWithdrawal() public {
        uint256 sourceAmount = 1000;
        vm.prank(user);
        bytes32 hash = registry.createAndFundIntent(
            sourceChainId,
            address(sourceToken),
            sourceAmount,
            destinationChainId,
            address(destToken),
            recipient,
            900,
            uint64(block.timestamp + 3600),
            defaultPolicy
        );

        vm.prank(attacker);
        vm.expectRevert(Errors.Unauthorized.selector);
        escrow.releaseFunds(hash, attacker);

        vm.prank(solver);
        vm.expectRevert(Errors.Unauthorized.selector);
        escrow.releaseFunds(hash, solver);
    }

    // ==========================================
    // F. FUZZ TESTS & INVARIANTS
    // ==========================================

    function testFuzz_CreateAndFundIntent(uint96 amount, uint96 minOut, uint32 deadlineOffset) public {
        vm.assume(amount > 0);
        vm.assume(minOut > 0);
        vm.assume(deadlineOffset > 100);

        // Ensure user has enough token balance for fuzzed amount
        sourceToken.mint(user, uint256(amount));

        uint64 deadline = uint64(block.timestamp) + deadlineOffset;

        vm.prank(user);
        bytes32 hash = registry.createAndFundIntent(
            sourceChainId,
            address(sourceToken),
            amount,
            destinationChainId,
            address(destToken),
            recipient,
            minOut,
            deadline,
            defaultPolicy
        );

        // INVARIANT-004: Escrowed amount equals source amount
        assertEq(escrow.getEscrowAmount(hash), amount);

        // INVARIANT-005: State is AUCTION_READY only after successful escrow
        assertEq(uint256(registry.getIntentState(hash)), uint256(ProtocolTypes.IntentState.AUCTION_READY));
    }
}
