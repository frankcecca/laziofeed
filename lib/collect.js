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
  REGION_HINTS,
  FOOTBALL_CONTEXT,
  PROMO_PATTERNS,
  PROMO_CATEGORIES,
} from "./sources.js";
import { summarize, digest, synthesizeStory, groupStories } from "./summarize.js";

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

// Scarica e parsa un feed RSS. Fallback per i feed con XML leggermente
// malformato (es. '&' non escapato, errore "Invalid character in entity name"):
// riscarica il testo, sostituisce gli '&' isolati con '&amp;' e riparsa.
async function fetchFeed(url) {
  try {
    return await parser.parseURL(url);
  } catch (e) {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw e;
    const xml = (await res.text()).replace(
      /&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/g,
      "&amp;"
    );
    return await parser.parseString(xml);
  }
}

// Cache delle sintesi sul volume: rigeneriamo solo le storie nuove e riusiamo
// quelle già elaborate, così l'AI viene chiamata una volta sola per notizia
// (costo minimo anche col cron ogni pochi minuti).
const CACHE_FILE = path.join(process.cwd(), "data", "summaries.json");
// Cambiare versione invalida tutta la cache al collect successivo (utile quando
// si modifica la logica delle sintesi, es. la pulizia delle etichette).
const CACHE_VERSION = "v7";

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
  // "il/nel/del/al/dal/sul Lazio" o "in Lazio" → si parla della REGIONE
  // (meteo, cronaca, viabilità). La squadra è femminile ("la Lazio"). Senza un
  // segnale calcistico forte, scarta. Vale per TUTTE le fonti, anche dedicate.
  const hasRegionHint = REGION_HINTS.some((re) => re.test(t));
  if (hasRegionHint && !hasStrong) return false;
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

  const stories = [...clusters].map((c) => buildStory(c.members));

  stories.sort(
    (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
  );
  return stories;
}

// Costruisce l'oggetto "storia" da un insieme di articoli-membro: sceglie il
// primario, raccoglie le fonti, calcola coverage e momentum. Condiviso tra
// l'euristica (clusterStories) e il raggruppamento AI.
function buildStory(members) {
  // Primario: preferisci chi ha un'immagine, poi il più recente.
  const sorted = [...members].sort(
    (a, b) =>
      Number(!!b.image) - Number(!!a.image) ||
      new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
  );
  const primary = { ...sorted[0] };
  const sources = [];
  const seen = new Set();
  for (const m of sorted) {
    if (!seen.has(m.source)) {
      seen.add(m.source);
      sources.push({ name: m.source, url: m.url });
    }
  }

  // momentum = massimo numero di fonti distinte che hanno pubblicato la storia
  // entro una stessa finestra di TREND_WINDOW_MS (picco di copertura).
  const timed = sorted
    .filter((m) => m.publishedAt)
    .map((m) => ({ s: m.source, t: new Date(m.publishedAt).getTime() }))
    .sort((a, b) => a.t - b.t);
  let momentum = sorted.length ? 1 : 0;
  for (let i = 0; i < timed.length; i++) {
    const srcs = new Set();
    for (let j = i; j < timed.length && timed[j].t - timed[i].t <= TREND_WINDOW_MS; j++) {
      srcs.add(timed[j].s);
    }
    if (srcs.size > momentum) momentum = srcs.size;
  }
  const lastAt = timed.length
    ? new Date(timed[timed.length - 1].t).toISOString()
    : primary.publishedAt || null;

  primary.coverage = seen.size;
  primary.momentum = momentum;
  primary.lastAt = lastAt;
  primary.sources = sources;
  // Membri (transitori) per la sintesi; rimossi prima di salvare il JSON.
  primary._members = sorted.map((m) => ({
    id: m.id,
    source: m.source,
    url: m.url,
    title: m.title,
    summary: m.summary,
  }));
  return primary;
}

