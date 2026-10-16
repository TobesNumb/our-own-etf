"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Antwoord { status: string; bericht: string; live: number; fouten: string[] }

export function RefreshButton() {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  async function vernieuw() {
    setBezig(true);
    setMelding(null);
    try {
      const r = await fetch("/api/vernieuw?forceer=1", { method: "POST" });
      const a = (await r.json()) as Antwoord;
      setMelding(a.fouten?.length ? `${a.bericht}: ${a.fouten[0]}` : a.status === "vers" ? "Koersen waren al vers" : `Bijgewerkt (${a.live} koersen)`);
      router.refresh();
    } catch {
      setMelding("Vernieuwen mislukt. Controleer je internetverbinding.");
    } finally {
      setBezig(false);
      setTimeout(() => setMelding(null), 6000);
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={vernieuw} disabled={bezig} className="btn h-9" title="Koersen nu vernieuwen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={bezig ? "animate-spin" : ""}>
          <path d="M21 12a9 9 0 1 1-2.6-6.4" /><polyline points="21 3 21 9 15 9" />
        </svg>
        <span className="hidden sm:inline">{bezig ? "Bezig…" : "Vernieuw"}</span>
      </button>
      {melding && (
        <div role="status" className="absolute right-0 top-11 z-30 w-72 rounded-lg border border-line bg-surface p-3 text-xs text-ink-2 shadow-card">
          {melding}
        </div>
      )}
    </div>
  );
}
