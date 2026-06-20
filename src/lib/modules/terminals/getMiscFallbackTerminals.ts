import type { SymbolItem } from "../../../types/symbolItem";
import type { TerminalHotspot } from "./terminalTypes";
import { normalizePathText } from "./terminalHelpers";

export function getMiscFallbackTerminals(
  symbol: SymbolItem,
  width: number,
  height: number,
  topY: number,
  bottomY: number,
  getXForIndex: (index: number, count: number) => number
): TerminalHotspot[] {
  const hotspots: TerminalHotspot[] = [];
  const kind = symbol.deviceKind;

  if (kind === "phaseIndicator") {
    const phaseRef = normalizePathText(symbol.moduleRef || symbol.visualPath || "");
    if (phaseRef.includes("lampka kontrolna")) {
      hotspots.push({ name: "1",   x: width * 0.2528, y: height * 0.0651, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0651 });
      hotspots.push({ name: "3",   x: width * 0.7474, y: height * 0.0651, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0651 });
      hotspots.push({ name: "L1",  x: width * 0.2528, y: height * 0.0651, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0651 });
      hotspots.push({ name: "L1'", x: width * 0.7474, y: height * 0.0651, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0651 });

      hotspots.push({ name: "4",   x: width * 0.2606, y: height * 0.1733, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0613 });
      hotspots.push({ name: "6",   x: width * 0.7394, y: height * 0.1733, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0613 });
      hotspots.push({ name: "N",   x: width * 0.2606, y: height * 0.1733, type: "neutral", isTop: true,  direction: "top",    visualInset: height * 0.0613 });
      hotspots.push({ name: "N'",  x: width * 0.7394, y: height * 0.1733, type: "neutral", isTop: true,  direction: "top",    visualInset: height * 0.0613 });

      hotspots.push({ name: "7",   x: width * 0.2528, y: height * 0.8144, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0611 });
      hotspots.push({ name: "9",   x: width * 0.7474, y: height * 0.8144, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0611 });
      hotspots.push({ name: "L3",  x: width * 0.2528, y: height * 0.8144, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0611 });
      hotspots.push({ name: "L3'", x: width * 0.7474, y: height * 0.8144, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0611 });

      hotspots.push({ name: "10",  x: width * 0.2528, y: height * 0.9349, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0651 });
      hotspots.push({ name: "12",  x: width * 0.7474, y: height * 0.9349, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0651 });
      hotspots.push({ name: "L2",  x: width * 0.2528, y: height * 0.9349, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0651 });
      hotspots.push({ name: "L2'", x: width * 0.7474, y: height * 0.9349, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0651 });
    } else {
      hotspots.push({ name: "L1", x: width * 0.7726, y: height * 0.0517, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0517 });
      hotspots.push({ name: "N",  x: width * 0.5171, y: height * 0.1630, type: "neutral", isTop: true,  direction: "top",    visualInset: height * 0.0590 });
      hotspots.push({ name: "L2", x: width * 0.4955, y: height * 0.8359, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0595 });
      hotspots.push({ name: "L3", x: width * 0.7727, y: height * 0.9524, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0476 });
    }
  } else if (normalizePathText(symbol.moduleRef || "").includes("zabezpieczajacy") || normalizePathText(symbol.moduleRef || "").includes("zabezpieczenia")) {
    hotspots.push({ name: "1",   x: width * 0.2528, y: height * 0.0651, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0651 });
    hotspots.push({ name: "3",   x: width * 0.7474, y: height * 0.0651, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0651 });
    hotspots.push({ name: "L1",  x: width * 0.2528, y: height * 0.0651, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0651 });
    hotspots.push({ name: "L1'", x: width * 0.7474, y: height * 0.0651, type: "phase",   isTop: true,  direction: "top",    visualInset: height * 0.0651 });

    hotspots.push({ name: "7",   x: width * 0.2528, y: height * 0.8144, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0611 });
    hotspots.push({ name: "9",   x: width * 0.7474, y: height * 0.8144, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0611 });
    hotspots.push({ name: "L3",  x: width * 0.2528, y: height * 0.8144, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0611 });
    hotspots.push({ name: "L3'", x: width * 0.7474, y: height * 0.8144, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0611 });

    hotspots.push({ name: "10",  x: width * 0.2528, y: height * 0.9349, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0651 });
    hotspots.push({ name: "12",  x: width * 0.7474, y: height * 0.9349, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0651 });
    hotspots.push({ name: "L2",  x: width * 0.2528, y: height * 0.9349, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0651 });
    hotspots.push({ name: "L2'", x: width * 0.7474, y: height * 0.9349, type: "phase",   isTop: false, direction: "bottom", visualInset: height * 0.0651 });
  } else if (symbol.type.toLowerCase().includes("blok") || normalizePathText(symbol.moduleRef || "").includes("7pin") || normalizePathText(symbol.moduleRef || "").includes("7 pin")) {
    const pathLower = normalizePathText(symbol.moduleRef || symbol.visualPath || "");
    if (pathLower.includes("7 pin") || pathLower.includes("7pin") || pathLower.includes("4-7") || pathLower.includes("4_7") || pathLower.includes("4x7")) {
      const yCoords = [420, 615, 810, 1005];
      const xCoords = [180, 280, 380, 480, 580, 680, 780];
      
      for (let i = 0; i < 7; i++) {
        hotspots.push({ name: `L1-${i+1}`, x: xCoords[i], y: yCoords[0], type: "phase", isTop: true });
      }
      for (let i = 0; i < 7; i++) {
        hotspots.push({ name: `L2-${i+1}`, x: xCoords[i], y: yCoords[1], type: "phase", isTop: true });
      }
      for (let i = 0; i < 7; i++) {
        hotspots.push({ name: `L3-${i+1}`, x: xCoords[i], y: yCoords[2], type: "phase", isTop: false });
      }
      for (let i = 0; i < 7; i++) {
        hotspots.push({ name: `N-${i+1}`, x: xCoords[i], y: yCoords[3], type: "neutral", isTop: false });
      }
    } else {
      hotspots.push({ name: "L1", x: getXForIndex(0, 2), y: topY, type: "phase", isTop: true });
      hotspots.push({ name: "L2", x: getXForIndex(1, 2), y: topY, type: "phase", isTop: true });
      hotspots.push({ name: "L3", x: getXForIndex(0, 4), y: bottomY, type: "phase", isTop: false });
      hotspots.push({ name: "N", x: getXForIndex(1, 4), y: bottomY, type: "neutral", isTop: false });
      hotspots.push({ name: "PE", x: getXForIndex(2, 4), y: bottomY, type: "pe", isTop: false });
      hotspots.push({ name: "PE2", x: getXForIndex(3, 4), y: bottomY, type: "pe", isTop: false });
    }
  } else {
    // Domyślny aparat inny (1-biegunowy)
    hotspots.push({ name: "1", x: width / 2, y: topY, type: "phase", isTop: true });
    hotspots.push({ name: "2", x: width / 2, y: bottomY, type: "phase", isTop: false });
  }

  return hotspots;
}
