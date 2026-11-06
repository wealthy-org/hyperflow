"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import type { Abi, ContractFunctionArgs, ContractFunctionName, Hash, TransactionReceipt, Address } from "viem";
import { getDeployment, DEFAULT_CHAIN_ID } from "@/lib/config";
import { humanError } from "@/lib/escrow";

/** The deployment for the wallet's chain if supported, otherwise the default one. */
export function useActiveDeployment() {
  const { isConnected, chainId: walletChain } = useAccount();
  const configChain = useChainId();
  const wanted = isConnected ? walletChain : configChain;
  const dep = getDeployment(wanted) ?? getDeployment(DEFAULT_CHAIN_ID);
  const wrongChain = isConnected && !getDeployment(walletChain);
  const client = usePublicClient({ chainId: dep?.chain.id });
  return { dep, client, wrongChain };
}

/**
 * Current time in seconds, ticking every second. When a chainId is given, it follows the chain's
 * latest block timestamp (re-synced every 30s), because unlocks are decided by block.timestamp,
 * not by the viewer's clock.
 */
export function useNow(chainId?: number, interval = 1000) {
  const client = usePublicClient({ chainId });
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    if (!chainId || !client) return;
    let stop = false;
    const sync = () =>
      client.getBlock().then((b) => { if (!stop) setOffset(Number(b.timestamp) - Math.floor(Date.now() / 1000)); }).catch(() => {});
    sync();
    const id = setInterval(sync, 30_000);
    return () => { stop = true; clearInterval(id); };
  }, [chainId, client]);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000) + offset);
    tick();
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval, offset]);
  return now;
}

export type TxState =
  | { s: "idle" }
  | { s: "wallet" } // waiting for signature
  | { s: "pending"; hash: Hash }
  | { s: "success"; hash: Hash; receipt: TransactionReceipt }
  | { s: "error"; message: string; hash?: Hash };

/** writeContract + wait for receipt, with human-readable states and errors. */
export function useTx(chainId?: number) {
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId });
  const [state, setState] = useState<TxState>({ s: "idle" });

  const send = useCallback(
    async <const abi extends Abi, fn extends ContractFunctionName<abi, "nonpayable" | "payable">>(req: {
      address: Address;
      abi: abi;
      functionName: fn;
      args: ContractFunctionArgs<abi, "nonpayable" | "payable", fn>;
    }) => {
      if (!client) return null;
      setState({ s: "wallet" });
      let hash: Hash | undefined;
      try {
        // Gas estimation runs before the wallet prompt, so contract reverts surface with their error name.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hash = await writeContractAsync({ ...(req as any), chainId });
        setState({ s: "pending", hash: hash! });
        const receipt = await client.waitForTransactionReceipt({ hash: hash! });
        if (receipt.status !== "success") {
          setState({ s: "error", message: "The transaction reverted onchain.", hash });
          return null;
        }
        setState({ s: "success", hash: hash!, receipt });
        return receipt;
      } catch (e) {
        setState({ s: "error", message: humanError(e), hash });
        return null;
      }
    },
    [client, writeContractAsync, chainId],
  );

  return { state, send, reset: () => setState({ s: "idle" }) };
}
