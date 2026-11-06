"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { explorerAddress } from "@/lib/config";
import { short } from "@/lib/escrow";
import { Avatar } from "./Avatar";

/** Branded connect / account control. RainbowKit still handles wallet + chain selection modals. */
export function AccountButton({ size = "md", label = "Connect wallet" }: { size?: "md" | "lg"; label?: string }) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openConnectModal, openChainModal }) => {
        if (!mounted) return <span className="acct-ph" aria-hidden="true" />;
        if (!account || !chain)
          return (
            <button className={`btn btn-primary${size === "lg" ? " lg" : ""}`} onClick={openConnectModal}>
              <WalletIcon /> {label}
            </button>
          );
        if (chain.unsupported)
          return <button className="btn btn-warn" onClick={openChainModal}>Wrong network</button>;
        // Format the balance ourselves so it matches the app's en-US number style.
        const balance =
          account.balanceFormatted !== undefined
            ? `${Number(account.balanceFormatted).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${account.balanceSymbol ?? ""}`.trim()
            : account.displayBalance;
        return <AccountMenu address={account.address} balance={balance} chainName={chain.name ?? ""} chainId={chain.id} onChain={openChainModal} />;
      }}
    </ConnectButton.Custom>
  );
}

function AccountMenu({ address, balance, chainName, chainId, onChain }: { address: string; balance?: string; chainName: string; chainId: number; onChain: () => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { disconnect } = useDisconnect();
  const explorer = explorerAddress(chainId, address);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="acct" ref={ref}>
      <button className={`acct-btn${open ? " on" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <Avatar address={address} size={26} />
        <span className="mono">{short(address)}</span>
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={1.5} className="chev"><path d="M3 4.5l3 3 3-3" /></svg>
      </button>

      {open && (
        <div className="acct-pop glass" role="menu">
          <div className="acct-head">
            <Avatar address={address} size={44} />
            <div>
              <div className="mono acct-addr">{short(address)}</div>
              <button className="acct-copy" onClick={() => { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
                {copied ? "Copied" : "Copy address"}
              </button>
            </div>
          </div>
          <div className="acct-rows">
            <button className="acct-row" onClick={() => { setOpen(false); onChain(); }} role="menuitem">
              <span>Network</span><b><i className="dot" />{chainName}</b>
            </button>
            {balance && <div className="acct-row"><span>Balance</span><b className="mono">{balance}</b></div>}
          </div>
          <div className="acct-links">
            <Link href="/app" className="acct-link" onClick={() => setOpen(false)} role="menuitem">My positions</Link>
            {explorer && <a href={explorer} target="_blank" rel="noopener" className="acct-link" role="menuitem">View on explorer ↗</a>}
            <button className="acct-link danger" onClick={() => { setOpen(false); disconnect(); }} role="menuitem">Disconnect</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="2.5" y="5" width="15" height="11" rx="2.5" /><path d="M2.5 8h15M13.5 12h1" />
    </svg>
  );
}
