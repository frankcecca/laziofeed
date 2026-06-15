export default function manifest() {
  return {
    name: "Lazio24 — la tua giornata biancoceleste",
    short_name: "Lazio24",
    description:
      "Le notizie sulla S.S. Lazio delle ultime 24 ore, da tutte le fonti.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eef4fb",
    theme_color: "#0a4da2",
    lang: "it",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
