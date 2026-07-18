import { useTranslation } from "react-i18next";
import { PwaInstallAssets } from "../pwa/PwaInstallAssets";

interface LandingHeroProps {
  onOpenProjectFile: () => void;
  onOpenNewProject: () => void;
}

export function LandingHero({ onOpenProjectFile, onOpenNewProject }: LandingHeroProps) {
  const { t } = useTranslation();

  return (
    <section className="landing-hero">
      <div className="landing-hero-bg-grid"></div>
      <div className="landing-hero-bg-glow"></div>

      <div className="landing-container">
        <div className="landing-hero-grid">
          {/* Lewa Kolumna */}
          <div className="landing-hero-left">

            <h1 className="landing-hero-title">
              {t("landing.title", "Projektowanie schematu")} <br />
              <span className="landing-hero-title-accent">
                {t("landing.instalacji", "instalacji elektrycznej")}
              </span>
            </h1>

            <p className="landing-hero-desc">
              {t("landing.subtitle", "DINBoard wspiera elektryka przy wykonaniu rozdzielnicy, tworzeniu czytelnego schematu instalacji, sprawdzeniu obwodów oraz przygotowaniu profesjonalnej dokumentacji odbiorczej PDF. Wszystko w Twojej przeglądarce.")}
            </p>

            {/* Profesjonalne info o bezpieczeństwie i wersji testowej */}
            <div className="landing-hero-alerts">
              <div className="landing-hero-alert">
                <i data-lucide="alert-triangle" className="landing-hero-alert-icon warning"></i>
                <div className="landing-hero-alert-text">
                  <strong className="warning">{t("auto.bezpieczestwopr_573", "Bezpieczeństwo przede wszystkim:")}</strong> {t("landing.warning", "Jeżeli nie posiadasz uprawnień elektrycznych (SEP), każdy schemat zaprojektowany w tej aplikacji musi zostać bezwzględnie sprawdzony i zatwierdzony przez wykwalifikowanego elektryka. Prąd elektryczny stanowi bezpośrednie zagrożenie zdrowia i życia — nie wykonuj montażu instalacji na własną rękę bez odpowiedniej wiedzy.")}
                </div>
              </div>
              <div className="landing-hero-alert">
                <i data-lucide="info" className="landing-hero-alert-icon info"></i>
                <div className="landing-hero-alert-text">
                  <strong className="info">{t("auto.wersjatestowabe_809", "Wersja testowa (BETA):")}</strong> {t("landing.info", "Aplikacja rozwija się dynamicznie. Wygenerowane schematy i obliczenia bilansu mocy mają charakter pomocniczy.")}
                </div>
              </div>
            </div>

            <div className="landing-hero-actions">
              <button
                onClick={onOpenProjectFile}
                className="landing-btn-secondary"
              >
                <i data-lucide="folder-open" className="icon"></i>
                {t("landing.buttonOpen", "Otwórz projekt z dysku")}
              </button>
              {/* WHY: instalator PWA w hero — największa widoczność dla nowych
                   odwiedzających. PwaInstallAssets renderuje null gdy instalacja
                   niedostępna, więc układ hero się nie rozjeżdża. */}
              <PwaInstallAssets variant="hero" />
            </div>
          </div>

          {/* Prawa Kolumna - Płytka Startowa */}
          <div className="landing-hero-right">
            <div className="landing-hero-right-wrapper">
              <button
                onClick={onOpenNewProject}
                className="landing-new-project-card"
              >
                <div className="landing-new-project-card-bg"></div>

                <div className="landing-new-project-icon-wrapper">
                  <i data-lucide="plus" className="landing-new-project-icon"></i>
                </div>

                <h2 className="landing-new-project-title">{t("landing.buttonNew", "Utwórz nowy projekt")}</h2>
                <p className="landing-new-project-desc">{t("auto.rozpocznijproje_716", "Rozpocznij projektowanie czystej szyny DIN, konfiguruj fazy i wygeneruj schemat montażowy.")}</p>

                <div className="landing-new-project-cta">
                  {t("landing.startEditor", "Uruchom darmowy edytor")}
                  <i data-lucide="chevron-right" className="landing-new-project-cta-icon"></i>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
