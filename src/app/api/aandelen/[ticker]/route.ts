import { NextResponse } from "next/server";
import { getAandeel, setReferentie, updateAandeel, verwijderAandeel } from "@/lib/db";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ ticker: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { ticker } = await params;
  const t = decodeURIComponent(ticker);
  if (!getAandeel(t)) return NextResponse.json({ fout: "onbekend aandeel" }, { status: 404 });
  verwijderAandeel(t);
  return NextResponse.json({ ok: true });
}

/** Naam, tags of een handmatige referentiekoers aanpassen. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { ticker } = await params;
  const t = decodeURIComponent(ticker);
  if (!getAandeel(t)) return NextResponse.json({ fout: "onbekend aandeel" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { naam?: string; tags?: string[]; referentiekoers?: number | null } | null;
  if (!body) return NextResponse.json({ fout: "ongeldige body" }, { status: 400 });
  const patch: { naam?: string; tags?: string } = {};
  if (typeof body.naam === "string" && body.naam.trim()) patch.naam = body.naam.trim();
  if (Array.isArray(body.tags)) patch.tags = JSON.stringify(body.tags.map(String));
  if (Object.keys(patch).length) updateAandeel(t, patch);
  if (typeof body.referentiekoers === "number" && body.referentiekoers > 0) {
    setReferentie({ ticker: t, referentiedatum: config.referentiedatum, handelsdag: config.referentiedatum, referentiekoers: body.referentiekoers, vastgezet: 1, bron: "handmatig" });
  }
  return NextResponse.json({ ok: true });
}
