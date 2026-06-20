import { useState, useEffect } from "react";
import { type SymbolItem } from "../types/symbolItem";
import { getSymbolAssetUrl } from "../lib/connections/canvasHelpers";

/** WHY: DinRailRenderedSymbols renders raw SVG via <image href>. For blok rozdzielczy the SVG
 *  contains an <g id="Osłona"> cover group on top of the terminals.
 *  The layering contract is:
 *    - baseModifiedUrls[id] = SVG with Osłona hidden → shows bare terminals (always)
 *    - foregroundUrls[id]   = SVG with Tył-obudowy hidden → shows only Osłona floating on top
 *                             (only when BLUE_COVER_VISIBILITY !== "hidden")
 *  When the user toggles "Zdejmij osłonę":
 *    - baseModifiedUrls still hides Osłona in the base layer (correct, bare terminals visible)
 *    - foregroundUrls is NOT generated → Osłona disappears completely
 */
export function useDinRailForegroundSvgs(symbols: SymbolItem[]) {
  const [foregroundUrls, setForegroundUrls] = useState<Record<string, string>>({});
  const [baseModifiedUrls, setBaseModifiedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let isCancelled = false;
    const createdUrls: string[] = [];

    const fetchForegrounds = async () => {
      const newFg: Record<string, string> = {};
      const newBase: Record<string, string> = {};

      for (const symbol of symbols) {
        if (symbol.deviceKind === "terminalBlock" || symbol.deviceKind === "other") {
          try {
            const url = getSymbolAssetUrl(symbol);
            const response = await fetch(url);
            if (!response.ok) continue;
            const text = await response.text();

            if (text.includes('id="Oslona"') || text.includes('id="Osłona"')) {
              // ── Base layer: always hide the Osłona group so bare terminals show ──
              const baseStyle = `<style>
                #Osłona, [id="Osłona"], #Oslona, [id="Oslona"],
                #Grupa-N, [id="Grupa N"], #Grupa-L3, [id="Grupa L3"],
                #Grupa-L2, [id="Grupa L2"], #Grupa-L1, [id="Grupa L1"] { visibility: hidden; }
              </style>`;
              const modifiedBase = text.replace("</svg>", `${baseStyle}</svg>`);
              const baseBlob = new Blob([modifiedBase], { type: "image/svg+xml" });
              const baseUrl = URL.createObjectURL(baseBlob);
              newBase[symbol.id] = baseUrl;
              createdUrls.push(baseUrl);

              // ── Foreground layer: always generate it, so plastic parts / brass are drawn over wires ──
              const isCoverHidden = symbol.parameters?.BLUE_COVER_VISIBILITY === "hidden" || symbol.parameters?.BLUE_COVER_VISIBILITY === "none";
              
              // Hide background backing (so wires under it are not covered by the block's body).
              // Also conditionally hide the main cover based on user toggle.
              const fgStyle = `<style>
                #Background, #Tył-obudowy, #Tył\\ obudowy, [id="Tył-obudowy"], [id="Tył obudowy"] { visibility: hidden; }
                ${isCoverHidden ? '#Osłona, [id="Osłona"], #Oslona, [id="Oslona"] { visibility: hidden; }' : ''}
              </style>`;
              
              const modifiedFg = text.replace("</svg>", `${fgStyle}</svg>`);
              const fgBlob = new Blob([modifiedFg], { type: "image/svg+xml" });
              const fgUrl = URL.createObjectURL(fgBlob);
              newFg[symbol.id] = fgUrl;
              createdUrls.push(fgUrl);
            }
            // Sprawdzamy czy SVG ma element o id="niebieski1"
            else if (text.includes('id="niebieski1"')) {
              // Ukrywamy tylko korpus (#niebieski1), zostawiajac mosiadz (#mosiadz).
              // Dzieki temu nie psujemy elementow w <defs> jak gradienty.
              const styleBlock = `<style>
                #niebieski1 { visibility: hidden; }
              </style>`;
              
              const modifiedSvg = text.replace("</svg>", `${styleBlock}</svg>`);
              
              const blob = new Blob([modifiedSvg], { type: "image/svg+xml" });
              const objectUrl = URL.createObjectURL(blob);
              newFg[symbol.id] = objectUrl;
              createdUrls.push(objectUrl);
            }
          } catch (e) {
            console.error("Error fetching foreground SVG for", symbol.id, e);
          }
        }
      }

      if (!isCancelled) {
        setForegroundUrls(newFg);
        setBaseModifiedUrls(newBase);
      }
    };

    fetchForegrounds();

    return () => {
      isCancelled = true;
      // Czyszczenie Blob URLs aby zapobiec wyciekom pamieci
      createdUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [symbols]);

  return { foregroundUrls, baseModifiedUrls };
}
