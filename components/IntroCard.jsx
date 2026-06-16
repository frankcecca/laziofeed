"use client";

import { useEffect, useState } from "react";
import ManifestoContent from "./ManifestoContent";

const KEY = "lazio24:intro-dismissed";

// Card introduttiva mostrata solo alla prima visita (ricordata in localStorage).
export default function IntroCard() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      // localStorage non disponibile: non mostrare
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  };

  return (
    <section className="rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 p-4">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cos’è Lazio24</h2>
      <div className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 [&_strong]:font-medium [&_strong]:text-slate-800 dark:[&_strong]:text-slate-200">
        <ManifestoContent />
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full bg-lazio-blue px-4 py-1.5 text-xs font-medium text-white transition active:scale-95"
        >
          Ho capito
        </button>
      </div>
    </section>
  );
}
