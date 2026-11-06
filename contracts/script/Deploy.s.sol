// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {HypeflowEscrow} from "../src/HypeflowEscrow.sol";

/// forge script script/Deploy.s.sol --rpc-url elysium_testnet --broadcast --private-key $PRIVATE_KEY
contract Deploy is Script {
    function run() external returns (HypeflowEscrow escrow) {
        vm.startBroadcast();
        escrow = new HypeflowEscrow();
        vm.stopBroadcast();
        console2.log("chainId", block.chainid);
        console2.log("HypeflowEscrow", address(escrow));
    }
}
