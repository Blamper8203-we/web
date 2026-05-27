import type { MouseEvent } from "react";
import "./PublicLandingPage.css";

interface PublicLandingPageProps {
  onOpenWorkspace: () => void;
}

export function PublicLandingPage({ onOpenWorkspace }: PublicLandingPageProps) {
  const handleOpenWorkspace = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onOpenWorkspace();
  };

  return (
    <main className="landing">
      <section className="landing__hero">
        <p className="landing__eyebrow">DINBoard Web</p>
        <h1>Dokumentacja powykonawcza instalacji elektrycznej</h1>
        <p>
          DINBoard wspiera elektryka przy wykonaniu rozdzielnicy, opisaniu obwodów,
          sprawdzeniu instalacji i przygotowaniu dokumentacji odbiorczej PDF.
        </p>
        <div className="landing__actions">
          <a className="landing__button" href="/app" onClick={handleOpenWorkspace}>
            Otwórz aplikację
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
