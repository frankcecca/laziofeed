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
      <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Come funziona: ${title}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex h-6 w-6 items-center justify-center text-slate-500 transition hover:text-lazio-blue"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
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
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              <button
                ref={closeRef}
                type="button"
                aria-label="Chiudi"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:text-slate-700"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-slate-600">
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
