import { afgerond, fmtPct, richting } from "@/lib/format";

export function PctPill({ v, decimalen = 1, groot = false }: { v: number | null | undefined; decimalen?: number; groot?: boolean }) {
  const r = richting(afgerond(v, decimalen));
  const cls = r === "up" ? "pill-up" : r === "down" ? "pill-down" : "pill-flat";
  const pijl = r === "up" ? "▲ " : r === "down" ? "▼ " : "";
  return (
    <span className={`pill ${cls} ${groot ? "px-2.5 py-1 text-sm" : ""}`}>
      {pijl}
      {fmtPct(v, decimalen)}
    </span>
  );
}

export function KleurPct({ v, decimalen = 1, className = "" }: { v: number | null | undefined; decimalen?: number; className?: string }) {
  const r = richting(afgerond(v, decimalen));
  const cls = r === "up" ? "text-up" : r === "down" ? "text-down" : "text-ink";
  return <span className={`num ${cls} ${className}`}>{fmtPct(v, decimalen)}</span>;
}
