import Link from "next/link";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SITE_NAME } from "../../../lib/site";

// Sempre dinamica: legge i dati raccolti sul volume a ogni richiesta.
export const dynamic = "force-dynamic";

async function getStory(id) {
  try {
    const file = path.join(process.cwd(), "data", "articles.json");
    const { articles } = JSON.parse(await readFile(file, "utf-8"));
    return (articles || []).find((a) => a.id === id) || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const story = await getStory(params.id);
  if (!story) {
    return {
      title: `Notizia non più disponibile — ${SITE_NAME}`,
      description: "Questa notizia non è più tra le ultime 24 ore.",
    };
  }
  const description =
    story.summary || "Le ultime notizie sulla S.S. Lazio, in un posto solo.";
  return {
    title: `${story.title} — ${SITE_NAME}`,
    description,
    alternates: { canonical: `/n/${story.id}` },
    // Pagine effimere: niente indicizzazione (scadono in 24h), ma l'anteprima
    // social legge comunque i tag Open Graph qui sotto.
    robots: { index: false, follow: true },
    openGraph: {
      type: "article",
      title: story.title,
      description,
      url: `/n/${story.id}`,
      images: story.image ? [story.image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: story.title,
      description,
      images: story.image ? [story.image] : undefined,
    },
  };
}

export default async function StoryShare({ params }) {
  const story = await getStory(params.id);

  if (!story) {
    return (
      <article className="py-8 text-center">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Questa notizia non è più tra le ultime 24 ore.
          <br />
          Su Lazio24 le notizie restano finché sono attuali, poi scorrono via.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-full bg-lazio-blue px-5 py-2 text-xs font-medium text-white transition active:scale-95"
        >
          Vai a Lazio24
        </Link>
      </article>
    );
  }

  const sources =
    story.sources && story.sources.length
      ? story.sources
      : [{ name: story.source, url: story.url }];

  return (
    <article className="py-2">
      <Link
        href="/"
        className="text-xs font-medium text-lazio-blue dark:text-sky-400 hover:underline"
      >
        ← Lazio24
      </Link>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-night-border bg-white dark:bg-night-card">
        <div className="p-4">
          <h1 className="text-lg font-semibold leading-snug text-slate-900 dark:text-slate-100">
            {story.title}
          </h1>
          {story.summary && (
            <>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {story.summary}
              </p>
              <p className="mt-1.5 text-xs italic text-slate-400">
                Sintesi automatica: possibili imprecisioni, fa fede la fonte.
              </p>
            </>
          )}

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Leggi la notizia sulla fonte
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sources.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-lazio-blue dark:text-sky-400 transition hover:bg-sky-100 dark:hover:bg-sky-500/20"
              >
                {s.name} ↗
              </a>
            ))}
          </div>
        </div>
      </div>

      <Link
        href="/"
        className="mt-4 block text-center text-xs text-slate-500 dark:text-slate-400 hover:text-lazio-blue dark:hover:text-sky-400 hover:underline"
      >
        Tutte le notizie delle ultime 24 ore →
      </Link>
    </article>
  );
}
