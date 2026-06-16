import { readFile } from "node:fs/promises";
import path from "node:path";
import SectionHeader from "../components/SectionHeader";
import NewsTicker from "../components/NewsTicker";
import IntroCard from "../components/IntroCard";
import ShareButton from "../components/ShareButton";
import TrendBadge from "../components/TrendBadge";
import LastUpdated from "../components/LastUpdated";
import NotificationToggle from "../components/NotificationToggle";
import { SITE_URL, SITE_NAME } from "../lib/site";

// Sempre dinamica: legge i dati raccolti sul volume a ogni richiesta, così
// riflette subito l'ultima raccolta (niente pre-render statico dal seme).
export const dynamic = "force-dynamic";

async function getData() {
  try {
    const file = path.join(process.cwd(), "data", "articles.json");
    return JSON.parse(await readFile(file, "utf-8"));
  } catch {
    return {
      updatedAt: null,
      edition: null,
      digest: null,
      topStory: null,
      articles: [],
    };
  }
}

// Descrizione dinamica per SEO/social: il "tema del momento" del giorno.
export async function generateMetadata() {
  const { digest } = await getData();
  const description = digest
    ? `Il tema del momento: ${digest}`
    : "Tutte le notizie sulla S.S. Lazio delle ultime 24 ore, da tutte le fonti, aggiornate in continuo.";
  return {
    description,
    openGraph: { description },
    twitter: { description },
  };
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)} min`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h`;
  return `${Math.round(diff / 86400)} g`;
}

