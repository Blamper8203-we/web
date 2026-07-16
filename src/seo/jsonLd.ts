// WHY: Per-page Schema.org JSON-LD was previously hard-coded in index.html
// as a single SoftwareApplication block. Because vite-react-ssg uses that
// template for every route, every page (including /polityka-prywatnosci,
// /regulamin, contact page, articles) shipped with the same SoftwareApplication
// schema. Google treats identical structured-data entities across non-canonical
// pages as duplicate entity signals, which can suppress indexing of the
// non-homepage routes.
//
// This module gives each page its own correct @type. The helpers are pure
// functions of the page data so they can be unit-tested without rendering
// React. Components inject the resulting object via react-helmet-async's
// <script type="application/ld+json"> child.

const SITE_URL = "https://dinboard.pl";
const SITE_NAME = "DINBoard Web";
const SITE_LOCALE = "pl";

interface JsonLdEntity {
  "@context": "https://schema.org";
  "@type": string;
  [key: string]: unknown;
}

// Homepage — the only page that legitimately represents the product itself.
export function softwareApplicationJsonLd(): JsonLdEntity {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    alternateName: "DINBoard",
    url: SITE_URL,
    applicationCategory: "DesignApplication",
    applicationSubCategory: "Electrical Engineering Software",
    operatingSystem: "Web, Windows, macOS, Linux",
    description:
      "Profesjonalna aplikacja dla elektryków do projektowania rozdzielnic, tworzenia obwodów, obliczania bilansu mocy i generowania dokumentacji zgodnej z polskimi standardami.",
    inLanguage: SITE_LOCALE,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "PLN",
    },
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

// Blog index — a list/collection of articles, not a software product.
export function collectionPageJsonLd(): JsonLdEntity {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Poradniki i Kompendium Wiedzy – DINBoard",
    description:
      "Baza wiedzy dla elektryków. Poradniki dotyczące projektowania rozdzielnic, schematów jednokreskowych i poprawnych instalacji elektrycznych.",
    url: `${SITE_URL}/poradniki`,
    inLanguage: SITE_LOCALE,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export interface ArticleJsonLdInput {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO yyyy-mm-dd
  author: string;
}

// Article — the bread-and-butter of SEO for the knowledge base.
// Returns an array because the page emits both BlogPosting (the article
// itself) and BreadcrumbList (navigation context). Google's article
// rich-results require the BlogPosting type; BreadcrumbList is what makes
// the search result show "Strona główna › Baza wiedzy › Tytuł".
export function articleJsonLdBlocks(
  article: ArticleJsonLdInput,
): JsonLdEntity[] {
  const articleUrl = `${SITE_URL}/poradniki/${article.slug}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description: article.excerpt,
      url: articleUrl,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": articleUrl,
      },
      datePublished: article.date,
      dateModified: article.date,
      inLanguage: SITE_LOCALE,
      author: {
        "@type": "Person",
        name: article.author,
      },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/favicon-192.png`,
        },
      },
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Strona główna",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Baza wiedzy",
          item: `${SITE_URL}/poradniki`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: article.title,
          item: articleUrl,
        },
      ],
    },
  ];
}

// Contact — distinct from a generic WebPage so Google can surface it
// for queries like "DINBoard kontakt".
export function contactPageJsonLd(): JsonLdEntity {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Kontakt – DINBoard",
    description:
      "Skontaktuj się z autorem aplikacji DINBoard Web. Zgłoś błąd, zaproponuj funkcjonalność lub zapytaj o szczegóły techniczne.",
    url: `${SITE_URL}/kontakt`,
    inLanguage: SITE_LOCALE,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

// About — distinct from Contact so the about page can rank separately
// for "o aplikacji" / "twórca DINBoard" type queries.
export function aboutPageJsonLd(): JsonLdEntity {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "O nas – Historia projektu DINBoard",
    description:
      "Dowiedz się więcej o historii powstania aplikacji DINBoard Web oraz o autorze – Arturze Tomaszewskim.",
    url: `${SITE_URL}/o-nas`,
    inLanguage: SITE_LOCALE,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

// Legal pages — a plain WebPage is enough. They rarely generate rich
// results, but @type=WebPage still gives Google a clear "this is part
// of the same site" signal and prevents the no-schema fallback that
// would otherwise let the page be lumped with the home page schema.
export function webPageJsonLd(input: {
  title: string;
  description: string;
  urlPath: string;
}): JsonLdEntity {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: input.description,
    url: `${SITE_URL}${input.urlPath}`,
    inLanguage: SITE_LOCALE,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
