import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
export function LandingHeader() {
  const { t } = useTranslation();
  const location = useLocation();
  const isOnPoradniki = location.pathname.startsWith("/poradniki");

  return (
    <header className="landing-header">
      <div className="landing-header-container">
        <a href="/" className="landing-header-logo-group" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="landing-header-logo-icon">
            <img src="/favicon-192.png" alt="DinBoard Logo" />
          </div>
          <div>
            <span className="landing-header-title">
              Din<span className="landing-header-title-accent">{t("auto.board_264", "Board")}</span>
            </span>
            <span className="landing-header-subtitle">
              {t("landing.header.subtitle", "Kreator rozdzielnic")}
            </span>
          </div>
        </a>

        <nav className="landing-header-nav">
          <a href="/#funkcje">{t("auto.moliwoci_696", "Możliwości")}</a>
          <a href="/#demo-sandbox">{t("auto.interfejs_389", "Interfejs")}</a>
          <a
            href="/poradniki"
            className={isOnPoradniki ? "is-active" : undefined}
          >
            {t("auto.bazawiedzy_212", "Baza wiedzy")}
          </a>
          <a href="/#faq">{t("auto.faq_502", "FAQ")}</a>
          <a href="/kontakt">{t("landing.nav.contact", "Kontakt")}</a>
        </nav>

        <div className="landing-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a
            href="https://suppi.pl/dinboard"
            target="_blank"
            rel="noreferrer"
            className="landing-header-btn-support"
          >
            <i data-lucide="coffee" className="icon"></i>
            <span className="landing-header-btn-text">{t("auto.wesprzyjprojekt_653", "Wesprzyj projekt")}</span>
          </a>
        </div>
      </div>
    </header>
  );
}
