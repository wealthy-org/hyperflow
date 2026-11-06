"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, connectorsForWallets, darkTheme } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet, rabbyWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { http, createConfig, WagmiProvider, useConnect, useAccount } from "wagmi";
import { mock } from "wagmi/connectors";
import type { Chain } from "viem";
import { CHAINS } from "@/lib/config";
import { RkAvatar } from "./Avatar";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

const connectors = connectorsForWallets(
  [{ groupName: "Wallets", wallets: [injectedWallet, metaMaskWallet, rabbyWallet, ...(projectId ? [walletConnectWallet] : [])] }],
  // WalletConnect is only offered when a real project id is configured.
  { appName: "Hypeflow", projectId: projectId || "hypeflow-local" },
);

const chains = (CHAINS.length ? CHAINS : []) as unknown as [Chain, ...Chain[]];

// Dev/testing only: a mock wallet bound to an unlocked anvil account, so connected views can be
// exercised without a browser wallet. Never active unless the local chain is enabled.
const mockAccount =
  process.env.NEXT_PUBLIC_ENABLE_LOCAL === "1" && /^0x[0-9a-fA-F]{40}$/.test(process.env.NEXT_PUBLIC_MOCK_ACCOUNT ?? "")
    ? (process.env.NEXT_PUBLIC_MOCK_ACCOUNT as `0x${string}`)
    : undefined;

export const wagmiConfig = CHAINS.length
  ? createConfig({
      chains,
      connectors: mockAccount ? [...connectors, mock({ accounts: [mockAccount] })] : connectors,
      transports: Object.fromEntries(CHAINS.map((c) => [c.id, http()])),
      ssr: true,
    })
  : null;

const theme = darkTheme({ accentColor: "#97F7DB", accentColorForeground: "#020B0A", borderRadius: "large", overlayBlur: "small" });
theme.colors.modalBackground = "#061815";
theme.colors.modalBorder = "rgba(151,247,219,.14)";
theme.colors.connectButtonBackground = "#0A2421";
theme.fonts.body = "var(--font-geist), system-ui, sans-serif";

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true, retry: 1 } } }));
  if (!wagmiConfig) {
    return (
      <div className="app-shell">
        <div className="wrap" style={{ paddingTop: 140 }}>
          <div className="panel glass empty">
            <h2>Network not configured</h2>
            <p>Set <code>NEXT_PUBLIC_ELYSIUM_TESTNET_RPC</code> and <code>NEXT_PUBLIC_ESCROW_99801</code> in <code>.env.local</code>, or enable the local anvil chain. See <code>.env.example</code>.</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <RainbowKitProvider theme={theme} modalSize="compact" locale="en-US" avatar={RkAvatar}>
          {mockAccount && <MockAutoConnect />}
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function MockAutoConnect() {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();
  useEffect(() => {
    const c = connectors.find((x) => x.id === "mock");
    if (c && !isConnected) connect({ connector: c });
  }, [connect, connectors, isConnected]);
  return null;
}
