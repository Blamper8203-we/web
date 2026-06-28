import { useState } from "react";
import { faqData } from "./landingData";

export function LandingFaq() {
  const [faqState, setFaqState] = useState<Record<number, boolean>>({});

  const toggleFaq = (id: number) => {
    setFaqState((prev) => ({ ...prev, [id]: !prev[id] }));
    setTimeout(() => {
      if ((window as any).lucide) (window as any).lucide.createIcons();
    }, 10);
  };

  return (
    <section id="faq" className="landing-faq-section">
      <div className="landing-faq-container">
        <div className="landing-faq-header">
          <span className="landing-faq-badge">Baza Wiedzy</span>
          <h2 className="landing-faq-title">Najczęściej zadawane pytania (FAQ)</h2>
        </div>

        <div className="landing-faq-list">
          {faqData.map((faq) => (
            <div key={faq.id} className="landing-faq-item">
              <button
                onClick={() => toggleFaq(faq.id)}
                className="landing-faq-btn"
              >
                <span className="landing-faq-btn-title">{faq.title}</span>
                <i
                  data-lucide="chevron-down"
                  className={`landing-faq-btn-icon ${
                    faqState[faq.id] ? "is-open" : ""
                  }`}
                ></i>
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
