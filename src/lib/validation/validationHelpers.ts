/**
 * Pure helpers used by validation rules and the dispatcher.
 *
 * Extracted from `electricalValidationService.ts` so individual rule files
 * can pull only the helpers they need. None of these have side effects —
 * they take inputs, return outputs. They are easy to unit test in isolation.
 */
import type { SymbolItem } from "../../types/symbolItem";
import { CABLE_CAPACITY_BY_CROSS_SECTION } from "./validationConstants";

/**
 * Parse a protection rating (in amperes) out of a string like "B16" / "C20"
 * / "D32". Returns 0 for any non-matching input (empty, "Manual", etc.).
 *
 * WHY: 0 is the "unknown / unset" sentinel across the rules. Callers compare
 * `> 0` to decide whether to evaluate the rule.
 */
export function parseProtectionRating(protectionType: string): number {
  if (!protectionType) return 0;
  const match = protectionType.match(/[BCDZK](\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Look up the maximum continuous current (A) for a given cable cross-section
 * (mm²). Returns 0 if the cross-section is not in the table.
 *
 * WHY: returns 0 (not undefined) so the caller can short-circuit with one
 * `if (maxCableCurrent <= 0) continue;` check.
 */
export function getCableCapacity(crossSectionMm2: number): number {
  return CABLE_CAPACITY_BY_CROSS_SECTION[crossSectionMm2] ?? 0;
}

/**
 * Reduce a phase string to a single-phase identifier. Multi-phase inputs
 * (e.g. "L1+L2") and unknown values return null. Caller decides what to
 * do with non-single-phase circuits.
 */
export function normalizeSinglePhase(
  phase: string | undefined | null,
): "L1" | "L2" | "L3" | null {
  const normalized = (phase || "").toUpperCase();
  if (normalized === "L1" || normalized === "L2" || normalized === "L3") {
    return normalized;
  }

  return null;
}

/**
 * Normalize a free-text field for keyword matching.
 *
 * Replaces Polish diacritics with ASCII equivalents, uppercases the result.
 * Used to look for "POMPA CIEPLA" in user-typed fields even when the user
 * wrote "pompa ciepła".
 */
export function normalizeValidationText(
  ...values: Array<string | undefined | null>
): string {
  return values
    .join(" ")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

/**
 * True if at least one of the given tokens is a substring of `text`.
 * Assumes `text` is already normalized (uppercased, diacritics stripped).
 */
export function hasAnyToken(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

/**
 * True if the value is a non-empty string (after trim).
 * Used for "field is filled in" checks.
 */
export function hasText(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Normalize an RCD type string to a canonical form (trimmed, uppercased).
 * Returns "" for missing input.
 */
export function normalizeRcdType(type: string | undefined | null): string {
  return (type || "").trim().toUpperCase();
}

/**
 * True if `actualType` is one of the `allowedTypes`.
 * Empty / unknown actual types are not allowed (caller decides if that's
 * a warning or an error).
 */
export function isRcdTypeAllowed(actualType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(actualType);
}

/**
 * True if the circuit is the kind that PN-HD 60364 treats as needing
 * additional protection (≤ 30 mA RCD): Gniazdo (sockets) and Oswietlenie
 * (lighting). Sila / Inne are out of scope for this rule.
 */
export function isAdditionalProtectionCircuit(symbol: SymbolItem): boolean {
  return symbol.circuitType === "Gniazdo" || symbol.circuitType === "Oswietlenie";
}
