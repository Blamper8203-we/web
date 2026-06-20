import { calculateImbalancePercent, normalizeSinglePhase } from "./phaseDistributionCalculator";
import type { PhaseBalanceRow } from "./phaseBalanceRows";

export interface PhaseMoveSuggestion {
  row: PhaseBalanceRow;
  fromPhase: "L1" | "L2" | "L3";
  toPhase: "L1" | "L2" | "L3";
  beforeImbalancePercent: number;
  afterImbalancePercent: number;
  improvementPercent: number;
}

const PHASES = ["L1", "L2", "L3"] as const;

export function buildPhaseMoveSuggestions(
  rows: PhaseBalanceRow[],
  maxSuggestions = 3,
): PhaseMoveSuggestion[] {
  const baseLoads = calculateSinglePhaseLoads(rows);
  const beforeImbalancePercent = calculateImbalancePercent(baseLoads.L1, baseLoads.L2, baseLoads.L3);
  const suggestions: PhaseMoveSuggestion[] = [];

  for (const row of rows) {
    if (row.isPhaseLocked || row.powerW <= 0) {
      continue;
    }

    const fromPhase = normalizeSinglePhase(row.phase);
    if (!fromPhase) {
      continue;
    }

    for (const toPhase of PHASES) {
      if (toPhase === fromPhase) {
        continue;
      }

      const nextLoads = { ...baseLoads };
      nextLoads[fromPhase] -= row.powerW;
      nextLoads[toPhase] += row.powerW;
      const afterImbalancePercent = calculateImbalancePercent(nextLoads.L1, nextLoads.L2, nextLoads.L3);
      const improvementPercent = beforeImbalancePercent - afterImbalancePercent;

      if (improvementPercent <= 0) {
        continue;
      }

      suggestions.push({
        row,
        fromPhase,
        toPhase,
        beforeImbalancePercent,
        afterImbalancePercent,
        improvementPercent,
      });
    }
  }

  return suggestions
    .sort((a, b) => {
      const byImprovement = b.improvementPercent - a.improvementPercent;
      if (Math.abs(byImprovement) > 0.01) {
        return byImprovement;
      }

      return b.row.powerW - a.row.powerW;
    })
    .slice(0, Math.max(1, maxSuggestions));
}

function calculateSinglePhaseLoads(rows: PhaseBalanceRow[]): Record<"L1" | "L2" | "L3", number> {
  const loads = { L1: 0, L2: 0, L3: 0 };

  for (const row of rows) {
    const phase = normalizeSinglePhase(row.phase);
    if (!phase) {
      continue;
    }

    loads[phase] += row.powerW;
  }

  return loads;
}


