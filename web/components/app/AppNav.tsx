"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useSwitchChain } from "wagmi";
import { AccountButton } from "./AccountButton";
import { DEFAULT_CHAIN_ID, getDeployment } from "@/lib/config";

export function AppNav() {
  const path = usePathname();
  const tab = (href: string, label: string) => (
    <Link href={href} className={`tab${path === href ? " on" : ""}`} aria-current={path === href ? "page" : undefined}>
      {label}
    </Link>
  );
  return (
    <nav className="app-nav">
      <div className="app-nav-inner">
        <Link className="brand" href="/"><Image src="/logo.jpeg" alt="" width={30} height={30} />Hypeflow</Link>
        <div className="tabs">{tab("/app", "Positions")}{tab("/app/create", "Create")}</div>
        <AccountButton />
      </div>
    </nav>
  );
}

/** Banner shown when the wallet is on a chain Hypeflow isn't deployed on. */
export function NetworkGuard() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  if (!isConnected || getDeployment(chainId)) return null;
  const target = getDeployment(DEFAULT_CHAIN_ID)!.chain;
  return (
    <div className="banner warn" role="alert">
      <span>Your wallet is on an unsupported network. Hypeflow runs on {target.name}.</span>
      <button className="btn btn-primary sm" onClick={() => switchChain({ chainId: target.id })} disabled={isPending}>
        {isPending ? "Switching…" : `Switch to ${target.name}`}
      </button>
    </div>
  );
}

/** Shown when the chain has no escrow address configured. */
export function NotDeployed({ chainName }: { chainName: string }) {
  return (
    <div className="banner warn" role="alert">
      <span>Hypeflow isn&apos;t deployed on {chainName} yet. Set the escrow address in <code>.env.local</code>.</span>
    </div>
  );
}
