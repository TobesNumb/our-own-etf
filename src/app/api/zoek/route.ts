import { NextResponse } from "next/server";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);
  try {
    const p = await getProvider();
    return NextResponse.json(await p.zoek(q));
  } catch (e) {
    return NextResponse.json({ fout: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
