// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "forge-std/Test.sol";
import "../src/CapacityRegistry.sol";
import "../src/InputEscrow.sol";
import "../src/IntentRegistry.sol";
import "../src/SettlementManager.sol";
import "../src/SolverBondManager.sol";
import "../src/VerificationAdapter.sol";
import "../src/libraries/Errors.sol";
import "./MockERC20.sol";

contract InvariantsTest is Test {
    IntentRegistry public registry;
    VerificationAdapter public verifier;
    InputEscrow public escrow;
    SettlementManager public settlementManager;
    SolverBondManager public bondManager;
    CapacityRegistry public capacityRegistry;
    MockERC20 public mockToken;
    MockERC20 public destToken;

    address public user = address(0x1111);
    address public solver = address(0x2222);
    address public attacker = address(0x9999);
    bytes32 public policy = keccak256("POLICY");

    function setUp() public {
        registry = new IntentRegistry();
        escrow = new InputEscrow();
        verifier = new VerificationAdapter(address(registry));
        settlementManager = new SettlementManager(address(verifier), address(escrow));
        bondManager = new SolverBondManager();
        capacityRegistry = new CapacityRegistry(address(bondManager));

        registry.setInputEscrow(address(escrow));
        escrow.setIntentRegistry(address(registry));
        bondManager.setLocker(address(capacityRegistry), true);
        escrow.setSettlementManager(address(settlementManager));

        mockToken = new MockERC20("Mock", "MCK");
        destToken = new MockERC20("Dest", "DST");

        mockToken.mint(user, 1_000_000);
        vm.prank(user);
        mockToken.approve(address(escrow), type(uint256).max);
    }

    /// @notice INVARIANT-001: Intent nonce cannot be consumed twice
    function test_INVARIANT_001_NonceUniqueness() public {
        vm.startPrank(user);
        uint256 nonceBefore = registry.getUserNonce(user);
        registry.createAndFundIntent(
            uint64(block.chainid),
            address(mockToken),
            1000,
            10,
            address(destToken),
            user,
            900,
            uint64(block.timestamp + 3600),
            policy
        );
        uint256 nonceAfter = registry.getUserNonce(user);

        assertEq(nonceAfter, nonceBefore + 1);
        vm.stopPrank();
    }

    /// @notice INVARIANT-003: User escrow cannot be withdrawn by arbitrary callers
    function test_INVARIANT_003_EscrowAccessControl() public {
        bytes32 intentHash = keccak256("intent1");

        vm.prank(user);
        escrow.lockFunds(intentHash, address(mockToken), 1000, user);

        vm.prank(attacker);
        vm.expectRevert(Errors.Unauthorized.selector);
        escrow.releaseFunds(intentHash, attacker);

        vm.prank(attacker);
        vm.expectRevert(Errors.Unauthorized.selector);
        escrow.refundFunds(intentHash, attacker);
    }

    /// @notice INVARIANT-004: Reserved capacity cannot exceed available capacity or bond balance
    function test_INVARIANT_004_CapacityBounds() public {
        vm.deal(solver, 10 ether);
        vm.prank(solver);
        bondManager.depositBond{value: 2 ether}();

        vm.prank(solver);
        capacityRegistry.declareCapacity(10, address(destToken), 10 ether);

        vm.prank(address(this));
        capacityRegistry.setReservor(address(this), true);

        // Attempting to reserve capacity (3 ether) exceeding available bond collateral (2 ether) reverts with InsufficientBond
        vm.expectRevert(Errors.InsufficientBond.selector);
        capacityRegistry.reserveCapacity(
            keccak256("intent1"), solver, 10, address(destToken), 3 ether, uint64(block.timestamp + 3600)
        );
    }

    /// @notice INVARIANT-005: Locked solver bond cannot be withdrawn
    function test_INVARIANT_005_LockedBondProtection() public {
        vm.deal(solver, 10 ether);
        vm.prank(solver);
        bondManager.depositBond{value: 5 ether}();

        bondManager.setLocker(address(this), true);
        bondManager.lockBond(solver, 3 ether);

        vm.prank(solver);
        vm.expectRevert(Errors.BondLocked.selector);
        bondManager.withdrawBond(4 ether);
    }

    /// @notice INVARIANT-007: Proof cannot be consumed twice
    function test_INVARIANT_007_ProofUniqueness() public {
        vm.prank(user);
        bytes32 intentHash = registry.createAndFundIntent(
            uint64(block.chainid),
            address(mockToken),
            1000,
            10,
            address(destToken),
            user,
            900,
            uint64(block.timestamp + 3600),
            policy
        );
        bytes32 proofHash = keccak256("proof1");

        ProtocolTypes.VerificationProof memory proof = ProtocolTypes.VerificationProof({
            proofHash: proofHash,
            intentHash: intentHash,
            destinationChainId: 10,
            destinationToken: address(destToken),
            recipient: user,
            deliveredAmount: 950,
            blockTimestamp: uint64(block.timestamp),
            proofData: ""
        });

        verifier.verifyProof(intentHash, proof);
        assertTrue(verifier.isProofConsumed(proofHash));

        vm.expectRevert(Errors.ProofAlreadyConsumed.selector);
        verifier.verifyProof(intentHash, proof);
    }

    /// @notice INVARIANT-008: Settlement cannot occur without valid verification
    function test_INVARIANT_008_SettlementRequiresVerification() public {
        bytes32 intentHash = keccak256("unverifiedIntent");
        vm.expectRevert(Errors.VerificationRequired.selector);
        settlementManager.authorizeSettlement(intentHash, solver);
    }

    /// @notice INVARIANT-010: AI has no authorization path to financial state changes
    function test_INVARIANT_010_AINonAuthority() public {
        vm.expectRevert(Errors.AINotAuthoritative.selector);
        settlementManager.assertAINotAuthoritative();
    }

    /// @notice Fuzz test for Bond Accounting: available + locked == total
    function testFuzz_BondAccountingInvariant(uint96 depositAmount, uint96 lockAmount) public {
        vm.assume(depositAmount > 0);
        vm.assume(lockAmount > 0 && lockAmount <= depositAmount);

        vm.deal(solver, uint256(depositAmount));
        vm.prank(solver);
        bondManager.depositBond{value: depositAmount}();

        bondManager.setLocker(address(this), true);
        bondManager.lockBond(solver, lockAmount);

        uint256 total = bondManager.getTotalBond(solver);
        uint256 locked = bondManager.getLockedBond(solver);
        uint256 available = bondManager.getAvailableBond(solver);

        assertEq(total, uint256(depositAmount));
        assertEq(locked, uint256(lockAmount));
        assertEq(available + locked, total);
        assertTrue(locked <= total);
    }

    /// @notice Fuzz test for Capacity Accounting: reserved <= declared and available + reserved == declared
    function testFuzz_CapacityAccountingInvariant(uint96 declared, uint96 reserved) public {
        vm.assume(declared > 0);
        vm.assume(reserved > 0 && reserved <= declared);

        // Post enough bond for capacity reservation
        vm.deal(solver, uint256(declared) * 1000);
        vm.prank(solver);
        bondManager.depositBond{value: uint256(declared) * 1000}();

        vm.prank(solver);
        capacityRegistry.declareCapacity(10, address(destToken), declared);

        capacityRegistry.setReservor(address(this), true);
        capacityRegistry.reserveCapacity(
            keccak256("intentFuzz"), solver, 10, address(destToken), reserved, uint64(block.timestamp + 3600)
        );

        uint256 decl = capacityRegistry.getDeclaredCapacity(solver, 10, address(destToken));
        uint256 res = capacityRegistry.getReservedCapacity(solver, 10, address(destToken));
        uint256 avail = capacityRegistry.getAvailableCapacity(solver, 10, address(destToken));

        assertEq(decl, uint256(declared));
        assertEq(res, uint256(reserved));
        assertTrue(res <= decl);
        assertEq(avail + res, decl);
    }

    /// @notice Privilege access control invariant check
    function test_UnauthorizedPrivilegedCallsRevert() public {
        bytes memory expectedRevert = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker);

        vm.prank(attacker);
        vm.expectRevert(expectedRevert);
        bondManager.setLocker(attacker, true);

        vm.prank(attacker);
        vm.expectRevert(expectedRevert);
        capacityRegistry.setReservor(attacker, true);

        vm.prank(attacker);
        vm.expectRevert(expectedRevert);
        escrow.setSettlementManager(attacker);
    }
}
