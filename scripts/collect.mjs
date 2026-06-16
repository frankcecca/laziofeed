// Script eseguibile: raccoglie le notizie e le salva in data/articles.json
// Uso:  npm run collect
// Pianificalo con un cron (Vercel Cron, GitHub Actions, ecc.) ogni 15-30 min.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collect } from "../lib/collect.js";
import { maybeNotifyTopStory } from "../lib/push.js";

// In locale carica le variabili dal .env (su Railway il file non esiste e si
// usano le env reali dell'ambiente: l'eventuale errore viene ignorato).
try {
  process.loadEnvFile();
} catch {}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "data", "articles.json");

try {
  const { edition, digest, topStory, articles } = await collect();
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      { updatedAt: new Date().toISOString(), edition, digest, topStory, articles },
      null,
      2
    )
  );
  console.log(`\n✅ Salvati ${articles.length} articoli in data/articles.json`);
  try {
    await maybeNotifyTopStory(topStory);
  } catch (e) {
    console.error("push notify error:", e?.message || e);
  }
  // fetch (undici) tiene aperte connessioni keep-alive: usciamo esplicitamente
  // così il prompt del terminale torna subito.
  process.exit(0);
} catch (err) {
  console.error("\n❌ Errore nella raccolta:", err);
  process.exit(1);
}
