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
async function chat(prompt, maxTokens) {
  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (groqKey) {
    const model = process.env.SUMMARY_MODEL || "llama-3.3-70b-versatile";
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
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  }

  if (anthropicKey) {
    const model = process.env.SUMMARY_MODEL || "claude-haiku-4-5-20251001";
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
  const prompt = `Queste sono notizie da più testate sullo stesso fatto riguardante la S.S. Lazio. Genera UN SOLO titolo e UNA SOLA descrizione che facciano la sintesi delle diverse versioni, in italiano, in modo neutro e senza favorire una testata. Usa parole tue: NON copiare frasi o espressioni dalle fonti. Il titolo: max ~12 parole, incisivo, senza virgolette. La descrizione: UNA frase breve. Rispondi SOLO con JSON valido: {"titolo":"...","descrizione":"..."}.\n\n${lines}`;
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
