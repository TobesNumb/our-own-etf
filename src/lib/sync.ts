import { config } from "./config";
import {
  alleAandelen, db, getInstelling, getReferentie, laatsteDatum, schrijfLog, setInstelling, setReferentie,
  slotOpOfNa, slotOpOfVoor, updateAandeel, upsertKoersen, upsertLive,
} from "./db";
import { getProvider } from "./provider";

export interface SyncResultaat {
  status: "vers" | "bijgewerkt" | "bezig" | "fout";
  bericht: string;
  live: number;
  historiek: number;
  referenties: number;
  duurMs: number;
  fouten: string[];
}

const SLEUTEL_LAATSTE = "laatste_vernieuwing";
const g = globalThis as unknown as { __koerslijstSync?: Promise<SyncResultaat> | null };

export function laatsteVernieuwing(): Date | null {
  const v = getInstelling(SLEUTEL_LAATSTE);
  return v ? new Date(v) : null;
}

export function isVerouderd(): boolean {
  const l = laatsteVernieuwing();
  if (!l) return true;
  return Date.now() - l.getTime() > config.cacheMinuten * 60_000;
}

const vandaagIso = () => new Date().toISOString().slice(0, 10);

/**
 * Haalt live koersen, ontbrekende historiek en referentiekoersen op.
 * Eén tegelijk: een tweede aanroep tijdens het werk wacht op de eerste.
 */
export function vernieuw(opts: { forceer?: boolean } = {}): Promise<SyncResultaat> {
  if (g.__koerslijstSync) return g.__koerslijstSync;
  if (!opts.forceer && !isVerouderd()) {
    return Promise.resolve({ status: "vers", bericht: "Koersen zijn nog vers.", live: 0, historiek: 0, referenties: 0, duurMs: 0, fouten: [] });
  }
  g.__koerslijstSync = doeVernieuw().finally(() => { g.__koerslijstSync = null; });
  return g.__koerslijstSync;
}

async function doeVernieuw(): Promise<SyncResultaat> {
  const start = Date.now();
  const fouten: string[] = [];
  const provider = await getProvider();
  const aandelen = alleAandelen({ inclBenchmarks: true });
  const tickers = aandelen.map((a) => a.ticker);
  let live = 0, historiek = 0, referenties = 0;

  // 1. Live koersen in één batch
  try {
    const quotes = await provider.liveKoersen(tickers);
    const d = db();
    const tx = d.transaction(() => {
      for (const q of quotes) {
        upsertLive(q, d);
        live++;
        const a = aandelen.find((x) => x.ticker === q.ticker);
        if (!a) continue;
        const patch: Record<string, string> = {};
        if ((a.naam === a.ticker || !a.naam) && q.naam) patch.naam = q.naam;
        if (!a.beurs && q.beurs) patch.beurs = q.beurs;
        if (!a.valuta && q.valuta) patch.valuta = q.valuta;
        if (!a.quote_type && q.quoteType) patch.quote_type = q.quoteType;
        if (Object.keys(patch).length) updateAandeel(a.ticker, patch, d);
      }
    });
    tx();
  } catch (e) {
    fouten.push(`Live koersen: ${foutTekst(e)}`);
  }

  // 2. Historiek aanvullen (per ticker; de provider beperkt zelf de snelheid)
  const vandaag = vandaagIso();
  for (const a of aandelen) {
    try {
      const laatste = laatsteDatum(a.ticker);
      let van: Date;
      if (!laatste) {
        van = new Date();
        van.setFullYear(van.getFullYear() - config.historiekJaren);
      } else {
        if (laatste >= vandaag) continue;
        van = new Date(laatste);
        van.setDate(van.getDate() - 3); // kleine overlap: laatste dagen kunnen nog wijzigen
      }
      const rows = await provider.historiek(a.ticker, van);
      if (rows.length) { upsertKoersen(a.ticker, rows); historiek += rows.length; }
    } catch (e) {
      fouten.push(`Historiek ${a.ticker}: ${foutTekst(e)}`);
    }
  }

  // 3. Profiel (sector) voor aandelen die er nog geen hebben
  for (const a of aandelen) {
    if (a.sector || a.is_benchmark) continue;
    try {
      const p = await provider.profiel(a.ticker);
      if (p) updateAandeel(a.ticker, { sector: p.sector ?? null, industrie: p.industrie ?? null, omschrijving: p.omschrijving ?? null, website: p.website ?? null });
    } catch (e) {
      fouten.push(`Profiel ${a.ticker}: ${foutTekst(e)}`);
    }
  }

  // 4. Referentiekoersen
  for (const a of aandelen) {
    if (bepaalReferentie(a.ticker)) referenties++;
  }

  const duurMs = Date.now() - start;
  const status = fouten.length === 0 ? "ok" : live > 0 ? "deels" : "fout";
  schrijfLog("vernieuw", status, fouten.length ? fouten.slice(0, 5).join(" · ") : `${live} live, ${historiek} dagkoersen, ${referenties} referenties`, duurMs);
  if (live > 0 || fouten.length === 0) setInstelling(SLEUTEL_LAATSTE, new Date().toISOString());

  return {
    status: fouten.length && live === 0 ? "fout" : "bijgewerkt",
    bericht: fouten.length ? `${fouten.length} probleem(en) bij het ophalen` : "Bijgewerkt",
    live, historiek, referenties, duurMs, fouten,
  };
}

/**
 * Referentiekoers = slotkoers van de eerste handelsdag op of na de referentiedatum.
 * Zolang die dag nog niet voorbij is, is de referentie voorlopig (laatste beschikbare slot)
 * en wordt ze bij elke vernieuwing herberekend. Daarna wordt ze vastgezet.
 */
export function bepaalReferentie(ticker: string): boolean {
  const bestaand = getReferentie(ticker);
  if (bestaand?.vastgezet && bestaand.referentiedatum === config.referentiedatum) return false;
  if (bestaand?.bron === "handmatig") return false;

  const refDatum = config.referentiedatum;
  const vandaag = vandaagIso();
  const dagVoorbij = vandaag > refDatum;

  const opOfNa = slotOpOfNa(ticker, refDatum);
  if (opOfNa && dagVoorbij && opOfNa.datum < vandaag) {
    setReferentie({ ticker, referentiedatum: refDatum, handelsdag: opOfNa.datum, referentiekoers: opOfNa.slot, vastgezet: 1, bron: "yahoo" });
    return true;
  }
  if (opOfNa) {
    // de handelsdag is vandaag: slot nog niet definitief
    setReferentie({ ticker, referentiedatum: refDatum, handelsdag: opOfNa.datum, referentiekoers: opOfNa.slot, vastgezet: 0, bron: "voorlopig" });
    return true;
  }
  const ervoor = slotOpOfVoor(ticker, refDatum);
  if (ervoor) {
    setReferentie({ ticker, referentiedatum: refDatum, handelsdag: ervoor.datum, referentiekoers: ervoor.slot, vastgezet: 0, bron: "voorlopig" });
    return true;
  }
  return false;
}

function foutTekst(e: unknown): string {
  if (e instanceof Error) return e.message.slice(0, 160);
  return String(e).slice(0, 160);
}
