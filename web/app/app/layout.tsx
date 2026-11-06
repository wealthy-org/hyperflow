import type { Metadata } from "next";
import "../app.css";
import { AppShell } from "@/components/app/AppShell";

export const metadata: Metadata = { title: "Hypeflow · App" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
