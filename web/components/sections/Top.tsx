import Image from "next/image";
import Link from "next/link";
import { Arrow } from "../ui";

export function Nav() {
  return (
    <nav className="fx" aria-label="Main">
      <div className="nav-pill">
        <Link className="brand" href="/"><Image src="/logo.jpeg" alt="" width={30} height={30} priority />Hypeflow</Link>
        <div className="nav-links">
          <Link href="/#how">How it works</Link>
          <Link href="/#modes">Lock &amp; vest</Link>
          <Link href="/#proof">Proof</Link>
          <Link href="/#faq">FAQ</Link>
          <a href="/docs">Docs</a>
        </div>
        <a className="btn btn-primary" href="/app">Launch app <Arrow /></a>
      </div>
    </nav>
  );
}

export function Hero() {
  return (
    <header className="hx">
      <canvas id="hxCanvas" aria-hidden="true" />
      <div className="hx-ui">
        <div className="live"><i />Pilot · Elysium testnet 99801</div>
        <div className="hx-title">
          <div className="hx-est">Token locks · vesting · streaming</div>
          <h1>
            <span className="row">Locked</span>
            <span className="row"><span className="serif">in</span>Flow.</span>
          </h1>
        </div>
        <div className="hx-card glass">
          <p>Set an unlock schedule for any ERC‑20 on Elysium, then share one public link that proves it onchain.</p>
          <div className="stats">
            <div><span>App fee</span><b>0%</b></div>
            <div><span>Admin keys</span><b>None</b></div>
          </div>
          <a className="go" href="/app/create">Create a lock <Arrow width={1.4} /></a>
        </div>
        <div className="hx-widget" aria-hidden="true">
          <div className="lbl">Example · linear vesting</div>
          <div className="box glass">
            <div className="top"><span>Vested</span><b id="hxPct">0.00%</b></div>
            <div className="bar"><i id="hxBar" /></div>
            <div className="row2">
              <div><span>Cliff</span>passed</div>
              <div><span>Claimable</span><b id="hxClaim" style={{ fontWeight: 400 }}>0</b></div>
            </div>
          </div>
        </div>
        <div className="hx-scroll" aria-hidden="true">Scroll<i /></div>
      </div>
    </header>
  );
}

const Star = () => (
  <svg viewBox="0 0 10 10"><path d="M5 0L6.2 3.8 10 5 6.2 6.2 5 10 3.8 6.2 0 5 3.8 3.8z" fill="currentColor" /></svg>
);
const items: [string, "plain" | "em" | "o"][] = [
  ["Hard lock", "plain"], ["linear vesting", "em"], ["Public proof", "o"],
  ["Gas in HYPE", "plain"], ["built for Ascend", "em"], ["No admin keys", "o"],
];

export function Marquee() {
  // Rendered twice so the -50% translate loops seamlessly.
  const row = (copy: number) =>
    items.flatMap(([t, k], i) => [
      k === "em" ? <em key={`t${copy}${i}`}>{t}</em> : <span key={`t${copy}${i}`} className={k === "o" ? "o" : undefined}>{t}</span>,
      <Star key={`s${copy}${i}`} />,
    ]);
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">{row(0)}{row(1)}</div>
    </div>
  );
}
