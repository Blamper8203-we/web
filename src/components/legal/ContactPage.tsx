import { Helmet } from "react-helmet-async";
import { useOutletContext } from "react-router-dom";
import { LandingHeader } from "../landing/LandingHeader";
import { LandingFooter } from "../landing/LandingFooter";
import { useLandingAssets } from "../landing/useLandingAssets";
import type { AppContextType } from "../../App";
import { contactPageJsonLd } from "../../seo/jsonLd";
import "./LegalPage.css";

export function ContactPage() {
  const { openFeedback } = useOutletContext<AppContextType>() ?? {};
  useLandingAssets();
  return (
    <>
      <Helmet>
        <title>Kontakt – DINBoard</title>
        <meta
          name="description"
          content="Skontaktuj się z autorem aplikacji DINBoard Web. Zgłoś błąd, zaproponuj funkcjonalność lub zapytaj o szczegóły techniczne."
        />
        <link rel="canonical" href="https://dinboard.pl/kontakt" />
        {/* WHY: ContactPage @type (not the shared SoftwareApplication) so
            Google can rank this page for "DINBoard kontakt" queries and
            doesn't see it as a duplicate of the home page entity. */}
        <script type="application/ld+json">
          {JSON.stringify(contactPageJsonLd())}
        </script>
      </Helmet>

      <LandingHeader />

      <div className="legal-page">
        <article className="legal-article">
          <h1>Kontakt</h1>
          
          <section>
            <p>
              Masz pytania, sugestie lub znalazłeś błąd w działaniu aplikacji DINBoard?
              Jako niezależny twórca bardzo cenię sobie każdą informację zwrotną od użytkowników.
            </p>
          </section>

          <section>
            <h2>Dane kontaktowe</h2>
            <p>
              Możesz skontaktować się ze mną bezpośrednio za pośrednictwem poczty e-mail:
            </p>
            <ul>
              <li>
                <strong>Email:</strong> <a href="mailto:artur.t8203@gmail.com">artur.t8203@gmail.com</a>
              </li>
            </ul>
          </section>

          <section>
            <h2>Zgłaszanie błędów (Feedback)</h2>
            <p>
              Jeśli korzystasz z aplikacji (w widoku edytora rozdzielnicy), najlepszym sposobem 
              na przesłanie uwagi jest kliknięcie przycisku <strong>"Zgłoś pomysł/błąd"</strong> 
              w prawym górnym rogu ekranu. Formularz ten pozwala na szybkie przesłanie zgłoszenia 
              bezpośrednio z aplikacji, co znacznie przyspiesza diagnostykę ewentualnych problemów.
            </p>
          </section>
          
          <section>
            <h2>Współpraca</h2>
            <p>
              Jesteś producentem aparatury i chciałbyś, aby Twoje produkty (np. specyficzne moduły 
              smart home lub przekaźniki) znalazły się w domyślnej bibliotece DINBoard?
              Napisz do mnie – jestem otwarty na współpracę w celu wzbogacenia bazy danych 
              komponentów dla elektryków.
            </p>
          </section>
        </article>
      </div>

      <LandingFooter onOpenFeedback={openFeedback} />
    </>
  );
}
