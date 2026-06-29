import type { SymbolItem } from "../../types/symbolItem";
import type { PhaseAssignment } from "../../types/symbolItem";
import { detectPoleCount } from "../poleCount";
import { isAuxiliaryNonCircuitSymbol } from "../../types/symbolItem";
import { isGroupHeadSymbol } from "../domain/symbolGrouping";

export type BalanceMode = "Power" | "Current";
export type BalanceScope = "AllSinglePhase" | "OnlyUnlocked";

export interface PhaseDistributionResult {
  l1PowerW: number;
  l2PowerW: number;
  l3PowerW: number;
  l1CurrentA: number;
  l2CurrentA: number;
  l3CurrentA: number;
  imbalancePercent: number;
}

// ================================================================
// Core power distribution
// ================================================================

export function distributePower(powerW: number, phase: PhaseAssignment | string | undefined | null): [number, number, number] {
  if (powerW <= 0) return [0, 0, 0];

  const phaseUpper = (phase || "").toUpperCase();

  switch (phaseUpper) {
    case "L2": return [0, powerW, 0];
    case "L3": return [0, 0, powerW];
    case "L1+L2+L3":
    case "3F": return [powerW / 3, powerW / 3, powerW / 3];
    case "L1+L2": return [powerW / 2, powerW / 2, 0];
    case "L1+L3": return [powerW / 2, 0, powerW / 2];
    case "L2+L3": return [0, powerW / 2, powerW / 2];
    // WHY: order matters in the switch labels above — "L1+L3" splits equally
    // across L1 and L3, but "L3+L1" (reversed) does NOT match any case and
    // falls through to the L1-only default branch, returning [powerW, 0, 0].
    // Callers must normalize the phase string before calling. PhaseAssignment
    // type guarantees a canonical order (L1<L2<L3), so user-supplied strings
    // from the schema are safe — but ad-hoc strings elsewhere are not.
    // "L1" and default
    default: return [powerW, 0, 0];
  }
}

export function calculateTotalDistribution(symbols: SymbolItem[], powerFactor: number = 0.9): PhaseDistributionResult {
  let l1 = 0, l2 = 0, l3 = 0;

  for (const symbol of symbols) {
    // Skip auxiliary (non-circuit) symbols: terminal blocks (listwy),
    // distribution blocks (bloki rozdzielcze), RCDs, phase indicators.
    // They do not consume power themselves; they only pass it through
    // or aggregate it. Including them in the total would falsely attribute
    // upstream MCB loads to the listwa/busbar module.
    if (isAuxiliaryNonCircuitSymbol(symbol)) {
      continue;
    }
    const [dl1, dl2, dl3] = distributePower(symbol.powerW, symbol.phase);
    l1 += dl1;
    l2 += dl2;
    l3 += dl3;
  }

  return computeResultFromPowers(l1, l2, l3, powerFactor);
}

export function calculateCurrent(
  powerW: number,
  phase: PhaseAssignment | string | undefined | null,
  voltage: number = 230,
  powerFactor: number = 0.9,
): number {
  if (powerW <= 0) return 0;

  // WHY: 0.9 is the project default for mixed residential / light-commercial
  // loads (lighting, sockets, light AGD). The value lives on `ProjectMetadata`
  // and is passed in by callers that have access to it; this signature keeps a
  // fallback so older call sites keep compiling.
  const cosPhi = powerFactor > 0 ? powerFactor : 0.9;
  const phaseUpper = (phase || "").toUpperCase();

  switch (phaseUpper) {
    case "L1+L2+L3":
    case "3F": return powerW / (3 * voltage * cosPhi);
    case "L1+L2":
    case "L1+L3":
    case "L2+L3": return powerW / (2 * voltage * cosPhi);
    default: return powerW / (voltage * cosPhi);
  }
}

export function calculateImbalancePercent(l1: number, l2: number, l3: number): number {
  const avg = (l1 + l2 + l3) / 3;
  if (avg <= 0) return 0;

  const maxDev = Math.max(Math.abs(l1 - avg), Math.abs(l2 - avg), Math.abs(l3 - avg));
  return (maxDev / avg) * 100;
}

// ================================================================
// Auto-balancing
// ================================================================

