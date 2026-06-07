import type { SymbolItem } from "../../types/symbolItem";
import {
  calculateCurrent,
  calculateTotalDistribution,
  distributePower,
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

const PHASE_VOLTAGE = 230;
const IMBALANCE_THRESHOLD_PERCENT = 30;
const VOLTAGE_DROP_LIMIT_LIGHTING = 3.0;
const VOLTAGE_DROP_LIMIT_OTHER = 5.0;

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

const MIN_CABLE_CROSS_SECTION_BY_CIRCUIT_TYPE: Partial<Record<SymbolItem["circuitType"], number>> = {
  Oswietlenie: 1.5,
  Gniazdo: 2.5,
  Sila: 2.5,
};

export interface ValidationConfig {
  supplyVoltageV?: number;
  mainBreakerA?: number;
  imbalanceThresholdPercent?: number;
}

export function validateProject(
  symbols: SymbolItem[],
  configOrImbalanceThreshold: ValidationConfig | number = IMBALANCE_THRESHOLD_PERCENT,
): ValidationResult {
  const config: ValidationConfig =
    typeof configOrImbalanceThreshold === "number"
      ? { imbalanceThresholdPercent: configOrImbalanceThreshold }
      : configOrImbalanceThreshold ?? {};
  const phaseVoltage = config.supplyVoltageV ?? PHASE_VOLTAGE;
  const imbalanceThresholdPercent = config.imbalanceThresholdPercent ?? IMBALANCE_THRESHOLD_PERCENT;

  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    info: [],
  };

  const phaseLoads = calculateTotalDistribution(symbols);

  validatePhaseImbalance(phaseLoads, result, imbalanceThresholdPercent);
  validateCircuitDocumentationCompleteness(symbols, result);
  validateCableDataCompleteness(symbols, result);
  validateCableSafety(symbols, result, phaseVoltage);
  validateProtectionMismatch(symbols, result);
  validateNoRcdProtection(symbols, result);
  validateMainOverload(symbols, result, phaseVoltage, config.mainBreakerA);
  validateRcdOverload(symbols, result);
  validateRcdHierarchy(symbols, result);
  validateRcdSelectivity(symbols, result);
  validateRcdPhaseCompatibility(symbols, result);
  validateRcdTypeCompatibility(symbols, result);
  validateRcboParameters(symbols, result);
  validateMainProtectionCoordination(symbols, result, config.mainBreakerA);

  result.isValid = result.errors.length === 0;
  return result;
}

function validatePhaseImbalance(
  phaseLoads: ReturnType<typeof calculateTotalDistribution>,
  result: ValidationResult,
  threshold: number,
): void {
  if (phaseLoads.imbalancePercent > threshold) {
    result.warnings.push({
      code: "VAL-001",
      message: `Asymetria obciążenia faz: ${phaseLoads.imbalancePercent.toFixed(1)}%`,
      details: `L1: ${phaseLoads.l1PowerW.toFixed(0)}W, L2: ${phaseLoads.l2PowerW.toFixed(0)}W, L3: ${phaseLoads.l3PowerW.toFixed(0)}W`,
      severity: "Warning",
    });
  }
}

