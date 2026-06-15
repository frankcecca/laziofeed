import LegalPage from "../../components/LegalPage";

export const metadata = {
  title: "Privacy Policy — Lazio24",
};

export default function Privacy() {
  return (
    <LegalPage title="Informativa sulla privacy" updated="12 giugno 2026">
      <p>
        La presente informativa descrive come vengono trattati i dati personali
        degli utenti che consultano Lazio24 (di seguito “il Sito”), ai sensi
        del Regolamento UE 2016/679 (“GDPR”) e della normativa italiana
        applicabile.
      </p>

      <h2>Titolare del trattamento</h2>
      <p>
        Il titolare del trattamento è Francesco Ceccarelli. Per qualsiasi
        richiesta relativa ai tuoi dati puoi scrivere a{" "}
        <a href="mailto:francescoceccarelli@mac.com">
          francescoceccarelli@mac.com
        </a>
        .
      </p>

      <h2>Quali dati raccogliamo</h2>
      <p>
        Il Sito non richiede registrazione e non raccoglie volontariamente dati
        identificativi. Sono però trattati:
      </p>
      <ul>
        <li>
          <strong>Dati di navigazione</strong>: per il normale funzionamento, i
          sistemi del fornitore di hosting registrano automaticamente alcuni
          dati tecnici (indirizzo IP, tipo di browser, data e ora della
          richiesta, pagine visitate). Servono a garantire sicurezza e
          funzionamento del servizio.
        </li>
        <li>
          <strong>Statistiche anonime</strong>: per misurare quante persone
          visitano il Sito utilizziamo Umami, uno strumento privo di cookie
          ospitato sui nostri stessi server. Raccoglie solo dati aggregati e
          anonimi (pagine viste, sito di provenienza, Paese, tipo di
          dispositivo), senza cookie, senza identificatori persistenti e senza
          tracciare l’utente tra siti diversi. Non vengono conservati indirizzi
          IP in forma identificabile né creati profili individuali.
        </li>
        <li>
          <strong>Donazioni</strong>: se scegli di sostenere il progetto, vieni
          indirizzato a PayPal. Il pagamento e i relativi dati sono trattati
          direttamente da PayPal, che agisce come autonomo titolare. Il Sito non
          riceve né conserva i dati della tua carta o del tuo conto.
        </li>
      </ul>

      <h2>Finalità e base giuridica</h2>
      <p>
        I dati di navigazione sono trattati per l’erogazione e la sicurezza del
        servizio (legittimo interesse del titolare, art. 6.1.f GDPR, e
        adempimenti tecnici). Le statistiche aggregate e anonime sono trattate,
        sempre sulla base del legittimo interesse (art. 6.1.f GDPR), al solo
        fine di conoscere l’andamento delle visite e migliorare il servizio. Non
        vengono usati per profilazione né per attività di marketing.
      </p>

      <h2>Cookie e strumenti di tracciamento</h2>
      <p>
        Il Sito non utilizza cookie di profilazione. Per le statistiche di
        visita utilizziamo Umami, uno strumento <strong>privo di cookie</strong>{" "}
        e auto-ospitato, che raccoglie solo dati aggregati e anonimi: non
        installa cookie, non crea identificatori persistenti e non richiede
        quindi alcun banner di consenso. Le immagini e le icone delle testate
        (favicon) sono ospitate direttamente sul Sito: il tuo browser non
        contatta servizi di terze parti per caricarle. Per i dettagli vedi la{" "}
        <a href="/cookie">Cookie Policy</a>.
      </p>

      <h2>Destinatari dei dati</h2>
      <p>
        I dati possono essere trattati dal fornitore di hosting (in qualità di
        responsabile del trattamento) per la gestione tecnica del Sito, e da
        PayPal nel solo caso di donazione. Non comunichiamo i dati ad altri
        soggetti e non li vendiamo.
      </p>

      <h2>Trasferimenti extra-UE</h2>
      <p>
        Alcuni fornitori (ad esempio PayPal) potrebbero trattare dati al di
        fuori dell’Unione Europea, nel rispetto delle garanzie previste dal GDPR
        (clausole contrattuali standard o decisioni di adeguatezza).
      </p>

      <h2>Conservazione</h2>
      <p>
        I dati di navigazione sono conservati per il tempo strettamente
        necessario alle finalità tecniche e di sicurezza, salvo diversi obblighi
        di legge.
      </p>

      <h2>I tuoi diritti</h2>
      <p>
        Hai diritto di accedere ai tuoi dati e di chiederne la rettifica, la
        cancellazione, la limitazione o l’opposizione al trattamento, oltre alla
        portabilità ove applicabile. Puoi esercitare questi diritti scrivendo a{" "}
        <a href="mailto:francescoceccarelli@mac.com">
          francescoceccarelli@mac.com
        </a>
        . Hai inoltre il diritto di proporre reclamo all’Autorità Garante per la
        protezione dei dati personali (
        <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">
          garanteprivacy.it
        </a>
        ).
      </p>

      <h2>Modifiche</h2>
      <p>
        Questa informativa può essere aggiornata nel tempo. Le modifiche
        sostanziali saranno segnalate su questa pagina con la data di ultimo
        aggiornamento.
      </p>
    </LegalPage>
  );
}
