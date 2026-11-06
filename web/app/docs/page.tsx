import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/sections/Top";
import { Footer, faqs } from "@/components/sections/Bottom";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { DEPLOYMENTS, explorerAddress } from "@/lib/config";

export const metadata: Metadata = {
  title: "Docs · Hypeflow",
  description: "How locking, vesting, claiming and public proof work on Hypeflow, and where to find every contract.",
};

const fns: [string, string, string][] = [
  ["Write", "createLock(token, beneficiary, amount, unlockTime)", "Hard lock until one timestamp. The escrow must receive the exact amount."],
  ["Write", "createVesting(token, beneficiary, amount, start, cliff, end)", "Linear unlock with an optional cliff. start = 0 means start now; cliff = 0 means no cliff."],
  ["Write", "claim(id)", "Beneficiary only. Always pays the recorded beneficiary address."],
  ["Read", "claimable(id)", "Amount currently claimable. Anyone can read it, no wallet needed."],
  ["Read", "getPosition(id)", "Full position: token, creator, beneficiary, total, claimed, mode, start, cliff, end."],
  ["Read", "positionsByCreator(address) · positionsByBeneficiary(address)", "Onchain indexes the app reads directly, so it needs no backend or database."],
  ["Event", "PositionCreated · Claimed", "Emitted on every deposit and claim. The proof page links straight to both."],
];

