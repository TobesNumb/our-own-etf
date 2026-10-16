import type { DagKoers, DataProvider, LiveKoers, Profiel, ZoekResultaat } from "./types";

/**
 * Synthetische databron: deterministische koersreeksen per ticker.
 * Bedoeld om de app te ontwikkelen en te testen zonder internet (DATA_SOURCE=mock).
 * Cijfers zijn fictief.
 */

const META: Record<string, { naam: string; beurs: string; valuta: string; sector: string; industrie: string; start: number; type?: string }> = {
  "KBC.BR": { naam: "KBC Groep", beurs: "Brussels", valuta: "EUR", sector: "Financial Services", industrie: "Banks", start: 68 },
  "ASML.AS": { naam: "ASML Holding", beurs: "Amsterdam", valuta: "EUR", sector: "Technology", industrie: "Semiconductor Equipment", start: 820 },
  "AIR.PA": { naam: "Airbus", beurs: "Paris", valuta: "EUR", sector: "Industrials", industrie: "Aerospace & Defense", start: 185 },
  "SAP.DE": { naam: "SAP", beurs: "XETRA", valuta: "EUR", sector: "Technology", industrie: "Software", start: 210 },
  "NESN.SW": { naam: "Nestlé", beurs: "Swiss", valuta: "CHF", sector: "Consumer Defensive", industrie: "Packaged Foods", start: 86 },
  "NOVO-B.CO": { naam: "Novo Nordisk", beurs: "Copenhagen", valuta: "DKK", sector: "Healthcare", industrie: "Biotechnology", start: 420 },
  AAPL: { naam: "Apple", beurs: "NasdaqGS", valuta: "USD", sector: "Technology", industrie: "Consumer Electronics", start: 240 },
  MSFT: { naam: "Microsoft", beurs: "NasdaqGS", valuta: "USD", sector: "Technology", industrie: "Software", start: 510 },
  "UCB.BR": { naam: "UCB", beurs: "Brussels", valuta: "EUR", sector: "Healthcare", industrie: "Drug Manufacturers", start: 190 },
  "SOLB.BR": { naam: "Solvay", beurs: "Brussels", valuta: "EUR", sector: "Basic Materials", industrie: "Chemicals", start: 31 },
  "IWDA.AS": { naam: "iShares Core MSCI World", beurs: "Amsterdam", valuta: "EUR", sector: "", industrie: "", start: 104, type: "ETF" },
  "^BFX": { naam: "BEL 20", beurs: "Brussels", valuta: "EUR", sector: "", industrie: "", start: 4600, type: "INDEX" },
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}
const isoDag = (d: Date) => d.toISOString().slice(0, 10);

function meta(ticker: string) {
  return META[ticker] ?? { naam: ticker, beurs: "Mock", valuta: "EUR", sector: "Onbekend", industrie: "", start: 50 + (hash(ticker) % 400) };
}

/** Dagreeks van 6 jaar terug tot vandaag, deterministisch per ticker. */
function reeks(ticker: string): DagKoers[] {
  const m = meta(ticker);
  const r = rng(hash(ticker));
  const out: DagKoers[] = [];
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCFullYear(d.getUTCFullYear() - 6);
  let p = m.start * 0.7;
  const drift = 0.00025 + (r() - 0.5) * 0.0003;
  const vol = 0.009 + r() * 0.01;
  const now = new Date();
  while (d <= now) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      const ret = drift + (r() + r() + r() - 1.5) * vol;
      const open = p;
      p = p * (1 + ret);
      const hoog = Math.max(open, p) * (1 + r() * 0.006);
      const laag = Math.min(open, p) * (1 - r() * 0.006);
      out.push({ datum: isoDag(d), open, hoog, laag, slot: p, slotGecorrigeerd: p, volume: Math.round(200000 + r() * 900000) });
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const cache = new Map<string, DagKoers[]>();
function getReeks(t: string) {
  let s = cache.get(t);
  if (!s) { s = reeks(t); cache.set(t, s); }
  return s;
}

export const mockProvider: DataProvider = {
  naam: "mock",

  async liveKoersen(tickers) {
    return tickers.map((ticker): LiveKoers => {
      const m = meta(ticker);
      const s = getReeks(ticker);
      const laatste = s[s.length - 1];
      const vorige = s[s.length - 2];
      const koers = laatste.slot!;
      const vorigeSlot = vorige.slot!;
      const jaar = s.slice(-252).map((x) => x.slot!);
      return {
        ticker,
        naam: m.naam,
        beurs: m.beurs,
        valuta: m.valuta,
        quoteType: m.type ?? "EQUITY",
        koers,
        vorigeSlot,
        open: laatste.open!,
        dagHoog: laatste.hoog!,
        dagLaag: laatste.laag!,
        dagWijziging: koers - vorigeSlot,
        dagPct: (koers / vorigeSlot - 1) * 100,
        volume: laatste.volume!,
        week52Laag: Math.min(...jaar),
        week52Hoog: Math.max(...jaar),
        marktkap: m.type ? undefined : koers * (1e8 + (hash(ticker) % 9) * 1e8),
        kwTrailing: m.type ? undefined : 9 + (hash(ticker) % 25),
        kwForward: m.type ? undefined : 8 + (hash(ticker) % 22),
        dividendRendement: m.type ? undefined : (hash(ticker) % 60) / 10,
        dividendBedrag: m.type ? undefined : koers * ((hash(ticker) % 60) / 1000),
        beta: 0.6 + (hash(ticker) % 90) / 100,
        marktStatus: "CLOSED",
        koersTijd: new Date().toISOString(),
      };
    });
  },

  async historiek(ticker, van, tot) {
    const a = isoDag(van);
    const b = tot ? isoDag(tot) : "9999";
    return getReeks(ticker).filter((x) => x.datum >= a && x.datum <= b);
  },

  async profiel(ticker): Promise<Profiel | null> {
    const m = meta(ticker);
    return { sector: m.sector, industrie: m.industrie, land: "Mock", omschrijving: "Synthetische data voor ontwikkeling." };
  },

  async zoek(query): Promise<ZoekResultaat[]> {
    const q = query.toLowerCase();
    return Object.entries(META)
      .filter(([t, m]) => t.toLowerCase().includes(q) || m.naam.toLowerCase().includes(q))
      .map(([t, m]) => ({ ticker: t, naam: m.naam, beurs: m.beurs, type: m.type ?? "EQUITY" }));
  },
};
