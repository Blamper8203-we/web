import { Helmet } from "react-helmet-async";
import { useOutletContext } from "react-router-dom";
import { LandingHeader } from "../landing/LandingHeader";
import { LandingFooter } from "../landing/LandingFooter";
import { useLandingAssets } from "../landing/useLandingAssets";
import type { AppContextType } from "../../App";
import { webPageJsonLd } from "../../seo/jsonLd";
import "./LegalPage.css";

export function PrivacyPolicy_pl() {
  const { openFeedback } = useOutletContext<AppContextType>() ?? {};
  useLandingAssets();
  return (
    <>
      <Helmet>
        <title>Polityka prywatności – DINBoard</title>
        <meta
          name="description"
          content="Polityka prywatności aplikacji DINBoard. Informacje o danych zbieranych lokalnie, Vercel Analytics, planowanym Google AdSense i formularzu kontaktowym."
        />
        <link rel="canonical" href="https://dinboard.pl/polityka-prywatnosci" />
        <meta property="og:title" content="Polityka prywatności – DINBoard" />
        <meta
          property="og:description"
          content="Jak DINBoard chroni Twoje dane: lokalne przechowywanie projektów, RODO."
        />
        <meta property="og:url" content="https://dinboard.pl/polityka-prywatnosci" />
        <meta name="twitter:title" content="Polityka prywatności – DINBoard" />
        <meta
          name="twitter:description"
          content="Jak DINBoard chroni Twoje dane: lokalne przechowywanie projektów, RODO."
        />
        {/* WHY: plain WebPage (not SoftwareApplication) so the legal page
            doesn't get folded into the home-page entity. The URL is the
            differentiator, not the @type. */}
        <script type="application/ld+json">
          {JSON.stringify(
            webPageJsonLd({
              title: "Polityka prywatności – DINBoard",
              description:
                "Polityka prywatności aplikacji DINBoard. Informacje o danych zbieranych lokalnie, Vercel Analytics, planowanym Google AdSense i formularzu kontaktowym.",
              urlPath: "/polityka-prywatnosci",
            }),
          )}
        </script>
      </Helmet>

      <LandingHeader />

      <div className="legal-page">
        <article className="legal-article">
          <h1>Polityka prywatności</h1>
          <p className="legal-updated">Ostatnia aktualizacja: 28 czerwca 2026 r.</p>

          <section>
            <h2>1. Administrator danych</h2>
            <p>
              Administratorem Twoich danych osobowych jest <strong>Artur Tomaszewski</strong>,
              zamieszkały w Chocianowie (dalej „Administrator").
            </p>
            <p>
              Kontakt w sprawie ochrony danych:{" "}
              <a href="mailto:artur.t8203@gmail.com">artur.t8203@gmail.com</a>
            </p>
            <p>
              Administrator prowadzi Aplikację jako osoba fizyczna, bez zarejestrowanej
              działalności gospodarczej.
            </p>
          </section>

          <section>
            <h2>2. Jakie dane zbieramy</h2>

            <h3>2.1. Dane projektowe (przechowywane lokalnie)</h3>
            <p>
              Aplikacja DINBoard przechowuje Twoje projekty rozdzielnic wyłącznie na
              Twoim urządzeniu (w pamięci przeglądarki — IndexedDB / localStorage).
              Dane te <strong>nie są przesyłane na żaden serwer</strong> i nie są
              widoczne dla Administratora. Obejmują one:
            </p>
            <ul>
              <li>zaprojektowane obwody, symbole, schematy,</li>
              <li>
                metadane projektu, w tym ewentualne dane wykonawcy / inwestora
                (imię i nazwisko lub nazwa firmy, adres, NIP, telefon, e-mail),
                które sam wpisujesz.
              </li>
            </ul>
            <p>
              Usunięcie danych projektowych: wyczyść pamięć przeglądarki dla domeny
              dinboard.pl lub użyj funkcji „Nowy projekt" w aplikacji.
            </p>

            <h3>2.2. Analityka (Vercel Analytics)</h3>
            <p>
              Korzystamy z Vercel Analytics — narzędzia do anonimowych statystyk
              użytkowania (oglądane podstrony, czas sesji, typ urządzenia, błędy).
              Vercel Analytics <strong>nie używa plików cookies</strong> i nie
              pozwala na identyfikację użytkownika.
            </p>

            <h3>2.3. Reklamy (Google AdSense) — planowane</h3>
            <p>
              Na stronie planowane jest wyświetlanie reklam Google AdSense.
              Usługa oczekuje na zatwierdzenie przez Google. Po aktywacji
              Google Ireland Limited (Gordon House, Barrow Street, Dublin 4,
              Irlandia) jako niezależny administrator danych będzie mógł
              zapisywać pliki cookies i identyfikatory w celu personalizacji
              reklam, ograniczania liczby wyświetleń, pomiaru skuteczności
              kampanii oraz wykrywania nadużyć.
            </p>
            <p>
              Personalizacja reklam będzie domyślnie wyłączona do momentu
              wyrażenia przez Ciebie zgody (baner cookies). Będziesz mógł
              wycofać zgodę w dowolnym momencie, czyszcząc pamięć
              przeglądarki dla domeny dinboard.pl.
            </p>
            <p>
              Podstawą prawną przetwarzania przez Google będzie art. 6 ust. 1
              lit. a) RODO (zgoda). Więcej informacji:{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
                policies.google.com/privacy
              </a>
              .
            </p>

            <h3>2.4. Formularz kontaktowy (Web3Forms)</h3>
            <p>
              Gdy wysyłasz zgłoszenie przez okno „Zgłoś błąd lub pomysł", podajesz
              dobrowolnie: adres e-mail (opcjonalnie) oraz treść wiadomości. Dane
              przesyłane są do zewnętrznego procesora — Web3Forms (
              <a href="https://web3forms.com" target="_blank" rel="noreferrer">
                web3forms.com
              </a>
              ), który dostarcza je Administratorowi na adres e-mail.
            </p>

            <h3>2.5. Czcionki Google</h3>
            <p>
              Strona ładuje czcionki z serwerów Google (fonts.googleapis.com,
              fonts.gstatic.com). Google otrzymuje Twój adres IP. Możesz zablokować
              te żądania rozszerzeniem przeglądarki (np. uBlock Origin) — strona
              pozostanie funkcjonalna, użyta zostanie czcionka systemowa.
            </p>
          </section>

          <section>
            <h2>3. Podstawa prawna przetwarzania</h2>
            <ul>
              <li>
                <strong>Art. 6 ust. 1 lit. a) RODO</strong> — zgoda (reklamy
                AdSense, opcjonalne cookies analityczne).
              </li>
              <li>
                <strong>Art. 6 ust. 1 lit. f) RODO</strong> — prawnie
                uzasadniony interes Administratora (analityka, bezpieczeństwo,
                obsługa zgłoszeń).
              </li>
              <li>
                <strong>Art. 6 ust. 1 lit. b) RODO</strong> — realizacja umowy
                (świadczenie usługi aplikacji).
              </li>
            </ul>
          </section>

          <section>
            <h2>4. Odbiorcy danych</h2>
            <p>Twoje dane mogą być przekazywane następującym podmiotom:</p>
            <ul>
              <li>
                <strong>Google Ireland Limited</strong> — czcionki Google Fonts;
                po aktywacji AdSense także reklamy.
              </li>
              <li>
                <strong>Vercel Inc.</strong> — hosting frontendu i analityka.
              </li>
              <li>
                <strong>Web3Forms</strong> — obsługa formularza zgłoszeniowego.
              </li>
              <li>Organy państwowe — wyłącznie na podstawie przepisów prawa.</li>
            </ul>
            <p>
              Dane mogą być przekazywane poza Europejski Obszar Gospodarczy (USA)
              na podstawie decyzji Komisji Europejskiej o adekwatności lub
              standardowych klauzul umownych.
            </p>
          </section>

          <section>
            <h2>5. Okres przechowywania</h2>
            <ul>
              <li>
                Dane projektowe (lokalne) — do momentu usunięcia przez Ciebie lub
                wyczyszczenia pamięci przeglądarki.
              </li>
              <li>Zgłoszenia przez formularz — do 12 miesięcy od zamknięcia sprawy.</li>
              <li>Dane analityczne Vercel — do 30 dni (agregowane).</li>
              <li>Zgoda na cookies — do momentu wycofania (maks. 13 miesięcy).</li>
            </ul>
          </section>

          <section>
            <h2>6. Twoje prawa (RODO)</h2>
            <p>Masz prawo do:</p>
            <ul>
              <li>dostępu do swoich danych (art. 15 RODO),</li>
              <li>sprostowania danych (art. 16),</li>
              <li>usunięcia danych (art. 17),</li>
              <li>ograniczenia przetwarzania (art. 18),</li>
              <li>przenoszenia danych (art. 20),</li>
              <li>sprzeciwu wobec przetwarzania (art. 21),</li>
              <li>
                wniesienia skargi do Prezesa UODO (ul. Stawki 2, 00-193 Warszawa).
              </li>
            </ul>
            <p>
              Realizacja praw dotyczących danych projektowych (lokalnych) wymaga
              działania po Twojej stronie — aplikacja ich nie przechowuje na
              serwerze.
            </p>
          </section>

          <section>
            <h2>7. Pliki cookies i dane lokalne</h2>
            <p>
              Aplikacja używa następujących kategorii plików cookies oraz
              lokalnego magazynu przeglądarki:
            </p>
            <ul>
              <li>
                <strong>Niezbędne dane lokalne</strong> — stan projektu i
                preferencje interfejsu przechowywane są w pamięci przeglądarki
                (localStorage / IndexedDB), a zgoda na cookies — w localStorage.
                Bez tych danych aplikacja nie działa poprawnie. Nie są to pliki
                cookies, ale przeglądarka traktuje je podobnie.
              </li>
              <li>
                <strong>Analityczne</strong> — Vercel Analytics (bez cookies).
              </li>
              <li>
                <strong>Reklamowe</strong> — Google AdSense (planowane; po
                aktywacji: cookies, identyfikatory urządzenia). Będą
                wykorzystywane wyłącznie po wyrażeniu zgody.
              </li>
            </ul>
            <p>
              Zgodę możesz wycofać w dowolnym momencie, czyszcząc pamięć
              przeglądarki dla domeny dinboard.pl lub klikając baner cookies
              ponownie (jeśli wyświetli się po ponownym odwiedzeniu strony).
            </p>
          </section>

          <section>
            <h2>8. Bezpieczeństwo</h2>
            <p>
              Komunikacja z serwerem odbywa się wyłącznie przez HTTPS / TLS 1.3.
              Aplikacja nie przechowuje na serwerze żadnych danych projektowych.
              Hasła do kont usług zewnętrznych (Google, Vercel, Web3Forms)
              przechowywane są zgodnie z ich politykami bezpieczeństwa.
            </p>
          </section>

          <section>
            <h2>9. Zmiany polityki prywatności</h2>
            <p>
              Administrator zastrzega sobie prawo do wprowadzania zmian w niniejszej
              polityce. O istotnych zmianach użytkownicy zostaną poinformowani
              przez komunikat w aplikacji. Aktualna wersja jest zawsze dostępna
              pod adresem{" "}
              <code>https://dinboard.pl/polityka-prywatnosci</code>.
            </p>
          </section>

          <section>
            <h2>10. Prawo właściwe</h2>
            <p>
              W sprawach nieuregulowanych niniejszą polityką stosuje się przepisy
              RODO oraz ustawy z dnia 10 maja 2018 r. o ochronie danych
              osobowych.
            </p>
          </section>
        </article>
      </div>

      <LandingFooter onOpenFeedback={openFeedback} />
    </>
  );
}