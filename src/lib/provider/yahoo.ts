import YahooFinance from "yahoo-finance2";
import type { DagKoers, DataProvider, LiveKoers, Profiel, ZoekResultaat } from "./types";

/**
 * Yahoo Finance via de onofficiële bibliotheek yahoo-finance2.
 * Alle koersen zijn 15 tot 20 minuten vertraagd op Europese beurzen.
 */
const yf = new YahooFinance({
  // Rustig aan: Yahoo blokkeert tijdelijk wie te snel te veel vraagt.
  queue: { concurrency: 2, interval: 300 },
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

const isoDag = (d: Date) => d.toISOString().slice(0, 10);

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export const yahooProvider: DataProvider = {
  naam: "yahoo",

  async liveKoersen(tickers) {
    if (tickers.length === 0) return [];
    const rows = await yf.quote(tickers, {}, { validateResult: false });
    const list = (Array.isArray(rows) ? rows : [rows]) as Record<string, unknown>[];
    return list.map((q) => {
      const t = q.regularMarketTime;
      const koersTijd =
        t instanceof Date ? t.toISOString() : typeof t === "number" ? new Date(t * 1000).toISOString() : undefined;
      const divYield = num(q.dividendYield) ?? (num(q.trailingAnnualDividendYield) !== undefined ? num(q.trailingAnnualDividendYield)! * 100 : undefined);
      return {
        ticker: String(q.symbol),
        naam: (q.longName as string) ?? (q.shortName as string) ?? undefined,
        beurs: (q.fullExchangeName as string) ?? (q.exchange as string) ?? undefined,
        valuta: q.currency as string | undefined,
        quoteType: q.quoteType as string | undefined,
        koers: num(q.regularMarketPrice),
        vorigeSlot: num(q.regularMarketPreviousClose),
        open: num(q.regularMarketOpen),
        dagHoog: num(q.regularMarketDayHigh),
        dagLaag: num(q.regularMarketDayLow),
        dagWijziging: num(q.regularMarketChange),
        dagPct: num(q.regularMarketChangePercent),
        volume: num(q.regularMarketVolume),
        week52Laag: num(q.fiftyTwoWeekLow),
        week52Hoog: num(q.fiftyTwoWeekHigh),
        marktkap: num(q.marketCap),
        kwTrailing: num(q.trailingPE),
        kwForward: num(q.forwardPE),
        dividendRendement: divYield,
        dividendBedrag: num(q.trailingAnnualDividendRate),
        beta: num(q.beta),
        marktStatus: q.marketState as string | undefined,
        koersTijd,
      } satisfies LiveKoers;
    });
  },

  async historiek(ticker, van, tot) {
    const result = await yf.chart(ticker, {
      period1: isoDag(van),
      period2: tot ? isoDag(tot) : undefined,
      interval: "1d",
      return: "array",
    });
    const out: DagKoers[] = [];
    for (const q of result.quotes) {
      if (!q.date) continue;
      out.push({
        datum: isoDag(new Date(q.date)),
        open: q.open ?? null,
        hoog: q.high ?? null,
        laag: q.low ?? null,
        slot: q.close ?? null,
        slotGecorrigeerd: q.adjclose ?? q.close ?? null,
        volume: q.volume ?? null,
      });
    }
    return out;
  },

  async profiel(ticker) {
    try {
      const r = await yf.quoteSummary(ticker, { modules: ["summaryProfile"] }, { validateResult: false }) as {
        summaryProfile?: Record<string, unknown>;
      };
      const p = r?.summaryProfile;
      if (!p) return null;
      return {
        sector: p.sector as string | undefined,
        industrie: (p.industryDisp as string) ?? (p.industry as string) ?? undefined,
        land: p.country as string | undefined,
        website: p.website as string | undefined,
        omschrijving: p.longBusinessSummary as string | undefined,
      } satisfies Profiel;
    } catch {
      return null;
    }
  },

  async zoek(query) {
    const r = await yf.search(query, { quotesCount: 10, newsCount: 0 }, { validateResult: false }) as {
      quotes?: Record<string, unknown>[];
    };
    const hits: ZoekResultaat[] = [];
    for (const q of r.quotes ?? []) {
      if (q.isYahooFinance === false || !q.symbol) continue;
      const type = String(q.quoteType ?? "");
      if (!["EQUITY", "ETF", "INDEX", "MUTUALFUND"].includes(type)) continue;
      hits.push({
        ticker: String(q.symbol),
        naam: String(q.longname ?? q.shortname ?? q.symbol),
        beurs: String(q.exchDisp ?? q.exchange ?? ""),
        type,
      });
    }
    return hits;
  },
};
