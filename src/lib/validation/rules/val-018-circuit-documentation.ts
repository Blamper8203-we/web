/**
 * VAL-018 — circuit name is missing.
 * VAL-019 — circuit location is missing.
 * VAL-020 — circuit power is missing.
 * VAL-021 — circuit overcurrent protection is missing.
 *
 * All four are "data completeness" hints for MCB/RCBO circuits. Names
 * and locations are Info by default, but escalate to Warning for the
 * circuit types where documentation is part of the formal handover
 * (Gniazdo / Oswietlenie). Power and protection are always Warning
 * (load/protection calculations need them).
 */
import type { SymbolItem } from "../../../types/symbolItem";
import type { ValidationResult, ValidationSeverity } from "../electricalValidationService";
import { hasText, isAdditionalProtectionCircuit, parseProtectionRating } from "../validationHelpers";

export function validateCircuitDocumentationCompleteness(
  symbols: SymbolItem[],
  result: ValidationResult,
): void {
  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;

    const displayName = symbol.circuitName || symbol.label || symbol.id;
    // WHY: PN-HD 60364 §514 requires identification of every protective
    // device. For Gniazdo / Oswietlenie (the circuits subject to
    // additional protection §415.1) the name and location aren't just
    // nice-to-have — they're documentation that the inspector expects.
    const severity: ValidationSeverity = isAdditionalProtectionCircuit(symbol) ? "Warning" : "Info";

    if (!hasText(symbol.circuitName)) {
      const target = severity === "Warning" ? result.warnings : result.info;
      target.push({
        code: "VAL-018",
        message: `Brak nazwy obwodu dla "${displayName}"`,
        details: severity === "Warning"
          ? "Obwód gniazdowy/oświetleniowy — nazwa wymagana w dokumentacji powykonawczej."
          : "Nazwa obwodu poprawia czytelność zestawień, schematu i dokumentacji PDF.",
        severity,
        symbolId: symbol.id,
      });
    }

    if (!hasText(symbol.location)) {
      const target = severity === "Warning" ? result.warnings : result.info;
      target.push({
        code: "VAL-019",
        message: `Brak lokalizacji dla obwodu "${displayName}"`,
        details: severity === "Warning"
          ? "Obwód gniazdowy/oświetleniowy — lokalizacja (pomieszczenie) wymagana."
          : "Lokalizacja pomaga jednoznacznie powiązać obwód z pomieszczeniem lub odbiornikiem.",
        severity,
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
