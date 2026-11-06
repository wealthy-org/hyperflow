"use client";

import { useEffect, useState } from "react";

const SECTIONS: [string, string][] = [
  ["overview", "Overview"],
  ["getting-started", "Getting started"],
  ["creating-a-lock", "Creating a lock"],
  ["modes", "Hard lock vs. linear vesting"],
  ["claiming", "Claiming"],
  ["public-proof", "Public proof"],
  ["security", "Escrow rules & security"],
  ["contracts", "Contracts & network"],
  ["faq", "FAQ"],
];

/** Sticky "on this page" nav that highlights whichever section is in view. */
export function DocsSidebar() {
  const [active, setActive] = useState(SECTIONS[0][0]);

  useEffect(() => {
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <nav className="doc-side" aria-label="On this page">
      <span className="doc-side-lbl">On this page</span>
      <ul>
        {SECTIONS.map(([id, label]) => (
          <li key={id}>
            <a href={`#${id}`} className={active === id ? "on" : undefined} aria-current={active === id ? "true" : undefined}>
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
