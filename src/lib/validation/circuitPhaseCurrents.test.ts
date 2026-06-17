import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import {
  calculateCircuitPhaseCurrents,
  calculateVoltageDrop,
} from "./circuitPhaseCurrents";

describe("calculateCircuitPhaseCurrents", () => {
  it("returns zero current for an empty project", () => {
    const result = calculateCircuitPhaseCurrents([], 230);
    expect(result.l1CurrentA).toBe(0);
    expect(result.l2CurrentA).toBe(0);
    expect(result.l3CurrentA).toBe(0);
  });

  it("sums MCB and RCBO loads and converts W → A at the given phase voltage", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      powerW: 2300,
      phase: "L1",
    });
    const rcbo = createDefaultSymbolItem({
      deviceKind: "rcbo",
      type: "RCBO 1P",
      powerW: 2300,
      phase: "L2",
    });

    const result = calculateCircuitPhaseCurrents([mcb, rcbo], 230);

    // 2300 W / (230 V * cosPhi 0.9) = 11.111 A
    expect(result.l1CurrentA).toBeCloseTo(11.111, 3);
    expect(result.l2CurrentA).toBeCloseTo(11.111, 3);
    expect(result.l3CurrentA).toBe(0);
  });

  it("skips FR, SPD, and phaseIndicator (they don't contribute to phase load)", () => {
    const fr = createDefaultSymbolItem({
      deviceKind: "fr",
      type: "FR",
      powerW: 5000,
      phase: "L1",
    });
    const spd = createDefaultSymbolItem({
      deviceKind: "spd",
      type: "SPD",
      powerW: 5000,
      phase: "L2",
    });
    const phaseInd = createDefaultSymbolItem({
      deviceKind: "phaseIndicator",
      type: "Lampka pojedyncza L1",
      powerW: 5000,
      phase: "L3",
    });

    const result = calculateCircuitPhaseCurrents([fr, spd, phaseInd], 230);

    expect(result.l1CurrentA).toBe(0);
    expect(result.l2CurrentA).toBe(0);
    expect(result.l3CurrentA).toBe(0);
  });

  it("uses the supplied phaseVoltage for the I = P / V conversion", () => {
    const mcb = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      powerW: 2300,
      phase: "L1",
    });

    const at230 = calculateCircuitPhaseCurrents([mcb], 230);
    const at115 = calculateCircuitPhaseCurrents([mcb], 115);

    // 2300 / (230 * 0.9) = 11.111;  2300 / (115 * 0.9) = 22.222
    expect(at230.l1CurrentA).toBeCloseTo(11.111, 3);
    expect(at115.l1CurrentA).toBeCloseTo(22.222, 3);
  });
});

describe("calculateVoltageDrop", () => {
  it("uses the 2-wire formula for single-phase circuits", () => {
    // 2 * 10 A * 20 m * 0.0175 / 2.5 mm² = 2.8 V
    const drop = calculateVoltageDrop(10, 2.5, 20, "L1");
    expect(drop).toBeCloseTo(2.8, 5);
  });

  it("uses the √3 factor for L1+L2+L3 and 3F phases", () => {
    const threePhase = calculateVoltageDrop(10, 2.5, 20, "L1+L2+L3");
    const legacy = calculateVoltageDrop(10, 2.5, 20, "3F");
    // √3 * 10 * 20 * 0.0175 / 2.5 = 2.424871...
    expect(threePhase).toBeCloseTo(2.4249, 3);
    expect(legacy).toBeCloseTo(2.4249, 3);
  });

  it("handles missing/empty phase as single-phase (multiplier = 2)", () => {
    const nullish = calculateVoltageDrop(10, 2.5, 20, null);
    const empty = calculateVoltageDrop(10, 2.5, 20, "");
    expect(nullish).toBeCloseTo(2.8, 5);
    expect(empty).toBeCloseTo(2.8, 5);
  });
});
