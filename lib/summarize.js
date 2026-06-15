// Generazione del riassunto AI con fallback all'estratto del feed.
// Se ANTHROPIC_API_KEY non è impostata, restituisce l'estratto ripulito.

function stripHtml(html = "") {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Taglio di sicurezza: la sintesi mostrata resta un "estratto molto breve"
// (diritto connesso editori, art. 43-bis L. 633/1941).
const MAX_SUMMARY = 200;
function clampSummary(text) {
  const t = (text || "").trim();
  if (t.length <= MAX_SUMMARY) return t;
  const cut = t.slice(0, MAX_SUMMARY);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

// Genera "Il punto del giorno": 2-3 frasi che sintetizzano i titoli principali.
// Senza chiave AI restituisce null (la UI nasconde la sezione).
export async function digest(titles = []) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !titles.length) return null;

  const model = process.env.SUMMARY_MODEL || "claude-haiku-4-5-20251001";
  const prompt = `Queste sono le storie sulla S.S. Lazio più "calde" in questo momento, ordinate per quante testate le stanno riprendendo nello stesso breve intervallo di tempo. Scrivi il "tema del momento" in italiano: massimo due righe (circa 2 frasi brevi) che catturino l'argomento di cui si sta parlando di più ora. Tono neutro e scorrevole, niente elenco, niente preamboli.\n\n${titles
    .map((t) => `- ${t}`)
    .join("\n")}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch (err) {
    console.warn(`  ⚠️  Digest AI fallito (${err.message}).`);
    return null;
  }
}

// Sintesi di una storia multi-fonte: genera un titolo e una descrizione unici
// mediando tra le versioni delle diverse testate (neutrale, senza favorirne
// una). Ritorna { title, summary } oppure null (la UI userà i valori della
// fonte primaria come fallback).
export async function synthesizeStory(title, members = []) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || members.length < 2) return null;

  const model = process.env.SUMMARY_MODEL || "claude-haiku-4-5-20251001";
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
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() || "";
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

export async function summarize({ title, snippet }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Senza chiave AI non mostriamo alcuna sintesi: niente riproduzione
  // dell'estratto della fonte (la UI mostra solo titolo + link).
  if (!apiKey) return null;

  const clean = stripHtml(snippet);
  const model = process.env.SUMMARY_MODEL || "claude-haiku-4-5-20251001";
  const prompt = `Scrivi in italiano UNA sola frase breve (max ~25 parole) che riassuma questa notizia sulla S.S. Lazio. Usa parole tue: NON copiare frasi o espressioni dal testo della fonte. Tono neutro, niente preamboli, niente virgolette.\n\nTitolo: ${title}\nTesto: ${clean}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 120,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const out = data.content?.[0]?.text?.trim();
    return out ? clampSummary(out) : null;
  } catch (err) {
    // Niente fallback all'estratto della fonte: meglio nessuna sintesi.
    console.warn(`  ⚠️  Riassunto AI fallito (${err.message}).`);
    return null;
  }
}
