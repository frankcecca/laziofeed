"use client";

import { useState } from "react";

// Pulsante "Condividi": usa lo share nativo del dispositivo (WhatsApp, Telegram,
// social…) quando disponibile, altrimenti copia il link negli appunti.
// Condivide sempre l'URL della notizia su Lazio24 (/n/<id>), così l'anteprima
// e il marchio restano nostri.
export default function ShareButton({ id, title, onDark }) {
  const [copied, setCopied] = useState(false);

  const onClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/n/${id}`;
    const data = { title: `Lazio24 — ${title}`, text: title, url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // condivisione annullata o non disponibile: nessuna azione
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Condividi: ${title}`}
      className={
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition active:scale-95 " +
        (onDark
          ? "border-white/40 text-white hover:border-white hover:bg-white/10"
          : "border-slate-200 text-slate-500 hover:border-sky-300 hover:text-lazio-blue")
      }
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
      </svg>
      {copied ? "Copiato" : "Condividi"}
    </button>
  );
}
