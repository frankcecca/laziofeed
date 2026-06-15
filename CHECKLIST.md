# Checklist unica — Lazio24

Da seguire **in ordine**, dall'alto verso il basso. Unisce gli aspetti legali, i
passi di deploy (il *come*, con comandi) e la verifica finale.

> Non è consulenza legale. Prima del lancio pubblico, far rivedere il tutto da un
> avvocato di diritto d'autore/IT. Legenda: `[ ]` da fare · `[x]` fatto.

---

## Fase 1 — Decisioni legali e contenuti (prima del deploy)

**Immagini di terzi (rischio più alto)**

- [x] **Niente immagini di terzi**: il collector non scarica né ri-ospita foto; la UI è testuale. Rischio azzerato.
- [x] Di conseguenza nessuna foto di agenzie (LaPresse, Getty, ANSA, IPA) o con watermark.
- [x] Nessuno stemma, logo, font o divisa ufficiale della S.S. Lazio (brand proprio L24).
- [x] Pulizia su disco: il collector rimuove eventuali immagini scaricate in passato.

**Diritto connesso degli editori (art. 43-bis L. 633/1941)**

- [x] Sintesi **brevi e originali**: prompt "con parole tue", una frase, tetto ~200 caratteri; eliminato il fallback che copiava l'estratto (senza AI → solo titolo + link).
- [x] Link alla fonte sempre presente e in evidenza.
- [x] Opt-out editori predisposto (Note legali + rimozione immediata in `lib/sources.js`).
- [ ] Mantenere il progetto **senza pubblicità e no-profit** (base equo compenso AGCOM ≈ 0) — impegno continuativo.
  - Sicuro: solo **donazioni libere** (non sono ricavi pubblicitari, non entrano nella base).
  - Da evitare per restare a ~0: banner/display ads, affiliazioni, post sponsorizzati, paywall/abbonamenti, vendita del servizio di rassegna a terzi.
  - **Trigger**: prima di introdurre qualsiasi forma di ricavo ≠ donazioni → fermarsi e sentire un legale (cambia equo compenso e qualificazione "non commerciale", che aiuta anche sul marchio).

**Sintesi AI = responsabilità editoriale nostra**

- [x] Prompt prudenti: tono neutro, niente virgolettati inventati.
- [x] Canale di correzione/rimozione rapida (email nelle Note legali).
- [ ] Disclaimer visibile sulle sintesi: "sintesi automatica, possibili imprecisioni — fa fede la fonte" — **ancora da aggiungere nella UI**.

**Marchio "Lazio"**

- [x] Disclaimer "sito non ufficiale, non affiliato" visibile (footer).
- [x] Niente elementi che facciano sembrare il sito ufficiale.
- [x] Donazioni come **contributo libero** (link PayPal "Sostieni"), non servizio a pagamento.

**Donazioni e fiscale**

- [ ] Confronto con un commercialista sull'inquadramento delle donazioni.
- [ ] Valutare una forma associativa (es. APS) se le entrate crescono.

**Fonti, ToS e privacy**

- [x] ToS fonti riletti (aggregazione). Esito:
  - **ANSA → rimossa**: le condizioni RSS vietano espressamente la pubblicazione dei titoli ANSA su siti web (uso ammesso solo nei Reader). Per riattivarla servirebbe autorizzazione (commerciale@ansa.it).
  - **Corriere della Sera → tenere d'occhio**: nessuna condizione RSS permissiva esplicita; editore attivo sul diritto connesso. Manteniamo solo titolo+link+sintesi nostra e restiamo pronti all'opt-out; da verificare le Condizioni generali RCS.
  - **Google News**: intermediario, link via news.google.com; uso dei feed pubblici, ok.
  - **7 testate laziali**: feed RSS completi pensati per la sindacazione, traffico gradito → rischio basso.
  - Ri-uso immagini: non più applicabile (immagini rimosse).
- [x] Restare **RSS-only** (scraping rimosso).
- [x] Analytics scelto: **Umami cookieless** → policy aggiornate, **nessun banner necessario**.

**Trasversale**

- [x] Contatto visibile + **procedura di takedown rapida** (email nelle Note legali).
- [ ] Far rivedere le pagine legali da un professionista.

---

## Fase 2 — Build locale

