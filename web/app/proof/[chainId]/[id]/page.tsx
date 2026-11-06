"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { escrowAbi } from "@/lib/abi";
import { explorerAddress, getDeployment } from "@/lib/config";
import { fmtAmount, fmtCountdown, fmtDate, statusLabel, statusOf } from "@/lib/escrow";
import { usePosition, usePositionTxs } from "@/components/app/data";
import { useNow, useTx } from "@/components/app/hooks";
import { ScheduleChart } from "@/components/app/ScheduleChart";
import { TxLink, TxNote } from "@/components/app/TxNote";

export default function ProofPage({ params }: { params: Promise<{ chainId: string; id: string }> }) {
  const { chainId: c, id: i } = use(params);
  const chainId = Number(c);
  const id = /^\d+$/.test(i) ? BigInt(i) : undefined;
  const dep = getDeployment(chainId);
  const now = useNow(chainId);
  const q = usePosition(chainId, id);
  const txs = usePositionTxs(chainId, q.data);
  const { address } = useAccount();
  const tx = useTx(chainId);
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  if (!dep || !dep.escrow || id === undefined)
    return <Notice title="Proof not available" text={!dep ? `Chain ${c} isn't supported by this Hypeflow deployment.` : "Invalid position link."} />;
  if (q.isLoading) return <div className="proof-page"><div className="glass panel skel" style={{ height: 520 }} /></div>;
  if (q.isError) return <Notice title="Couldn't reach the network" text="The RPC didn't respond. Try again in a moment." retry={() => q.refetch()} />;
  const p = q.data;
  if (!p)
    return <Notice title={`Position #${i} not found`} text="If it was just created, the network may still be catching up. This page only shows a lock once it can be read from the contract." retry={() => q.refetch()} />;

  const d = p.token_.decimals;
  const st = statusOf(p, now);
  const target = p.mode === "hard" ? p.end : now < p.cliff ? p.cliff : p.end;
  const left = Math.max(0, target - now);
  const cd = [Math.floor(left / 86400), Math.floor((left % 86400) / 3600), Math.floor((left % 3600) / 60), left % 60];
  const isBen = address?.toLowerCase() === p.beneficiary.toLowerCase();
  const end = fmtDate(p.end), start = fmtDate(p.start), cliff = fmtDate(p.cliff);
  const escrowUrl = explorerAddress(chainId, dep.escrow);
  const tokenUrl = explorerAddress(chainId, p.token);

  async function claim() {
    const r = await tx.send({ address: dep!.escrow!, abi: escrowAbi, functionName: "claim", args: [p!.id] });
    if (r) { qc.invalidateQueries({ queryKey: ["position"] }); qc.invalidateQueries({ queryKey: ["positionTxs"] }); }
  }

  return (
    <div className="proof-page">
      <div className="glass proof-card">
        <div className="pc-head">
          <span className="mono">Position #{String(p.id)} · {dep.chain.name} · {chainId}</span>
          <span className={`status s-${st}`}>{statusLabel[st]}</span>
        </div>

        <div className="pc-body">
          <div className="lbl">{p.mode === "hard" ? "Tokens locked on Hypeflow" : "Tokens vesting on Hypeflow"}</div>
          <div className="pc-amt">{fmtAmount(p.total, d)}<small>{p.token_.symbol}</small></div>

          {st !== "completed" && left > 0 && (
            <>
              <div className="lbl" style={{ marginTop: 18 }}>{p.mode === "hard" ? "Unlocks in" : now < p.cliff ? "Cliff in" : "Fully vested in"}</div>
              <div className="cd">
                {["Days", "Hours", "Min", "Sec"].map((l, k) => <div key={l}><b>{String(cd[k]).padStart(2, "0")}</b><span>{l}</span></div>)}
              </div>
            </>
          )}

          <ScheduleChart mode={p.mode} start={p.start} cliff={p.cliff} end={p.end} now={now} height={130} />

          <div className="pc-stats">
            <div><span>Claimed</span><b>{fmtAmount(p.claimed, d)}</b></div>
            <div><span>Claimable now</span><b className={p.claimable > 0n ? "hot" : ""}>{fmtAmount(p.claimable, d)}</b></div>
            <div><span>Remaining</span><b>{fmtAmount(p.total - p.claimed, d)}</b></div>
          </div>

          {isBen && p.claimable > 0n && (
            <div className="pc-claim">
              <button className="btn btn-primary" onClick={claim} disabled={tx.state.s === "wallet" || tx.state.s === "pending"}>
                {tx.state.s === "wallet" ? "Confirm in wallet…" : tx.state.s === "pending" ? "Claiming…" : `Claim ${fmtAmount(p.claimable, d)} ${p.token_.symbol}`}
              </button>
              <TxNote state={tx.state} chainId={chainId} okText="Claimed." />
            </div>
          )}

          <dl className="kv">
            <div><dt>Mode</dt><dd>{p.mode === "hard" ? "Hard lock" : "Linear vesting"}</dd></div>
            <div><dt>Token</dt><dd>{p.token_.name ? `${p.token_.name} · ` : ""}{tokenUrl ? <a className="link" href={tokenUrl} target="_blank" rel="noopener">{p.token}</a> : p.token}</dd></div>
            <div><dt>Creator</dt><dd>{p.creator}</dd></div>
            <div><dt>Beneficiary</dt><dd>{p.beneficiary}</dd></div>
            {p.mode === "linear" && <div><dt>Start</dt><dd>{start.local}<br /><small>{start.utc}</small></dd></div>}
            {p.mode === "linear" && p.cliff > p.start && <div><dt>Cliff</dt><dd>{cliff.local}<br /><small>{cliff.utc}</small></dd></div>}
            <div><dt>{p.mode === "hard" ? "Unlocks" : "Ends"}</dt><dd>{end.local}<br /><small>{end.utc}</small></dd></div>
            <div><dt>Escrow contract</dt><dd>{escrowUrl ? <a className="link" href={escrowUrl} target="_blank" rel="noopener">{dep.escrow}</a> : dep.escrow}</dd></div>
            <div><dt>Deposit tx</dt><dd>{txs.data?.deposit ? <TxLink chainId={chainId} hash={txs.data.deposit} /> : txs.isError ? "Unavailable from this RPC" : "…"}</dd></div>
            {txs.data?.claims.map((cl) => (
              <div key={cl.hash}><dt>Claim</dt><dd>{fmtAmount(cl.amount, d)} · <TxLink chainId={chainId} hash={cl.hash} /></dd></div>
            ))}
          </dl>
        </div>

        <div className="pc-foot">
          <button className="btn btn-ghost sm" onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
            {copied ? "Copied" : "Copy link"}
          </button>
          <a className="btn btn-ghost sm" target="_blank" rel="noopener"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${fmtCompact(p.total, d)} $${p.token_.symbol} locked on Hypeflow. Verify onchain: ${typeof window !== "undefined" ? window.location.href : ""}`)}`}>
            Share on X
          </a>
          {st !== "completed" && left > 0 && <span className="mono dim">{p.mode === "hard" ? "unlocks" : "next milestone"} in {fmtCountdown(left)}</span>}
        </div>
      </div>
      <p className="note">Every value on this page is read from the escrow contract. <Link className="link" href="/app">Open the app</Link></p>
    </div>
  );
}

const fmtCompact = (v: bigint, d: number) => fmtAmount(v, d, 0);

function Notice({ title, text, retry }: { title: string; text: string; retry?: () => void }) {
  return (
    <div className="connect-hero">
      <div className="glass panel center">
        <h1>{title}</h1>
        <p>{text}</p>
        {retry && <button className="btn btn-ghost" onClick={retry}>Try again</button>}
        <Link className="link" href="/app">Open the app</Link>
      </div>
    </div>
  );
}
