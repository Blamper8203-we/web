import { devLog } from "../../lib/runtimeDiagnostics";
import { createDefaultSymbolItem, type SymbolItem } from "../../types/symbolItem";
import type { ValidationMessage } from "./electricalValidationService";

export type ValidationQuickFixId =
  | "set-protection-b16"
  | "set-rcbo-rated-40a"
  | "set-rcbo-residual-30ma"
  | "set-rcbo-type-a";

export interface ValidationQuickFix {
  id: ValidationQuickFixId;
  label: string;
  symbolId: string;
}

const PROTECTION_RATING_PATTERN = /[BCDZK]\s*(\d+)/i;

export function getValidationQuickFixesForMessage(
  message: ValidationMessage,
  symbol: SymbolItem | undefined,
): ValidationQuickFix[] {
  if (!symbol || !message.symbolId) {
    return [];
  }

  const fixes: ValidationQuickFix[] = [];

  if ((message.code === "VAL-012" || message.code === "VAL-021") && !hasProtectionRating(symbol.protectionType)) {
    fixes.push({
      id: "set-protection-b16",
      label: "Ustaw B16",
      symbolId: symbol.id,
    });
  }

  if (symbol.deviceKind === "rcbo") {
    if (message.code === "VAL-012" && symbol.rcdRatedCurrent <= 0) {
      fixes.push({
        id: "set-rcbo-rated-40a",
        label: "Ustaw 40A",
        symbolId: symbol.id,
      });
    }

    if ((message.code === "VAL-012" && symbol.rcdResidualCurrent <= 0) || message.code === "VAL-014") {
      fixes.push({
        id: "set-rcbo-residual-30ma",
        label: "Ustaw 30mA",
        symbolId: symbol.id,
      });
    }

    if (message.code === "VAL-012" && symbol.rcdType.trim().length === 0) {
      fixes.push({
        id: "set-rcbo-type-a",
        label: "Ustaw typ A",
        symbolId: symbol.id,
      });
    }
  }

  return fixes;
}

export function applyValidationQuickFix(symbol: SymbolItem, fixId: ValidationQuickFixId): SymbolItem {
  switch (fixId) {
    case "set-protection-b16":
      devLog("⚠️ [applyValidationQuickFix] Applying set-protection-b16! Symbol before:", { id: symbol.id, protectionType: symbol.protectionType });
      return createDefaultSymbolItem({
        ...symbol,
        protectionType: "B16",
      });
    case "set-rcbo-rated-40a":
      return createDefaultSymbolItem({
        ...symbol,
        rcdRatedCurrent: 40,
      });
    case "set-rcbo-residual-30ma":
      return createDefaultSymbolItem({
        ...symbol,
        rcdResidualCurrent: 30,
      });
    case "set-rcbo-type-a":
      return createDefaultSymbolItem({
        ...symbol,
        rcdType: "A",
      });
    default:
      return symbol;
  }
}

function hasProtectionRating(protectionType: string): boolean {
  return PROTECTION_RATING_PATTERN.test(protectionType);
}
