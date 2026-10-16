import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import type { DagKoers, LiveKoers } from "./provider/types";

/* ---------- rijtypes ---------- */

export interface AandeelRij {
  ticker: string;
  naam: string;
  beurs: string | null;
  valuta: string | null;
  sector: string | null;
  industrie: string | null;
  quote_type: string | null;
  tags: string; // JSON-lijst
  is_benchmark: number;
  actief: number;
  toegevoegd_op: string;
  volgorde: number;
  omschrijving: string | null;
  website: string | null;
}

export interface ReferentieRij {
  ticker: string;
  referentiedatum: string;
  handelsdag: string;
  referentiekoers: number;
  vastgezet: number;
  bron: string;
  vastgezet_op: string;
}

export interface LiveRij {
  ticker: string;
  koers: number | null;
  vorige_slot: number | null;
  open: number | null;
  dag_hoog: number | null;
  dag_laag: number | null;
  dag_wijziging: number | null;
  dag_pct: number | null;
  volume: number | null;
  week52_laag: number | null;
  week52_hoog: number | null;
  marktkap: number | null;
  kw_trailing: number | null;
  kw_forward: number | null;
  dividend_rendement: number | null;
  dividend_bedrag: number | null;
  beta: number | null;
  markt_status: string | null;
  koers_tijd: string | null;
  bijgewerkt_op: string;
}

export interface KoersRij {
  ticker: string;
  datum: string;
  open: number | null;
  hoog: number | null;
  laag: number | null;
  slot: number | null;
  slot_gecorrigeerd: number | null;
  volume: number | null;
}

export interface NotitieRij {
  id: number;
  ticker: string;
  datum: string;
  tekst: string;
  bron: string;
  aangemaakt_op: string;
}

export interface LogRij {
  id: number;
  tijdstip: string;
  type: string;
  status: string;
  bericht: string | null;
  duur_ms: number | null;
}

