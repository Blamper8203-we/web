import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import { buildPhaseBalanceRows } from "./phaseBalanceRows";

describe("phaseBalanceRows", () => {
  it("builds sorted balance rows for circuit devices only", () => {
    const rows = buildPhaseBalanceRows([
      createDefaultSymbolItem({
        id: "rcd-1",
        deviceKind: "rcd",
        referenceDesignation: "Q1",
      }),
      createDefaultSymbolItem({
        id: "mcb-2",
        deviceKind: "mcb",
        referenceDesignation: "F2",
        circuitName: "Gniazda",
        phase: "L2",
        powerW: 2300,
        isPhaseLocked: true,
      }),
      createDefaultSymbolItem({
        id: "mcb-1",
        deviceKind: "mcb",
        referenceDesignation: "F1",
        circuitName: "Oświetlenie",
        phase: "L1",
        powerW: 690,
      }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(["mcb-1", "mcb-2"]);
    expect(rows[0]).toMatchObject({
      referenceDesignation: "F1",
      circuitName: "Oświetlenie",
      phase: "L1",
      powerW: 690,
      isPhaseLocked: false,
    });
    expect(rows[0].currentA).toBeCloseTo(3.33, 2);
    expect(rows[1].isPhaseLocked).toBe(true);
  });
});
