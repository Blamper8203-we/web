import type { SymbolItem } from "../../../types/symbolItem";
import type { TerminalHotspot } from "./terminalTypes";
import { getMcbFallbackTerminals } from "./getMcbFallbackTerminals";
import { getRcdFallbackTerminals } from "./getRcdFallbackTerminals";
import { getSurgeProtectorFallbackTerminals } from "./getSurgeProtectorFallbackTerminals";
import { getSwitchDisconnectorFallbackTerminals } from "./getSwitchDisconnectorFallbackTerminals";
import { getTerminalBlockFallbackTerminals } from "./getTerminalBlockFallbackTerminals";
import { getMiscFallbackTerminals } from "./getMiscFallbackTerminals";

export function getFallbackTerminals(symbol: SymbolItem, poles: number, width: number, height: number): TerminalHotspot[] {
  // Proporcje oparte o dokładne pomiary z wbudowanych plików SVG
  const topY = height * 0.102;
  const bottomY = height * 0.898;

  // Helper do równomiernego rozmieszczania zacisków
  const getXForIndex = (index: number, count: number): number => {
    const sectionWidth = width / count;
    return sectionWidth * (index + 0.5);
  };

  const kind = symbol.deviceKind;

  if (kind === "mcb" || kind === "rcbo") {
    return getMcbFallbackTerminals(poles, topY, bottomY, getXForIndex);
  }
  
  if (kind === "rcd") {
    return getRcdFallbackTerminals(poles, width, topY, bottomY);
  }
  
  if (kind === "spd") {
    return getSurgeProtectorFallbackTerminals(poles, width, height, topY, bottomY, getXForIndex);
  }
  
  if (kind === "fr") {
    return getSwitchDisconnectorFallbackTerminals(poles, topY, bottomY, getXForIndex);
  }
  
  if (kind === "terminalBlock") {
    return getTerminalBlockFallbackTerminals(symbol, poles, width, height, getXForIndex);
  }
  
  return getMiscFallbackTerminals(symbol, width, height, topY, bottomY, getXForIndex);
}
