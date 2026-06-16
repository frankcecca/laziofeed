import LegalPage from "../../components/LegalPage";

export const metadata = {
  title: "Note legali — Lazio24",
  description:
    "Natura del servizio, diritto d'autore e contatti: Lazio24 è un aggregatore indipendente, non una testata, e rimanda sempre alla fonte originale.",
  alternates: { canonical: "/note-legali" },
};

export default function NoteLegali() {
  return (
    <LegalPage title="Note legali" updated="12 giugno 2026">
      <h2>Natura del servizio</h2>
      <p>
        Lazio24 è un aggregatore indipendente di notizie già pubblicate da
        altre testate. Per ogni notizia il Sito mostra il titolo, una sintesi
        molto breve generata automaticamente con parole proprie (non una
        riproduzione del testo della fonte) e il rimando all’articolo originale
        tramite link. Gli articoli completi restano sui siti dei rispettivi
        editori e non vengono ripubblicati: il Sito si limita a titoli, estratti
        molto brevi e collegamenti ipertestuali.
      </p>

      <h2>Proprietà dei contenuti</h2>
      <p>
        I diritti sui contenuti, sui titoli e sulle immagini appartengono ai
        rispettivi editori e titolari. I marchi, i loghi e le denominazioni
        citati sono di proprietà dei rispettivi titolari e sono utilizzati a
        fini esclusivamente informativi e identificativi.
      </p>

      <h2>Nessuna affiliazione</h2>
      <p>
        Il Sito è un progetto amatoriale e indipendente: non è ufficiale e non è
        affiliato, sponsorizzato o approvato dalla S.S. Lazio né da alcuna delle
        testate citate.
      </p>

      <h2>Limitazione di responsabilità</h2>
      <p>
        Il Sito non garantisce l’esattezza, la completezza o l’attualità delle
        notizie aggregate, di cui sono responsabili le fonti originali, e non
        risponde dei contenuti dei siti esterni collegati.
      </p>

      <h2>Segnalazioni e rimozioni</h2>
      <p>
        Se sei titolare di diritti e ritieni che un contenuto debba essere
        modificato o rimosso, scrivi a{" "}
        <a href="mailto:legal@lazio24.news">legal@lazio24.news</a>
        : provvederemo con tempestività.
      </p>
      <p>
        Gli editori di pubblicazioni giornalistiche possono inoltre richiedere
        in qualsiasi momento, allo stesso indirizzo, l’esclusione delle proprie
        testate dall’aggregazione (opt-out): la fonte verrà rimossa senza
        indugio.
      </p>
    </LegalPage>
  );
}
