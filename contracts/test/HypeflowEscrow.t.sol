// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HypeflowEscrow} from "../src/HypeflowEscrow.sol";
import {MockToken, FeeOnTransferToken, ToggleFailToken} from "./mocks/Mocks.sol";

contract HypeflowEscrowTest is Test {
    HypeflowEscrow escrow;
    MockToken token;

    address creator = makeAddr("creator");
    address bene = makeAddr("bene");
    address stranger = makeAddr("stranger");

    uint256 constant AMT = 1_000_000e18;
    uint64 T0 = 1_800_000_000;

    function setUp() public {
        vm.warp(T0);
        escrow = new HypeflowEscrow();
        token = new MockToken("Test", "TST", 18);
        token.mint(creator, 10 * AMT);
        vm.prank(creator);
        token.approve(address(escrow), type(uint256).max);
    }

    function _lock(uint64 unlock) internal returns (uint256) {
        vm.prank(creator);
        return escrow.createLock(address(token), bene, AMT, unlock);
    }

    function _vest(uint256 amt, uint64 start, uint64 cliff, uint64 end) internal returns (uint256) {
        vm.prank(creator);
        return escrow.createVesting(address(token), bene, amt, start, cliff, end);
    }

    // ---------------- Hard lock ----------------

    function test_lock_storesPositionAndEscrowsTokens() public {
        uint256 id = _lock(T0 + 1 days);
        HypeflowEscrow.Position memory p = escrow.getPosition(id);
        assertEq(id, 1);
        assertEq(p.token, address(token));
        assertEq(p.creator, creator);
        assertEq(p.beneficiary, bene);
        assertEq(p.total, AMT);
        assertEq(p.end, T0 + 1 days);
        assertEq(uint8(p.mode), uint8(HypeflowEscrow.Mode.HardLock));
        assertEq(token.balanceOf(address(escrow)), AMT);
    }

    function test_lock_rejectsClaimBeforeUnlock() public {
        uint256 id = _lock(T0 + 1 days);
        vm.warp(T0 + 1 days - 1);
        assertEq(escrow.claimable(id), 0);
        vm.prank(bene);
        vm.expectRevert(HypeflowEscrow.NothingClaimable.selector);
        escrow.claim(id);
    }

    function test_lock_claimExactlyAtUnlock() public {
        uint256 id = _lock(T0 + 1 days);
        vm.warp(T0 + 1 days);
        assertEq(escrow.claimable(id), AMT);
        vm.prank(bene);
        escrow.claim(id);
        assertEq(token.balanceOf(bene), AMT);
        assertEq(escrow.getPosition(id).claimed, AMT);
        vm.prank(bene);
        vm.expectRevert(HypeflowEscrow.NothingClaimable.selector);
        escrow.claim(id);
    }

    function test_lock_rejectsPastOrNowUnlock() public {
        vm.startPrank(creator);
        vm.expectRevert(HypeflowEscrow.InvalidSchedule.selector);
        escrow.createLock(address(token), bene, AMT, T0);
        vm.expectRevert(HypeflowEscrow.InvalidSchedule.selector);
        escrow.createLock(address(token), bene, AMT, T0 - 1);
        vm.stopPrank();
    }

    // ---------------- Access ----------------

    function test_strangerAndCreatorCannotClaim() public {
        uint256 id = _lock(T0 + 1);
        vm.warp(T0 + 10);
        vm.prank(stranger);
        vm.expectRevert(HypeflowEscrow.NotBeneficiary.selector);
        escrow.claim(id);
        vm.prank(creator);
        vm.expectRevert(HypeflowEscrow.NotBeneficiary.selector);
        escrow.claim(id);
    }

    function test_unknownPosition() public {
        vm.prank(bene);
        vm.expectRevert(HypeflowEscrow.PositionNotFound.selector);
        escrow.claim(42);
        assertEq(escrow.claimable(42), 0);
    }

    // ---------------- Input validation ----------------

    function test_rejectsBadInputs() public {
        vm.startPrank(creator);
        vm.expectRevert(HypeflowEscrow.InvalidAmount.selector);
        escrow.createLock(address(token), bene, 0, T0 + 1);
        vm.expectRevert(HypeflowEscrow.InvalidBeneficiary.selector);
        escrow.createLock(address(token), address(0), AMT, T0 + 1);
        vm.expectRevert(HypeflowEscrow.InvalidBeneficiary.selector);
        escrow.createLock(address(token), address(escrow), AMT, T0 + 1);
        vm.expectRevert(HypeflowEscrow.InvalidToken.selector);
        escrow.createLock(address(0), bene, AMT, T0 + 1);
        vm.expectRevert(HypeflowEscrow.InvalidToken.selector);
        escrow.createLock(stranger, bene, AMT, T0 + 1); // EOA
        vm.stopPrank();
    }

    function test_rejectsInsufficientBalanceOrAllowance() public {
        address poor = makeAddr("poor");
        token.mint(poor, AMT - 1);
        vm.startPrank(poor);
        token.approve(address(escrow), type(uint256).max);
        vm.expectRevert();
        escrow.createLock(address(token), bene, AMT, T0 + 1);
        vm.stopPrank();

        address noApproval = makeAddr("noApproval");
        token.mint(noApproval, AMT);
        vm.prank(noApproval);
        vm.expectRevert();
        escrow.createLock(address(token), bene, AMT, T0 + 1);
        assertEq(escrow.nextId(), 1);
    }

    function test_rejectsFeeOnTransfer() public {
        FeeOnTransferToken fot = new FeeOnTransferToken();
        fot.mint(creator, AMT);
        vm.startPrank(creator);
        fot.approve(address(escrow), AMT);
        vm.expectRevert(HypeflowEscrow.DepositMismatch.selector);
        escrow.createLock(address(fot), bene, AMT, T0 + 1);
        vm.stopPrank();
        assertEq(escrow.nextId(), 1);
    }

    function test_vesting_rejectsBadSchedules() public {
        vm.startPrank(creator);
        // end <= start
        vm.expectRevert(HypeflowEscrow.InvalidSchedule.selector);
        escrow.createVesting(address(token), bene, AMT, 0, 0, T0);
        // scheduled start not in future
        vm.expectRevert(HypeflowEscrow.InvalidSchedule.selector);
        escrow.createVesting(address(token), bene, AMT, T0, T0, T0 + 100);
        // cliff before start
        vm.expectRevert(HypeflowEscrow.InvalidSchedule.selector);
        escrow.createVesting(address(token), bene, AMT, T0 + 10, T0 + 5, T0 + 100);
        // cliff == end
        vm.expectRevert(HypeflowEscrow.InvalidSchedule.selector);
        escrow.createVesting(address(token), bene, AMT, 0, T0 + 100, T0 + 100);
        vm.stopPrank();
    }

    // ---------------- Linear vesting ----------------

    function test_vesting_cliffCheckpoints() public {
        // start now, cliff +25, end +100
        uint256 id = _vest(AMT, 0, T0 + 25, T0 + 100);

        vm.warp(T0 + 24); // before cliff
        assertEq(escrow.claimable(id), 0);
        vm.prank(bene);
        vm.expectRevert(HypeflowEscrow.NothingClaimable.selector);
        escrow.claim(id);

        vm.warp(T0 + 25); // exactly at cliff -> accrued 25% available
        assertEq(escrow.claimable(id), AMT / 4);

        vm.warp(T0 + 50); // middle
        assertEq(escrow.claimable(id), AMT / 2);
        vm.prank(bene);
        escrow.claim(id);
        assertEq(token.balanceOf(bene), AMT / 2);

        vm.warp(T0 + 100); // exactly at end
        assertEq(escrow.claimable(id), AMT / 2);
        vm.prank(bene);
        escrow.claim(id);
        assertEq(token.balanceOf(bene), AMT);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function test_vesting_scheduledStart() public {
        uint256 id = _vest(AMT, T0 + 100, 0, T0 + 200);
        HypeflowEscrow.Position memory p = escrow.getPosition(id);
        assertEq(p.start, T0 + 100);
        assertEq(p.cliff, T0 + 100);
        vm.warp(T0 + 99);
        assertEq(escrow.claimable(id), 0);
        vm.warp(T0 + 150);
        assertEq(escrow.claimable(id), AMT / 2);
    }

    function test_vesting_roundingDustFullyClaimed() public {
        uint256 amt = 1000; // 1000 over 7s -> non-integer steps
        uint256 id = _vest(amt, 0, 0, T0 + 7);
        for (uint64 i = 1; i <= 7; i++) {
            vm.warp(T0 + i);
            vm.prank(bene);
            escrow.claim(id);
        }
        assertEq(token.balanceOf(bene), amt);
        assertEq(escrow.getPosition(id).claimed, amt);
    }

    // ---------------- Indexes & events ----------------

    function test_indexesByCreatorAndBeneficiary() public {
        _lock(T0 + 1);
        _vest(AMT, 0, 0, T0 + 10);
        assertEq(escrow.positionsByCreator(creator).length, 2);
        assertEq(escrow.positionsByBeneficiary(bene).length, 2);
        assertEq(escrow.positionsByBeneficiary(creator).length, 0);
    }

    function test_emitsCreatedAndClaimed() public {
        vm.expectEmit(true, true, true, true);
        emit HypeflowEscrow.PositionCreated(
            1, address(token), creator, bene, HypeflowEscrow.Mode.HardLock, AMT, T0, T0 + 5, T0 + 5
        );
        uint256 id = _lock(T0 + 5);
        vm.warp(T0 + 5);
        vm.expectEmit(true, true, false, true);
        emit HypeflowEscrow.Claimed(id, bene, AMT, AMT, 0);
        vm.prank(bene);
        escrow.claim(id);
    }

    function test_blockLinksForTxDiscovery() public {
        vm.roll(100);
        uint256 id = _vest(AMT, 0, 0, T0 + 100);
        assertEq(escrow.getPosition(id).createdBlock, 100);
        assertEq(escrow.getPosition(id).lastClaimBlock, 0);

        vm.roll(150); vm.warp(T0 + 10);
        vm.expectEmit(true, true, false, true);
        emit HypeflowEscrow.Claimed(id, bene, AMT / 10, AMT / 10, 0);
        vm.prank(bene); escrow.claim(id);
        assertEq(escrow.getPosition(id).lastClaimBlock, 150);

        vm.roll(220); vm.warp(T0 + 20);
        vm.expectEmit(true, true, false, true);
        emit HypeflowEscrow.Claimed(id, bene, AMT / 10, AMT / 5, 150);
        vm.prank(bene); escrow.claim(id);
        assertEq(escrow.getPosition(id).lastClaimBlock, 220);
    }

    // ---------------- Failure atomicity ----------------

    function test_failedTransferDoesNotChangeClaimed() public {
        ToggleFailToken t = new ToggleFailToken();
        t.mint(creator, AMT);
        vm.startPrank(creator);
        t.approve(address(escrow), AMT);
        uint256 id = escrow.createLock(address(t), bene, AMT, T0 + 1);
        vm.stopPrank();
        vm.warp(T0 + 1);
        t.setFail(true);
        vm.prank(bene);
        vm.expectRevert();
        escrow.claim(id);
        assertEq(escrow.getPosition(id).claimed, 0);
        assertEq(escrow.claimable(id), AMT);
    }

    function test_strayTransfersNotAttributed() public {
        uint256 id = _lock(T0 + 1);
        vm.prank(creator);
        token.transfer(address(escrow), 123);
        vm.warp(T0 + 1);
        assertEq(escrow.claimable(id), AMT);
    }

    // ---------------- Fuzz ----------------

    function testFuzz_vestingNeverExceedsTotal(uint256 amt, uint32 dur, uint32 cliffOff, uint32[5] memory steps)
        public
    {
        amt = bound(amt, 1, AMT);
        dur = uint32(bound(dur, 2, 4 * 365 days));
        cliffOff = uint32(bound(cliffOff, 0, dur - 1));
        uint256 id = _vest(amt, 0, T0 + cliffOff, T0 + dur);

        uint256 t = T0;
        for (uint256 i; i < steps.length; i++) {
            t += bound(steps[i], 0, dur);
            vm.warp(t);
            uint256 c = escrow.claimable(id);
            // reference formula
            uint256 expectedVested =
                t >= T0 + dur ? amt : (t < T0 + cliffOff ? 0 : amt * (t - T0) / dur);
            assertEq(escrow.vested(id), expectedVested);
            if (c > 0) {
                vm.prank(bene);
                escrow.claim(id);
            }
            assertLe(escrow.getPosition(id).claimed, amt);
        }
        vm.warp(T0 + dur);
        if (escrow.claimable(id) > 0) {
            vm.prank(bene);
            escrow.claim(id);
        }
        assertEq(token.balanceOf(bene), amt);
    }
}
