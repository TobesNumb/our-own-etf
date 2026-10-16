import { NextResponse } from "next/server";
import { updateNotitie, verwijderNotitie } from "@/lib/db";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { tekst?: string } | null;
  if (!body?.tekst?.trim()) return NextResponse.json({ fout: "tekst is verplicht" }, { status: 400 });
  updateNotitie(Number(id), body.tekst.trim());
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  verwijderNotitie(Number(id));
  return NextResponse.json({ ok: true });
}
