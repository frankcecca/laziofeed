import Script from "next/script";

// Analytics anonimo e cookieless (Umami, self-hosted).
// Lo script viene caricato solo se entrambe le variabili d'ambiente sono
// impostate, così in sviluppo (o senza configurazione) non traccia nulla.
// Umami non usa cookie e non raccoglie dati personali: nessun banner richiesto.
export default function Analytics() {
  const src = process.env.NEXT_PUBLIC_UMAMI_SRC;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!src || !websiteId) return null;

  return (
    <Script
      src={src}
      data-website-id={websiteId}
      strategy="afterInteractive"
      defer
    />
  );
}
