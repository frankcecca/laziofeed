// Generazione delle sintesi AI, indipendente dal fornitore.
// Sceglie il provider dalle variabili d'ambiente:
//   - GROQ_API_KEY      → Groq (modelli open-source: Llama, Qwen…)
//   - ANTHROPIC_API_KEY → Anthropic (Claude Haiku)
// Se nessuna chiave è impostata, le funzioni restituiscono null e la UI
// mostra solo titolo + link (nessuna riproduzione dell'estratto della fonte).

// Etichette redazionali da non far comparire nelle sintesi (con eventuale
// trattino/due punti subito dopo). Aggiungere qui altri prefissi se servono.
const EDITORIAL_LABELS = [/rassegna stampa\s*[-–—:]*\s*/gi];
function stripLabels(text = "") {
  let t = text;
  for (const re of EDITORIAL_LABELS) t = t.replace(re, "");
  return t.replace(/\s+/g, " ").trim();
}

function stripHtml(html = "") {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripLabels(text);
}

// Taglio di sicurezza: la sintesi mostrata resta un "estratto molto breve"
// (diritto connesso editori, art. 43-bis L. 633/1941).
const MAX_SUMMARY = 200;
function clampSummary(text) {
  const t = stripLabels((text || "").trim());
  if (t.length <= MAX_SUMMARY) return t;
  const cut = t.slice(0, MAX_SUMMARY);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

// Chiamata unica a un LLM. Ritorna il testo, oppure null se nessun provider è
// configurato. Lancia in caso di errore API (gestito da chi chiama).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function chat(prompt, maxTokens, modelOverride) {
  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (groqKey) {
    const model =
      modelOverride || process.env.SUMMARY_MODEL || "llama-3.3-70b-versatile";
    // Ritenta sui rate limit (429): il piano free di Groq limita le
    // richieste/token al minuto, e in una raccolta "a freddo" si satura.
    for (let attempt = 0; ; attempt++) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.3,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      // Fail-fast sui 429: poche prove con attese brevi, così una raccolta non
      // si blocca per minuti (e non sfora il timeout della rotta in produzione).
      if (res.status === 429 && attempt < 2) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`Groq ${res.status}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || null;
    }
  }

  if (anthropicKey) {
    const model =
      modelOverride || process.env.SUMMARY_MODEL || "claude-haiku-4-5-20251001";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  }

  return null; // nessun provider configurato
}

// "Tema del momento": 1-2 frasi che sintetizzano i titoli più caldi.
export async function digest(titles = []) {
  if (!titles.length) return null;
  const prompt = `Queste sono le storie sulla S.S. Lazio più "calde" in questo momento, ordinate per quante testate le stanno riprendendo nello stesso breve intervallo di tempo. Scrivi il "tema del momento" in italiano: massimo due righe (circa 2 frasi brevi) che catturino l'argomento di cui si sta parlando di più ora. Tono neutro e scorrevole, niente elenco, niente preamboli.\n\n${titles
    .map((t) => `- ${t}`)
    .join("\n")}`;
  try {
    return await chat(prompt, 200);
  } catch (err) {
    console.warn(`  ⚠️  Digest AI fallito (${err.message}).`);
    return null;
  }
}

// Sintesi di una storia multi-fonte: titolo + descrizione unici che mediano tra
// le versioni delle testate. Ritorna { title, summary } oppure null.
export async function synthesizeStory(title, members = []) {
  if (members.length < 2) return null;
  const lines = members
    .slice(0, 8)
    .map(
      (m) =>
        `- [${m.source}] ${m.title}${
          m.summary ? `: ${stripHtml(m.summary)}` : ""
        }`
    )
    .join("\n");
  const prompt = `Queste sono notizie da più testate sullo stesso fatto riguardante la S.S. Lazio. Genera UN SOLO titolo e UNA SOLA descrizione che facciano la sintesi delle diverse versioni, in italiano, in modo neutro e senza favorire una testata. Usa parole tue: NON copiare frasi o espressioni dalle fonti. Il titolo: max ~12 parole, incisivo, senza virgolette. La descrizione: UNA frase breve. PRUDENZA sul mercato e sulle notizie non confermate: non dare per fatta una trattativa o una voce; usa "trattativa", "verso", "idea" o il condizionale (es. "Gila verso il Napoli", non "Gila al Napoli"), e presenta come certo solo ciò che è dichiarato ufficiale. Rispondi SOLO con JSON valido: {"titolo":"...","descrizione":"..."}.\n\n${lines}`;
  try {
    const text = (await chat(prompt, 300)) || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const obj = JSON.parse(match[0]);
    const t = (obj.titolo || "").trim();
    const s = clampSummary((obj.descrizione || "").trim());
    if (!t && !s) return null;
    return { title: t || null, summary: s || null };
  } catch (err) {
    console.warn(`  ⚠️  Sintesi storia fallita (${err.message}).`);
    return null;
  }
}

// Raggruppamento semantico (paradigma B): dato l'elenco numerato degli articoli
// della finestra, l'LLM individua i GRUPPI di articoli che trattano la STESSA
// identica notizia e per ognuno produce un titolo e una descrizione coerenti coi
// soli membri del gruppo. Gli articoli unici NON vengono inclusi (restano
// singoli). Ritorna [{ members:[indici 0-based], title, summary }] oppure null
// (in caso di errore/parsing fallito: chi chiama ripiega sull'euristica).
export async function groupStories(items = []) {
  if (items.length < 2) return [];
  const list = items
    .map((a, i) => `${i + 1}. [${a.source}] ${a.title}`)
    .join("\n");
  const prompt = `Sei un redattore. Qui sotto c'è un elenco numerato di notizie sulla S.S. Lazio da varie testate. Raggruppa SOLO gli articoli che riferiscono LO STESSO IDENTICO FATTO/EVENTO. Regole:
- Stesso fatto = la stessa, identica notizia ripresa da più testate: la stessa trattativa di mercato (es. "Gila al Napoli": offerta, accordo, contropartite della STESSA operazione), la stessa partita, oppure LA STESSA dichiarazione/intervista di UNA stessa persona.
- NON raggruppare cose solo perché trattano lo stesso tema. In particolare: dichiarazioni di PERSONE DIVERSE (es. Oddi e Liverani che parlano entrambi di Lotito) sono notizie DIVERSE; trattative diverse o partite diverse sono notizie diverse. Anche se condividono parole come "Lotito" o "tifosi", vanno tenute SEPARATE.
- Nel dubbio, NON raggruppare: meglio due card separate che un gruppo con dentro una notizia che non c'entra (un link che porta a un fatto diverso vanifica il sito).
- Includi nei gruppi solo articoli che hanno almeno un altro articolo sullo stesso identico fatto. Gli articoli unici NON vanno in alcun gruppo.
- Per ogni gruppo scrivi un "titolo" (max ~12 parole, parole tue, neutro, senza virgolette) e una "descrizione" (UNA frase breve) coerenti coi SOLI membri di quel gruppo.
- PRUDENZA sul mercato e sulle notizie non confermate: NON dare per fatto ciò che è solo una trattativa o una voce. Usa "trattativa", "idea", "verso", "sondaggio" o il condizionale (es. "Gila verso il Napoli", "trattativa Gila-Napoli", non "Gila al Napoli"). Presenta come certo SOLO ciò che la fonte indica come ufficiale.
Rispondi SOLO con JSON valido, senza commenti, nel formato:
{"gruppi":[{"articoli":[1,4,7],"titolo":"...","descrizione":"..."}]}

Elenco:
${list}`;
  try {
    // GROUPING_MODEL (opzionale) usa un modello dedicato — di norma più potente —
    // solo per il raggruppamento; il resto resta su SUMMARY_MODEL/default.
    const out = (await chat(prompt, 8000, process.env.GROUPING_MODEL)) || "";
    // I modelli "reasoning" possono anteporre un blocco di ragionamento: lo
    // togliamo prima di estrarre il JSON.
    const text = out
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const obj = JSON.parse(match[0]);
    const raw = Array.isArray(obj.gruppi) ? obj.gruppi : [];
    const used = new Set();
    const groups = [];
    for (const g of raw) {
      const nums = Array.isArray(g.articoli) ? g.articoli : [];
      const members = [];
      for (const n of nums) {
        const idx = Number(n) - 1; // da 1-based a 0-based
        if (Number.isInteger(idx) && idx >= 0 && idx < items.length && !used.has(idx)) {
          used.add(idx);
          members.push(idx);
        }
      }
      if (members.length < 2) {
        // gruppo non valido: libera gli indici per eventuali altri usi
        for (const idx of members) used.delete(idx);
        continue;
      }
      groups.push({
        members,
        title: (g.titolo || "").trim() || null,
        summary: clampSummary((g.descrizione || "").trim()) || null,
      });
    }
    return groups;
  } catch (err) {
    console.warn(`  ⚠️  Raggruppamento AI fallito (${err.message}).`);
    return null;
  }
}

// Riassunto di un singolo articolo: UNA frase breve, con parole proprie.
export async function summarize({ title, snippet }) {
  const clean = stripHtml(snippet);
  const prompt = `Scrivi in italiano UNA sola frase breve (max ~25 parole) che riassuma questa notizia sulla S.S. Lazio. Usa parole tue: NON copiare frasi o espressioni dal testo della fonte. Tono neutro, niente preamboli, niente virgolette.\n\nTitolo: ${title}\nTesto: ${clean}`;
  try {
    const out = await chat(prompt, 120);
    return out ? clampSummary(out) : null;
  } catch (err) {
    // Niente fallback all'estratto della fonte: meglio nessuna sintesi.
    console.warn(`  ⚠️  Riassunto AI fallito (${err.message}).`);
    return null;
  }
}
