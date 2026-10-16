import { afgerond, richting } from "@/lib/format";

export function KpiTile({ label, waarde, sub, pct, klein = false }: { label: string; waarde: React.ReactNode; sub?: React.ReactNode; pct?: number | null; klein?: boolean }) {
  const r = pct === undefined ? "flat" : richting(afgerond(pct));
  const kleur = r === "up" ? "text-up" : r === "down" ? "text-down" : "text-ink";
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-surface-2 px-3.5 py-3">
      <span className="label">{label}</span>
      <span className={`num font-display font-extrabold tracking-tight ${klein ? "text-base" : "text-2xl"} ${kleur}`}>{waarde}</span>
      {sub && <span className="truncate text-xs text-ink-2">{sub}</span>}
    </div>
  );
}
