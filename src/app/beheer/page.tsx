import { Beheer, type BeheerRij } from "@/components/Beheer";
import { config } from "@/lib/config";
import { alleAandelen, alleReferenties, laatsteDatum, laatsteLogs, parseTags } from "@/lib/db";
import { fmtDatum, fmtDatumTijd } from "@/lib/format";
import { laatsteVernieuwing } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const metadata = { title: "Beheer" };

export default function BeheerPagina() {
  const refs = alleReferenties();
  const rijen: BeheerRij[] = alleAandelen({ inclBenchmarks: true }).map((a) => {
    const r = refs.get(a.ticker);
    return {
      ticker: a.ticker, naam: a.naam, beurs: a.beurs, valuta: a.valuta, tags: parseTags(a), isBenchmark: a.is_benchmark === 1,
      referentiekoers: r?.referentiekoers ?? null, handelsdag: r?.handelsdag ?? null, vastgezet: r?.vastgezet === 1, bron: r?.bron ?? null,
      heeftHistoriek: laatsteDatum(a.ticker) !== null,
    };
  });
  const logs = laatsteLogs(8);
  const l = laatsteVernieuwing();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Beheer</h1>
        <p className="text-sm text-ink-2">
          Databron: {config.dataSource === "mock" ? "synthetische testdata" : "Yahoo Finance"} · referentiedatum {fmtDatum(config.referentiedatum)} · cache {config.cacheMinuten} min
          {l ? ` · laatste vernieuwing ${fmtDatumTijd(l.toISOString())}` : ""}
        </p>
      </div>
      <Beheer rijen={rijen} />
      <section className="card p-4">
        <h2 className="mb-2 text-base font-bold">Ophaallog</h2>
        {logs.length === 0 ? <p className="text-sm text-muted">Nog niets opgehaald.</p> : (
          <ul className="divide-y divide-grid text-xs">
            {logs.map((x) => (
              <li key={x.id} className="flex flex-wrap gap-x-3 gap-y-0.5 py-1.5">
                <span className="num w-28 shrink-0 text-muted">{fmtDatumTijd(x.tijdstip)}</span>
                <span className={`w-10 shrink-0 font-semibold ${x.status === "ok" ? "text-up" : x.status === "fout" ? "text-down" : "text-brass"}`}>{x.status}</span>
                <span className="min-w-0 flex-1 text-ink-2">{x.bericht}</span>
                {x.duur_ms != null && <span className="num text-muted">{(x.duur_ms / 1000).toFixed(1)} s</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
