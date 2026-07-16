import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { blogArticles } from "../../data/blogArticles";

// WHY: ta sekcja zastąpiła fikcyjny teaser LandingKnowledgeBase, który pokazywał
// dwa wymyślone artykuły marketingowe bez linków. Tu renderujemy realne wpisy
// z /poradniki jako 3 klikalne karty — 1 kliknięcie od homepage zamiast 2
// (home → /poradniki → artykuł). To najsilniejszy onsite sygnał crawl-priority
// jaki nam został dla młodej domeny; reszta (sitemap, JSON-LD, canonical, SSG)
// była już na miejscu.
export function LandingTutorials() {
  const { t } = useTranslation();

  // Najnowsze 3 wg daty (ISO string → localeCompare działa poprawnie).
  const latest = [...blogArticles]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  return (
    <section id="poradniki" className="landing-tutorials-section">
      <div className="landing-container">
        <div className="landing-section-header">
          <span className="landing-section-badge">
            {t("landing.tutorials.badge", "BAZA WIEDZY")}
          </span>
          <h2 className="landing-section-title">
            {t("landing.tutorials.title", "Najnowsze poradniki dla elektryków")}
          </h2>
          <p className="landing-section-desc">
            {t(
              "landing.tutorials.desc",
              "Praktyczna wiedza o projektowaniu rozdzielnic, doborze zabezpieczeń i czytaniu schematów — zgodnie z normą PN-HD 60364.",
            )}
          </p>
        </div>

        <div className="landing-tutorials-grid">
          {latest.map((article) => (
            <Link
              key={article.slug}
              to={`/poradniki/${article.slug}`}
              className="landing-tutorial-card"
            >
              <div className="landing-tutorial-tags">
                {article.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="landing-tutorial-tag">{tag}</span>
                ))}
              </div>
              <h3 className="landing-tutorial-title">{article.title}</h3>
              <p className="landing-tutorial-excerpt">{article.excerpt}</p>
              <div className="landing-tutorial-meta">
                <span>{article.date}</span>
                <span className="landing-tutorial-author">{article.author}</span>
              </div>
              <span className="landing-tutorial-cta">
                {t("landing.tutorials.readMore", "Czytaj dalej")}
                <i data-lucide="arrow-right" className="landing-tutorial-cta-icon"></i>
              </span>
            </Link>
          ))}
        </div>

        <div className="landing-tutorials-footer">
          <Link to="/poradniki" className="landing-tutorials-all">
            {t("landing.tutorials.seeAll", "Zobacz całą bazę wiedzy")}
            <i data-lucide="arrow-right" className="landing-tutorials-all-icon"></i>
          </Link>
        </div>
      </div>
    </section>
  );
}