/* ---------- verbinding ---------- */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS aandelen (
  ticker TEXT PRIMARY KEY,
  naam TEXT NOT NULL,
  beurs TEXT, valuta TEXT, sector TEXT, industrie TEXT, quote_type TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  is_benchmark INTEGER NOT NULL DEFAULT 0,
  actief INTEGER NOT NULL DEFAULT 1,
  toegevoegd_op TEXT NOT NULL,
  volgorde INTEGER NOT NULL DEFAULT 0,
  omschrijving TEXT, website TEXT
);
CREATE TABLE IF NOT EXISTS referenties (
  ticker TEXT PRIMARY KEY,
  referentiedatum TEXT NOT NULL,
  handelsdag TEXT NOT NULL,
  referentiekoers REAL NOT NULL,
  vastgezet INTEGER NOT NULL DEFAULT 0,
  bron TEXT NOT NULL,
  vastgezet_op TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS koersen_dag (
  ticker TEXT NOT NULL, datum TEXT NOT NULL,
  open REAL, hoog REAL, laag REAL, slot REAL, slot_gecorrigeerd REAL, volume INTEGER,
  PRIMARY KEY (ticker, datum)
);
CREATE TABLE IF NOT EXISTS koers_live (
  ticker TEXT PRIMARY KEY,
  koers REAL, vorige_slot REAL, open REAL, dag_hoog REAL, dag_laag REAL,
  dag_wijziging REAL, dag_pct REAL, volume INTEGER,
  week52_laag REAL, week52_hoog REAL, marktkap REAL,
  kw_trailing REAL, kw_forward REAL, dividend_rendement REAL, dividend_bedrag REAL, beta REAL,
  markt_status TEXT, koers_tijd TEXT, bijgewerkt_op TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL, datum TEXT NOT NULL, tekst TEXT NOT NULL,
  bron TEXT NOT NULL DEFAULT 'eigen', aangemaakt_op TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS notities_ticker ON notities(ticker);
CREATE TABLE IF NOT EXISTS ophaallog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tijdstip TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL, bericht TEXT, duur_ms INTEGER
);
CREATE TABLE IF NOT EXISTS instellingen (sleutel TEXT PRIMARY KEY, waarde TEXT NOT NULL);
`;

type Db = Database.Database;
const g = globalThis as unknown as { __koerslijstDb?: Db };

export function db(): Db {
  if (g.__koerslijstDb) return g.__koerslijstDb;
  fs.mkdirSync(path.dirname(config.dbPad), { recursive: true });
  const d = new Database(config.dbPad);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  d.exec(SCHEMA);
  g.__koerslijstDb = d;
  seedAlsLeeg(d);
  return d;
}

const nu = () => new Date().toISOString();

/* ---------- seed ---------- */

function parseCsvRegel(regel: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < regel.length; i++) {
    const c = regel[i];
    if (inQ) {
      if (c === '"' && regel[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export interface ImportRegel { ticker: string; naam?: string; tags?: string[]; notitie?: string }

/** Leest een CSV (ticker,naam,tags,notitie) of een eenvoudige lijst "één ticker per regel". */
export function parseAandelenCsv(tekst: string): ImportRegel[] {
  const regels = tekst.split(/\r?\n/).map((r) => r.trim()).filter((r) => r && !r.startsWith("#"));
  const out: ImportRegel[] = [];
  for (const r of regels) {
    const cells = parseCsvRegel(r);
    if (cells[0].toLowerCase() === "ticker") continue; // kopregel
    const ticker = cells[0].toUpperCase();
    if (!ticker) continue;
    out.push({
      ticker,
      naam: cells[1] || undefined,
      tags: cells[2] ? cells[2].split("|").map((t) => t.trim()).filter(Boolean) : [],
      notitie: cells[3] || undefined,
    });
  }
  return out;
}

function seedAlsLeeg(d: Db) {
  const n = (d.prepare("SELECT COUNT(*) AS n FROM aandelen").get() as { n: number }).n;
  if (n > 0) return;
  const regels = fs.existsSync(config.seedPad) ? parseAandelenCsv(fs.readFileSync(config.seedPad, "utf8")) : [];
  const tx = d.transaction(() => {
    regels.forEach((r, i) => voegAandeelToe({ ...r, volgorde: i }, d));
    config.benchmarks.forEach((b, i) => voegAandeelToe({ ticker: b.ticker, naam: b.naam, tags: ["benchmark"], isBenchmark: true, volgorde: 1000 + i }, d));
  });
  tx();
}

/* ---------- aandelen ---------- */

export function alleAandelen(opts: { inclBenchmarks?: boolean; inclInactief?: boolean } = {}, d = db()): AandeelRij[] {
  const where: string[] = [];
  if (!opts.inclBenchmarks) where.push("is_benchmark = 0");
  if (!opts.inclInactief) where.push("actief = 1");
  const sql = `SELECT * FROM aandelen ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY volgorde, naam`;
  return d.prepare(sql).all() as AandeelRij[];
}

export function getAandeel(ticker: string, d = db()): AandeelRij | undefined {
  return d.prepare("SELECT * FROM aandelen WHERE ticker = ?").get(ticker) as AandeelRij | undefined;
}

export function voegAandeelToe(
  a: { ticker: string; naam?: string; tags?: string[]; notitie?: string; isBenchmark?: boolean; volgorde?: number; beurs?: string; valuta?: string; quoteType?: string },
  d = db(),
): { nieuw: boolean } {
  const ticker = a.ticker.trim().toUpperCase();
  const bestaand = getAandeel(ticker, d);
  if (bestaand) {
    d.prepare("UPDATE aandelen SET actief = 1 WHERE ticker = ?").run(ticker);
    return { nieuw: false };
  }
  const volgorde = a.volgorde ?? ((d.prepare("SELECT COALESCE(MAX(volgorde), -1) + 1 AS v FROM aandelen WHERE is_benchmark = 0").get() as { v: number }).v);
  d.prepare(
    `INSERT INTO aandelen (ticker, naam, beurs, valuta, quote_type, tags, is_benchmark, actief, toegevoegd_op, volgorde)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  ).run(ticker, a.naam || ticker, a.beurs ?? null, a.valuta ?? null, a.quoteType ?? null, JSON.stringify(a.tags ?? []), a.isBenchmark ? 1 : 0, nu(), volgorde);
  if (a.notitie) voegNotitieToe(ticker, a.notitie, "lezing", d);
  return { nieuw: true };
}

