import { alleAandelen, alleLive, alleReferenties, notitiesVoor, parseTags } from "@/lib/db";
import { sindsLezing } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const q = (s: string | number | null | undefined) => {
  if (s === null || s === undefined) return "";
  const t = String(s);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** CSV-export van de lijst met koers, referentie en rendement sinds de lezing. */
export async function GET() {
  const live = alleLive();
  const refs = alleReferenties();
  const kop = ["ticker", "naam", "beurs", "valuta", "sector", "tags", "koers", "referentiekoers", "referentiedag", "sinds_lezing_pct", "notities"];
  const regels = alleAandelen({ inclBenchmarks: true }).map((a) => {
    const l = live.get(a.ticker), r = refs.get(a.ticker);
    const pct = sindsLezing(l, r);
    const notities = notitiesVoor(a.ticker).map((n) => n.tekst).join(" | ");
    return [a.ticker, a.naam, a.beurs, a.valuta, a.sector, parseTags(a).join("|"), l?.koers ?? "", r?.referentiekoers ?? "", r?.handelsdag ?? "", pct === null ? "" : pct.toFixed(2), notities].map(q).join(",");
  });
  const csv = [kop.join(","), ...regels].join("\n");
  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="koerslijst-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
