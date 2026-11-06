import { Eyebrow, SplitHeading } from "../ui";

const steps = [
  ["01 · Ascend", "Launch with a dev buy", "Launch on Ascend and route the dev buy to the wallet that will create the lock. Copy the token address from the launch receipt."],
  ["02 · Hypeflow", "Lock or vest it", "Enter the ERC‑20, amount, beneficiary and dates. Review the summary, approve the exact amount, then sign the lock."],
  ["03 · Onchain", "Share the proof", "Post one link with your launch announcement. When the schedule unlocks, the beneficiary claims straight from Hypeflow."],
];

export function HowItWorks() {
  return (
    <section id="how" className="scrolly">
      <div className="scrolly-track" id="scrolly">
        <div className="scrolly-sticky">
          <div className="glow" style={{ width: 700, height: 700, right: -200, top: "10%" }} />
          <div className="wrap scrolly-grid">
            <div>
              <Eyebrow>How it works</Eyebrow>
              <SplitHeading text="Launch. Lock." em="Prove." />
              <div className="steps-list" id="stepsList">
                <div className="rail"><i id="railFill" /></div>
                <ol style={{ listStyle: "none" }}>
                  {steps.map(([n, h, p], i) => (
                    <li key={n} className={i === 0 ? "on" : undefined}>
                      <span className="n">{n}</span><h3>{h}</h3><p>{p}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="stage" aria-label="Illustrative product screens">
              <div className="scene on" data-scene="0">
                <div className="panel glass">
                  <div className="panel-h"><span>Ascend · launch receipt</span><span className="ok"><i />Success</span></div>
                  <div className="tok"><div className="tok-ic">EX</div><div><b>Example Token</b><span>EXAMPLE · ERC‑20</span></div></div>
                  <dl className="rows">
                    <div><dt>Event</dt><dd>Launched</dd></div>
                    <div><dt>Dev buy</dt><dd>25,000,000 EXAMPLE</dd></div>
                    <div><dt>Sent to</dt><dd>creator wallet</dd></div>
                    <div><dt>Token</dt><dd>0x7a3f…c91e</dd></div>
                    <div><dt>Next</dt><dd style={{ color: "var(--mint)" }}>Lock on Hypeflow →</dd></div>
                  </dl>
                </div>
              </div>

              <div className="scene" data-scene="1">
                <div className="panel glass">
                  <div className="panel-h"><span>Hypeflow · create lock</span><span>Hard lock</span></div>
                  <div className="field"><span>Token</span><b>0x7a3f…c91e · EXAMPLE</b></div>
                  <div className="field"><span>Amount</span><b>25,000,000</b></div>
                  <div className="field"><span>Beneficiary</span><b>0x51b0…7d24</b></div>
                  <div className="field"><span>Unlocks</span><b>in 90 days · local + UTC</b></div>
                  <div className="steps-btn"><div>1 · Approve</div><div>2 · Lock</div></div>
                </div>
              </div>

              <div className="scene" data-scene="2">
                <div className="panel glass" style={{ textAlign: "center" }}>
                  <div className="panel-h"><span>Public proof</span><span className="ok"><i />Confirmed</span></div>
                  <div className="seal">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-.03em" }}>Creator tokens locked on Hypeflow</div>
                  <div style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>25,000,000 EXAMPLE · unlocks in 90 days</div>
                  <div className="url"><span>/proof/99801/1</span><span>Copy link</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
