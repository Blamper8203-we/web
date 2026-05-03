import type { SymbolItem } from "../../types/symbolItem";
import {
  calculateTotalDistribution,
  calculateCurrent,
} from "../phaseDistribution/phaseDistributionCalculator";

export type ValidationSeverity = "Error" | "Warning" | "Info";

export interface ValidationMessage {
  code: string;
  message: string;
  details?: string;
  severity: ValidationSeverity;
  symbolId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  info: ValidationMessage[];
}

export interface PhaseLoadResult {
  l1PowerW: number;
  l2PowerW: number;
  l3PowerW: number;
  l1CurrentA: number;
  l2CurrentA: number;
  l3CurrentA: number;
  imbalancePercent: number;
  totalPowerW: number;
  totalCurrentA: number;
}

export interface CableSizeValidationResult {
  crossSectionMm2: number;
  currentA: number;
  maxCurrentA: number;
  lengthM: number;
  voltageDropV: number;
  voltageDropPercent: number;
  isValid: boolean;
  isVoltageDropOk: boolean;
}

// ================================================================
// Main validation orchestrator
// ================================================================

const PHASE_VOLTAGE = 230;
const IMBALANCE_THRESHOLD_PERCENT = 30;
const VOLTAGE_DROP_LIMIT_LIGHTING = 3.0;
const VOLTAGE_DROP_LIMIT_OTHER = 5.0;

// Cable current capacity table (copper, PVC insulated)
const CABLE_CAPACITY_BY_CROSS_SECTION: Record<number, number> = {
  1.5: 16,
  2.5: 21,
  4: 27,
  6: 36,
  10: 50,
  16: 68,
  25: 89,
  35: 107,
  50: 133,
};

export function validateProject(
  symbols: SymbolItem[],
  imbalanceThresholdPercent: number = IMBALANCE_THRESHOLD_PERCENT,
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    info: [],
  };

  const phaseLoads = calculateTotalDistribution(symbols);

  validatePhaseImbalance(phaseLoads, result, imbalanceThresholdPercent);
  validateCableSafety(symbols, result);
  validateProtectionMismatch(symbols, result);
  validateNoRcdProtection(symbols, result);
  validateMainOverload(symbols, result);
  validateRcdOverload(symbols, result);
  validateRcdHierarchy(symbols, result);

  result.isValid = result.errors.length === 0;
  return result;
}

// ================================================================
// Validation rules
// ================================================================

function validatePhaseImbalance(
  phaseLoads: ReturnType<typeof calculateTotalDistribution>,
  result: ValidationResult,
  threshold: number,
): void {
  if (phaseLoads.imbalancePercent > threshold) {
    result.warnings.push({
      code: "VAL-001",
      message: `Asymetria obciazenia faz: ${phaseLoads.imbalancePercent.toFixed(1)}%`,
      details: `L1: ${phaseLoads.l1PowerW.toFixed(0)}W, L2: ${phaseLoads.l2PowerW.toFixed(0)}W, L3: ${phaseLoads.l3PowerW.toFixed(0)}W`,
      severity: "Warning",
    });
  }
}

