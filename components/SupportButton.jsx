import { SUPPORT_URL, SUPPORT_LABEL } from "../lib/site";

function Heart({ className }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 21s-7.5-4.6-10-9.2C.4 8.6 2 5 5.5 5c2 0 3.5 1.2 4.5 2.5C11 6.2 12.5 5 14.5 5 18 5 19.6 8.6 22 11.8 19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

// variant="header" → pill compatta; variant="card" → riquadro nel feed.
export default function SupportButton({ variant = "header" }) {
  if (variant === "card") {
    return (
      <section className="rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 p-4 text-center">
        <Heart className="mx-auto mb-1.5 text-lazio-blue dark:text-sky-400" />
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Aiuta Lazio24 a crescere
        </p>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Il progetto è gratuito e senza pubblicità invasiva. Se ti è utile,
          fai una piccola donazione: ci aiuti a coprire i costi e a migliorarlo.
        </p>
        <a
          href={SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-lazio-blue px-4 py-2 text-xs font-medium text-white transition active:scale-95"
        >
          <Heart />
          {SUPPORT_LABEL}
        </a>
      </section>
    );
  }

  return (
    <a
      href={SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-500/15 px-3 py-1 text-xs font-medium text-lazio-blue dark:text-sky-400 transition active:scale-95"
    >
      <Heart />
      Sostieni
    </a>
  );
}
