import { NextResponse } from "next/server";
import { vernieuw } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const forceer = url.searchParams.get("forceer") === "1";
  try {
    const r = await vernieuw({ forceer });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ status: "fout", bericht: e instanceof Error ? e.message : String(e), live: 0, historiek: 0, referenties: 0, duurMs: 0, fouten: [] }, { status: 500 });
  }
}
