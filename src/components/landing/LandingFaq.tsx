import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getFaqData } from "./landingData";
import { AppIcon } from "../AppIcon";

export function LandingFaq() {
  const [faqState, setFaqState] = useState<Record<number, boolean>>({});
  const { t } = useTranslation();
  const faqData = getFaqData(t);

  const toggleFaq = (id: number) => {
    setFaqState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section id="faq" className="landing-faq-section">
      <div className="landing-faq-container">
        <div className="landing-faq-header">
          <span className="landing-faq-badge">{t("landing.faq.badge")}</span>
          <h2 className="landing-faq-title">{t("landing.faq.title")}</h2>
        </div>

        <div className="landing-faq-list">
          {faqData.map((faq) => (
            <div key={faq.id} className="landing-faq-item">
              <button
                onClick={() => toggleFaq(faq.id)}
                className="landing-faq-btn"
              >
                <span className="landing-faq-btn-title">{faq.title}</span>
                <AppIcon
                  name="chevronDown"
                  className={`landing-faq-btn-icon ${
                    faqState[faq.id] ? "is-open" : ""
                  }`}
                />
              </button>
              {faqState[faq.id] && (
                <div className="landing-faq-content">
                  {faq.desc}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
