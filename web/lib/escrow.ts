import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  erc20Abi,
  formatUnits,
  type Address,
  type PublicClient,
} from "viem";
import { escrowAbi } from "./abi";

export type Mode = "hard" | "linear";
export type Position = {
  id: bigint;
  token: Address;
  creator: Address;
  beneficiary: Address;
  total: bigint;
  claimed: bigint;
  mode: Mode;
  start: number;
  cliff: number;
  end: number;
  createdBlock: bigint;
  lastClaimBlock: bigint;
  claimable: bigint;
};
export type TokenMeta = { address: Address; symbol: string; name: string; decimals: number };

const ZERO = "0x0000000000000000000000000000000000000000";

/** Reads one position plus its claimable amount. Returns null if the id doesn't exist (yet). */
export async function readPosition(client: PublicClient, escrow: Address, id: bigint): Promise<Position | null> {
  const [p, claimable] = await Promise.all([
    client.readContract({ address: escrow, abi: escrowAbi, functionName: "getPosition", args: [id] }),
    client.readContract({ address: escrow, abi: escrowAbi, functionName: "claimable", args: [id] }),
  ]);
  if (p.beneficiary === ZERO) return null;
  return {
    id,
    token: p.token,
    creator: p.creator,
    beneficiary: p.beneficiary,
    total: p.total,
    claimed: p.claimed,
    mode: p.mode === 0 ? "hard" : "linear",
    start: Number(p.start),
    cliff: Number(p.cliff),
    end: Number(p.end),
    createdBlock: p.createdBlock,
    lastClaimBlock: p.lastClaimBlock,
    claimable,
  };
}

const tokenCache = new Map<string, Promise<TokenMeta>>();
/** Token metadata, cached per chain+address. Falls back gracefully for non-standard tokens. */
export function readToken(client: PublicClient, address: Address): Promise<TokenMeta> {
  const key = `${client.chain?.id}:${address.toLowerCase()}`;
  if (!tokenCache.has(key)) {
    const p = Promise.all([
      client.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
      client.readContract({ address, abi: erc20Abi, functionName: "symbol" }).catch(() => "TOKEN"),
      client.readContract({ address, abi: erc20Abi, functionName: "name" }).catch(() => ""),
    ]).then(([decimals, symbol, name]) => ({ address, decimals, symbol, name }));
    p.catch(() => tokenCache.delete(key));
    tokenCache.set(key, p);
  }
  return tokenCache.get(key)!;
}

/** Mirrors HypeflowEscrow._vested, for previews only. Live values always come from the contract. */
export function vestedAt(t: number, p: { total: bigint; mode: Mode; start: number; cliff: number; end: number }) {
  if (t >= p.end) return p.total;
  if (p.mode === "hard" || t < p.cliff) return 0n;
  return (p.total * BigInt(Math.floor(t - p.start))) / BigInt(p.end - p.start);
}

export type Status = "locked" | "cliff" | "vesting" | "claimable" | "completed";
export function statusOf(p: Position, now: number): Status {
  if (p.claimed >= p.total) return "completed";
  if (p.claimable > 0n && now >= p.end) return "claimable";
  if (p.mode === "hard") return now >= p.end ? "claimable" : "locked";
  if (now < p.cliff) return "cliff";
  return "vesting";
}
export const statusLabel: Record<Status, string> = {
  locked: "Locked",
  cliff: "Before cliff",
  vesting: "Vesting",
  claimable: "Unlocked",
  completed: "Fully claimed",
};

// ---------- formatting ----------
export function fmtAmount(v: bigint, decimals: number, max = 4) {
  const n = Number(formatUnits(v, decimals));
  if (n !== 0 && Math.abs(n) < 10 ** -max) return `<${10 ** -max}`;
  return n.toLocaleString("en-US", { maximumFractionDigits: max });
}
export function fmtCompact(v: bigint, decimals: number) {
  return Number(formatUnits(v, decimals)).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 });
}
export const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
export function fmtDate(ts: number) {
  const d = new Date(ts * 1000);
  return {
    local: d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
    utc: d.toISOString().slice(0, 16).replace("T", " ") + " UTC",
  };
}
export function fmtCountdown(secs: number) {
  if (secs <= 0) return "now";
  const d = Math.floor(secs / 86400), h = Math.floor((secs % 86400) / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

// ---------- errors ----------
const revertCopy: Record<string, string> = {
  InvalidToken: "That address isn't a token contract on this network.",
  InvalidBeneficiary: "The beneficiary address isn't valid.",
  InvalidAmount: "Enter an amount greater than zero.",
  InvalidSchedule: "The schedule isn't valid. Unlock and start times must be in the future, and the cliff must be before the end.",
  DepositMismatch: "The escrow received a different amount than requested. Fee-on-transfer tokens aren't supported.",
  PositionNotFound: "This position doesn't exist.",
  NotBeneficiary: "Only the beneficiary of this position can claim.",
  NothingClaimable: "Nothing is claimable yet.",
};
export function humanError(e: unknown): string {
  if (e instanceof BaseError) {
    if (e.walk((x) => x instanceof UserRejectedRequestError)) return "You rejected the request in your wallet.";
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    const name = revert?.data?.errorName;
    if (name && revertCopy[name]) return revertCopy[name];
    if (/insufficient funds/i.test(e.message)) return "Not enough HYPE in your wallet to pay for gas.";
    if (/exceeds balance|transfer amount exceeds/i.test(e.message)) return "Your token balance is too low for this amount.";
    if (/allowance/i.test(e.message)) return "The approval is lower than the amount. Approve again.";
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : "Something went wrong.";
}
