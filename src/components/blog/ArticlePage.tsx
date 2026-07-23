import { useMemo } from "react";
import { useParams, Link, Navigate, useOutletContext } from "react-router-dom";
import { AppIcon } from "../AppIcon";
import { Helmet } from "react-helmet-async";
import { blogArticles, type BlogArticle } from "../../data/blogArticles";
import { LandingHeader } from "../landing/LandingHeader";
import { LandingFooter } from "../landing/LandingFooter";
import { useLandingAssets } from "../landing/useLandingAssets";
import type { AppContextType } from "../../App";
import { articleJsonLdBlocks } from "../../seo/jsonLd";
import { GoogleAdSense } from "../../seo/GoogleAdSense";
import "./Blog.css";

function SimpleMarkdownRenderer({ content }: { content: string }) {
  const htmlContent = useMemo(() => {
    let html = content;

    // Uproszczony parser Markdown (bez zewnętrznych zależności)
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');

    // Listy
    html = html.replace(/^\s*-\s+(.*)/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/^\s*\*\s+(.*)/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/^\s*\d+\.\s+(.*)/gim, '<ol><li>$1</li></ol>');
    html = html.replace(/<\/ul>\n<ul>/gim, '');
    html = html.replace(/<\/ol>\n<ol>/gim, '');

    // Paragrafy - dzielenie po podwójnych znakach nowej linii
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs.map(p => {
      if (p.trim().startsWith('<')) return p; // Zostawiamy nagłówki i listy
      return `<p>${p.replace(/\n/g, '<br />')}</p>`;
    }).join('\n');

    return html;
  }, [content]);

  return <div className="blog-article-body" dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}

// WHY: every article should point readers at the next ones, both for UX
// (session depth) and for SEO (internal linking is one of the strongest
// ranking signals Google has for a young site). Sort by the number of
// shared tags first, then by recency as a tiebreaker, and cap at 3 cards.
// Returns at most 3 related articles, never the current one, never empty
// if the catalogue has anything else to show.
function pickRelatedArticles(
  current: BlogArticle,
  all: BlogArticle[],
  limit = 3,
): BlogArticle[] {
  return all
    .filter(a => a.slug !== current.slug)
    .map(a => ({
      article: a,
      sharedTagCount: a.tags.filter(t => current.tags.includes(t)).length,
    }))
    .sort((a, b) => {
      if (b.sharedTagCount !== a.sharedTagCount) {
        return b.sharedTagCount - a.sharedTagCount;
      }
      // tiebreaker: newer first
      return b.article.date.localeCompare(a.article.date);
    })
    .slice(0, limit)
    .map(x => x.article);
}

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { openFeedback } = useOutletContext<AppContextType>() ?? {};
  useLandingAssets();
  const article = blogArticles.find(a => a.slug === slug);

  if (!article) {
    return <Navigate to="/poradniki" replace />;
  }

  const related = pickRelatedArticles(article, blogArticles);
  const jsonLdBlocks = articleJsonLdBlocks(article);

  return (
    <>
      <Helmet>
        <title>{article.title} – DINBoard Kompendium</title>
        <meta name="description" content={article.excerpt} />
        <link rel="canonical" href={`https://dinboard.pl/poradniki/${article.slug}`} />
        {/* WHY: per-article BlogPosting + BreadcrumbList JSON-LD so Google
            can render rich results and the breadcrumb path in SERPs. Each
            article gets its own block — never a shared template. */}
        {jsonLdBlocks.map((block, index) => (
          <script
            key={index}
            type="application/ld+json"
          >
            {JSON.stringify(block)}
          </script>
        ))}
      </Helmet>
      <GoogleAdSense />

      <LandingHeader />

      <div className="blog-page">
        <div className="blog-article-container">
          {/* WHY: visual breadcrumb — same hierarchy as the BreadcrumbList
              JSON-LD above. Gives both users and crawlers a clear path
              from the marketing home to the article. */}
          <nav aria-label="Okruszki" className="blog-breadcrumb">
            <Link to="/">Strona główna</Link>
            <span className="blog-breadcrumb-sep" aria-hidden="true">›</span>
            <Link to="/poradniki">Baza wiedzy</Link>
            <span className="blog-breadcrumb-sep" aria-hidden="true">›</span>
            <span className="blog-breadcrumb-current" aria-current="page">
              {article.title}
            </span>
          </nav>

          <Link to="/poradniki" className="blog-back-link">
            <AppIcon name="arrowLeft" /> Wróć do listy poradników
          </Link>

          <article className="blog-article">
            <header className="blog-article-header">
              <div className="blog-article-tags">
                {article.tags.map(tag => (
                  <span key={tag} className="blog-tag">{tag}</span>
                ))}
              </div>
              <h1>{article.title}</h1>
            </header>

            <SimpleMarkdownRenderer content={article.content} />
          </article>

          {related.length > 0 && (
            <section className="blog-related" aria-label="Powiązane poradniki">
              <h2 className="blog-related-title">Powiązane poradniki</h2>
              <div className="blog-related-grid">
                {related.map(item => (
                  <Link
                    key={item.slug}
                    to={`/poradniki/${item.slug}`}
                    className="blog-related-card"
                  >
                    <div className="blog-related-card-tags">
                      {item.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="blog-tag">{tag}</span>
                      ))}
                    </div>
                    <h3 className="blog-related-card-title">{item.title}</h3>
                    <p className="blog-related-card-excerpt">{item.excerpt}</p>
                    <span className="blog-related-card-cta">
                      Czytaj dalej <AppIcon name="arrowRight" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <LandingFooter onOpenFeedback={openFeedback} />
    </>
  );
}
