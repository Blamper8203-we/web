/**
 * VAL-023 — branch protection rating ≥ main breaker rating.
 *
 * If the branch breaker is the same size or larger than the main, the
 * main cannot protect the branch — a short circuit on the branch will
 * trip the branch (if it can) but the main provides no back-up.
 *
 * WHY only Warning: in some industrial installations, a non-selective
 * main is intentional (limiter replaced by a fuse). The user may know
 * what they're doing.
 */
import type { SymbolItem } from "../../../types/symbolItem";
import { isMainBreaker } from "../../deviceIdentification";
import type { ValidationResult } from "../electricalValidationService";
import { parseProtectionRating } from "../validationHelpers";

export function validateMainProtectionCoordination(
  symbols: SymbolItem[],
  result: ValidationResult,
  configuredMainBreakerA?: number,
): void {
  const mainRatings = [
    ...symbols
      .filter(isMainBreaker)
      .map((symbol) => ({ rating: parseProtectionRating(symbol.frRatedCurrent), symbolId: symbol.id })),
    ...(configuredMainBreakerA && configuredMainBreakerA > 0
      ? [{ rating: configuredMainBreakerA, symbolId: undefined }]
      : []),
  ].filter((entry) => entry.rating > 0);

  if (mainRatings.length === 0) return;

  const branchRatings = symbols
    .filter((symbol) => symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo")
    .map((symbol) => ({ rating: parseProtectionRating(symbol.protectionType), symbol }))
    .filter((entry) => entry.rating > 0);

  if (branchRatings.length === 0) return;

  for (const main of mainRatings) {
    for (const branch of branchRatings) {
      if (branch.rating >= main.rating) {
        result.warnings.push({
          code: "VAL-023",
          message: `Możliwy brak koordynacji zabezpieczenia głównego z obwodem "${branch.symbol.circuitName || branch.symbol.label || branch.symbol.id}"`,
          details: `Zabezpieczenie obwodu: ${branch.rating}A, zabezpieczenie główne: ${main.rating}A. Zabezpieczenie obwodu nie powinno być równe lub większe od nadrzędnego bez świadomego doboru selektywności.`,
          severity: "Warning",
          symbolId: main.symbolId ?? branch.symbol.id,
        });
      }
    }
  }
}
