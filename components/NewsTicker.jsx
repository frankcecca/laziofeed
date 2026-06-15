"use client";

import { useState } from "react";

// Ticker "ultim'ora" con pulsante pausa/play (WCAG 2.2.2).
export default function NewsTicker({ items }) {
  const [paused, setPaused] = useState(false);
  if (!items?.length) return null;
  const loop = [...items, ...items]; // duplicato per lo scorrimento continuo

  return (
    <div className="flex items-center gap-2 overflow-hidden rounded-xl bg-lazio-blue px-3 py-2 text-white">
      <span className="flex flex-shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-red-400"
          aria-hidden="true"
        />
        Ultim’ora
      </span>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div
          className="ticker-track flex w-max gap-8"
          style={{ animationPlayState: paused ? "paused" : "running" }}
        >
          {loop.map((a, i) => {
            const dup = i >= items.length;
            return (
              <a
                key={i}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-hidden={dup}
                tabIndex={dup ? -1 : 0}
                className="whitespace-nowrap text-xs text-white/90 hover:text-white"
              >
                {a.title}
              </a>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={
          paused
            ? "Riprendi lo scorrimento delle notizie"
            : "Metti in pausa lo scorrimento delle notizie"
        }
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
      >
        {paused ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
          </svg>
        )}
      </button>
    </div>
  );
}
