import type { ReactNode } from "react";

/** Heading whose words rise out of a mask when scrolled into view (driven by LandingEffects). */
export function SplitHeading({ text, em, as: Tag = "h2" }: { text: string; em?: string; as?: "h2" | "h1" }) {
  let i = 0;
  // The gap between words must sit *outside* .w: .w is an overflow-hidden inline-block (for the
  // slide-up mask), and a browser trims whitespace at the edge of an inline-block box, so a
  // trailing space placed inside .w silently disappears and words run together.
  const words = (s: string) =>
    s.split(/\s+/).filter(Boolean).flatMap((w) => {
      const key = i;
      const delay = i++ * 70;
      return [
        <span key={key} className="w">
          <span style={{ transitionDelay: `${delay}ms` }}>{w}</span>
        </span>,
        " ",
      ];
    });
  return (
    <Tag className="h2 split" aria-label={em ? `${text} ${em}` : text}>
      <span aria-hidden="true">
        {words(text)}
        {em && <em>{words(em)}</em>}
      </span>
    </Tag>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

export function Arrow({ width = 1.6 }: { width?: number }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={width}>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export function Check() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M2.5 6.5l2.2 2L9.5 3.5" />
    </svg>
  );
}
