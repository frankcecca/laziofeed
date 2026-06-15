# Lazio24

Aggregatore di notizie sulla **S.S. Lazio** raccolte dal web. Raccoglie articoli
dai feed RSS delle principali fonti, li filtra per pertinenza, li deduplica e
genera per ognuno un breve **riassunto AI**, mostrando titolo, riassunto e link
alla fonte originale.

## Stack

- **Next.js 14** (App Router) + **Tailwind CSS** — sito statico/ISR, veloce e SEO-friendly
- **rss-parser** — lettura dei feed RSS
- **Anthropic Claude** — riassunti automatici (opzionale, con fallback all'estratto del feed)
- Storage: file JSON (`data/articles.json`) — niente database per lo scaffold base

## Avvio

```bash
npm install
cp .env.example .env        # opzionale: inserisci ANTHROPIC_API_KEY per i riassunti AI
npm run collect             # raccoglie le notizie → data/articles.json
npm run dev                 # avvia il sito su http://localhost:3000
```

Senza `ANTHROPIC_API_KEY` il sito funziona comunque: come riassunto usa
l'estratto fornito dal feed RSS.

## Come funziona

```
scripts/collect.mjs  →  lib/collect.js  →  lib/sources.js  (quali feed leggere)
                                        →  lib/summarize.js (riassunto AI / fallback)
                                        →  data/articles.json
app/page.jsx  legge data/articles.json e mostra il feed
```

## Immagini

Per ogni articolo l'immagine viene cercata in quest'ordine:

1. dal feed RSS — `media:content`, `media:thumbnail`, `enclosure`, o primo `<img>` nel contenuto;
2. se assente, **fallback `og:image`**: lo script scarica l'HTML dell'articolo
   ed estrae il meta-tag `og:image` (o `twitter:image`), in batch da 5 richieste
   parallele con timeout di 8s;
3. se ancora assente, la UI mostra un placeholder azzurro biancoceleste.

Nota: i link di Google News passano da un redirect, quindi il fallback og:image
è più efficace sulle fonti dirette (LazioNews24, Cittaceleste, ecc.).

Le immagini trovate vengono **scaricate in `public/images/`** (validate per tipo e
dimensione) e servite tramite `next/image`, così restano disponibili anche se la
fonte le rimuove e vengono ottimizzate automaticamente. Ad ogni esecuzione le
immagini non più referenziate vengono cancellate. In un deploy basato su git
(es. GitHub Actions che committa il feed), aggiungi `public/images` al commit;
per volumi alti conviene invece uno storage esterno (S3/R2) o un CDN.

## Personalizzare le fonti

Modifica `lib/sources.js`:

- `SOURCES`: aggiungi/togli feed RSS. Per le testate generaliste usa Google News
  con query filtrata (vedi esempio già presente).
- `KEYWORDS`: parole chiave che confermano che la notizia parli davvero della
  società (evita confusione con la "Regione Lazio").

## Aggiornamento automatico

Pianifica `npm run collect` con un cron:

- **Vercel**: aggiungi un Cron Job in `vercel.json` che chiama una route API che
  esegue la raccolta, oppure usa una GitHub Action schedulata che committa
  `data/articles.json`.
- **GitHub Actions** (esempio, ogni 20 min):

```yaml
on:
  schedule:
    - cron: "*/20 * * * *"
jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci && npm run collect
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - run: |
          git config user.name bot && git config user.email bot@local
          git add data/articles.json && git commit -m "update feed" || true
          git push
```

## Evoluzioni consigliate

- **Database** (PostgreSQL + Prisma su Supabase/Neon) al posto del JSON, per
  storico e ricerca.
- **Scraping** con Cheerio/Playwright per fonti senza RSS.
- Categorie (calciomercato, partite, primavera) e pagina di ricerca.

## Note legali

Lazio24 mostra solo titolo, breve riassunto e link alla fonte originale: non
ripubblica gli articoli interi. Rispetta sempre `robots.txt` e i termini d'uso
delle fonti. Sito non ufficiale, non affiliato alla S.S. Lazio.
