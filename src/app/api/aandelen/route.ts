import { NextResponse } from "next/server";
import { alleAandelen, parseTags, voegAandeelToe } from "@/lib/db";
import { bepaalReferentie, vernieuw } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = alleAandelen({ inclBenchmarks: true }).map((a) => ({ ...a, tags: parseTags(a) }));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { ticker?: string; naam?: string; tags?: string[]; notitie?: string; beurs?: string; quoteType?: string } | null;
  if (!body?.ticker?.trim()) return NextResponse.json({ fout: "ticker is verplicht" }, { status: 400 });
  const r = voegAandeelToe({ ticker: body.ticker, naam: body.naam, tags: body.tags, notitie: body.notitie, beurs: body.beurs, quoteType: body.quoteType });
  // Koersen en historiek van het nieuwe aandeel meteen ophalen
  await vernieuw({ forceer: true }).catch(() => null);
  bepaalReferentie(body.ticker.trim().toUpperCase());
  return NextResponse.json(r, { status: r.nieuw ? 201 : 200 });
}
