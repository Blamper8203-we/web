import { describe, expect, it } from "vitest";
import {
  isSinglePhaseAssignment,
  normalizeSinglePhaseAssignment,
} from "./phaseNormalization";

describe("isSinglePhaseAssignment", () => {
  it("akceptuje poprawne fazy L1/L2/L3 (case-insensitive)", () => {
    expect(isSinglePhaseAssignment("L1")).toBe(true);
    expect(isSinglePhaseAssignment("L2")).toBe(true);
    expect(isSinglePhaseAssignment("L3")).toBe(true);
    expect(isSinglePhaseAssignment("l1")).toBe(true);
    expect(isSinglePhaseAssignment("l2")).toBe(true);
    expect(isSinglePhaseAssignment("l3")).toBe(true);
  });

  it("odrzuca multi-phase", () => {
    expect(isSinglePhaseAssignment("L1+L2")).toBe(false);
    expect(isSinglePhaseAssignment("L1+L2+L3")).toBe(false);
  });

  it("odrzuca pusty/null/undefined", () => {
    expect(isSinglePhaseAssignment("")).toBe(false);
    expect(isSinglePhaseAssignment(null)).toBe(false);
    expect(isSinglePhaseAssignment(undefined)).toBe(false);
  });
});

describe("normalizeSinglePhaseAssignment", () => {
  it("zwraca phase jesli poprawna (upperCase)", () => {
    expect(normalizeSinglePhaseAssignment("L1")).toBe("L1");
    expect(normalizeSinglePhaseAssignment("l2")).toBe("L2");
  });

  it("fallback do 'L1' dla pusty/null/undefined", () => {
    expect(normalizeSinglePhaseAssignment("")).toBe("L1");
    expect(normalizeSinglePhaseAssignment(null)).toBe("L1");
    expect(normalizeSinglePhaseAssignment(undefined)).toBe("L1");
  });

  it("fallback do parametru fallback jesli podany i poprawny", () => {
    expect(normalizeSinglePhaseAssignment("invalid", "L2")).toBe("L2");
    expect(normalizeSinglePhaseAssignment("L1+L2", "L3")).toBe("L3");
  });

  it("fallback chain: ostatecznie 'L1' jesli phase i fallback oba niepoprawne", () => {
    expect(normalizeSinglePhaseAssignment("invalid", "alsoInvalid")).toBe("L1");
    expect(normalizeSinglePhaseAssignment("L1+L2", "L1+L2+L3")).toBe("L1");
  });
});
