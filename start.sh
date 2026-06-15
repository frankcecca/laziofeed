#!/usr/bin/env bash
# Lazio24: raccoglie le notizie, avvia il sito e apre il browser.
cd "$(dirname "$0")" || exit 1

echo "→ Raccolta notizie delle ultime 24 ore…"
npm run collect || echo "⚠️  Raccolta non riuscita del tutto: avvio comunque il sito."

echo "→ Avvio del sito su http://localhost:3000 …"
# Apre il browser appena il server risponde.
(
  until curl -s -o /dev/null http://localhost:3000; do sleep 1; done
  open http://localhost:3000 2>/dev/null \
    || xdg-open http://localhost:3000 2>/dev/null \
    || true
) &

npm run dev
