import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { KoersGrafiek } from "@/components/KoersGrafiek";
import { KpiTile } from "@/components/KpiTile";
import { Notities } from "@/components/Notities";
import { PctPill } from "@/components/Pill";
import { fmtDatum, fmtDatumTijd, fmtGetal, fmtGroot, fmtKoers, fmtPct, fmtVolume } from "@/lib/format";
import { detail } from "@/lib/metrics";
import { isVerouderd, laatsteVernieuwing } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const d = detail(decodeURIComponent(ticker));
  return { title: d ? `${d.aandeel.naam} (${d.aandeel.ticker})` : "Niet gevonden" };
}

export default async function AandeelPagina({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const d = detail(decodeURIComponent(ticker));
  if (!d) notFound();
  const { aandeel: a, live: l, referentie: r } = d;
  const isBenchmark = a.is_benchmark === 1;

  const feiten: [string, string][] = [
    ["Valuta", a.valuta ?? "–"],
    ["Beurs", a.beurs ?? "–"],
    ["Sector", a.sector ?? "–"],
    ["Industrie", a.industrie ?? "–"],
    ["Vorig slot", fmtKoers(l?.vorige_slot, a.valuta)],
    ["Open", fmtKoers(l?.open, a.valuta)],
    ["Dagbereik", l?.dag_laag != null && l?.dag_hoog != null ? `${fmtGetal(l.dag_laag)} – ${fmtGetal(l.dag_hoog)}` : "–"],
    ["Volume", fmtVolume(l?.volume)],
    ["Beta", fmtGetal(l?.beta)],
    ["Koers/winst (verwacht)", fmtGetal(l?.kw_forward, 1)],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/" className="text-ink-2 hover:text-accent">← Overzicht</Link>
        <span className="ml-auto flex gap-2">
          {d.vorige && <Link href={`/aandeel/${encodeURIComponent(d.vorige.ticker)}`} className="btn" title={d.vorige.naam}>‹ Vorige</Link>}
          {d.volgende && <Link href={`/aandeel/${encodeURIComponent(d.volgende.ticker)}`} className="btn" title={d.volgende.naam}>Volgende ›</Link>}
        </span>
      </div>

      <AutoRefresh verouderd={isVerouderd()} eersteKeer={laatsteVernieuwing() === null} />

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <span className="chip font-mono">{a.ticker}</span>
            {a.beurs && <span className="chip">{a.beurs}</span>}
            {a.sector && <span className="chip">{a.sector}</span>}
            {d.tags.map((t) => <span key={t} className={`chip ${t === "benchmark" ? "chip-accent" : "chip-brass"}`}>{t}</span>)}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{a.naam}</h1>
          <p className="text-xs text-muted">
            Koers in {a.valuta ?? "?"} · 15 min vertraagd{l?.koers_tijd ? ` · koers van ${fmtDatumTijd(l.koers_tijd)}` : ""}{l?.markt_status === "REGULAR" ? " · beurs open" : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="num font-display text-3xl font-extrabold tracking-tight">{fmtKoers(l?.koers ?? d.reeks[d.reeks.length - 1]?.slot, a.valuta)}</span>
          <span className="flex items-center gap-2 text-xs text-ink-2"><PctPill v={l?.dag_pct} /> vandaag</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile label="Sinds lezing" waarde={fmtPct(d.sindsLezingPct)} pct={d.sindsLezingPct}
          sub={r ? <>vanaf {fmtKoers(r.referentiekoers, a.valuta)} op {fmtDatum(r.handelsdag)}{r.vastgezet ? "" : <span className="text-brass"> · voorlopig</span>}</> : "nog geen referentie"} />
        <KpiTile label="52 w bereik" klein waarde={l?.week52_laag != null && l?.week52_hoog != null ? `${fmtGetal(l.week52_laag)} – ${fmtGetal(l.week52_hoog)}` : "–"}
          sub={d.week52Positie !== null ? `huidig: ${Math.round(d.week52Positie)} % van bereik` : undefined} />
        {!isBenchmark && <KpiTile label="Marktkap" klein waarde={fmtGroot(l?.marktkap, a.valuta)} sub={l?.marktkap ? (l.marktkap >= 1e10 ? "large cap" : l.marktkap >= 2e9 ? "mid cap" : "small cap") : undefined} />}
        {!isBenchmark && <KpiTile label="Koers/winst" klein waarde={fmtGetal(l?.kw_trailing, 1)} sub={l?.kw_forward ? `verwacht ${fmtGetal(l.kw_forward, 1)}` : undefined} />}
        {!isBenchmark && <KpiTile label="Dividend" klein waarde={l?.dividend_rendement != null ? fmtPct(l.dividend_rendement, 1, false) : "–"} sub={l?.dividend_bedrag ? `${fmtKoers(l.dividend_bedrag, a.valuta)} per aandeel` : undefined} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="card flex flex-col gap-3 p-4">
          <h2 className="text-base font-bold">Koersverloop</h2>
          <KoersGrafiek reeks={d.reeks} benchmark={d.benchmark ? { naam: d.benchmark.naam, reeks: d.benchmark.reeks } : null}
            handelsdag={r?.handelsdag ?? null} referentiekoers={r?.referentiekoers ?? null} valuta={a.valuta} naam={a.naam} />
        </section>
        <div className="flex flex-col gap-4">
          <section className="card p-4">
            <h2 className="mb-2 text-base font-bold">Basisgegevens</h2>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
              {feiten.map(([k, v]) => (<div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="num text-right font-medium">{v}</dd></div>))}
            </dl>
            {a.website && <a href={a.website} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-accent hover:underline">{a.website.replace(/^https?:\/\//, "")}</a>}
          </section>
          {!isBenchmark && (
            <section className="card p-4">
              <h2 className="mb-2 text-base font-bold">Mijn notities</h2>
              <Notities ticker={a.ticker} notities={d.notities} />
            </section>
          )}
        </div>
      </div>

      {a.omschrijving && (
        <section className="card p-4">
          <h2 className="mb-2 text-base font-bold">Over {a.naam}</h2>
          <p className="max-w-[75ch] text-sm leading-relaxed text-ink-2">{a.omschrijving}</p>
        </section>
      )}
    </div>
  );
}
