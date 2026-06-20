import type { PhaseBalanceRow } from "./phaseBalanceRows";
import { normalizeSinglePhase } from "./phaseDistributionCalculator";

export interface PhaseImbalanceInsights {
  heaviestPhase: string | null;
  lightestPhase: string | null;
  heaviestPhasePowerW: number;
  lightestPhasePowerW: number;
  spreadW: number;
  contributors: PhaseBalanceRow[];
}

const PHASES = ["L1", "L2", "L3"] as const;

export function buildPhaseImbalanceInsights(
  rows: PhaseBalanceRow[],
  maxContributors = 3,
): PhaseImbalanceInsights {
  const powerByPhase = new Map<string, number>(PHASES.map((phase) => [phase, 0]));

  for (const row of rows) {
    const phase = normalizeSinglePhase(row.phase);
    if (!phase) {
      continue;
    }

    powerByPhase.set(phase, (powerByPhase.get(phase) ?? 0) + row.powerW);
  }

  const sorted = [...PHASES].sort((a, b) => (powerByPhase.get(b) ?? 0) - (powerByPhase.get(a) ?? 0));
  const heaviestPhase = sorted[0] ?? null;
  const lightestPhase = sorted[sorted.length - 1] ?? null;
  const heaviestPhasePowerW = heaviestPhase ? powerByPhase.get(heaviestPhase) ?? 0 : 0;
  const lightestPhasePowerW = lightestPhase ? powerByPhase.get(lightestPhase) ?? 0 : 0;

  const contributors = heaviestPhase
    ? rows
        .filter((row) => normalizeSinglePhase(row.phase) === heaviestPhase)
        .sort((a, b) => b.powerW - a.powerW)
        .slice(0, Math.max(1, maxContributors))
    : [];

  return {
    heaviestPhase: heaviestPhasePowerW > 0 ? heaviestPhase : null,
    lightestPhase,
    heaviestPhasePowerW,
    lightestPhasePowerW,
    spreadW: heaviestPhasePowerW - lightestPhasePowerW,
    contributors,
  };
}