const PHASE_NAMES: PhaseAssignment[] = ["L1", "L2", "L3"];
const MIN_REFINEMENT_DIFF = 0.01;
const MAX_MOVE_REFINEMENT_STEPS = 50;
const MAX_SWAP_REFINEMENT_STEPS = 30;
const ZERO_POWER_UNIT_WEIGHT = 0.001;
// WHY: 5% (not 3% or 10%) — PN-HD 60364 does not pin a number; the polish
// engineering practice treats ≤ 10% as acceptable and ≤ 5% as good. The
// auto-balance refinement stops once it cannot improve below this target,
// so a tighter threshold only matters when near-perfect balance is reachable.
const TARGET_IMBALANCE_PERCENT = 5.0;
const MIN_SWAP_IMPROVEMENT_PERCENT = 0.5;
const INDUCTION_OVEN_ENABLED_KEY = "GroupScenario.InductionWithOven.Enabled";
const INDUCTION_OVEN_PATTERN_KEY = "GroupScenario.InductionWithOven.Pattern";
const INDUCTION_OVEN_PATTERN_VALUE = "Rcd4PWithMcb2PAnd1P";
const MIN_TIE_EPSILON = 0.01;

interface BalanceUnit {
  symbols: SymbolItem[];
  totalWeight: number;
  label: string;
}

export interface BalancePlan {
  snapshot: Map<string, PhaseAssignment>;
  units: BalanceUnit[];
  loads: [number, number, number];
  workingSymbols: SymbolItem[];
  phaseIndicatorAssignments: Array<{ symbol: SymbolItem; phase: PhaseAssignment }>;
  tieBreaker: number;
}

export interface AppliedBalanceResult {
  symbols: SymbolItem[];
  changedCount: number;
}

export function autoBalancePhases(
  symbols: SymbolItem[],
  mode: BalanceMode = "Current",
  scope: BalanceScope = "OnlyUnlocked",
  voltage: number = 230,
): BalancePlan {
  const plan: BalancePlan = {
    snapshot: new Map(),
    units: [],
    loads: [0, 0, 0],
    workingSymbols: symbols.map((s) => ({ ...s })),
    phaseIndicatorAssignments: [],
    tieBreaker: 0,
  };

  for (const symbol of symbols) {
    plan.snapshot.set(symbol.id, symbol.phase);
  }

  // Separate phase indicators (fixed L1/L2/L3)
  const phaseIndicators = plan.workingSymbols.filter(isPhaseIndicator);
  for (let i = 0; i < phaseIndicators.length; i++) {
    plan.phaseIndicatorAssignments.push({
      symbol: phaseIndicators[i],
      phase: PHASE_NAMES[i % 3],
    });
  }

  // Remove phase indicators from working set
  const indicatorIds = new Set(phaseIndicators.map((s) => s.id));
  plan.workingSymbols = plan.workingSymbols.filter((s) => !indicatorIds.has(s.id));

  // Build RCD -> MCB mapping
  const rcdMap = new Map<string, SymbolItem>();
  const mcbsByRcd = new Map<string, SymbolItem[]>();

  for (const symbol of plan.workingSymbols) {
    if (isGroupHeadSymbol(symbol)) {
      rcdMap.set(symbol.id, symbol);
    }
  }

  for (const symbol of plan.workingSymbols) {
    if (symbol.rcdSymbolId && rcdMap.has(symbol.rcdSymbolId)) {
      if (!mcbsByRcd.has(symbol.rcdSymbolId)) {
        mcbsByRcd.set(symbol.rcdSymbolId, []);
      }
      mcbsByRcd.get(symbol.rcdSymbolId)!.push(symbol);
    }
  }

  const processedIds = new Set<string>();

  // Single-phase RCD groups
  for (const [rcdId, rcd] of rcdMap) {
    if (!isRcdSinglePhase(rcd)) continue;

    const mcbs = mcbsByRcd.get(rcdId) ?? [];
    const anyLocked = rcd.isPhaseLocked || mcbs.some((m) => m.isPhaseLocked);

    if (scope === "OnlyUnlocked" && anyLocked) {
      const weight = mcbs.reduce((sum, m) => sum + getSymbolWeight(m, mode, voltage), 0);
      addWeightToPhaseLoad(plan.loads, rcd.phase, weight);
      processedIds.add(rcdId);
      for (const m of mcbs) processedIds.add(m.id);
      continue;
    }

    const unit: BalanceUnit = {
      symbols: [rcd, ...mcbs],
      totalWeight: 0,
      label: `RCD-grupa (${mcbs.length + 1} szt.)`,
    };

    const powerWeight = mcbs.reduce((sum, m) => sum + getSymbolWeight(m, mode, voltage), 0);
    // WHY: ZERO_POWER_UNIT_WEIGHT is a tiny non-zero fallback (0.001) instead
    // of 0 — if all MCBs in a group report zero power, the balancing algo
    // would otherwise treat the group as infinitely divisible (divide by
    // weight = 0). Using a tiny weight still lets the algo pick a phase for
    // the group, while keeping zero-power groups a vanishingly small slice
    // of the overall balance — so they don't visibly skew the result, but
    // they DO get assigned to some phase.
    unit.totalWeight = powerWeight > 0 ? powerWeight : ZERO_POWER_UNIT_WEIGHT * Math.max(mcbs.length, 1);
    plan.units.push(unit);

    processedIds.add(rcdId);
    for (const m of mcbs) processedIds.add(m.id);
  }

  // 3-phase RCDs - individual MCBs become standalone units
  for (const [rcdId, rcd] of rcdMap) {
    if (isRcdSinglePhase(rcd)) continue;
    processedIds.add(rcdId);

    const mcbs = mcbsByRcd.get(rcdId) ?? [];
    if (tryRegisterInductionWithOvenFixedScenario(rcd, mcbs, plan.loads, mode, voltage)) {
      for (const mcb of mcbs) {
        processedIds.add(mcb.id);
      }
      continue;
    }

    for (const mcb of mcbs) {
      processedIds.add(mcb.id);
      if (!isSinglePhase(mcb)) {
        addDistributedWeightToPhaseLoads(plan.loads, mcb.powerW, mcb.phase, mode, voltage);
        continue;
      }

      const weight = getSymbolWeight(mcb, mode, voltage);
      if (scope === "OnlyUnlocked" && mcb.isPhaseLocked) {
        addWeightToPhaseLoad(plan.loads, mcb.phase, weight);
        continue;
      }

      plan.units.push({
        symbols: [mcb],
        totalWeight: weight > 0 ? weight : ZERO_POWER_UNIT_WEIGHT,
        label: mcb.label || mcb.id,
      });
    }
  }

 // Standalone MCBs
  for (const symbol of plan.workingSymbols) {
    if (processedIds.has(symbol.id)) continue;
    if (!isSinglePhase(symbol)) {
      addDistributedWeightToPhaseLoads(plan.loads, symbol.powerW, symbol.phase, mode, voltage);
      continue;
    }

    // WHY: a zero-power MCB contributes nothing to the imbalance but would
    // still get a phase assignment if pushed through `plan.units`. That
    // surprises the user (their empty circuit suddenly landed on L2).
    // Skip it entirely; the symbol keeps its current phase (defaults to L1
    // via createDefaultSymbolItem) and reappears once a non-zero powerW
    // is entered.
    if (symbol.powerW <= 0) {
      continue;
    }

    if (scope === "OnlyUnlocked" && symbol.isPhaseLocked) {
      const weight = getSymbolWeight(symbol, mode, voltage);
      addWeightToPhaseLoad(plan.loads, symbol.phase, weight);
      continue;
    }

    const weight = getSymbolWeight(symbol, mode, voltage);
    plan.units.push({
      symbols: [symbol],
      totalWeight: weight > 0 ? weight : ZERO_POWER_UNIT_WEIGHT,
      label: symbol.label || symbol.id,
    });
  }

  // Greedy assignment (largest-first to lightest phase)
  plan.units.sort((a, b) => b.totalWeight - a.totalWeight);
  assignUnitsToPhases(plan);

  // Refinement passes
  refineByMoves(plan, mode, voltage);
  refineBySwaps(plan, mode, voltage);

  return plan;
}

