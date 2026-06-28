/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CookieConsent } from "./CookieConsent";

// WHY: Google AdSense disables ad personalisation when Consent Mode v2
// reports `denied`. If the banner wiring breaks (e.g. someone removes
// the gtag('consent', 'update', ...) call), the site would serve
// personalised ads without consent — a RODO violation that could also
// get the AdSense account flagged. These tests pin the three critical
// behaviours: banner visibility, persistence, and gtag wiring.

// jsdom does not implement scrollTo / matchMedia fully but CookieConsent
// doesn't touch either. We do need to stub gtag and a no-op localStorage
// is provided by jsdom natively.
beforeEach(() => {
  window.localStorage.clear();
  window.gtag = vi.fn();
});

describe("<CookieConsent />", () => {
  it("shows the banner when no prior consent is stored", () => {
    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("dialog", { name: /Zgoda na pliki cookies/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tylko niezbędne/i)).toBeInTheDocument();
    expect(screen.getByText(/Akceptuję wszystkie/i)).toBeInTheDocument();
  });

  it("hides the banner when consent was previously stored", () => {
    window.localStorage.setItem("cookie_consent_v1", "all");

    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("dialog", { name: /Zgoda na pliki cookies/i }),
    ).not.toBeInTheDocument();
  });

  it("clicking 'Akceptuję wszystkie' persists 'all' and grants ad_storage", () => {
    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText(/Akceptuję wszystkie/i));

    expect(window.localStorage.getItem("cookie_consent_v1")).toBe("all");
    expect(window.gtag).toHaveBeenCalledWith(
      "consent",
      "update",
      expect.objectContaining({
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
      }),
    );
    // Banner gone after click.
    expect(
      screen.queryByRole("dialog", { name: /Zgoda na pliki cookies/i }),
    ).not.toBeInTheDocument();
  });

  it("clicking 'Tylko niezbędne' persists 'essential' and denies ad_storage", () => {
    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText(/Tylko niezbędne/i));

    expect(window.localStorage.getItem("cookie_consent_v1")).toBe("essential");
    expect(window.gtag).toHaveBeenCalledWith(
      "consent",
      "update",
      expect.objectContaining({
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      }),
    );
  });

  it("contains a link to /polityka-prywatnosci", () => {
    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: /Polityka prywatności/i });
    expect(link).toHaveAttribute("href", "/polityka-prywatnosci");
  });

  it("does not crash if gtag is not defined (older browsers / before analytics script loads)", () => {
    // Real-world scenario: index.html loads Consent Mode v2 default first,
    // then gtag() becomes defined only after analytics.js loads. The banner
    // could mount between those two events. We must not throw.
    delete (window as { gtag?: unknown }).gtag;
    window.localStorage.setItem("cookie_consent_v1", "all");

    expect(() =>
      render(
        <MemoryRouter>
          <CookieConsent />
        </MemoryRouter>,
      ),
    ).not.toThrow();

    // And: clicking "Akceptuję wszystkie" must still persist the choice
    // even when gtag() is absent.
    window.localStorage.clear();
    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );

    act(() => {
      fireEvent.click(screen.getByText(/Akceptuję wszystkie/i));
    });

    expect(window.localStorage.getItem("cookie_consent_v1")).toBe("all");
  });
});