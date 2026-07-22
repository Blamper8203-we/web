import { useState, useEffect } from "react";

// WHY: `lucide` to globalna zmienna wstrzykiwana przez skrypt z CDN (unpkg) —
// brak paczki npm i typów. Deklaracja ambient zastępuje `as any` przy każdym
// dostępie; jedyne używane pole to createIcons(). Uwaga (P3): runtime-CDN
// `lucide@latest` + Google Fonts to niepinowana zależność zewnętrzna.
declare global {
  interface Window {
    lucide?: { createIcons: () => void };
  }
}

export function useLandingAssets() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!document.getElementById("landing-lucide-icons")) {
      setTimeout(() => setIsReady(true), 50);

      // Ikony Lucide z CDN
      const lucideScript = document.createElement("script");
      lucideScript.id = "landing-lucide-icons";
      lucideScript.src = "https://unpkg.com/lucide@latest";
      lucideScript.onload = () => {
        if (window.lucide) {
          window.lucide.createIcons();
        }
      };
      document.head.appendChild(lucideScript);

      if (!document.getElementById("google-fonts-roboto")) {
        const fontLink = document.createElement("link");
        fontLink.id = "google-fonts-roboto";
        fontLink.rel = "stylesheet";
        fontLink.href = "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap";
        document.head.appendChild(fontLink);
      }
    } else {
      setIsReady(true);
      // WHY: przechwyć referencję po guardzie — zawężenie z `if` nie przechodzi
      // do domknięcia setTimeout (window.lucide mogłoby być undefined w chwili
      // odpalenia timera). Stare `as any` cicho maskowało ten przypadek.
      const lucide = window.lucide;
      if (lucide) {
        setTimeout(() => lucide.createIcons(), 50);
      }
    }

    return () => {};
  }, []);

  return isReady;
}