export function applyBalancePlan(
  symbols: SymbolItem[],
  plan: BalancePlan,
): AppliedBalanceResult {
  const assignedPhases = new Map<string, PhaseAssignment>();

  for (const symbol of plan.workingSymbols) {
    assignedPhases.set(symbol.id, symbol.phase);
  }

  for (const assignment of plan.phaseIndicatorAssignments) {
    assignedPhases.set(assignment.symbol.id, assignment.phase);
  }

  let changedCount = 0;
  const nextSymbols = symbols.map((symbol) => {
    const nextPhase = assignedPhases.get(symbol.id);
    if (!nextPhase || nextPhase === symbol.phase) {
      return symbol;
    }

    changedCount += 1;
    return {
      ...symbol,
      phase: nextPhase,
    };
  });

  return {
    symbols: nextSymbols,
    changedCount,
  };
}

function assignUnitsToPhases(plan: BalancePlan): void {
  for (const unit of plan.units) {
    const minPhase = minIndex(plan.loads, plan);

    const phase = PHASE_NAMES[minPhase];
    for (const symbol of unit.symbols) {
      symbol.phase = phase;
    }
    plan.loads[minPhase] += unit.totalWeight;
  }
}

function refineByMoves(plan: BalancePlan, _mode: BalanceMode, _voltage: number): void {
  for (let step = 0; step < MAX_MOVE_REFINEMENT_STEPS && needsRefinement(plan.loads); step++) {
    let improved = false;

    for (const unit of plan.units) {
      const currentPhase = unit.symbols[0]?.phase;
      if (!currentPhase) continue;

      const currentPhaseIdx = PHASE_NAMES.indexOf(currentPhase as PhaseAssignment);
      if (currentPhaseIdx < 0) continue;

      for (let targetIdx = 0; targetIdx < 3; targetIdx++) {
        if (targetIdx === currentPhaseIdx) continue;

        const newLoads = [...plan.loads];
        newLoads[currentPhaseIdx] -= unit.totalWeight;
        newLoads[targetIdx] += unit.totalWeight;

        const oldImbalance = calculateImbalancePercent(plan.loads[0], plan.loads[1], plan.loads[2]);
        const newImbalance = calculateImbalancePercent(newLoads[0], newLoads[1], newLoads[2]);

        if (newImbalance < oldImbalance - MIN_REFINEMENT_DIFF) {
          const targetPhase = PHASE_NAMES[targetIdx];
          for (const symbol of unit.symbols) {
            symbol.phase = targetPhase;
          }
          plan.loads[0] = newLoads[0];
          plan.loads[1] = newLoads[1];
          plan.loads[2] = newLoads[2];
          improved = true;
          break;
        }
      }
      if (improved) break;
    }

    if (!improved) return;
  }
}

