import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { collect } from "../../../lib/collect";
import { maybeNotifyTopStory, maybeSendEveningRecap } from "../../../lib/push";

// Esecuzione lato server (usa fs, fetch, rss-parser): runtime Node, non edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // secondi (se l'host lo supporta)

// GET /api/collect?token=XYZ
// Esegue la raccolta e aggiorna data/articles.json + public/images.
// Pensata per essere chiamata da uno scheduler ogni 15-30 minuti.
export async function GET(request) {
  const secret = process.env.COLLECT_SECRET;
  const token = new URL(request.url).searchParams.get("token");

  // Se è impostato un secret, la rotta è accessibile solo col token giusto.
  if (secret && token !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { edition, digest, topStory, articles } = await collect();
    const out = path.join(process.cwd(), "data", "articles.json");
    await mkdir(path.dirname(out), { recursive: true });
    const updatedAt = new Date().toISOString();
    await writeFile(
      out,
      JSON.stringify({ updatedAt, edition, digest, topStory, articles }, null, 2)
    );
    // Notifica push se è emersa una nuova notizia più importante (non blocca
    // la raccolta in caso di errore).
    try {
      await maybeNotifyTopStory(topStory);
      await maybeSendEveningRecap({ digest, articles });
    } catch (e) {
      console.error("push notify error:", e?.message || e);
    }
    return NextResponse.json({ ok: true, count: articles.length, updatedAt });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
