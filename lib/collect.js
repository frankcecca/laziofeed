// Raccolta notizie: legge i feed RSS, filtra per pertinenza,
// deduplica e genera un riassunto per ogni articolo.

import Parser from "rss-parser";
import crypto from "node:crypto";
import path from "node:path";
import { readFile, writeFile, mkdir, readdir, unlink, stat } from "node:fs/promises";
import {
  SOURCES,
  KEYWORDS,
  STRONG_KEYWORDS,
  EXCLUDE,
  FOOTBALL_CONTEXT,
  PROMO_PATTERNS,
  PROMO_CATEGORIES,
} from "./sources.js";
import { summarize, digest, synthesizeStory } from "./summarize.js";

// IMG_DIR resta usato solo dalla pulizia (rimuove eventuali immagini scaricate
// in passato): non scarichiamo più foto di terzi.
const IMG_DIR = path.join(process.cwd(), "public", "images");
// Le favicon vanno sul volume persistente (data/), non in public/: in
// produzione `next start` NON serve i file scritti in public/ a runtime.
// Vengono servite dalla route /sources/[file].
const FAVICON_DIR = path.join(process.cwd(), "data", "sources");

const parser = new Parser({
  timeout: 15000,
  // User-agent "da browser": alcune testate bloccano i client di default.
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    Accept:
      "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

function hashId(url) {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 12);
}

// Cache delle sintesi sul volume: rigeneriamo solo le storie nuove e riusiamo
// quelle già elaborate, così l'AI viene chiamata una volta sola per notizia
// (costo minimo anche col cron ogni pochi minuti).
const CACHE_FILE = path.join(process.cwd(), "data", "summaries.json");
// Cambiare versione invalida tutta la cache al collect successivo (utile quando
// si modifica la logica delle sintesi, es. la pulizia delle etichette).
const CACHE_VERSION = "v2";

async function loadCache() {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

async function saveCache(obj) {
  try {
    await mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(obj));
  } catch (err) {
    console.warn(`  ⚠️  Cache sintesi non salvata (${err.message}).`);
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Scarica (lato server) la favicon di un dominio in public/sources, così il
// browser dell'utente non contatta servizi di terze parti (privacy by design).
async function ensureFavicon(host) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) return false; // icona vuota/placeholder
    await mkdir(FAVICON_DIR, { recursive: true });
    await writeFile(path.join(FAVICON_DIR, `${host}.png`), buf);
    return true;
  } catch {
    return false;
  }
}

// Esegue una funzione async su una lista con concorrenza limitata.
async function mapPool(items, limit, fn) {
  const queue = [...items.entries()];
  const workers = Array.from({ length: limit }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [i, item] = next;
      await fn(item, i);
    }
  });
  await Promise.all(workers);
}

// Pulizia delle immagini su disco: rimuove tutto ciò che non appartiene più
// alla finestra delle ultime 24 ore. Un file viene cancellato se non è più
// referenziato dall'edizione corrente, oppure — come rete di sicurezza contro
// orfani da run interrotti — se è più vecchio di EDITION_WINDOW_HOURS.
async function cleanupImages(keepFiles) {
  let removed = 0;
  try {
    const existing = await readdir(IMG_DIR);
    const maxAgeMs = EDITION_WINDOW_HOURS * 60 * 60 * 1000;
    await Promise.all(
      existing
        .filter((f) => f !== ".gitkeep")
        .map(async (f) => {
          const full = path.join(IMG_DIR, f);
          let drop = !keepFiles.has(f);
          if (!drop) {
            try {
              const { mtimeMs } = await stat(full);
              if (Date.now() - mtimeMs > maxAgeMs) drop = true;
            } catch {
              // file sparito: ignora
            }
          }
          if (drop) {
            await unlink(full).catch(() => {});
            removed++;
          }
        })
    );
  } catch {
    // cartella inesistente: niente da pulire
  }
  return removed;
}

