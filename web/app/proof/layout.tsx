import "../app.css";
import { AppShell } from "@/components/app/AppShell";

export default function ProofLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
