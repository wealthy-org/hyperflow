"use client";

import type { ReactNode } from "react";
import { Providers } from "./Providers";
import { AppNav, NetworkGuard } from "./AppNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="app-shell">
        <AppNav />
        <main className="wrap app-main">
          <NetworkGuard />
          {children}
        </main>
      </div>
    </Providers>
  );
}
