import { useState } from "react";
import { knowledgeBase } from "./landingData";

export function LandingKnowledgeBase() {
  const [activeArticle, setActiveArticle] = useState<number>(1);

  return (
    <section id="artykuly" className="landing-kb-section">
      <div className="landing-container">
        <div className="landing-kb-grid">
          <div className="landing-kb-left">
            <span className="landing-kb-badge">KOMPENDIUM WIEDZY</span>
            <h2 className="landing-kb-title">
              {knowledgeBase[activeArticle as keyof typeof knowledgeBase].title}
            </h2>

            <div className="landing-kb-content">
              {knowledgeBase[activeArticle as keyof typeof knowledgeBase].content}
            </div>
          </div>

          <div className="landing-kb-right">
            <span className="landing-kb-right-header">Baza wiedzy:</span>

            <div className="landing-kb-list">
              {[1, 2].map((id) => (
                <button
                  key={id}
                  onClick={() => setActiveArticle(id)}
                  className={`landing-kb-btn ${
                    activeArticle === id ? "is-active" : "is-inactive"
                  }`}
                >
                  <i
                    data-lucide="arrow-right"
                    className="landing-kb-btn-icon"
                  ></i>
                  <div>
                    <span className="landing-kb-btn-title">
                      {knowledgeBase[id as keyof typeof knowledgeBase].title}
                    </span>
                    <span className="landing-kb-btn-desc">
                      {knowledgeBase[id as keyof typeof knowledgeBase].desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
