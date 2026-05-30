import "./PublicLandingPage.css";

interface PublicLandingPageProps {
  onOpenLastProject: () => void;
  onOpenNewProject: () => void;
  onOpenProjectFile: () => void;
}

export function PublicLandingPage({ 
  onOpenLastProject,
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
          <button className="landing__button" onClick={onOpenLastProject}>
            Ostatni projekt
          </button>
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
          <h2>Dane wykonania</h2>
          <p>Dane obiektu, wykonawcy, elektryka z uprawnieniami SEP oraz dokumentacji odbiorczej.</p>
        </article>
        <article className="landing__card">
          <h2>Schemat i rozdzielnica</h2>
          <p>Canvas A4, rozmieszczanie modułów i generator szyny DIN z obsługą przeciągania.</p>
        </article>
        <article className="landing__card">
          <h2>Dokumentacja PDF</h2>
          <p>Podgląd i eksport dokumentacji powykonawczej PDF bezpośrednio z aplikacji.</p>
        </article>
        <article className="landing__card">
          <h2>Dane zlecenia</h2>
          <p>
            Zlecenia są edytowane lokalnie w przeglądarce i zapisywane jako pliki `.dinboard`.
            Nie wysyłaj dokumentacji na serwer bez świadomej decyzji użytkownika.
          </p>
        </article>
        <article className="landing__card">
          <h2>Weryfikacja</h2>
          <p>
            Walidacje i obliczenia wspierają wykonanie i odbiór instalacji, ale wynik dokumentacji
            powinien zostać sprawdzony przez osobę z właściwymi uprawnieniami.
          </p>
        </article>
      </section>
    </main>
  );
}
