import {
  isDistributionBlockSymbol,
  isTerminalOrConnectorSymbol,
  type SymbolItem,
} from "../../types/symbolItem";
import {
  detectPoleCountWithFallback as getPoleCount,
  detectPhaseCount as detectPhaseText,
} from "../poleCount";
import {
  isMainBreaker,
  isSpd,
  isIndicator,
  isThreePhaseDevice,
  isRcdDevice,
  isRcboDevice,
  normalizeValidationText,
} from "../deviceIdentification";
import type { SchematicNode } from "./schematicLayout";

export const MANUAL_PHASE_KEY = "ManualPhase";
export const INDUCTION_OVEN_ENABLED_KEY = "GroupScenario.InductionWithOven.Enabled";
export const INDUCTION_OVEN_PATTERN_KEY = "GroupScenario.InductionWithOven.Pattern";

export type ModulePoleCount = 0 | 1 | 2 | 3 | 4;

// WHY: "root nodes" = węzły, które nie są dzieckiem żadnego innego węzła
// (korzenie drzewa schematu). Jedno wspólne źródło dla useSchematicInteraction
// i schematicCellEdit — wcześniej były dwie identyczne kopie lokalne.
// UWAGA: to NIE to samo co `getRenderRootNodes` w schematicRenderUtils.ts —
// tamta wersja dodatkowo wyklucza węzły topDevice (patrz komentarz tam).
export function getRootNodes(nodes: SchematicNode[]): SchematicNode[] {
  const childIds = new Set(nodes.flatMap((node) => node.children.map((child) => child.id)));
  return nodes.filter((node) => !childIds.has(node.id));
}

