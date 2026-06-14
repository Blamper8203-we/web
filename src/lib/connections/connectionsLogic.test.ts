import { describe, expect, it } from "vitest";
import {
  getAutoFerruleColor,
  getFerruleLength,
  isTerminalZlaczka,
} from "./connectionsLogic";

describe("connectionsLogic - getAutoFerruleColor", () => {
  it("returns 'black' for cross-section <= 1.5", () => {
    expect(getAutoFerruleColor(1.0)).toBe("black");
    expect(getAutoFerruleColor(1.5)).toBe("black");
  });

  it("returns 'blue' for 2.5mm2", () => {
    expect(getAutoFerruleColor(2.5)).toBe("blue");
  });

  it("returns 'grey' for 4.0mm2", () => {
    expect(getAutoFerruleColor(4.0)).toBe("grey");
  });

  it("returns 'yellow' for 6.0mm2", () => {
    expect(getAutoFerruleColor(6.0)).toBe("yellow");
  });

  it("returns 'red' for 10.0mm2", () => {
    expect(getAutoFerruleColor(10.0)).toBe("red");
  });

  it("returns 'blue' for >= 16.0mm2", () => {
    expect(getAutoFerruleColor(16.0)).toBe("blue");
    expect(getAutoFerruleColor(25.0)).toBe("blue");
  });
});

describe("connectionsLogic - isTerminalZlaczka", () => {
  it("returns true for 'zlacz-3pin'", () => {
    expect(isTerminalZlaczka("zlacz-3pin")).toBe(true);
  });

  it("returns true for 'zlaczka' (with Polish ł -> l normalisation)", () => {
    expect(isTerminalZlaczka("złączka-3pin")).toBe(true);
  });

  it("returns true for 'złaczka'", () => {
    expect(isTerminalZlaczka("złaczka")).toBe(true);
  });

  it("returns false for 'rozlacznik' (must not match MCB-style main breaker)", () => {
    expect(isTerminalZlaczka("rozlacznik-nadpradowy")).toBe(false);
  });

  it("returns false for 'mcb'", () => {
    expect(isTerminalZlaczka("mcb-1p")).toBe(false);
  });

  it("returns false for empty/null", () => {
    expect(isTerminalZlaczka("")).toBe(false);
    expect(isTerminalZlaczka(null)).toBe(false);
    expect(isTerminalZlaczka(undefined)).toBe(false);
  });
});

describe("connectionsLogic - getFerruleLength", () => {
  it("returns 240 for Złączka (extra-long for visibility behind plastic)", () => {
    expect(getFerruleLength("terminalBlock", "zlaczka-3pin")).toBe(240);
  });

  it("returns 90 for terminal block that is not a Złączka", () => {
    expect(getFerruleLength("terminalBlock", "listwa-n-12pin")).toBe(90);
  });

  it("returns 20 for phase indicator", () => {
    expect(getFerruleLength("phaseIndicator", null)).toBe(20);
  });

  it("returns 160 for regular devices (e.g. MCB)", () => {
    expect(getFerruleLength("mcb", "mcb-1p")).toBe(160);
  });

  it("returns 160 when deviceKind is undefined and moduleRef is not a Złączka", () => {
    expect(getFerruleLength(undefined, undefined)).toBe(160);
  });

  it("returns 240 even when deviceKind is unusual, if moduleRef marks it as Złączka", () => {
    // Złączka detection is based on moduleRef, not deviceKind
    expect(getFerruleLength("other", "złączka-5pin")).toBe(240);
  });
});