- [x] Build di produzione pulita: `npm run build`.
- [x] Disclaimer "non ufficiale" + disclaimer sintesi AI presenti e visibili.
- [x] Pagine legali aggiornate (incluso l'analytics).

---

## Fase 3 — Repository su GitHub

```bash
git init
git add .
git commit -m "Lazio24"
git remote add origin https://github.com/<tuo-utente>/laziofeed.git
git push -u origin main
```

- [x] Repo pushato su GitHub (frankcecca/laziofeed, pubblico).
- [x] Verificato `.gitignore`: `.env`, `node_modules`, `.next`, e i dati runtime (`data/articles.json`, `data/summaries.json`, `data/sources/`) non tracciati.

---

## Fase 4 — Servizio Railway + variabili d'ambiente

1. railway.app → **New Project** → **Deploy from GitHub repo** → `laziofeed`.
2. Se richiesto: Build `npm install && npm run build`, Start `npm start`.
3. Settings → **Variables**:

- [x] `NEXT_PUBLIC_SITE_URL` = `https://lazio24.news`
- [x] `COLLECT_SECRET` = stringa casuale (`openssl rand -hex 24`)
- [x] `GROQ_API_KEY` = chiave Groq (sintesi AI open-source, gratis). `ANTHROPIC_API_KEY` non usata.
- [x] `NEXT_PUBLIC_SUPPORT_URL` = `https://www.paypal.me/frankcecca`
- [ ] (Umami: due variabili in Fase 6 — ancora da fare)
- [x] Dominio `lazio24.news` collegato (registrato su Cloudflare, CNAME+TXT, DNS only), **HTTPS attivo**.

---

## Fase 5 — Volume persistente

In Railway: servizio → **Settings → Volumes → New Volume**.

- [x] Volume montato su `/app/data` (dati, cache sintesi e favicon persistono ai redeploy).

> Senza volume, dati e immagini ripartono "vuoti" a ogni redeploy finché non gira la raccolta successiva.

---

## Fase 6 — Analytics Umami (cookieless, anonimo)

1. Railway: **Add PostgreSQL**, poi **New → Template → Umami** (collega il DB e avvia).
2. Accedi a Umami (default `admin` / `umami`) → **cambia subito la password**.
3. Crea il sito `lazio24.news` → ottieni **script URL** (`https://<istanza>/script.js`) e **Website ID**.
4. Nelle Variables del sito:

- [ ] `NEXT_PUBLIC_UMAMI_SRC` = `https://<tua-istanza-umami>/script.js`
- [ ] `NEXT_PUBLIC_UMAMI_WEBSITE_ID` = l'ID generato
- [ ] **Redeploy** del sito (le `NEXT_PUBLIC_` entrano al build; lo script si carica solo se entrambe presenti).
- [ ] Istanza ospitata in UE e IP in forma anonima.

---

## Fase 7 — Scheduler della raccolta

URL da chiamare: `https://<dominio>/api/collect?token=IL_TUO_COLLECT_SECRET`
Frequenza consigliata: **ogni 15–30 minuti** (le notizie coprono le ultime 24h).

- [x] Scheduler attivo su **cron-job.org**, ogni **20 minuti**, con notifica email sui fallimenti. Test "Run now" → HTTP 200.
- [x] Workflow GitHub Actions **disattivato** (resta come riserva).
- [x] Costi AI sotto controllo: Groq free + **cache delle sintesi** (1 chiamata per notizia) → poche chiamate/giorno, dentro il free tier.

---

## Fase 8 — Prima esecuzione e verifica

- [x] `/api/collect?token=…` → `{"ok":true,"count":…}`.
- [x] La home mostra notizie, tema del momento e sintesi AI (Groq) pulite.
- [x] Favicon delle fonti servite dal volume (route `/sources/[file]`).
- [x] Storie con titolo duplicato fuse (no card gemelle).

---

## Fase 9 — QA a sito live

- [ ] **Nessun cookie** impostato (DevTools → Application → Cookies/Storage vuoto): conferma il cookieless.
- [ ] Dati Umami aggregati e anonimi nella dashboard (niente IP identificabili).
- [ ] `robots`, `sitemap`, OG e JSON-LD ok; `/n/[id]` confermato `noindex`.
- [ ] Manifest, service worker, icone (192/512, apple-touch) verificati su device reale.
- [ ] OG image testata con i debugger di WhatsApp / Telegram / X.
- [ ] Lighthouse: performance, accessibilità, SEO, PWA.
- [ ] Test iPhone reale (anche landscape) + Android: tasto Condividi, pagina-notizia scaduta (oltre 24h), link del footer.

---

## Fase 10 — In esercizio

- [ ] Uptime/health monitor attivo.
- [ ] Email/contatto per segnalazioni e **takedown** funzionante (rimozione entro poche ore).
- [ ] Stato "giornata tranquilla / nessuna notizia" gestito.
- [ ] Aggiornamenti: codice via `git push` (deploy automatico), dati via cron.
- [ ] Piccolo log delle segnalazioni ricevute e delle rimozioni effettuate.

---

## Appendice — parametri tecnici

- Finestra notizie: `EDITION_WINDOW_HOURS` in `lib/collect.js` (24h). Sotto le 5 storie → "giornata tranquilla" (`QUIET_THRESHOLD`).
- Finestra "tema del momento": `TREND_WINDOW_MS` in `lib/collect.js` (12h).
- Home e pagina-notizia: **dinamiche** (`force-dynamic`) → leggono i dati dal volume a ogni richiesta.
- Sintesi AI: provider via env (`GROQ_API_KEY` → Groq); **cache** in `data/summaries.json`; `CACHE_VERSION` in `lib/collect.js` invalida la cache se cambia.
- Sicurezza: Next.js aggiornato a 14.2.35 (CVE).
- In locale: `npm run collect` + `npm run dev`.

## Da completare

- [ ] **Alias email** Cloudflare (`legal@` / `info@`) → poi aggiornare le pagine legali (togliere la mail personale).
- [ ] **Umami** (Fase 6): PostgreSQL + template, due variabili `NEXT_PUBLIC_UMAMI_*`.
- [ ] **QA a sito live** (Fase 9): nessun cookie, OG sui debugger social, Lighthouse, test su iPhone/Android.
- [ ] Far rivedere le pagine legali da un professionista.
