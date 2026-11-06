import Image from "next/image";
import Link from "next/link";
import { Arrow, Eyebrow, SplitHeading } from "../ui";

export function Trust() {
  return (
    <section id="trust" style={{ paddingTop: 0 }}>
      <div className="glow" style={{ width: 750, height: 750, left: "50%", top: 0, transform: "translateX(-50%)" }} />
      <div className="wrap">
        <div className="sec-head">
          <div>
            <Eyebrow>Escrow rules</Eyebrow>
            <SplitHeading text="Simple rules," em="written in code." />
          </div>
          <p className="lead fade">One non-upgradeable contract. No admin, no pause switch, no way to edit a schedule after it&apos;s created.</p>
        </div>
        <div className="bento">
          <div className="spot b1 fade">
            <div className="big">0 <em>admin keys</em></div>
            <h4>Nobody can move your tokens early</h4>
            <p>There is no owner, no upgrade path and no emergency withdraw. Not the creator, not Hypeflow.</p>
          </div>
          <div className="spot b2 fade">
            <div className="ic"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="10" cy="7" r="3" /><path d="M4 17c1-3 3.5-4.5 6-4.5s5 1.5 6 4.5" /></svg></div>
            <h4>Beneficiary only</h4>
            <p>Claims always pay the recorded beneficiary. Every other caller is rejected.</p>
          </div>
          <div className="spot b3 fade">
            <div className="ic"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M4 10h12M10 4v12" /><circle cx="10" cy="10" r="7" /></svg></div>
            <h4>Exact deposits</h4>
            <p>A lock only succeeds if the escrow receives the exact amount, so fee-on-transfer tokens are rejected.</p>
          </div>
          <div className="spot b4 fade">
            <div className="ic"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M10 3l6 3v4c0 4-3 6-6 7-3-1-6-3-6-7V6z" /></svg></div>
            <div className="code">
              invariant <b>claimed ≤ total</b> for every position<br />
              invariant <b>balance == Σ(total − claimed)</b><br />
              <span style={{ color: "var(--faint)" }}>8,192 randomized calls · 0 violations</span>
            </div>
            <h4>Tested invariants</h4>
            <p>Fuzz and invariant tests check that claims never exceed the deposit and the escrow always stays solvent.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export const faqs: [string, string][] = [
  ["Which tokens can I lock?", "Standard ERC‑20 tokens with fixed balances and transfer amounts. Fee-on-transfer tokens are rejected and rebasing tokens aren't supported. To lock HYPE, wrap it to WHYPE using the official address for the active network."],
  ["What does it cost?", "The app fee is zero during the pilot. You only pay network gas in HYPE."],
  ["Can I cancel or change a lock?", "No. Once a position is created, its schedule and beneficiary are fixed. That's what makes the proof worth sharing."],
  ['What does "streaming" mean here?', "In linear vesting the claimable balance grows every second. The beneficiary pulls it whenever they like; tokens aren't pushed automatically."],
  ["Do I need to launch on Ascend?", "No. Ascend is the first flow we support, but any standard ERC‑20 address works."],
  ["Is it live on mainnet?", "Not yet. The pilot runs on Elysium testnet first. Verified contract addresses will be published here before the public release."],
];

export function Faq() {
  return (
    <section id="faq" style={{ paddingTop: 0 }}>
      <div className="wrap faq">
        <div className="faq-side">
          <Eyebrow>FAQ</Eyebrow>
          <SplitHeading text="Questions," em="answered." />
        </div>
        <div className="faq-list fade">
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>{q}<span className="pm" /></summary>
              <div className="ans"><div><p>{a}</p></div></div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Cta() {
  return (
    <section id="create" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="cta">
          <canvas id="ctaCanvas" aria-hidden="true" />
          <div>
            <Eyebrow>Hypeflow pilot</Eyebrow>
            <SplitHeading text="Set the schedule." em="Share the proof." />
            <p className="fade">Hypeflow brings token locks, vesting, and streaming to Elysium.</p>
            <div className="cta-btns fade">
              <a className="btn btn-primary" href="/app/create">Create a lock <Arrow /></a>
              <a className="btn btn-ghost" href="https://app.ascendlaunch.xyz/" target="_blank" rel="noopener">Launch on Ascend ↗</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div>
            <Link className="brand" href="/"><Image src="/logo.jpeg" alt="" width={30} height={30} />Hypeflow</Link>
            <p style={{ marginTop: 14, maxWidth: 300 }}>Token locks, vesting, and streaming on Elysium.</p>
          </div>
          <div className="foot-cols">
            <div><span>Product</span><Link href="/#how">How it works</Link><Link href="/#modes">Lock &amp; vest</Link><Link href="/#proof">Proof</Link></div>
            <div><span>Ecosystem</span><a href="https://elysium.kinetiq.xyz/docs/connecting-to-elysium" target="_blank" rel="noopener">Elysium</a><a href="https://app.ascendlaunch.xyz/" target="_blank" rel="noopener">Ascend</a></div>
            <div><span>Help</span><Link href="/#faq">FAQ</Link><a href="/docs">Docs</a></div>
          </div>
        </div>
        <div className="wordmark" aria-hidden="true">Hypeflow</div>
      </div>
      <div className="legal wrap"><span>Contracts not yet audited · pilot on testnet</span><span>Gas paid in HYPE</span></div>
    </footer>
  );
}
