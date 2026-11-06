"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountButton } from "./AccountButton";

type Props = { eyebrow: string; title: string; em: string; text: string; chainId?: number; variant: "positions" | "create" };

/** Pre-connect screen: explains the value, previews what's behind the wallet, offers a proof lookup. */
export function ConnectGate({ eyebrow, title, em, text, chainId, variant }: Props) {
  const router = useRouter();
  const [id, setId] = useState("");
  const ok = /^\d+$/.test(id) && !!chainId;

  return (
    <div className="gate">
      <div className="gate-copy">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="gate-h">{title} <em>{em}</em></h1>
        <p className="gate-p">{text}</p>
        <div className="gate-cta"><AccountButton size="lg" /></div>
        <ul className="gate-points">
          {(variant === "positions"
            ? [["Claim the moment it unlocks", "Claimable balances are read live from the contract."], ["Every schedule at a glance", "Countdowns and vesting progress for locks you created or receive."], ["Proof for each position", "One public link per lock, ready to share."]]
            : [["Lock any ERC‑20 on Elysium", "Paste the token address from your Ascend launch."], ["Preview before you sign", "See the exact unlock curve, in local time and UTC."], ["Share the proof", "Get a public link the moment the lock confirms."]]
          ).map(([h, p]) => (
            <li key={h}><i /><div><b>{h}</b><span>{p}</span></div></li>
          ))}
        </ul>
      </div>

      <div className="gate-visual" aria-hidden="true">
        <div className="gate-glow" />
        <div className="ghost glass">
          <div className="ghost-top">
            <span className="lbl">Claimable now</span>
            <span className="ghost-tag">Example</span>
          </div>
          <div className="ghost-num">7,500,000<small>EXAMPLE</small></div>
          {[
            ["EX", "Linear", "Vesting", 62, "7.5M"],
            ["TK", "Hard lock", "Locked", 0, "0"],
            ["HY", "Linear", "Before cliff", 0, "0"],
          ].map(([s, m, st, pct, c], i) => (
            <div className="ghost-row" key={i} style={{ animationDelay: `${0.3 + i * 0.12}s` }}>
              <span className="tok-badge sm">{s}</span>
              <div className="ghost-mid">
                <div className="ghost-t"><b>{m as string}</b><span className={`status ${st === "Vesting" ? "s-vesting" : "s-locked"}`}>{st}</span></div>
                <div className="pbar"><i style={{ width: `${pct}%` }} /></div>
              </div>
              <b className={`mono ${c !== "0" ? "hot" : "dim"}`}>{c}</b>
            </div>
          ))}
        </div>
      </div>

      <form className="gate-lookup glass" onSubmit={(e) => { e.preventDefault(); if (ok) router.push(`/proof/${chainId}/${id}`); }}>
        <div>
          <b>Just checking a lock?</b>
          <span>Open any position&apos;s public proof. No wallet needed.</span>
        </div>
        <div className="gate-lookup-in">
          <span className="mono pre">#</span>
          <input className="inp mono" inputMode="numeric" placeholder="Position ID" value={id} onChange={(e) => setId(e.target.value.trim())} aria-label="Position ID" />
          <button className="btn btn-ghost" disabled={!ok}>View proof</button>
        </div>
      </form>
    </div>
  );
}
