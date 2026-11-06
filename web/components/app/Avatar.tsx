/** Deterministic mint-toned gradient avatar derived from an address (replaces RainbowKit's emoji). */
export function Avatar({ address, size = 28 }: { address?: string; size?: number }) {
  const hex = (address ?? "0x0").toLowerCase().replace(/^0x/, "").padEnd(40, "0");
  const b = (i: number) => parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  // Stay inside the brand range: teal → mint → pale green.
  const h1 = 150 + (b(0) % 30), h2 = 160 + (b(1) % 30), h3 = 140 + (b(2) % 40);
  const x1 = 15 + (b(3) % 70), y1 = 15 + (b(4) % 70), x2 = 15 + (b(5) % 70), y2 = 15 + (b(6) % 70);
  const rot = b(7) * 1.4;
  const bg = [
    `radial-gradient(circle at ${x1}% ${y1}%, hsl(${h1} 85% 78%) 0%, transparent 55%)`,
    `radial-gradient(circle at ${x2}% ${y2}%, hsl(${h2} 70% 45%) 0%, transparent 60%)`,
    `conic-gradient(from ${rot}deg, hsl(${h3} 60% 22%), hsl(${h2} 70% 38%), hsl(${h1} 60% 18%), hsl(${h3} 60% 22%))`,
  ].join(",");
  return <span className="avatar" style={{ width: size, height: size, background: bg }} aria-hidden="true" />;
}

/** Same avatar in the shape RainbowKit's `avatar` prop expects (used inside its modals). */
export function RkAvatar({ address, size }: { address: string; size: number }) {
  return <Avatar address={address} size={size} />;
}
