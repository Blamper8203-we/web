import { useMemo } from "react";
import { useParams, Link, Navigate, useOutletContext } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { blogArticles } from "../../data/blogArticles";
import { LandingHeader } from "../landing/LandingHeader";
import { LandingFooter } from "../landing/LandingFooter";
import { useLandingAssets } from "../landing/useLandingAssets";
import type { AppContextType } from "../../App";
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

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { openFeedback } = useOutletContext<AppContextType>() ?? {};
  useLandingAssets();
  const article = blogArticles.find(a => a.slug === slug);

  if (!article) {
    return <Navigate to="/poradniki" replace />;
  }

  return (
    <>
      <Helmet>
        <title>{article.title} – DINBoard Kompendium</title>
        <meta name="description" content={article.excerpt} />
        <link rel="canonical" href={`https://dinboard.pl/poradniki/${article.slug}`} />
      </Helmet>

      <LandingHeader />

      <div className="blog-page">
        <div className="blog-article-container">
          <Link to="/poradniki" className="blog-back-link">
            <i data-lucide="arrow-left"></i> Wróć do listy poradników
          </Link>
          
          <article className="blog-article">
            <header className="blog-article-header">
              <div className="blog-article-tags">
                {article.tags.map(tag => (
                  <span key={tag} className="blog-tag">{tag}</span>
                ))}
              </div>
              <h1>{article.title}</h1>
              <div className="blog-meta">
                <span className="blog-date">{article.date}</span>
                <span className="blog-author">{article.author}</span>
              </div>
            </header>
            
            <SimpleMarkdownRenderer content={article.content} />
          </article>
        </div>
      </div>

      <LandingFooter onOpenFeedback={openFeedback} />
    </>
  );
}
