import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { collect } from "../../../lib/collect";
import { maybeNotifyTopStory, maybeSendEveningRecap } from "../../../lib/push";

// Esecuzione lato server (usa fs, fetch, rss-parser): runtime Node, non edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // secondi (se l'host lo supporta)

// Lock in-memory: evita che due raccolte girino in parallelo (es. se lo
// scheduler richiama mentre la precedente è ancora in corso). Vive quanto il
// processo Node: su Railway il server è persistente, quindi è affidabile.
let running = false;
let lastRun = null; // { startedAt, finishedAt, ok, count, error }

// Esegue l'intera raccolta e aggiorna data/articles.json + invia le notifiche.
async function runCollect() {
  const startedAt = new Date().toISOString();
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
    lastRun = { startedAt, finishedAt: updatedAt, ok: true, count: articles.length };
    return { ok: true, count: articles.length, updatedAt };
  } catch (err) {
    const error = String(err?.message || err);
    console.error("collect error:", error);
    lastRun = { startedAt, finishedAt: new Date().toISOString(), ok: false, error };
    return { ok: false, error };
  }
}

// GET /api/collect?token=XYZ
// Risponde SUBITO (200) e lancia la raccolta in background: così lo scheduler
// (es. cron-job.org) non va in timeout a 30s mentre feed RSS + LLM lavorano.
// Su Railway il processo è persistente, quindi il task in background completa.
// Aggiungi ?wait=1 per forzare l'esecuzione sincrona e ricevere il risultato
// (utile in debug).
export async function GET(request) {
  const secret = process.env.COLLECT_SECRET;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const wait = url.searchParams.get("wait");

  // Se è impostato un secret, la rotta è accessibile solo col token giusto.
  if (secret && token !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Già in corso: non avviarne un'altra (rispondi subito, niente errore).
  if (running) {
    return NextResponse.json(
      { ok: true, status: "already-running", lastRun },
      { status: 202 }
    );
  }

  // Modalità sincrona (debug): esegui e restituisci il risultato completo.
  if (wait) {
    running = true;
    try {
      const result = await runCollect();
      return NextResponse.json(result, { status: result.ok ? 200 : 500 });
    } finally {
      running = false;
    }
  }

  // Modalità normale: lancia in background e rispondi subito.
  running = true;
  runCollect().finally(() => {
    running = false;
  });

  return NextResponse.json(
    { ok: true, status: "started", lastRun },
    { status: 202 }
  );
}
