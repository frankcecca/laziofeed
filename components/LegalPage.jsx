import Link from "next/link";

// Cornice comune per le pagine legali: titolo, data, prosa leggibile.
export default function LegalPage({ title, updated, children }) {
  return (
    <article className="py-2">
      <Link
        href="/"
        className="text-xs font-medium text-lazio-blue hover:underline"
      >
        ← Torna a Lazio24
      </Link>
      <h1 className="mt-3 text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-xs text-slate-500">
        Ultimo aggiornamento: {updated}
      </p>
      <div className="legal mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
        {children}
      </div>
    </article>
  );
}
