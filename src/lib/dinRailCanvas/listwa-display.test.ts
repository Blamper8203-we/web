import { describe, expect, it } from "vitest";
import { getSymbolDesignationLabel } from "./geometry";
import { createDefaultSymbolItem } from "../../types/symbolItem";

describe("dinRailCanvas/geometry - terminal block display", () => {
  it("returns displayModuleNumber for terminal block in main rozdzielnica", () => {
    // Simulates a Listwa 15 pin N in the user's project. The user reports
    // seeing F0.1 in the main rozdzielnica (Pixi canvas) but X1 in the
    // rozdzielnica polaczen (SVG canvas). This test documents the contract:
    // for terminal blocks the label must come from displayModuleNumber, not
    // referenceDesignation or the automaticDesignationBySymbolId map.
    const listwa = createDefaultSymbolItem({
      id: "listwa-n",
      type: "Listwy",
      deviceKind: "terminalBlock",
      x: 0,
      y: 0,
      rotation: 0,
      width: 1243,
      height: 175,
      label: "Listwa 15 pin N",
      moduleRef: "Listwy do rozdzielnicy/Listwa 15 pin N.svg",
      referenceDesignation: "X1",
      displayModuleNumber: "X1",
    });

    // Empty automaticDesignationBySymbolId map (terminal blocks have no
    // entry there because buildSchematicLayout leaves designation="" for them).
    const result = getSymbolDesignationLabel(listwa, new Map());
    expect(result).toBe("X1");
  });

  it("falls back to referenceDesignation when displayModuleNumber is empty", () => {
    // If for some reason displayModuleNumber is missing, we should still
    // return referenceDesignation rather than an empty string.
    const listwa = createDefaultSymbolItem({
      id: "listwa-n-2",
      type: "Listwy",
      deviceKind: "terminalBlock",
      label: "Listwa 15 pin N",
      moduleRef: "Listwy do rozdzielnicy/Listwa 15 pin N.svg",
      referenceDesignation: "X1",
      displayModuleNumber: "",
    });

    const result = getSymbolDesignationLabel(listwa, new Map());
    expect(result).toBe("X1");
  });
});
