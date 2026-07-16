import { Helmet } from "react-helmet-async";
import { useOutletContext } from "react-router-dom";
import { LandingHeader } from "../landing/LandingHeader";
import { LandingFooter } from "../landing/LandingFooter";
import { useLandingAssets } from "../landing/useLandingAssets";
import type { AppContextType } from "../../App";
import { aboutPageJsonLd } from "../../seo/jsonLd";
import "./LegalPage.css";

export function AboutUsPage() {
  const { openFeedback } = useOutletContext<AppContextType>() ?? {};
  useLandingAssets();
  return (
    <>
      <Helmet>
        <title>O nas – Historia projektu DINBoard</title>
        <meta
          name="description"
          content="Dowiedz się więcej o historii powstania aplikacji DINBoard Web oraz o autorze – Arturze Tomaszewskim."
        />
        <link rel="canonical" href="https://dinboard.pl/o-nas" />
        {/* WHY: AboutPage @type — separate entity from the home page so
            Google doesn't dedupe the two on the schema-entity graph. */}
        <script type="application/ld+json">
          {JSON.stringify(aboutPageJsonLd())}
        </script>
      </Helmet>

      <LandingHeader />

      <div className="legal-page">
        <article className="legal-article">
          <h1>O projekcie DINBoard</h1>
          
          <section>
            <h2>Skąd wziął się ten pomysł?</h2>
            <p>
              Pomysł na DINBoard zrodził się z prostej, ale bardzo realnej potrzeby. 
              Zależało mi na stworzeniu narzędzia, które w łatwy i intuicyjny sposób pomoże 
              każdemu zaprojektować własną rozdzielnicę elektryczną.
            </p>
            <p>
              Aplikacja powstała po to, żeby pomóc innym w przygotowaniu czytelnej listy obwodów, 
              automatycznym wygenerowaniu schematu jednokreskowego oraz stworzeniu przejrzystej dokumentacji. 
              Główny cel? Aby w przyszłości, w razie ewentualnej awarii, wzywany elektryk dokładnie 
              wiedział z czym ma do czynienia. Dobrze opisana tablica pozwala z łatwością i szybko 
              zlokalizować usterkę i rozwiązać problem, bez konieczności zgadywania "od czego jest ten bezpiecznik".
            </p>
          </section>

          <section>
            <h2>Kim jestem?</h2>
            <p>
              Nazywam się <strong>Artur Tomaszewski</strong>. Szczerze mówiąc, formalnie nie posiadam 
              uprawnień elektrycznych, ale elektryka od zawsze była moją pasją, w której zgromadziłem 
              sporą wiedzę teoretyczną i praktyczną.
            </p>
            <p>
              Jestem samoukiem – znam języki HTML i CSS w stopniu średnim. Absolutnie nie uważam się 
              za profesjonalnego programistę i mam ogromny szacunek dla ludzi z branży IT, bo to co 
              robią, to kawał naprawdę świetnej i trudnej roboty! Cała ta strona oraz skomplikowana 
              aplikacja DINBoard mogła powstać w dużej mierze dzięki wsparciu zaawansowanej Sztucznej 
              Inteligencji (AI), która pomogła mi napisać brakujący kod i przekuć moją wizję w rzeczywistość.
            </p>
          </section>

          <section>
            <h2>Misja DINBoard</h2>
            <p>
              Stworzyłem ten projekt, aby dać społeczności darmowe, niezależne od producentów aparatury 
              narzędzie. Chcę, aby DINBoard służył każdemu – od majsterkowicza porządkującego instalację 
              we własnym garażu, po prawdziwych elektryków, którym dobre narzędzie ułatwi generowanie 
              dokumentacji odbiorczej.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#ef4444' }}>Ważna uwaga bezpieczeństwa (dla amatorów)</h2>
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', padding: '16px', borderRadius: '4px', marginTop: '16px' }}>
              <p style={{ margin: 0, fontWeight: 500 }}>
                <strong>Ostrzeżenie:</strong> Prąd elektryczny nie wybacza błędów i stanowi śmiertelne zagrożenie. 
                Aplikacja powstała, aby ułatwić planowanie i rysowanie schematów, jednak 
                <strong> jeśli nie masz pojęcia o elektryce i brakuje Ci doświadczenia, zachowaj najwyższą ostrożność!</strong> Zanim zaczniesz fizycznie 
                łączyć przewody, skręcać rozdzielnicę, a tym bardziej podłączać ją do napięcia sieciowego – 
                bezwarunkowo zweryfikuj swój wydrukowany projekt u 
                <strong> doświadczonego elektryka z odpowiednimi uprawnieniami (SEP)</strong>. 
                Pamiętaj: bezpieczeństwo Twoje i Twojej rodziny jest najważniejsze. Samodzielne prace bez wiedzy i późniejszego odbioru instalacji przez wykwalifikowaną osobę są skrajnie niebezpieczne.
              </p>
            </div>
          </section>
        </article>
      </div>

      <LandingFooter onOpenFeedback={openFeedback} />
    </>
  );
}
