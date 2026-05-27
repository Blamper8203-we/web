import { describe, expect, it } from "vitest";
import type { PhaseBalanceRow } from "./phaseBalanceRows";
import { buildPhaseMoveSuggestions } from "./phaseBalanceSuggestions";

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

describe("phaseBalanceSuggestions", () => {
  it("suggests moving an unlocked circuit when it improves imbalance", () => {
    const suggestions = buildPhaseMoveSuggestions([
      row({ id: "a", referenceDesignation: "F1", phase: "L1", powerW: 3000 }),
      row({ id: "b", referenceDesignation: "F2", phase: "L1", powerW: 1500 }),
      row({ id: "c", referenceDesignation: "F3", phase: "L2", powerW: 1000 }),
      row({ id: "d", referenceDesignation: "F4", phase: "L3", powerW: 1000 }),
    ]);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].fromPhase).toBe("L1");
    expect(suggestions[0].afterImbalancePercent).toBeLessThan(suggestions[0].beforeImbalancePercent);
    expect(suggestions[0].improvementPercent).toBeGreaterThan(0);
  });

  it("does not suggest locked circuits or multiphase circuits", () => {
    const suggestions = buildPhaseMoveSuggestions([
      row({ id: "locked", referenceDesignation: "F1", phase: "L1", powerW: 3000, isPhaseLocked: true }),
      row({ id: "multi", referenceDesignation: "F2", phase: "L1+L2+L3", powerW: 9000 }),
      row({ id: "l2", referenceDesignation: "F3", phase: "L2", powerW: 1000 }),
      row({ id: "l3", referenceDesignation: "F4", phase: "L3", powerW: 1000 }),
    ]);

    expect(suggestions.map((suggestion) => suggestion.row.id)).not.toContain("locked");
    expect(suggestions.map((suggestion) => suggestion.row.id)).not.toContain("multi");
  });
});
