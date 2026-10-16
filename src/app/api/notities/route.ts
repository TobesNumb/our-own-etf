import { NextResponse } from "next/server";
import { getAandeel, voegNotitieToe } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { ticker?: string; tekst?: string; bron?: string } | null;
  if (!body?.ticker || !body.tekst?.trim()) return NextResponse.json({ fout: "ticker en tekst zijn verplicht" }, { status: 400 });
  if (!getAandeel(body.ticker)) return NextResponse.json({ fout: "onbekend aandeel" }, { status: 404 });
  const n = voegNotitieToe(body.ticker, body.tekst.trim(), body.bron === "lezing" ? "lezing" : "eigen");
  return NextResponse.json(n, { status: 201 });
}
