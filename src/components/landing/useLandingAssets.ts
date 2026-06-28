import { useState, useEffect } from "react";

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

    return () => {};
  }, []);

  return isReady;
}
