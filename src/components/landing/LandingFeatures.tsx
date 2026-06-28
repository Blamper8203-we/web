export function LandingFeatures() {
  return (
    <section id="funkcje" className="landing-features-section">
      <div className="landing-container">
        <div className="landing-section-header">
          <span className="landing-section-badge">
            DLACZEGO DINBOARD?
          </span>
          <h2 className="landing-section-title">Stworzony, by oszczędzać czas instalatorów</h2>
          <p className="landing-section-desc">
            Przejdź od pomysłu do gotowej szafy i protokołu w kilka minut. Bez skomplikowanego, drogiego oprogramowania typu CAD.
          </p>
        </div>

        <div className="landing-features-grid">
          <div className="landing-feature-card hover-blue">
            <div className="landing-feature-icon-wrapper color-blue">
              <i data-lucide="layers" className="landing-feature-icon"></i>
            </div>
            <h3 className="landing-feature-title">Rysowanie szyny DIN</h3>
            <p className="landing-feature-desc">
              Proste i szybkie układanie aparatów zabezpieczających i modułowych metodą przeciągnij i upuść. Błyskawicznie zaprojektujesz czytelny wygląd frontu rozdzielnicy.
            </p>
          </div>

          <div className="landing-feature-card hover-amber">
            <div className="landing-feature-icon-wrapper color-amber">
              <i data-lucide="git-merge" className="landing-feature-icon"></i>
            </div>
            <h3 className="landing-feature-title">Schemat Jednokreskowy</h3>
            <p className="landing-feature-desc">
              Aplikacja automatycznie buduje schemat elektryczny na podstawie ułożonych na szynie aparatów. Koniec z mozolnym, ręcznym rysowaniem linii obwodowych.
            </p>
          </div>

          <div className="landing-feature-card hover-emerald">
            <div className="landing-feature-icon-wrapper color-emerald">
              <i data-lucide="file-text" className="landing-feature-icon"></i>
            </div>
            <h3 className="landing-feature-title">Dokumentacja PDF</h3>
            <p className="landing-feature-desc">
              Generuj przejrzyste rysunki montażowe oraz dokumentację odbiorczą powykonawczą gotową do wydruku w kilka sekund, z zachowaniem Twojego logotypu.
            </p>
          </div>

          <div className="landing-feature-card hover-indigo">
            <div className="landing-feature-icon-wrapper color-indigo">
              <i data-lucide="shield-check" className="landing-feature-icon"></i>
            </div>
            <h3 className="landing-feature-title">Prywatność i bezpieczeństwo</h3>
            <p className="landing-feature-desc">
              Twoje projekty są w 100% poufne. Aplikacja przetwarza dane w Twojej przeglądarce, a pliki projektów (.dinboard) zapisujesz bezpiecznie na własnym dysku.
            </p>
          </div>

          <div className="landing-feature-card hover-rose">
            <div className="landing-feature-icon-wrapper color-rose">
              <i data-lucide="cpu" className="landing-feature-icon"></i>
            </div>
            <h3 className="landing-feature-title">Inteligentna weryfikacja</h3>
            <p className="landing-feature-desc">
              Wbudowane algorytmy walidacji na bieżąco sprawdzają poprawność połączeń, pilnują rozkładu obciążenia fazowego i chronią Cię przed krytycznymi błędami.
            </p>
          </div>

          <div className="landing-feature-card hover-yellow">
            <div className="landing-feature-icon-wrapper color-yellow">
              <i data-lucide="database" className="landing-feature-icon"></i>
            </div>
            <h3 className="landing-feature-title">Baza własnych aparatów</h3>
            <p className="landing-feature-desc">
              Swobodnie importuj pliki wektorowe SVG aparatów zaprojektowanych w zewnętrznych programach graficznych i z łatwością twórz własną bazę unikalnych komponentów.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
