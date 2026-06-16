import { NextResponse } from "next/server";
import { removeSubscription } from "../../../../lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/push/unsubscribe  body: { endpoint }
export async function POST(request) {
  try {
    const { endpoint } = await request.json();
    await removeSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
