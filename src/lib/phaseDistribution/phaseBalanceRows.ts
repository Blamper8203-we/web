import type { SymbolItem } from "../../types/symbolItem";
import { calculateCurrent } from "./phaseDistributionCalculator";

export interface PhaseBalanceRow {
  id: string;
  referenceDesignation: string;
  circuitName: string;
  phase: string;
  powerW: number;
  currentA: number;
  isPhaseLocked: boolean;
}

export function buildPhaseBalanceRows(symbols: SymbolItem[], voltage = 230, powerFactor = 0.9): PhaseBalanceRow[] {
  return symbols
    .filter((symbol) => symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo")
    .map((symbol) => ({
      id: symbol.id,
      referenceDesignation: symbol.referenceDesignation || symbol.displayModuleNumber || "-",
      circuitName: symbol.circuitName || symbol.label || symbol.type || "Obwód",
      phase: symbol.phase || "-",
      powerW: Math.max(0, symbol.powerW),
      currentA: calculateCurrent(symbol.powerW, symbol.phase, voltage, powerFactor),
      isPhaseLocked: symbol.isPhaseLocked,
    }))
    .sort(compareBalanceRows);
}

function compareBalanceRows(a: PhaseBalanceRow, b: PhaseBalanceRow): number {
  const byReference = a.referenceDesignation.localeCompare(b.referenceDesignation, "pl", {
    numeric: true,
    sensitivity: "base",
  });

  if (byReference !== 0) {
    return byReference;
  }

  return a.circuitName.localeCompare(b.circuitName, "pl", {
    numeric: true,
    sensitivity: "base",
  });
}