function validateCableSafety(symbols: SymbolItem[], result: ValidationResult): void {
  for (const symbol of symbols) {
    if (symbol.powerW <= 0) continue;
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;

    const current = calculateCurrent(symbol.powerW, symbol.phase, PHASE_VOLTAGE);
    const protectionRating = parseProtectionRating(symbol.protectionType);

    if (protectionRating <= 0) continue;

    // Check cable overload
    const maxCableCurrent = getCableCapacity(symbol.cableCrossSection);
    if (current > maxCableCurrent) {
      result.errors.push({
        code: "VAL-002",
        message: `Przeciążenie przewodu w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: `Prąd: ${current.toFixed(1)}A, maksymalny prąd przewodu ${symbol.cableCrossSection}mm²: ${maxCableCurrent}A`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }

    // Check protection vs cable
    if (protectionRating > maxCableCurrent) {
      result.warnings.push({
        code: "VAL-003",
        message: `Niedopasowanie zabezpieczenia do przewodu w obwodzie "${symbol.circuitName || symbol.label}"`,
        details: `Zabezpieczenie: ${protectionRating}A, przewód ${symbol.cableCrossSection}mm²: ${maxCableCurrent}A`,
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    // Voltage drop check
    const voltageDrop = calculateVoltageDrop(current, symbol.cableCrossSection, symbol.cableLength);
    const voltageDropPercent = (voltageDrop / PHASE_VOLTAGE) * 100;
    const limit = symbol.circuitType === "Oswietlenie" ? VOLTAGE_DROP_LIMIT_LIGHTING : VOLTAGE_DROP_LIMIT_OTHER;

    if (voltageDropPercent > limit) {
      result.warnings.push({
        code: "VAL-004",
        message: `Zbyt duży spadek napięcia w obwodzie "${symbol.circuitName || symbol.label}"`,
        details: `Spadek: ${voltageDropPercent.toFixed(1)}%, limit: ${limit}% (dlugosc: ${symbol.cableLength}m, przekroj: ${symbol.cableCrossSection}mm²)`,
        severity: "Warning",
        symbolId: symbol.id,
      });
    }
  }
}

function validateProtectionMismatch(symbols: SymbolItem[], result: ValidationResult): void {
  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;

    const protectionRating = parseProtectionRating(symbol.protectionType);
    if (protectionRating <= 0) continue;

    const maxCableCurrent = getCableCapacity(symbol.cableCrossSection);
    if (protectionRating > maxCableCurrent * 1.45) {
      result.errors.push({
        code: "VAL-005",
        message: `Zabezpieczenie zbyt duże dla przewodu w obwodzie "${symbol.circuitName || symbol.label}"`,
        details: `Zabezpieczenie: ${protectionRating}A, przewód ${symbol.cableCrossSection}mm² nie zapewnia ochrony przy przeciążeniu >${(maxCableCurrent * 1.45).toFixed(0)}A`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }
  }
}

function validateNoRcdProtection(symbols: SymbolItem[], result: ValidationResult): void {
  const rcdIds = new Set(symbols.filter((s) => s.deviceKind === "rcd").map((s) => s.id));

  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb") continue;
    if (symbol.rcdSymbolId && rcdIds.has(symbol.rcdSymbolId)) continue;

    result.warnings.push({
      code: "VAL-006",
      message: `Obwod "${symbol.circuitName || symbol.label}" bez ochrony RCD`,
      details: "Różnica prądu różnicowego nie jest chroniona przez wyłącznik RCD",
      severity: "Warning",
      symbolId: symbol.id,
    });
  }
}

function validateMainOverload(symbols: SymbolItem[], result: ValidationResult): void {
  const mainBreakers = symbols.filter(
    (s) => s.type.toUpperCase().includes("FR") || s.type.toUpperCase().includes("SWITCH"),
  );

  if (mainBreakers.length === 0) return;

  const totalCurrent = symbols.reduce((sum, s) => {
    if (s.deviceKind !== "mcb" && s.deviceKind !== "rcbo") return sum;
    return sum + calculateCurrent(s.powerW, s.phase, PHASE_VOLTAGE);
  }, 0);

  for (const mainBreaker of mainBreakers) {
    const mainRating = parseProtectionRating(mainBreaker.frRatedCurrent);
    if (mainRating <= 0) continue;

    if (totalCurrent > mainRating) {
      result.errors.push({
        code: "VAL-007",
        message: `Przeciążenie wyłącznika głównego`,
        details: `Sumaryczny prąd obwodów: ${totalCurrent.toFixed(1)}A, znamionowy prąd FR: ${mainRating}A`,
        severity: "Error",
        symbolId: mainBreaker.id,
      });
    }
  }
}

function validateRcdOverload(symbols: SymbolItem[], result: ValidationResult): void {
  const rcds = symbols.filter((s) => s.deviceKind === "rcd");

  for (const rcd of rcds) {
    const mcbs = symbols.filter(
      (s) => s.rcdSymbolId === rcd.id && (s.deviceKind === "mcb" || s.deviceKind === "rcbo"),
    );

    if (mcbs.length === 0) continue;

    const totalCurrent = mcbs.reduce((sum, m) => {
      return sum + parseProtectionRating(m.protectionType);
    }, 0);

    if (rcd.rcdRatedCurrent > 0 && totalCurrent > rcd.rcdRatedCurrent) {
      result.warnings.push({
        code: "VAL-008",
        message: `Przeciazenie RCD "${rcd.label || rcd.id}"`,
        details: `Suma zabezpieczeń obwodów: ${totalCurrent}A, znamionowy prąd RCD: ${rcd.rcdRatedCurrent}A`,
        severity: "Warning",
        symbolId: rcd.id,
      });
    }
  }
}

function validateRcdHierarchy(symbols: SymbolItem[], result: ValidationResult): void {
  const rcds = symbols.filter((s) => s.deviceKind === "rcd");
  const rcdMap = new Map(rcds.map((s) => [s.id, s]));

  for (const rcd of rcds) {
    if (!rcd.rcdSymbolId) continue;
    
    const parentRcd = rcdMap.get(rcd.rcdSymbolId);
    if (!parentRcd) continue;

    if (rcd.rcdResidualCurrent > parentRcd.rcdResidualCurrent) {
      result.errors.push({
        code: "VAL-009",
        message: `Błąd hierarchii RCD`,
        details: `Wyłącznik RCD "${rcd.label || rcd.id}" ma większy prąd różnicowy (${rcd.rcdResidualCurrent}mA) niż wyłącznik nadrzędny (${parentRcd.rcdResidualCurrent}mA).`,
        severity: "Error",
        symbolId: rcd.id,
      });
    }
  }
}

// ================================================================
// Helpers
// ================================================================

function parseProtectionRating(protectionType: string): number {
  if (!protectionType) return 0;
  const match = protectionType.match(/[BCDZK](\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

function getCableCapacity(crossSectionMm2: number): number {
  return CABLE_CAPACITY_BY_CROSS_SECTION[crossSectionMm2] ?? 0;
}

function calculateVoltageDrop(currentA: number, crossSectionMm2: number, lengthM: number): number {
  // Voltage drop: dU = sqrt(3) * I * L * (rho / S) for 3-phase
  // For single-phase: dU = 2 * I * L * (rho / S)
  // rho (copper) = 0.0175 Ohm*mm²/m
  const rho = 0.0175;
  return (2 * currentA * lengthM * rho) / crossSectionMm2;
}
