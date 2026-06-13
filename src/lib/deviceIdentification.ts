import type { SymbolItem } from "../types/symbolItem";

/**
 * Normalizuje tekst ułatwiając sprawdzanie typów i fraz (usuwa polskie znaki, małe litery).
 */
export function normalizeValidationText(...values: Array<string | undefined | null>): string {
  return values
    .join(" ")
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Wykrywa czy dany symbol to rozłącznik główny (FR, Switch).
 */
export function isMainBreaker(symbol: SymbolItem): boolean {
  const identity = normalizeValidationText(symbol.type, symbol.label, symbol.moduleRef, symbol.visualPath);
  return (
    identity.includes("fr") ||
    identity.includes("switch") ||
    identity.includes("rozlacznik") ||
    identity.includes("isolator") ||
    identity.includes("przelacznik")
  );
}

/**
 * Wykrywa ograniczniki przepięć (SPD).
 */
export function isSpd(symbol: SymbolItem): boolean {
  const identity = normalizeValidationText(symbol.type, symbol.label, symbol.moduleRef, symbol.visualPath);
  return identity.includes("spd");
}

/**
 * Wykrywa lampki kontrolne, sygnalizatory faz.
 */
export function isIndicator(symbol: SymbolItem): boolean {
  const identity = normalizeValidationText(symbol.type, symbol.label, symbol.moduleRef, symbol.visualPath);
  return (
    identity.includes("kontrolk") ||
    identity.includes("indicator") ||
    identity.includes("lampka") ||
    identity.includes("sygnalizat") ||
    identity.includes("kontrolkifaz")
  );
}

/**
 * Wykrywa czy urządzenie jest trójfazowe na podstawie fazy lub nazwy (np. 3P+N, 4P).
 */
export function isThreePhaseDevice(symbol: SymbolItem): boolean {
  const phase = (symbol.phase || "").toUpperCase();
  if (phase === "L1+L2+L3" || phase === "3F") return true;

  const identity = normalizeValidationText(symbol.type, symbol.label, symbol.moduleRef, symbol.visualPath);
  return (
    identity.includes("3p+n") ||
    identity.includes("3p n") ||
    identity.includes("4p") ||
    identity.includes("3p")
  );
}

/**
 * Wykrywa urządzenia typu RCD. (Zwykle deviceKind = 'rcd', ale używane dla bezpieczeństwa schematów).
 */
export function isRcdDevice(symbol: SymbolItem): boolean {
  if (symbol.deviceKind === "rcd") return true;
  const identity = normalizeValidationText(symbol.type, symbol.label, symbol.moduleRef, symbol.visualPath);
  return identity.includes("rcd") || identity.includes("rccb") || identity.includes("roznic");
}

/**
 * Wykrywa urządzenia RCBO.
 */
export function isRcboDevice(symbol: SymbolItem): boolean {
  if (symbol.deviceKind === "rcbo") return true;
  const identity = normalizeValidationText(symbol.type, symbol.label, symbol.moduleRef, symbol.visualPath);
  return identity.includes("rcbo");
}
