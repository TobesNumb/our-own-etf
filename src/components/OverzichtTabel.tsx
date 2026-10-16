"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { OverzichtRij } from "@/lib/metrics";
import { fmtKoers, fmtTijd } from "@/lib/format";
import { PctPill } from "./Pill";
import { Sparkline } from "./Sparkline";

type SorteerVeld = "naam" | "koers" | "dagPct" | "sindsLezingPct" | "sector";
type Weergave = "tabel" | "kaarten";

const KOLOMMEN: { veld: SorteerVeld; label: string; rechts?: boolean }[] = [
  { veld: "naam", label: "Aandeel" },
  { veld: "koers", label: "Koers", rechts: true },
  { veld: "dagPct", label: "Dag", rechts: true },
  { veld: "sindsLezingPct", label: "Sinds lezing", rechts: true },
  { veld: "sector", label: "Sector" },
];

export function OverzichtTabel({ rijen }: { rijen: OverzichtRij[] }) {
  const [zoek, setZoek] = useState("");
  const [sector, setSector] = useState("");
  const [beurs, setBeurs] = useState("");
  const [tag, setTag] = useState("");
  const [sorteer, setSorteer] = useState<SorteerVeld>("sindsLezingPct");
  const [aflopend, setAflopend] = useState(true);
  const [weergave, setWeergave] = useState<Weergave>("tabel");

  useEffect(() => {
    try { const w = localStorage.getItem("koerslijst-weergave"); if (w === "kaarten" || w === "tabel") setWeergave(w); } catch {}
  }, []);
  function kiesWeergave(w: Weergave) { setWeergave(w); try { localStorage.setItem("koerslijst-weergave", w); } catch {} }

  const eigen = useMemo(() => rijen.filter((r) => !r.isBenchmark), [rijen]);
  const sectoren = useMemo(() => [...new Set(eigen.map((r) => r.sector).filter(Boolean) as string[])].sort(), [eigen]);
  const beurzen = useMemo(() => [...new Set(eigen.map((r) => r.beurs).filter(Boolean) as string[])].sort(), [eigen]);
  const tags = useMemo(() => [...new Set(eigen.flatMap((r) => r.tags))].sort(), [eigen]);

  const zichtbaar = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    const lijst = eigen.filter((r) =>
      (!q || r.naam.toLowerCase().includes(q) || r.ticker.toLowerCase().includes(q)) &&
      (!sector || r.sector === sector) && (!beurs || r.beurs === beurs) && (!tag || r.tags.includes(tag)),
    );
    const richting = aflopend ? -1 : 1;
    return lijst.sort((a, b) => {
      const va = a[sorteer], vb = b[sorteer];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb, "nl") * richting;
      return ((va as number) - (vb as number)) * richting;
    });
  }, [eigen, zoek, sector, beurs, tag, sorteer, aflopend]);

  function klikKolom(veld: SorteerVeld) {
    if (veld === sorteer) setAflopend(!aflopend);
    else { setSorteer(veld); setAflopend(veld !== "naam" && veld !== "sector"); }
  }

  const filtersActief = zoek || sector || beurs || tag;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input id="zoek" type="search" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek op naam of ticker…" className="input min-w-0 flex-1 basis-48" aria-label="Zoeken" />
        <select id="f-sector" value={sector} onChange={(e) => setSector(e.target.value)} className="input w-auto" aria-label="Filter op sector">
          <option value="">Alle sectoren</option>{sectoren.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select id="f-beurs" value={beurs} onChange={(e) => setBeurs(e.target.value)} className="input w-auto" aria-label="Filter op beurs">
          <option value="">Alle beurzen</option>{beurzen.map((s) => <option key={s}>{s}</option>)}
        </select>
        {tags.length > 0 && (
          <select id="f-tag" value={tag} onChange={(e) => setTag(e.target.value)} className="input w-auto" aria-label="Filter op tag">
            <option value="">Alle tags</option>{tags.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        {filtersActief && (
          <button type="button" className="btn" onClick={() => { setZoek(""); setSector(""); setBeurs(""); setTag(""); }}>Wis filters</button>
        )}
        <div className="seg ml-auto" role="group" aria-label="Weergave">
          <button type="button" aria-pressed={weergave === "tabel"} onClick={() => kiesWeergave("tabel")}>Tabel</button>
          <button type="button" aria-pressed={weergave === "kaarten"} onClick={() => kiesWeergave("kaarten")}>Kaarten</button>
        </div>
      </div>

      <p className="text-xs text-muted">{zichtbaar.length} van {eigen.length} aandelen{filtersActief ? " (gefilterd)" : ""}. Klik op een kolomkop om te sorteren.</p>

      {weergave === "tabel" ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr>
                {KOLOMMEN.map((k) => (
                  <th key={k.veld} className={`border-b border-line px-3 py-2.5 ${k.rechts ? "text-right" : "text-left"}`}>
                    <button type="button" onClick={() => klikKolom(k.veld)} className={`label hover:text-ink ${sorteer === k.veld ? "text-accent" : ""}`} aria-sort={sorteer === k.veld ? (aflopend ? "descending" : "ascending") : undefined}>
                      {k.label}{sorteer === k.veld ? (aflopend ? " ▾" : " ▴") : ""}
                    </button>
                  </th>
                ))}
                <th className="border-b border-line px-3 py-2.5 text-left"><span className="label">30 d</span></th>
              </tr>
            </thead>
            <tbody>
              {zichtbaar.map((r) => (
                <tr key={r.ticker} className="group border-b border-grid last:border-0 hover:bg-surface-2/60">
                  <td className="px-3 py-2.5">
                    <Link href={`/aandeel/${encodeURIComponent(r.ticker)}`} className="flex flex-col">
                      <span className="font-display font-bold text-ink group-hover:text-accent">{r.naam}</span>
                      <span className="font-mono text-[0.72rem] text-muted">{r.ticker}{r.beurs ? ` · ${r.beurs}` : ""}{r.notities ? ` · ${r.notities} notitie${r.notities > 1 ? "s" : ""}` : ""}</span>
                    </Link>
                  </td>
                  <td className="num px-3 py-2.5 text-right">
                    {fmtKoers(r.koers, r.valuta)}
                    {r.koersTijd && <div className="text-[0.7rem] text-muted">{fmtTijd(r.koersTijd)}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-right"><PctPill v={r.dagPct} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <PctPill v={r.sindsLezingPct} />
                    {r.referentieVoorlopig && r.sindsLezingPct !== null && <div className="text-[0.68rem] text-brass">voorlopig</div>}
                  </td>
                  <td className="px-3 py-2.5">{r.sector ? <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-ink-2">{r.sector}</span> : <span className="text-muted">–</span>}</td>
                  <td className="px-3 py-2.5"><Sparkline data={r.sparkline} /></td>
                </tr>
              ))}
              {zichtbaar.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-muted">Geen aandelen gevonden met deze filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {zichtbaar.map((r) => (
            <Link key={r.ticker} href={`/aandeel/${encodeURIComponent(r.ticker)}`} className="card flex flex-col gap-3 p-4 transition hover:border-accent hover:shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-display font-bold">{r.naam}</div>
                  <div className="font-mono text-[0.72rem] text-muted">{r.ticker}</div>
                </div>
                <PctPill v={r.sindsLezingPct} />
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="num font-display text-xl font-extrabold tracking-tight">{fmtKoers(r.koers, r.valuta)}</div>
                  <div className="text-xs text-ink-2">vandaag <PctPill v={r.dagPct} /></div>
                </div>
                <Sparkline data={r.sparkline} w={96} h={32} />
              </div>
              <div className="flex flex-wrap gap-1">
                {r.sector && <span className="chip">{r.sector}</span>}
                {r.referentieVoorlopig && <span className="chip chip-brass">voorlopige referentie</span>}
              </div>
            </Link>
          ))}
          {zichtbaar.length === 0 && <p className="col-span-full py-10 text-center text-muted">Geen aandelen gevonden met deze filters.</p>}
        </div>
      )}
    </div>
  );
}