export default function DocsPage() {
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <Nav />
      <main className="doc-page">
        <div className="wrap doc-head">
          <span className="eyebrow">Docs</span>
          <h1>Hypeflow Docs</h1>
          <p>How locking, vesting, claiming and public proof work on Hypeflow, and where to find every contract.</p>
        </div>

        <div className="wrap doc-grid">
          <DocsSidebar />

          <div className="doc-content">
            <DocSection n="00" id="overview" title="Overview">
              <p>
                Hypeflow brings token locks, vesting and streaming to Elysium. A creator deposits an ERC‑20 into one
                escrow contract with a schedule and a beneficiary; the beneficiary claims what has unlocked, whenever
                they like; and anyone can open a public proof page to verify the deposit, the schedule and every
                claim, without connecting a wallet.
              </p>
              <DocTable
                rows={[
                  ["Modes", "Hard lock (all at once) and linear vesting (gradual, with an optional cliff)"],
                  ["Escrow", "One non-upgradeable contract. No admin, no pause switch, no sweep function."],
                  ["Pilot fee", "0% app fee. You only pay network gas in HYPE."],
                  ["First flow", "Lock the dev-buy tokens from an Ascend launch, then share the proof link"],
                  ["Availability", "Live on Elysium testnet. Mainnet addresses are published here once deployed."],
                ]}
              />
            </DocSection>

            <DocSection n="01" id="getting-started" title="Getting started">
              <ol className="doc-steps">
                <li>
                  <b>Connect a wallet</b> from <Link href="/app">the app</Link>. Hypeflow runs on Elysium; if your
                  wallet is on another network it will prompt you to switch.
                </li>
                <li>
                  <b>Get testnet HYPE</b> for gas from the{" "}
                  <a href="https://elysium.kinetiq.xyz/testnet-faucet" target="_blank" rel="noopener">Elysium testnet faucet</a>.
                  There is no app fee during the pilot, so this is the only cost.
                </li>
                <li>
                  <b>Create a lock, or check what you can claim.</b> Open <Link href="/app/create">Create</Link> to
                  lock or vest a token, or <Link href="/app">Positions</Link> to see anything you&apos;ve created or
                  can claim.
                </li>
              </ol>
              <DocTable rows={[["Network", "Elysium Testnet"], ["Chain ID", "99801"], ["Native currency", "HYPE"]]} />
            </DocSection>

            <DocSection n="02" id="creating-a-lock" title="Creating a lock">
              <p>If the tokens came from an Ascend launch, copy the token address from the launch receipt. Then:</p>
              <ol className="doc-steps">
                <li><b>Paste the token address</b> and choose hard lock or linear vesting.</li>
                <li><b>Set the amount, beneficiary and schedule.</b> The beneficiary defaults to your own address.</li>
                <li><b>Approve the exact amount</b> for the escrow contract, then sign the create transaction.</li>
                <li><b>Share the proof link</b> from the confirmation screen, once the position is readable onchain.</li>
              </ol>
              <p>
                The schedule and beneficiary are fixed the moment the position is created. There is no edit, cancel
                or admin override, which is what makes the proof link worth sharing.
              </p>
            </DocSection>

            <DocSection n="03" id="modes" title="Hard lock vs. linear vesting">
              <DocTable
                head={["", "Hard lock", "Linear vesting"]}
                rows={[
                  ["Claimable before the end", "Exactly zero", "Grows every second after the cliff"],
                  ["At the cliff", "—", "Everything accrued since the start unlocks at once"],
                  ["At the end", "The full amount, in one claim", "The full amount, across any number of claims"],
                  ["Good for", "Team allocations, dev‑buy commitments", "Gradual unlocks, contributor vesting"],
                ]}
              />
              <p className="doc-note">
                <code>vested = total × (now − start) / (end − start)</code>, clamped to zero before the cliff and to
                the full total at or after the end. The contract and the app use the same formula, so the preview you
                see before signing matches what the chain will enforce.
              </p>
            </DocSection>

            <DocSection n="04" id="claiming" title="Claiming">
              <p>
                Only the address recorded as beneficiary can call <code>claim</code>, and it always pays that same
                address, never the caller of some other function or the creator. There&apos;s no minimum: claim as
                soon as the claimable amount is above zero, as many times as you like, until the position is fully
                claimed.
              </p>
            </DocSection>

            <DocSection n="05" id="public-proof" title="Public proof">
              <p>
                Every position gets a page at <code>/proof/[chainId]/[id]</code> that opens without a wallet. Every
                value on it, the token, amounts, schedule, status, and the deposit and claim transaction links, is
                read straight from the escrow contract and its events, not from a database.
              </p>
            </DocSection>

            <DocSection n="06" id="security" title="Escrow rules & security">
              <ul className="doc-list">
                <li>No admin, no owner, no upgrade path and no emergency withdraw function.</li>
                <li>A lock only succeeds if the escrow receives the exact deposited amount, so fee‑on‑transfer tokens are rejected automatically.</li>
                <li>Rebasing tokens aren&apos;t supported: the escrow books a fixed amount per position.</li>
                <li>Fuzz and invariant tests check that claims never exceed the deposit and that the escrow always stays solvent.</li>
                <li>Not audited. Treat the pilot on testnet accordingly.</li>
              </ul>
            </DocSection>

            <DocSection n="07" id="contracts" title="Contracts & network">
              <DocTable
                head={["Network", "Chain ID", "Escrow contract"]}
                rows={DEPLOYMENTS.map((d) => {
                  const addr = d.escrow;
                  const url = addr ? explorerAddress(d.chain.id, addr) : undefined;
                  const cell = addr ? (url ? <a href={url} target="_blank" rel="noopener">{addr}</a> : addr) : "Not deployed yet";
                  return [d.chain.name, String(d.chain.id), cell];
                })}
              />
              <span className="doc-side-lbl" style={{ display: "block", margin: "28px 0 12px" }}>Contract interface</span>
              <div className="doc-fns">
                {fns.map(([kind, sig, desc]) => (
                  <div key={sig} className="doc-fn">
                    <span className={`fn-kind k-${kind.toLowerCase()}`}>{kind}</span>
                    <code>{sig}</code>
                    <p>{desc}</p>
                  </div>
                ))}
              </div>
            </DocSection>

            <DocSection n="08" id="faq" title="FAQ" last>
              <div className="doc-faq">
                {faqs.map(([q, a]) => (
                  <details key={q}>
                    <summary>{q}</summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            </DocSection>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function DocSection({ n, id, title, last, children }: { n: string; id: string; title: string; last?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={`doc-sec${last ? " last" : ""}`}>
      <span className="doc-n">{n}</span>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function DocTable({ rows, head }: { rows: React.ReactNode[][]; head?: string[] }) {
  return (
    <div className="doc-table">
      {head && (
        <div className="doc-tr doc-th">
          {head.map((h) => <span key={h}>{h}</span>)}
        </div>
      )}
      {rows.map((row, i) => (
        <div className="doc-tr" key={i}>
          {row.map((cell, j) => <span key={j}>{cell}</span>)}
        </div>
      ))}
    </div>
  );
}
