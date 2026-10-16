"use client";
import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Punt } from "@/lib/metrics";
import { fmtDatum, fmtKoers, fmtPct } from "@/lib/format";

type Bereik = "lezing" | "1m" | "3m" | "1j" | "5j";
type Modus = "koers" | "vergelijk";

const BEREIKEN: { k: Bereik; label: string }[] = [
  { k: "lezing", label: "Sinds lezing" }, { k: "1m", label: "1 M" }, { k: "3m", label: "3 M" }, { k: "1j", label: "1 J" }, { k: "5j", label: "5 J" },
];

interface Props {
  reeks: Punt[];
  benchmark: { naam: string; reeks: Punt[] } | null;
  handelsdag: string | null;      // handelsdag van de referentie
  referentiekoers: number | null;
  valuta: string | null;
  naam: string;
}

interface Rij { datum: string; koers: number; bm?: number; koersIdx?: number; bmIdx?: number }

function startDatum(b: Bereik, handelsdag: string | null, reeks: Punt[]): string {
  const d = new Date();
  switch (b) {
    case "1m": d.setMonth(d.getMonth() - 1); break;
    case "3m": d.setMonth(d.getMonth() - 3); break;
    case "1j": d.setFullYear(d.getFullYear() - 1); break;
    case "5j": d.setFullYear(d.getFullYear() - 5); break;
    case "lezing": {
      // vijf handelsdagen vóór de lezing erbij, zodat de markering niet op de rand staat
      const ref = handelsdag ?? d.toISOString().slice(0, 10);
      const i = reeks.findIndex((p) => p.datum >= ref);
      const j = Math.max(0, (i < 0 ? reeks.length : i) - 5);
      return reeks[j]?.datum ?? ref;
    }
  }
  return d.toISOString().slice(0, 10);
}

