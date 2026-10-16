import { config } from "./config";
import {
  alleAandelen, alleLive, alleReferenties, getAandeel, getLive, getReferentie, koersenVanaf, laatsteSlots,
  notitieTellingen, notitiesVoor, parseTags, type AandeelRij, type LiveRij, type NotitieRij, type ReferentieRij,
} from "./db";
import { laatsteVernieuwing } from "./sync";

/** Eén rij in het overzicht. */
export interface OverzichtRij {
  ticker: string;
  naam: string;
  beurs: string | null;
  valuta: string | null;
  sector: string | null;
  tags: string[];
  isBenchmark: boolean;
  koers: number | null;
  dagPct: number | null;
  sindsLezingPct: number | null;
  referentiekoers: number | null;
  referentieVoorlopig: boolean;
  sparkline: number[];
  notities: number;
  koersTijd: string | null;
}

export interface Samenvatting {
  aantal: number;
  gemiddeldPct: number | null;
  stijgers: number;
  dalers: number;
  beste: { ticker: string; naam: string; pct: number } | null;
  slechtste: { ticker: string; naam: string; pct: number } | null;
  benchmarks: { ticker: string; naam: string; pct: number | null }[];
  bijgewerkt: string | null;
  referentiedatum: string;
}

export function sindsLezing(live: LiveRij | undefined, ref: ReferentieRij | undefined, laatsteSlot?: number): number | null {
  const koers = live?.koers ?? laatsteSlot ?? null;
  if (koers === null || !ref || !ref.referentiekoers) return null;
  return (koers / ref.referentiekoers - 1) * 100;
}

export function overzicht(): { rijen: OverzichtRij[]; samenvatting: Samenvatting } {
  const aandelen = alleAandelen({ inclBenchmarks: true });
  const live = alleLive();
  const refs = alleReferenties();
  const tellingen = notitieTellingen();

  const rijen: OverzichtRij[] = aandelen.map((a) => {
    const l = live.get(a.ticker);
    const r = refs.get(a.ticker);
    const spark = laatsteSlots(a.ticker, 30).map((x) => x.slot);
    return {
      ticker: a.ticker,
      naam: a.naam,
      beurs: a.beurs,
      valuta: a.valuta,
      sector: a.sector,
      tags: parseTags(a),
      isBenchmark: a.is_benchmark === 1,
      koers: l?.koers ?? spark[spark.length - 1] ?? null,
      dagPct: l?.dag_pct ?? null,
      sindsLezingPct: sindsLezing(l, r, spark[spark.length - 1]),
      referentiekoers: r?.referentiekoers ?? null,
      referentieVoorlopig: r ? r.vastgezet === 0 : true,
      sparkline: spark,
      notities: tellingen.get(a.ticker) ?? 0,
      koersTijd: l?.koers_tijd ?? null,
    };
  });

  const eigen = rijen.filter((r) => !r.isBenchmark);
  const metPct = eigen.filter((r) => r.sindsLezingPct !== null) as (OverzichtRij & { sindsLezingPct: number })[];
  const gemiddeld = metPct.length ? metPct.reduce((s, r) => s + r.sindsLezingPct, 0) / metPct.length : null;
  const gesorteerd = [...metPct].sort((a, b) => b.sindsLezingPct - a.sindsLezingPct);
  const l = laatsteVernieuwing();

  const samenvatting: Samenvatting = {
    aantal: eigen.length,
    gemiddeldPct: gemiddeld,
    stijgers: metPct.filter((r) => r.sindsLezingPct > 0).length,
    dalers: metPct.filter((r) => r.sindsLezingPct < 0).length,
    beste: gesorteerd[0] ? { ticker: gesorteerd[0].ticker, naam: gesorteerd[0].naam, pct: gesorteerd[0].sindsLezingPct } : null,
    slechtste: gesorteerd.length > 1 ? { ticker: gesorteerd[gesorteerd.length - 1].ticker, naam: gesorteerd[gesorteerd.length - 1].naam, pct: gesorteerd[gesorteerd.length - 1].sindsLezingPct } : null,
    benchmarks: rijen.filter((r) => r.isBenchmark).map((r) => ({ ticker: r.ticker, naam: r.naam, pct: r.sindsLezingPct })),
    bijgewerkt: l ? l.toISOString() : null,
    referentiedatum: config.referentiedatum,
  };

  return { rijen, samenvatting };
}

/* ---------- detail ---------- */

export interface Punt { datum: string; slot: number }

export interface Detail {
  aandeel: AandeelRij;
  tags: string[];
  live: LiveRij | null;
  referentie: ReferentieRij | null;
  sindsLezingPct: number | null;
  reeks: Punt[];              // 5 jaar dagslots
  benchmark: { ticker: string; naam: string; reeks: Punt[] } | null;
  notities: NotitieRij[];
  vorige: { ticker: string; naam: string } | null;
  volgende: { ticker: string; naam: string } | null;
  referentiedatum: string;
  week52Positie: number | null;
}

export function detail(ticker: string): Detail | null {
  const a = getAandeel(ticker);
  if (!a) return null;
  const live = getLive(ticker) ?? null;
  const ref = getReferentie(ticker) ?? null;
  const van = new Date();
  van.setFullYear(van.getFullYear() - config.historiekJaren);
  const vanIso = van.toISOString().slice(0, 10);
  const reeks = koersenVanaf(ticker, vanIso).filter((k) => k.slot !== null).map((k) => ({ datum: k.datum, slot: k.slot as number }));

  const bm = config.benchmarks[0];
  const bmRij = bm ? getAandeel(bm.ticker) : undefined;
  const benchmark = bmRij && !a.is_benchmark
    ? { ticker: bmRij.ticker, naam: bmRij.naam, reeks: koersenVanaf(bmRij.ticker, vanIso).filter((k) => k.slot !== null).map((k) => ({ datum: k.datum, slot: k.slot as number })) }
    : null;

  const lijst = alleAandelen({ inclBenchmarks: true });
  const i = lijst.findIndex((x) => x.ticker === ticker);
  const vorige = i > 0 ? lijst[i - 1] : null;
  const volgende = i >= 0 && i < lijst.length - 1 ? lijst[i + 1] : null;

  const laatsteSlot = reeks[reeks.length - 1]?.slot;
  let week52Positie: number | null = null;
  if (live?.week52_laag != null && live.week52_hoog != null && live.koers != null && live.week52_hoog > live.week52_laag) {
    week52Positie = ((live.koers - live.week52_laag) / (live.week52_hoog - live.week52_laag)) * 100;
  }

  return {
    aandeel: a,
    tags: parseTags(a),
    live,
    referentie: ref,
    sindsLezingPct: sindsLezing(live ?? undefined, ref ?? undefined, laatsteSlot),
    reeks,
    benchmark,
    notities: notitiesVoor(ticker),
    vorige: vorige ? { ticker: vorige.ticker, naam: vorige.naam } : null,
    volgende: volgende ? { ticker: volgende.ticker, naam: volgende.naam } : null,
    referentiedatum: config.referentiedatum,
    week52Positie,
  };
}
