/** Gemeenschappelijke vormen voor elke databron (Yahoo of mock). */

export interface LiveKoers {
  ticker: string;
  naam?: string;
  beurs?: string;
  valuta?: string;
  quoteType?: string;
  koers?: number;
  vorigeSlot?: number;
  open?: number;
  dagHoog?: number;
  dagLaag?: number;
  dagWijziging?: number;
  dagPct?: number;
  volume?: number;
  week52Laag?: number;
  week52Hoog?: number;
  marktkap?: number;
  kwTrailing?: number;
  kwForward?: number;
  /** Dividendrendement in procent (bv. 4.6). */
  dividendRendement?: number;
  dividendBedrag?: number;
  beta?: number;
  marktStatus?: string;
  /** Tijdstip van de koers, ISO. */
  koersTijd?: string;
}

export interface DagKoers {
  /** YYYY-MM-DD */
  datum: string;
  open: number | null;
  hoog: number | null;
  laag: number | null;
  slot: number | null;
  slotGecorrigeerd: number | null;
  volume: number | null;
}

export interface Profiel {
  sector?: string;
  industrie?: string;
  land?: string;
  website?: string;
  omschrijving?: string;
}

export interface ZoekResultaat {
  ticker: string;
  naam: string;
  beurs: string;
  type: string;
}

export interface DataProvider {
  naam: string;
  liveKoersen(tickers: string[]): Promise<LiveKoers[]>;
  historiek(ticker: string, van: Date, tot?: Date): Promise<DagKoers[]>;
  profiel(ticker: string): Promise<Profiel | null>;
  zoek(query: string): Promise<ZoekResultaat[]>;
}
