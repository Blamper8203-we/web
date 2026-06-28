/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { PrivacyPolicy } from "./PrivacyPolicy";

// WHY: legal documents are static text but a stray deletion or i18n slip can
// silently strip required RODO disclosures. These tests pin the structure
// so the document can't lose mandatory sections (data controller identity,
// legal basis, user rights) without a test failure.

// react-helmet-async needs a HelmetProvider in tests — vite-react-ssg
// injects one at runtime, but the unit-test harness does not.
function renderWithHelmet(ui: React.ReactElement) {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
}

// Helper: scope queries to the rendered <article> (excludes Helmet's
// <head> injections like og:description meta tags).
function article() {
  return within(screen.getByRole("article"));
}

// WHY getAllByText: many legal terms legitimately recur inside one article
// (e.g. "Dane projektowe" appears as both a section heading and a list item).
// We assert presence (count >= 1) rather than uniqueness.

describe("<PrivacyPolicy />", () => {
  it("renders without throwing", () => {
    expect(() => renderWithHelmet(<PrivacyPolicy />)).not.toThrow();
  });

  it("identifies the data controller as Artur Tomaszewski from Chocianów", () => {
    renderWithHelmet(<PrivacyPolicy />);
    expect(article().getAllByText(/Artur Tomaszewski/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/Chocianowie/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/artur\.t8203@gmail\.com/i).length).toBeGreaterThanOrEqual(1);
  });

  it("discloses every category of data collected (RODO Art. 13)", () => {
    renderWithHelmet(<PrivacyPolicy />);
    expect(article().getAllByText(/Dane projektowe/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/Vercel Analytics/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/Google AdSense/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/Web3Forms/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/Czcionki Google/i).length).toBeGreaterThanOrEqual(1);
  });

  it("states legal bases for processing (RODO Art. 6)", () => {
    renderWithHelmet(<PrivacyPolicy />);
    expect(article().getAllByText(/Podstawa prawna przetwarzania/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/art\. 6 ust\. 1 lit\. a\) RODO/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/art\. 6 ust\. 1 lit\. f\) RODO/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/art\. 6 ust\. 1 lit\. b\) RODO/i).length).toBeGreaterThanOrEqual(1);
  });

  it("enumerates user rights (RODO Art. 15–21)", () => {
    renderWithHelmet(<PrivacyPolicy />);
    expect(article().getAllByText(/dostępu do swoich danych/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/sprostowania danych/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/usunięcia danych/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/przenoszenia danych/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/sprzeciwu wobec przetwarzania/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/Prezesa UODO/i).length).toBeGreaterThanOrEqual(1);
  });

  it("classifies cookies by category", () => {
    renderWithHelmet(<PrivacyPolicy />);
    expect(article().getAllByText(/Pliki cookies/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/Niezbędne/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/Analityczne/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/Reklamowe/i).length).toBeGreaterThanOrEqual(1);
  });

  it("states that the operator is an osoba fizyczna (no registered business)", () => {
    renderWithHelmet(<PrivacyPolicy />);
    // Section 1 explicitly says the operator runs DINBoard as a private
    // individual. If anyone replaces this with corporate boilerplate
    // ("spółka z o.o.", "NIP: …", "REGON: …" in the data-controller
    // section), this test fails — that's a tax/legal status change, not
    // a cosmetic edit.
    expect(
      article().getAllByText(/osoba fizyczna, bez zarejestrowanej działalności gospodarczej/i).length,
    ).toBeGreaterThanOrEqual(1);
    // Sanity: NIP appears in section 2.1 (describing what users may input
    // as contractor metadata) but never in section 1 (data controller).
    const sectionOne = screen.getByText(/Administratorem Twoich danych osobowych jest/i)
      .closest("section");
    expect(sectionOne?.textContent ?? "").not.toMatch(/\bNIP\b/);
    expect(sectionOne?.textContent ?? "").not.toMatch(/\bREGON\b/);
  });
});