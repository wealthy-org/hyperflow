"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectGate } from "@/components/app/ConnectGate";
import { fmtAmount } from "@/lib/escrow";
import { useActiveDeployment, useNow } from "@/components/app/hooks";
import { usePositions, type Row } from "@/components/app/data";
import { PositionRow } from "@/components/app/PositionRow";
import { NotDeployed } from "@/components/app/AppNav";

type Tab = "claimable" | "created";

export default function PositionsPage() {
  const { address, isConnected } = useAccount();
  const { dep, wrongChain } = useActiveDeployment();
  const chainId = dep?.chain.id;
  const now = useNow(chainId);
  const q = usePositions(chainId, address);
  const [tab, setTab] = useState<Tab>("claimable");

  if (!isConnected)
    return (
      <ConnectGate
        variant="positions" chainId={chainId} eyebrow="Positions"
        title="Your locks," em="in one place."
        text="Connect the wallet that created a lock or receives one. You'll see what's claimable right away."
      />
    );
  if (dep && !dep.escrow) return <NotDeployed chainName={dep.chain.name} />;
  if (wrongChain) return null; // NetworkGuard banner explains what to do

  const data = q.data;
  // Sort: claimable first, then soonest unlock, completed last.
  const sort = (rows: Row[]) =>
    [...rows].sort((a, b) => {
      const done = (r: Row) => (r.claimed >= r.total ? 1 : 0);
      if (done(a) !== done(b)) return done(a) - done(b);
      if ((a.claimable > 0n) !== (b.claimable > 0n)) return a.claimable > 0n ? -1 : 1;
      return a.end - b.end;
    });
  const rows = data ? sort(tab === "claimable" ? data.claimable : data.created) : [];

  // Totals per token: different tokens can't be summed.
  const totals = new Map<string, { sym: string; dec: number; v: bigint }>();
  data?.claimable.forEach((r) => {
    if (r.claimable === 0n) return;
    const t = totals.get(r.token) ?? { sym: r.token_.symbol, dec: r.token_.decimals, v: 0n };
    t.v += r.claimable;
    totals.set(r.token, t);
  });

  return (
    <div className="stack">
      <section className="summary glass">
        <div>
          <span className="lbl">Claimable now</span>
          {q.isLoading ? (
            <div className="skel" style={{ width: 220, height: 44 }} />
          ) : totals.size ? (
            <div className="totals">
              {[...totals.values()].map((t) => (
                <div key={t.sym} className="big-num">{fmtAmount(t.v, t.dec, 2)}<small>{t.sym}</small></div>
              ))}
            </div>
          ) : (
            <div className="big-num dim">0</div>
          )}
          <p className="sub">{totals.size ? "Claim each position below. Tokens go straight to your wallet." : "Nothing to claim right now."}</p>
        </div>
        <Link href="/app/create" className="btn btn-primary">+ Create lock</Link>
      </section>

      <div className="seg-tabs" role="tablist">
        {(["claimable", "created"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t === "claimable" ? "Claimable by me" : "Created by me"}
            <span className="count">{data ? (t === "claimable" ? data.claimable.length : data.created.length) : "–"}</span>
          </button>
        ))}
      </div>

      {q.isError && <div className="banner err" role="alert">Couldn&apos;t load positions. Check your connection and try again. <button className="link" onClick={() => q.refetch()}>Retry</button></div>}

      {q.isLoading ? (
        <div className="list">{[0, 1].map((i) => <div key={i} className="prow skel" style={{ height: 96 }} />)}</div>
      ) : rows.length ? (
        <div className="list">{rows.map((p) => <PositionRow key={String(p.id)} p={p} chainId={chainId!} now={now} me={address} />)}</div>
      ) : (
        <Empty tab={tab} />
      )}
    </div>
  );
}

function Empty({ tab }: { tab: Tab }) {
  if (tab === "claimable")
    return (
      <div className="empty glass">
        <h3>No positions for this wallet</h3>
        <p>When someone locks or vests tokens for you, they&apos;ll show up here with a countdown and a claim button.</p>
      </div>
    );
  return (
    <div className="empty glass">
      <h3>Create your first lock</h3>
      <ol className="mini-steps">
        <li><b>Launch on Ascend</b> with a dev buy sent to this wallet.</li>
        <li><b>Lock or vest</b> those tokens on Hypeflow.</li>
        <li><b>Share the proof link</b> in your launch announcement.</li>
      </ol>
      <Link href="/app/create" className="btn btn-primary">Create a lock</Link>
    </div>
  );
}
