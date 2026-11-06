// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HypeflowEscrow} from "../src/HypeflowEscrow.sol";
import {MockToken} from "./mocks/Mocks.sol";

contract Handler is Test {
    HypeflowEscrow public escrow;
    MockToken public token;
    address[3] public actors;
    uint256[] public ids;

    constructor(HypeflowEscrow e, MockToken t) {
        escrow = e;
        token = t;
        actors = [makeAddr("a0"), makeAddr("a1"), makeAddr("a2")];
        for (uint256 i; i < 3; i++) {
            token.mint(actors[i], 1e40);
            vm.prank(actors[i]);
            token.approve(address(escrow), type(uint256).max);
        }
    }

    function createLock(uint256 a, uint256 b, uint256 amt, uint256 dt) external {
        amt = bound(amt, 1, 1e30);
        dt = bound(dt, 1, 30 days);
        vm.prank(actors[a % 3]);
        ids.push(escrow.createLock(address(token), actors[b % 3], amt, uint64(block.timestamp + dt)));
    }

    function createVesting(uint256 a, uint256 b, uint256 amt, uint256 cliffOff, uint256 dur) external {
        amt = bound(amt, 1, 1e30);
        dur = bound(dur, 2, 30 days);
        cliffOff = bound(cliffOff, 0, dur - 1);
        uint64 s = uint64(block.timestamp);
        vm.prank(actors[a % 3]);
        ids.push(escrow.createVesting(address(token), actors[b % 3], amt, 0, s + uint64(cliffOff), s + uint64(dur)));
    }

    function claim(uint256 i) external {
        if (ids.length == 0) return;
        uint256 id = ids[i % ids.length];
        if (escrow.claimable(id) == 0) return;
        vm.prank(escrow.getPosition(id).beneficiary);
        escrow.claim(id);
    }

    function warp(uint256 dt) external {
        vm.warp(block.timestamp + bound(dt, 0, 10 days));
    }

    function idsLength() external view returns (uint256) {
        return ids.length;
    }
}

contract HypeflowEscrowInvariant is Test {
    HypeflowEscrow escrow;
    MockToken token;
    Handler handler;

    function setUp() public {
        vm.warp(1_800_000_000);
        escrow = new HypeflowEscrow();
        token = new MockToken("T", "T", 18);
        handler = new Handler(escrow, token);
        targetContract(address(handler));
    }

    /// claimed <= total for every position, and escrow balance == sum(total - claimed).
    function invariant_solvencyAndCaps() public view {
        uint256 outstanding;
        uint256 n = handler.idsLength();
        for (uint256 i; i < n; i++) {
            HypeflowEscrow.Position memory p = escrow.getPosition(handler.ids(i));
            assertLe(p.claimed, p.total);
            outstanding += p.total - p.claimed;
        }
        assertEq(token.balanceOf(address(escrow)), outstanding);
    }
}
