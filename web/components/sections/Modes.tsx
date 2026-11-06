import { Eyebrow, SplitHeading } from "../ui";

export function Modes() {
  return (
    <section id="modes">
      <div className="glow" style={{ width: 800, height: 800, left: -300, top: 0 }} />
      <div className="wrap">
        <div className="sec-head">
          <div>
            <Eyebrow>Two modes</Eyebrow>
            <SplitHeading text="A hard stop, or" em="a steady stream." />
          </div>
          <p className="lead fade">Drag through time and watch what the beneficiary can claim. Both modes use the same escrow contract and the same formula the contract runs.</p>
        </div>

        <div className="sim fade">
          <div className="sim-side">
            <div className="seg" id="seg" data-mode="hard" role="group" aria-label="Mode">
              <span className="pillbg" />
              <button type="button" aria-pressed="true" data-mode="hard">Hard lock</button>
              <button type="button" aria-pressed="false" data-mode="linear">Linear vesting</button>
            </div>
            <div className="sim-desc glass">
              <h3 id="mTitle">Hard lock</h3>
              <ul id="mList" />
              <div className="ctrl" id="cliffCtrl" hidden>
                <label htmlFor="cliff">Cliff <b id="cliffOut">day 120</b></label>
                <input type="range" id="cliff" min={0} max={240} defaultValue={120} />
              </div>
            </div>
          </div>

          <div className="sim-chart glass">
            <div className="readout" aria-live="polite">
              <div><span>Day</span><b id="rDay">0</b></div>
              <div><span>Vested</span><b id="rPct">0%</b></div>
              <div className="hl"><span>Claimable</span><b id="rAmt">0</b></div>
            </div>
            <svg id="chart" viewBox="0 0 640 300" role="img" aria-label="Unlock schedule chart">
              <defs>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#97F7DB" stopOpacity=".35" />
                  <stop offset="1" stopColor="#97F7DB" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g id="cGrid" />
              <path id="cArea" fill="url(#area)" />
              <path id="cGhost" fill="none" stroke="rgba(151,247,219,.25)" strokeWidth={1.5} strokeDasharray="4 6" />
              <path id="cLine" fill="none" stroke="#97F7DB" strokeWidth={2.5} strokeLinejoin="round" />
              <g id="cMark" />
              <line id="cScrub" y1="20" y2="260" stroke="#97F7DB" strokeOpacity=".5" strokeDasharray="2 4" />
              <circle id="cDot" r="6" fill="#020B0A" stroke="#97F7DB" strokeWidth={2.5} />
            </svg>
            <div className="play">
              <button type="button" id="playBtn" aria-label="Pause">
                <svg viewBox="0 0 14 14" fill="currentColor" id="playIc"><rect x="3" y="2" width="3" height="10" rx="1" /><rect x="8" y="2" width="3" height="10" rx="1" /></svg>
              </button>
              <input type="range" id="time" min={0} max={365} defaultValue={0} step={0.5} aria-label="Time in days" />
            </div>
          </div>
        </div>
        <p className="note">Example: 25,000,000 tokens · 365‑day schedule</p>
      </div>
    </section>
  );
}
