"use client";

import { useEffect, useRef, useState } from "react";

// Chip "Trend" cliccabile: al clic apre una modale che spiega come si calcola
// il punteggio. Stessa spiegazione usata nelle altre modali di sezione.
export default function TrendBadge({ value, gold }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Trend ${value} su 100. Scopri come funziona`}
        className={
          "inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95 " +
          (gold ? "bg-[#d4af37] text-[#4a3800]" : "bg-lazio-blue text-white")
        }
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M13 2c.5 3-1.5 4.5-1.5 7a2 2 0 0 0 4 0c0-.8-.2-1.4-.5-2 2 1.4 3 3.3 3 5.5a6 6 0 0 1-12 0c0-3.5 2.5-5.5 4-8 .8-1.3 2.5-2 3.5-2.5z" />
        </svg>
        Trend {value}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Come funziona il Trend"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <span className="inline-flex items-center gap-0.5 rounded-full bg-lazio-blue px-2 py-0.5 text-xs font-medium text-white">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M13 2c.5 3-1.5 4.5-1.5 7a2 2 0 0 0 4 0c0-.8-.2-1.4-.5-2 2 1.4 3 3.3 3 5.5a6 6 0 0 1-12 0c0-3.5 2.5-5.5 4-8 .8-1.3 2.5-2 3.5-2.5z" />
                  </svg>
                  Trend
                </span>
                Come funziona
              </h3>
              <button
                ref={closeRef}
                type="button"
                aria-label="Chiudi"
                onClick={() => setOpen(false)}
                className="text-slate-500 transition hover:text-slate-700"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <p className="text-sm leading-relaxed text-slate-600">
              Il punteggio{" "}
              <span className="font-medium text-slate-800">Trend</span> indica
              quanto una notizia è “calda” in questo momento. Si basa su due
              fattori:
            </p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-600">
              <li>
                <span className="font-medium text-slate-800">Copertura:</span>{" "}
                quante testate diverse riprendono la stessa notizia nello stesso
                breve arco di tempo. Più fonti = più calda.
              </li>
              <li>
                <span className="font-medium text-slate-800">Freschezza:</span>{" "}
                col passare delle ore il punteggio cala, così un picco recente
                conta più di una copertura vecchia.
              </li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Il valore va da 0 a 100, dove 100 è la notizia più calda del
              momento. In “In primo piano” trovi quelle con il Trend più alto.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
