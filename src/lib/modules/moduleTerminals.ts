import type { SymbolItem } from "../../types/symbolItem";
import { isDistributionBlockSymbol, getTerminalBlockCategory } from "../../types/symbolItem";
import { svgTerminalCache } from "./svgTerminalCache";
import type { TerminalHotspot } from "./terminals/terminalTypes";
import { getSymbolPoles } from "./terminals/terminalHelpers";
import { getFallbackTerminals } from "./terminals/terminalFallbackHeuristics";

export * from "./terminals/terminalTypes";
export * from "./terminals/terminalHelpers";

export function getSymbolTerminals(symbol: SymbolItem): TerminalHotspot[] {
  const cachedGroups = svgTerminalCache.get(symbol.moduleRef || symbol.visualPath || "");
  if (cachedGroups && cachedGroups.length > 0) {
    const hotspots: TerminalHotspot[] = [];
    const width = symbol.width;
    const height = symbol.height || 1103;

    const categoryEnum = getTerminalBlockCategory(symbol);
    const useMeet = !(
      (symbol.moduleRef || "").toLowerCase().includes("listwy do rozdzielnicy") ||
      (symbol.moduleRef || "").toLowerCase().includes("gsu") ||
      categoryEnum === "Blok rozdzielczy"
    );

    let vbWidth = 0;
    let vbHeight = 0;
    for (const group of cachedGroups) {
      if (group.viewBoxWidth && group.viewBoxHeight) {
        vbWidth = group.viewBoxWidth;
        vbHeight = group.viewBoxHeight;
        break;
      }
    }

    let scale = 1;
    let dx = 0;
    let dy = 0;
    if (useMeet && vbWidth > 0 && vbHeight > 0) {
      scale = Math.min(width / vbWidth, height / vbHeight);
      dx = (width - vbWidth * scale) / 2;
      dy = (height - vbHeight * scale) / 2;
    }

    for (const group of cachedGroups) {
      const type = group.prefix === "PE" ? "pe" : (group.prefix === "N" || group.prefix === "NG") ? "neutral" : "phase";
      
      for (const t of group.terminals) {
        let xPos, yPos, radius;
        if (useMeet && vbWidth > 0 && vbHeight > 0) {
          // Uniform scaling calculation (xMidYMid meet)
          const cx = t.xRatio * vbWidth;
          const cy = t.yRatio * vbHeight;
          xPos = dx + cx * scale;
          yPos = dy + cy * scale;
          // Radius is proportional to uniform scale
          radius = t.rRatio ? (t.rRatio * vbWidth) * scale : undefined;
        } else {
          // Stretched ("none") calculation
          xPos = width * t.xRatio;
          yPos = height * t.yRatio;
          radius = t.rRatio ? width * t.rRatio : undefined;
        }

        // Distribution blocks (e.g. "Blok rozdzielczy 4-7") always route wires
        // from the bottom of the module - it is the engineering convention
        // for these multi-section power distribution blocks where all 28
        // wires (4 groups x 7 pins) fan out below the block in a tight
        // column. Override the y-based heuristic for these symbols.
        const isDistribution = isDistributionBlockSymbol(symbol);
        const isTop = isDistribution ? false : t.yRatio < 0.5;
        hotspots.push({
          name: t.name,
          x: xPos,
          y: yPos,
          type: type,
          isTop: isTop,
          direction: isTop ? "top" : "bottom",
          visualInset: isTop ? yPos : height - yPos,
          radius: radius
        });
      }
    }
    return hotspots;
  }

  const poles = getSymbolPoles(symbol);
  const width = symbol.width;
  const height = symbol.height || 1103;

  return getFallbackTerminals(symbol, poles, width, height);
}
