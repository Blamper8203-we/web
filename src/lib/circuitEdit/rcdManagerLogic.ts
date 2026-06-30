import type { SymbolItem } from "../../types/symbolItem";
import { createDefaultSymbolItem } from "../../types/symbolItem";

export interface RcdManagerUpdateEntry {
  id: string;
  rcdRatedCurrent: number;
  rcdResidualCurrent: number;
  rcdType: string;
}

// WHY: H-3 audit fix. Dla RCD i dla symboli z rcdSymbolId oryginalny kod
// rebuilduje caly symbol przez createDefaultSymbolItem nawet gdy wartosci
// sie nie zmienily. To powoduje (a) niepotrzebny rerender w React gdy
// referencja idzie do state, (b) side-effecty createDefaultSymbolItem
// odpala sie dla calego projektu przy kazdej edycji RCD, (c) ryzyko
// przyszlych regression (gdy ktos doda telemetrie do createDefaultSymbolItem,
// nagle kazda edycja RCD bedzie telemetrowana). Fix: porownaj wartosci
// przed/po i zwroc oryginalny symbol jesli identyczne.
function buildRcdUpdate(
  symbol: SymbolItem,
  rcdRatedCurrent: number,
  rcdResidualCurrent: number,
  rcdType: string,
): SymbolItem {
  if (
    symbol.rcdRatedCurrent === rcdRatedCurrent &&
    symbol.rcdResidualCurrent === rcdResidualCurrent &&
    symbol.rcdType === rcdType
  ) {
    return symbol;
  }
  return createDefaultSymbolItem({
    ...symbol,
    rcdRatedCurrent,
    rcdResidualCurrent,
    rcdType,
  });
}

/**
 * Aktualizuje listę symboli o nowe ustawienia z menedżera RCD.
 * Aplikuje te same zmiany dla samego RCD i wszystkich podłączonych do niego MCB/RCBO.
 */
export function applyRcdManagerUpdates(
  symbols: SymbolItem[],
  updates: RcdManagerUpdateEntry[]
): SymbolItem[] {
  const rcdById = new Map(updates.map((entry) => [entry.id, entry] as const));

  return symbols.map((symbol) => {
    if (symbol.deviceKind === "rcd") {
      const nextRcd = rcdById.get(symbol.id);
      if (!nextRcd) {
        return symbol;
      }

      return buildRcdUpdate(
        symbol,
        Math.max(1, Math.round(nextRcd.rcdRatedCurrent)),
        Math.max(1, Math.round(nextRcd.rcdResidualCurrent)),
        nextRcd.rcdType.trim().toUpperCase() || "A",
      );
    }

    if (symbol.rcdSymbolId) {
      const parentRcd = rcdById.get(symbol.rcdSymbolId);
      if (!parentRcd) {
        return symbol;
      }

      return buildRcdUpdate(
        symbol,
        Math.max(1, Math.round(parentRcd.rcdRatedCurrent)),
        Math.max(1, Math.round(parentRcd.rcdResidualCurrent)),
        parentRcd.rcdType.trim().toUpperCase() || "A",
      );
    }

    return symbol;
  });
}
