import { useTranslation } from "react-i18next";

export function LandingFeatures() {
  const { t } = useTranslation();

  return (
    <section id="funkcje" className="landing-features-section">
      <div className="landing-container">
        <div className="landing-section-header">
          <span className="landing-section-badge">
            {t("landing.features.badge")}
          </span>
          <h2 className="landing-section-title">{t("landing.features.title")}</h2>
          <p className="landing-section-desc">
            {t("landing.features.desc")}
          </p>
        </div>

        <div className="landing-features-grid">
          <div className="landing-feature-card hover-blue">
            <div className="landing-feature-icon-wrapper color-blue">
              <i data-lucide="layers" className="landing-feature-icon"></i>
            </div>
            <h3 className="landing-feature-title">{t("landing.features.f1.title")}</h3>
            <p className="landing-feature-desc">
              {t("landing.features.f1.desc")}
            </p>
          </div>

          <div className="landing-feature-card hover-amber">
            <div className="landing-feature-icon-wrapper color-amber">
              <i data-lucide="git-merge" className="landing-feature-icon"></i>
            </div>
            <h3 className="landing-feature-title">{t("landing.features.f2.title")}</h3>
            <p className="landing-feature-desc">
              {t("landing.features.f2.desc")}
            </p>
          </div>

          <div className="landing-feature-card hover-emerald">
            <div className="landing-feature-icon-wrapper color-emerald">
              <i data-lucide="file-text" className="landing-feature-icon"></i>
            </div>
            <h3 className="landing-feature-title">{t("landing.features.f3.title")}</h3>
            <p className="landing-feature-desc">
              {t("landing.features.f3.desc")}
            </p>
          </div>

          <div className="landing-feature-card hover-indigo">
            <div className="landing-feature-icon-wrapper color-indigo">
              <i data-lucide="shield-check" className="landing-feature-icon"></i>
            </div>
            <h3 className="landing-feature-title">{t("landing.features.f4.title")}</h3>
            <p className="landing-feature-desc">
              {t("landing.features.f4.desc")}
            </p>
          </div>

          <div className="landing-feature-card hover-rose">
            <div className="landing-feature-icon-wrapper color-rose">
              <i data-lucide="cpu" className="landing-feature-icon"></i>
            </div>
            <h3 className="landing-feature-title">{t("landing.features.f5.title")}</h3>
            <p className="landing-feature-desc">
              {t("landing.features.f5.desc")}
            </p>
          </div>

          <div className="landing-feature-card hover-yellow">
            <div className="landing-feature-icon-wrapper color-yellow">
              <i data-lucide="database" className="landing-feature-icon"></i>
            </div>
            <h3 className="landing-feature-title">{t("landing.features.f6.title")}</h3>
            <p className="landing-feature-desc">
              {t("landing.features.f6.desc")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
