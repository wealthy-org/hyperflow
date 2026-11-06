import { explorerTx } from "@/lib/config";
import { short } from "@/lib/escrow";
import type { TxState } from "./hooks";

export function TxLink({ chainId, hash }: { chainId: number; hash: string }) {
  const url = explorerTx(chainId, hash);
  return url ? <a className="mono link" href={url} target="_blank" rel="noopener">{short(hash)} ↗</a> : <span className="mono">{short(hash)}</span>;
}

export function TxNote({ state, chainId, okText }: { state: TxState; chainId: number; okText: string }) {
  if (state.s === "idle") return null;
  if (state.s === "wallet") return <p className="txn">Confirm in your wallet…</p>;
  if (state.s === "pending") return <p className="txn"><span className="spin" /> Waiting for confirmation · <TxLink chainId={chainId} hash={state.hash} /></p>;
  if (state.s === "success") return <p className="txn ok">✓ {okText} <TxLink chainId={chainId} hash={state.hash} /></p>;
  return <p className="txn err" role="alert">{state.message}{state.hash && <> · <TxLink chainId={chainId} hash={state.hash} /></>}</p>;
}
