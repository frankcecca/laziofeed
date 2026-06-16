// Notifiche push (Web Push / VAPID) per Lazio24.
// Le iscrizioni e lo stato di dedupe vivono sul volume persistente (data/),
// coerentemente con articles.json. L'invio avviene dopo ogni raccolta, solo
// quando emerge una NUOVA notizia più importante e recente.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import webpush from "web-push";

const DATA_DIR = path.join(process.cwd(), "data");
const SUBS_FILE = path.join(DATA_DIR, "push-subscriptions.json");
const STATE_FILE = path.join(DATA_DIR, "push-state.json");

// Soglia di freschezza: non notifichiamo storie più vecchie di così (minuti),
// per evitare push su notizie già "vecchie" al riavvio del servizio.
const FRESH_MINUTES = 120;

export function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || "";
}

// Configura le credenziali VAPID; ritorna false se mancano (push disattivato).
function configureVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  const subject = process.env.VAPID_SUBJECT || "mailto:legal@lazio24.news";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf-8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2));
}

export async function loadSubscriptions() {
  const data = await readJson(SUBS_FILE, []);
  return Array.isArray(data) ? data : [];
}

// Aggiunge un'iscrizione (idempotente sull'endpoint).
export async function addSubscription(sub) {
  if (!sub || !sub.endpoint) throw new Error("subscription non valida");
  const subs = await loadSubscriptions();
  if (!subs.some((s) => s.endpoint === sub.endpoint)) {
    subs.push(sub);
    await writeJson(SUBS_FILE, subs);
  }
  return subs.length;
}

// Rimuove un'iscrizione per endpoint.
export async function removeSubscription(endpoint) {
  if (!endpoint) return 0;
  const subs = await loadSubscriptions();
  const next = subs.filter((s) => s.endpoint !== endpoint);
  if (next.length !== subs.length) await writeJson(SUBS_FILE, next);
  return next.length;
}

// Invia un payload a tutti gli iscritti; rimuove quelli scaduti (404/410).
export async function sendToAll(payload) {
  if (!configureVapid()) {
    console.log("  push: chiavi VAPID assenti, invio saltato");
    return { sent: 0, removed: 0 };
  }
  const subs = await loadSubscriptions();
  if (!subs.length) return { sent: 0, removed: 0 };

  const body = JSON.stringify(payload);
  const dead = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, body);
        sent++;
      } catch (err) {
        const code = err?.statusCode;
        if (code === 404 || code === 410) dead.push(sub.endpoint);
        // altri errori (rete, 429…): lasciamo l'iscrizione, riproveremo
      }
    })
  );

  if (dead.length) {
    const remaining = subs.filter((s) => !dead.includes(s.endpoint));
    await writeJson(SUBS_FILE, remaining);
  }
  return { sent, removed: dead.length };
}

// Decide se notificare la notizia più importante e, in caso, invia.
// Dedupe: notifica solo quando l'id della top story cambia. Al primo avvio
// (nessuno stato) registra l'id senza inviare, per non spammare al deploy.
export async function maybeNotifyTopStory(topStory) {
  if (!topStory || !topStory.id) return { skipped: "no-top-story" };

  const state = await readJson(STATE_FILE, {});
  if (state.lastNotifiedId === topStory.id) {
    return { skipped: "already-notified" };
  }

  const firstRun = !state.lastNotifiedId;
  // Aggiorna sempre lo stato (anche se non inviamo) per evitare ripetizioni.
  await writeJson(STATE_FILE, {
    lastNotifiedId: topStory.id,
    updatedAt: new Date().toISOString(),
  });

  if (firstRun) return { skipped: "first-run" };

  // Freschezza: evita di notificare storie vecchie.
  const t = topStory.lastAt || topStory.publishedAt;
  const ageMin = t ? (Date.now() - new Date(t).getTime()) / 60000 : Infinity;
  if (ageMin > FRESH_MINUTES) return { skipped: "stale" };

  const result = await sendToAll({
    title: "Lazio24 — notizia del momento",
    body: topStory.title,
    url: `/n/${topStory.id}`,
    tag: "lazio24-top",
  });
  console.log(`  push inviati: ${result.sent} (rimossi scaduti: ${result.removed})`);
  return { sent: result.sent, removed: result.removed };
}
