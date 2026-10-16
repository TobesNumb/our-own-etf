/** Kleine lijngrafiek van de laatste slotkoersen; kleur volgt de richting over de periode. */
export function Sparkline({ data, w = 84, h = 26 }: { data: number[]; w?: number; h?: number }) {
  if (data.length < 2) return <svg width={w} height={h} className="block" aria-hidden="true" />;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pad = 2;
  const pts = data.map((v, i) => [pad + (i / (data.length - 1)) * (w - pad * 2), pad + (1 - (v - min) / span) * (h - pad * 2)] as const);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const kleur = data[data.length - 1] >= data[0] ? "var(--up)" : "var(--down)";
  const laatste = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden="true">
      <path d={d} fill="none" stroke={kleur} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={laatste[0]} cy={laatste[1]} r="2.2" fill={kleur} />
    </svg>
  );
}