function refineBySwaps(plan: BalancePlan, _mode: BalanceMode, _voltage: number): void {
  for (let step = 0; step < MAX_SWAP_REFINEMENT_STEPS && needsRefinement(plan.loads); step++) {
    let bestSwap: { unitA: BalanceUnit; unitB: BalanceUnit; phaseA: number; phaseB: number } | null = null;
    let bestImbalance = calculateImbalancePercent(plan.loads[0], plan.loads[1], plan.loads[2]);

    for (let i = 0; i < plan.units.length; i++) {
      for (let j = i + 1; j < plan.units.length; j++) {
        const unitA = plan.units[i];
        const unitB = plan.units[j];
        const phaseA = PHASE_NAMES.indexOf(unitA.symbols[0]?.phase as PhaseAssignment);
        const phaseB = PHASE_NAMES.indexOf(unitB.symbols[0]?.phase as PhaseAssignment);

        if (phaseA < 0 || phaseB < 0 || phaseA === phaseB) continue;

        const newLoads = [...plan.loads];
        newLoads[phaseA] = newLoads[phaseA] - unitA.totalWeight + unitB.totalWeight;
        newLoads[phaseB] = newLoads[phaseB] - unitB.totalWeight + unitA.totalWeight;

        const newImbalance = calculateImbalancePercent(newLoads[0], newLoads[1], newLoads[2]);

        if (newImbalance < bestImbalance - MIN_SWAP_IMPROVEMENT_PERCENT) {
          bestImbalance = newImbalance;
          bestSwap = { unitA, unitB, phaseA, phaseB };
        }
      }
    }

    if (!bestSwap) return;

    const { unitA, unitB } = bestSwap;
    const phaseA = PHASE_NAMES[bestSwap.phaseA];
    const phaseB = PHASE_NAMES[bestSwap.phaseB];

    for (const s of unitA.symbols) s.phase = phaseB;
    for (const s of unitB.symbols) s.phase = phaseA;

    plan.loads[bestSwap.phaseA] = plan.loads[bestSwap.phaseA] - unitA.totalWeight + unitB.totalWeight;
    plan.loads[bestSwap.phaseB] = plan.loads[bestSwap.phaseB] - unitB.totalWeight + unitA.totalWeight;
  }
}

function needsRefinement(loads: [number, number, number]): boolean {
  return calculateImbalancePercent(loads[0], loads[1], loads[2]) > TARGET_IMBALANCE_PERCENT;
}

// ================================================================
// Helpers
// ================================================================

function isPhaseIndicator(symbol: SymbolItem): boolean {
  const value = `${symbol.type} ${symbol.visualPath} ${symbol.label}`.toUpperCase();
  return value.includes("KONTROLK")
    || value.includes("PHASEINDICATOR")
    || value.includes("LAMPKA")
    || value.includes("SYGNALIZAT");
}



function isRcdSinglePhase(rcd: SymbolItem): boolean {
  const poleCount = detectPoleCount(rcd);
  if (poleCount === 3 || poleCount === 4) return false;

  const value = `${rcd.type} ${rcd.label} ${rcd.visualPath}`.toUpperCase();
  if (value.includes("4P") || value.includes("4-P") || value.includes("3P") || value.includes("3-P")) return false;
  return true;
}

