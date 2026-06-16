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

// Per quante ore ricordiamo le notizie già notificate (per il dedupe): entro
// questa finestra la stessa notizia (anche se cambia id/primario tra le
// raccolte) non viene re-inviata.
const RECENT_HOURS = 12;

// Soglie di similarità: due "top story" sono la stessa notizia se i titoli si
// somigliano abbastanza OPPURE condividono gran parte degli articoli-fonte.
const TITLE_SIM = 0.5;
const URL_OVERLAP = 0.5;

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

// Parole significative del titolo (per il confronto di similarità).
function tokenize(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // rimuove i diacritici (à→a, é→e…)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
}

// Similarità di Jaccard tra due insiemi di parole (0..1).
function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

// Quota di sovrapposizione tra due insiemi (rispetto al più piccolo).
function overlapRatio(a = [], b = []) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / Math.min(A.size, B.size);
}

// URL degli articoli-fonte del cluster (stabili anche se cambia il primario).
function storyUrls(s) {
  const urls = (s.sources || []).map((x) => x.url).filter(Boolean);
  if (s.url) urls.push(s.url);
  return urls;
}

// "Firma" di contenuto di una storia, usata per il dedupe.
function signature(s) {
  return { tokens: tokenize(s.title), urls: storyUrls(s), at: new Date().toISOString() };
}

function isSameNews(sig, prev) {
  return (
    jaccard(sig.tokens, prev.tokens || []) >= TITLE_SIM ||
    overlapRatio(sig.urls, prev.urls || []) >= URL_OVERLAP
  );
}

// Decide se notificare la notizia più importante e, in caso, invia.
// Dedupe per CONTENUTO (non per id, che può cambiare quando una nuova fonte
// riprende la stessa notizia): non re-invia se la storia somiglia a una già
// notificata nelle ultime RECENT_HOURS. Al primo avvio registra senza inviare.
export async function maybeNotifyTopStory(topStory) {
  if (!topStory || !topStory.id) return { skipped: "no-top-story" };

  const state = await readJson(STATE_FILE, {});
  const cutoff = Date.now() - RECENT_HOURS * 3600 * 1000;
  let recent = (Array.isArray(state.recent) ? state.recent : []).filter(
    (r) => new Date(r.at || 0).getTime() >= cutoff
  );

  const sig = signature(topStory);

  // Già notificata di recente (stessa notizia, anche con id diverso)?
  if (recent.some((r) => isSameNews(sig, r))) {
    await writeJson(STATE_FILE, { initialized: true, recent });
    return { skipped: "duplicate" };
  }

  const remember = async (reason) => {
    recent.push(sig);
    await writeJson(STATE_FILE, { initialized: true, recent });
    return { skipped: reason };
  };

  // Primo avvio (o migrazione dal vecchio stato): registra senza inviare, così
  // non si spamma una notizia magari già vecchia al momento del deploy.
  if (!state.initialized) return remember("first-run");

  // Freschezza: evita di notificare storie vecchie.
  const t = topStory.lastAt || topStory.publishedAt;
  const ageMin = t ? (Date.now() - new Date(t).getTime()) / 60000 : Infinity;
  if (ageMin > FRESH_MINUTES) return remember("stale");

  const result = await sendToAll({
    title: "Lazio24 — notizia del momento",
    body: topStory.title,
    url: `/n/${topStory.id}`,
    tag: "lazio24-top",
  });
  recent.push(sig);
  await writeJson(STATE_FILE, { initialized: true, recent });
  console.log(`  push inviati: ${result.sent} (rimossi scaduti: ${result.removed})`);
  return { sent: result.sent, removed: result.removed };
}
