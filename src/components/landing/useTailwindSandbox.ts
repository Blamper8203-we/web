import { useState, useEffect } from "react";

const TAILWIND_SCRIPT_ID = "tailwind-cdn-landing";

export function useTailwindSandbox() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!document.getElementById(TAILWIND_SCRIPT_ID)) {
      // Konfiguracja Tailwind przeniesiona do tailwind.config.js
      // Tailwind generowany w buildzie (import "./landing-tailwind.css" w PublicLandingPage.tsx)

      // Udajemy natychmiastową gotowość (nie czekamy na pobranie Tailwind CDN)
      setTimeout(() => setIsReady(true), 50);

      // Ikony Lucide z CDN
      const lucideScript = document.createElement("script");
      lucideScript.src = "https://unpkg.com/lucide@latest";
      lucideScript.onload = () => {
        if ((window as any).lucide) {
          (window as any).lucide.createIcons();
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
      if ((window as any).lucide) {
        setTimeout(() => (window as any).lucide.createIcons(), 50);
      }
    }

    return () => {
      // Skrypty zostawiamy na wypadek przejścia w tę i z powrotem, ale ich zakres i tak ogranicza się do #landing-page-root
    };
  }, []);

  return isReady;
}
