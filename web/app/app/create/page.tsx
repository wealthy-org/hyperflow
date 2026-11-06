"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { ConnectGate } from "@/components/app/ConnectGate";
import { erc20Abi, formatUnits, isAddress, parseEventLogs, parseUnits, type Address } from "viem";
import { escrowAbi } from "@/lib/abi";
import { fmtAmount, fmtDate, readPosition, readToken, short, type Mode } from "@/lib/escrow";
import { useActiveDeployment, useNow, useTx } from "@/components/app/hooks";
import { ScheduleChart } from "@/components/app/ScheduleChart";
import { TxNote } from "@/components/app/TxNote";
import { NotDeployed } from "@/components/app/AppNav";

const DAY = 86400;
const toInput = (ts: number) => {
  const d = new Date(ts * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromInput = (s: string) => (s ? Math.floor(new Date(s).getTime() / 1000) : 0);

export default function CreatePage() {
  const { address, isConnected } = useAccount();
  const { dep, client, wrongChain } = useActiveDeployment();
  const chainId = dep?.chain.id;
  const escrow = dep?.escrow;
  const now = useNow(chainId);

  const [tokenStr, setTokenStr] = useState("");
  const [mode, setMode] = useState<Mode>("hard");
  const [amountStr, setAmountStr] = useState("");
  const [benMode, setBenMode] = useState<"me" | "other">("me");
  const [benStr, setBenStr] = useState("");
  const [unlock, setUnlock] = useState(() => toInput(Math.floor(Date.now() / 1000) + 90 * DAY));
  const [startNow, setStartNow] = useState(true);
  const [startStr, setStartStr] = useState(() => toInput(Math.floor(Date.now() / 1000) + DAY));
  const [useCliff, setUseCliff] = useState(true);
  const [cliffStr, setCliffStr] = useState(() => toInput(Math.floor(Date.now() / 1000) + 90 * DAY));
  const [endStr, setEndStr] = useState(() => toInput(Math.floor(Date.now() / 1000) + 365 * DAY));
  const [ack, setAck] = useState(false);
  const [created, setCreated] = useState<{ id: bigint; ready: boolean } | null>(null);

  const approveTx = useTx(chainId);
  const lockTx = useTx(chainId);

  const token = isAddress(tokenStr) ? (tokenStr as Address) : undefined;
  const tq = useQuery({
    queryKey: ["tokenInfo", chainId, token, address, escrow],
    enabled: !!(client && token && address && escrow),
    queryFn: async () => {
      const meta = await readToken(client!, token!);
      const [balance, allowance] = await Promise.all([
        client!.readContract({ address: token!, abi: erc20Abi, functionName: "balanceOf", args: [address!] }),
        client!.readContract({ address: token!, abi: erc20Abi, functionName: "allowance", args: [address!, escrow!] }),
      ]);
      return { ...meta, balance, allowance };
    },
    retry: false,
  });
  const info = tq.data;

  const amount = useMemo(() => {
    if (!info || !amountStr) return undefined;
    try { return parseUnits(amountStr.replace(/,/g, ""), info.decimals); } catch { return undefined; }
  }, [amountStr, info]);

  const beneficiary = benMode === "me" ? address : isAddress(benStr) ? (benStr as Address) : undefined;

  // Resolved schedule (seconds). "Start now" previews from the current time; the contract uses the block time.
  const sched = useMemo(() => {
    if (mode === "hard") { const end = fromInput(unlock); return { start: now, cliff: end, end }; }
    const start = startNow ? now : fromInput(startStr);
    return { start, cliff: useCliff ? fromInput(cliffStr) : start, end: fromInput(endStr) };
  }, [mode, unlock, startNow, startStr, useCliff, cliffStr, endStr, now]);

  // ---- validation (mirrors the contract's checks) ----
  const errors: Partial<Record<"token" | "amount" | "ben" | "sched", string>> = {};
  if (tokenStr && !token) errors.token = "Enter a valid token address (0x…).";
  else if (token && tq.isError) errors.token = "This address isn't an ERC‑20 token on this network.";
  if (amountStr && info && amount === undefined) errors.amount = `Use up to ${info.decimals} decimals.`;
  else if (amount === 0n) errors.amount = "Enter an amount greater than zero.";
  else if (amount && info && amount > info.balance) errors.amount = "That's more than your balance.";
  if (benMode === "other" && benStr && !beneficiary) errors.ben = "Enter a valid address.";
  else if (beneficiary && escrow && beneficiary.toLowerCase() === escrow.toLowerCase()) errors.ben = "The escrow can't be the beneficiary.";
  if (mode === "hard") { if (sched.end <= now + 60) errors.sched = "Pick an unlock time in the future."; }
  else {
    if (!startNow && sched.start <= now + 60) errors.sched = "A scheduled start must be in the future.";
    else if (sched.end <= sched.start) errors.sched = "The end must be after the start.";
    else if (useCliff && (sched.cliff < sched.start || sched.cliff >= sched.end)) errors.sched = "The cliff must be between the start and the end.";
  }
  const complete = !!(token && info && amount && amount > 0n && beneficiary);
  const valid = complete && Object.keys(errors).length === 0;
  const needsApproval = !!(info && amount && info.allowance < amount);
  const busy = (s: string) => s === "wallet" || s === "pending";

  async function approve() {
    const r = await approveTx.send({ address: token!, abi: erc20Abi, functionName: "approve", args: [escrow!, amount!] });
    if (r) tq.refetch();
  }

  async function lock() {
    const r =
      mode === "hard"
        ? await lockTx.send({ address: escrow!, abi: escrowAbi, functionName: "createLock", args: [token!, beneficiary!, amount!, BigInt(sched.end)] })
        : await lockTx.send({
            address: escrow!, abi: escrowAbi, functionName: "createVesting",
            args: [token!, beneficiary!, amount!, startNow ? 0n : BigInt(sched.start), useCliff ? BigInt(sched.cliff) : 0n, BigInt(sched.end)],
          });
    if (!r) return;
    const ev = parseEventLogs({ abi: escrowAbi, eventName: "PositionCreated", logs: r.logs })[0];
    if (!ev) return;
    const id = ev.args.id;
    setCreated({ id, ready: false });
    // The proof only counts once the position is readable from the contract.
    for (let i = 0; i < 10; i++) {
      if (await readPosition(client!, escrow!, id).catch(() => null)) { setCreated({ id, ready: true }); return; }
      await new Promise((res) => setTimeout(res, 1500));
    }
  }

  if (!isConnected)
    return (
      <ConnectGate
        variant="create" chainId={chainId} eyebrow="Create"
        title="Lock it." em="Prove it."
        text="Connect the wallet that holds the tokens you want to lock. You'll review the full schedule before signing anything."
      />
    );
  if (dep && !escrow) return <NotDeployed chainName={dep.chain.name} />;
  if (wrongChain) return null;
  if (created) return <Created id={created.id} ready={created.ready} chainId={chainId!} hash={lockTx.state.s === "success" ? lockTx.state.hash : undefined} />;

  const d = info?.decimals ?? 18;
  const dates = { start: fmtDate(sched.start), cliff: fmtDate(sched.cliff), end: fmtDate(sched.end) };

  return (
    <div className="create">
      <div className="create-form">
        <h1 className="page-h">Create a {mode === "hard" ? "lock" : "vesting schedule"}</h1>

        <Field n={1} label="Token" error={errors.token}>
          <input className="inp mono" placeholder="0x… ERC‑20 address (copy it from Ascend)" value={tokenStr} onChange={(e) => setTokenStr(e.target.value.trim())} spellCheck={false} />
          {token && tq.isLoading && <p className="hint">Reading token…</p>}
          {info && <p className="hint ok">✓ {info.name || info.symbol} · {info.symbol} · balance {fmtAmount(info.balance, d)}</p>}
        </Field>

        <Field n={2} label="Mode">
          <div className="seg2">
            <button type="button" className={mode === "hard" ? "on" : ""} onClick={() => setMode("hard")}>
              <b>Hard lock</b><span>Everything unlocks at one time</span>
            </button>
            <button type="button" className={mode === "linear" ? "on" : ""} onClick={() => setMode("linear")}>
              <b>Linear vesting</b><span>Unlocks gradually, optional cliff</span>
            </button>
          </div>
        </Field>

        <Field n={3} label="Amount" error={errors.amount}>
          <div className="inp-wrap">
            <input className="inp mono" inputMode="decimal" placeholder="0.0" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} disabled={!info} />
            <span className="unit">{info?.symbol ?? ""}</span>
            <button type="button" className="max" disabled={!info} onClick={() => info && setAmountStr(formatUnits(info.balance, d))}>Max</button>
          </div>
        </Field>

        <Field n={4} label="Beneficiary" error={errors.ben}>
          <div className="seg-inline">
            <button type="button" className={benMode === "me" ? "on" : ""} onClick={() => setBenMode("me")}>Me ({short(address)})</button>
            <button type="button" className={benMode === "other" ? "on" : ""} onClick={() => setBenMode("other")}>Another address</button>
          </div>
          {benMode === "other" && <input className="inp mono" placeholder="0x… who can claim" value={benStr} onChange={(e) => setBenStr(e.target.value.trim())} spellCheck={false} />}
        </Field>

        <Field n={5} label="Schedule" error={errors.sched}>
          {mode === "hard" ? (
            <>
              <label className="sublbl">Unlock date</label>
              <input className="inp" type="datetime-local" value={unlock} onChange={(e) => setUnlock(e.target.value)} />
              <div className="presets">
                {[["30 days", 30], ["90 days", 90], ["6 months", 182], ["1 year", 365]].map(([l, n]) => (
                  <button type="button" key={l} onClick={() => setUnlock(toInput(now + (n as number) * DAY))}>+{l}</button>
                ))}
              </div>
            </>
          ) : (
            <div className="grid2">
              <div>
                <label className="sublbl">Start</label>
                <div className="seg-inline">
                  <button type="button" className={startNow ? "on" : ""} onClick={() => setStartNow(true)}>Now</button>
                  <button type="button" className={!startNow ? "on" : ""} onClick={() => setStartNow(false)}>Later</button>
                </div>
                {!startNow && <input className="inp" type="datetime-local" value={startStr} onChange={(e) => setStartStr(e.target.value)} />}
              </div>
              <div>
                <label className="sublbl">End</label>
                <input className="inp" type="datetime-local" value={endStr} onChange={(e) => setEndStr(e.target.value)} />
              </div>
              <div className="span2">
                <label className="check"><input type="checkbox" checked={useCliff} onChange={(e) => setUseCliff(e.target.checked)} /> Add a cliff</label>
                {useCliff && <input className="inp" type="datetime-local" value={cliffStr} onChange={(e) => setCliffStr(e.target.value)} />}
              </div>
            </div>
          )}
        </Field>
      </div>

      <aside className="create-side">
        <div className="glass panel sticky-sum">
          <span className="lbl">Summary</span>
          <div className="sum-amt">{amount && info ? fmtAmount(amount, d) : "—"}<small>{info?.symbol}</small></div>
          <div className="sum-to mono">→ {beneficiary ? (benMode === "me" ? `you (${short(beneficiary)})` : short(beneficiary)) : "beneficiary"}</div>
          <ScheduleChart mode={mode} start={sched.start} cliff={sched.cliff} end={sched.end} />
          <dl className="kv">
            {mode === "hard" ? (
              <div><dt>Unlocks</dt><dd>{dates.end.local}<br /><small>{dates.end.utc}</small></dd></div>
            ) : (
              <>
                <div><dt>Start</dt><dd>{startNow ? "When the transaction confirms" : <>{dates.start.local}<br /><small>{dates.start.utc}</small></>}</dd></div>
                {useCliff && <div><dt>Cliff</dt><dd>{dates.cliff.local}<br /><small>{dates.cliff.utc}</small></dd></div>}
                <div><dt>Fully vested</dt><dd>{dates.end.local}<br /><small>{dates.end.utc}</small></dd></div>
              </>
            )}
            <div><dt>App fee</dt><dd>0 · gas in HYPE</dd></div>
          </dl>

          <label className="check ack">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            I understand the schedule and beneficiary can&apos;t be changed or cancelled after creation.
          </label>

          <div className="steps2">
            <button className={`btn ${needsApproval ? "btn-primary" : "btn-ghost done"}`} disabled={!valid || !needsApproval || busy(approveTx.state.s)} onClick={approve}>
              {!needsApproval && valid ? "✓ Approved" : busy(approveTx.state.s) ? (approveTx.state.s === "wallet" ? "Confirm in wallet…" : "Approving…") : "1 · Approve"}
            </button>
            <button className="btn btn-primary" disabled={!valid || needsApproval || !ack || busy(lockTx.state.s)} onClick={lock}>
              {busy(lockTx.state.s) ? (lockTx.state.s === "wallet" ? "Confirm in wallet…" : "Locking…") : `2 · ${mode === "hard" ? "Lock" : "Create vesting"}`}
            </button>
          </div>
          {!complete && <p className="hint">Fill in token, amount and beneficiary to continue.</p>}
          {valid && needsApproval && <p className="hint">Approve exactly {fmtAmount(amount!, d)} {info!.symbol} for the escrow first.</p>}
          <TxNote state={approveTx.state} chainId={chainId!} okText="Approved." />
          <TxNote state={lockTx.state} chainId={chainId!} okText="Locked. Reading the position…" />
        </div>
      </aside>
    </div>
  );
}

function Field({ n, label, error, children }: { n: number; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className={`field2${error ? " has-err" : ""}`}>
      <div className="field2-h"><span className="num">{n}</span>{label}</div>
      {children}
      {error && <p className="hint err">{error}</p>}
    </div>
  );
}

function Created({ id, ready, chainId, hash }: { id: bigint; ready: boolean; chainId: number; hash?: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/proof/${chainId}/${id}`;
  const url = typeof window !== "undefined" ? window.location.origin + path : path;
  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Creator tokens locked on Hypeflow. Verify onchain: ${url}`)}`;
  return (
    <div className="connect-hero">
      <div className="glass panel center">
        <div className="seal-sm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></div>
        <h1>{ready ? "Locked onchain" : "Confirming…"}</h1>
        <p>{ready ? `Position #${id} is live. Share the proof so anyone can verify it.` : "The transaction succeeded. Waiting until the position can be read from the contract."}</p>
        <div className="url-box mono">{url}</div>
        <div className="row-btns">
          <button className="btn btn-primary" disabled={!ready} onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
            {copied ? "Copied" : "Copy link"}
          </button>
          <a className={`btn btn-ghost${ready ? "" : " disabled"}`} href={ready ? tweet : undefined} target="_blank" rel="noopener">Share on X</a>
          <Link className="btn btn-ghost" href={path}>Open proof</Link>
        </div>
        {hash && <p className="hint">Deposit tx {short(hash)}</p>}
        <Link className="link" href="/app">Back to positions</Link>
      </div>
    </div>
  );
}
