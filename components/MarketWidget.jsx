"use client";

import { useEffect, useRef, useState } from "react";

// Widget "andamento del titolo S.S. Lazio in Borsa" (ticker MIL:SSL) via embed
// ufficiale di TradingView: dati sempre correnti e affidabili, mini-grafico
// dell'andamento + prezzo e variazione. Segue il tema chiaro/scuro del sistema.
export default function MarketWidget() {
  const ref = useRef(null);
  const [theme, setTheme] = useState(null); // null finché non leggiamo il sistema

  // Tema iniziale + aggiornamento se l'utente cambia chiaro/scuro.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setTheme(mq.matches ? "dark" : "light");
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // (Ri)monta lo script di TradingView quando il tema è noto/cambia.
  useEffect(() => {
    if (!theme || !ref.current) return;
    const host = ref.current;
    host.innerHTML = "";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    host.appendChild(widget);

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: "MIL:SSL",
      width: "100%",
      height: 200,
      locale: "it",
      dateRange: "3M",
      colorTheme: theme,
      isTransparent: true,
      autosize: false,
      chartOnly: false,
    });
    host.appendChild(script);
  }, [theme]);

  return (
    <section
      className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 dark:border-night-border dark:bg-night-card"
      aria-label="Andamento del titolo S.S. Lazio in Borsa (MIL:SSL)"
    >
      <div ref={ref} className="tradingview-widget-container" />
    </section>
  );
}
