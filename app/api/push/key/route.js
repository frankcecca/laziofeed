import { NextResponse } from "next/server";
import { getPublicKey } from "../../../../lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/push/key → chiave pubblica VAPID per iscrivere il client.
export async function GET() {
  const key = getPublicKey();
  if (!key) {
    return NextResponse.json({ error: "push non configurato" }, { status: 503 });
  }
  return NextResponse.json({ key });
}
