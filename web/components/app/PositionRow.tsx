"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { escrowAbi } from "@/lib/abi";
import { getDeployment } from "@/lib/config";
import { fmtAmount, fmtCountdown, fmtDate, short, statusLabel, statusOf } from "@/lib/escrow";
import type { Row } from "./data";
import { useTx } from "./hooks";
import { TxNote } from "./TxNote";

export function PositionRow({ p, chainId, now, me }: { p: Row; chainId: number; now: number; me?: string }) {
  const qc = useQueryClient();
  const tx = useTx(chainId);
  const st = statusOf(p, now);
  const d = p.token_.decimals;
  const pct = p.total ? Number((p.claimed * 10000n) / p.total) / 100 : 0;
  const vestedPct =
    p.mode === "hard" ? (now >= p.end ? 100 : 0) : now < p.cliff ? 0 : Math.min(100, ((now - p.start) / (p.end - p.start)) * 100);
  const isBeneficiary = me?.toLowerCase() === p.beneficiary.toLowerCase();
  const until = p.mode === "hard" || now < p.cliff ? (p.mode === "hard" ? p.end : p.cliff) - now : p.end - now;
  const when = fmtDate(p.end);

  async function claim() {
    const escrow = getDeployment(chainId)!.escrow!;
    const r = await tx.send({ address: escrow, abi: escrowAbi, functionName: "claim", args: [p.id] });
    if (r) qc.invalidateQueries({ queryKey: ["positions"] });
  }

  return (
    <div className={`prow st-${st}`}>
      <div className="prow-main">
        <div className="tok-badge" aria-hidden="true">{p.token_.symbol.slice(0, 2)}</div>
        <div className="prow-id">
          <div className="prow-title">
            <b>{p.token_.symbol}</b>
            <span className="pill-sm">{p.mode === "hard" ? "Hard lock" : "Linear"}</span>
            <span className={`status s-${st}`}>{statusLabel[st]}</span>
          </div>
          <div className="prow-sub mono">
            #{String(p.id)} · {isBeneficiary ? `from ${short(p.creator)}` : `to ${short(p.beneficiary)}`} ·{" "}
            <span title={when.utc}>{p.mode === "hard" ? "unlocks" : "ends"} {when.local}</span>
          </div>
        </div>
      </div>

      <div className="prow-progress">
        <div className="pbar" aria-label={`${vestedPct.toFixed(0)}% unlocked`}>
          <i style={{ width: `${vestedPct}%` }} />
          <s style={{ width: `${pct}%` }} />
        </div>
        <div className="prow-meta mono">
          <span>{fmtAmount(p.claimed, d, 2)} / {fmtAmount(p.total, d, 2)} claimed</span>
          {st !== "completed" && until > 0 && <span>{p.mode === "linear" && now >= p.cliff ? "ends in" : "unlocks in"} {fmtCountdown(until)}</span>}
        </div>
      </div>

      <div className="prow-claim">
        <span className="lbl">Claimable</span>
        <b className={p.claimable > 0n ? "hot" : ""}>{fmtAmount(p.claimable, d)}</b>
      </div>

      <div className="prow-actions">
        {isBeneficiary && p.claimable > 0n && (
          <button className="btn btn-primary sm" onClick={claim} disabled={tx.state.s === "wallet" || tx.state.s === "pending"}>
            {tx.state.s === "wallet" ? "Confirm in wallet…" : tx.state.s === "pending" ? "Claiming…" : "Claim"}
          </button>
        )}
        <Link className="btn btn-ghost sm" href={`/proof/${chainId}/${p.id}`}>Proof ↗</Link>
      </div>
      {tx.state.s !== "idle" && tx.state.s !== "wallet" && (
        <div className="prow-tx"><TxNote state={tx.state} chainId={chainId} okText="Claimed." /></div>
      )}
    </div>
  );
}
