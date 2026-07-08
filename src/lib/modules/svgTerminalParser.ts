import { svgTerminalCache, type CachedTerminalGroup } from "./svgTerminalCache";
import { loadRawSvg } from "./svgAsset";
import { reportRuntimeError } from "../runtimeDiagnostics";

/**
 * Parsuje kod SVG lub pobiera go z URLa i wyciąga współrzędne grup terminali.
 */
export async function parseSvgForTerminals(urlOrRawSvg: string, moduleRef: string): Promise<void> {
  // Jeśli już jest w cache albo w trakcie ładowania, ignorujemy
  if (svgTerminalCache.get(moduleRef) || svgTerminalCache.isLoading(moduleRef)) {
    return;
  }

  svgTerminalCache.markLoading(moduleRef);

  try {
    let svgText = urlOrRawSvg;

    if (urlOrRawSvg.startsWith("data:image/svg+xml")) {
      const commaIndex = urlOrRawSvg.indexOf(",");
      if (commaIndex !== -1) {
        const payload = urlOrRawSvg.slice(commaIndex + 1);
        try {
          if (urlOrRawSvg.includes(";base64")) {
            svgText = atob(payload);
          } else {
            svgText = decodeURIComponent(payload);
          }
        } catch (e) {
          reportRuntimeError(e, { source: "unhandled-error" });
        }
      }
    } else if (urlOrRawSvg.startsWith("/") || (urlOrRawSvg.includes(".svg") && !urlOrRawSvg.includes("image/svg+xml"))) {
      const isAbsolute = urlOrRawSvg.startsWith("http") || urlOrRawSvg.startsWith("/");
      // Używamy encodeURI, ale zachowujemy ukośniki (slash) 
      const fetchUrl = isAbsolute ? urlOrRawSvg : encodeURI(`/assets/modules/${urlOrRawSvg}`);
      
      svgText = await loadRawSvg(fetchUrl);
    }

    if (!svgText.includes("<svg")) {
      throw new Error("Invalid SVG content");
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const svgRoot = doc.documentElement as unknown as SVGSVGElement;

    if (svgRoot.tagName.toLowerCase() !== "svg") {
      throw new Error("Root element is not SVG");
    }

    // Odczyt viewBox
    const viewBoxStr = svgRoot.getAttribute("viewBox");
    let vbWidth = 0;
    let vbHeight = 0;
    let vbX = 0;
    let vbY = 0;

    if (viewBoxStr) {
      const parts = viewBoxStr.split(/[\s,]+/).map(Number);
      if (parts.length >= 4) {
        vbX = parts[0];
        vbY = parts[1];
        vbWidth = parts[2];
        vbHeight = parts[3];
      }
    } else {
      // Fallback do width / height jeśli brak viewBox
      vbWidth = parseFloat(svgRoot.getAttribute("width") || "1000");
      vbHeight = parseFloat(svgRoot.getAttribute("height") || "1000");
    }

    if (vbWidth <= 0 || vbHeight <= 0) {
      throw new Error("Invalid SVG dimensions");
    }

    const groups: CachedTerminalGroup[] = [];
    const usedCircles = new Set<Element>();

    // Szukamy elementów <g> z id pasującym do "Grupa L1", "Grupa N", itp.
    const allGroups = Array.from(svgRoot.querySelectorAll("g"));
    for (const g of allGroups) {
      const id = g.getAttribute("id") || g.getAttribute("serif:id") || "";
      
      // Matchuje np. "Grupa-L1", "Grupa L1", "grupa_L1", "Grupa-N", "Grupa PE"
      const match = id.match(/grupa[-\s_]?([A-Za-z0-9]+)/i);
      
      if (match) {
        const prefix = match[1].toUpperCase(); // np. "L1", "N"
        
        // Znajdźmy wszystkie kółka wewnątrz grupy
        const circles = Array.from(g.querySelectorAll("circle"));
        if (circles.length > 0) {
          circles.forEach(c => usedCircles.add(c));
          const parsedCircles = circles.map(c => {
            return {
              id: c.getAttribute("id") || c.getAttribute("serif:id") || "",
              cx: parseFloat(c.getAttribute("cx") || "0"),
              cy: parseFloat(c.getAttribute("cy") || "0"),
              r: parseFloat(c.getAttribute("r") || "0")
            };
          }).filter(c => !isNaN(c.cx) && !isNaN(c.cy));

          // Sortowanie od lewej do prawej
          parsedCircles.sort((a, b) => a.cx - b.cx);

          const terminals = parsedCircles.map((c, index) => {
            // Relatywna pozycja 0.0 - 1.0
            const xRatio = (c.cx - vbX) / vbWidth;
            const yRatio = (c.cy - vbY) / vbHeight;
            const rRatio = c.r > 0 ? c.r / vbWidth : undefined;

            return {
              name: c.id || `${prefix}-${index + 1}`,
              xRatio,
              yRatio,
              rRatio
            };
          });

          groups.push({
            prefix,
            viewBoxWidth: vbWidth,
            viewBoxHeight: vbHeight,
            terminals
          });
        }
      }
    }

    // Dodatkowa heurystyka: szukamy kółek i elementów <use> poza grupami, które mają id sugerujące terminal
    const standaloneElements = [
      ...Array.from(svgRoot.querySelectorAll("circle")).filter(c => !usedCircles.has(c)),
      ...Array.from(svgRoot.querySelectorAll("use")),
      ...Array.from(svgRoot.querySelectorAll("rect"))
    ];

    const standaloneByPrefix: Record<string, any[]> = {};
    
    for (const el of standaloneElements) {
      const id = el.getAttribute("id") || el.getAttribute("serif:id") || "";
      
      let prefix = "";
      let isTerminalMatch = false;

      // Matchuje np. IN1, OUT2, L1, PE, N. Ignoruje np. "Terminal-1" żeby nie psuć fallbacków (np. GSU)
      const match = id.match(/^(IN|OUT|L\d?|N|PE)[-\s_]?(\d*)$/i);
      if (match) {
        prefix = match[1].toUpperCase();
        isTerminalMatch = true;
      } else {
        // Obsługa warstw z Affinity: "terminal N", "terminal L", "terminal -V pin3", "terminal +V"
        const termMatch = id.match(/^terminal[-\s_]*([+\-]?V|IN|OUT|L\d?|N|PE)(?:[-\s_]*pin)?(\d*)$/i);
        if (termMatch) {
          const rawPrefix = termMatch[1].toUpperCase();
          prefix = (rawPrefix === "-V" || rawPrefix === "+V" || rawPrefix === "V") ? "OUT" : rawPrefix;
          isTerminalMatch = true;
        }
      }

      if (isTerminalMatch) {
        let cx = 0, cy = 0, r = 0;
        if (el.tagName.toLowerCase() === "circle") {
          cx = parseFloat(el.getAttribute("cx") || "0");
          cy = parseFloat(el.getAttribute("cy") || "0");
          r = parseFloat(el.getAttribute("r") || "0");
        } else {
          const x = parseFloat(el.getAttribute("x") || "0");
          const y = parseFloat(el.getAttribute("y") || "0");
          const w = parseFloat(el.getAttribute("width") || "0");
          const h = parseFloat(el.getAttribute("height") || "0");
          cx = x + w / 2;
          cy = y + h / 2;
          r = Math.min(w, h) / 2;
        }

        if (!standaloneByPrefix[prefix]) {
          standaloneByPrefix[prefix] = [];
        }
        standaloneByPrefix[prefix].push({
          id, cx, cy, r
        });
      }
    }

    for (const prefix of Object.keys(standaloneByPrefix)) {
      const circles = standaloneByPrefix[prefix].filter((c: any) => !isNaN(c.cx) && !isNaN(c.cy));
      if (circles.length > 0) {
        circles.sort((a: any, b: any) => a.cx - b.cx);

        // Deduplikacja nałożonych na siebie punktów (np. circle i use dla tego samego pinu)
        const uniqueCircles: any[] = [];
        for (const c of circles) {
          const duplicate = uniqueCircles.find(uc => 
            Math.abs(uc.cx - c.cx) < 5 && 
            Math.abs(uc.cy - c.cy) < 5
          );
          if (!duplicate) {
            uniqueCircles.push(c);
          } else {
            const isCurrentTerminal = c.id.toLowerCase().startsWith("terminal");
            const isExistingTerminal = duplicate.id.toLowerCase().startsWith("terminal");
            if (isExistingTerminal && !isCurrentTerminal) {
              duplicate.id = c.id;
              duplicate.cx = c.cx;
              duplicate.cy = c.cy;
              duplicate.r = c.r;
            }
          }
        }

        let group = groups.find(g => g.prefix === prefix);
        if (!group) {
          group = {
            prefix,
            viewBoxWidth: vbWidth,
            viewBoxHeight: vbHeight,
            terminals: []
          };
          groups.push(group);
        }

        const newTerminals = uniqueCircles.map((c: any, index: number) => {
          const xRatio = (c.cx - vbX) / vbWidth;
          const yRatio = (c.cy - vbY) / vbHeight;
          const rRatio = c.r > 0 ? c.r / vbWidth : undefined;

          return {
            name: c.id || `${prefix}-${group!.terminals.length + index + 1}`,
            xRatio,
            yRatio,
            rRatio
          };
        });

        group.terminals.push(...newTerminals);
      }
    }

    if (groups.length > 0) {
      svgTerminalCache.set(moduleRef, groups);
    }

  } catch (err) {
    reportRuntimeError(err, { source: "unhandled-error" });
  }
}
