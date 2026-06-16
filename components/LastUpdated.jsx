"use client";

import { useEffect, useState } from "react";

// Riga "ultimo aggiornamento": dopo 10 secondi sfuma e poi sparisce del tutto
// (così non resta lì fissa mentre l'utente legge il feed).
export default function LastUpdated({ label }) {
  const [hidden, setHidden] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHidden(true), 10000);
    return () => clearTimeout(t);
  }, []);

  if (!label || removed) return null;

  return (
    <p
      onTransitionEnd={() => hidden && setRemoved(true)}
      className={
        "flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 transition-opacity duration-700 " +
        (hidden ? "opacity-0" : "opacity-100")
      }
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      {label}
    </p>
  );
}
