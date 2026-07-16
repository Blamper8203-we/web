// WHY: schema.org JSON-LD used to be a single hard-coded SoftwareApplication
// block in index.html. Because vite-react-ssg shared that template across
// every route, every page shipped the same structured data, which Google
// read as duplicate entity signals and used to suppress indexing of the
// non-homepage routes. The fix moves JSON-LD into per-route helpers in
// jsonLd.ts; this file pins each helper's @type and the cross-page
// invariant (no two pages share the same schema type for the same entity).
//
// The previous test read the static block out of index.html. That template
// no longer carries JSON-LD, so we test the helpers directly — the helpers
// are pure functions of the page data, which is exactly what we want to
// guarantee in production anyway.

import { describe, it, expect } from "vitest";
import {
  softwareApplicationJsonLd,
  collectionPageJsonLd,
  articleJsonLdBlocks,
  contactPageJsonLd,
  aboutPageJsonLd,
  webPageJsonLd,
} from "./jsonLd";

describe("SEO JSON-LD — per-page helpers", () => {
  it("homepage declares SoftwareApplication with the right operating systems", () => {
    const jsonLd = softwareApplicationJsonLd();
    expect(jsonLd["@type"]).toBe("SoftwareApplication");
    expect(jsonLd.name).toBe("DINBoard Web");
    expect(jsonLd.url).toBe("https://dinboard.pl");

    // TermsOfService_pl.tsx removed mobile support in commit 0bd5a63
    // ("Usunięcie wsparcia mobilnego"). If either side changes without
    // the other, this test fires.
    const os = String(jsonLd.operatingSystem);
    expect(os).toContain("Web");
    expect(os).not.toMatch(/\biOS\b/);
    expect(os).not.toMatch(/\bAndroid\b/);
  });

  it("homepage offers stay free in PLN", () => {
    const jsonLd = softwareApplicationJsonLd();
    const offers = jsonLd.offers as { price: string; priceCurrency: string };
    expect(offers.price).toBe("0");
    expect(offers.priceCurrency).toBe("PLN");
  });

  it("homepage URL never points to the editor or a sub-route", () => {
    const jsonLd = softwareApplicationJsonLd();
    // The /app route is noindexed and excluded from sitemap.xml. JSON-LD must
    // agree — point at the marketing root only.
    expect(jsonLd.url).toBe("https://dinboard.pl");
    expect(String(jsonLd.url)).not.toContain("/app");
    expect(String(jsonLd.url)).not.toContain("/poradniki");
    expect(String(jsonLd.url)).not.toContain("/kontakt");
  });

  it("blog index declares CollectionPage (not SoftwareApplication)", () => {
    const jsonLd = collectionPageJsonLd();
    expect(jsonLd["@type"]).toBe("CollectionPage");
    expect(jsonLd.url).toBe("https://dinboard.pl/poradniki");
  });

  it("article page emits BlogPosting + BreadcrumbList with correct URLs", () => {
    const blocks = articleJsonLdBlocks({
      slug: "jak-prawidlowo-rozplanowac-fazy-w-rozdzielnicy",
      title: "Jak prawidłowo rozplanować fazy w rozdzielnicy?",
      excerpt: "Równomierne obciążenie faz to podstawa stabilnej instalacji.",
      date: "2026-06-10",
      author: "Artur Tomaszewski",
    });
    expect(blocks).toHaveLength(2);

    const [blogPosting, breadcrumb] = blocks;
    expect(blogPosting["@type"]).toBe("BlogPosting");
    expect(blogPosting.url).toBe(
      "https://dinboard.pl/poradniki/jak-prawidlowo-rozplanowac-fazy-w-rozdzielnicy",
    );
    expect(blogPosting.headline).toContain("rozplanować fazy");
    expect(blogPosting.datePublished).toBe("2026-06-10");
    expect(blogPosting.inLanguage).toBe("pl");
    const author = blogPosting.author as { "@type": string; name: string };
    expect(author["@type"]).toBe("Person");
    expect(author.name).toBe("Artur Tomaszewski");

    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    const items = breadcrumb.itemListElement as Array<{
      "@type": string;
      position: number;
      name: string;
      item: string;
    }>;
    expect(items).toHaveLength(3);
    expect(items[0].item).toBe("https://dinboard.pl");
    expect(items[1].item).toBe("https://dinboard.pl/poradniki");
    expect(items[2].item).toBe(
      "https://dinboard.pl/poradniki/jak-prawidlowo-rozplanowac-fazy-w-rozdzielnicy",
    );
  });

  it("contact page declares ContactPage (not SoftwareApplication)", () => {
    const jsonLd = contactPageJsonLd();
    expect(jsonLd["@type"]).toBe("ContactPage");
    expect(jsonLd.url).toBe("https://dinboard.pl/kontakt");
  });

  it("about page declares AboutPage (not SoftwareApplication)", () => {
    const jsonLd = aboutPageJsonLd();
    expect(jsonLd["@type"]).toBe("AboutPage");
    expect(jsonLd.url).toBe("https://dinboard.pl/o-nas");
  });

  it("legal pages declare WebPage (not SoftwareApplication)", () => {
    const privacy = webPageJsonLd({
      title: "Polityka prywatności – DINBoard",
      description: "RODO i cookies",
      urlPath: "/polityka-prywatnosci",
    });
    expect(privacy["@type"]).toBe("WebPage");
    expect(privacy.url).toBe("https://dinboard.pl/polityka-prywatnosci");

    const terms = webPageJsonLd({
      title: "Regulamin – DINBoard",
      description: "Regulamin korzystania",
      urlPath: "/regulamin",
    });
    expect(terms["@type"]).toBe("WebPage");
    expect(terms.url).toBe("https://dinboard.pl/regulamin");
  });

  it("no two distinct pages share the same @type that maps to the same entity", () => {
    // The whole point of this refactor: a single page-type pair (homepage,
    // contact, about, privacy, terms) must each own a distinct @type so
    // Google doesn't see identical structured-data entities across the
    // site. This invariant catches accidental future copy-paste.
    const types = new Set<string>();
    const check = (type: string) => {
      expect(types.has(type)).toBe(false);
      types.add(type);
    };
    check(softwareApplicationJsonLd()["@type"]);
    check(contactPageJsonLd()["@type"]);
    check(aboutPageJsonLd()["@type"]);
    // Privacy & terms intentionally both use WebPage (different URL though,
    // so Google won't dedupe them).
    check(webPageJsonLd({ title: "a", description: "b", urlPath: "/x" })["@type"]);
  });
});
