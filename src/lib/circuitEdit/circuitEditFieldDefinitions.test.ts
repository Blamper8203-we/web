import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import { applyCircuitEditValue } from "./circuitEditFieldDefinitions";

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
});
