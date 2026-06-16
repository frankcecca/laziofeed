import Link from "next/link";
import { SOURCES } from "../../lib/sources";
import SourceLogo from "../../components/SourceLogo";

export const metadata = {
  title: "Fonti — Lazio24",
};

function siteOf(s) {
  try {
    return s.site || new URL(s.url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function initials(name) {
  return name
    .replace(/—.*/, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Fonti() {
  return (
    <article className="py-2">
      <Link
        href="/"
        className="text-xs font-medium text-lazio-blue dark:text-sky-400 hover:underline"
      >
        ← Torna a Lazio24
      </Link>
      <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">Fonti</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Le {SOURCES.length} fonti da cui Lazio24 raccoglie le notizie, tramite i
        rispettivi feed RSS. Ogni notizia rimanda sempre all’articolo originale.
      </p>

      <ul className="mt-4 space-y-2">
        {SOURCES.map((s) => {
          const site = siteOf(s);
          return (
            <li
              key={s.url}
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-night-border bg-white dark:bg-night-card p-3"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 dark:bg-sky-500/15">
                <SourceLogo
                  src={site ? `/sources/${site}.png` : null}
                  alt={s.name}
                  fallback={initials(s.name)}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{s.name}</p>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-xs text-slate-500 dark:text-slate-400 hover:text-lazio-blue dark:hover:text-sky-400 hover:underline"
                >
                  {s.url}
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
