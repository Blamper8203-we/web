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
        <h1>Projektowanie rozdzielnic w przeglądarce</h1>
        <p>
          Wersja webowa aplikacji DINBoard do pracy nad schematem, listą obwodów, walidacją
          elektryczną i dokumentacją PDF.
        </p>
        <div className="landing__actions">
          <a className="landing__button" href="/app" onClick={handleOpenWorkspace}>
            Otwórz aplikację
          </a>
        </div>
      </section>

      <section className="landing__grid" aria-label="Kluczowe funkcje">
        <article className="landing__card">
          <h2>Edytor projektu</h2>
          <p>Konfiguracja danych projektu, bilans mocy oraz walidacja reguł zgodnych z wersją desktop.</p>
        </article>
        <article className="landing__card">
          <h2>Schemat i rozdzielnica</h2>
          <p>Canvas A4, rozmieszczanie modułów i generator szyny DIN z obsługą przeciągania.</p>
        </article>
        <article className="landing__card">
          <h2>Dokumentacja PDF</h2>
          <p>Podgląd i eksport PDF oparty o wspólną usługę `react-pdf` dla całej aplikacji.</p>
        </article>
        <article className="landing__card">
          <h2>Dane projektu</h2>
          <p>
            Projekty są edytowane lokalnie w przeglądarce i zapisywane jako pliki `.dinboard`.
            Nie wysyłaj dokumentacji na serwer bez świadomej decyzji użytkownika.
          </p>
        </article>
        <article className="landing__card">
          <h2>Weryfikacja</h2>
          <p>
            Walidacje i obliczenia wspierają projektowanie, ale wynik dokumentacji powinien
            zostać sprawdzony przez osobę z właściwymi uprawnieniami.
          </p>
        </article>
      </section>
    </main>
  );
}
