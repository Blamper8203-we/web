import { describe, expect, it } from "vitest";
import {
  assignAuxiliaryReferenceDesignations,
  getAuxiliaryPrefix,
  getNextReferenceDesignation,
  getReferencePrefix,
  hasManualReferenceDesignation,
  resolveGroupReferenceNumber,
  shouldAutoAssignGroupCircuitDesignation,
  shouldUseAuxiliaryReferenceDesignation,
  toDisplayModuleNumber,
} from "./referenceDesignations";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import type { PaletteTemplate } from "../modules/moduleCatalog";

function makeTemplate(overrides: Partial<PaletteTemplate> = {}): PaletteTemplate {
  return {
    templateId: "mcb-1p",
    code: "MCB-1P",
    label: "MCB 1P",
    type: "Wyłącznik nadprądowy",
    category: "Wyłączniki",
    deviceKind: "mcb",
    phase: "L1",
    modules: 1,
    moduleRef: "mcb-1p",
    assetPath: "/assets/modules/mcb-1p.svg",
    ...overrides,
  };
}

describe("referenceDesignations - getReferencePrefix", () => {
  it("returns 'F' for MCB", () => {
    expect(getReferencePrefix(makeTemplate({ deviceKind: "mcb" }))).toBe("F");
  });

  it("returns 'F' for RCBO", () => {
    expect(getReferencePrefix(makeTemplate({ deviceKind: "rcbo" }))).toBe("F");
  });

  it("returns 'Q' for RCD", () => {
    expect(getReferencePrefix(makeTemplate({ deviceKind: "rcd" }))).toBe("Q");
  });

  it("returns 'FA' for SPD", () => {
    expect(getReferencePrefix(makeTemplate({ deviceKind: "spd" }))).toBe("FA");
  });

  it("returns 'H' for phaseIndicator", () => {
    expect(getReferencePrefix(makeTemplate({ deviceKind: "phaseIndicator" }))).toBe("H");
  });

  it("returns 'QS' for FR (main breaker)", () => {
    expect(getReferencePrefix(makeTemplate({ deviceKind: "fr" }))).toBe("QS");
  });

  it("returns 'X' for terminal block", () => {
    expect(getReferencePrefix(makeTemplate({ deviceKind: "terminalBlock" }))).toBe("X");
  });

  it("returns 'X' for unknown deviceKind", () => {
    expect(getReferencePrefix(makeTemplate({ deviceKind: "other" as PaletteTemplate["deviceKind"] }))).toBe("X");
  });

  it("returns 'WS' for grid-switch template (przelacznik-siec)", () => {
    expect(
      getReferencePrefix(makeTemplate({ templateId: "przelacznik-siec-agregat", deviceKind: "mcb" })),
    ).toBe("WS");
  });
});

describe("referenceDesignations - getNextReferenceDesignation", () => {
  it("returns prefix + 1 when no symbols exist", () => {
    expect(getNextReferenceDesignation([], "F")).toBe("F1");
  });

  it("returns next sequential number based on highest existing", () => {
    const symbols = [
      createDefaultSymbolItem({ id: "s1", referenceDesignation: "F1" }),
      createDefaultSymbolItem({ id: "s2", referenceDesignation: "F2" }),
      createDefaultSymbolItem({ id: "s3", referenceDesignation: "F3" }),
    ];
    expect(getNextReferenceDesignation(symbols, "F")).toBe("F4");
  });

  it("skips gaps in numbering", () => {
    const symbols = [
      createDefaultSymbolItem({ id: "s1", referenceDesignation: "F1" }),
      createDefaultSymbolItem({ id: "s2", referenceDesignation: "F5" }),
    ];
    expect(getNextReferenceDesignation(symbols, "F")).toBe("F6");
  });

  it("ignores symbols with non-matching prefix", () => {
    const symbols = [
      createDefaultSymbolItem({ id: "s1", referenceDesignation: "F1" }),
      createDefaultSymbolItem({ id: "s2", referenceDesignation: "Q1" }),
      createDefaultSymbolItem({ id: "s3", referenceDesignation: "F2" }),
    ];
    expect(getNextReferenceDesignation(symbols, "F")).toBe("F3");
  });

  it("ignores symbols with no designation", () => {
    const symbols = [
      createDefaultSymbolItem({ id: "s1", referenceDesignation: "" }),
      createDefaultSymbolItem({ id: "s2", referenceDesignation: "F2" }),
    ];
    expect(getNextReferenceDesignation(symbols, "F")).toBe("F3");
  });

  it("handles designation with trailing text", () => {
    const symbols = [createDefaultSymbolItem({ id: "s1", referenceDesignation: "F1 (edited)" })];
    expect(getNextReferenceDesignation(symbols, "F")).toBe("F1"); // regex won't match
  });
});

