import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import {
  applyCircuitEditValue,
  applyCircuitEditValues,
  getCircuitEditFields,
  getCircuitEditHeader,
} from "./circuitEditFieldDefinitions";
import type { TFunction } from "i18next";

const mockT = ((k: string) => {
  if (k.includes("rcd.subtitle")) return "Wyłącznik różnicowoprądowy";
  if (k.includes("spd.subtitle")) return "Ogranicznik przepięć (SPD)";
  if (k.includes("switch.subtitle")) return "Rozłącznik główny (FR)";
  if (k.includes("terminalBlock.subtitle")) return "Listwa zaciskowa / terminal";
  if (k.includes("distributionBlock.subtitle")) return "Blok rozdzielczy / złącze";
  return k;
}) as unknown as TFunction;

describe("applyCircuitEditValue", () => {
  it("syncs MCB protection edits to visible SVG parameters", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      protectionType: "B16",
      parameters: {
        CURRENT: "B16",
        LABEL: "B16",
      },
    });

    const next = applyCircuitEditValue(symbol, "ProtectionType", "B20");

    expect(next.protectionType).toBe("B20");
    expect(next.displayProtection).toBe("B20");
    expect(next.parameters.CURRENT).toBe("B20");
    expect(next.parameters.LABEL).toBe("B20");
  });

  // Phase normalisation guards L1/L2/L3 interpretation across the panel,
  // phase balance and PDF. If this breaks, the symbol goes to the wrong phase.
  it("normalises a Phase edit to a valid assignment and marks it manual", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      phase: "L1",
      parameters: {},
    });

    const next = applyCircuitEditValue(symbol, "Phase", "L3");

    expect(next.phase).toBe("L3");
    expect(next.parameters.ManualPhase).toBe("true");
  });

  it("falls back to L1 when the Phase edit is unrecognised", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      phase: "L2",
      parameters: {},
    });

    const next = applyCircuitEditValue(symbol, "Phase", "garbage");

    expect(next.phase).toBe("L1");
    expect(next.parameters.ManualPhase).toBe("true");
  });

  // PowerW is the value feeding phase balance and circuit-list totals.
  // The panel accepts a Polish comma, this guards that the decimal survives.
  it("parses Polish-comma decimal in PowerW edits", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      powerW: 0,
      parameters: {},
    });

    const next = applyCircuitEditValue(symbol, "PowerW", "2300,5");

    expect(next.powerW).toBe(2300.5);
  });

  it("ignores non-numeric PowerW input without throwing", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      powerW: 1000,
      parameters: {},
    });

    const next = applyCircuitEditValue(symbol, "PowerW", "abc");

    expect(next.powerW).toBe(1000);
  });

  // RcdPreset drives rcdRatedCurrent / rcdResidualCurrent / rcdType.
  // The same three numbers feed the cover-page, the RCD/MCB validation
  // and the wire-down-stream "which breaker covers this" check.
  it("parses a well-formed RcdPreset into rated/residual/type", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "rcd",
      type: "RCD",
      rcdRatedCurrent: 0,
      rcdResidualCurrent: 0,
      rcdType: "",
      parameters: {},
    });

    const next = applyCircuitEditValue(symbol, "RcdPreset", "63A/30mA Typ A");

    expect(next.rcdRatedCurrent).toBe(63);
    expect(next.rcdResidualCurrent).toBe(30);
    expect(next.rcdType).toBe("A");
  });

  it("resets RCD fields to defaults when the preset is empty", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "rcd",
      type: "RCD",
      rcdRatedCurrent: 63,
      rcdResidualCurrent: 300,
      rcdType: "S",
      parameters: {},
    });

    const next = applyCircuitEditValue(symbol, "RcdPreset", "");

    expect(next.rcdRatedCurrent).toBe(40);
    expect(next.rcdResidualCurrent).toBe(30);
    expect(next.rcdType).toBe("A");
  });

  it("leaves RCD fields untouched for an unparseable RcdPreset", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "rcd",
      type: "RCD",
      rcdRatedCurrent: 25,
      rcdResidualCurrent: 30,
      rcdType: "AC",
      parameters: {},
    });

    const next = applyCircuitEditValue(symbol, "RcdPreset", "nonsense");

    expect(next.rcdRatedCurrent).toBe(25);
    expect(next.rcdResidualCurrent).toBe(30);
    expect(next.rcdType).toBe("AC");
  });

  // SpdPreset drives spdType / spdVoltage / spdDischargeCurrent.
  // Validation flags an SPD with the wrong discharge current for its class.
  it("parses a well-formed SpdPreset into type/voltage/current", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "spd",
      type: "SPD",
      spdType: "",
      spdVoltage: 0,
      spdDischargeCurrent: 0,
      parameters: {},
    });

    const next = applyCircuitEditValue(symbol, "SpdPreset", "T1+T2 275V 25kA");

    expect(next.spdType).toBe("T1+T2");
    expect(next.spdVoltage).toBe(275);
    expect(next.spdDischargeCurrent).toBe(25);
  });

  it("resets SPD fields to defaults when the preset is empty", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "spd",
      type: "SPD",
      spdType: "T1",
      spdVoltage: 320,
      spdDischargeCurrent: 50,
      parameters: {},
    });

    const next = applyCircuitEditValue(symbol, "SpdPreset", "");

    expect(next.spdType).toBe("T1+T2");
    expect(next.spdVoltage).toBe(275);
    expect(next.spdDischargeCurrent).toBe(25);
  });

  // ReferenceDesignation flag is what tells the project-file round-trip
  // not to overwrite the user's manual reference. If this is lost,
  // the panel will silently re-derive the designation on next load.
  it("marks the reference designation as manual when set to a non-empty value", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      referenceDesignation: "F1",
      parameters: {},
    });

    const next = applyCircuitEditValue(symbol, "ReferenceDesignation", "F2");

    expect(next.referenceDesignation).toBe("F2");
    expect(next.parameters.ManualReferenceDesignation).toBe("true");
  });

  it("clears the manual flag when the reference designation is empty", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      referenceDesignation: "F1",
      parameters: { ManualReferenceDesignation: "true" },
    });

    const next = applyCircuitEditValue(symbol, "ReferenceDesignation", "");

    expect(next.referenceDesignation).toBe("");
    expect(next.parameters.ManualReferenceDesignation).toBeUndefined();
  });

  // CircuitType feeds the BOM, the PDF cover-page and the legend.
  // An unrecognised value must fall back to "Inne", not throw.
  it("normalises unrecognised CircuitType edits to 'Inne'", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      circuitType: "Oswietlenie",
      parameters: {},
    });

    const next = applyCircuitEditValue(symbol, "CircuitType", "coś_nowego");

    expect(next.circuitType).toBe("Inne");
  });

  // FrType writes BOTH frType and frRatedCurrent in one edit.
  // If they desync, validation will warn about the FR rating.
  it("syncs frType and frRatedCurrent in a single FrType edit", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "fr",
      type: "FR",
      frType: "63",
      frRatedCurrent: "63A",
      parameters: {},
    });

    const next = applyCircuitEditValue(symbol, "FrType", "100");

    expect(next.frType).toBe("100");
    expect(next.frRatedCurrent).toBe("100A");
  });

  // RemoveCover is the toggle that hides the blue cover on a distribution block.
  // It maps the boolean to the SVG-layer "BLUE_COVER_VISIBILITY" parameter.
  it("toggles BLUE_COVER_VISIBILITY when RemoveCover is set", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "terminalBlock",
      type: "Blok rozdzielczy",
      label: "Blok rozdzielczy 4\\7",
      isTerminalBlock: true,
      parameters: {},
    });

    const next = applyCircuitEditValue(symbol, "RemoveCover", true);

    expect(next.parameters.BLUE_COVER_VISIBILITY).toBe("hidden");
  });

  it("restores BLUE_COVER_VISIBILITY when RemoveCover is unset", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "terminalBlock",
      type: "Blok rozdzielczy",
      label: "Blok rozdzielczy 4\\7",
      isTerminalBlock: true,
      parameters: { BLUE_COVER_VISIBILITY: "hidden" },
    });

    const next = applyCircuitEditValue(symbol, "RemoveCover", false);

    expect(next.parameters.BLUE_COVER_VISIBILITY).toBe("visible");
  });
});

