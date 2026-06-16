// Andamento del titolo S.S. Lazio in Borsa (Borsa Italiana, ticker SSL).
// Dati a FINE GIORNATA da Yahoo Finance (endpoint chart pubblico). Prova
// query1 e, in fallback, query2 (a volte uno dei due risponde 429). È
// difensivo: se entrambi falliscono ritorna null e il widget non viene
// mostrato (non deve mai far fallire la raccolta). Logga il motivo preciso.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const SPARK_DAYS = 30;
const HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];

// Data (YYYY-MM-DD) nel fuso italiano da un timestamp unix in secondi.
function romeDate(unixSec) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(unixSec * 1000));
}

async function fromYahoo(host) {
  const url = `https://${host}/v8/finance/chart/SSL.MI?range=2mo&interval=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  const r = j?.chart?.result?.[0];
  if (!r) throw new Error("nessun risultato");

  const meta = r.meta || {};
  const ts = r.timestamp || [];
  const closes = r.indicators?.quote?.[0]?.close || [];
  const pairs = ts
    .map((t, i) => ({ t, c: closes[i] }))
    .filter((p) => typeof p.c === "number");
  if (pairs.length < 2) throw new Error("storico insufficiente");

  const price =
    typeof meta.regularMarketPrice === "number"
      ? meta.regularMarketPrice
      : pairs[pairs.length - 1].c;
  const prevClose =
    typeof meta.chartPreviousClose === "number"
      ? meta.chartPreviousClose
      : typeof meta.previousClose === "number"
      ? meta.previousClose
      : pairs[pairs.length - 2].c;
  const change = price - prevClose;

  return {
    ticker: "SSL",
    currency: meta.currency || "EUR",
    price,
    prevClose,
    change,
    changePercent: prevClose ? (change / prevClose) * 100 : 0,
    asOf: romeDate(meta.regularMarketTime || pairs[pairs.length - 1].t),
    spark: pairs.map((p) => p.c).slice(-SPARK_DAYS),
  };
}

export async function getMarket() {
  for (const host of HOSTS) {
    try {
      const m = await fromYahoo(host);
      console.log(
        `  market: SSL ${m.price} ${m.currency} (${host.split(".")[0]}, chiusura ${m.asOf})`
      );
      return m;
    } catch (e) {
      console.log(`  market: ${host.split(".")[0]} ko (${e.message})`);
    }
  }
  return null;
}
