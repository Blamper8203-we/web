import { useState, useEffect } from "react";
import { type SymbolItem } from "../types/symbolItem";
import { getSymbolAssetUrl } from "../lib/connections/connectionsLogic";

export function useDinRailForegroundSvgs(symbols: SymbolItem[]) {
  const [foregroundUrls, setForegroundUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let isCancelled = false;
    let createdUrls: string[] = [];

    const fetchForegrounds = async () => {
      const newUrls: Record<string, string> = {};

      for (const symbol of symbols) {
        if (symbol.deviceKind === "terminalBlock") {
          try {
            const url = getSymbolAssetUrl(symbol);
            const response = await fetch(url);
            if (!response.ok) continue;
            const text = await response.text();

            // Sprawdzamy czy SVG ma element o id="niebieski1"
            if (text.includes('id="niebieski1"')) {
              // Ukrywamy tylko korpus (#niebieski1), zostawiajac mosiadz (#mosiadz).
              // Dzieki temu nie psujemy elementow w <defs> jak gradienty.
              const styleBlock = `<style>
                #niebieski1 { visibility: hidden; }
              </style>`;
              
              const modifiedSvg = text.replace("</svg>", `${styleBlock}</svg>`);
              
              const blob = new Blob([modifiedSvg], { type: "image/svg+xml" });
              const objectUrl = URL.createObjectURL(blob);
              newUrls[symbol.id] = objectUrl;
              createdUrls.push(objectUrl);
            }
          } catch (e) {
            console.error("Error fetching foreground SVG for", symbol.id, e);
          }
        }
      }

      if (!isCancelled) {
        setForegroundUrls(newUrls);
      }
    };

    fetchForegrounds();

    return () => {
      isCancelled = true;
      // Czyszczenie Blob URLs aby zapobiec wyciekom pamieci
      createdUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [symbols]);

  return foregroundUrls;
}
