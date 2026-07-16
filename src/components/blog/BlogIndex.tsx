import { Helmet } from "react-helmet-async";
import { Link, useOutletContext } from "react-router-dom";
import { blogArticles } from "../../data/blogArticles";
import { LandingHeader } from "../landing/LandingHeader";
import { LandingFooter } from "../landing/LandingFooter";
import { useLandingAssets } from "../landing/useLandingAssets";
import type { AppContextType } from "../../App";
import { collectionPageJsonLd } from "../../seo/jsonLd";
import "./Blog.css";

export function BlogIndex() {
  const { openFeedback } = useOutletContext<AppContextType>() ?? {};
  useLandingAssets();
  return (
    <>
      <Helmet>
        <title>Poradniki i Kompendium Wiedzy – DINBoard</title>
        <meta
          name="description"
          content="Baza wiedzy dla elektryków. Poradniki dotyczące projektowania rozdzielnic, schematów jednokreskowych i poprawnych instalacji elektrycznych."
        />
        <link rel="canonical" href="https://dinboard.pl/poradniki" />
        {/* WHY: this page is a list of articles, not the product itself.
            Using CollectionPage keeps Google from seeing it as a
            duplicate-SoftwareApplication of the home page. */}
        <script type="application/ld+json">
          {JSON.stringify(collectionPageJsonLd())}
        </script>
      </Helmet>

      <LandingHeader />

      <div className="blog-page">
        <header className="blog-header">
          <h1>Kompendium Wiedzy</h1>
          <p>Praktyczne poradniki dla elektryków i projektantów</p>
          <p className="blog-disclaimer" style={{ fontSize: '0.85rem', color: 'var(--text-muted, #777)', marginTop: '1rem', maxWidth: '600px', margin: '1rem auto 0' }}>
            Materiały edukacyjne opracowane zgodnie z wytycznymi norm z serii <strong>PN-HD 60364</strong> oraz najlepszymi praktykami inżynierskimi. Pamiętaj, że każda instalacja jest inna i ostateczną decyzję zawsze podejmuje projektant z uprawnieniami.
          </p>
        </header>

        <div className="blog-grid">
          {blogArticles.map((article) => (
            <article key={article.slug} className="blog-card">
              <div className="blog-card-content">
                <div className="blog-card-tags">
                  {article.tags.map(tag => (
                    <span key={tag} className="blog-tag">{tag}</span>
                  ))}
                </div>
                <h2>
                  <Link to={`/poradniki/${article.slug}`}>{article.title}</Link>
                </h2>
                <p className="blog-excerpt">{article.excerpt}</p>
              </div>
              <div className="blog-card-footer">
                <Link to={`/poradniki/${article.slug}`} className="blog-read-more">
                  Czytaj dalej <i data-lucide="arrow-right"></i>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>

      <LandingFooter onOpenFeedback={openFeedback} />
    </>
  );
}
