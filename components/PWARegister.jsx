"use client";

import { useEffect } from "react";

// Registra il service worker (abilita installabilità e offline di base).
export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