export function getModuleType(symbol: SymbolItem): SchematicNode["nodeType"] {
  if (symbol.deviceKind === "rcd" || isRcdDevice(symbol)) return "RCD";
  if (symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo" || isRcboDevice(symbol)) return "MCB";
  if (symbol.deviceKind === "spd" || isSpd(symbol)) return "SPD";
  if (symbol.deviceKind === "fr" || isMainBreaker(symbol)) return "MainBreaker";
  if (symbol.deviceKind === "phaseIndicator" || isIndicator(symbol)) return "PhaseIndicator";
  return "MCB";
}

export function isRcd(symbol: SymbolItem): boolean {
  return getModuleType(symbol) === "RCD";
}

export function isFixedThreePhaseRcdSymbol(symbol: SymbolItem): boolean {
  if (!isRcd(symbol)) {
    return false;
  }

  if (hasExplicitSinglePhaseRcdHint(symbol)) {
    return false;
  }

  return isThreePhaseDevice(symbol);
}

export function isThreePhaseRcdHead(symbol: SymbolItem): boolean {
  if (hasExplicitSinglePhaseRcdHint(symbol)) {
    return false;
  }

  if (hasExplicitThreePhaseRcdHint(symbol)) {
    return true;
  }

  const poleCount = getPoleCount(symbol);
  if (poleCount === 3 || poleCount === 4) {
    return true;
  }

  return detectPhases(symbol) >= 3;
}

export function resolveSinglePhaseRcdPhase(phase: string, autoIndex: number): "L1" | "L2" | "L3" {
  if (phase === "L1" || phase === "L2" || phase === "L3") {
    return phase;
  }

  const phases = ["L1", "L2", "L3"] as const;
  return phases[autoIndex % phases.length];
}

export function getExplicitRcdPoleHint(symbol: SymbolItem): ModulePoleCount {
  const identity = `${symbol.type} ${symbol.label} ${symbol.visualPath} ${symbol.moduleRef}`.toUpperCase();
  const match = identity.match(
    /(^|[^0-9])([1-4])\s*-?\s*(?:P|POL[A-Z]*|BIEG[A-Z]*|TOR[A-Z]*)([^A-Z0-9]|$)/,
  );
  if (!match) {
    return 0;
  }

  return Number.parseInt(match[2]!, 10) as ModulePoleCount;
}

export function hasExplicitSinglePhaseRcdHint(symbol: SymbolItem): boolean {
  const identity = `${symbol.type} ${symbol.label} ${symbol.visualPath} ${symbol.moduleRef}`.toUpperCase();
  const poles = getExplicitRcdPoleHint(symbol);
  return poles === 1 || poles === 2 || identity.includes("2P") || identity.includes("1P");
}

export function hasExplicitThreePhaseRcdHint(symbol: SymbolItem): boolean {
  const identity = `${symbol.type} ${symbol.label} ${symbol.visualPath} ${symbol.moduleRef}`.toUpperCase();
  const poles = getExplicitRcdPoleHint(symbol);
  return poles === 3 || poles === 4 || identity.includes("4P") || identity.includes("3P");
}

export function isNetworkSwitch(symbol: SymbolItem): boolean {
  const identity = normalizeValidationText(symbol.type, symbol.label, symbol.visualPath, symbol.moduleRef);
  return identity.includes("przelacznik") && identity.includes("siec");
}

export function isKf(symbol: SymbolItem): boolean {
  return getModuleType(symbol) === "PhaseIndicator";
}

export function isDistributionBlock(symbol: SymbolItem): boolean {
  return isDistributionBlockSymbol(symbol);
}

export function isNeutralTerminalBlock(symbol: SymbolItem): boolean {
  if (!isTerminalOrConnectorSymbol(symbol) && !isDistributionBlockSymbol(symbol)) {
    return false;
  }

  const desig = (symbol.displayModuleNumber || symbol.referenceDesignation || "").toUpperCase();
  if (/^N\d+$/.test(desig)) {
    return true;
  }
  if (/^PE\d+$/.test(desig)) {
    return false;
  }

  const text = `${symbol.type || ""} ${symbol.label || ""} ${symbol.circuitName || ""} ${symbol.circuitDescription || ""} ${symbol.visualPath || ""} ${symbol.moduleRef || ""} ${symbol.phase || ""}`.toUpperCase();

  if (/(^|[\s/-])PE([\s/-]|$)/.test(text) || text.includes("ZIELON") || text.includes("OCHRON")) {
    return false;
  }

  return (
    /(^|[\s/-])N[\d_]*([\s/-]|$)/.test(text) ||
    text.includes("NIEBIESK") ||
    text.includes("NEUTRAL") ||
    (symbol.phase as string) === "N"
  );
}

export function detectPhases(symbol: SymbolItem): number {
  const fromPhase = detectPhaseText(symbol.phase);
  if (fromPhase > 0 && !isPendingPhase(symbol.phase)) {
    return fromPhase;
  }

  const poleCount = getPoleCount(symbol);
  if (poleCount === 3 || poleCount === 4) return 3;
  return 1;
}

export function isPendingPhase(phase: string | null | undefined): boolean {
  return !phase || phase.toLocaleLowerCase("pl-PL") === "pending";
}

export function isManualPhase(symbol: SymbolItem): boolean {
  return symbol.parameters[MANUAL_PHASE_KEY] === "true";
}

export function isManualNodePhase(node: SchematicNode): boolean {
  return node.isPhaseManual;
}

export function getNodeFixedInductionWithOvenScenarioPhase(node: SchematicNode, poleCount: ModulePoleCount): string {
  if (!node.fixedScenarioPhase) {
    return "";
  }

  if (poleCount === 2) return "L1+L2";
  if (poleCount === 1) return "L3";
  return "";
}

export function getFixedInductionWithOvenScenarioPhase(symbol: SymbolItem): string {
  if (
    symbol.parameters[INDUCTION_OVEN_ENABLED_KEY] !== "true" ||
    symbol.parameters[INDUCTION_OVEN_PATTERN_KEY] !== "Rcd4PWithMcb2PAnd1P"
  ) {
    return "";
  }

  return "Rcd4PWithMcb2PAnd1P";
}