function validateCableSafety(
  symbols: SymbolItem[],
  result: ValidationResult,
  phaseVoltage: number,
): void {
  for (const symbol of symbols) {
    if (symbol.powerW <= 0) continue;
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;

    const current = calculateCurrent(symbol.powerW, symbol.phase, phaseVoltage);
    const protectionRating = parseProtectionRating(symbol.protectionType);

    if (protectionRating <= 0) continue;

    const maxCableCurrent = getCableCapacity(symbol.cableCrossSection);
    if (maxCableCurrent <= 0 || symbol.cableLength <= 0) continue;

    if (current > maxCableCurrent) {
      result.errors.push({
        code: "VAL-002",
        message: `Przeciążenie przewodu w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: `Prąd: ${current.toFixed(1)}A, maksymalny prąd przewodu ${symbol.cableCrossSection}mm2: ${maxCableCurrent}A`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }

    if (protectionRating > maxCableCurrent) {
      result.warnings.push({
        code: "VAL-003",
        message: `Niedopasowanie zabezpieczenia do przewodu w obwodzie "${symbol.circuitName || symbol.label}"`,
        details: `Zabezpieczenie: ${protectionRating}A, przewód ${symbol.cableCrossSection}mm2: ${maxCableCurrent}A`,
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    const voltageDrop = calculateVoltageDrop(current, symbol.cableCrossSection, symbol.cableLength, symbol.phase);
    const voltageDropPercent = (voltageDrop / phaseVoltage) * 100;
    const limit = symbol.circuitType === "Oswietlenie" ? VOLTAGE_DROP_LIMIT_LIGHTING : VOLTAGE_DROP_LIMIT_OTHER;

    if (voltageDropPercent > limit) {
      result.warnings.push({
        code: "VAL-004",
        message: `Zbyt duży spadek napięcia w obwodzie "${symbol.circuitName || symbol.label}"`,
        details: `Spadek: ${voltageDropPercent.toFixed(1)}%, limit: ${limit}% (długość: ${symbol.cableLength}m, przekrój: ${symbol.cableCrossSection}mm2)`,
        severity: "Warning",
        symbolId: symbol.id,
      });
    }
  }
}

function validateCircuitDocumentationCompleteness(symbols: SymbolItem[], result: ValidationResult): void {
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

function validateProtectionMismatch(symbols: SymbolItem[], result: ValidationResult): void {
  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;

    const protectionRating = parseProtectionRating(symbol.protectionType);
    if (protectionRating <= 0) continue;

    const maxCableCurrent = getCableCapacity(symbol.cableCrossSection);
    if (maxCableCurrent <= 0) continue;

    if (protectionRating > maxCableCurrent * 1.45) {
      result.errors.push({
        code: "VAL-005",
        message: `Zabezpieczenie zbyt duże dla przewodu w obwodzie "${symbol.circuitName || symbol.label}"`,
        details: `Zabezpieczenie: ${protectionRating}A, przewód ${symbol.cableCrossSection}mm2 nie zapewnia ochrony przy przeciążeniu >${(maxCableCurrent * 1.45).toFixed(0)}A`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }
  }
}

function validateCableDataCompleteness(symbols: SymbolItem[], result: ValidationResult): void {
  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;

    if (symbol.cableCrossSection <= 0) {
      result.warnings.push({
        code: "VAL-015",
        message: `Brak przekroju przewodu w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: "Podaj przekrój przewodu, aby walidacja obciążalności i spadku napięcia była wiarygodna.",
        severity: "Warning",
        symbolId: symbol.id,
      });
    } else if (getCableCapacity(symbol.cableCrossSection) <= 0) {
      result.warnings.push({
        code: "VAL-015",
        message: `Nietypowy przekrój przewodu w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: `Przekrój ${symbol.cableCrossSection}mm2 nie występuje w tabeli obciążalności używanej przez program.`,
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    if (symbol.cableLength <= 0) {
      result.warnings.push({
        code: "VAL-016",
        message: `Brak długości przewodu w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: "Podaj długość przewodu, aby program mógł sprawdzić spadek napięcia.",
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    const minimumCrossSection = MIN_CABLE_CROSS_SECTION_BY_CIRCUIT_TYPE[symbol.circuitType];
    if (
      minimumCrossSection &&
      symbol.cableCrossSection > 0 &&
      symbol.cableCrossSection < minimumCrossSection
    ) {
      result.warnings.push({
        code: "VAL-017",
        message: `Przekrój przewodu może być zbyt mały dla obwodu "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: `Typ obwodu: ${symbol.circuitType}, przekrój: ${symbol.cableCrossSection}mm2, typowe minimum: ${minimumCrossSection}mm2.`,
        severity: "Warning",
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
      message: `Obwód "${symbol.circuitName || symbol.label}" bez ochrony RCD`,
      details: "Obwód nie jest chroniony przez wyłącznik RCD.",
      severity: "Warning",
      symbolId: symbol.id,
    });
  }
}

function validateMainOverload(
  symbols: SymbolItem[],
  result: ValidationResult,
  phaseVoltage: number,
  configuredMainBreakerA?: number,
): void {
  const mainBreakers = symbols.filter(
    (s) => s.type.toUpperCase().includes("FR") || s.type.toUpperCase().includes("SWITCH"),
  );

  const phaseCurrents = calculateCircuitPhaseCurrents(symbols, phaseVoltage);
  const maxPhaseCurrent = Math.max(phaseCurrents.l1CurrentA, phaseCurrents.l2CurrentA, phaseCurrents.l3CurrentA);
  const currentDetails = `L1: ${phaseCurrents.l1CurrentA.toFixed(1)}A, L2: ${phaseCurrents.l2CurrentA.toFixed(1)}A, L3: ${phaseCurrents.l3CurrentA.toFixed(1)}A`;

  if (mainBreakers.length === 0) {
    if (configuredMainBreakerA && configuredMainBreakerA > 0 && maxPhaseCurrent > configuredMainBreakerA) {
      result.errors.push({
        code: "VAL-007",
        message: "Przeciążenie zabezpieczenia głównego",
        details: `Największy prąd fazowy: ${maxPhaseCurrent.toFixed(1)}A, znamionowy prąd główny (konfiguracja): ${configuredMainBreakerA}A. ${currentDetails}`,
        severity: "Error",
      });
    }
    return;
  }

  for (const mainBreaker of mainBreakers) {
    const mainRating = parseProtectionRating(mainBreaker.frRatedCurrent);
    if (mainRating <= 0) continue;

    if (maxPhaseCurrent > mainRating) {
      result.errors.push({
        code: "VAL-007",
        message: "Przeciążenie wyłącznika głównego",
        details: `Największy prąd fazowy: ${maxPhaseCurrent.toFixed(1)}A, znamionowy prąd FR: ${mainRating}A. ${currentDetails}`,
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

    const totalCurrent = mcbs.reduce((sum, m) => sum + parseProtectionRating(m.protectionType), 0);

    if (rcd.rcdRatedCurrent > 0 && totalCurrent > rcd.rcdRatedCurrent) {
      result.warnings.push({
        code: "VAL-008",
        message: `Przeciążenie RCD "${rcd.label || rcd.id}"`,
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
        message: "Błąd hierarchii RCD",
        details: `Wyłącznik RCD "${rcd.label || rcd.id}" ma większy prąd różnicowy (${rcd.rcdResidualCurrent}mA) niż wyłącznik nadrzędny (${parentRcd.rcdResidualCurrent}mA).`,
        severity: "Error",
        symbolId: rcd.id,
      });
    }
  }
}

function validateRcdSelectivity(symbols: SymbolItem[], result: ValidationResult): void {
  const rcds = symbols.filter((s) => s.deviceKind === "rcd");
  const rcdMap = new Map(rcds.map((s) => [s.id, s]));

  for (const rcd of rcds) {
    if (!rcd.rcdSymbolId) continue;

    const parentRcd = rcdMap.get(rcd.rcdSymbolId);
    if (!parentRcd) continue;
    if (parentRcd.rcdResidualCurrent <= 0 || rcd.rcdResidualCurrent <= 0) continue;

    if (parentRcd.rcdResidualCurrent < rcd.rcdResidualCurrent * 3) {
      result.warnings.push({
        code: "VAL-022",
        message: "Możliwy brak selektywności RCD",
        details: `RCD nadrzędny "${parentRcd.label || parentRcd.id}" ma ${parentRcd.rcdResidualCurrent}mA, a podrzędny "${rcd.label || rcd.id}" ma ${rcd.rcdResidualCurrent}mA. Dla kaskady zwykle oczekuje się wyraźnie większego progu nadrzędnego.`,
        severity: "Warning",
        symbolId: rcd.id,
      });
    }
  }
}

function validateRcdPhaseCompatibility(symbols: SymbolItem[], result: ValidationResult): void {
  const rcdMap = new Map(
    symbols
      .filter((symbol) => symbol.deviceKind === "rcd")
      .map((symbol) => [symbol.id, symbol]),
  );

  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;
    if (!symbol.rcdSymbolId) continue;

    const rcd = rcdMap.get(symbol.rcdSymbolId);
    if (!rcd) continue;

    if (isThreePhaseRcd(rcd)) {
      continue;
    }

    const rcdPhase = normalizeSinglePhase(rcd.phase);
    const circuitPhase = normalizeSinglePhase(symbol.phase);
    if (!rcdPhase || circuitPhase !== rcdPhase) {
      result.errors.push({
        code: "VAL-010",
        message: `Niezgodność faz obwodu z RCD "${rcd.label || rcd.id}"`,
        details: `RCD jednofazowy jest przypisany do ${rcdPhase ?? "nieznanej fazy"}, a obwód "${symbol.circuitName || symbol.label || symbol.id}" ma fazę ${symbol.phase || "brak"}.`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }
  }
}

function validateRcdTypeCompatibility(symbols: SymbolItem[], result: ValidationResult): void {
  const rcdMap = new Map(
    symbols
      .filter((symbol) => symbol.deviceKind === "rcd")
      .map((symbol) => [symbol.id, symbol]),
  );

  for (const symbol of symbols) {
    if (symbol.deviceKind !== "mcb" && symbol.deviceKind !== "rcbo") continue;

    const recommendation = getRcdTypeRecommendation(symbol);
    if (!recommendation) continue;

    const protectingRcd = symbol.deviceKind === "rcbo" ? symbol : rcdMap.get(symbol.rcdSymbolId);
    if (!protectingRcd) continue;

    const actualType = normalizeRcdType(protectingRcd.rcdType);
    if (isRcdTypeAllowed(actualType, recommendation.allowedTypes)) {
      continue;
    }

    result.warnings.push({
      code: "VAL-011",
      message: `Typ RCD może być niedopasowany do odbiornika "${symbol.circuitName || symbol.label || symbol.id}"`,
      details: `${recommendation.reason} Aktualny typ: ${actualType || "brak"}, zalecany: ${recommendation.allowedTypes.join(" lub ")}.`,
      severity: "Warning",
      symbolId: symbol.id,
    });
  }
}

function validateRcboParameters(symbols: SymbolItem[], result: ValidationResult): void {
  for (const symbol of symbols) {
    if (symbol.deviceKind !== "rcbo") continue;

    const protectionRating = parseProtectionRating(symbol.protectionType);
    if (protectionRating <= 0) {
      result.warnings.push({
        code: "VAL-012",
        message: `Brak członu nadprądowego RCBO w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: "RCBO powinien mieć określoną charakterystykę i prąd zabezpieczenia, np. B16 albo C16.",
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    if (symbol.rcdResidualCurrent <= 0) {
      result.warnings.push({
        code: "VAL-012",
        message: `Brak prądu różnicowego RCBO w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: "RCBO powinien mieć określony prąd różnicowy, np. 30mA.",
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    if (!normalizeRcdType(symbol.rcdType)) {
      result.warnings.push({
        code: "VAL-012",
        message: `Brak typu RCD w RCBO dla obwodu "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: "RCBO powinien mieć określony typ części różnicowoprądowej, np. A, F albo B.",
        severity: "Warning",
        symbolId: symbol.id,
      });
    }

    if (symbol.rcdRatedCurrent > 0 && protectionRating > symbol.rcdRatedCurrent) {
      result.errors.push({
        code: "VAL-013",
        message: `Człon nadprądowy RCBO przekracza prąd znamionowy aparatu w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: `Zabezpieczenie: ${protectionRating}A, prąd znamionowy RCBO: ${symbol.rcdRatedCurrent}A.`,
        severity: "Error",
        symbolId: symbol.id,
      });
    }

    if (isAdditionalProtectionCircuit(symbol) && symbol.rcdResidualCurrent > 30) {
      result.warnings.push({
        code: "VAL-014",
        message: `Wysoki prąd różnicowy RCBO w obwodzie "${symbol.circuitName || symbol.label || symbol.id}"`,
        details: `Dla obwodów gniazdowych i oświetleniowych typowo stosuje się ochronę dodatkową 30mA. Aktualnie: ${symbol.rcdResidualCurrent}mA.`,
        severity: "Warning",
        symbolId: symbol.id,
      });
    }
  }
}

function validateMainProtectionCoordination(
  symbols: SymbolItem[],
  result: ValidationResult,
  configuredMainBreakerA?: number,
): void {
  const mainRatings = [
    ...symbols
      .filter((symbol) => symbol.type.toUpperCase().includes("FR") || symbol.type.toUpperCase().includes("SWITCH"))
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

function parseProtectionRating(protectionType: string): number {
  if (!protectionType) return 0;
  const match = protectionType.match(/[BCDZK](\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

function getCableCapacity(crossSectionMm2: number): number {
  return CABLE_CAPACITY_BY_CROSS_SECTION[crossSectionMm2] ?? 0;
}

function calculateVoltageDrop(
  currentA: number,
  crossSectionMm2: number,
  lengthM: number,
  phase: string | undefined | null,
): number {
  const rho = 0.0175;
  const phaseUpper = (phase || "").toUpperCase();
  const multiplier = phaseUpper === "L1+L2+L3" || phaseUpper === "3F" ? Math.sqrt(3) : 2;
  return (multiplier * currentA * lengthM * rho) / crossSectionMm2;
}

function calculateCircuitPhaseCurrents(
  symbols: SymbolItem[],
  phaseVoltage: number,
): Pick<PhaseLoadResult, "l1CurrentA" | "l2CurrentA" | "l3CurrentA"> {
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

function isThreePhaseRcd(rcd: SymbolItem): boolean {
  const identity = normalizeValidationText(rcd.type, rcd.label, rcd.moduleRef, rcd.visualPath);
  const phase = (rcd.phase || "").toUpperCase();

  return (
    phase === "L1+L2+L3" ||
    phase === "3F" ||
    identity.includes("3P+N") ||
    identity.includes("3P N") ||
    identity.includes("4P") ||
    identity.includes("3P")
  );
}

function normalizeSinglePhase(phase: string | undefined | null): "L1" | "L2" | "L3" | null {
  const normalized = (phase || "").toUpperCase();
  if (normalized === "L1" || normalized === "L2" || normalized === "L3") {
    return normalized;
  }

  return null;
}

function normalizeValidationText(...values: Array<string | undefined | null>): string {
  return values
    .join(" ")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

interface RcdTypeRecommendation {
  allowedTypes: string[];
  reason: string;
}

function getRcdTypeRecommendation(symbol: SymbolItem): RcdTypeRecommendation | null {
  const text = normalizeValidationText(
    symbol.circuitName,
    symbol.circuitDescription,
    symbol.location,
    symbol.label,
    symbol.type,
  );

  if (
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
      reason: "Odbiornik może generować składową stałą lub prądy upływu wysokiej częstotliwości.",
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
      reason: "Odbiornik z napędem lub elektroniką mocy zwykle wymaga RCD lepiej odpornego na prądy mieszane.",
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
      reason: "Odbiornik elektroniczny nie powinien być chroniony wyłącznikiem RCD typu AC.",
    };
  }

  return null;
}

function hasAnyToken(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function hasText(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeRcdType(type: string | undefined | null): string {
  return (type || "").trim().toUpperCase();
}

function isRcdTypeAllowed(actualType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(actualType);
}

function isAdditionalProtectionCircuit(symbol: SymbolItem): boolean {
  return symbol.circuitType === "Gniazdo" || symbol.circuitType === "Oswietlenie";
}