function isSinglePhase(symbol: SymbolItem): boolean {
  const p = (symbol.phase || "").toUpperCase();
  if (p === "L1" || p === "L2" || p === "L3") return true;

  if (p.length === 0 || p === "PENDING") {
    return detectPoleCount(symbol) === 1;
  }

  return false;
}

export function normalizeSinglePhase(phase: string | null | undefined): "L1" | "L2" | "L3" | null {
  if (!phase) return null;
  const p = phase.toUpperCase();
  if (p === "L1" || p === "L2" || p === "L3") {
    return p as "L1" | "L2" | "L3";
  }
  return null;
}

function getWeight(powerW: number, mode: BalanceMode, voltage: number = 230): number {
  if (mode === "Current") return calculateCurrent(powerW, "L1", voltage);
  return powerW;
}

function getSymbolWeight(symbol: SymbolItem, mode: BalanceMode, voltage: number = 230): number {
  return getWeight(symbol.powerW, mode, voltage);
}

function addWeightToPhaseLoad(loads: [number, number, number], phase: PhaseAssignment | string, weight: number): void {
  const idx = PHASE_NAMES.indexOf(phase.toUpperCase() as PhaseAssignment);
  if (idx >= 0) loads[idx] += weight;
}

function addDistributedWeightToPhaseLoads(
  loads: [number, number, number],
  powerW: number,
  phase: PhaseAssignment | string,
  mode: BalanceMode,
  voltage: number,
): void {
  const [l1Power, l2Power, l3Power] = distributePower(powerW, phase);
  loads[0] += getWeight(l1Power, mode, voltage);
  loads[1] += getWeight(l2Power, mode, voltage);
  loads[2] += getWeight(l3Power, mode, voltage);
}

function computeResultFromPowers(l1: number, l2: number, l3: number, powerFactor: number = 0.9): PhaseDistributionResult {
  const voltage = 230;
  return {
    l1PowerW: l1,
    l2PowerW: l2,
    l3PowerW: l3,
    l1CurrentA: calculateCurrent(l1, "L1", voltage, powerFactor),
    l2CurrentA: calculateCurrent(l2, "L1", voltage, powerFactor),
    l3CurrentA: calculateCurrent(l3, "L1", voltage, powerFactor),
    imbalancePercent: calculateImbalancePercent(l1, l2, l3),
  };
}

function minIndex(loads: [number, number, number], plan: BalancePlan): number {
  let minValue = loads[0];
  for (let index = 1; index < loads.length; index++) {
    if (loads[index] < minValue) {
      minValue = loads[index];
    }
  }

  const tied: number[] = [];
  for (let index = 0; index < loads.length; index++) {
    if (Math.abs(loads[index] - minValue) < MIN_TIE_EPSILON) {
      tied.push(index);
    }
  }

  if (tied.length <= 1) {
    return tied[0] ?? 0;
  }

  const picked = tied[plan.tieBreaker % tied.length];
  plan.tieBreaker += 1;
  return picked;
}

// detectPoleCount imported from ../poleCount

function getScenarioFlag(symbol: SymbolItem, key: string): boolean {
  const rawValue = symbol.parameters?.[key];
  if (!rawValue) return false;
  return rawValue.toLowerCase() === "true";
}

function matchesScenarioPattern(symbol: SymbolItem, expectedPattern: string): boolean {
  return symbol.parameters?.[INDUCTION_OVEN_PATTERN_KEY] === expectedPattern;
}

function tryRegisterInductionWithOvenFixedScenario(
  rcd: SymbolItem,
  mcbs: SymbolItem[],
  loads: [number, number, number],
  mode: BalanceMode,
  voltage: number,
): boolean {
  if (!getScenarioFlag(rcd, INDUCTION_OVEN_ENABLED_KEY) || !matchesScenarioPattern(rcd, INDUCTION_OVEN_PATTERN_VALUE)) {
    return false;
  }

  if (mcbs.length !== 2) {
    return false;
  }

  const mcb2p = mcbs.find((symbol) => detectPoleCount(symbol) === 2);
  const mcb1p = mcbs.find((symbol) => detectPoleCount(symbol) === 1);
  if (!mcb2p || !mcb1p) {
    return false;
  }

  mcb2p.phase = "L1+L2";
  mcb1p.phase = "L3";
  addDistributedWeightToPhaseLoads(loads, mcb2p.powerW, "L1+L2", mode, voltage);
  addDistributedWeightToPhaseLoads(loads, mcb1p.powerW, "L3", mode, voltage);
  return true;
}
