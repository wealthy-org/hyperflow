import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", weight: ["300", "400", "500", "600", "700"] });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });
const serif = Instrument_Serif({ subsets: ["latin"], variable: "--font-serif", weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Hypeflow",
  description: "Hypeflow brings token locks, vesting, and streaming to Elysium. Set an unlock schedule and share the onchain proof.",
  icons: { icon: "/logo.jpeg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable} ${serif.variable}`}>
      <head>
        {/* Enables entrance/reveal styles only when JS runs, so content is never hidden without it. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
