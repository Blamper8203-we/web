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
            <img src="/favicon-192.png" alt="DinBoard Logo" />
          </div>
          <div>
            <span className="landing-footer-title">DinBoard</span>
            <span className="landing-footer-subtitle">{t("landing.footer.subtitle")}</span>
          </div>
        </div>

        <div className="landing-footer-links">
          <a href="/polityka-prywatnosci" className="landing-footer-link">
            {t("landing.footer.privacy")}
          </a>
          <a href="/regulamin" className="landing-footer-link">
            {t("landing.footer.terms")}
          </a>
          <a onClick={onOpenFeedback} className="landing-footer-link" style={{ cursor: "pointer" }}>
            {t("landing.footer.contact")}
          </a>
        </div>

        <span className="landing-footer-copyright">{t("landing.footer.copyright")}</span>
      </div>
    </footer>
  );
}
