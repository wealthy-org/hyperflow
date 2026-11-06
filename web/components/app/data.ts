"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import type { Address, Hash } from "viem";
import { escrowAbi } from "@/lib/abi";
import { getDeployment } from "@/lib/config";
import { readPosition, readToken, type Position, type TokenMeta } from "@/lib/escrow";

export type Row = Position & { token_: TokenMeta };

/** Positions a wallet can claim and positions it created, read straight from the contract indexes. */
export function usePositions(chainId: number | undefined, account: Address | undefined) {
  const dep = getDeployment(chainId);
  const client = usePublicClient({ chainId });
  return useQuery({
    queryKey: ["positions", chainId, account],
    enabled: !!(dep?.escrow && client && account),
    refetchInterval: 15_000,
    queryFn: async () => {
      const escrow = dep!.escrow!;
      const [mine, created] = await Promise.all([
        client!.readContract({ address: escrow, abi: escrowAbi, functionName: "positionsByBeneficiary", args: [account!] }),
        client!.readContract({ address: escrow, abi: escrowAbi, functionName: "positionsByCreator", args: [account!] }),
      ]);
      const ids = [...new Set([...mine, ...created].map(String))].map(BigInt);
      const rows = (await Promise.all(ids.map((id) => readPosition(client!, escrow, id)))).filter(Boolean) as Position[];
      const withTokens: Row[] = await Promise.all(rows.map(async (p) => ({ ...p, token_: await readToken(client!, p.token) })));
      const byId = new Map(withTokens.map((r) => [String(r.id), r]));
      return {
        claimable: mine.map((id) => byId.get(String(id))!).filter(Boolean),
        created: created.map((id) => byId.get(String(id))!).filter(Boolean),
      };
    },
  });
}

/** One position + token, polled. `null` means not readable (yet). */
export function usePosition(chainId: number, id: bigint | undefined) {
  const dep = getDeployment(chainId);
  const client = usePublicClient({ chainId });
  return useQuery({
    queryKey: ["position", chainId, String(id)],
    enabled: !!(dep?.escrow && client && id !== undefined),
    refetchInterval: 12_000,
    queryFn: async () => {
      const p = await readPosition(client!, dep!.escrow!, id!);
      if (!p) return null;
      return { ...p, token_: await readToken(client!, p.token) } as Row;
    },
  });
}

/**
 * Deposit + claim tx hashes. The contract records the creation block and the last claim block,
 * and each Claimed event links to the previous claim's block, so every lookup is a single-block
 * log query. This works on RPCs that cap eth_getLogs ranges (HyperEVM allows ~1000 blocks).
 */
export function usePositionTxs(chainId: number, pos: Pick<Position, "id" | "createdBlock" | "lastClaimBlock"> | null | undefined) {
  const dep = getDeployment(chainId);
  const client = usePublicClient({ chainId });
  return useQuery({
    queryKey: ["positionTxs", chainId, String(pos?.id), String(pos?.lastClaimBlock)],
    enabled: !!(dep?.escrow && client && pos),
    queryFn: async () => {
      const at = (b: bigint) => ({ address: dep!.escrow!, abi: escrowAbi, args: { id: pos!.id }, fromBlock: b, toBlock: b }) as const;
      const created = await client!.getContractEvents({ ...at(pos!.createdBlock), eventName: "PositionCreated" });
      const claims: { hash: Hash; amount: bigint }[] = [];
      let b = pos!.lastClaimBlock;
      for (let i = 0; b > 0n && i < 100; i++) {
        const [log] = await client!.getContractEvents({ ...at(b), eventName: "Claimed" });
        if (!log) break;
        claims.push({ hash: log.transactionHash as Hash, amount: log.args.amount! });
        b = log.args.prevClaimBlock ?? 0n;
      }
      return { deposit: created[0]?.transactionHash as Hash | undefined, claims: claims.reverse() };
    },
  });
}
