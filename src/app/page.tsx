import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { KpiTile } from "@/components/KpiTile";
import { OverzichtTabel } from "@/components/OverzichtTabel";
import { fmtDatum, fmtDatumTijd, fmtPct } from "@/lib/format";
import { overzicht } from "@/lib/metrics";
import { isVerouderd, laatsteVernieuwing } from "@/lib/sync";

export const dynamic = "force-dynamic";

export default function OverzichtPagina() {
  const { rijen, samenvatting: s } = overzicht();
  const verouderd = isVerouderd();
  const eersteKeer = laatsteVernieuwing() === null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Sinds de lezing</h1>
          <p className="text-sm text-ink-2">
            Referentie: slotkoers van {fmtDatum(s.referentiedatum)} · {s.aantal} aandelen
            {s.bijgewerkt ? ` · bijgewerkt ${fmtDatumTijd(s.bijgewerkt)}` : " · nog niet gesynchroniseerd"}
          </p>
        </div>
        {rijen.length === 0 && <Link href="/beheer" className="btn btn-primary">Aandelen toevoegen</Link>}
      </div>

      <AutoRefresh verouderd={verouderd} eersteKeer={eersteKeer} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile label="Gemiddeld sinds lezing" waarde={fmtPct(s.gemiddeldPct)} pct={s.gemiddeldPct} sub={`${s.aantal} aandelen, gelijk gewogen`} />
        <KpiTile label="Stijgers · dalers" waarde={<><span className="text-up">{s.stijgers}</span> · <span className="text-down">{s.dalers}</span></>} sub={`sinds ${fmtDatum(s.referentiedatum)}`} />
        <KpiTile label="Beste" waarde={fmtPct(s.beste?.pct)} pct={s.beste?.pct ?? null} sub={s.beste ? <Link href={`/aandeel/${encodeURIComponent(s.beste.ticker)}`} className="hover:text-accent">{s.beste.naam}</Link> : "–"} />
        <KpiTile label="Slechtste" waarde={fmtPct(s.slechtste?.pct)} pct={s.slechtste?.pct ?? null} sub={s.slechtste ? <Link href={`/aandeel/${encodeURIComponent(s.slechtste.ticker)}`} className="hover:text-accent">{s.slechtste.naam}</Link> : "–"} />
        {s.benchmarks.slice(0, 1).map((b) => (
          <KpiTile key={b.ticker} label="Benchmark" waarde={fmtPct(b.pct)} pct={b.pct} sub={<Link href={`/aandeel/${encodeURIComponent(b.ticker)}`} className="hover:text-accent">{b.naam}</Link>} />
        ))}
      </div>

      <OverzichtTabel rijen={rijen} />

      {s.benchmarks.length > 1 && (
        <p className="text-xs text-muted">
          Andere benchmarks: {s.benchmarks.slice(1).map((b) => <span key={b.ticker}>{b.naam} {fmtPct(b.pct)}</span>).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, " · ", el] : [el]), [])}
        </p>
      )}
    </div>
  );
}
