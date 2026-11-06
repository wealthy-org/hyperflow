// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title HypeflowEscrow
/// @notice Token locks and linear vesting on Elysium. No admin, no fee, no pause, not upgradeable.
/// @dev Supports standard ERC-20s whose balances and transfer amounts are fixed. Fee-on-transfer
/// tokens are rejected at deposit. Rebasing tokens are NOT supported: the escrow books a fixed
/// amount per position, so a negative rebase can leave later claims underfunded. Tokens sent to
/// this contract outside `createLock`/`createVesting` are not attributed to any position.
contract HypeflowEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Mode {
        HardLock,
        Linear
    }

    struct Position {
        address token;
        address creator;
        address beneficiary;
        uint256 total;
        uint256 claimed;
        Mode mode;
        uint64 start;
        uint64 cliff;
        uint64 end;
        // Block numbers let clients find deposit/claim txs with single-block log queries,
        // which works on RPCs that cap eth_getLogs ranges.
        uint64 createdBlock;
        uint64 lastClaimBlock;
    }

    mapping(uint256 => Position) private _positions;
    uint256 public nextId = 1;

    mapping(address => uint256[]) private _byCreator;
    mapping(address => uint256[]) private _byBeneficiary;

    event PositionCreated(
        uint256 indexed id,
        address indexed token,
        address indexed creator,
        address beneficiary,
        Mode mode,
        uint256 total,
        uint64 start,
        uint64 cliff,
        uint64 end
    );
    /// @param prevClaimBlock block of this position's previous claim (0 if none); walk it back to list every claim.
    event Claimed(uint256 indexed id, address indexed beneficiary, uint256 amount, uint256 totalClaimed, uint64 prevClaimBlock);

    error InvalidToken();
    error InvalidBeneficiary();
    error InvalidAmount();
    error InvalidSchedule();
    error DepositMismatch();
    error PositionNotFound();
    error NotBeneficiary();
    error NothingClaimable();

    // ---- Create ----

    /// @notice Lock `amount` of `token` until `unlockTime`; beneficiary can claim everything at or after it.
    function createLock(address token, address beneficiary, uint256 amount, uint64 unlockTime)
        external
        nonReentrant
        returns (uint256 id)
    {
        if (unlockTime <= block.timestamp) revert InvalidSchedule();
        uint64 nowTs = uint64(block.timestamp);
        id = _create(token, beneficiary, amount, Mode.HardLock, nowTs, unlockTime, unlockTime);
    }

    /// @notice Linear vesting from `start` to `end` with cliff. `start == 0` means start now.
    /// No cliff: pass `cliff == start` (or 0, which resolves to start).
    function createVesting(
        address token,
        address beneficiary,
        uint256 amount,
        uint64 start,
        uint64 cliff,
        uint64 end
    ) external nonReentrant returns (uint256 id) {
        uint64 resolvedStart;
        if (start == 0) {
            resolvedStart = uint64(block.timestamp);
        } else {
            if (start <= block.timestamp) revert InvalidSchedule();
            resolvedStart = start;
        }
        uint64 resolvedCliff = cliff == 0 ? resolvedStart : cliff;
        if (resolvedCliff < resolvedStart || resolvedCliff >= end) revert InvalidSchedule();

        id = _create(token, beneficiary, amount, Mode.Linear, resolvedStart, resolvedCliff, end);
    }

    function _create(
        address token,
        address beneficiary,
        uint256 amount,
        Mode mode,
        uint64 start,
        uint64 cliff,
        uint64 end
    ) private returns (uint256 id) {
        if (token == address(0) || token.code.length == 0) revert InvalidToken();
        if (beneficiary == address(0) || beneficiary == address(this)) revert InvalidBeneficiary();
        if (amount == 0) revert InvalidAmount();

        // Effects
        id = nextId++;
        _positions[id] = Position({
            token: token,
            creator: msg.sender,
            beneficiary: beneficiary,
            total: amount,
            claimed: 0,
            mode: mode,
            start: start,
            cliff: cliff,
            end: end,
            createdBlock: uint64(block.number),
            lastClaimBlock: 0
        });
        _byCreator[msg.sender].push(id);
        _byBeneficiary[beneficiary].push(id);

        emit PositionCreated(id, token, msg.sender, beneficiary, mode, amount, start, cliff, end);

        // Interaction: escrow must receive exactly `amount` (rejects fee-on-transfer tokens).
        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        if (IERC20(token).balanceOf(address(this)) - before != amount) revert DepositMismatch();
    }

    // ---- Claim ----

    /// @notice Beneficiary pulls everything currently unlocked. Always paid to the recorded beneficiary.
    function claim(uint256 id) external nonReentrant returns (uint256 amount) {
        Position storage p = _positions[id];
        if (p.beneficiary == address(0)) revert PositionNotFound();
        if (msg.sender != p.beneficiary) revert NotBeneficiary();

        amount = _vested(p) - p.claimed;
        if (amount == 0) revert NothingClaimable();

        p.claimed += amount;
        uint64 prev = p.lastClaimBlock;
        p.lastClaimBlock = uint64(block.number);
        emit Claimed(id, p.beneficiary, amount, p.claimed, prev);

        IERC20(p.token).safeTransfer(p.beneficiary, amount);
    }

    // ---- Views ----

    function claimable(uint256 id) external view returns (uint256) {
        Position storage p = _positions[id];
        if (p.beneficiary == address(0)) return 0;
        return _vested(p) - p.claimed;
    }

    function vested(uint256 id) external view returns (uint256) {
        Position storage p = _positions[id];
        if (p.beneficiary == address(0)) return 0;
        return _vested(p);
    }

    function getPosition(uint256 id) external view returns (Position memory) {
        return _positions[id];
    }

    function positionsByCreator(address account) external view returns (uint256[] memory) {
        return _byCreator[account];
    }

    function positionsByBeneficiary(address account) external view returns (uint256[] memory) {
        return _byBeneficiary[account];
    }

    /// @dev Must match the frontend formula exactly.
    function _vested(Position storage p) private view returns (uint256) {
        uint256 t = block.timestamp;
        if (t >= p.end) return p.total;
        if (p.mode == Mode.HardLock) return 0;
        if (t < p.cliff) return 0; // cliff >= start, so this also covers t < start
        return Math.mulDiv(p.total, t - p.start, p.end - p.start);
    }
}
