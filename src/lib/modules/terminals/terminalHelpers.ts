import type { SymbolItem } from "../../../types/symbolItem";
import { isDistributionBlockSymbol } from "../../../types/symbolItem";
import type { TerminalHotspot } from "./terminalTypes";

export function normalizePathText(text: string): string {
  try {
    text = decodeURIComponent(text);
  } catch {
    // Ignore decoding errors
  }
  return text
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getSymbolPoles(symbol: SymbolItem): number {
  const value = `${normalizePathText(symbol.moduleRef || symbol.visualPath || "")} ${symbol.type} ${symbol.label}`.toLowerCase();
  
  // Check for explicit poles in path or type (e.g. "3P", "4P", "1P")
  const poleMatch = value.match(/(\d)\s*-?\s*p/);
  if (poleMatch) {
    const poles = parseInt(poleMatch[1], 10);
    if (poles >= 1 && poles <= 4) return poles;
  }

  // Fallbacks based on device category
  if (symbol.deviceKind === "rcd") {
    return symbol.phase.includes("L1+L2+L3") || symbol.phase.includes("3F") ? 4 : 2;
  }
  
  if (symbol.deviceKind === "spd") {
    return symbol.phase.includes("L1+L2+L3") || symbol.phase.includes("3F") ? 4 : 2;
  }
  
  if (symbol.deviceKind === "fr") {
    return symbol.phase.includes("L1+L2+L3") || symbol.phase.includes("3F") ? 4 : 3;
  }

  // Fallback based on width-to-height ratio (assuming standard height around 1100)
  if (symbol.height > 0) {
    const ratio = symbol.width / symbol.height;
    if (ratio < 0.15) return 1; // Bardzo wąski (np. terminal block 0.5 modułu)
    if (ratio < 0.3) return 1;  // 1 moduł
    if (ratio < 0.55) return 2; // 2 moduły
    if (ratio < 0.75) return 3; // 3 moduły
    return 4;                   // 4 moduły
  }
  return 1;
}

export function findTerminalByName(terminals: TerminalHotspot[], terminalName: string, isTop?: boolean): TerminalHotspot | undefined {
  return terminals.find(t => t.name === terminalName && (isTop === undefined || t.isTop === isTop)) || terminals.find(t => t.name === terminalName);
}

/**
 * Runtime override for connection.isFromTop: distribution-block pins MUST
 * always route from the bottom, even if a stored project file still has the
 * old isFromTop:true value.  Centralised so every renderer agrees.
 */
export function resolveConnectionIsFromTop(
  symbol: SymbolItem | undefined,
  storedIsFromTop: boolean | undefined,
  hotspot: TerminalHotspot | undefined,
): boolean {
  if (symbol && isDistributionBlockSymbol(symbol)) return false;
  return storedIsFromTop ?? hotspot?.isTop ?? true;
}

export function resolveConnectionIsToTop(
  symbol: SymbolItem | undefined,
  storedIsToTop: boolean | undefined,
  hotspot: TerminalHotspot | undefined,
): boolean {
  if (symbol && isDistributionBlockSymbol(symbol)) return false;
  return storedIsToTop ?? hotspot?.isTop ?? true;
}