// Riconosce post pubblicitari/sponsorizzati da titolo+descrizione, categorie e URL.
function isPromotional(item) {
  const text = `${item.title || ""}  ${item.contentSnippet || item.content || ""}`;
  if (PROMO_PATTERNS.some((re) => re.test(text))) return true;

  const cats = []
    .concat(item.categories || [])
    .map((c) => (typeof c === "string" ? c : c?._ || "").toLowerCase());
  if (cats.some((c) => PROMO_CATEGORIES.some((p) => c.includes(p)))) return true;

  const url = (item.link || "").toLowerCase();
  if (/\/(sponsor|promo|adv|advertising|pubblicita|offerte?)\//.test(url)) {
    return true;
  }
  return false;
}

function isRelevant(text = "", strict = false) {
  const t = text.toLowerCase();
  if (!KEYWORDS.some((k) => t.includes(k))) return false;
  // Scarta i falsi positivi (es. "Regione Lazio"), a meno che non ci sia
  // un chiaro segnale calcistico nel testo.
  const hasStrong = STRONG_KEYWORDS.some((k) => t.includes(k));
  const hasExcluded = EXCLUDE.some((k) => t.includes(k));
  if (hasExcluded && !hasStrong) return false;
  // Feed generalisti: "Lazio" da solo non basta (è spesso la Regione),
  // serve un contesto calcistico esplicito.
  if (strict) {
    const hasFootball =
      hasStrong || FOOTBALL_CONTEXT.some((k) => t.includes(k));
    if (!hasFootball) return false;
  }
  return true;
}

// Parole troppo comuni/grammaticali: non aiutano a distinguere la storia.
const STORY_STOPWORDS = new Set([
  "il","lo","la","gli","le","un","uno","una","di","da","in","con","su","per",
  "tra","fra","del","dello","della","dei","degli","delle","al","allo","alla",
  "ai","agli","alle","dal","dalla","nel","nella","sul","sulla","che","chi",
  "non","come","dove","sono","sara","verso","ecco","tutti","tutte","anche",
  // termini onnipresenti nel dominio Lazio
  "lazio","mercato","calciomercato","news","ultimissime","live","ufficiale",
  "video","foto","rassegna","stampa","biancoceleste","biancocelesti","aquile",
  "notizie","oggi","gioco","parole","ultime",
]);

// Finestra temporale per il "momentum": fonti che riprendono la stessa
// storia entro questo intervallo contano come tendenza del momento.
const TREND_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 ore

// Lazio24: si raccolgono solo le notizie delle ultime 24 ore.
const EDITION_WINDOW_HOURS = 24;
// Sotto questa soglia di storie la giornata è considerata "tranquilla".
const QUIET_THRESHOLD = 5;

function tokenize(title) {
  return (title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // rimuove accenti
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STORY_STOPWORDS.has(w));
}

