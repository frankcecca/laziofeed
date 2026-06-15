import LegalPage from "../../components/LegalPage";

export const metadata = {
  title: "Cookie Policy — Lazio24",
};

export default function Cookie() {
  return (
    <LegalPage title="Cookie Policy" updated="12 giugno 2026">
      <p>
        I cookie sono piccoli file di testo che i siti salvano sul dispositivo
        dell’utente. Questa pagina spiega come Lazio24 li utilizza.
      </p>

      <h2>Quali cookie usa il Sito</h2>
      <p>
        Il Sito <strong>non utilizza cookie di profilazione</strong> e non
        installa cookie di terze parti per il tracciamento pubblicitario.
        Possono essere presenti soltanto eventuali cookie tecnici necessari al
        funzionamento delle pagine, che non richiedono consenso ai sensi delle
        Linee guida del Garante sui cookie.
      </p>

      <h2>Statistiche anonime senza cookie</h2>
      <p>
        Per capire quante persone visitano il Sito utilizziamo{" "}
        <strong>Umami</strong>, uno strumento di statistica{" "}
        <strong>privo di cookie</strong> ospitato sui nostri stessi server.
        Umami non salva cookie sul tuo dispositivo, non crea un identificatore
        persistente e non traccia gli utenti tra siti diversi: raccoglie solo
        dati aggregati e anonimi (ad esempio pagine viste, sito di provenienza,
        Paese e tipo di dispositivo). Poiché non vengono installati cookie né
        trattati dati personali identificativi, per questa funzione non è
        richiesto alcun consenso né banner. Maggiori dettagli nella{" "}
        <a href="/privacy">Informativa sulla privacy</a>.
      </p>

      <h2>Risorse di terze parti</h2>
      <p>
        Le immagini e le icone delle testate vengono scaricate e ospitate
        direttamente sul Sito: il tuo browser non effettua richieste a servizi
        esterni per visualizzarle. Se scegli di effettuare una donazione, il
        link ti porta su PayPal, che applica la propria informativa cookie.
      </p>

      <h2>Come gestire i cookie</h2>
      <p>
        Puoi in ogni momento bloccare o eliminare i cookie tramite le
        impostazioni del tuo browser. La disattivazione dei cookie tecnici
        potrebbe compromettere alcune funzionalità del Sito.
      </p>

      <h2>Aggiornamenti</h2>
      <p>
        Qualora in futuro venissero introdotti cookie di profilazione o altri
        strumenti che lo richiedano, questa pagina sarà aggiornata e verrà
        mostrato un banner per la raccolta del consenso.
      </p>
    </LegalPage>
  );
}
