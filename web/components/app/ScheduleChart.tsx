import { vestedAt, type Mode } from "@/lib/escrow";

type Props = { mode: Mode; start: number; cliff: number; end: number; now?: number; height?: number };

/** Unlock curve for a schedule, with an optional "now" marker. Pure SVG, no data fetching. */
export function ScheduleChart({ mode, start, cliff, end, now, height = 150 }: Props) {
  const W = 400, H = height, X0 = 8, X1 = W - 8, Y0 = H - 22, Y1 = 14;
  if (!(end > start)) return <div className="chart-empty" style={{ height }}>Set a schedule to preview it</div>;
  // Pad the timeline so the before/after flat parts are visible.
  const pad = (end - start) * 0.12;
  const t0 = start - pad, t1 = end + pad;
  const sx = (t: number) => X0 + ((t - t0) / (t1 - t0)) * (X1 - X0);
  const sy = (v: number) => Y0 - v * (Y0 - Y1);
  const S = 1_000_000n;
  const v = (t: number) => Number(vestedAt(t, { total: S, mode, start, cliff, end })) / 1e6;
  const pts: string[] = [];
  const N = 160;
  for (let i = 0; i <= N; i++) {
    const t = t0 + ((t1 - t0) * i) / N;
    pts.push(`${i ? "L" : "M"}${sx(t).toFixed(1)} ${sy(v(t)).toFixed(1)}`);
  }
  // Make the vertical jumps exact.
  const jump = mode === "hard" ? end : cliff;
  const line = pts.join("");
  const nowX = now !== undefined ? Math.min(X1, Math.max(X0, sx(now))) : undefined;
  const all: [number, string][] = mode === "hard" ? [[start, "lock"], [end, "unlock"]] : [[start, "start"], ...(cliff > start ? [[cliff, "cliff"] as [number, string]] : []), [end, "end"]];
  // Drop a label that would collide with the previous one (e.g. a short cliff right after start).
  const marks = all.filter(([t], i) => i === 0 || i === all.length - 1 || sx(t) - sx(all[i - 1][0]) > 44);
  return (
    <svg className="sched" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${mode === "hard" ? "Hard lock" : "Linear vesting"} schedule`}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#97F7DB" stopOpacity=".3" />
          <stop offset="1" stopColor="#97F7DB" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={X0} x2={X1} y1={Y0} y2={Y0} stroke="rgba(151,247,219,.15)" />
      <path d={`${line}L${X1} ${Y0}L${X0} ${Y0}Z`} fill="url(#sg)" />
      <path d={line} fill="none" stroke="#97F7DB" strokeWidth={2} strokeLinejoin="round" className="sched-line" />
      <line x1={sx(jump)} x2={sx(jump)} y1={Y1} y2={Y0} stroke="rgba(151,247,219,.25)" strokeDasharray="2 4" />
      {marks.map(([t, l]) => (
        <text key={l} x={sx(t)} y={H - 6} textAnchor="middle" className="sched-ax">{l}</text>
      ))}
      {nowX !== undefined && (
        <g>
          <line x1={nowX} x2={nowX} y1={Y1 - 6} y2={Y0} stroke="#EAFFF8" strokeOpacity=".5" />
          <circle cx={nowX} cy={sy(v(now!))} r={4.5} fill="#020B0A" stroke="#97F7DB" strokeWidth={2} />
          <text x={nowX} y={Y1 - 8} textAnchor="middle" className="sched-now">now</text>
        </g>
      )}
    </svg>
  );
}
