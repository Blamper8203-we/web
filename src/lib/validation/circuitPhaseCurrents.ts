/**
 * Per-phase current aggregation and voltage-drop calculation.
 *
 * Extracted from `electricalValidationService.ts` because the two
 * functions are tightly coupled (voltage drop depends on current and
 * phase topology) and used together by `val-007-main-overload` and
 * `val-002-cable-safety`.
 */
import type { SymbolItem } from "../../types/symbolItem";
import {
  calculateCurrent,
  distributePower,
} from "../phaseDistribution/phaseDistributionCalculator";

/**
 * Sum the load of every MCB/RCBO across L1/L2/L3, then convert each
 * phase power to current at the given nominal phase voltage.
 *
 * WHY: the main breaker overload rule (VAL-007) needs the highest
 * single-phase current, NOT the sum of all phases. A three-phase load
 * of 30A on L1+L2+L3 is 10A per phase, not 30A on the breaker.
 */
export function calculateCircuitPhaseCurrents(
  symbols: SymbolItem[],
  phaseVoltage: number,
): Pick<
  { l1CurrentA: number; l2CurrentA: number; l3CurrentA: number },
  "l1CurrentA" | "l2CurrentA" | "l3CurrentA"
> {
  let l1PowerW = 0;
  let l2PowerW = 0;
  let l3PowerW = 0;

  // Pomijamy FR, SPD i phaseIndicator, bo:
  // - FR (rozłącznik izolacyjny) i SPD (ochrona przepięciowa) nie pobierają mocy
  //   ani nie generują obciążenia – są to aparaty łączeniowe/ochronne.
  // - phaseIndicator (kontrolki faz) ma znikomy pobór mocy, nieistotny dla
  //   bilansu obciążenia i walidacji przeciążenia zabezpieczenia głównego.
  // Uwzględniamy tylko MCB i RCBO, które reprezentują rzeczywiste obwody odbiorcze.
  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;

    const [l1, l2, l3] = distributePower(symbol.powerW, symbol.phase);
    l1PowerW += l1;
    l2PowerW += l2;
    l3PowerW += l3;
  }

  return {
    l1CurrentA: calculateCurrent(l1PowerW, "L1", phaseVoltage),
    l2CurrentA: calculateCurrent(l2PowerW, "L2", phaseVoltage),
    l3CurrentA: calculateCurrent(l3PowerW, "L3", phaseVoltage),
  };
}

/**
 * Voltage drop (V) along a cable run, using the standard two-wire
 * approximation for single-phase circuits and √3 for three-phase.
 *
 * WHY: 0.0175 Ω·mm²/m is the standard copper resistivity used in
 * Polish/European textbook examples (1/56). The √3 factor for three-phase
 * is the standard line-to-line formula, applied when the phase is
 * L1+L2+L3 or 3F.
 */
export function calculateVoltageDrop(
  currentA: number,
  crossSectionMm2: number,
  lengthM: number,
  phase: string | undefined | null,
): number {
  const rho = 0.0175;
  const phaseUpper = (phase || "").toUpperCase();
  const multiplier =
    phaseUpper === "L1+L2+L3" || phaseUpper === "3F" ? Math.sqrt(3) : 2;
  return (multiplier * currentA * lengthM * rho) / crossSectionMm2;
}
