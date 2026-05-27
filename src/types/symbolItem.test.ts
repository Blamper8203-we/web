import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem, isAuxiliaryNonCircuitSymbol } from "./symbolItem";
import { toDisplayModuleNumber } from "../lib/appHelpers";

describe("createDefaultSymbolItem (Avalonia parity)", () => {
  it("uses 'Brak' display protection when protection type is empty", () => {
    const symbol = createDefaultSymbolItem({
      type: "MCB 1P",
      protectionType: "",
    });

    expect(symbol.displayProtection).toBe("Brak");
  });

  it("computes RCD/SPD display protection from computed info", () => {
    const rcd = createDefaultSymbolItem({
      type: "RCD 2P",
      rcdRatedCurrent: 40,
      rcdResidualCurrent: 30,
      rcdType: "A",
    });
    const spd = createDefaultSymbolItem({
      type: "SPD",
      spdType: "T1+T2",
      spdVoltage: 275,
      spdDischargeCurrent: 25,
    });

    expect(rcd.displayProtection).toBe("RCD 40A/30mA Typ A");
    expect(spd.displayProtection).toBe("SPD T1+T2 275V 25kA");
  });

  it("computes terminal block display module number as X*", () => {
    const terminal = createDefaultSymbolItem({
      type: "Listwy zaciskowe",
      visualPath: "assets/modules/Listwy zaciskowe/LISTWA 12 PIN.svg",
      moduleNumber: 2,
    });

    expect(terminal.isTerminalBlock).toBe(true);
    expect(terminal.displayModuleNumber).toBe("X2");
  });

  it("detects connector modules as terminal blocks", () => {
    const connector = createDefaultSymbolItem({
      type: "Złącza",
      label: "ZŁĄCZE 3XPEN",
      deviceKind: "terminalBlock",
      visualPath: "assets/modules/zlacza/zlacze-3xpen.svg",
      moduleNumber: 3,
    });

    expect(connector.isTerminalBlock).toBe(true);
    expect(connector.displayModuleNumber).toBe("X3");
  });

  it("does not treat imported RCD assets as auxiliary modules", () => {
    const rcd = createDefaultSymbolItem({
      type: "Wyłącznik różnicowoprądowy 40A 4P",
      label: "RCD 40A 4P",
      deviceKind: "rcd",
      visualPath: "assets/modules/Rozdzielnica/RCD 40A 4P.svg",
      moduleRef: "Rozdzielnica/RCD 40A 4P.svg",
    });

    expect(isAuxiliaryNonCircuitSymbol(rcd)).toBe(false);
  });
});

describe("toDisplayModuleNumber", () => {
  it("returns #0 for RCD by type even when deviceKind is not set to rcd", () => {
    const symbol = createDefaultSymbolItem({
      deviceKind: "other",
      type: "rcd niestandardowe",
      moduleNumber: 7,
    });

    expect(toDisplayModuleNumber(symbol)).toBe("#0");
  });
});
