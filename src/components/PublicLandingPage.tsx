import "./PublicLandingPage.css";

interface PublicLandingPageProps {
  onOpenNewProject: () => void;
  onOpenProjectFile: () => void;
}

export function PublicLandingPage({ 
  onOpenNewProject,
  onOpenProjectFile,
}: PublicLandingPageProps) {

  return (
    <main className="landing">
      <section className="landing__hero">
        <p className="landing__eyebrow">DINBoard Web</p>
        <h1>Dokumentacja powykonawcza instalacji elektrycznej</h1>
        <p>
          DINBoard wspiera elektryka przy wykonaniu rozdzielnicy, opisaniu obwodów,
          sprawdzeniu instalacji i przygotowaniu dokumentacji odbiorczej PDF.
        </p>
        <div className="landing__warning">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            <strong>Uwaga!</strong> Aplikacja znajduje się w fazie testów i może zawierać błędy. Prosimy o weryfikację wygenerowanych danych.
          </span>
        </div>
        <div className="landing__actions">
          <button className="landing__button landing__button--secondary" onClick={onOpenProjectFile}>
            Otwórz projekt
          </button>
          <button className="landing__button landing__button--secondary" onClick={onOpenNewProject}>
            Nowy projekt
          </button>
          <a className="landing__button landing__button--donate" href="https://suppi.pl/dinboard" target="_blank" rel="noopener noreferrer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" y1="2" x2="6" y2="4"></line><line x1="10" y1="2" x2="10" y2="4"></line><line x1="14" y1="2" x2="14" y2="4"></line></svg>
            Wesprzyj projekt
          </a>
        </div>
      </section>

      <section className="landing__grid" aria-label="Kluczowe funkcje">
        <article className="landing__card">
          <h2>Rysowanie szyny DIN</h2>
          <p>Proste i szybkie układanie aparatów metodą przeciągnij i upuść. Błyskawicznie zaprojektujesz wygląd rozdzielnicy.</p>
        </article>
        <article className="landing__card">
          <h2>Schemat jednokreskowy</h2>
          <p>Aplikacja automatycznie buduje schemat elektryczny na podstawie ułożonych aparatów. Koniec z ręcznym rysowaniem!</p>
        </article>
        <article className="landing__card">
          <h2>Dokumentacja PDF</h2>
          <p>Generuj profesjonalne protokoły pomiarowe i estetyczną dokumentację powykonawczą gotową do wydruku w kilka sekund.</p>
        </article>
        <article className="landing__card">
          <h2>Prywatność i bezpieczeństwo</h2>
          <p>
            Twoje projekty są w 100% bezpieczne. Aplikacja działa całkowicie w Twojej przeglądarce, a pliki zapisujesz lokalnie na własnym dysku.
          </p>
        </article>
        <article className="landing__card">
          <h2>Inteligentna weryfikacja</h2>
          <p>
            Wbudowane walidacje na bieżąco analizują obwody, pilnują bilansu faz i pomagają uniknąć krytycznych błędów projektowych.
          </p>
        </article>
        <article className="landing__card">
          <h2>Baza własnych aparatów</h2>
          <p>
            Korzystaj z wbudowanej biblioteki symboli i z łatwością importuj własne pliki wektorowe (w formacie SVG).
          </p>
        </article>
      </section>
    </main>
  );
}
