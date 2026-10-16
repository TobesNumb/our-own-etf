"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NotitieRij } from "@/lib/db";
import { fmtDatum } from "@/lib/format";

export function Notities({ ticker, notities }: { ticker: string; notities: NotitieRij[] }) {
  const router = useRouter();
  const [nieuw, setNieuw] = useState("");
  const [bron, setBron] = useState<"lezing" | "eigen">("lezing");
  const [bewerkId, setBewerkId] = useState<number | null>(null);
  const [bewerkTekst, setBewerkTekst] = useState("");
  const [bezig, setBezig] = useState(false);

  async function voegToe(e: React.FormEvent) {
    e.preventDefault();
    if (!nieuw.trim()) return;
    setBezig(true);
    await fetch("/api/notities", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticker, tekst: nieuw.trim(), bron }) });
    setNieuw("");
    setBezig(false);
    router.refresh();
  }
  async function bewaar(id: number) {
    setBezig(true);
    await fetch(`/api/notities/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ tekst: bewerkTekst.trim() }) });
    setBewerkId(null);
    setBezig(false);
    router.refresh();
  }
  async function verwijder(id: number) {
    setBezig(true);
    await fetch(`/api/notities/${id}`, { method: "DELETE" });
    setBezig(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {notities.length === 0 && <p className="text-sm text-muted">Nog geen notities. Schrijf op wat er in de lezing over dit aandeel gezegd is.</p>}
      {notities.map((n) => (
        <div key={n.id} className="rounded-lg border border-dashed border-line bg-surface p-3 text-sm">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className={`chip ${n.bron === "lezing" ? "chip-brass" : ""}`}>{n.bron === "lezing" ? "Uit de lezing" : "Eigen"}</span>
            <span className="text-muted">{fmtDatum(n.datum)}</span>
            <span className="ml-auto flex gap-2">
              {bewerkId === n.id ? (
                <>
                  <button type="button" className="text-accent hover:underline" disabled={bezig} onClick={() => bewaar(n.id)}>Bewaar</button>
                  <button type="button" className="text-muted hover:underline" onClick={() => setBewerkId(null)}>Annuleer</button>
                </>
              ) : (
                <>
                  <button type="button" className="text-muted hover:text-accent hover:underline" onClick={() => { setBewerkId(n.id); setBewerkTekst(n.tekst); }}>Bewerk</button>
                  <button type="button" className="text-muted hover:text-down hover:underline" disabled={bezig} onClick={() => verwijder(n.id)}>Verwijder</button>
                </>
              )}
            </span>
          </div>
          {bewerkId === n.id ? (
            <textarea id={`notitie-${n.id}`} className="input min-h-[80px]" value={bewerkTekst} onChange={(e) => setBewerkTekst(e.target.value)} />
          ) : (
            <p className="whitespace-pre-wrap text-ink-2">{n.tekst}</p>
          )}
        </div>
      ))}
      <form onSubmit={voegToe} className="flex flex-col gap-2">
        <textarea id="nieuwe-notitie" className="input min-h-[80px]" placeholder="Nieuwe notitie…" value={nieuw} onChange={(e) => setNieuw(e.target.value)} />
        <div className="flex items-center gap-2">
          <select id="notitie-bron" className="input w-auto" value={bron} onChange={(e) => setBron(e.target.value as "lezing" | "eigen")} aria-label="Bron van de notitie">
            <option value="lezing">Uit de lezing</option>
            <option value="eigen">Eigen notitie</option>
          </select>
          <button type="submit" className="btn btn-primary ml-auto" disabled={bezig || !nieuw.trim()}>Toevoegen</button>
        </div>
      </form>
    </div>
  );
}