// Versione compatta per il binario della timeline: "16m", "2h", "3g".
function timeAgoShort(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}g`;
}

// Etichetta dell'ultimo aggiornamento: se il valore arrotondato è 0 (aggiornato
// da meno di mezzo minuto) mostra "Appena aggiornato" invece di "Aggiornato 0 min fa".
function updateLabel(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (Math.round(diff / 60) === 0) return "Appena aggiornato";
  return `Aggiornato ${timeAgo(iso)} fa`;
}

// Placeholder azzurro quando la notizia non ha immagine.
// Spiegazione del punteggio Trend, ricorrente in tutte le modali di sezione.
function TrendExplainer() {
  return (
    <p>
      Il <span className="font-medium text-slate-800 dark:text-slate-200">Trend</span> indica quanto
      una notizia è calda in questo momento: combina la copertura (quante
      testate diverse la riprendono nello stesso arco di tempo) e la freschezza
      (cala con le ore). Va da 0 a 100.
    </p>
  );
}

function Meta({ source, publishedAt, badge, coverage, onDark }) {
  const text = [source, publishedAt ? timeAgo(publishedAt) : null]
    .filter(Boolean)
    .join(" · ");
  // Niente da mostrare → nessun div (evita il margine vuoto sopra il titolo).
  if (!badge && !text && !(coverage > 1)) return null;
  return (
    <div className="mb-1.5 flex items-center gap-2">
      {badge && (
        <span
          className={
            "rounded px-2 py-0.5 text-xs font-medium " +
            (onDark ? "bg-white/20 text-white" : "bg-sky-100 dark:bg-sky-500/15 text-lazio-blue dark:text-sky-400")
          }
        >
          {badge}
        </span>
      )}
      {text && (
        <span className={"text-xs " + (onDark ? "text-sky-100" : "text-slate-500 dark:text-slate-400")}>
          {text}
        </span>
      )}
      {coverage > 1 && (
        <span
          className={
            "rounded-full border px-2 py-0.5 text-xs font-medium " +
            (onDark
              ? "border-white/40 text-white"
              : "border-slate-200 dark:border-night-border text-slate-500 dark:text-slate-400")
          }
        >
          {coverage} fonti
        </span>
      )}
    </div>
  );
}

// Sigle riconoscibili per ciascuna testata (fallback: iniziali calcolate).
const SOURCE_SHORT = {
  "Google News — S.S. Lazio": "GN",
  LazioNews24: "L24",
  "LazioNews.eu": "LNe",
  Cittaceleste: "CC",
  "La Lazio Siamo Noi": "LSN",
  LazioPress: "LP",
  "Noi Biancocelesti": "NB",
  Lazialità: "LL",
  LazioWiki: "LW",
  "ANSA Sport": "ANS",
  "Corriere della Sera": "CdS",
};

function sourceInitials(name = "") {
  if (SOURCE_SHORT[name]) return SOURCE_SHORT[name];
  const clean = name
    .replace(/\s*—.*$/, "")
    .replace(/\.(eu|it|com|net|org)$/i, "");
  const words = clean.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length >= 2)
    return words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  const caps = clean.match(/[A-Z0-9]/g);
  if (caps && caps.length >= 2) return caps.slice(0, 3).join("");
  return clean.slice(0, 2).toUpperCase();
}

// Chips per scegliere quale fonte aprire (notizie con più coperture):
// avatar circolari con la favicon (auto-ospitata) della testata.
function SourceChips({ sources, onDark }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <span
        className={
          "flex-shrink-0 text-xs " + (onDark ? "text-sky-100" : "text-slate-500 dark:text-slate-400")
        }
      >
        Leggi su
      </span>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {sources.map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            title={s.name}
            aria-label={`Apri su ${s.name}`}
            className={
              "flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full transition active:scale-95 " +
              (onDark ? "bg-white/20" : "bg-sky-100 dark:bg-sky-500/15")
            }
          >
            {s.favicon ? (
              <img
                src={s.favicon}
                alt=""
                width={32}
                height={32}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <span
                className={
                  "text-xs font-medium " + (onDark ? "text-white" : "text-lazio-blue dark:text-sky-400")
                }
              >
                {sourceInitials(s.name)}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

// Una storia ha più coperture? L'utente sceglie la fonte dalle chips.
function isMulti(a) {
  return a.coverage > 1 && Array.isArray(a.sources) && a.sources.length > 1;
}

// Card compatta testuale, usata in "In primo piano" e "Ultime notizie".
function CompactCard({ a, trend, hideTime }) {
  const multi = isMulti(a);

  const body = (
    <div className="min-w-0">
      <Meta
        source={multi ? undefined : a.source}
        publishedAt={hideTime ? undefined : a.publishedAt}
        coverage={multi ? undefined : a.coverage}
      />
      <h3 className="text-base font-semibold leading-snug text-slate-900 dark:text-slate-100">
        {a.title}
      </h3>
      {a.summary && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {a.summary}
        </p>
      )}
      {multi && <SourceChips sources={a.sources} />}
    </div>
  );

  // Riga azioni: Condividi (sempre) + chip Trend (se presente). Resta SEMPRE
  // fuori dal link per non annidare elementi interattivi.
  const actions = (
    <div className="mt-6 flex items-center justify-between gap-3">
      <ShareButton id={a.id} title={a.title} />
      {typeof trend === "number" && <TrendBadge value={trend} />}
    </div>
  );

  // Multi-fonte: niente link unico, si sceglie dalle chips. Stesso bordo
  // azzurro del box "Il tema più importante".
  if (multi) {
    return (
      <div className="flex flex-col overflow-hidden rounded-xl border-2 border-sky-200 dark:border-sky-500/30 bg-white dark:bg-night-card p-3">
        {body}
        {actions}
      </div>
    );
  }

  // Fonte singola: il contenuto è cliccabile, le azioni restano fuori dal link.
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-night-border bg-white dark:bg-night-card p-3">
      <a
        href={a.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block transition active:scale-[0.99]"
      >
        {body}
      </a>
      {actions}
    </div>
  );
}

export default async function Home() {
  const { updatedAt, edition, digest, articles } = await getData();

  if (!articles.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-night-card p-8 text-center text-slate-500 dark:text-slate-400">
        <p className="font-medium">Nessuna notizia ancora.</p>
        <p className="mt-2 text-sm">
          Esegui{" "}
          <code className="rounded bg-slate-100 dark:bg-slate-800 px-1">npm run collect</code> per
          popolare il feed.
        </p>
      </div>
    );
  }

  // "Tema del momento": il punteggio premia il momentum (quante fonti
  // riprendono la stessa storia in una finestra ravvicinata) e decade con
  // l'età, così un picco recente batte una copertura vecchia ma diluita.
  const now = Date.now();
  const mom = (a) => a.momentum || 1;
  const ageHours = (a) => {
    const t = a.lastAt || a.publishedAt;
    return t ? (now - new Date(t).getTime()) / 3600000 : 9999;
  };
  const trendScore = (a) => mom(a) / (1 + ageHours(a) / 24);
  const recency = (a) =>
    new Date(a.lastAt || a.publishedAt || 0).getTime();

  // Punteggio trend normalizzato 0-100 rispetto alla storia più calda.
  const maxScore = Math.max(...articles.map(trendScore), 1);
  const trendOf = (a) => Math.round((trendScore(a) / maxScore) * 100);

  const byTrending = [...articles].sort(
    (a, b) => trendScore(b) - trendScore(a) || recency(b) - recency(a)
  );

  // Il tema più importante = la storia col Trend più alto (coerente col badge,
  // quindi mostra sempre Trend 100). Le storie multi-fonte portano già con sé
  // titolo e riassunto sintetizzati dall'AI in fase di raccolta.
  const hero = byTrending[0];

  // "In primo piano": le storie più calde dopo quella principale.
  const trending = byTrending
    .filter((a) => a.id !== hero.id && mom(a) > 1)
    .slice(0, 3);

  const shown = new Set([hero.id, ...trending.map((t) => t.id)]);
  // "Ultime notizie": tutto il resto, in ordine cronologico.
  const latest = articles
    .filter((a) => !shown.has(a.id))
    .sort((a, b) => recency(b) - recency(a));

  const quiet = edition?.quiet ?? articles.length < 5;

  // Dati strutturati (JSON-LD) per i motori di ricerca.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: "it-IT",
      },
      {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.svg`,
      },
      {
        "@type": "ItemList",
        name: "Notizie sulla S.S. Lazio delle ultime 24 ore",
        itemListElement: articles.slice(0, 20).map((a, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: a.url,
          name: a.title,
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1 className="sr-only">
        Lazio24 — tutte le notizie sulla S.S. Lazio delle ultime 24 ore
      </h1>

      {/* Elementi non visibili (script/h1) tenuti fuori dal flusso "space-y" per
          non lasciare un margine fantasma sul primo elemento visibile: così la
          distanza dall'header resta costante anche quando la scritta sparisce.
          Il -mt-1 compensa il padding del <main> per centrare a ~12px. */}
      <div className="-mt-1 space-y-3">
        {/* Ultimo aggiornamento (la pagina è dinamica: ricalcolato a ogni visita) */}
        {updatedAt && <LastUpdated label={updateLabel(updatedAt)} />}

      {/* Manifesto: mostrato solo alla prima visita */}
      <IntroCard />

      {/* Ultim'ora: le 4 notizie più calde che scorrono */}
      <NewsTicker items={byTrending.slice(0, 4)} />

      {/* Opt-in notifiche push (si mostra solo se supportato) */}
      <NotificationToggle />

      {/* Giornata tranquilla: poche notizie nelle ultime 24 ore */}
      {quiet && (
        <div className="rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 p-3 text-center text-xs leading-relaxed text-lazio-blue dark:text-sky-400">
          Giornata tranquilla in casa Lazio: poche notizie nelle ultime 24 ore.
          Ecco comunque cosa è successo.
        </div>
      )}

      {/* Tema del momento — digest AI */}
      {digest && (
        <section className="rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-lazio-blue dark:text-sky-400">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
            </svg>
            <span className="text-xs font-medium uppercase tracking-wide">
              Il tema del momento
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{digest}</p>
        </section>
      )}

      <SectionHeader title="Il tema più importante">
        <p>
          La notizia più calda del momento, scelta in base al punteggio Trend:
          quante testate la riprendono in poco tempo, con priorità alle più
          recenti.
        </p>
        <p>
          Se è coperta da più fonti, titolo e riassunto sono una sintesi
          generata dall’AI che unisce le diverse versioni; puoi aprire ciascuna
          testata dai cerchietti.
        </p>
        <TrendExplainer />
      </SectionHeader>
      {/* Hero con sintesi AI della storia top */}
      {(() => {
        const heroMulti = isMulti(hero);
        const heroBody = (
          <div className="p-4">
            <Meta
              source={heroMulti ? undefined : hero.source || hero.sources?.[0]?.name}
              publishedAt={hero.lastAt || hero.publishedAt}
              coverage={heroMulti ? undefined : hero.coverage}
            />
            <h2 className="text-lg font-semibold leading-snug text-slate-900 dark:text-slate-100">
              {hero.title}
            </h2>
            {hero.summary && (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {hero.summary}
              </p>
            )}
            {heroMulti && <SourceChips sources={hero.sources} />}
          </div>
        );

        return (
          <section className="overflow-hidden rounded-2xl bg-[#eef4fb] shadow-[6px_6px_14px_#c8d6ea,-6px_-6px_14px_#ffffff] dark:bg-night-raised dark:shadow-[6px_6px_14px_#05090f,-6px_-6px_14px_#1d3358]">
            {heroMulti ? (
              heroBody
            ) : (
              <a
                href={hero.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block transition active:scale-[0.99]"
              >
                {heroBody}
              </a>
            )}
            {/* Riga azioni fuori dal link: Condividi + chip Trend (oro) */}
            <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-2">
              <ShareButton id={hero.id} title={hero.title} />
              <TrendBadge value={trendOf(hero)} gold />
            </div>
          </section>
        );
      })()}

      {/* In primo piano: le storie più condivise */}
      {trending.length > 0 && (
        <>
          <SectionHeader title="In primo piano">
            <p>
              Le altre notizie più calde del momento, dopo la principale,
              ordinate per punteggio Trend.
            </p>
            <TrendExplainer />
          </SectionHeader>
          {trending.map((a) => (
            <CompactCard key={a.id} a={a} trend={trendOf(a)} />
          ))}
        </>
      )}

      {/* Ultime notizie in ordine cronologico */}
      <SectionHeader title="Ultime notizie">
        <p>
          Tutto il resto delle ultime 24 ore, in ordine cronologico (dalla più
          recente).
        </p>
        <p>
          Le notizie arrivano da più testate biancocelesti e nazionali, vengono
          raggruppate per storia quando più fonti trattano lo stesso fatto, e la
          pubblicità è filtrata.
        </p>
        <TrendExplainer />
      </SectionHeader>
      {/* Timeline verticale: l'unica sezione cronologica */}
      <div className="relative">
        <span
          className="pointer-events-none absolute left-[39px] top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-700"
          aria-hidden="true"
        />
        <div className="space-y-3">
          {latest.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <div className="flex w-11 flex-shrink-0 items-center justify-end gap-1.5 pt-6">
                <span className="text-xs font-medium leading-none text-slate-500 dark:text-slate-400">
                  {timeAgoShort(a.lastAt || a.publishedAt)}
                </span>
                <span
                  className="relative h-2.5 w-2.5 flex-shrink-0 rounded-full bg-lazio-blue ring-2 ring-white dark:ring-night-bg"
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <CompactCard a={a} hideTime />
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </>
  );
}
