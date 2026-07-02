import { Helmet } from "react-helmet-async";
import "./LegalPage.css";

export function TermsOfService_de() {
  return (
    <>
      <Helmet>
        <title>Nutzungsbedingungen – DINBoard</title>
        <meta
          name="description"
          content="Nutzungsbedingungen für DINBoard Web. Regeln, technische Anforderungen, Haftung des Betreibers und Hinweise zur Schaltplanplanung."
        />
        <link rel="canonical" href="https://dinboard.pl/regulamin" />
        <meta property="og:title" content="Nutzungsbedingungen – DINBoard" />
        <meta
          property="og:description"
          content="Nutzungsbedingungen für die DINBoard Web-Anwendung – das Tool für Elektriker zur Planung von Schaltplänen."
        />
        <meta property="og:url" content="https://dinboard.pl/regulamin" />
        <meta name="twitter:title" content="Nutzungsbedingungen – DINBoard" />
        <meta
          name="twitter:description"
          content="Nutzungsbedingungen für die DINBoard Web-Anwendung – das Tool für Elektriker."
        />
      </Helmet>

      <div className="legal-page">
        <article className="legal-article">
          <h1>Nutzungsbedingungen für DINBoard Web</h1>
          <p className="legal-updated">Letzte Aktualisierung: 28. Juni 2026</p>

          <section>
            <h2>1. Allgemeine Bestimmungen</h2>
            <p>
              Diese Bedingungen legen die Regeln für die Nutzung der
              Webanwendung DINBoard Web fest, verfügbar unter{" "}
              <a href="https://dinboard.pl">dinboard.pl</a> (im Folgenden "Anwendung").
            </p>
            <p>
              Der Betreiber der Anwendung ist <strong>Artur Tomaszewski</strong>,
              wohnhaft in Chocianów, Polen, E-Mail:{" "}
              <a href="mailto:artur.t8203@gmail.com">artur.t8203@gmail.com</a>{" "}
              (im Folgenden "Betreiber"). Der Betreiber betreibt die Anwendung als
              Privatperson ohne eingetragenes Gewerbe.
            </p>
            <p>
              Die Nutzung der Anwendung ist kostenlos. Die Anwendung ist ein Tool
              zur Unterstützung der Planung von elektrischen Schaltplänen — sie ist
              keine zertifizierte Software im Sinne der Bauprodukteverordnung.
            </p>
          </section>

          <section>
            <h2>2. Definitionen</h2>
            <ul>
              <li>
                <strong>Anwendung</strong> — DINBoard Web in der PWA-Version
                (Webbrowser) und Desktop-Version (Tauri).
              </li>
              <li>
                <strong>Projekt</strong> — Eine Datei mit der Schaltanlage, Schaltkreisen,
                Plänen und Metadaten, die vom Nutzer erstellt wird.
              </li>
              <li>
                <strong>Nutzer</strong> — Eine natürliche oder juristische Person, die
                die Anwendung nutzt.
              </li>
              <li>
                <strong>PDF-Dokumentation</strong> — PDF-Dateien, die von der
                Anwendung für die Installationsabnahme generiert werden.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. Funktionsumfang</h2>
            <p>Die Anwendung ermöglicht:</p>
            <ul>
              <li>Gestaltung von Schaltanlagen auf DIN-Schienen,</li>
              <li>Erstellung von elektrischen Schaltplänen,</li>
              <li>Berechnung der Leistungsbilanz und der L1 / L2 / L3 Phasenverteilung,</li>
              <li>
                Validierung des Projekts gemäß PN-HD 60364 Regeln (ausgewählte Abschnitte),
              </li>
              <li>Erstellung von Bestandsdokumentation im PDF-Format.</li>
            </ul>
            <p>
              Die Liste der Funktionen kann ohne vorherige Ankündigung
              erweitert oder eingeschränkt werden.
            </p>
          </section>

          <section>
            <h2>4. Technische Anforderungen</h2>
            <p>Zur Nutzung der Anwendung benötigen Sie:</p>
            <ul>
              <li>
                ein Gerät mit einem Browser, der den ES2022-Standard unterstützt (Chrome
                90+, Firefox 90+, Safari 15+, Edge 90+),
              </li>
              <li>
                Internetzugang (beim ersten Start sowie für Werbung und Analytik),
              </li>
              <li>aktiviertes JavaScript und IndexedDB,</li>
              <li>
                für die Desktop-Version (Tauri): Windows 10+,
                macOS 11+ oder Linux mit WebKitGTK 4.1+.
              </li>
            </ul>
            <p>
              Die Anwendung ist für die Arbeit auf Desktop-Computern
              und Laptops konzipiert. Die Anzeige auf mobilen Geräten (Telefone,
              Tablets) ist möglich, die volle Funktionalität wird jedoch nicht
              garantiert.
            </p>
          </section>

          <section>
            <h2>5. Nutzungsregeln</h2>
            <p>Der Nutzer ist verpflichtet:</p>
            <ul>
              <li>
                die Anwendung entsprechend ihrem Zweck (Gestaltung von Schaltanlagen)
                zu nutzen,
              </li>
              <li>
                keine Handlungen vorzunehmen, die den Betrieb der Anwendung stören könnten
                (DoS-Angriffe, Code-Injection-Versuche, automatisiertes Scraping),
              </li>
              <li>
                keine Inhalte, die gegen das Gesetz oder Rechte Dritter verstoßen,
                in den Projekt-Metadatenfeldern zu teilen (Firmennamen, Steuernummern anderer Einheiten,
                usw.).
              </li>
            </ul>
          </section>

          <section>
            <h2>6. Rechte an geistigem Eigentum</h2>
            <p>
              Die Anwendung, ihr Quellcode, ihre Schnittstelle, Dokumentation, SVG-Modulbibliothek
              und Logos sind Eigentum des Betreibers und
              werden durch Urheberrechte und verwandte Schutzrechte geschützt.
              Es ist verboten, die Anwendung ohne schriftliche Zustimmung
              des Betreibers ganz oder teilweise zu kopieren, zu dekompilieren oder weiterzugeben.
            </p>
            <p>
              <strong>Vom Nutzer erstellte Projekte</strong> bleiben
              Eigentum des Nutzers. Der Betreiber hat keinen Zugriff auf die Projekte (sie
              werden lokal gespeichert) und erhebt keine Rechte an ihnen.
            </p>
          </section>

          <section>
            <h2>7. Haftung des Betreibers</h2>
            <p>
              <strong>
                Die Anwendung wird "wie besehen" (as-is) und "wie verfügbar" (as-available)
                zur Verfügung gestellt.
              </strong>{" "}
              Der Betreiber garantiert nicht, dass:
            </p>
            <ul>
              <li>die durch die Anwendung durchgeführten Berechnungen fehlerfrei sind,</li>
              <li>
                die Validierungsergebnisse alle Anforderungen von PN-HD 60364 abdecken,
              </li>
              <li>die Anwendung ununterbrochen und fehlerfrei funktioniert,</li>
              <li>
                die Anwendung die Zertifizierungsanforderungen für Software erfüllt,
                die in der professionellen Energietechnik eingesetzt wird.
              </li>
            </ul>
            <p>
              <strong>Der Nutzer trägt die alleinige Verantwortung für:</strong>
            </p>
            <ul>
              <li>
                die Übereinstimmung des Projekts mit den geltenden Vorschriften und Standards (insbesondere
                PN-HD 60364 und SEP-Vorschriften),
              </li>
              <li>
                die Überprüfung der Berechnungsergebnisse, bevor diese in
                einem ausführenden Projekt angewendet werden,
              </li>
              <li>
                die Unterzeichnung des Projekts durch eine Person mit den erforderlichen Qualifikationen (in
                Polen: SEP / Bauqualifikationen),
              </li>
              <li>die Durchführung der erforderlichen Installationsabnahmen.</li>
            </ul>
            <p>
              <strong>Sicherheitswarnung (für Personen ohne Qualifikationen):</strong>
              <br />
              Elektrischer Strom stellt eine tödliche Gefahr dar. Wenn Sie nicht
              über die entsprechenden elektrischen Qualifikationen verfügen, ist der
              in der Anwendung gestaltete Schaltplan nur eine grobe Skizze.
              Sie müssen sich zwingend mit einem qualifizierten Elektriker beraten,
              der die Richtigkeit des Schaltplans überprüft (einschließlich der Auswahl
              von Schutzvorrichtungen und Kabelquerschnitten), bevor Sie Materialien
              kaufen oder versuchen, die Schaltanlage physisch zu montieren.
            </p>
            <p>
              Der Betreiber haftet nicht für Sach-, Gesundheits- oder Lebensschäden,
              die sich aus der Verwendung der Anwendung zur Gestaltung elektrischer Installationen
              und zur selbständigen Durchführung der Montage ohne Überprüfung und Abnahme
              durch eine qualifizierte Person ergeben. Soweit gesetzlich zulässig,
              ist die Haftung des Betreibers auf den Betrag von 0 PLN beschränkt
              (die Anwendung ist kostenlos).
            </p>
          </section>

          <section>
            <h2>8. Keine technische Garantie</h2>
            <p>
              Der Betreiber bemüht sich, dass die Anwendung korrekt funktioniert,
              gewährt jedoch keine Garantie für Qualität, Eignung für einen bestimmten Zweck
              oder Zuverlässigkeit im Sinne der geltenden zivilrechtlichen Bestimmungen.
              Insbesondere garantiert der Betreiber nicht, dass:
            </p>
            <ul>
              <li>
                die erstellte PDF-Dokumentation die Anforderungen eines spezifischen
                Stromversorgers erfüllt,
              </li>
              <li>
                die Schaltpläne den internen Standards eines bestimmten
                Designunternehmens entsprechen,
              </li>
              <li>
                die Anwendung mit CAD-Software anderer Hersteller
                kompatibel ist.
              </li>
            </ul>
          </section>

          <section>
            <h2>9. Beschwerden (Reklamationen)</h2>
            <p>Beschwerden über den Betrieb der Anwendung können gemeldet werden:</p>
            <ul>
              <li>
                E-Mail:{" "}
                <a href="mailto:artur.t8203@gmail.com">artur.t8203@gmail.com</a>,
              </li>
              <li>über das Formular "Fehler oder Idee melden" in der Anwendung.</li>
            </ul>
            <p>
              Die Beschwerde sollte enthalten: eine Beschreibung des Problems, Schritte
              zur Reproduktion, Gerätetyp und Browser. Der Betreiber bearbeitet Beschwerden
              innerhalb von 14 Werktagen.
            </p>
          </section>

          <section>
            <h2>10. Änderungen der Bedingungen</h2>
            <p>
              Der Betreiber behält sich das Recht vor, diese Bedingungen zu ändern.
              Über wesentliche Änderungen informiert der Betreiber durch eine Nachricht,
              die beim nächsten Start der Anwendung angezeigt wird. Die weitere Nutzung
              der Anwendung nach dem Datum des Inkrafttretens der Änderungen bedeutet deren Akzeptanz.
            </p>
          </section>

          <section>
            <h2>11. Schlussbestimmungen</h2>
            <ul>
              <li>
                Der Betreiber führt kein eingetragenes Gewerbe. In Angelegenheiten, die
                nicht geregelt sind, gelten die Bestimmungen des polnischen Rechts,
                insbesondere das Bürgerliche Gesetzbuch.
              </li>
              <li>
                Streitigkeiten werden von dem für den Wohnsitz des Verbrauchers zuständigen
                Gericht (wenn der Nutzer Verbraucher ist) oder von dem für den Wohnsitz des
                Betreibers zuständigen Gericht (in anderen Fällen) geprüft.
              </li>
              <li>
                Der Verbraucher kann eine außergerichtliche Streitbeilegung nutzen,
                z. B. durch Kontaktaufnahme mit dem zuständigen Handelsinspektor der
                Woiwodschaft (WIIH) oder dem Ständigen Schiedsgericht für Verbraucher am WIIH.
                Weitere Informationen:{" "}
                <a
                  href="https://uokik.gov.pl/pozasadowe-rozwiazywanie-sporow-konsumenckich"
                  target="_blank"
                  rel="noreferrer"
                >
                  uokik.gov.pl
                </a>
                .
              </li>
              <li>Die Bedingungen treten am Tag der Veröffentlichung in Kraft.</li>
            </ul>
          </section>
        </article>
      </div>
    </>
  );
}
