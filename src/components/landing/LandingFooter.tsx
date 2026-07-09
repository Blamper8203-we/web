import { useTranslation } from "react-i18next";

interface LandingFooterProps {
  onOpenFeedback: () => void;
}

export function LandingFooter({ onOpenFeedback }: LandingFooterProps) {
  const { t } = useTranslation();

  return (
    <footer className="landing-footer">
      <div className="landing-footer-container">
        <div className="landing-footer-brand">
          <div className="landing-footer-logo-wrapper">
            <img src="/favicon-192.png" alt="DinBoard Logo" width="48" height="48" loading="lazy" decoding="async" />
          </div>
          <div>
            <span className="landing-footer-title">{t("auto.dinboard_628", "DinBoard")}</span>
            <span className="landing-footer-subtitle">{t("landing.footer.subtitle")}</span>
          </div>
        </div>

        <div className="landing-footer-links">
          <a href="/o-nas" className="landing-footer-link">
            O nas
          </a>
          <a href="/poradniki" className="landing-footer-link">
            Kompendium
          </a>
          <a href="/kontakt" className="landing-footer-link">
            Kontakt
          </a>
          <a href="/polityka-prywatnosci" className="landing-footer-link">
            {t("landing.footer.privacy")}
          </a>
          <a href="/regulamin" className="landing-footer-link">
            {t("landing.footer.terms")}
          </a>
          <button onClick={onOpenFeedback} className="landing-footer-link" style={{ cursor: "pointer", background: "none", border: "none", padding: 0, font: "inherit" }}>
            Zgłoś błąd
          </button>
        </div>

        <span className="landing-footer-copyright">{t("landing.footer.copyright")}</span>
      </div>
    </footer>
  );
}
