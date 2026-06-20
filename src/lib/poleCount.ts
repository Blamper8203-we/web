/**
 * Shared utility for detecting the pole count of a DIN rail symbol.
 *
 * Consolidates 3 previously duplicated implementations:
 *   - schematicLayoutEngine.ts   (most comprehensive)
 *   - phaseDistributionCalculator.ts
 *   - circuitEditFieldDefinitions.ts
 *
 * The catalog importer (importedModuleCatalog.ts) uses its own logic
 * because it operates on file name strings, not SymbolItem objects.
 */
import type { SymbolItem } from "../types/symbolItem";

export type ModulePoleCount = 0 | 1 | 2 | 3 | 4;

/**
 * Detect the number of poles for a given symbol.
 *
 * Resolution order:
 *  1. Regex pattern on visualPath + type + label + moduleRef
 *     (supports 1P, 2P, 3P, 4P, POL, BIEG, TOR, and S-30x series)
 *  2. Direct substring checks (4p, 3p, 2p, 1p)
 *  3. deviceKind fallback (fr/spd/phaseIndicator → 4, rcd with 3-phase → 4)
 *  4. Aspect ratio (width / height)
 *  5. Phase text fallback
 *
 * Returns 0 only when absolutely nothing can be determined.
 */
export function detectPoleCount(symbol: SymbolItem): ModulePoleCount {
  const value = `${symbol.visualPath} ${symbol.type} ${symbol.label} ${symbol.moduleRef}`;
  const normalizedValue = value
    .toLocaleUpperCase("pl-PL")
    .replace(/Ł/g, "L")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 1a. Full word regex: "2P", "3 POL", "4 BIEG", "1 TOR"
  const poleMatch = normalizedValue.match(
    /(^|[^0-9])([1-4])\s*-?\s*(?:P|POL[A-Z]*|BIEG[A-Z]*|TOR[A-Z]*)([^A-Z0-9]|$)/,
  );
  if (poleMatch) {
    const poles = Number.parseInt(poleMatch[2]!, 10);
    if (poles >= 1 && poles <= 4) return poles as ModulePoleCount;
  }

  // 1b. S-series: "S-301" → 1, "S 302" → 2, "S-303" → 3, "S304" → 4
  const sSeriesMatch = value.match(/[Ss]\s*-?\s*30(\d)/);
  if (sSeriesMatch) {
    const poles = Number.parseInt(sSeriesMatch[1], 10);
    if (poles >= 1 && poles <= 4) return poles as ModulePoleCount;
  }

  // 2. Direct substring checks (fallback if regex didn't match)
  const combinedLower = value.toLowerCase();
  if (combinedLower.includes("4p")) return 4;
  if (combinedLower.includes("3p")) return 3;
  if (combinedLower.includes("2p")) return 2;
  if (combinedLower.includes("1p")) return 1;

  // 3. deviceKind fallback
  if (
    symbol.deviceKind === "fr" ||
    symbol.deviceKind === "spd" ||
    symbol.deviceKind === "phaseIndicator"
  ) {
    return 4;
  }
  if (symbol.deviceKind === "rcd" && detectPhaseCount(symbol.phase) >= 3) {
    return 4;
  }

  // 4. Aspect ratio
  if (symbol.height > 0) {
    const ratio = symbol.width / symbol.height;
    if (ratio < 0.30) return 1;
    if (ratio < 0.55) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  }

  // 5. Phase text fallback (for phase-aware callers)
  if (symbol.phase && symbol.phase.toLocaleUpperCase("pl-PL") !== "PENDING") {
    const phaseCount = detectPhaseCount(symbol.phase);
    if (phaseCount >= 3) return 4;
    if (phaseCount === 2) return 2;
    return 1;
  }

  // 6. Last resort: nothing could be determined
  return 0;
}

/**
 * Like `detectPoleCount` but guarantees a non-zero result (defaults to 1).
 * Used by callers that always need a valid pole count.
 */
export function detectPoleCountWithFallback(symbol: SymbolItem): ModulePoleCount {
  const result = detectPoleCount(symbol);
  return result !== 0 ? result : 1;
}

/**
 * Count phases from a phase string.
 *   "L1+L2+L3" / "3F" / "3P" → 3
 *   "L1+L2" / "L2+L3" / "L1+L3" → 2
 *   "L1" / "L2" / "L3" / undefined / "PENDING" → 1
 */
export function detectPhaseCount(phase: string): number {
  if (!phase || phase.toLocaleLowerCase("pl-PL") === "pending") return 1;
  if (phase === "L1+L2+L3" || phase === "3F" || phase === "3P") return 3;
  const count = (phase.match(/L/g) ?? []).length;
  return Math.max(1, count);
}
