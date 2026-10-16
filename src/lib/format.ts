/** Opmaak in Belgisch-Nederlandse conventies (komma als decimaalteken, spatie voor %). */

const SYMBOOL: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", GBp: "p", CHF: "CHF", DKK: "DKK", SEK: "SEK", NOK: "NOK", JPY: "¥", CAD: "C$", AUD: "A$", HKD: "HK$" };

export function nf(decimalen = 2) {
  return new Intl.NumberFormat("nl-BE", { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen });
}

export function fmtGetal(v: number | null | undefined, decimalen = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "–";
  return nf(decimalen).format(v);
}

export function fmtKoers(v: number | null | undefined, valuta?: string | null): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "–";
  const dec = Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 100 ? 2 : 2;
  const s = nf(dec).format(v);
  if (!valuta) return s;
  const sym = SYMBOOL[valuta] ?? valuta;
  return `${sym} ${s}`;
}

/** Rondt af op het getoonde aantal decimalen, zodat −0,04 niet als daling telt. */
export function afgerond(v: number | null | undefined, decimalen = 1): number | null {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  const f = 10 ** decimalen;
  const r = Math.round(v * f) / f;
  return r === 0 ? 0 : r;
}

export function fmtPct(v: number | null | undefined, decimalen = 1, teken = true): string {
  const r = afgerond(v, decimalen);
  if (r === null) return "–";
  v = r;
  const s = nf(decimalen).format(Math.abs(v));
  const t = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${teken ? t : ""}${s} %`;
}

export function fmtGroot(v: number | null | undefined, valuta?: string | null): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "–";
  const sym = valuta ? (SYMBOOL[valuta] ?? valuta) + " " : "";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${sym}${nf(1).format(v / 1e12)} bln`;
  if (abs >= 1e9) return `${sym}${nf(1).format(v / 1e9)} mld`;
  if (abs >= 1e6) return `${sym}${nf(0).format(v / 1e6)} mln`;
  if (abs >= 1e3) return `${sym}${nf(0).format(v / 1e3)} k`;
  return `${sym}${nf(0).format(v)}`;
}

export function fmtVolume(v: number | null | undefined): string {
  if (v === null || v === undefined) return "–";
  if (v >= 1e6) return `${nf(1).format(v / 1e6)} mln`;
  if (v >= 1e3) return `${nf(0).format(v / 1e3)} k`;
  return nf(0).format(v);
}

export function fmtDatum(iso: string | null | undefined, opties: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  if (!iso) return "–";
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return new Intl.DateTimeFormat("nl-BE", opties).format(d);
}

export function fmtTijd(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Intl.DateTimeFormat("nl-BE", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function fmtDatumTijd(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function richting(v: number | null | undefined): "up" | "down" | "flat" {
  if (v === null || v === undefined || !Number.isFinite(v) || v === 0) return "flat";
  return v > 0 ? "up" : "down";
}
