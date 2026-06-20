import { useState, useEffect } from "react";

const TAILWIND_SCRIPT_ID = "tailwind-cdn-landing";

export function useTailwindSandbox() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!document.getElementById(TAILWIND_SCRIPT_ID)) {
      const configScript = document.createElement("script");
      configScript.innerHTML = `
        window.tailwind = {
          config: {
            important: '#landing-page-root',
            corePlugins: {
              preflight: false,
            },
            theme: {
              extend: {
                fontFamily: {
                  sans: ['Roboto', 'sans-serif'],
                  mono: ['Fira Code', 'monospace'],
                },
                colors: {
                  brand: {
                    bg: '#090D16',
                    card: '#111827',
                    accent: '#F59E0B',
                    blueNeon: '#3B82F6',
                    success: '#10B981'
                  }
                }
              }
            }
          }
        };
      `;
      document.head.appendChild(configScript);

      const script = document.createElement("script");
      script.id = TAILWIND_SCRIPT_ID;
      script.src = "https://cdn.tailwindcss.com";
      script.onload = () => {
        // Małe opóźnienie, aby dać Tailwindowi czas na przetworzenie klas
        setTimeout(() => setIsReady(true), 150);
      };
      document.head.appendChild(script);

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
