import { Helmet } from "react-helmet-async";
import "./LegalPage.css";

export function PrivacyPolicy_de() {
  return (
    <>
      <Helmet>
        <title>Datenschutzerklärung – DINBoard</title>
        <meta
          name="description"
          content="Datenschutzerklärung für die DINBoard-App. Informationen zu lokal erfassten Daten, Vercel Analytics, geplantem Google AdSense und Kontaktformular."
        />
        <link rel="canonical" href="https://dinboard.pl/polityka-prywatnosci" />
        <meta property="og:title" content="Datenschutzerklärung – DINBoard" />
        <meta
          property="og:description"
          content="Wie DINBoard Ihre Daten schützt: lokale Projekt-Speicherung, DSGVO."
        />
        <meta property="og:url" content="https://dinboard.pl/polityka-prywatnosci" />
        <meta name="twitter:title" content="Datenschutzerklärung – DINBoard" />
        <meta
          name="twitter:description"
          content="Wie DINBoard Ihre Daten schützt: lokale Projekt-Speicherung, DSGVO."
        />
      </Helmet>

      <div className="legal-page">
        <article className="legal-article">
          <h1>Datenschutzerklärung</h1>
          <p className="legal-updated">Letzte Aktualisierung: 28. Juni 2026</p>

          <section>
            <h2>1. Verantwortlicher (Datenverarbeiter)</h2>
            <p>
              Der Verantwortliche für Ihre personenbezogenen Daten ist <strong>Artur Tomaszewski</strong>,
              wohnhaft in Chocianów, Polen (im Folgenden "Verantwortlicher" genannt).
            </p>
            <p>
              Kontakt für Datenschutzfragen:{" "}
              <a href="mailto:artur.t8203@gmail.com">artur.t8203@gmail.com</a>
            </p>
            <p>
              Der Verantwortliche betreibt die Anwendung als Privatperson, ohne
              eingetragenes Gewerbe.
            </p>
          </section>

          <section>
            <h2>2. Welche Daten wir erfassen</h2>

            <h3>2.1. Projektdaten (Lokal gespeichert)</h3>
            <p>
              Die DINBoard-Anwendung speichert Ihre Schaltplanprojekte ausschließlich
              auf Ihrem Gerät (im Speicher Ihres Browsers — IndexedDB / localStorage).
              Diese Daten <strong>werden an keinen Server gesendet</strong> und sind
              für den Verantwortlichen nicht sichtbar. Sie umfassen:
            </p>
            <ul>
              <li>geplante Stromkreise, Symbole, Schaltpläne,</li>
              <li>
                Projekt-Metadaten, einschließlich möglicher Daten zum Auftragnehmer / Investor
                (Name oder Firmenname, Adresse, Steuernummer, Telefon, E-Mail),
                die Sie selbst eingeben.
              </li>
            </ul>
            <p>
              Löschen von Projektdaten: Leeren Sie den Browser-Cache für die Domain
              dinboard.pl oder nutzen Sie die Funktion "Neues Projekt" in der App.
            </p>

            <h3>2.2. Analytik (Vercel Analytics)</h3>
            <p>
              Wir verwenden Vercel Analytics — ein Tool für anonyme
              Nutzungsstatistiken (aufgerufene Unterseiten, Sitzungsdauer, Gerätetyp, Fehler).
              Vercel Analytics <strong>verwendet keine Cookies</strong> und
              ermöglicht keine Identifizierung des Benutzers.
            </p>

            <h3>2.3. Werbung (Google AdSense) — geplant</h3>
            <p>
              Es ist geplant, Google AdSense-Werbung auf der Website anzuzeigen.
              Der Service wartet auf die Freigabe durch Google. Nach der Aktivierung
              kann Google Ireland Limited (Gordon House, Barrow Street, Dublin 4,
              Irland) als unabhängiger Datenverantwortlicher Cookies und Kennungen
              speichern, um Anzeigen zu personalisieren, die Anzahl der Impressionen
              zu begrenzen, die Wirksamkeit von Kampagnen zu messen und Missbrauch zu erkennen.
            </p>
            <p>
              Die Anzeigenpersonalisierung ist standardmäßig deaktiviert, bis Sie
              Ihre Zustimmung erteilen (Cookie-Banner). Sie können Ihre Zustimmung
              jederzeit widerrufen, indem Sie den Cache Ihres Browsers für die
              Domain dinboard.pl leeren.
            </p>
            <p>
              Die rechtliche Grundlage für die Verarbeitung durch Google ist Art. 6 Abs. 1
              lit. a DSGVO (Einwilligung). Weitere Informationen:{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
                policies.google.com/privacy
              </a>
              .
            </p>

            <h3>2.4. Kontaktformular (Web3Forms)</h3>
            <p>
              Wenn Sie einen Bericht über das Fenster "Fehler oder Idee melden" senden,
              geben Sie freiwillig Folgendes an: E-Mail-Adresse (optional) und den Inhalt
              der Nachricht. Die Daten werden an einen externen Auftragsverarbeiter gesendet — Web3Forms (
              <a href="https://web3forms.com" target="_blank" rel="noreferrer">
                web3forms.com
              </a>
              ), der sie an die E-Mail-Adresse des Verantwortlichen zustellt.
            </p>

            <h3>2.5. Google Fonts</h3>
            <p>
              Die Seite lädt Schriftarten von den Google-Servern (fonts.googleapis.com,
              fonts.gstatic.com). Google erhält Ihre IP-Adresse. Sie können diese
              Anfragen mit einer Browser-Erweiterung (z.B. uBlock Origin) blockieren —
              die Seite bleibt funktionsfähig, es wird eine Systemschriftart verwendet.
            </p>
          </section>

          <section>
            <h2>3. Rechtliche Grundlage der Verarbeitung</h2>
            <ul>
              <li>
                <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> — Einwilligung (AdSense-Werbung,
                optionale Analyse-Cookies).
              </li>
              <li>
                <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> — Berechtigtes
                Interesse des Verantwortlichen (Analytik, Sicherheit, Support-Tickets).
              </li>
              <li>
                <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> — Vertragserfüllung
                (Bereitstellung des App-Dienstes).
              </li>
            </ul>
          </section>

          <section>
            <h2>4. Empfänger der Daten</h2>
            <p>Ihre Daten können an folgende Stellen übermittelt werden:</p>
            <ul>
              <li>
                <strong>Google Ireland Limited</strong> — Google Fonts Schriftarten;
                nach Aktivierung von AdSense auch Werbung.
              </li>
              <li>
                <strong>Vercel Inc.</strong> — Frontend-Hosting und Analytik.
              </li>
              <li>
                <strong>Web3Forms</strong> — Handhabung von Support-Formularen.
              </li>
              <li>Staatliche Behörden — ausschließlich aufgrund gesetzlicher Vorschriften.</li>
            </ul>
            <p>
              Die Daten können aufgrund eines Angemessenheitsbeschlusses der Europäischen
              Kommission oder Standardvertragsklauseln außerhalb des Europäischen
              Wirtschaftsraums (USA) übermittelt werden.
            </p>
          </section>

          <section>
            <h2>5. Speicherdauer</h2>
            <ul>
              <li>
                Projektdaten (lokal) — bis Sie sie löschen oder den Browser-Speicher leeren.
              </li>
              <li>Formular-Einsendungen — bis zu 12 Monate nach Abschluss des Falls.</li>
              <li>Vercel-Analysedaten — bis zu 30 Tage (aggregiert).</li>
              <li>Cookie-Zustimmung — bis zum Widerruf (max. 13 Monate).</li>
            </ul>
          </section>

          <section>
            <h2>6. Ihre Rechte (DSGVO)</h2>
            <p>Sie haben das Recht auf:</p>
            <ul>
              <li>Auskunft über Ihre Daten (Art. 15 DSGVO),</li>
              <li>Berichtigung der Daten (Art. 16),</li>
              <li>Löschung der Daten (Art. 17),</li>
              <li>Einschränkung der Verarbeitung (Art. 18),</li>
              <li>Datenübertragbarkeit (Art. 20),</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21),</li>
              <li>
                Einreichen einer Beschwerde beim Vorsitzenden des Amtes für den
                Schutz personenbezogener Daten (UODO) in Polen (ul. Stawki 2, 00-193 Warschau).
              </li>
            </ul>
            <p>
              Die Ausübung der Rechte in Bezug auf Projektdaten (lokal) erfordert
              eine Aktion Ihrerseits — die App speichert sie nicht auf dem Server.
            </p>
          </section>

          <section>
            <h2>7. Cookies und lokale Daten</h2>
            <p>
              Die App verwendet die folgenden Kategorien von Cookies und
              lokalem Browser-Speicher:
            </p>
            <ul>
              <li>
                <strong>Erforderliche lokale Daten</strong> — Der Projektstatus und
                UI-Einstellungen werden im Speicher des Browsers gespeichert
                (localStorage / IndexedDB) und die Cookie-Zustimmung in localStorage.
                Ohne diese Daten funktioniert die App nicht korrekt. Dies sind keine
                Cookies, aber der Browser behandelt sie ähnlich.
              </li>
              <li>
                <strong>Analytik</strong> — Vercel Analytics (ohne Cookies).
              </li>
              <li>
                <strong>Werbung</strong> — Google AdSense (geplant; nach
                Aktivierung: Cookies, Gerätekennungen). Diese werden nur
                nach Erteilung der Einwilligung verwendet.
              </li>
            </ul>
            <p>
              Sie können Ihre Einwilligung jederzeit widerrufen, indem Sie den Cache
              Ihres Browsers für die Domain dinboard.pl leeren oder erneut auf den
              Cookie-Banner klicken (falls er nach einem erneuten Besuch der Website
              angezeigt wird).
            </p>
          </section>

          <section>
            <h2>8. Sicherheit</h2>
            <p>
              Die Kommunikation mit dem Server erfolgt ausschließlich über HTTPS / TLS 1.3.
              Die App speichert keine Projektdaten auf dem Server.
              Passwörter für externe Dienstkonten (Google, Vercel, Web3Forms)
              werden in Übereinstimmung mit deren Sicherheitsrichtlinien gespeichert.
            </p>
          </section>

          <section>
            <h2>9. Änderungen der Datenschutzerklärung</h2>
            <p>
              Der Verantwortliche behält sich das Recht vor, Änderungen an dieser
              Richtlinie vorzunehmen. Über wesentliche Änderungen werden die Nutzer
              durch eine Mitteilung in der App informiert. Die aktuelle Version ist
              immer verfügbar unter{" "}
              <code>https://dinboard.pl/polityka-prywatnosci</code>.
            </p>
          </section>

          <section>
            <h2>10. Anwendbares Recht</h2>
            <p>
              In Angelegenheiten, die nicht in dieser Richtlinie geregelt sind,
              gelten die Bestimmungen der DSGVO und des polnischen
              Datenschutzgesetzes vom 10. Mai 2018.
            </p>
          </section>
        </article>
      </div>
    </>
  );
}
