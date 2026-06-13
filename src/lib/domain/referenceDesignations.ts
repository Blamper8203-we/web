import { isDistributionBlockSymbol, isTerminalOrConnectorSymbol, type SymbolItem } from "../../types/symbolItem";
import type { PaletteTemplate } from "../modules/moduleCatalog";
import { compareDinPosition } from "./dinRailArrangement";
import { devLog } from "../runtimeDiagnostics";

const MANUAL_REFERENCE_DESIGNATION_KEY = "ManualReferenceDesignation";

export function getReferencePrefix(template: PaletteTemplate): string {
  if (template.templateId.includes("przelacznik-siec") || template.category.includes("sieci")) {
    return "WS";
  }

  switch (template.deviceKind) {
    case "fr":
      return "QS";
    case "rcd":
      return "Q";
    case "spd":
      return "FA";
    case "phaseIndicator":
      return "H";
    case "mcb":
    case "rcbo":
      return "F";
    case "terminalBlock":
      return "X";
    default:
      return "X";
  }
}

export function getNextReferenceDesignation(symbols: SymbolItem[], prefix: string): string {
  const matcher = new RegExp(`^${prefix}(\\d+)$`, "i");
  let highest = 0;

  for (const symbol of symbols) {
    const match = symbol.referenceDesignation.match(matcher);
    if (!match) {
      continue;
    }

    const numeric = Number.parseInt(match[1], 10);
    if (Number.isFinite(numeric)) {
      highest = Math.max(highest, numeric);
    }
  }

  return `${prefix}${highest + 1}`;
}

export function toDisplayModuleNumber(symbol: SymbolItem): string {
  if (isTerminalOrConnectorSymbol(symbol) || isDistributionBlockSymbol(symbol)) {
    return symbol.referenceDesignation || `X${symbol.moduleNumber}`;
  }

  if (symbol.deviceKind === "rcd" || symbol.type.toLocaleUpperCase("pl-PL").includes("RCD")) {
    return "#0";
  }

  return `#${symbol.moduleNumber}`;
}

export function hasManualReferenceDesignation(symbol: SymbolItem): boolean {
  return symbol.parameters[MANUAL_REFERENCE_DESIGNATION_KEY] === "true"
    && symbol.referenceDesignation.trim().length > 0;
}

export function resolveGroupReferenceNumber(head: SymbolItem | undefined, fallbackNumber: number): string {
  if (!head) {
    return String(fallbackNumber);
  }

  const match = head.referenceDesignation.trim().match(/(\d+)\s*$/);
  if (!match) {
    return String(fallbackNumber);
  }

  const numeric = Number.parseInt(match[1], 10);
  return Number.isFinite(numeric) && numeric > 0
    ? String(numeric)
    : String(fallbackNumber);
}

export function shouldAutoAssignGroupCircuitDesignation(symbol: SymbolItem): boolean {
  if (symbol.moduleRef.includes("przelacznik") || symbol.visualPath.includes("przelacznik")) return false;
  return symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo";
}

export function shouldUseAuxiliaryReferenceDesignation(symbol: SymbolItem): boolean {
  return isTerminalOrConnectorSymbol(symbol) || isDistributionBlockSymbol(symbol);
}

export function getAuxiliaryPrefix(symbol: SymbolItem): string {
  if (isDistributionBlockSymbol(symbol)) {
    devLog('[AUX] BL prefix for:', symbol.label, symbol.moduleRef);
    return "BL";
  }
  
  const text = `${symbol.type} ${symbol.label} ${symbol.circuitName} ${symbol.circuitDescription} ${symbol.visualPath} ${symbol.moduleRef} ${symbol.phase}`.toUpperCase();
  
  devLog('[AUX] text for prefix check:', JSON.stringify(text.substring(0, 120)));
  
  if (/(^|[\s/-])PE([\s/-]|$)/.test(text) || text.includes("ZIELON") || text.includes("OCHRON")) {
    devLog('[AUX] PE prefix for:', symbol.label);
    return "PE";
  }
  
  if (/(^|[\s/-])N[\d_]*([\s/-]|$)/.test(text) || text.includes("NIEBIESK") || text.includes("NEUTRAL")) {
    devLog('[AUX] N prefix for:', symbol.label);
    return "N";
  }
  
  devLog('[AUX] X prefix for:', symbol.label, symbol.moduleRef);
  return "X";
}

export function assignAuxiliaryReferenceDesignations(symbols: SymbolItem[]): void {
  const auxiliarySymbols = symbols
    .filter(shouldUseAuxiliaryReferenceDesignation)
    .sort(compareDinPosition);

  const reservedDesignations = new Set<string>();

  for (const symbol of auxiliarySymbols) {
    if (hasManualReferenceDesignation(symbol)) {
      reservedDesignations.add(symbol.referenceDesignation.trim().toLocaleUpperCase("pl-PL"));
    }
  }

  for (const symbol of auxiliarySymbols) {
    if (!hasManualReferenceDesignation(symbol)) {
      const ref = symbol.referenceDesignation?.trim().toLocaleUpperCase("pl-PL");
      const expectedPrefix = getAuxiliaryPrefix(symbol);
      const regex = new RegExp(`^${expectedPrefix}\\d+$`);
      
      if (ref && regex.test(ref)) {
        if (!reservedDesignations.has(ref)) {
          reservedDesignations.add(ref);
        } else {
          symbol.referenceDesignation = "";
        }
      } else {
        symbol.referenceDesignation = "";
      }
    }
  }

  const counters = new Map<string, number>();
  
  for (const symbol of auxiliarySymbols) {
    if (!hasManualReferenceDesignation(symbol) && !symbol.referenceDesignation) {
      const prefix = getAuxiliaryPrefix(symbol);
      let counter = counters.get(prefix) ?? 1;
      
      while (reservedDesignations.has(`${prefix}${counter}`)) {
        counter++;
      }
      
      symbol.referenceDesignation = `${prefix}${counter}`;
      reservedDesignations.add(`${prefix}${counter}`);
      counters.set(prefix, counter + 1);
    }

    const match = symbol.referenceDesignation.match(/^[A-Z]+([0-9]+)$/i);
    if (match) {
      const moduleNumber = Number.parseInt(match[1], 10);
      if (Number.isFinite(moduleNumber) && moduleNumber > 0) {
        symbol.moduleNumber = moduleNumber;
      }
    }

    symbol.displayModuleNumber = toDisplayModuleNumber(symbol);
  }
}
