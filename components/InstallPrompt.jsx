"use client";

import { useEffect, useState } from "react";

const KEY = "lazio24:install-dismissed";

// Invito a installare la PWA, mostrato solo ai nuovi utenti (come l'IntroCard):
// dismissibile e ricordato in localStorage. Su Android/desktop usa il prompt
// nativo (beforeinstallprompt); su iOS Safari, dove non esiste, mostra le
// istruzioni manuali. Nascosto se l'app è già installata.
export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      return;
    }

    // Già installata? (avviata in modalità standalone)
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (standalone) return;

    const ua = window.navigator.userAgent || "";
    const isIosSafari =
      /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (isIosSafari) {
      setIos(true);
      setShow(true);
      return;
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    const onInstalled = () => dismiss();
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {}
    setDeferred(null);
    dismiss();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sky-200 dark:border-sky-500/30 bg-white/95 dark:bg-night-bg/95 px-4 py-3 shadow-[0_-2px_12px_rgba(10,77,162,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-[640px] items-center gap-3">
        <img
          src="/logo-mark.svg"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Aggiungi Lazio24 alla schermata Home
          </p>
          <p className="text-xs leading-snug text-slate-500 dark:text-slate-400">
            {ios ? (
              <>
                Tocca{" "}
                <span aria-hidden="true" className="font-semibold">
                  Condividi
                </span>{" "}
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="inline-block align-[-1px]"
                  aria-hidden="true"
                >
                  <path d="M12 16V4M8 8l4-4 4 4" />
                  <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
                </svg>{" "}
                e poi “Aggiungi alla schermata Home”.
              </>
            ) : (
              "Aprila come un’app, sempre a portata di mano."
            )}
          </p>
        </div>
        {!ios && (
          <button
            type="button"
            onClick={install}
            className="flex-shrink-0 rounded-full bg-lazio-blue px-4 py-1.5 text-xs font-medium text-white transition active:scale-95"
          >
            Installa
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Chiudi"
          className="flex-shrink-0 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
