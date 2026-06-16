import { NextResponse } from "next/server";
import { addSubscription } from "../../../../lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/push/subscribe  body: PushSubscription (JSON)
export async function POST(request) {
  try {
    const sub = await request.json();
    if (!sub?.endpoint) {
      return NextResponse.json({ error: "subscription mancante" }, { status: 400 });
    }
    const count = await addSubscription(sub);
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
