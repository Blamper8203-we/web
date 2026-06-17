/**
 * VAL-018 — circuit name is missing.
 * VAL-019 — circuit location is missing.
 * VAL-020 — circuit power is missing.
 * VAL-021 — circuit overcurrent protection is missing.
 *
 * All four are "data completeness" hints for MCB/RCBO circuits. The
 * first two are Info (nice to have), the latter two are Warning
 * (load/protection calculations need them).
 */
import type { SymbolItem } from "../../../types/symbolItem";
import type { ValidationResult } from "../electricalValidationService";
import { hasText, parseProtectionRating } from "../validationHelpers";

export function validateCircuitDocumentationCompleteness(
  symbols: SymbolItem[],
  result: ValidationResult,
): void {
  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;

    const displayName = symbol.circuitName || symbol.label || symbol.id;

    if (!hasText(symbol.circuitName)) {
      result.info.push({
        code: "VAL-018",
        message: `Brak nazwy obwodu dla "${displayName}"`,
        details: "Nazwa obwodu poprawia czytelność zestawień, schematu i dokumentacji PDF.",
        severity: "Info",
        symbolId: symbol.id,
      });
    }

    if (!hasText(symbol.location)) {
      result.info.push({
        code: "VAL-019",
        message: `Brak lokalizacji dla obwodu "${displayName}"`,
        details: "Lokalizacja pomaga jednoznacznie powiązać obwód z pomieszczeniem lub odbiornikiem.",
        severity: "Info",
        symbolId: symbol.id,
      });
    }

    if (symbol.powerW <= 0) {
      result.warnings.push({
        code: "VAL-020",
        message: `Brak mocy obwodu "${displayName}"`,
        details: "Bez mocy program nie może wiarygodnie policzyć obciążenia faz, prądu i spadku napięcia.",
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    if (parseProtectionRating(symbol.protectionType) <= 0) {
      result.warnings.push({
        code: "VAL-021",
        message: `Brak zabezpieczenia nadprądowego w obwodzie "${displayName}"`,
        details: "Podaj charakterystykę i prąd zabezpieczenia, np. B10, B16 albo C16.",
        severity: "Warning",
        symbolId: symbol.id,
      });
    }
  }
}
