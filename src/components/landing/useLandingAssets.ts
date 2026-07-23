import { useState, useEffect } from "react";

// WHY: ładuje web-font Roboto z Google Fonts dla stron marketingowych (landing,
// blog, legal) i sygnalizuje `isReady` do pierwszego paintu. Ikony NIE są już
// ładowane z CDN — renderuje je inline komponent AppIcon (P3-6, patrz
// PLAN-ULEPSZEN.md). Dzięki temu strona nie zależy od runtime-owego
// `unpkg.com/lucide@latest` (niepinowana zależność zewnętrzna + dodatkowy
// round-trip). Google Fonts pozostaje osobnym, mniejszym zapachem CDN.
export function useLandingAssets() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);

    if (!document.getElementById("google-fonts-roboto")) {
      const fontLink = document.createElement("link");
      fontLink.id = "google-fonts-roboto";
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap";
      document.head.appendChild(fontLink);
    }
  }, []);

  return isReady;
}