describe("applyCircuitEditValues", () => {
  it("applies multiple edits in sequence without losing earlier changes", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
      circuitName: "",
      powerW: 0,
      protectionType: "B16",
      parameters: { CURRENT: "B16", LABEL: "B16" },
    });

    const next = applyCircuitEditValues(symbol, {
      CircuitName: "Oświetlenie kuchni",
      PowerW: "1500",
      ProtectionType: "B10",
    });

    expect(next.circuitName).toBe("Oświetlenie kuchni");
    expect(next.powerW).toBe(1500);
    expect(next.protectionType).toBe("B10");
    expect(next.parameters.CURRENT).toBe("B10");
    expect(next.parameters.LABEL).toBe("B10");
  });
});

describe("getCircuitEditHeader", () => {
  it("uses the RCD subtitle and green tone for rcd devices", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "rcd",
      type: "RCD",
      circuitName: "RCD główny",
    });

    const header = getCircuitEditHeader(symbol, mockT);

    expect(header.tone).toBe("green");
    expect(header.subtitle).toContain("różnicowoprądowy");
  });

  it("uses the SPD subtitle and orange tone for spd devices", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "spd",
      type: "SPD",
    });

    const header = getCircuitEditHeader(symbol, mockT);

    expect(header.tone).toBe("orange");
    expect(header.subtitle).toContain("SPD");
  });

  it("uses the FR subtitle and red tone for the main switch (fr)", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "fr",
      type: "FR",
    });

    const header = getCircuitEditHeader(symbol, mockT);

    expect(header.tone).toBe("red");
    expect(header.subtitle).toContain("Rozłącznik");
  });

  it("uses the terminal-block subtitle and blue tone for terminal blocks", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "terminalBlock",
      type: "Listwa zaciskowa",
      isTerminalBlock: true,
    });

    const header = getCircuitEditHeader(symbol, mockT);

    expect(header.tone).toBe("blue");
    expect(header.subtitle).toContain("Listwa");
  });

  it("uses the distribution-block subtitle for 'Blok rozdzielczy' types", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "terminalBlock",
      type: "Blok rozdzielczy",
      label: "Blok rozdzielczy 4\\7",
      isTerminalBlock: true,
    });

    const header = getCircuitEditHeader(symbol, mockT);

    expect(header.subtitle).toContain("Blok rozdzielczy");
  });
});

