// Widget compatto con l'andamento del titolo S.S. Lazio in Borsa (ticker SSL).
// Dati a fine giornata; mostra sempre, in chiaro, la data della chiusura.

const MESI = [
  "gen", "feb", "mar", "apr", "mag", "giu",
  "lug", "ago", "set", "ott", "nov", "dic",
];

function formatAsOf(iso) {
  const [y, m, d] = (iso || "").split("-");
  if (!y || !m || !d) return "";
  return `${parseInt(d, 10)} ${MESI[parseInt(m, 10) - 1]} ${y}`;
}

const num3 = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function Sparkline({ values, up }) {
  if (!Array.isArray(values) || values.length < 2) return null;
  const w = 110;
  const h = 30;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = pad + (i * (w - 2 * pad)) / (values.length - 1);
      const y = pad + (h - 2 * pad) * (1 - (v - min) / range);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color = up ? "#16a34a" : "#dc2626";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="flex-shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function MarketWidget({ market }) {
  if (!market || typeof market.price !== "number") return null;

  const { price, change = 0, changePercent = 0, asOf } = market;
  const up = changePercent >= 0;
  const sign = up ? "+" : "−";
  const abs = Math.abs(change);
  const pct = Math.abs(changePercent).toFixed(2).replace(".", ",");
  const changeColor = up
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";

  return (
    <section
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-night-border dark:bg-night-card"
      aria-label="Andamento del titolo S.S. Lazio in Borsa"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Lazio in Borsa · SSL
        </p>
        <p className="mt-0.5 flex items-baseline gap-2">
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {num3.format(price)} €
          </span>
          <span className={"text-xs font-medium " + changeColor}>
            {sign}
            {num3.format(abs)} ({sign}
            {pct}%)
          </span>
        </p>
        {asOf && (
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
            Chiusura del {formatAsOf(asOf)} · dati a fine giornata, non è
            consulenza finanziaria
          </p>
        )}
      </div>
      <Sparkline values={market.spark} up={up} />
    </section>
  );
}
