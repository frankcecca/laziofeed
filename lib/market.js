// Andamento del titolo S.S. Lazio in Borsa (Borsa Italiana, ticker SSL).
// Dati a FINE GIORNATA da Stooq (CSV, senza chiave API). È volutamente
// difensivo: in caso di errore o dati incompleti ritorna null e il widget
// semplicemente non viene mostrato (non deve mai far fallire la raccolta).

const STOOQ_URL = "https://stooq.com/q/d/l/?s=ssl.mi&i=d";
const SPARK_DAYS = 30; // punti della mini-curva

export async function getMarket() {
  try {
    const res = await fetch(STOOQ_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    if (!res.ok) return null;
    const csv = await res.text();

    const lines = csv.trim().split(/\r?\n/);
    // Attesa intestazione: Date,Open,High,Low,Close,Volume
    if (lines.length < 3 || !/^date/i.test(lines[0])) return null;

    const rows = lines
      .slice(1)
      .map((l) => l.split(","))
      .filter((c) => c.length >= 5 && c[0] && !Number.isNaN(parseFloat(c[4])))
      .map((c) => ({ date: c[0], close: parseFloat(c[4]) }))
      // ordina per data crescente (robusto rispetto all'ordine della fonte)
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    if (rows.length < 2) return null;

    const last = rows[rows.length - 1];
    const prev = rows[rows.length - 2];
    const price = last.close;
    const prevClose = prev.close;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;
    const spark = rows.slice(-SPARK_DAYS).map((r) => r.close);

    return {
      ticker: "SSL",
      currency: "EUR",
      price,
      prevClose,
      change,
      changePercent,
      asOf: last.date, // data dell'ultima chiusura disponibile (YYYY-MM-DD)
      spark,
    };
  } catch {
    return null;
  }
}
