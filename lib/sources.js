// Fonti RSS da cui raccogliere le notizie.
// Aggiungi/rimuovi feed liberamente. Per le testate generaliste si usa
// Google News con query filtrata, così si ricevono solo articoli sulla Lazio.

export const SOURCES = [
  {
    name: "Google News — S.S. Lazio",
    // Query: "Lazio" calcio, escludendo la regione il più possibile.
    url: 'https://news.google.com/rss/search?q=%22SS+Lazio%22+OR+%22Societa+Sportiva+Lazio%22+calcio&hl=it&gl=IT&ceid=IT:it',
  },
  {
    name: "LazioNews24",
    url: "https://www.lazionews24.com/feed",
  },
  {
    name: "Cittaceleste",
    url: "https://www.cittaceleste.it/feed",
  },
  {
    name: "La Lazio Siamo Noi",
    url: "https://www.lalaziosiamonoi.it/rss",
  },
  {
    name: "LazioPress",
    url: "https://www.laziopress.it/feed",
  },
  {
    name: "Noi Biancocelesti",
    url: "https://www.noibiancocelesti.com/feed",
  },
  {
    name: "Lazialità",
    url: "https://www.lazialita.com/feed",
  },
  {
    name: "LazioNews.eu",
    url: "https://www.lazionews.eu/feed",
  },
  {
    name: "Radiosei",
    url: "https://www.radiosei.it/feed",
  },
  {
    name: "Gazzetta Biancoceleste",
    url: "https://www.gazzettabiancoceleste.it/feed",
  },
  {
    name: "Laziochannel",
    url: "https://www.laziochannel.it/feed",
  },

  // --- Testate nazionali sportive (feed generali, filtrati per pertinenza) ---
  // Nota: si usano feed generali di calcio/sport e si lascia che il filtro
  // tenga solo la Lazio.
  // strict: true → feed generalisti, dove "Lazio" è spesso la Regione.
  // Per loro non basta la parola "Lazio": serve un chiaro contesto calcistico.
  //
  // ANSA è stata RIMOSSA: le sue condizioni d'uso RSS vietano espressamente la
  // pubblicazione dei titoli ANSA su siti web (uso ammesso solo nei Reader).
  // Per un eventuale ripristino servirebbe autorizzazione (commerciale@ansa.it).
  {
    name: "Corriere della Sera",
    url: "https://xml2.corriereobjects.it/rss/sport.xml",
    strict: true,
    // Dominio del marchio per il logo (il feed sta su un sottodominio tecnico).
    site: "corriere.it",
  },
];

// Parole chiave che confermano che la notizia parli DAVVERO della società.
export const KEYWORDS = [
  "lazio",
  "biancoceleste",
  "biancocelesti",
  "aquile",
  "olimpico",
  "sarri",
  "lotito",
  "formello",
];

// Contesto calcistico: per i feed "strict" serve almeno uno di questi (oltre
// a "Lazio") perché una notizia conti come riferita alla squadra.
export const FOOTBALL_CONTEXT = [
  "calcio",
  "calciomercato",
  "attaccante",
  "difensore",
  "centrocampista",
  "portiere",
  "panchina",
  "allenatore",
  "mister",
  "convocati",
  "formazione",
  "europa league",
  "champions",
  "coppa italia",
  "serie a",
  "gol",
  "derby",
  "biancocelest",
  "olimpico",
  "ritiro",
  "amichevole",
  "gattuso",
  "sarri",
  "lotito",
  "formello",
];

// Termini "forti": se presenti, la notizia è quasi certamente sulla squadra.
export const STRONG_KEYWORDS = [
  "biancoceleste",
  "biancocelesti",
  "lotito",
  "formello",
  "sarri",
  "calciomercato",
  "serie a",
  "derby",
  "gol",
  "partita",
  "allenatore",
  "olimpico",
];

// Pattern da escludere: ambiguità con la Regione Lazio e simili.
export const EXCLUDE = [
  "regione lazio",
  "consiglio regionale",
  "giunta regionale",
  "assessore",
  "sanità",
];

// Segnali di contenuto pubblicitario/sponsorizzato, cercati in titolo +
// descrizione (scelti per non colpire le notizie: niente "acquista"/"prenota"
// generici che ricorrono nel mercato).
export const PROMO_PATTERNS = [
  /\bscont(o|i|at)/i, // sconto, sconti, scontato
  /\d{1,3}\s?%/, // es. "-20%"
  /\d{1,3}\s?(€|euro)\b/i, // es. "29 euro" (i prezzi sui trasferimenti sono "milioni di euro")
  /\bfan shop\b/i,
  /\bstore\b/i,
  /fall[ae] tu/i, // "falle tue", "falla tua"
  /ordina ora/i,
  /acquistal/i, // acquistala/le
  /codice sconto/i,
  /\bcoupon\b/i,
  /\bpromo(zione|zioni)?\b/i,
  /in collaborazione con/i,
  /sponsorizzat/i,
  /pubbliredaz/i,
  /advertorial/i,
  /affrettat/i,
  /black friday/i,
  /cyber monday/i,
  /club esse/i,
  /scopri l['’]offerta/i,
  /approfitta/i,
  /scommess/i,
  /\bbetting\b/i,
  // Post che vendono pubblicità/visibilità
  /la tua azienda/i,
  /la tua attività/i,
  /far conoscere la tua/i,
  /pacchett\w* special/i,
  /pubblicizz/i,
  /spazio pubblicitario/i,
  /inserzion/i,
  // Promozione di prodotti (libri, gadget, edizioni speciali)
  /edizione (speciale|limitata)/i,
  /disponibile (nelle?|in) librer/i,
  /in librer(ia|ie)/i,
  // Auto-promozione: inviti a iscriversi a canali/newsletter della testata
  /iscrivit/i, // iscriviti, iscrivitevi
  /\bunisciti\b/i,
  /(rimani|resta|rimanete|restate)\s+aggiornat/i,
  /(canale|gruppo)\s+(whatsapp|telegram)/i,
  /\bnewsletter\b/i,
];

// Categorie/tag del feed che indicano un contenuto promozionale.
export const PROMO_CATEGORIES = [
  "sponsor",
  "sponsorizzato",
  "promo",
  "promozioni",
  "adv",
  "pubblicità",
  "pubblicita",
  "sconti",
  "offerte",
  "partner",
];
