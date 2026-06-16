import LegalPage from "../../components/LegalPage";
import ManifestoContent from "../../components/ManifestoContent";

export const metadata = {
  title: "Cos’è Lazio24",
  description:
    "La filosofia di Lazio24: solo le ultime 24 ore, niente archivio, un hub di aggregazione (non una testata), per passione e senza scopo di lucro.",
  alternates: { canonical: "/cosa-e" },
};

export default function CosaE() {
  return (
    <LegalPage title="Cos’è Lazio24" updated="12 giugno 2026">
      <ManifestoContent />
    </LegalPage>
  );
}
