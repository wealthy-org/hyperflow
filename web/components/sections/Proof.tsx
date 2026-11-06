import { Check, Eyebrow, SplitHeading } from "../ui";

const checks: [string, string][] = [
  ["Chain & escrow contract", "99801"],
  ["Token address", "ERC‑20"],
  ["Deposit amount", "exact"],
  ["Creator & beneficiary", "fixed"],
  ["Schedule & status", "local + UTC"],
  ["Deposit & claim transactions", "explorer"],
];

export function Proof() {
  return (
    <section id="proof">
      <div className="glow" style={{ width: 700, height: 700, right: -200, top: "20%" }} />
      <div className="wrap proof-grid">
        <div>
          <Eyebrow>Public proof</Eyebrow>
          <SplitHeading text="One link your community" em="can check." />
          <p className="lead fade" style={{ marginTop: 24 }}>Each position gets a public page that opens without a wallet. Every value on it is read from the contract.</p>
          <ul className="checks" id="checks">
            {checks.map(([label, tag]) => (
              <li key={label}><i><Check /></i>{label}<span>{tag}</span></li>
            ))}
          </ul>
        </div>
        <div className="fade">
          <div className="tilt-wrap">
            <div className="tilt" id="tilt" aria-label="Example proof page">
              <div className="t-head"><span>Position #1 · Elysium testnet</span><span className="ok"><i />Locked</span></div>
              <div className="t-body">
                <div className="t-cap">Creator tokens locked on Hypeflow</div>
                <div className="amount">25,000,000<small>EXAMPLE</small></div>
                <div className="countdown" id="countdown" aria-label="Time until unlock">
                  {[["d", "Days"], ["h", "Hours"], ["m", "Min"], ["s", "Sec"]].map(([k, l]) => (
                    <div key={k}><b data-k={k}>--</b><span>{l}</span></div>
                  ))}
                </div>
                <dl className="rows">
                  <div><dt>Mode</dt><dd>Hard lock</dd></div>
                  <div><dt>Beneficiary</dt><dd>0x51b0…7d24</dd></div>
                  <div><dt>Unlocks</dt><dd id="unlockAt">—</dd></div>
                </dl>
              </div>
              <div className="t-foot"><span className="chip">Deposit tx ↗</span><span className="chip">Escrow contract ↗</span><span className="chip">Copy link</span></div>
            </div>
          </div>
          <p className="note">Illustrative example · not a real position</p>
        </div>
      </div>
    </section>
  );
}

export function Claim() {
  return (
    <section id="claim" style={{ paddingTop: 0 }}>
      <div className="wrap proof-grid">
        <div className="term glass fade" id="term">
          <div className="term-bar"><i /><i /><i /><span>hypeflow · claim</span></div>
          <div className="term-body" id="termBody" />
        </div>
        <div>
          <Eyebrow>Claim</Eyebrow>
          <SplitHeading text="When it unlocks," em="it's yours." />
          <p className="lead fade" style={{ marginTop: 24 }}>The beneficiary connects a wallet and Hypeflow reads the claimable amount from the contract. One signature sends it, only ever to the recorded beneficiary.</p>
        </div>
      </div>
    </section>
  );
}
