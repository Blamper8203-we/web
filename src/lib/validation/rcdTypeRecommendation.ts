/**
 * RCD type recommendation based on the circuit's free-text fields.
 *
 * Extracted from `electricalValidationService.ts` because the keyword
 * tables are self-contained and the rule (`val-011-rcd-type`) only
 * needs the recommendation object.
 *
 * The recommendations follow real electrical-engineering practice for
 * Polish/European installations:
 *  - Type B is required where DC residual currents can occur (PV
 *    inverters, EV chargers, variable-frequency drives).
 *  - Type F (or B) is required where mixed-frequency residual currents
 *    can occur (heat pumps, washing machines, air conditioning).
 *  - Type A is required for purely electronic loads (induction hobs,
 *    dishwashers) — never AC, because electronic rectifiers produce
 *    pulsating DC residuals that an AC-only RCD does not detect.
 */
import type { SymbolItem } from "../../types/symbolItem";
import { hasAnyToken, normalizeValidationText } from "./validationHelpers";

export interface RcdTypeRecommendation {
  allowedTypes: string[];
  reason: string;
}

/**
 * Recommend an RCD type for the given circuit. Returns null if the
 * circuit is not classifiable from its text fields (e.g. a generic
 * "Obwód 1" with no further description).
 *
 * Order of checks is most-specific → least-specific. The first match
 * wins, so a circuit named "Falownik + pompa ciepla" gets the B-only
 * recommendation (DC residual risk dominates).
 */
export function getRcdTypeRecommendation(
  symbol: SymbolItem,
): RcdTypeRecommendation | null {
  const text = normalizeValidationText(
    symbol.circuitName,
    symbol.circuitDescription,
    symbol.location,
    symbol.label,
    symbol.type,
  );

  if (
    // WHY: hasAnyToken does case-insensitive Polish-aware substring matching
    // against a normalized text (lowercased + diacritics stripped). It
    // returns true if ANY token matches — this is an OR, not AND. The first
    // match wins, so token lists must be ordered most-specific → least-
    // specific. Adding "PV" anywhere outside the B block would steal matches
    // from a hypothetical PV inverter circuit (which should get B).
    hasAnyToken(text, [
      "FALOWNIK",
      "INWERTER",
      "INVERTER",
      "PRZEMIENNIK",
      "CZESTOTLIWOSCI",
      "FOTOWOLTA",
      "PV",
      "LADOWARKA EV",
      "LA DOWARKA EV",
      "SAMOCHOD ELEKTRYCZNY",
      "AUTO ELEKTRYCZNE",
      "EVSE",
    ])
  ) {
    return {
      allowedTypes: ["B"],
      reason:
        "Odbiornik może generować składową stałą lub prądy upływu wysokiej częstotliwości.",
    };
  }

  if (
    hasAnyToken(text, [
      "POMPA CIEPLA",
      "KLIMATYZACJA",
      "KLIMATYZATOR",
      "PRALKA",
      "SUSZARKA",
    ])
  ) {
    return {
      allowedTypes: ["F", "B"],
      reason:
        "Odbiornik z napędem lub elektroniką mocy zwykle wymaga RCD lepiej odpornego na prądy mieszane.",
    };
  }

  if (
    hasAnyToken(text, [
      "INDUKCJA",
      "PLYTA INDUKCYJNA",
      "KUCHNIA INDUKCYJNA",
      "ZMYWARKA",
      "PIEKARNIK",
    ])
  ) {
    return {
      allowedTypes: ["A", "F", "B"],
      reason:
        "Odbiornik elektroniczny nie powinien być chroniony wyłącznikiem RCD typu AC.",
    };
  }

  return null;
}
