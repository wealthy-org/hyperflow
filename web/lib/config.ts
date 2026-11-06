import { defineChain, type Address, type Chain } from "viem";

/**
 * Per-chain deploy config. RPC, explorer and contract addresses come from env because
 * Elysium publishes its public config at launch (see dev brief §5).
 * Next.js only inlines NEXT_PUBLIC_* vars referenced literally, so each one is spelled out.
 */
type Deployment = { chain: Chain; escrow?: Address };

const hype = { name: "HYPE", symbol: "HYPE", decimals: 18 } as const;
const explorer = (url?: string) => (url ? { default: { name: "Explorer", url } } : undefined);
const asAddr = (v?: string) => (v && /^0x[0-9a-fA-F]{40}$/.test(v) ? (v as Address) : undefined);
// RainbowKit reads iconUrl/iconBackground from the chain object for its network modal.
const icon = { iconUrl: "/logo.jpeg", iconBackground: "#08201F" };

const deployments: Deployment[] = [];

if (process.env.NEXT_PUBLIC_ELYSIUM_TESTNET_RPC) {
  deployments.push({
    chain: defineChain({
      id: 99801,
      name: "Elysium Testnet",
      nativeCurrency: hype,
      rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_ELYSIUM_TESTNET_RPC] } },
      blockExplorers: explorer(process.env.NEXT_PUBLIC_ELYSIUM_TESTNET_EXPLORER),
      testnet: true,
      ...icon,
    }),
    escrow: asAddr(process.env.NEXT_PUBLIC_ESCROW_99801),
  });
}

if (process.env.NEXT_PUBLIC_ELYSIUM_RPC) {
  deployments.push({
    chain: defineChain({
      id: 99901,
      name: "Elysium",
      nativeCurrency: hype,
      rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_ELYSIUM_RPC] } },
      blockExplorers: explorer(process.env.NEXT_PUBLIC_ELYSIUM_EXPLORER),
      ...icon,
    }),
    escrow: asAddr(process.env.NEXT_PUBLIC_ESCROW_99901),
  });
}

// Interim public staging until Elysium testnet is live. Not the brief's target chain.
if (process.env.NEXT_PUBLIC_HYPEREVM_TESTNET_RPC) {
  deployments.push({
    chain: defineChain({
      id: 998,
      name: "HyperEVM Testnet",
      nativeCurrency: hype,
      rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_HYPEREVM_TESTNET_RPC] } },
      blockExplorers: explorer(process.env.NEXT_PUBLIC_HYPEREVM_TESTNET_EXPLORER),
      testnet: true,
      ...icon,
    }),
    escrow: asAddr(process.env.NEXT_PUBLIC_ESCROW_998),
  });
}

// Local anvil, for development only.
if (process.env.NEXT_PUBLIC_ENABLE_LOCAL === "1") {
  deployments.push({
    chain: defineChain({
      id: 31337,
      name: "Local (anvil)",
      nativeCurrency: hype,
      rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_LOCAL_RPC || "http://127.0.0.1:8545"] } },
      testnet: true,
      ...icon,
    }),
    escrow: asAddr(process.env.NEXT_PUBLIC_ESCROW_31337),
  });
}

export const DEPLOYMENTS = deployments;
export const CHAINS = deployments.map((d) => d.chain);
export const DEFAULT_CHAIN_ID = deployments[0]?.chain.id;
export const getDeployment = (chainId?: number) => deployments.find((d) => d.chain.id === chainId);

export function explorerTx(chainId: number, hash: string) {
  const url = getDeployment(chainId)?.chain.blockExplorers?.default.url;
  return url ? `${url.replace(/\/$/, "")}/tx/${hash}` : undefined;
}
export function explorerAddress(chainId: number, addr: string) {
  const url = getDeployment(chainId)?.chain.blockExplorers?.default.url;
  return url ? `${url.replace(/\/$/, "")}/address/${addr}` : undefined;
}
