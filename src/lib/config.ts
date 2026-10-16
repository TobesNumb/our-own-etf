import path from "node:path";

/** Centrale instellingen. Overschrijfbaar via .env (zie .env.example). */
export const config = {
  /** Dag van de lezing: de slotkoers van deze dag is het ijkpunt. */
  referentiedatum: process.env.REFERENTIEDATUM ?? "2026-10-16",
  /** Hoe lang live koersen vers blijven voor we Yahoo opnieuw bevragen. */
  cacheMinuten: Number(process.env.CACHE_MINUTEN ?? 15),
  /** "yahoo" of "mock". */
  dataSource: (process.env.DATA_SOURCE ?? "yahoo") as "yahoo" | "mock",
  /** Benchmarks die mee opgehaald worden maar niet meetellen in de gemiddelden. */
  benchmarks: [
    { ticker: "IWDA.AS", naam: "MSCI World (IWDA)" },
    { ticker: "^BFX", naam: "BEL 20" },
  ],
  /** Hoeveel historiek we bij de eerste synchronisatie ophalen. */
  historiekJaren: 5,
  dbPad: path.join(process.cwd(), "data", "koerslijst.db"),
  seedPad: path.join(process.cwd(), "data", "aandelen.csv"),
  appNaam: process.env.APP_NAAM ?? "Koerslijst",
};

export type Config = typeof config;
