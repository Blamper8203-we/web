import {
  isTerminalOrConnectorSymbol,
  isDistributionBlockSymbol,
  type SymbolBase,
} from "../../types/symbolItem";

export function computeDisplayProtection(symbol: SymbolBase): string {
  const typeUpper = symbol.type.toUpperCase();
  if (typeUpper.includes("SPD")) return symbol.spdInfo;
  if (typeUpper.includes("RCD")) return symbol.rcdInfo;
  if (typeUpper.includes("FR") || typeUpper.includes("SWITCH") || typeUpper.includes("ROZLACZNIK")) {
    return `${symbol.frRatedCurrent} (FR)`;
  }
  if (typeUpper.includes("KONTROLKI")) return symbol.phaseIndicatorFuseRating;
  return symbol.protectionType && symbol.protectionType.trim().length > 0
    ? symbol.protectionType
    : "Brak";
}

export function computeDisplayLocation(symbol: SymbolBase): string {
  return symbol.location && symbol.location.trim().length > 0 ? symbol.location : "Brak lokalizacji";
}

export function computeDisplayModuleNumber(symbol: SymbolBase): string {
  if (isTerminalOrConnectorSymbol(symbol) || isDistributionBlockSymbol(symbol)) {
    return symbol.referenceDesignation || `X${symbol.moduleNumber}`;
  }
  if (symbol.type.toUpperCase().includes("RCD")) return "#0";
  return `#${symbol.moduleNumber}`;
}

export function computeRcdInfo(symbol: SymbolBase): string {
  if (symbol.rcdRatedCurrent > 0 && symbol.rcdResidualCurrent > 0) {
    return `RCD ${symbol.rcdRatedCurrent}A/${symbol.rcdResidualCurrent}mA Typ ${symbol.rcdType}`;
  }
  return "";
}

export function computeSpdInfo(symbol: SymbolBase): string {
  if (symbol.spdType && symbol.spdVoltage > 0) {
    return `SPD ${symbol.spdType} ${symbol.spdVoltage}V ${symbol.spdDischargeCurrent}kA`;
  }
  return "";
}

export function computeIsTerminalBlock(symbol: SymbolBase): boolean {
  return isTerminalOrConnectorSymbol(symbol);
}
