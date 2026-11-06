// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract HypeflowDemoToken is ERC20 {
    constructor(address to) ERC20("Hypeflow Demo", "HFDEMO") {
        _mint(to, 1_000_000_000e18);
    }
}

/// Fallback ERC-20 for the P0 demo if Ascend is not available on testnet.
contract DeployDemoToken is Script {
    function run() external {
        vm.startBroadcast();
        HypeflowDemoToken t = new HypeflowDemoToken(msg.sender);
        vm.stopBroadcast();
        console2.log("HypeflowDemoToken", address(t));
    }
}
