/**
 * VAL-010 — single-phase RCD assigned to a circuit on a different phase.
 *
 * Three-phase RCDs cover any single-phase circuit, so the rule skips
 * them via `isThreePhaseRcd` (delegate to `isThreePhaseDevice`).
 */
import type { SymbolItem } from "../../../types/symbolItem";
import { isThreePhaseDevice } from "../../deviceIdentification";
import type { ValidationResult } from "../electricalValidationService";
import { normalizeSinglePhase } from "../validationHelpers";

export function validateRcdPhaseCompatibility(
  symbols: SymbolItem[],
  result: ValidationResult,
): void {
  const rcdMap = new Map(
    symbols
      .filter((symbol) => symbol.deviceKind === "rcd")
      .map((symbol) => [symbol.id, symbol]),
  );

  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;
    if (!symbol.rcdSymbolId) continue;

    const rcd = rcdMap.get(symbol.rcdSymbolId);
    if (!rcd) continue;

    if (isThreePhaseDevice(rcd)) {
      continue;
    }

    const rcdPhase = normalizeSinglePhase(rcd.phase);
    const circuitPhase = normalizeSinglePhase(symbol.phase);
    if (!rcdPhase || circuitPhase !== rcdPhase) {
      result.errors.push({
        code: "VAL-010",
        message: `Niezgodność faz obwodu z RCD "${rcd.label || rcd.id}"`,
        details: `RCD jednofazowy jest przypisany do ${rcdPhase ?? "nieznanej fazy"}, a obwód "${symbol.circuitName || symbol.label || symbol.id}" ma fazę ${symbol.phase || "brak"}.`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }
  }
}
