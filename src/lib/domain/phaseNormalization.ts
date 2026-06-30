// WHY: `normalizeSinglePhaseAssignment` (z "Assignment") było zduplikowane
// identycznie w `domain/symbolGrouping.ts` i `domain/paletteFormatting.ts`.
// Ta sama funkcja, ten sam fallback ("L1"), ta sama walidacja przez
// `isSinglePhaseAssignment` (też zduplikowane w obu plikach). Wyciągamy
// do wspólnego modułu `domain/phaseNormalization.ts`.

import type { PhaseAssignment } from "../../types/symbolItem";

export const SINGLE_PHASES: PhaseAssignment[] = ["L1", "L2", "L3"];

export function isSinglePhaseAssignment(
  phase: string | null | undefined,
): phase is PhaseAssignment {
  return SINGLE_PHASES.includes((phase || "").toUpperCase() as PhaseAssignment);
}

/**
 * Normalizuje phase string do walidnej PhaseAssignment. Fallback chain:
 * 1. phase (po upperCase + walidacja) — jesli poprawna, zwraca
 * 2. fallback (po upperCase + walidacja) — jesli poprawna, zwraca
 * 3. "L1" — ostateczny fallback
 *
 * WHY: Uzywane w applyInheritedRcdInfo (dziedziczenie fazy z RCD do MCB)
 * i w paletteFormatting (canonical phase dla importowanego modulu). Brak
 * normalizacji = cicho "L1+L2" wplywa do systemu jako "L1", potem
 * `addDistributedWeightToPhaseLoads` pomija bo isSinglePhase()=false,
 * MCB zostaje bez wagi.
 */
export function normalizeSinglePhaseAssignment(
  phase: string | null | undefined,
  fallback: string | null | undefined = "L1",
): PhaseAssignment {
  const normalizedPhase = (phase || "").toUpperCase();
  if (isSinglePhaseAssignment(normalizedPhase)) {
    return normalizedPhase;
  }

  const normalizedFallback = (fallback || "").toUpperCase();
  return isSinglePhaseAssignment(normalizedFallback) ? normalizedFallback : "L1";
}
