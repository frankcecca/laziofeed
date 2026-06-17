"use client";

import { useEffect, useRef, useState } from "react";

// Titolo di sezione (stile uniforme) + icona che apre una modale accessibile.
export default function SectionHeader({ title, children, aside }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <div className="flex items-center gap-1.5 px-1 pt-2">
      <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </h2>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Maggiori informazioni: ${title}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-lazio-blue transition hover:bg-sky-200 active:scale-95 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
        Info
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white dark:bg-night-card p-5 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
              <button
                ref={closeRef}
                type="button"
                aria-label="Chiudi"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center text-slate-500 dark:text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
