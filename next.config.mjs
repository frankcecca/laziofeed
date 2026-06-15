/** @type {import('next').NextConfig} */
const nextConfig = {
  // Le immagini vengono scaricate in public/images dallo script di raccolta,
  // quindi next/image le serve come file locali: nessun dominio remoto da
  // autorizzare. Se in futuro vuoi servirle direttamente dalle testate, aggiungi
  // qui images.remotePatterns con i domini consentiti.
};

export default nextConfig;
