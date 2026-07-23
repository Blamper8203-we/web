import { useTranslation } from "react-i18next";
import { AppIcon } from "../AppIcon";

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
              <AppIcon name="layers" className="landing-feature-icon" />
            </div>
            <h3 className="landing-feature-title">{t("landing.features.f1.title")}</h3>
            <p className="landing-feature-desc">
              {t("landing.features.f1.desc")}
            </p>
          </div>

          <div className="landing-feature-card hover-amber">
            <div className="landing-feature-icon-wrapper color-amber">
              <AppIcon name="gitMerge" className="landing-feature-icon" />
            </div>
            <h3 className="landing-feature-title">{t("landing.features.f2.title")}</h3>
            <p className="landing-feature-desc">
              {t("landing.features.f2.desc")}
            </p>
          </div>

          <div className="landing-feature-card hover-emerald">
            <div className="landing-feature-icon-wrapper color-emerald">
              <AppIcon name="fileText" className="landing-feature-icon" />
            </div>
            <h3 className="landing-feature-title">{t("landing.features.f3.title")}</h3>
            <p className="landing-feature-desc">
              {t("landing.features.f3.desc")}
            </p>
          </div>

          <div className="landing-feature-card hover-indigo">
            <div className="landing-feature-icon-wrapper color-indigo">
              <AppIcon name="shieldCheck" className="landing-feature-icon" />
            </div>
            <h3 className="landing-feature-title">{t("landing.features.f4.title")}</h3>
            <p className="landing-feature-desc">
              {t("landing.features.f4.desc")}
            </p>
          </div>

          <div className="landing-feature-card hover-rose">
            <div className="landing-feature-icon-wrapper color-rose">
              <AppIcon name="cpu" className="landing-feature-icon" />
            </div>
            <h3 className="landing-feature-title">{t("landing.features.f5.title")}</h3>
            <p className="landing-feature-desc">
              {t("landing.features.f5.desc")}
            </p>
          </div>

          <div className="landing-feature-card hover-yellow">
            <div className="landing-feature-icon-wrapper color-yellow">
              <AppIcon name="database" className="landing-feature-icon" />
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