describe("getCircuitEditFields", () => {
  it("exposes RcdPreset as the only editable field for rcd devices", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "rcd",
      type: "RCD",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });

    const fields = getCircuitEditFields(symbol, mockT);
    const keys = fields.map((f) => f.key);

    expect(keys).toContain("RcdPreset");
    expect(keys).toContain("ReferenceDesignation");
    expect(keys).not.toContain("PowerW");
    expect(keys).not.toContain("ProtectionType");
  });

  it("exposes SpdPreset as the only editable field for spd devices", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "spd",
      type: "SPD",
    });

    const fields = getCircuitEditFields(symbol, mockT);
    const keys = fields.map((f) => f.key);

    expect(keys).toContain("SpdPreset");
    expect(keys).not.toContain("PowerW");
  });

  it("exposes the full MCB field set (ProtectionType, PowerW, Phase, cable)", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "mcb",
      type: "MCB 1P",
    });

    const fields = getCircuitEditFields(symbol, mockT);
    const keys = fields.map((f) => f.key);

    expect(keys).toContain("ProtectionType");
    expect(keys).toContain("PowerW");
    expect(keys).toContain("Phase");
    expect(keys).toContain("CableLength");
    expect(keys).toContain("CableCrossSection");
  });

  it("exposes the distribution-block cover toggle for Blok rozdzielczy", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "terminalBlock",
      type: "Blok rozdzielczy",
      label: "Blok rozdzielczy 4\\7",
      isTerminalBlock: true,
    });

    const fields = getCircuitEditFields(symbol, mockT);
    const keys = fields.map((f) => f.key);

    expect(keys).toContain("RemoveCover");
  });

  it("does NOT expose RemoveCover for plain terminal blocks (not distribution)", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "terminalBlock",
      type: "Listwa zaciskowa",
      label: "Listwa 15 pin N",
      isTerminalBlock: true,
    });

    const fields = getCircuitEditFields(symbol, mockT);
    const keys = fields.map((f) => f.key);

    expect(keys).not.toContain("RemoveCover");
  });

  it("derives a Socket field set when type/label contains 'gniazdo'", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "other",
      type: "Gniazdo 230V",
      label: "Gniazdo",
    });

    const fields = getCircuitEditFields(symbol, mockT);
    const keys = fields.map((f) => f.key);

    expect(keys).toContain("CircuitName");
    expect(keys).toContain("Phase");
    expect(keys).toContain("CableCrossSection");
    expect(keys).not.toContain("ProtectionType");
  });
});
