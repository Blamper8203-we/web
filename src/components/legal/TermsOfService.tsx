import { Helmet } from "react-helmet-async";
import "./LegalPage.css";

export function TermsOfService() {
  return (
    <>
      <Helmet>
        <title>Regulamin – DINBoard</title>
        <meta
          name="description"
          content="Regulamin korzystania z DINBoard Web. Zasady, wymagania techniczne, odpowiedzialność Operatora i uwagi dotyczące projektowania rozdzielnic."
        />
        <link rel="canonical" href="https://dinboard.pl/regulamin" />
        <meta property="og:title" content="Regulamin – DINBoard" />
        <meta
          property="og:description"
          content="Regulamin korzystania z aplikacji DINBoard Web – narzędzia dla elektryków do projektowania rozdzielnic."
        />
        <meta property="og:url" content="https://dinboard.pl/regulamin" />
        <meta name="twitter:title" content="Regulamin – DINBoard" />
        <meta
          name="twitter:description"
          content="Regulamin korzystania z aplikacji DINBoard Web – narzędzia dla elektryków."
        />
      </Helmet>

      <div className="legal-page">
        <article className="legal-article">
          <h1>Regulamin korzystania z DINBoard Web</h1>
          <p className="legal-updated">Ostatnia aktualizacja: 28 czerwca 2026 r.</p>

          <section>
            <h2>1. Postanowienia ogólne</h2>
            <p>
              Niniejszy regulamin określa zasady korzystania z aplikacji
              internetowej DINBoard Web dostępnej pod adresem{" "}
              <a href="https://dinboard.pl">dinboard.pl</a> (dalej „Aplikacja").
            </p>
            <p>
              Operatorem Aplikacji jest <strong>Artur Tomaszewski</strong>,
              zamieszkały w Chocianowie, e-mail:{" "}
              <a href="mailto:artur.t8203@gmail.com">artur.t8203@gmail.com</a>{" "}
              (dalej „Operator"). Operator prowadzi Aplikację jako osoba fizyczna,
              bez zarejestrowanej działalności gospodarczej.
            </p>
            <p>
              Korzystanie z Aplikacji jest bezpłatne. Aplikacja jest narzędziem
              wspomagającym projektowanie rozdzielnic elektrycznych — nie jest
              oprogramowaniem certyfikowanym w rozumieniu przepisów o wyrobach
              budowlanych.
            </p>
          </section>

          <section>
            <h2>2. Definicje</h2>
            <ul>
              <li>
                <strong>Aplikacja</strong> — DINBoard Web w wersji PWA
                (przeglądarka internetowa) oraz desktop (Tauri).
              </li>
              <li>
                <strong>Projekt</strong> — plik z rozdzielnicą, obwodami,
                schematami i metadanymi, tworzony przez Użytkownika.
              </li>
              <li>
                <strong>Użytkownik</strong> — osoba fizyczna lub prawna korzystająca
                z Aplikacji.
              </li>
              <li>
                <strong>Dokumentacja PDF</strong> — pliki PDF generowane przez
                Aplikację na potrzeby odbioru instalacji.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. Zakres funkcjonalny</h2>
            <p>Aplikacja umożliwia:</p>
            <ul>
              <li>projektowanie rozdzielnic na szynie DIN,</li>
              <li>tworzenie schematów elektrycznych,</li>
              <li>wyliczanie bilansu mocy i rozkładu faz L1 / L2 / L3,</li>
              <li>
                walidację projektu wg reguł PN-HD 60364 (wybrane sekcje),
              </li>
              <li>generowanie dokumentacji powykonawczej w formacie PDF.</li>
            </ul>
            <p>
              Lista funkcji może być rozszerzana lub ograniczana bez uprzedniego
              powiadomienia.
            </p>
          </section>

          <section>
            <h2>4. Wymagania techniczne</h2>
            <p>Do korzystania z Aplikacji potrzebujesz:</p>
            <ul>
              <li>
                urządzenia z przeglądarką obsługującą standard ES2022 (Chrome
                90+, Firefox 90+, Safari 15+, Edge 90+),
              </li>
              <li>
                dostępu do Internetu (przy pierwszym uruchomieniu oraz dla
                reklam i analityki),
              </li>
              <li>włączonej obsługi JavaScript i IndexedDB,</li>
              <li>
                w przypadku wersji desktop (Tauri): systemu Windows 10+,
                macOS 11+ lub Linux z WebKitGTK 4.1+.
              </li>
            </ul>
            <p>
              Aplikacja jest zaprojektowana do pracy na komputerach stacjonarnych
              i laptopach. Wyświetlanie na urządzeniach mobilnych (telefony,
              tablety) jest możliwe, ale pełna funkcjonalność nie jest
              gwarantowana.
            </p>
          </section>

          <section>
            <h2>5. Zasady korzystania</h2>
            <p>Użytkownik zobowiązany jest do:</p>
            <ul>
              <li>
                korzystania z Aplikacji zgodnie z jej przeznaczeniem (projektowanie
                rozdzielnic),
              </li>
              <li>
                niepodejmowania działań mogących zakłócić działanie Aplikacji
                (ataki DoS, próby wstrzykiwania kodu, automatyczne scrapowanie),
              </li>
              <li>
                nieudostępniania treści naruszających prawo lub prawa osób trzecich
                w polach metadanych projektu (nazwy firm, NIP-y cudzych podmiotów
                itp.).
              </li>
            </ul>
          </section>

          <section>
            <h2>6. Prawa własności intelektualnej</h2>
            <p>
              Aplikacja, jej kod źródłowy, interfejs, dokumentacja, biblioteka
              modułów SVG oraz logotypy stanowią własność Operatora i są
              chronione przepisami ustawy o prawie autorskim i prawach pokrewnych.
              Zabrania się kopiowania, dekompilacji i redystrybucji Aplikacji w
              całości lub w części bez pisemnej zgody Operatora.
            </p>
            <p>
              <strong>Projekty tworzone przez Użytkownika</strong> pozostają
              własnością Użytkownika. Operator nie ma dostępu do projektów (są
              przechowywane lokalnie) i nie rości sobie do nich żadnych praw.
            </p>
          </section>

          <section>
            <h2>7. Odpowiedzialność Operatora</h2>
            <p>
              <strong>
                Aplikacja jest dostarczana „tak jak jest" (as-is) i „w miarę
                dostępności" (as-available).
              </strong>{" "}
              Operator nie gwarantuje, że:
            </p>
            <ul>
              <li>obliczenia wykonywane przez Aplikację są wolne od błędów,</li>
              <li>
                wyniki walidacji wyczerpują wszystkie wymagania PN-HD 60364,
              </li>
              <li>Aplikacja będzie działać nieprzerwanie i bezawaryjnie,</li>
              <li>
                Aplikacja spełnia wymagania certyfikacyjne dla oprogramowania
                stosowanego w energetyce zawodowej.
              </li>
            </ul>
            <p>
              <strong>Użytkownik ponosi wyłączną odpowiedzialność za:</strong>
            </p>
            <ul>
              <li>
                zgodność projektu z obowiązującymi przepisami i normami (w
                szczególności PN-HD 60364 oraz przepisami SEP),
              </li>
              <li>
                zweryfikowanie wyników obliczeń przed ich zastosowaniem w
                projekcie wykonawczym,
              </li>
              <li>
                podpisanie projektu przez osobę z wymaganymi uprawnieniami (w
                Polsce: uprawnienia SEP / budowlane),
              </li>
              <li>przeprowadzenie wymaganych odbiorów instalacji.</li>
            </ul>
            <p>
              <strong>Ostrzeżenie o bezpieczeństwie (dla osób bez uprawnień):</strong>
              <br />
              Prąd elektryczny stanowi śmiertelne zagrożenie. Jeśli nie posiadasz
              odpowiednich kwalifikacji elektrycznych, zaprojektowany w
              Aplikacji schemat obwodów jest jedynie szkicem poglądowym.
              Bezwzględnie musisz skonsultować się z kwalifikowanym elektrykiem,
              który zweryfikuje poprawność schematu (m.in. dobór zabezpieczeń
              oraz przekrojów przewodów) przed jakimikolwiek zakupami materiałów
              czy próbą fizycznego montażu rozdzielnicy.
            </p>
            <p>
              Operator nie ponosi odpowiedzialności za szkody na mieniu, zdrowiu lub życiu 
              wynikłe z zastosowania Aplikacji do projektowania instalacji elektrycznych
              i wykonywania montażu na własną rękę bez weryfikacji i odbioru przez uprawnioną osobę. 
              W maksymalnym zakresie dozwolonym przez prawo odpowiedzialność Operatora 
              jest ograniczona do kwoty 0 PLN (Aplikacja jest bezpłatna).
            </p>
          </section>

          <section>
            <h2>8. Brak gwarancji technicznej</h2>
            <p>
              Operator dokłada starań, aby Aplikacja działała poprawnie, ale nie
              udziela gwarancji jakości, przydatności do określonego celu ani
              niezawodności w rozumieniu art. 556 i nast. Kodeksu cywilnego. W
              szczególności Operator nie gwarantuje, że:
            </p>
            <ul>
              <li>
                wygenerowana dokumentacja PDF spełnia wymagania konkretnego
                zakładu energetycznego,
              </li>
              <li>
                schematy ideowe są zgodne z wewnętrznymi standardami danej firmy
                projektowej,
              </li>
              <li>
                Aplikacja jest kompatybilna z oprogramowaniem CAD innych
                producentów.
              </li>
            </ul>
          </section>

          <section>
            <h2>9. Reklamacje</h2>
            <p>Reklamacje dotyczące działania Aplikacji można zgłaszać:</p>
            <ul>
              <li>
                e-mail:{" "}
                <a href="mailto:artur.t8203@gmail.com">artur.t8203@gmail.com</a>,
              </li>
              <li>przez formularz „Zgłoś błąd lub pomysł" w aplikacji.</li>
            </ul>
            <p>
              Reklamacja powinna zawierać: opis problemu, kroki reprodukcji, typ
              urządzenia i przeglądarki. Operator rozpatruje reklamacje w
              terminie 14 dni roboczych.
            </p>
          </section>

          <section>
            <h2>10. Zmiany regulaminu</h2>
            <p>
              Operator zastrzega sobie prawo do zmiany niniejszego regulaminu. O
              istotnych zmianach Operator poinformuje przez komunikat wyświetlany
              przy następnym uruchomieniu Aplikacji. Dalsze korzystanie z
              Aplikacji po dacie wejścia zmian w życie oznacza ich akceptację.
            </p>
          </section>

          <section>
            <h2>11. Postanowienia końcowe</h2>
            <ul>
              <li>
                Operator nie prowadzi zarejestrowanej działalności gospodarczej. W
                sprawach nieuregulowanych stosuje się przepisy prawa polskiego, w
                szczególności Kodeksu cywilnego.
              </li>
              <li>
                Spory rozpatrywane są przez sąd właściwy dla miejsca zamieszkania
                konsumenta (jeśli Użytkownik jest konsumentem) lub przez sąd
                właściwy dla miejsca zamieszkania Operatora (w pozostałych
                przypadkach).
              </li>
              <li>
                Konsument może skorzystać z pozasądowego rozwiązywania
                sporów, np. zwracając się do właściwego Wojewódzkiego
                Inspektora Inspekcji Handlowej lub Stałego Polubownego
                Sądu Konsumenckiego przy WIIH. Więcej informacji:{" "}
                <a
                  href="https://uokik.gov.pl/pozasadowe-rozwiazywanie-sporow-konsumenckich"
                  target="_blank"
                  rel="noreferrer"
                >
                  uokik.gov.pl
                </a>
                .
              </li>
              <li>Regulamin wchodzi w życie z dniem publikacji.</li>
            </ul>
          </section>
        </article>
      </div>
    </>
  );
}