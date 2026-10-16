"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ZoekResultaat } from "@/lib/provider/types";
import { fmtDatum, fmtKoers } from "@/lib/format";

export interface BeheerRij {
  ticker: string; naam: string; beurs: string | null; valuta: string | null; tags: string[]; isBenchmark: boolean;
  referentiekoers: number | null; handelsdag: string | null; vastgezet: boolean; bron: string | null; heeftHistoriek: boolean;
}

export function Beheer({ rijen }: { rijen: BeheerRij[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ZoekResultaat[]>([]);
  const [zoekFout, setZoekFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  const [csv, setCsv] = useState("");
  const [melding, setMelding] = useState<string | null>(null);
  const [refEdit, setRefEdit] = useState<{ ticker: string; waarde: string } | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/zoek?q=${encodeURIComponent(q.trim())}`);
        const j = await r.json();
        if (Array.isArray(j)) { setHits(j); setZoekFout(null); } else setZoekFout(j.fout ?? "Zoeken mislukt");
      } catch { setZoekFout("Zoeken mislukt"); }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  async function voegToe(h: ZoekResultaat) {
    setBezig(h.ticker);
    setMelding(null);
    const r = await fetch("/api/aandelen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticker: h.ticker, naam: h.naam, beurs: h.beurs, quoteType: h.type }) });
    setBezig(null);
    setMelding(r.ok ? `${h.naam} toegevoegd.` : "Toevoegen mislukt.");
    setQ(""); setHits([]);
    router.refresh();
  }
  async function verwijder(t: string, naam: string) {
    setBezig(t);
    await fetch(`/api/aandelen/${encodeURIComponent(t)}`, { method: "DELETE" });
    setBezig(null);
    setMelding(`${naam} verwijderd.`);
    router.refresh();
  }
  async function importeer() {
    if (!csv.trim()) return;
    setBezig("import");
    setMelding("Importeren en koersen ophalen…");
    const r = await fetch("/api/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ csv }) });
    const j = await r.json();
    setBezig(null);
    setMelding(r.ok ? `${j.nieuw} nieuw, ${j.bestaand} bestond al.${j.fouten?.length ? ` Let op: ${j.fouten[0]}` : ""}` : j.fout ?? "Import mislukt.");
    if (r.ok) setCsv("");
    router.refresh();
  }
  async function bewaarRef() {
    if (!refEdit) return;
    const v = Number(refEdit.waarde.replace(",", "."));
    if (!(v > 0)) { setMelding("Geef een geldige koers in."); return; }
    setBezig(refEdit.ticker);
    await fetch(`/api/aandelen/${encodeURIComponent(refEdit.ticker)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ referentiekoers: v }) });
    setBezig(null); setRefEdit(null);
    setMelding("Referentiekoers handmatig vastgezet.");
    router.refresh();
  }

  const eigen = rijen.filter((r) => !r.isBenchmark);
  const benchmarks = rijen.filter((r) => r.isBenchmark);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-4">
        {melding && <div role="status" className="rounded-lg border border-line bg-accent-soft px-3 py-2 text-sm text-accent">{melding}</div>}

        <section className="card p-4">
          <h2 className="text-base font-bold">Aandeel toevoegen</h2>
          <p className="mb-2 text-xs text-muted">Zoek op naam of ticker. Europese tickers krijgen een beurssuffix: KBC.BR, ASML.AS, AIR.PA, SAP.DE.</p>
          <input id="zoek-aandeel" type="search" className="input" placeholder="bv. KBC, ASML, Novo Nordisk…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          {zoekFout && <p className="mt-2 text-xs text-down">{zoekFout}</p>}
          {hits.length > 0 && (
            <ul className="mt-2 divide-y divide-grid rounded-lg border border-line">
              {hits.map((h) => {
                const al = rijen.some((r) => r.ticker === h.ticker);
                return (
                  <li key={h.ticker} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="font-mono text-xs text-muted w-24 shrink-0">{h.ticker}</span>
                    <span className="min-w-0 flex-1 truncate"><span className="font-medium">{h.naam}</span> <span className="text-muted">· {h.beurs} · {h.type}</span></span>
                    <button type="button" className="btn btn-primary" disabled={al || bezig === h.ticker} onClick={() => voegToe(h)}>{al ? "Staat erin" : bezig === h.ticker ? "Bezig…" : "Toevoegen"}</button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr>
              <th className="label border-b border-line px-3 py-2 text-left">Aandeel</th>
              <th className="label border-b border-line px-3 py-2 text-left">Tags</th>
              <th className="label border-b border-line px-3 py-2 text-right">Referentiekoers</th>
              <th className="border-b border-line px-3 py-2"></th>
            </tr></thead>
            <tbody>
              {eigen.map((r) => (
                <tr key={r.ticker} className="border-b border-grid last:border-0">
                  <td className="px-3 py-2">
                    <Link href={`/aandeel/${encodeURIComponent(r.ticker)}`} className="font-display font-bold hover:text-accent">{r.naam}</Link>
                    <div className="font-mono text-[0.72rem] text-muted">{r.ticker}{r.beurs ? ` · ${r.beurs}` : ""}{!r.heeftHistoriek ? " · nog geen koersen" : ""}</div>
                  </td>
                  <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{r.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div></td>
                  <td className="num px-3 py-2 text-right">
                    {refEdit?.ticker === r.ticker ? (
                      <span className="inline-flex items-center gap-1">
                        <input id={`ref-${r.ticker}`} className="input w-28 text-right" value={refEdit.waarde} onChange={(e) => setRefEdit({ ticker: r.ticker, waarde: e.target.value })} aria-label="Referentiekoers" />
                        <button type="button" className="btn btn-primary" onClick={bewaarRef}>OK</button>
                        <button type="button" className="btn" onClick={() => setRefEdit(null)}>✕</button>
                      </span>
                    ) : (
                      <button type="button" className="hover:text-accent" title="Handmatig aanpassen" onClick={() => setRefEdit({ ticker: r.ticker, waarde: r.referentiekoers ? String(r.referentiekoers) : "" })}>
                        {fmtKoers(r.referentiekoers, r.valuta)}
                        <div className="text-[0.7rem] text-muted">{r.handelsdag ? fmtDatum(r.handelsdag) : "–"}{r.bron === "handmatig" ? " · handmatig" : r.vastgezet ? "" : " · voorlopig"}</div>
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" className="btn btn-danger" disabled={bezig === r.ticker} onClick={() => verwijder(r.ticker, r.naam)}>Verwijder</button>
                  </td>
                </tr>
              ))}
              {eigen.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-muted">Nog geen aandelen. Zoek hierboven of plak een lijst rechts.</td></tr>}
            </tbody>
          </table>
        </section>

        {benchmarks.length > 0 && (
          <p className="text-xs text-muted">Benchmarks (tellen niet mee in de gemiddelden): {benchmarks.map((b) => `${b.naam} (${b.ticker})`).join(", ")}. Aanpasbaar in <span className="font-mono">src/lib/config.ts</span>.</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <section className="card flex flex-col gap-2 p-4">
          <h2 className="text-base font-bold">Lijst importeren</h2>
          <p className="text-xs text-muted">Eén aandeel per regel. Enkel een ticker volstaat; optioneel <span className="font-mono">ticker,naam,tag1|tag2,notitie uit de lezing</span>.</p>
          <textarea id="import-csv" className="input min-h-[160px] font-mono text-xs" placeholder={"KBC.BR,KBC Groep,dividend,Sterke kapitaalpositie\nASML.AS\nNOVO-B.CO"} value={csv} onChange={(e) => setCsv(e.target.value)} />
          <button type="button" className="btn btn-primary self-end" disabled={bezig === "import" || !csv.trim()} onClick={importeer}>{bezig === "import" ? "Bezig…" : "Importeren"}</button>
        </section>
        <section className="card flex flex-col gap-2 p-4">
          <h2 className="text-base font-bold">Exporteren</h2>
          <p className="text-xs text-muted">Alle aandelen met koers, referentie, rendement sinds de lezing en notities.</p>
          <a href="/api/export" className="btn self-start" download>Download CSV</a>
        </section>
      </div>
    </div>
  );
}
