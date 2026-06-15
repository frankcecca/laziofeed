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

- [ ] Build di produzione pulita: `npm run build` (niente cache HMR di sviluppo).
- [ ] Disclaimer "non ufficiale" + disclaimer sintesi AI presenti e visibili.
- [ ] Pagine legali aggiornate (incluso l'analytics).

---

## Fase 3 — Repository su GitHub

```bash
git init
git add .
git commit -m "Lazio24"
git remote add origin https://github.com/<tuo-utente>/laziofeed.git
git push -u origin main
```

- [ ] Repo pushato su GitHub.
- [ ] Verificato che `.env`, `node_modules`, `.next`, `public/images` siano in `.gitignore` (le immagini si rigenerano sul server).

---

## Fase 4 — Servizio Railway + variabili d'ambiente

1. railway.app → **New Project** → **Deploy from GitHub repo** → `laziofeed`.
2. Se richiesto: Build `npm install && npm run build`, Start `npm start`.
3. Settings → **Variables**:

- [ ] `NEXT_PUBLIC_SITE_URL` = `https://lazio24.news`
- [ ] `COLLECT_SECRET` = stringa casuale (`openssl rand -hex 24`)
- [ ] `ANTHROPIC_API_KEY` = la tua chiave (mai nel repo)
- [ ] `NEXT_PUBLIC_SUPPORT_URL` = `https://www.paypal.me/frankcecca`
- [ ] (Umami: due variabili in Fase 6)
- [ ] Dominio `lazio24.news` collegato, DNS configurato, **HTTPS attivo** (serve per PWA e tasto Condividi).

---

## Fase 5 — Volume persistente

In Railway: servizio → **Settings → Volumes → New Volume**.

- [ ] Volume montato (es. `/app/data`) così dati e immagini sopravvivono ai redeploy.

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

- [ ] Scheduler attivo, con una di queste opzioni:
  - **cron-job.org** (gratis): nuovo cronjob → incolla l'URL → intervallo 20 min.
  - **GitHub Actions** (`*/20 * * * *`) con `curl` all'URL e `COLLECT_SECRET` tra i Secrets.
  - **Railway Cron**: servizio che esegue `curl "$URL/api/collect?token=$COLLECT_SECRET"`.
- [ ] Budget/quota API Anthropic monitorati (limite di spesa impostato).

---

## Fase 8 — Prima esecuzione e verifica

- [ ] Aperto `/api/collect?token=…` → risponde `{"ok":true,"count":…}`.
- [ ] La home mostra notizie, immagini e tema del momento.
- [ ] Pulizia immagini a 24h verificata.
- [ ] Se una fonte fallisce, il sito resta su (no crash).

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
- Home con ISR: `revalidate` 600s in `app/page.jsx` (abbassalo per aggiornamenti più rapidi).
- In locale: `npm run collect` + `npm run dev`.
