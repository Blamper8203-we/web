// WHY: schema.org JSON-LD in index.html tells Google which operating systems
// DINBoard supports — this drives rich-result carousels and app discovery.
// If we ever add Capacitor/iOS/Android support, this MUST stay in sync with
// TermsOfService.tsx (and vice-versa). This test pins the current state:
// no iOS/Android in operatingSystem, matching the Terms of Service that
// no longer advertises mobile support.

// WHY ?raw: Vitest runs in jsdom (no Node fs access), so we import the file
// content via Vite's ?raw query — same trick Vite uses for plain-text assets.
// Keeps the test free of @types/node dependency and works in any environment.
import indexHtmlRaw from "../../index.html?raw";
import { describe, it, expect } from "vitest";

function extractJsonLd(html: string): Record<string, unknown> {
  const match = html.match(
    /<script type="application\/ld\+json">\s*(\{[\s\S]*?\})\s*<\/script>/,
  );
  if (!match) {
    throw new Error("No JSON-LD block found in index.html");
  }
  return JSON.parse(match[1]);
}

describe("SEO JSON-LD schema.org in index.html", () => {
  it("declares SoftwareApplication", () => {
    const jsonLd = extractJsonLd(indexHtmlRaw);
    expect(jsonLd["@type"]).toBe("SoftwareApplication");
    expect(jsonLd.name).toBe("DINBoard Web");
    expect(jsonLd.url).toBe("https://dinboard.pl");
  });

  it("operatingSystem matches Terms of Service — no iOS or Android", () => {
    // TermsOfService.tsx removed mobile support in commit 0bd5a63
    // ("Usunięcie wsparcia mobilnego"). If either side changes without
    // the other, this test fires.
    const jsonLd = extractJsonLd(indexHtmlRaw);
    const os = String(jsonLd.operatingSystem);
    expect(os).toContain("Web");
    expect(os).not.toMatch(/\biOS\b/);
    expect(os).not.toMatch(/\bAndroid\b/);
  });

  it("offers.price stays 0 (DINBoard is free)", () => {
    const jsonLd = extractJsonLd(indexHtmlRaw);
    const offers = jsonLd.offers as { price: string; priceCurrency: string };
    expect(offers.price).toBe("0");
    expect(offers.priceCurrency).toBe("PLN");
  });

  it("URL points to the marketing domain, not the editor", () => {
    // The /app route is noindexed (see App.tsx AppRoute Helmet) and excluded
    // from sitemap.xml. JSON-LD must agree — point at the landing page.
    const jsonLd = extractJsonLd(indexHtmlRaw);
    expect(jsonLd.url).toBe("https://dinboard.pl");
    expect(String(jsonLd.url)).not.toContain("/app");
  });
});