describe("referenceDesignations - toDisplayModuleNumber", () => {
  it("returns 'X{n}' for terminal block without manual designation", () => {
    const symbol = createDefaultSymbolItem({ id: "tb1", deviceKind: "terminalBlock", moduleNumber: 3 });
    expect(toDisplayModuleNumber(symbol)).toBe("X3");
  });

  it("returns manual designation for terminal block when present", () => {
    const symbol = createDefaultSymbolItem({
      id: "tb1",
      deviceKind: "terminalBlock",
      referenceDesignation: "N1",
      moduleNumber: 3,
    });
    expect(toDisplayModuleNumber(symbol)).toBe("N1");
  });

  it("returns '#0' for RCD regardless of moduleNumber", () => {
    const symbol = createDefaultSymbolItem({ id: "r1", deviceKind: "rcd", type: "RCD 4P 40A 30mA", moduleNumber: 5 });
    expect(toDisplayModuleNumber(symbol)).toBe("#0");
  });

  it("returns '#0' for symbol with RCD in its type", () => {
    const symbol = createDefaultSymbolItem({ id: "s1", type: "RCD 4P", moduleNumber: 5 });
    expect(toDisplayModuleNumber(symbol)).toBe("#0");
  });

  it("returns '#{n}' for ordinary symbols (e.g. MCB)", () => {
    const symbol = createDefaultSymbolItem({ id: "m1", deviceKind: "mcb", moduleNumber: 7 });
    expect(toDisplayModuleNumber(symbol)).toBe("#7");
  });
});

describe("referenceDesignations - hasManualReferenceDesignation", () => {
  it("returns true when flag is 'true' and designation is non-empty", () => {
    const s = createDefaultSymbolItem({
      id: "s1",
      referenceDesignation: "F1",
      parameters: { ManualReferenceDesignation: "true" },
    });
    expect(hasManualReferenceDesignation(s)).toBe(true);
  });

  it("returns false when flag is 'true' but designation is empty", () => {
    const s = createDefaultSymbolItem({
      id: "s1",
      referenceDesignation: "",
      parameters: { ManualReferenceDesignation: "true" },
    });
    expect(hasManualReferenceDesignation(s)).toBe(false);
  });

  it("returns false when flag is missing", () => {
    const s = createDefaultSymbolItem({ id: "s1", referenceDesignation: "F1" });
    expect(hasManualReferenceDesignation(s)).toBe(false);
  });

  it("returns false when flag is 'false'", () => {
    const s = createDefaultSymbolItem({
      id: "s1",
      referenceDesignation: "F1",
      parameters: { ManualReferenceDesignation: "false" },
    });
    expect(hasManualReferenceDesignation(s)).toBe(false);
  });
});

describe("referenceDesignations - resolveGroupReferenceNumber", () => {
  it("returns fallback when head is undefined", () => {
    expect(resolveGroupReferenceNumber(undefined, 5)).toBe("5");
  });

  it("extracts trailing digits from head designation", () => {
    const head = createDefaultSymbolItem({ id: "s1", referenceDesignation: "F12" });
    expect(resolveGroupReferenceNumber(head, 5)).toBe("12");
  });

  it("returns fallback when head designation has no digits", () => {
    const head = createDefaultSymbolItem({ id: "s1", referenceDesignation: "F" });
    expect(resolveGroupReferenceNumber(head, 5)).toBe("5");
  });

  it("returns fallback when head designation is empty", () => {
    const head = createDefaultSymbolItem({ id: "s1", referenceDesignation: "" });
    expect(resolveGroupReferenceNumber(head, 5)).toBe("5");
  });
});

describe("referenceDesignations - shouldAutoAssignGroupCircuitDesignation", () => {
  it("returns true for MCB", () => {
    const s = createDefaultSymbolItem({ id: "s1", deviceKind: "mcb" });
    expect(shouldAutoAssignGroupCircuitDesignation(s)).toBe(true);
  });

  it("returns true for RCBO", () => {
    const s = createDefaultSymbolItem({ id: "s1", deviceKind: "rcbo" });
    expect(shouldAutoAssignGroupCircuitDesignation(s)).toBe(true);
  });

  it("returns false for RCD", () => {
    const s = createDefaultSymbolItem({ id: "s1", deviceKind: "rcd" });
    expect(shouldAutoAssignGroupCircuitDesignation(s)).toBe(false);
  });

  it("returns false for FR", () => {
    const s = createDefaultSymbolItem({ id: "s1", deviceKind: "fr" });
    expect(shouldAutoAssignGroupCircuitDesignation(s)).toBe(false);
  });

  it("returns false for przelacznik moduleRef", () => {
    const s = createDefaultSymbolItem({
      id: "s1",
      deviceKind: "mcb",
      moduleRef: "przelacznik-siec-agregat",
    });
    expect(shouldAutoAssignGroupCircuitDesignation(s)).toBe(false);
  });
});

