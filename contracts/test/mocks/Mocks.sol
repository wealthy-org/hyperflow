// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    uint8 private immutable _dec;

    constructor(string memory n, string memory s, uint8 d) ERC20(n, s) {
        _dec = d;
    }

    function decimals() public view override returns (uint8) {
        return _dec;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Burns 1% on every transfer.
contract FeeOnTransferToken is MockToken {
    constructor() MockToken("Fee", "FEE", 18) {}

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = value / 100;
            super._update(from, address(0), fee);
            value -= fee;
        }
        super._update(from, to, value);
    }
}

/// @dev Transfers out of the escrow can be switched to fail.
contract ToggleFailToken is MockToken {
    bool public failOutgoing;

    constructor() MockToken("Toggle", "TGL", 18) {}

    function setFail(bool f) external {
        failOutgoing = f;
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        if (failOutgoing) revert("transfer disabled");
        return super.transfer(to, value);
    }
}
