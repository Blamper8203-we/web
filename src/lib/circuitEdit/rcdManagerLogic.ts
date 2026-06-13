import type { SymbolItem } from "../../types/symbolItem";
import { createDefaultSymbolItem } from "../../types/symbolItem";

export interface RcdManagerUpdateEntry {
  id: string;
  rcdRatedCurrent: number;
  rcdResidualCurrent: number;
  rcdType: string;
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

      return createDefaultSymbolItem({
        ...symbol,
        rcdRatedCurrent: Math.max(1, Math.round(nextRcd.rcdRatedCurrent)),
        rcdResidualCurrent: Math.max(1, Math.round(nextRcd.rcdResidualCurrent)),
        rcdType: nextRcd.rcdType.trim().toUpperCase() || "A",
      });
    }

    if (symbol.rcdSymbolId) {
      const parentRcd = rcdById.get(symbol.rcdSymbolId);
      if (!parentRcd) {
        return symbol;
      }

      return createDefaultSymbolItem({
        ...symbol,
        rcdRatedCurrent: Math.max(1, Math.round(parentRcd.rcdRatedCurrent)),
        rcdResidualCurrent: Math.max(1, Math.round(parentRcd.rcdResidualCurrent)),
        rcdType: parentRcd.rcdType.trim().toUpperCase() || "A",
      });
    }

    return symbol;
  });
}
