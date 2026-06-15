// Configurazione del progetto.
// Imposta il tuo link donazioni/membership in .env (NEXT_PUBLIC_SUPPORT_URL),
// ad es. Buy Me a Coffee, Ko-fi, PayPal.me o Stripe Payment Link.
export const SUPPORT_URL =
  process.env.NEXT_PUBLIC_SUPPORT_URL || "https://www.paypal.me/frankcecca";

export const SUPPORT_LABEL = "Sostieni il progetto";

// URL pubblico del sito (per sitemap, Open Graph, dati strutturati).
// Aggiornalo con il dominio reale quando pubblichi.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://lazio24.news"
).replace(/\/$/, "");

export const SITE_NAME = "Lazio24";
