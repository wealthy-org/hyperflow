/**
 * Imperative motion + interactions for the landing page.
 * Returns a dispose function so React (incl. Strict Mode double-mount) can tear everything down.
 */
export function initLanding(): () => void {
  const motionOk = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector(s) as T;
  const $$ = <T extends Element = HTMLElement>(s: string) => [...document.querySelectorAll(s)] as T[];
  const off: (() => void)[] = [];
  let alive = true;
  const on = <E extends Event = Event>(t: EventTarget, ev: string, fn: (e: E) => void, opt?: AddEventListenerOptions) => {
    const h = fn as EventListener;
    t.addEventListener(ev, h, opt);
    off.push(() => t.removeEventListener(ev, h, opt));
  };
  const observe = (cb: IntersectionObserverCallback, el: Element, opts?: IntersectionObserverInit) => {
    const o = new IntersectionObserver(cb, opts);
    o.observe(el);
    off.push(() => o.disconnect());
    return o;
  };
  const raf = (fn: FrameRequestCallback) => { const id = requestAnimationFrame(fn); off.push(() => cancelAnimationFrame(id)); };

  // ---------- Particle engine (hero H + CTA stream) ----------
  type P = { t: "p" | "s" | "d"; x: number; y: number; z: number; a: number; vy?: number; vx?: number; o?: number; v?: number; ph?: number };
  function particles(cv: HTMLCanvasElement, opts: { glyph: boolean; max: number }) {
    const ctx = cv.getContext("2d")!;
    const MINT = "151,247,219";
    let W = 0, H = 0, P: P[] = [], mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, rafId = 0, visible = true;
    let geo = { S: 0, cx: 0, cy: 0, pw: 0, l0: 0, l1: 0, r0: 0, r1: 0, top: 0, bot: 0 };
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const sg = sprite.getContext("2d")!, grd = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(230,255,248,1)"); grd.addColorStop(0.25, `rgba(${MINT},.85)`);
    grd.addColorStop(0.6, `rgba(${MINT},.18)`); grd.addColorStop(1, `rgba(${MINT},0)`);
    sg.fillStyle = grd; sg.fillRect(0, 0, 64, 64);
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

    function layout() {
      const dpr = Math.min(devicePixelRatio || 1, 1.75);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const wide = W > 900;
      let S: number, cx: number, cy: number;
      if (opts.glyph) { S = wide ? Math.min(H * 0.74, W * 0.5) : Math.min(W * 0.95, H * 0.5); cx = wide ? W * 0.6 : W * 0.5; cy = wide ? H * 0.44 : H * 0.34; }
      else { S = Math.min(H * 0.9, W * 0.5); cx = W * 0.5; cy = H * 0.5; }
      const pw = S * 0.27;
      geo = { S, cx, cy, pw, l0: cx - S / 2, l1: cx - S / 2 + pw, r0: cx + S / 2 - pw, r1: cx + S / 2, top: cy - S / 2, bot: cy + S / 2 };
      const n = Math.round(Math.min(wide ? opts.max : opts.max * 0.45, (W * H) / (wide ? 300 : 260)));
      P = Array.from({ length: n }, () => spawn(true));
    }
    // Crossbar centre line: low at the left pillar, high at the right (like the logo).
    const streamY = (x: number) => {
      const { l1, r0, cy, S } = geo, t = (x - l1) / (r0 - l1);
      return cy + S * 0.07 - S * 0.14 * smooth(t) + Math.sin(x * 0.004) * S * 0.015;
    };
    function spawn(init: boolean): P {
      const g = geo, z = Math.random() ** 1.6, r = Math.random();
      if (opts.glyph && r < 0.42) {
        const left = Math.random() < 0.5;
        return { t: "p", x: (left ? g.l0 : g.r0) + Math.random() * g.pw, y: g.top + Math.random() * g.S, vy: -(0.08 + Math.random() * 0.35), z, a: 0.35 + Math.random() * 0.65 };
      }
      if (r < 0.9) return { t: "s", x: init ? Math.random() * W : -20 - Math.random() * 80, y: 0, o: gauss(), v: 0.5 + Math.random() * 1.6 + z * 1.2, z, a: 0.3 + Math.random() * 0.7, ph: Math.random() * 6.28 };
      return { t: "d", x: Math.random() * W, y: Math.random() * H, vx: 0.05 + Math.random() * 0.2, vy: -0.05 + Math.random() * 0.1, z: 0.55 + Math.random() * 0.45, a: 0.08 + Math.random() * 0.25 };
    }
    function frame(time: number) {
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(2,11,10,0.42)"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      const g = geo, band = g.S * (opts.glyph ? 0.075 : 0.05);
      for (const p of P) {
        let x: number, y: number, alpha: number;
        if (p.t === "p") {
          p.y += p.vy!; if (p.y < g.top) p.y = g.bot;
          x = p.x; y = p.y; alpha = p.a * Math.min(1, Math.min(p.y - g.top, g.bot - p.y) / (g.S * 0.08));
        } else if (p.t === "s") {
          p.x += p.v!; if (p.x > W + 40) Object.assign(p, spawn(false));
          x = p.x;
          const inGap = opts.glyph && x > g.l0 && x < g.r1;
          const spread = band * (inGap ? 1 : 1.9 + (Math.abs(x - g.cx) / W) * 2);
          y = streamY(x) + p.o! * spread + Math.sin(time * 0.001 + p.ph! + x * 0.01) * 2;
          alpha = p.a * (inGap || !opts.glyph ? 1 : 0.55);
        } else {
          p.x += p.vx!; p.y += p.vy!;
          if (p.x > W + 20) p.x = -20; if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
          x = p.x; y = p.y; alpha = p.a;
        }
        x += (mx - 0.5) * 40 * p.z; y += (my - 0.5) * 26 * p.z;
        let size = 1.4 + p.z * 3.2;
        if (p.z > 0.93) { size *= 5.5; alpha *= 0.12; } else if (p.z < 0.2) alpha *= 0.55;
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.drawImage(sprite, x - size, y - size, size * 2, size * 2);
      }
      ctx.globalAlpha = 1;
      if (alive && motionOk && visible) rafId = requestAnimationFrame(frame);
    }
    const still = () => { for (let i = 0; i < 40; i++) frame(i * 16); };
    layout();
    off.push(() => cancelAnimationFrame(rafId));
    if (motionOk) {
      on(window, "pointermove", (e: PointerEvent) => { tx = e.clientX / innerWidth; ty = e.clientY / innerHeight; }, { passive: true });
      observe((es) => { visible = es[0].isIntersecting; cancelAnimationFrame(rafId); if (visible) rafId = requestAnimationFrame(frame); }, cv);
    } else still();
    let rt: ReturnType<typeof setTimeout>;
    on(window, "resize", () => { clearTimeout(rt); rt = setTimeout(() => { layout(); if (!motionOk) still(); }, 150); });
    off.push(() => clearTimeout(rt));
  }
  particles($<HTMLCanvasElement>("#hxCanvas"), { glyph: true, max: 4200 });
  particles($<HTMLCanvasElement>("#ctaCanvas"), { glyph: false, max: 1600 });

  // ---------- Hero vesting widget (example data) ----------
  {
    const TOTAL = 25_000_000, t0 = performance.now();
    const pctEl = $("#hxPct"), barEl = $("#hxBar"), clEl = $("#hxClaim");
    const vw = () => {
      if (!alive) return;
      const pct = 38 + (((performance.now() - t0) / 1000) * 0.35) % 60;
      pctEl.textContent = pct.toFixed(2) + "%";
      barEl.style.width = pct + "%";
      clEl.textContent = Math.round((TOTAL * pct) / 100 - TOTAL * 0.3).toLocaleString("en-US");
      if (motionOk) raf(vw);
    };
    vw();
  }

  // ---------- Scroll reveals ----------
  {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.2, rootMargin: "0px 0px -60px 0px" });
    $$(".split,.fade").forEach((el) => io.observe(el));
    off.push(() => io.disconnect());
  }

  // ---------- Sticky scroll scene ----------
  {
    const track = $("#scrolly"), lis = $$("#stepsList li"), scenes = $$(".scene"), rail = $("#railFill");
    let cur = 0;
    const onScroll = () => {
      if (innerWidth <= 900) return;
      const r = track.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
      rail.style.height = p * 100 + "%";
      const idx = Math.min(2, Math.floor(p * 3 * 0.999));
      if (idx !== cur) {
        cur = idx;
        lis.forEach((l, i) => l.classList.toggle("on", i === idx));
        scenes.forEach((s, i) => s.classList.toggle("on", i === idx));
      }
    };
    on(window, "scroll", onScroll, { passive: true });
    onScroll();
  }

  // ---------- Mode simulator ----------
  {
    const TOTAL = 25_000_000, DAYS = 365, UNLOCK = 270;
    const X0 = 40, X1 = 620, Y0 = 260, Y1 = 30;
    const sx = (d: number) => X0 + (d / DAYS) * (X1 - X0), sy = (v: number) => Y0 - v * (Y0 - Y1);
    const seg = $("#seg"), time = $<HTMLInputElement>("#time"), cliff = $<HTMLInputElement>("#cliff");
    let mode: "hard" | "linear" = "hard", playing = motionOk, t = 0, last = 0;
    const copy = {
      hard: ["Hard lock", ["Tokens stay in escrow until one timestamp.", "Before unlock, claimable is exactly zero.", "At or after unlock, the beneficiary claims the full amount in one go."]],
      linear: ["Linear vesting", ["Nothing is claimable before the cliff.", "At the cliff, everything accrued since the start unlocks at once.", "Then it streams every second until the end. The last claim takes the exact remainder."]],
    } as const;
    // Same rule as HypeflowEscrow._vested
    const vested = (d: number) => {
      if (mode === "hard") return d >= UNLOCK ? 1 : 0;
      if (d < +cliff.value) return 0;
      return Math.min(1, d / DAYS);
    };
    $("#cGrid").innerHTML =
      [0, 0.25, 0.5, 0.75, 1].map((v) => `<line class="gl" x1="${X0}" x2="${X1}" y1="${sy(v)}" y2="${sy(v)}"/><text class="ax" x="0" y="${sy(v) + 4}">${v * 100}%</text>`).join("") +
      [0, 90, 180, 270, 365].map((d) => `<text class="ax" x="${sx(d) - 10}" y="285">d${d}</text>`).join("");
    const drawCurve = () => {
      const pts: string[] = [];
      for (let d = 0; d <= DAYS; d++) pts.push((d ? "L" : "M") + sx(d).toFixed(1) + " " + sy(vested(d)).toFixed(1));
      const line = pts.join("");
      $("#cLine").setAttribute("d", line);
      $("#cArea").setAttribute("d", line + `L${X1} ${Y0}L${X0} ${Y0}Z`);
      $("#cGhost").setAttribute("d", mode === "linear" ? `M${sx(0)} ${sy(0)}L${sx(DAYS)} ${sy(1)}` : "");
      const md = mode === "hard" ? UNLOCK : +cliff.value;
      $("#cMark").innerHTML = `<line x1="${sx(md)}" x2="${sx(md)}" y1="${Y1}" y2="${Y0}" stroke="rgba(151,247,219,.3)"/><text x="${sx(md) + 6}" y="${Y1 + 12}">${mode === "hard" ? "unlock" : "cliff"}</text>`;
    };
    const setT = (d: number) => {
      t = d; time.value = String(d);
      time.style.setProperty("--p", (d / DAYS) * 100 + "%");
      const v = vested(d);
      const scrub = $("#cScrub"), dot = $("#cDot");
      scrub.setAttribute("x1", String(sx(d))); scrub.setAttribute("x2", String(sx(d)));
      dot.setAttribute("cx", String(sx(d))); dot.setAttribute("cy", String(sy(v)));
      $("#rDay").textContent = String(Math.floor(d));
      $("#rPct").textContent = (v * 100).toFixed(1) + "%";
      $("#rAmt").textContent = Math.floor(TOTAL * v).toLocaleString("en-US");
    };
    const setMode = (m: "hard" | "linear") => {
      mode = m; seg.dataset.mode = m;
      seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
      $("#mTitle").textContent = copy[m][0];
      $("#mList").innerHTML = copy[m][1].map((s) => `<li>${s}</li>`).join("");
      ($("#cliffCtrl") as HTMLElement).hidden = m !== "linear";
      drawCurve(); setT(t);
    };
    on(seg, "click", (e: MouseEvent) => {
      const b = (e.target as HTMLElement).closest("button");
      if (b) setMode(b.dataset.mode as "hard" | "linear");
    });
    on(cliff, "input", () => {
      $("#cliffOut").textContent = "day " + cliff.value;
      cliff.style.setProperty("--p", (+cliff.value / 240) * 100 + "%");
      drawCurve(); setT(t);
    });
    cliff.style.setProperty("--p", "50%");
    const icon = $("#playIc"), btn = $("#playBtn");
    const pause = () => { playing = false; icon.innerHTML = '<path d="M3 2l9 5-9 5z"/>'; btn.setAttribute("aria-label", "Play"); };
    const loop = (ts: number) => {
      if (!playing || !alive) return;
      if (last) { let d = t + ((ts - last) / 1000) * 55; if (d > DAYS) d = 0; setT(d); }
      last = ts; raf(loop);
    };
    const play = () => { playing = true; icon.innerHTML = '<rect x="3" y="2" width="3" height="10" rx="1"/><rect x="8" y="2" width="3" height="10" rx="1"/>'; btn.setAttribute("aria-label", "Pause"); last = 0; raf(loop); };
    on(btn, "click", () => (playing ? pause() : play()));
    on(time, "input", () => { pause(); setT(+time.value); });
    const chart = $("#chart");
    const fromEvt = (e: PointerEvent) => {
      const r = chart.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 640;
      return Math.max(0, Math.min(DAYS, ((x - X0) / (X1 - X0)) * DAYS));
    };
    let drag = false;
    on(chart, "pointerdown", (e: PointerEvent) => { drag = true; chart.setPointerCapture(e.pointerId); pause(); setT(fromEvt(e)); });
    on(chart, "pointermove", (e: PointerEvent) => { if (drag) setT(fromEvt(e)); });
    on(chart, "pointerup", () => { drag = false; });
    setMode("hard");
    if (!motionOk) { pause(); setT(200); }
    else observe((es) => { if (es[0].isIntersecting && playing) { last = 0; raf(loop); } }, chart);
  }

  // ---------- Proof: tilt, checks, countdown ----------
  {
    const card = $("#tilt");
    if (motionOk && matchMedia("(hover:hover)").matches) {
      on(card, "pointermove", (e: PointerEvent) => {
        const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.transform = `rotateY(${(px - 0.5) * 14}deg) rotateX(${(0.5 - py) * 12}deg)`;
        card.style.setProperty("--gx", px * 100 + "%"); card.style.setProperty("--gy", py * 100 + "%"); card.style.setProperty("--go", "1");
      });
      on(card, "pointerleave", () => { card.style.transform = ""; card.style.setProperty("--go", ".6"); });
    }
    const items = $$("#checks li");
    const timers: ReturnType<typeof setTimeout>[] = [];
    off.push(() => timers.forEach(clearTimeout));
    const o = observe((es) => {
      if (!es[0].isIntersecting) return;
      o.disconnect();
      items.forEach((li, i) => timers.push(setTimeout(() => li.classList.add("on"), motionOk ? 250 + i * 280 : 0)));
    }, $("#checks"), { threshold: 0.4 });

    const unlock = new Date(Date.now() + ((89 * 24 + 6) * 3600 + 1800) * 1000);
    $("#unlockAt").textContent = unlock.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) + " · " + unlock.toISOString().slice(0, 16).replace("T", " ") + " UTC";
    const cd: Record<string, HTMLElement> = {};
    $$("#countdown b").forEach((b) => (cd[b.dataset.k!] = b));
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      let s = Math.max(0, Math.floor((unlock.getTime() - Date.now()) / 1000));
      cd.d.textContent = pad(Math.floor(s / 86400)); s %= 86400;
      cd.h.textContent = pad(Math.floor(s / 3600)); s %= 3600;
      cd.m.textContent = pad(Math.floor(s / 60)); cd.s.textContent = pad(s % 60);
    };
    tick();
    const iv = setInterval(tick, 1000);
    off.push(() => clearInterval(iv));
  }

  // ---------- Spotlight bento ----------
  $$(".spot").forEach((el) => on(el, "pointermove", (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", e.clientX - r.left + "px");
    el.style.setProperty("--my", e.clientY - r.top + "px");
  }));

  // ---------- Typing terminal (example output) ----------
  {
    const body = $("#termBody");
    const scenes = [
      { cmd: "hypeflow claimable --id 1", out: [["d", "reading position #1 on chain 99801…"], ["v", "mode        linear · cliff passed"], ["v", "vested      12,500,000 / 25,000,000"], ["v", "claimed      5,000,000"], ["p", "claimable    7,500,000"]] },
      { cmd: "hypeflow claim --id 1", out: [["d", "caller is the recorded beneficiary ✓"], ["d", "sending tx…"], ["v", "tx confirmed"], ["p", "✓ 7,500,000 claimed to beneficiary"], ["d", "proof page updated with claim tx"]] },
    ];
    const wait = (ms: number) => new Promise<void>((r) => { const id = setTimeout(r, motionOk ? ms : 0); off.push(() => clearTimeout(id)); });
    const line = (html: string) => { const s = document.createElement("span"); s.className = "term-line"; s.innerHTML = html; body.appendChild(s); return s; };
    const play = async (sc: (typeof scenes)[number]) => {
      const l = line('<span class="p">$ </span><span class="v"></span><span class="cursor"></span>'), v = l.querySelector(".v")!;
      for (const ch of sc.cmd) { if (!alive) return; v.textContent += ch; await wait(38); }
      l.querySelector(".cursor")?.remove(); await wait(350);
      for (const [c, txt] of sc.out) { if (!alive) return; line(`<span class="${c}">${txt}</span>`); await wait(260); }
    };
    let started = false;
    const o = observe(async (es) => {
      if (!es[0].isIntersecting || started) return;
      started = true; o.disconnect();
      let i = 0;
      while (alive) {
        body.innerHTML = "";
        await play(scenes[i]);
        i = (i + 1) % scenes.length;
        await wait(2800);
        if (!motionOk) break;
      }
    }, $("#term"), { threshold: 0.3 });
  }

  return () => {
    alive = false;
    off.forEach((f) => f());
  };
}
