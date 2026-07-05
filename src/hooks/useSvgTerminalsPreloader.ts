import { useEffect, useState } from "react";
import type { SymbolItem } from "../types/symbolItem";
import { parseSvgForTerminals } from "../lib/modules/svgTerminalParser";
import { svgTerminalCache } from "../lib/modules/svgTerminalCache";

export function useSvgTerminalsPreloader(symbols: SymbolItem[]) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;

    const checkAndPreload = async () => {
      let anyLoaded = false;
      for (const sym of symbols) {
        const ref = sym.moduleRef || sym.visualPath;
        const visualPath = sym.visualPath || "";
        if (!ref) continue;
        
        // Chcemy przetwarzać tylko bloki rozdzielcze lub obiekty, w których spodziewamy się grup
        const isTerminalBlock = sym.deviceKind === "terminalBlock" || 
                                sym.type?.toLowerCase().includes("blok rozdzielczy") ||
                                ref.toLowerCase().includes("blok rozdzielczy") ||
                                visualPath.toLowerCase().includes("blok rozdzielczy") ||
                                sym.type?.toLowerCase().includes("przełącznik sieci") ||
                                ref.toLowerCase().includes("przelacznik sieci") ||
                                ref.toLowerCase().includes("przelacznik siec") ||
                                sym.type?.toLowerCase().includes("smart home") ||
                                ref.toLowerCase().includes("smart home");
                                
        if (isTerminalBlock) {
          if (!svgTerminalCache.get(ref) && !svgTerminalCache.isLoading(ref)) {
            // Jeśli visualPath to data URI (np. dla importowanych modułów), używamy go jako źródła SVG
            const source = visualPath.startsWith("data:") ? visualPath : ref;
            await parseSvgForTerminals(source, ref);
            anyLoaded = true;
          }
        }
      }

      if (active && anyLoaded) {
        setVersion(v => v + 1);
      }
    };

    checkAndPreload();

    return () => {
      active = false;
    };
  }, [symbols]);

  useEffect(() => {
    const unsubscribe = svgTerminalCache.subscribe(() => {
      setVersion(v => v + 1);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return version;
}