export function KoersGrafiek({ reeks, benchmark, handelsdag, referentiekoers, valuta, naam }: Props) {
  const [bereik, setBereik] = useState<Bereik>("lezing");
  const [modus, setModus] = useState<Modus>("koers");

  const data = useMemo<Rij[]>(() => {
    const van = startDatum(bereik, handelsdag, reeks);
    const bmMap = new Map((benchmark?.reeks ?? []).map((p) => [p.datum, p.slot]));
    let laatsteBm: number | undefined;
    const rows: Rij[] = [];
    for (const p of reeks) {
      if (p.datum < van) { if (bmMap.has(p.datum)) laatsteBm = bmMap.get(p.datum); continue; }
      if (bmMap.has(p.datum)) laatsteBm = bmMap.get(p.datum);
      rows.push({ datum: p.datum, koers: p.slot, bm: laatsteBm });
    }
    // indexbasis: de referentiehandelsdag (bij "sinds lezing") of de eerste dag van het bereik
    const basisRij = (bereik === "lezing" && handelsdag ? rows.find((r) => r.datum >= handelsdag) : rows[0]) ?? rows[0];
    if (basisRij) {
      const k0 = basisRij.koers, b0 = basisRij.bm;
      for (const r of rows) {
        r.koersIdx = (r.koers / k0) * 100;
        if (b0 && r.bm) r.bmIdx = (r.bm / b0) * 100;
      }
    }
    return rows;
  }, [reeks, benchmark, bereik, handelsdag]);

  const vergelijk = modus === "vergelijk" && !!benchmark;
  const yKey = vergelijk ? "koersIdx" : "koers";
  const markeerX = handelsdag && data.some((r) => r.datum === handelsdag) ? handelsdag : undefined;
  const eerste = data[0], laatste = data[data.length - 1];
  const periodePct = eerste && laatste ? (laatste.koers / eerste.koers - 1) * 100 : null;

  const tickDatum = (d: string) => {
    const dt = new Date(d + "T12:00:00");
    return bereik === "5j" || bereik === "1j"
      ? new Intl.DateTimeFormat("nl-BE", { month: "short", year: "2-digit" }).format(dt)
      : new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short" }).format(dt);
  };
  const tickY = (v: number) => (vergelijk ? `${Math.round(v)}` : fmtKoers(v));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="seg" role="group" aria-label="Periode">
          {BEREIKEN.map((b) => (
            <button key={b.k} type="button" aria-pressed={bereik === b.k} onClick={() => setBereik(b.k)}>{b.label}</button>
          ))}
        </div>
        {benchmark && (
          <div className="seg" role="group" aria-label="Weergave">
            <button type="button" aria-pressed={modus === "koers"} onClick={() => setModus("koers")}>Koers</button>
            <button type="button" aria-pressed={modus === "vergelijk"} onClick={() => setModus("vergelijk")}>Vergelijk (index 100)</button>
          </div>
        )}
        {periodePct !== null && (
          <span className="ml-auto text-xs text-ink-2">
            Periode: <span className={`num font-semibold ${periodePct >= 0 ? "text-up" : "text-down"}`}>{fmtPct(periodePct)}</span>
          </span>
        )}
      </div>

      {data.length < 2 ? (
        <div className="grid h-64 place-items-center text-sm text-muted">Nog geen historiek. Vernieuw de koersen om de grafiek te vullen.</div>
      ) : (
        <div className="h-72 w-full sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 18, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="vulling" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="datum" tickFormatter={tickDatum} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={{ stroke: "var(--line)" }} tickLine={false} minTickGap={40} />
              <YAxis domain={["auto", "auto"]} tickFormatter={tickY} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const r = payload[0].payload as Rij;
                  const sinds = referentiekoers ? (r.koers / referentiekoers - 1) * 100 : null;
                  return (
                    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-card">
                      <div className="mb-1 font-semibold">{fmtDatum(r.datum, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div>
                      <div className="flex justify-between gap-4"><span className="text-ink-2">{naam}</span><span className="num font-semibold">{fmtKoers(r.koers, valuta)}</span></div>
                      {sinds !== null && <div className="flex justify-between gap-4"><span className="text-ink-2">Sinds lezing</span><span className={`num font-semibold ${sinds >= 0 ? "text-up" : "text-down"}`}>{fmtPct(sinds)}</span></div>}
                      {vergelijk && r.bmIdx !== undefined && <div className="flex justify-between gap-4"><span className="text-ink-2">{benchmark?.naam}</span><span className="num font-semibold" style={{ color: "var(--chart-2)" }}>{fmtPct(r.bmIdx - 100)}</span></div>}
                    </div>
                  );
                }}
              />
              {vergelijk && <ReferenceLine y={100} stroke="var(--line)" />}
              {markeerX && (
                <ReferenceLine x={markeerX} stroke="var(--brass)" strokeDasharray="4 3" strokeWidth={1.5}
                  label={{ value: "LEZING", position: "insideTopLeft", fill: "var(--brass)", fontSize: 10, fontWeight: 700, offset: 6 }} />
              )}
              {!vergelijk && referentiekoers && (
                <ReferenceLine y={referentiekoers} stroke="var(--brass)" strokeOpacity={0.6} strokeDasharray="2 4" />
              )}
              <Area type="monotone" dataKey={yKey} stroke="var(--chart-1)" strokeWidth={2} fill="url(#vulling)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} name={naam} />
              {vergelijk && <Line type="monotone" dataKey="bmIdx" stroke="var(--chart-2)" strokeWidth={2} dot={false} isAnimationActive={false} name={benchmark?.naam} connectNulls />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4" style={{ background: "var(--chart-1)" }} />{naam}</span>
        {vergelijk && <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4" style={{ background: "var(--chart-2)" }} />{benchmark?.naam}</span>}
        <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t border-dashed" style={{ borderColor: "var(--brass)" }} />lezing{!vergelijk && referentiekoers ? ` · referentiekoers ${fmtKoers(referentiekoers, valuta)}` : ""}</span>
      </div>
    </div>
  );
}