describe("referenceDesignations - shouldUseAuxiliaryReferenceDesignation", () => {
  it("returns true for terminal block", () => {
    const s = createDefaultSymbolItem({ id: "s1", deviceKind: "terminalBlock" });
    expect(shouldUseAuxiliaryReferenceDesignation(s)).toBe(true);
  });

  it("returns true for distribution block", () => {
    const s = createDefaultSymbolItem({ id: "s1", type: "Blok rozdzielczy" });
    expect(shouldUseAuxiliaryReferenceDesignation(s)).toBe(true);
  });

  it("returns false for MCB", () => {
    const s = createDefaultSymbolItem({ id: "s1", deviceKind: "mcb" });
    expect(shouldUseAuxiliaryReferenceDesignation(s)).toBe(false);
  });
});

describe("referenceDesignations - getAuxiliaryPrefix", () => {
  it("returns 'BL' for distribution block", () => {
    const s = createDefaultSymbolItem({ id: "s1", type: "Blok rozdzielczy" });
    expect(getAuxiliaryPrefix(s)).toBe("BL");
  });

  it("returns 'PE' for terminal block with 'PE' in type", () => {
    const s = createDefaultSymbolItem({ id: "s1", type: "Listwa PE" });
    expect(getAuxiliaryPrefix(s)).toBe("PE");
  });

  it("returns 'N' for terminal block with 'N' in type", () => {
    const s = createDefaultSymbolItem({ id: "s1", type: "Listwa N 12PIN" });
    expect(getAuxiliaryPrefix(s)).toBe("N");
  });

  it("returns 'X' for terminal block without specific prefix", () => {
    const s = createDefaultSymbolItem({ id: "s1", type: "Złączka" });
    expect(getAuxiliaryPrefix(s)).toBe("X");
  });
});

describe("referenceDesignations - assignAuxiliaryReferenceDesignations", () => {
  it("assigns N1 to first N-type terminal", () => {
    const s = createDefaultSymbolItem({ id: "s1", type: "Listwa N", deviceKind: "terminalBlock" });
    assignAuxiliaryReferenceDesignations([s]);
    expect(s.referenceDesignation).toBe("N1");
    expect(s.moduleNumber).toBe(1);
    expect(s.displayModuleNumber).toBe("N1");
  });

  it("assigns sequential numbers within a prefix group", () => {
    const s1 = createDefaultSymbolItem({ id: "s1", type: "Listwa N", deviceKind: "terminalBlock" });
    const s2 = createDefaultSymbolItem({ id: "s2", type: "Listwa N", deviceKind: "terminalBlock" });
    assignAuxiliaryReferenceDesignations([s1, s2]);
    expect(s1.referenceDesignation).toBe("N1");
    expect(s2.referenceDesignation).toBe("N2");
  });

  it("separates counters across prefix groups", () => {
    const n1 = createDefaultSymbolItem({ id: "n1", type: "Listwa N", deviceKind: "terminalBlock" });
    const pe1 = createDefaultSymbolItem({ id: "pe1", type: "Listwa PE", deviceKind: "terminalBlock" });
    assignAuxiliaryReferenceDesignations([n1, pe1]);
    expect(n1.referenceDesignation).toBe("N1");
    expect(pe1.referenceDesignation).toBe("PE1");
  });

  it("preserves manual designations", () => {
    const s1 = createDefaultSymbolItem({
      id: "s1",
      type: "Listwa N",
      deviceKind: "terminalBlock",
      referenceDesignation: "N5",
      parameters: { ManualReferenceDesignation: "true" },
    });
    const s2 = createDefaultSymbolItem({ id: "s2", type: "Listwa N", deviceKind: "terminalBlock" });
    assignAuxiliaryReferenceDesignations([s1, s2]);
    // s1 keeps its manual N5; s2 gets the next free slot in the counter
    expect(s1.referenceDesignation).toBe("N5");
    expect(s2.referenceDesignation).toBe("N1");
  });

  it("skips numbers that match a manual designation", () => {
    // Two symbols, one manually designated as N1, the other auto-assigned
    const s1 = createDefaultSymbolItem({
      id: "s1",
      type: "Listwa N",
      deviceKind: "terminalBlock",
      referenceDesignation: "N1",
      parameters: { ManualReferenceDesignation: "true" },
    });
    const s2 = createDefaultSymbolItem({ id: "s2", type: "Listwa N", deviceKind: "terminalBlock" });
    assignAuxiliaryReferenceDesignations([s1, s2]);
    // s1 keeps N1 (manual), s2 auto-assigns next free number after N1
    expect(s1.referenceDesignation).toBe("N1");
    expect(s2.referenceDesignation).toBe("N2");
  });

  it("does not assign designation to non-auxiliary symbols", () => {
    const mcb = createDefaultSymbolItem({ id: "m1", deviceKind: "mcb" });
    assignAuxiliaryReferenceDesignations([mcb]);
    // MCB should not be touched - its referenceDesignation was set by createDefaultSymbolItem
    // and is empty by default
    expect(mcb.referenceDesignation).toBe("");
  });
});
