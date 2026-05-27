import { describe, expect, it } from "vitest";
import type { PhaseBalanceRow } from "./phaseBalanceRows";
import { buildPhaseImbalanceInsights } from "./phaseImbalanceInsights";

function row(overrides: Partial<PhaseBalanceRow>): PhaseBalanceRow {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    referenceDesignation: overrides.referenceDesignation ?? "F1",
    circuitName: overrides.circuitName ?? "Obwód",
    phase: overrides.phase ?? "L1",
    powerW: overrides.powerW ?? 0,
    currentA: overrides.currentA ?? 0,
    isPhaseLocked: overrides.isPhaseLocked ?? false,
  };
}

describe("phaseImbalanceInsights", () => {
  it("detects heaviest and lightest phase with top contributors", () => {
    const insights = buildPhaseImbalanceInsights([
      row({ id: "a", referenceDesignation: "F1", phase: "L1", powerW: 4000 }),
      row({ id: "b", referenceDesignation: "F2", phase: "L1", powerW: 1500 }),
      row({ id: "c", referenceDesignation: "F3", phase: "L2", powerW: 1000 }),
      row({ id: "d", referenceDesignation: "F4", phase: "L3", powerW: 2500 }),
      row({ id: "e", referenceDesignation: "F5", phase: "L1+L2+L3", powerW: 9000 }),
    ]);

    expect(insights.heaviestPhase).toBe("L1");
    expect(insights.lightestPhase).toBe("L2");
    expect(insights.spreadW).toBe(4500);
    expect(insights.contributors.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("returns no heaviest phase when there are no single-phase loads", () => {
    const insights = buildPhaseImbalanceInsights([
      row({ id: "a", phase: "L1+L2+L3", powerW: 9000 }),
    ]);

    expect(insights.heaviestPhase).toBeNull();
    expect(insights.contributors).toEqual([]);
  });
});