export function updateAandeel(ticker: string, patch: Partial<Pick<AandeelRij, "naam" | "beurs" | "valuta" | "sector" | "industrie" | "quote_type" | "tags" | "omschrijving" | "website" | "volgorde">>, d = db()) {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${k} = @${k}`).join(", ");
  d.prepare(`UPDATE aandelen SET ${sets} WHERE ticker = @ticker`).run({ ...patch, ticker });
}

export function verwijderAandeel(ticker: string, d = db()) {
  const tx = d.transaction(() => {
    d.prepare("DELETE FROM aandelen WHERE ticker = ?").run(ticker);
    d.prepare("DELETE FROM referenties WHERE ticker = ?").run(ticker);
    d.prepare("DELETE FROM koers_live WHERE ticker = ?").run(ticker);
    d.prepare("DELETE FROM koersen_dag WHERE ticker = ?").run(ticker);
    d.prepare("DELETE FROM notities WHERE ticker = ?").run(ticker);
  });
  tx();
}

export function parseTags(a: AandeelRij): string[] {
  try { const t = JSON.parse(a.tags); return Array.isArray(t) ? t : []; } catch { return []; }
}

/* ---------- live ---------- */

export function upsertLive(q: LiveKoers, d = db()) {
  d.prepare(
    `INSERT INTO koers_live (ticker, koers, vorige_slot, open, dag_hoog, dag_laag, dag_wijziging, dag_pct, volume,
       week52_laag, week52_hoog, marktkap, kw_trailing, kw_forward, dividend_rendement, dividend_bedrag, beta, markt_status, koers_tijd, bijgewerkt_op)
     VALUES (@ticker, @koers, @vorigeSlot, @open, @dagHoog, @dagLaag, @dagWijziging, @dagPct, @volume,
       @week52Laag, @week52Hoog, @marktkap, @kwTrailing, @kwForward, @dividendRendement, @dividendBedrag, @beta, @marktStatus, @koersTijd, @bijgewerkt)
     ON CONFLICT(ticker) DO UPDATE SET
       koers=excluded.koers, vorige_slot=excluded.vorige_slot, open=excluded.open, dag_hoog=excluded.dag_hoog, dag_laag=excluded.dag_laag,
       dag_wijziging=excluded.dag_wijziging, dag_pct=excluded.dag_pct, volume=excluded.volume,
       week52_laag=excluded.week52_laag, week52_hoog=excluded.week52_hoog, marktkap=excluded.marktkap,
       kw_trailing=excluded.kw_trailing, kw_forward=excluded.kw_forward, dividend_rendement=excluded.dividend_rendement,
       dividend_bedrag=excluded.dividend_bedrag, beta=excluded.beta, markt_status=excluded.markt_status, koers_tijd=excluded.koers_tijd,
       bijgewerkt_op=excluded.bijgewerkt_op`,
  ).run({
    ticker: q.ticker, koers: q.koers ?? null, vorigeSlot: q.vorigeSlot ?? null, open: q.open ?? null, dagHoog: q.dagHoog ?? null,
    dagLaag: q.dagLaag ?? null, dagWijziging: q.dagWijziging ?? null, dagPct: q.dagPct ?? null, volume: q.volume ?? null,
    week52Laag: q.week52Laag ?? null, week52Hoog: q.week52Hoog ?? null, marktkap: q.marktkap ?? null, kwTrailing: q.kwTrailing ?? null,
    kwForward: q.kwForward ?? null, dividendRendement: q.dividendRendement ?? null, dividendBedrag: q.dividendBedrag ?? null,
    beta: q.beta ?? null, marktStatus: q.marktStatus ?? null, koersTijd: q.koersTijd ?? null, bijgewerkt: nu(),
  });
}

export function alleLive(d = db()): Map<string, LiveRij> {
  const rows = d.prepare("SELECT * FROM koers_live").all() as LiveRij[];
  return new Map(rows.map((r) => [r.ticker, r]));
}

export function getLive(ticker: string, d = db()): LiveRij | undefined {
  return d.prepare("SELECT * FROM koers_live WHERE ticker = ?").get(ticker) as LiveRij | undefined;
}

/* ---------- historiek ---------- */

export function upsertKoersen(ticker: string, rows: DagKoers[], d = db()) {
  const stmt = d.prepare(
    `INSERT INTO koersen_dag (ticker, datum, open, hoog, laag, slot, slot_gecorrigeerd, volume)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(ticker, datum) DO UPDATE SET open=excluded.open, hoog=excluded.hoog, laag=excluded.laag,
       slot=excluded.slot, slot_gecorrigeerd=excluded.slot_gecorrigeerd, volume=excluded.volume`,
  );
  const tx = d.transaction((rs: DagKoers[]) => {
    for (const r of rs) if (r.slot !== null) stmt.run(ticker, r.datum, r.open, r.hoog, r.laag, r.slot, r.slotGecorrigeerd, r.volume);
  });
  tx(rows);
}

export function laatsteDatum(ticker: string, d = db()): string | null {
  const r = d.prepare("SELECT MAX(datum) AS m FROM koersen_dag WHERE ticker = ?").get(ticker) as { m: string | null };
  return r.m;
}

export function koersenVanaf(ticker: string, van: string, d = db()): KoersRij[] {
  return d.prepare("SELECT * FROM koersen_dag WHERE ticker = ? AND datum >= ? ORDER BY datum").all(ticker, van) as KoersRij[];
}

export function laatsteSlots(ticker: string, n: number, d = db()): { datum: string; slot: number }[] {
  const rows = d.prepare("SELECT datum, slot FROM koersen_dag WHERE ticker = ? AND slot IS NOT NULL ORDER BY datum DESC LIMIT ?").all(ticker, n) as { datum: string; slot: number }[];
  return rows.reverse();
}

/** Eerste handelsdag op of na de gegeven datum, met slotkoers. */
export function slotOpOfNa(ticker: string, datum: string, d = db()): { datum: string; slot: number } | undefined {
  return d.prepare("SELECT datum, slot FROM koersen_dag WHERE ticker = ? AND datum >= ? AND slot IS NOT NULL ORDER BY datum LIMIT 1").get(ticker, datum) as { datum: string; slot: number } | undefined;
}

/** Laatste slotkoers op of voor de gegeven datum. */
export function slotOpOfVoor(ticker: string, datum: string, d = db()): { datum: string; slot: number } | undefined {
  return d.prepare("SELECT datum, slot FROM koersen_dag WHERE ticker = ? AND datum <= ? AND slot IS NOT NULL ORDER BY datum DESC LIMIT 1").get(ticker, datum) as { datum: string; slot: number } | undefined;
}

/* ---------- referenties ---------- */

export function getReferentie(ticker: string, d = db()): ReferentieRij | undefined {
  return d.prepare("SELECT * FROM referenties WHERE ticker = ?").get(ticker) as ReferentieRij | undefined;
}

export function alleReferenties(d = db()): Map<string, ReferentieRij> {
  const rows = d.prepare("SELECT * FROM referenties").all() as ReferentieRij[];
  return new Map(rows.map((r) => [r.ticker, r]));
}

export function setReferentie(r: Omit<ReferentieRij, "vastgezet_op">, d = db()) {
  d.prepare(
    `INSERT INTO referenties (ticker, referentiedatum, handelsdag, referentiekoers, vastgezet, bron, vastgezet_op)
     VALUES (@ticker, @referentiedatum, @handelsdag, @referentiekoers, @vastgezet, @bron, @vastgezet_op)
     ON CONFLICT(ticker) DO UPDATE SET referentiedatum=excluded.referentiedatum, handelsdag=excluded.handelsdag,
       referentiekoers=excluded.referentiekoers, vastgezet=excluded.vastgezet, bron=excluded.bron, vastgezet_op=excluded.vastgezet_op`,
  ).run({ ...r, vastgezet_op: nu() });
}

/* ---------- notities ---------- */

export function notitiesVoor(ticker: string, d = db()): NotitieRij[] {
  return d.prepare("SELECT * FROM notities WHERE ticker = ? ORDER BY datum DESC, id DESC").all(ticker) as NotitieRij[];
}

export function notitieTellingen(d = db()): Map<string, number> {
  const rows = d.prepare("SELECT ticker, COUNT(*) AS n FROM notities GROUP BY ticker").all() as { ticker: string; n: number }[];
  return new Map(rows.map((r) => [r.ticker, r.n]));
}

export function voegNotitieToe(ticker: string, tekst: string, bron = "eigen", d = db()): NotitieRij {
  const datum = new Date().toISOString().slice(0, 10);
  const info = d.prepare("INSERT INTO notities (ticker, datum, tekst, bron, aangemaakt_op) VALUES (?, ?, ?, ?, ?)").run(ticker, datum, tekst, bron, nu());
  return d.prepare("SELECT * FROM notities WHERE id = ?").get(info.lastInsertRowid) as NotitieRij;
}

export function updateNotitie(id: number, tekst: string, d = db()) {
  d.prepare("UPDATE notities SET tekst = ? WHERE id = ?").run(tekst, id);
}

export function verwijderNotitie(id: number, d = db()) {
  d.prepare("DELETE FROM notities WHERE id = ?").run(id);
}

/* ---------- log & instellingen ---------- */

export function schrijfLog(type: string, status: "ok" | "fout" | "deels", bericht?: string, duurMs?: number, d = db()) {
  d.prepare("INSERT INTO ophaallog (tijdstip, type, status, bericht, duur_ms) VALUES (?, ?, ?, ?, ?)").run(nu(), type, status, bericht ?? null, duurMs ?? null);
  d.prepare("DELETE FROM ophaallog WHERE id NOT IN (SELECT id FROM ophaallog ORDER BY id DESC LIMIT 200)").run();
}

export function laatsteLogs(n = 20, d = db()): LogRij[] {
  return d.prepare("SELECT * FROM ophaallog ORDER BY id DESC LIMIT ?").all(n) as LogRij[];
}

export function getInstelling(sleutel: string, d = db()): string | null {
  const r = d.prepare("SELECT waarde FROM instellingen WHERE sleutel = ?").get(sleutel) as { waarde: string } | undefined;
  return r?.waarde ?? null;
}

export function setInstelling(sleutel: string, waarde: string, d = db()) {
  d.prepare("INSERT INTO instellingen (sleutel, waarde) VALUES (?, ?) ON CONFLICT(sleutel) DO UPDATE SET waarde = excluded.waarde").run(sleutel, waarde);
}
