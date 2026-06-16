"use client";

import { useEffect, useState } from "react";

// Converte la chiave VAPID (base64url) nel formato richiesto da PushManager.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const BellIcon = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

// Toggle per attivare/disattivare le notifiche push della "notizia del momento".
// Si mostra solo se il browser le supporta. Su iPhone serve la PWA installata.
export default function NotificationToggle() {
  // 'loading' | 'unsupported' | 'off' | 'on' | 'denied' | 'working'
  const [state, setState] = useState("loading");

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!supported) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, [supported]);

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const res = await fetch("/api/push/key");
      if (!res.ok) throw new Error("chiave non disponibile");
      const { key } = await res.json();

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const ok = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!ok.ok) throw new Error("salvataggio iscrizione fallito");
      setState("on");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  // Attive: riga discreta con possibilità di disattivare.
  if (state === "on") {
    return (
      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <BellIcon width="13" height="13" />
        Notifiche attive ·{" "}
        <button
          type="button"
          onClick={disable}
          className="font-medium underline transition hover:text-lazio-blue dark:hover:text-sky-400"
        >
          Disattiva
        </button>
      </p>
    );
  }

  // Bloccate dal browser: spiega come riattivarle.
  if (state === "denied") {
    return (
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-center text-xs leading-relaxed text-slate-600 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-slate-300">
        Le notifiche sono bloccate per questo sito. Per riceverle, abilitale dalle
        impostazioni del browser per lazio24.news.
      </div>
    );
  }

  // Off: invito ad attivare.
  return (
    <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-500/30 dark:bg-sky-500/10">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-lazio-blue text-white">
        <BellIcon />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Ricevi la notizia del momento
        </p>
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Una notifica quando esce la notizia più importante. Niente spam.
        </p>
      </div>
      <button
        type="button"
        onClick={enable}
        disabled={state === "working"}
        className="flex-shrink-0 rounded-full bg-lazio-blue px-4 py-1.5 text-xs font-medium text-white transition active:scale-95 disabled:opacity-60"
      >
        {state === "working" ? "Attivo…" : "Attiva"}
      </button>
    </div>
  );
}
