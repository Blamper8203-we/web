import { describe, expect, it } from "vitest";
import type { ValidationResult } from "./electricalValidationService";
import {
  buildValidationDisplayGroups,
  buildValidationDisplayGroupsForSymbols,
  getValidationReadiness,
} from "./validationPresentation";

describe("validationPresentation", () => {
  it("groups messages by symbol and sorts the most severe groups first", () => {
    const result: ValidationResult = {
      isValid: false,
      errors: [
        {
          code: "VAL-010",
          message: "Niezgodność faz",
          severity: "Error",
          symbolId: "mcb-2",
        },
      ],
      warnings: [
        {
          code: "VAL-020",
          message: "Brak mocy",
          severity: "Warning",
          symbolId: "mcb-1",
        },
        {
          code: "VAL-003",
          message: "Niedopasowanie zabezpieczenia",
          severity: "Warning",
          symbolId: "mcb-2",
        },
      ],
      info: [
        {
          code: "VAL-018",
          message: "Brak nazwy",
          severity: "Info",
          symbolId: "mcb-1",
        },
        {
          code: "VAL-019",
          message: "Brak lokalizacji",
          severity: "Info",
        },
      ],
    };

    const groups = buildValidationDisplayGroups(result);

    expect(groups.map((group) => group.id)).toEqual(["symbol:mcb-2", "symbol:mcb-1", "project"]);
    expect(groups[0].messages.map((message) => message.code)).toEqual(["VAL-010", "VAL-003"]);
    expect(groups[1].subtitle).toBe("1 ostrz. · 1 info");
  });

  it("uses human-readable symbol labels instead of technical ids", () => {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [
        {
          code: "VAL-020",
          message: "Brak mocy",
          severity: "Warning",
          symbolId: "technical-id",
        },
      ],
      info: [],
    };

    const groups = buildValidationDisplayGroupsForSymbols(result, [
      {
        id: "technical-id",
        referenceDesignation: "F1.3",
        circuitName: "",
        label: "rozłącznik nadprądowy MCB 3P",
        type: "MCB",
        displayModuleNumber: "#3",
        moduleNumber: 3,
      },
    ]);

    expect(groups[0].title).toBe("F1.3 · rozłącznik nadprądowy MCB 3P");
    expect(groups[0].technicalId).toBe("technical-id");
  });

  it("keeps validation inactive until there are circuit devices", () => {
    expect(getValidationReadiness([])).toBe("emptyProject");
    expect(getValidationReadiness([{ deviceKind: "rcd" }, { deviceKind: "fr" }])).toBe("noCircuitDevices");
    expect(getValidationReadiness([{ deviceKind: "mcb" }])).toBe("ready");
    expect(getValidationReadiness([{ deviceKind: "rcbo" }])).toBe("ready");
  });
});
