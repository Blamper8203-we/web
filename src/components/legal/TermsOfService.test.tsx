/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { TermsOfService } from "./TermsOfService";

// WHY: the Terms of Service is the only legal protection DINBoard has if an
// electrician uses the tool to design a faulty installation. Section 7
// (Użytkownik ponosi wyłączną odpowiedzialność…) is the load-bearing
// disclaimer — we pin it so it can't be silently edited away.

// react-helmet-async needs a HelmetProvider in tests — vite-react-ssg
// injects one at runtime, but the unit-test harness does not.
// MemoryRouter is needed because LandingHeader uses useLocation() to
// highlight the active nav item.
function renderWithHelmet(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <HelmetProvider>{ui}</HelmetProvider>
    </MemoryRouter>
  );
}

// Helper: scope queries to the rendered <article> (excludes Helmet's
// <head> injections like og:description meta tags).
function article() {
  return within(screen.getByRole("article"));
}

// WHY getAllByText: many legal terms legitimately recur inside one article
// (e.g. "Kodeksu cywilnego" appears in two different sections, both load-bearing).
// We assert presence (count >= 1) rather than uniqueness.

describe("<TermsOfService />", () => {
  it("renders without throwing", () => {
    expect(() => renderWithHelmet(<TermsOfService />)).not.toThrow();
  });

  it("identifies the operator as Artur Tomaszewski from Chocianów", () => {
    renderWithHelmet(<TermsOfService />);
    expect(article().getAllByText(/Artur Tomaszewski/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/Chocianowie/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/artur\.t8203@gmail\.com/i).length).toBeGreaterThanOrEqual(1);
  });

  it("states the app is provided as-is and as-available", () => {
    renderWithHelmet(<TermsOfService />);
    // Load-bearing phrase: "Aplikacja jest dostarczana 'tak jak jest'".
    // If anyone softens this (e.g. to "w zasadzie wolna od błędów"),
    // the test fails.
    expect(
      article().getAllByText(/Aplikacja jest dostarczana .tak jak jest./i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("places full responsibility on the user for project compliance", () => {
    renderWithHelmet(<TermsOfService />);
    expect(
      article().getAllByText(/Użytkownik ponosi wyłączną odpowiedzialność za/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/PN-HD 60364/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/uprawnieniami/i).length).toBeGreaterThanOrEqual(1);
  });

  it("limits liability to 0 PLN (free product)", () => {
    renderWithHelmet(<TermsOfService />);
    expect(article().getAllByText(/odpowiedzialność Operatora jest ograniczona/i).length).toBeGreaterThanOrEqual(1);
    expect(article().getAllByText(/0 PLN/i).length).toBeGreaterThanOrEqual(1);
  });

  it("does not contain a RODO complaint channel (that belongs in Privacy Policy)", () => {
    // Sanity guard: Terms of Service should NOT have a UODO section.
    // If someone copy-pastes from Privacy Policy, this test catches it.
    renderWithHelmet(<TermsOfService />);
    expect(article().queryByText(/Prezesa UODO/i)).not.toBeInTheDocument();
  });

  it("names Polish governing law", () => {
    renderWithHelmet(<TermsOfService />);
    expect(article().getAllByText(/Kodeksu cywilnego/i).length).toBeGreaterThanOrEqual(1);
  });
});