// Due titoli sono "la stessa storia"? Confronta i token con DUE criteri:
//  - Jaccard ≥ 0.6 (titoli di lunghezza simile), oppure
//  - overlap coefficient ≥ 0.6 con ≥3 token condivisi: cattura i casi in cui un
//    titolo è più verboso dell'altro ma ne contiene tutto il nucleo (es.
//    "Ugolini: accordo Gila-agente" vs "Ugolini sull'operazione Gila-Napoli: c'è
//    l'accordo con l'agente del giocatore" → 5 parole in comune su 6).
function titlesSameStory(a, b) {
  if (!a.size || !b.size) return false;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  if (!inter) return false;
  const jaccard = inter / (a.size + b.size - inter);
  const overlap = inter / Math.min(a.size, b.size);
  return jaccard >= 0.6 || (inter >= 3 && overlap >= 0.6);
}

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
        if (titlesSameStory(toks, sigs[i])) {
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

// Rete di sicurezza: garantisce che TITOLO e LINK di una card siano coerenti.
// Una fonte resta nel gruppo SOLO se condivide ALMENO DUE parole significative
// col titolo. Una sola parola in comune (spesso incidentale: "Lotito", "manca",
// "Inter"…) NON basta più — è il buco che faceva entrare notizie di altri
// soggetti. Per ogni storia multi-fonte: (1) se il titolo non combacia
// abbastanza con NESSUN membro, lo riancora al titolo reale del primario;
// (2) tiene solo i membri coerenti (gli altri vengono rimossi da questa card).
const MIN_SHARED_TOKENS = 2;
function sharedTokenCount(titleA, titleB) {
  const a = new Set(tokenize(titleA));
  if (!a.size) return 0;
  let n = 0;
  for (const t of new Set(tokenize(titleB))) if (a.has(t)) n++;
  return n;
}

function enforceCoherence(stories) {
  for (const s of stories) {
    const members = s._members || [];
    if (members.length < 2) continue;

    // 1) Titolo scollegato dai membri → riancóralo a un articolo reale.
    if (!members.some((m) => sharedTokenCount(s.title, m.title) >= MIN_SHARED_TOKENS)) {
      s.title = members[0].title;
      if (members[0].summary) s.summary = members[0].summary;
      s.synthesized = false;
    }

    // 2) Tieni solo i membri che condividono ≥2 parole col titolo (almeno il primario).
    let kept = members.filter(
      (m) => sharedTokenCount(s.title, m.title) >= MIN_SHARED_TOKENS
    );
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
      const feed = await fetchFeed(source.url);
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

  console.log("\nRaggruppamento per storia…");
  const pool = inWindow.slice(0, 200);
  const poolById = new Map(pool.map((a) => [a.id, a]));
  const poolIds = pool.map((a) => a.id);

  const cache = await loadCache();
  const usedKeys = new Set();
  let aiCalls = 0;

  // Costruisce le storie da una lista di gruppi { members:[articoli], title, summary }
  // (i membri non assegnati restano storie singole).
  const assemble = (groups) => {
    const assigned = new Set();
    const built = [];
    for (const g of groups) {
      const members = (g.members || []).filter((m) => m && !assigned.has(m.id));
      if (members.length < 2) continue;
      members.forEach((m) => assigned.add(m.id));
      const story = buildStory(members);
      story._aiTitle = g.title;
      story._aiSummary = g.summary;
      built.push(story);
    }
    for (const a of pool) {
      if (!assigned.has(a.id)) {
        assigned.add(a.id);
        built.push(buildStory([a]));
      }
    }
    built.sort(
      (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
    );
    return built;
  };

  // CACHE del raggruppamento (paradigma B sostenibile): l'LLM ri-raggruppa solo
  // quando serve davvero — ogni ~GROUP_REFRESH_MIN minuti o quando arrivano
  // ≥GROUP_NEW_THRESHOLD articoli nuovi. Negli altri collect riusa l'ultimo
  // raggruppamento (mappato per id), così le chiamate pesanti restano poche e si
  // sta dentro i limiti del piano free. I nuovi articoli, finché non si
  // ri-raggruppa, compaiono come storie singole (titolo reale + link corretto).
  const GROUP_KEY =
    CACHE_VERSION + ":grouping:" + (process.env.GROUPING_MODEL || "default");
  const GROUP_REFRESH_MIN = 75;
  const GROUP_NEW_THRESHOLD = 5;
  usedKeys.add(GROUP_KEY);
  const cachedG = cache[GROUP_KEY];
  const cachedIds = new Set(cachedG?.ids || []);
  const newCount = cachedG ? poolIds.filter((id) => !cachedIds.has(id)).length : Infinity;
  const ageMin = cachedG ? (Date.now() - new Date(cachedG.at || 0).getTime()) / 60000 : Infinity;

  const reuse = () =>
    assemble(
      (cachedG.groups || []).map((g) => ({
        members: (g.ids || []).map((id) => poolById.get(id)).filter(Boolean),
        title: g.title,
        summary: g.summary,
      }))
    );

  let stories;
  if (cachedG && newCount < GROUP_NEW_THRESHOLD && ageMin < GROUP_REFRESH_MIN) {
    stories = reuse();
    console.log(
      `  raggruppamento riusato da cache (${newCount} nuovi, ${Math.round(ageMin)} min fa)`
    );
  } else {
    const aiGroups = await groupStories(
      pool.map((a) => ({ title: a.title, source: a.source }))
    );
    if (aiGroups) {
      aiCalls++;
      stories = assemble(
        aiGroups.map((g) => ({
          members: g.members.map((i) => pool[i]).filter(Boolean),
          title: g.title,
          summary: g.summary,
        }))
      );
      // Salva il raggruppamento per i prossimi collect.
      cache[GROUP_KEY] = {
        at: new Date().toISOString(),
        ids: poolIds,
        groups: stories
          .filter((s) => (s._members || []).length >= 2)
          .map((s) => ({
            ids: s._members.map((m) => m.id),
            title: s._aiTitle || null,
            summary: s._aiSummary || null,
          })),
      };
      console.log(`  raggruppamento AI: ${stories.length} storie`);
    } else if (cachedG) {
      // AI non disponibile (es. 429): meglio riusare l'ultimo raggruppamento
      // valido che ricadere sull'euristica.
      stories = reuse();
      console.log("  raggruppamento AI ko → riuso l'ultimo raggruppamento in cache");
    } else {
      stories = clusterStories(pool);
      console.log("  raggruppamento AI non disponibile → uso l'euristica");
    }
  }

  const multiSourceStories = stories.filter((s) => s.sources.length > 1);
  const singleStories = stories.filter((s) => s.sources.length <= 1);
  console.log(
    `  ${stories.length} storie (${multiSourceStories.length} coperte da più fonti)`
  );

  console.log(`Generazione riassunti/sintesi per ${stories.length} storie…`);

  // Budget di nuovi riassunti per run: limita le chiamate AI così la raccolta
  // resta rapida (e sotto il timeout in produzione) anche col rate limit di Groq.
  // I riassunti già in cache non contano; i restanti vengono generati nei run
  // successivi (priorità ai più recenti). Gli articoli senza riassunto mostrano
  // comunque titolo + link corretti.
  const MAX_NEW_SUMMARIES = 80;
  let newSummaries = 0;
  const orderedSingles = [...singleStories].sort(
    (a, b) =>
      new Date(b.lastAt || b.publishedAt || 0) -
      new Date(a.lastAt || a.publishedAt || 0)
  );
  await mapPool(orderedSingles, 4, async (s) => {
    const key = CACHE_VERSION + ":a:" + s.id;
    usedKeys.add(key);
    if (typeof cache[key]?.summary === "string") {
      s.summary = cache[key].summary;
      return;
    }
    if (newSummaries >= MAX_NEW_SUMMARIES) return; // budget esaurito: titolo-only
    newSummaries++;
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
    // Titolo/sintesi già prodotti dal raggruppamento AI: usali (niente nuova
    // chiamata) e mettili in cache per stabilità tra una raccolta e l'altra.
    if (s._aiTitle || s._aiSummary) {
      if (s._aiTitle) s.title = s._aiTitle;
      if (s._aiSummary) s.summary = s._aiSummary;
      s.synthesized = true;
      cache[key] = { title: s._aiTitle || null, summary: s._aiSummary || null };
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

  // Rimuovi i campi transitori prima di salvare.
  for (const s of stories) {
    delete s._members;
    delete s._aiTitle;
    delete s._aiSummary;
  }

  // Metadati della finestra (ultime 24 ore), aggiornata a ogni raccolta.
  const edition = {
    windowHours: EDITION_WINDOW_HOURS,
    quiet: stories.length < QUIET_THRESHOLD,
  };

  return { edition, digest: dailyDigest, topStory, articles: stories };
}