// Raggruppa gli articoli che trattano la stessa storia confrontando i titoli.
// Due articoli sono "la stessa storia" se condividono ≥2 token significativi,
// di cui almeno uno raro e lungo (tipicamente un nome proprio: Provedel, Gila…).
// La regola è volutamente prudente: meglio non unire che unire storie diverse.
//
// IMPORTANTE: si usa il "leader clustering" (confronto col rappresentante del
// gruppo), NON union-find: con il single-linkage il concatenamento transitivo
// (A~B, B~C ⇒ A,B,C insieme) faceva sì che un titolo-ponte unisse storie
// diverse, mettendo nella stessa card link di fonti non pertinenti.
function clusterStories(articles) {
  const n = articles.length;
  const tokens = articles.map((a) => new Set(tokenize(a.title)));

  const df = new Map(); // document frequency di ogni token
  for (const set of tokens)
    for (const t of set) df.set(t, (df.get(t) || 0) + 1);
  const rareMax = Math.max(2, Math.ceil(n * 0.15));

  // Due titoli sono "la stessa storia"?
  const sameStory = (a, b) => {
    let shared = 0;
    let rareShared = 0;
    for (const t of a) {
      if (b.has(t)) {
        shared++;
        if (df.get(t) <= rareMax && t.length >= 5) rareShared++;
      }
    }
    return shared >= 2 && rareShared >= 1;
  };

  // Ordine stabile: prima i titoli più "ricchi" (più token), poi i più recenti,
  // così il rappresentante di ogni gruppo è un titolo descrittivo.
  const order = articles
    .map((_, i) => i)
    .sort(
      (a, b) =>
        tokens[b].size - tokens[a].size ||
        new Date(articles[b].publishedAt || 0) -
          new Date(articles[a].publishedAt || 0)
    );

  // Ogni articolo entra nel PRIMO gruppo il cui rappresentante è la stessa
  // storia; altrimenti fonda un nuovo gruppo. Nessun confronto transitivo.
  const clusters = []; // { rep: Set<token>, members: [] }
  for (const i of order) {
    let placed = false;
    for (const c of clusters) {
      if (sameStory(tokens[i], c.rep)) {
        c.members.push(articles[i]);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ rep: tokens[i], members: [articles[i]] });
  }

  const groups = new Map();
  clusters.forEach((c, idx) => groups.set(idx, c.members));

  const stories = [];
  for (const members of groups.values()) {
    // Primario: preferisci chi ha un'immagine, poi il più recente.
    members.sort(
      (a, b) =>
        Number(!!b.image) - Number(!!a.image) ||
        new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
    );
    const primary = { ...members[0] };
    const sources = [];
    const seen = new Set();
    for (const m of members) {
      if (!seen.has(m.source)) {
        seen.add(m.source);
        sources.push({ name: m.source, url: m.url });
      }
    }

    // momentum = massimo numero di fonti distinte che hanno pubblicato la
    // storia entro una stessa finestra di TREND_WINDOW_MS (picco di copertura).
    const timed = members
      .filter((m) => m.publishedAt)
      .map((m) => ({ s: m.source, t: new Date(m.publishedAt).getTime() }))
      .sort((a, b) => a.t - b.t);
    let momentum = members.length ? 1 : 0;
    for (let i = 0; i < timed.length; i++) {
      const srcs = new Set();
      for (let j = i; j < timed.length && timed[j].t - timed[i].t <= TREND_WINDOW_MS; j++) {
        srcs.add(timed[j].s);
      }
      if (srcs.size > momentum) momentum = srcs.size;
    }
    const lastAt = timed.length ? new Date(timed[timed.length - 1].t).toISOString() : primary.publishedAt || null;

    primary.coverage = seen.size;
    primary.momentum = momentum;
    primary.lastAt = lastAt;
    primary.sources = sources;
    // Membri (transitori) per la sintesi del tema più importante; rimossi
    // prima di salvare il JSON per non appesantirlo.
    primary._members = members.map((m) => ({
      source: m.source,
      url: m.url,
      title: m.title,
      summary: m.summary,
    }));
    stories.push(primary);
  }

  stories.sort(
    (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
  );
  return stories;
}

// Similarità di Jaccard tra due insiemi di token (0..1).
function jaccardSets(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

// Soglia di similarità tra titoli sintetizzati per considerarli la stessa storia.
const TITLE_MERGE_SIM = 0.6;

// Unione di sicurezza DOPO la sintesi: il clustering per-rappresentante a volte
// lascia separati due gruppi che però descrivono lo stesso fatto e ricevono un
// titolo sintetizzato identico (o quasi). Qui li fondiamo confrontando le
// parole-chiave del titolo: stesse parole, o Jaccard ≥ soglia. Combiniamo fonti,
// copertura e momentum, e teniamo la più recente.
//
// Nota: NON usiamo più la rarità del token come discriminante. Quando una notizia
// è IL tema del giorno (es. "Reggina"), le sue parole compaiono ovunque e non
// risultano "rare": pretendere un token raro impediva di fondere proprio i
// doppioni della storia più calda. La precisione "stesso soggetto" è già garantita
// a monte dal clustering; qui chiudiamo solo i doppioni con titolo uguale.
function mergeDuplicateStories(stories) {
  const keep = [];
  const sigs = []; // Set di token-titolo per ogni storia tenuta
  for (const s of stories) {
    const toks = new Set(tokenize(s.title));
    let target = -1;
    if (toks.size) {
      for (let i = 0; i < keep.length; i++) {
        if (sigs[i].size && jaccardSets(toks, sigs[i]) >= TITLE_MERGE_SIM) {
          target = i;
          break;
        }
      }
    }

    if (target === -1) {
      keep.push(s);
      sigs.push(toks);
      continue;
    }

    const primary = keep[target];
    const srcMap = new Map();
    for (const src of [...(primary.sources || []), ...(s.sources || [])])
      if (!srcMap.has(src.name)) srcMap.set(src.name, src);
    primary.sources = [...srcMap.values()];
    primary.coverage = primary.sources.length;
    primary.momentum = Math.max(primary.momentum || 1, s.momentum || 1);
    primary._members = [...(primary._members || []), ...(s._members || [])];
    if (!primary.summary && s.summary) primary.summary = s.summary;
    if (new Date(s.lastAt || 0) > new Date(primary.lastAt || 0))
      primary.lastAt = s.lastAt;
    for (const t of toks) sigs[target].add(t);
  }
  return keep;
}

// Rete di sicurezza (mitigazione, in attesa del raggruppamento AI): garantisce
// che TITOLO e LINK di una card siano coerenti. Per ogni storia multi-fonte:
//  1) se il titolo finale non condivide NESSUNA parola con alcun articolo del
//     gruppo (titolo "scollegato"/allucinato), lo riancora al titolo reale del
//     membro primario (e ne usa la sintesi);
//  2) tiene solo le fonti i cui articoli condividono almeno una parola col
//     titolo, così non restano link palesemente fuori tema.
// Le fonti scartate vengono rimosse da questa card (il raggruppamento AI le
// ricollocherà correttamente).
function shareToken(titleA, titleB) {
  const a = new Set(tokenize(titleA));
  if (!a.size) return false;
  for (const t of tokenize(titleB)) if (a.has(t)) return true;
  return false;
}

function enforceCoherence(stories) {
  for (const s of stories) {
    const members = s._members || [];
    if (members.length < 2) continue;

    // 1) Titolo scollegato da tutti i membri → riancóralo a un articolo reale.
    if (!members.some((m) => shareToken(s.title, m.title))) {
      s.title = members[0].title;
      if (members[0].summary) s.summary = members[0].summary;
      s.synthesized = false;
    }

    // 2) Tieni solo i membri coerenti col titolo (almeno il primario).
    let kept = members.filter((m) => shareToken(s.title, m.title));
    if (!kept.length) kept = [members[0]];

    const seenSrc = new Set();
    const sources = [];
    for (const m of kept) {
      if (m.url && !seenSrc.has(m.source)) {
        seenSrc.add(m.source);
        sources.push({ name: m.source, url: m.url });
      }
    }
    if (sources.length) {
      s._members = kept;
      s.sources = sources;
      s.coverage = sources.length;
    }
  }
  return stories;
}

export async function collect() {
  const seen = new Set();
  const articles = [];
  let promoSkipped = 0;

  for (const source of SOURCES) {
    try {
      const feed = await parser.parseURL(source.url);
      console.log(`✓ ${source.name}: ${feed.items.length} elementi`);

      for (const item of feed.items) {
        const url = (item.link || "").split("?")[0];
        if (!url) continue;

        const id = hashId(url);
        if (seen.has(id)) continue; // dedup per URL

        const haystack = `${item.title} ${item.contentSnippet || ""}`;
        if (!isRelevant(haystack, source.strict)) continue; // filtro pertinenza
        if (isPromotional(item)) {
          promoSkipped++; // scarta pubblicità/sponsorizzati
          continue;
        }

        seen.add(id);
        articles.push({
          id,
          title: item.title?.trim() || "(senza titolo)",
          url,
          source: source.name,
          publishedAt: item.isoDate || item.pubDate || null,
          image: null, // niente foto di terzi: la UI usa il riquadro brandizzato
          rawSnippet: item.contentSnippet || item.content || "",
        });
      }
    } catch (err) {
      console.warn(`✗ ${source.name}: ${err.message}`);
    }
  }
  if (promoSkipped) console.log(`  pubblicità scartate: ${promoSkipped}`);

  // Lazio24: tieni solo le notizie delle ultime 24 ore.
  const cutoff = Date.now() - EDITION_WINDOW_HOURS * 60 * 60 * 1000;
  const inWindow = articles.filter(
    (a) => !a.publishedAt || new Date(a.publishedAt).getTime() >= cutoff
  );
  console.log(
    `\nFinestra ${EDITION_WINDOW_HOURS}h: ${inWindow.length}/${articles.length} articoli`
  );

  // Ordina dal più recente
  inWindow.sort(
    (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
  );

  // Raggruppa PRIMA tutte le notizie della finestra (così copriamo l'intera
  // giornata), con un cap di sicurezza alto. I riassunti li generiamo dopo,
  // solo sulle storie finali: poche chiamate AI ma copertura completa.
  console.log("\nRaggruppamento per storia…");
  const pool = inWindow.slice(0, 200);
  let stories = clusterStories(pool);
  const multiSourceStories = stories.filter((s) => s.sources.length > 1);
  const singleStories = stories.filter((s) => s.sources.length <= 1);
  console.log(
    `  ${stories.length} storie (${multiSourceStories.length} coperte da più fonti)`
  );

  // Riassunti/sintesi SOLO sulle storie:
  // - fonte singola → riassunto dell'articolo;
  // - multi-fonte → sintesi AI che media tra le testate (con fallback).
  console.log(`Generazione riassunti/sintesi per ${stories.length} storie…`);
  const cache = await loadCache();
  const usedKeys = new Set();
  let aiCalls = 0;

  await mapPool(singleStories, 5, async (s) => {
    const key = CACHE_VERSION + ":a:" + s.id;
    usedKeys.add(key);
    if (typeof cache[key]?.summary === "string") {
      s.summary = cache[key].summary;
      return;
    }
    aiCalls++;
    const sum = await summarize({ title: s.title, snippet: s.rawSnippet });
    s.summary = sum;
    if (sum) cache[key] = { summary: sum };
  });

  await mapPool(multiSourceStories, 3, async (s) => {
    const ids = (s._members || []).map((m) => m.id || m.url).sort();
    const key = CACHE_VERSION + ":m:" + hashId(ids.join(","));
    usedKeys.add(key);
    const cached = cache[key];
    if (cached && typeof cached.summary === "string") {
      if (cached.title) s.title = cached.title;
      s.summary = cached.summary;
      s.synthesized = true;
      return;
    }
    aiCalls++;
    const r = await synthesizeStory(s.title, s._members || []);
    if (r) {
      if (r.title) s.title = r.title;
      if (r.summary) s.summary = r.summary;
      s.synthesized = true;
      if (r.summary) cache[key] = { title: r.title || null, summary: r.summary };
    } else {
      s.summary = await summarize({ title: s.title, snippet: s.rawSnippet });
    }
  });
  for (const s of stories) delete s.rawSnippet;

  // Fonde eventuali storie con titolo sintetizzato (quasi) identico.
  const beforeMerge = stories.length;
  stories = mergeDuplicateStories(stories);
  if (stories.length < beforeMerge)
    console.log(`  storie fuse (titoli duplicati): ${beforeMerge - stories.length}`);

  // Rete di sicurezza: titolo e link coerenti (mitigazione pre-raggruppamento AI).
  stories = enforceCoherence(stories);

  // Niente immagini di terzi: per evitare problemi di copyright e non far
  // contattare al browser server esterni, ogni storia usa nella UI un riquadro
  // brandizzato Lazio24. Qui ci assicuriamo che nessuna immagine resti
  // referenziata e ripuliamo eventuali file scaricati in passato.
  for (const s of stories) s.image = null;
  const removedImages = await cleanupImages(new Set());
  if (removedImages)
    console.log(`  immagini di terzi rimosse dal disco: ${removedImages}`);

  // Favicon delle fonti, scaricate lato server (niente chiamate dal browser).
  const hosts = new Set();
  for (const s of stories)
    for (const src of s.sources || []) {
      const h = hostOf(src.url);
      if (h) hosts.add(h);
    }
  // Anche i domini delle fonti configurate (per la pagina "Fonti").
  for (const src of SOURCES) {
    const h = src.site || hostOf(src.url);
    if (h) hosts.add(h);
  }
  const okHosts = new Set();
  await mapPool([...hosts], 5, async (h) => {
    if (await ensureFavicon(h)) okHosts.add(h);
  });
  for (const s of stories)
    for (const src of s.sources || []) {
      const h = hostOf(src.url);
      src.favicon = h && okHosts.has(h) ? `/sources/${h}.png` : null;
    }
  console.log(`  favicon fonti: ${okHosts.size}/${hosts.size}`);

  // Per il "tema del momento" diamo priorità alle storie con più momentum
  // (più fonti nella stessa finestra temporale), poi alle più recenti.
  console.log("Generazione del tema del momento…");
  const topTrending = [...stories]
    .sort(
      (a, b) =>
        b.momentum - a.momentum ||
        new Date(b.lastAt || 0) - new Date(a.lastAt || 0)
    )
    .slice(0, 6);
  // Digest in cache per insieme di titoli: si rigenera solo se cambia il "tema".
  const digestTitles = topTrending.map((s) => s.title);
  const digestKey = CACHE_VERSION + ":digest:" + hashId(digestTitles.join("|"));
  usedKeys.add(digestKey);
  let dailyDigest;
  if (typeof cache[digestKey]?.text === "string") {
    dailyDigest = cache[digestKey].text;
  } else {
    aiCalls++;
    dailyDigest = await digest(digestTitles);
    if (dailyDigest) cache[digestKey] = { text: dailyDigest };
  }

  // Tema più importante: la storia con più momentum (titolo/sintesi già
  // mediati sopra se multi-fonte).
  const top = topTrending[0];
  const topStory = top
    ? {
        id: top.id,
        title: top.title,
        url: top.url,
        image: top.image,
        source: top.source,
        publishedAt: top.publishedAt,
        lastAt: top.lastAt,
        coverage: top.coverage,
        sources: top.sources,
        summary: top.summary || null,
      }
    : null;

  // Salva la cache tenendo solo le voci usate in questo run (auto-pulizia: le
  // storie uscite dalla finestra 24h spariscono anche dalla cache).
  const prunedCache = {};
  for (const k of usedKeys) if (cache[k]) prunedCache[k] = cache[k];
  await saveCache(prunedCache);
  console.log(`  chiamate AI in questo run: ${aiCalls} (resto da cache)`);

  // Rimuovi i membri transitori prima di salvare.
  for (const s of stories) delete s._members;

  // Metadati della finestra (ultime 24 ore), aggiornata a ogni raccolta.
  const edition = {
    windowHours: EDITION_WINDOW_HOURS,
    quiet: stories.length < QUIET_THRESHOLD,
  };

  return { edition, digest: dailyDigest, topStory, articles: stories };
}
