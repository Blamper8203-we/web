import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./CookieConsent.css";

// WHY: Google AdSense requires explicit consent before personalised ads.
// We default to "denied" via Consent Mode v2 (in index.html) and only flip
// to "granted" when the user clicks "Akceptuję". "Tylko niezbędne" keeps
// the current default (denied) — AdSense still shows non-personalised ads.
// Stored in localStorage so we don't re-prompt on every visit; user can
// clear it via the browser to re-trigger the banner.

const CONSENT_KEY = "cookie_consent_v1";

type ConsentMode = "all" | "essential";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function applyConsent(mode: ConsentMode) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    ad_storage: mode === "all" ? "granted" : "denied",
    ad_user_data: mode === "all" ? "granted" : "denied",
    ad_personalization: mode === "all" ? "granted" : "denied",
    analytics_storage: "granted",
  });
}

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CONSENT_KEY);
      if (!stored) {
        setShow(true);
      } else {
        // Re-apply stored consent on every mount in case gtag didn't fire
        // yet (first SSR/SSG render before Analytics loaded).
        applyConsent(stored as ConsentMode);
      }
    } catch {
      // localStorage may throw in private mode — show banner so user is informed.
      setShow(true);
    }
  }, []);

  const save = (mode: ConsentMode) => {
    try {
      window.localStorage.setItem(CONSENT_KEY, mode);
    } catch {
      // ignore — consent still applied for the session via gtag
    }
    applyConsent(mode);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Zgoda na pliki cookies">
      <div className="cookie-banner__text">
        <p>
          Używamy lokalnego magazynu przeglądarki i anonimowych statystyk.
          W przyszłości planujemy wyświetlanie reklam (Google AdSense).
          Możesz wybrać, na co się zgadzasz.{" "}
          <Link to="/polityka-prywatnosci">Polityka prywatności</Link>
        </p>
      </div>
      <div className="cookie-banner__buttons">
        <button
          type="button"
          className="cookie-banner__btn cookie-banner__btn--secondary"
          onClick={() => save("essential")}
        >
          Tylko niezbędne
        </button>
        <button
          type="button"
          className="cookie-banner__btn cookie-banner__btn--primary"
          onClick={() => save("all")}
        >
          Akceptuję wszystkie
        </button>
      </div>
    </div>
  );
}