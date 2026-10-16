import { NextResponse } from "next/server";
import { parseAandelenCsv, voegAandeelToe } from "@/lib/db";
import { vernieuw } from "@/lib/sync";

export const dynamic = "force-dynamic";

/** Body: { csv: "ticker,naam,tags,notitie\n..." } of één ticker per regel. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { csv?: string } | null;
  if (!body?.csv?.trim()) return NextResponse.json({ fout: "csv is leeg" }, { status: 400 });
  const regels = parseAandelenCsv(body.csv);
  let nieuw = 0, bestaand = 0;
  for (const r of regels) {
    const res = voegAandeelToe(r);
    if (res.nieuw) nieuw++; else bestaand++;
  }
  const sync = nieuw > 0 ? await vernieuw({ forceer: true }).catch(() => null) : null;
  return NextResponse.json({ nieuw, bestaand, totaal: regels.length, fouten: sync?.fouten ?? [] });
}
