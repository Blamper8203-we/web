import { describe, expect, it } from "vitest";
import {
  getCableCapacity,
  hasAnyToken,
  hasText,
  isAdditionalProtectionCircuit,
  isRcdTypeAllowed,
  normalizeRcdType,
  normalizeSinglePhase,
  normalizeValidationText,
  parseFrRating,
  parseProtectionRating,
} from "./validationHelpers";
import { createDefaultSymbolItem } from "../../types/symbolItem";

describe("parseProtectionRating", () => {
  it("returns 0 for empty / non-matching input", () => {
    expect(parseProtectionRating("")).toBe(0);
    expect(parseProtectionRating("Manual")).toBe(0);
    expect(parseProtectionRating("unknown")).toBe(0);
  });

  it("extracts the numeric rating from B/C/D/Z/K prefixes", () => {
    expect(parseProtectionRating("B16")).toBe(16);
    expect(parseProtectionRating("C20")).toBe(20);
    expect(parseProtectionRating("D32")).toBe(32);
    expect(parseProtectionRating("Z10")).toBe(10);
    expect(parseProtectionRating("K6")).toBe(6);
  });

  it("is case-insensitive", () => {
    expect(parseProtectionRating("b16")).toBe(16);
    expect(parseProtectionRating("c20")).toBe(20);
  });
});

describe("parseFrRating", () => {
  it("parses the realistic FR rating shapes (no tripping-curve prefix)", () => {
    expect(parseFrRating("63")).toBe(63);
    expect(parseFrRating("63A")).toBe(63);
    expect(parseFrRating("63 A")).toBe(63);
    expect(parseFrRating("63a")).toBe(63);
    expect(parseFrRating("100 A")).toBe(100);
  });

  it("returns 0 for empty or non-numeric input", () => {
    expect(parseFrRating("")).toBe(0);
    expect(parseFrRating("xyz")).toBe(0);
  });

  it("does not pick up MCB-style tripping-curve prefixes (regression guard)", () => {
    // B63 / C20 / D32 are MCB strings — they MUST go through
    // parseProtectionRating, not parseFrRating. Returning 0 here is
    // intentional: a malformed FR string (e.g. one that was copied from an
    // MCB field) should be treated as "unknown", not silently parsed.
    expect(parseFrRating("B63")).toBe(0);
    expect(parseFrRating("C25")).toBe(0);
  });
});

describe("getCableCapacity", () => {
  it("returns the table value for known cross-sections", () => {
    expect(getCableCapacity(1.5)).toBe(16);
    expect(getCableCapacity(2.5)).toBe(21);
    expect(getCableCapacity(50)).toBe(133);
  });

  it("returns 0 for unknown cross-sections", () => {
    expect(getCableCapacity(0.75)).toBe(0);
    expect(getCableCapacity(70)).toBe(0);
  });
});

describe("normalizeSinglePhase", () => {
  it("accepts the three single-phase values case-insensitively", () => {
    expect(normalizeSinglePhase("L1")).toBe("L1");
    expect(normalizeSinglePhase("l2")).toBe("L2");
    expect(normalizeSinglePhase("L3")).toBe("L3");
  });

  it("returns null for multi-phase and unknown input", () => {
    expect(normalizeSinglePhase("L1+L2")).toBeNull();
    expect(normalizeSinglePhase("3F")).toBeNull();
    expect(normalizeSinglePhase("")).toBeNull();
    expect(normalizeSinglePhase(null)).toBeNull();
    expect(normalizeSinglePhase(undefined)).toBeNull();
  });
});

describe("normalizeValidationText", () => {
  it("strips Polish diacritics and uppercases", () => {
    expect(normalizeValidationText("pompa ciepła")).toBe("POMPA CIEPLA");
    expect(normalizeValidationText("Łódź")).toBe("LODZ");
  });

  it("joins multiple values with a space", () => {
    expect(normalizeValidationText("kuchnia", "indukcyjna")).toBe("KUCHNIA INDUKCYJNA");
  });
});

describe("hasAnyToken", () => {
  it("returns true when at least one token is present", () => {
    expect(hasAnyToken("POMPA CIEPLA", ["POMPA CIEPLA", "KLIMATYZACJA"])).toBe(true);
    expect(hasAnyToken("KLIMATYZACJA", ["POMPA CIEPLA", "KLIMATYZACJA"])).toBe(true);
  });

  it("returns false when no token matches", () => {
    expect(hasAnyToken("OSWIETLENIE", ["POMPA CIEPLA", "KLIMATYZACJA"])).toBe(false);
  });
});

describe("hasText", () => {
  it("returns true for non-empty trimmed strings", () => {
    expect(hasText("hello")).toBe(true);
    expect(hasText("  hello  ")).toBe(true);
  });

  it("returns false for empty / whitespace-only / nullish", () => {
    expect(hasText("")).toBe(false);
    expect(hasText("   ")).toBe(false);
    expect(hasText(null)).toBe(false);
    expect(hasText(undefined)).toBe(false);
    expect(hasText(123 as unknown as string)).toBe(false);
  });
});

describe("normalizeRcdType", () => {
  it("uppercases and trims", () => {
    expect(normalizeRcdType("a")).toBe("A");
    expect(normalizeRcdType("  F  ")).toBe("F");
  });

  it("returns empty string for missing input", () => {
    expect(normalizeRcdType("")).toBe("");
    expect(normalizeRcdType(null)).toBe("");
    expect(normalizeRcdType(undefined)).toBe("");
  });
});

describe("isRcdTypeAllowed", () => {
  it("matches when the type is in the allowed list", () => {
    expect(isRcdTypeAllowed("B", ["B"])).toBe(true);
    expect(isRcdTypeAllowed("F", ["F", "B"])).toBe(true);
  });

  it("does not match when the type is not allowed", () => {
    expect(isRcdTypeAllowed("AC", ["A", "F", "B"])).toBe(false);
    expect(isRcdTypeAllowed("", ["A", "F", "B"])).toBe(false);
  });
});

describe("isAdditionalProtectionCircuit", () => {
  it("is true for Gniazdo and Oswietlenie", () => {
    const socket = createDefaultSymbolItem({ deviceKind: "mcb", circuitType: "Gniazdo" });
    const lighting = createDefaultSymbolItem({ deviceKind: "mcb", circuitType: "Oswietlenie" });
    expect(isAdditionalProtectionCircuit(socket)).toBe(true);
    expect(isAdditionalProtectionCircuit(lighting)).toBe(true);
  });

  it("is false for Sila and Inne", () => {
    const sila = createDefaultSymbolItem({ deviceKind: "mcb", circuitType: "Sila" });
    const inne = createDefaultSymbolItem({ deviceKind: "mcb", circuitType: "Inne" });
    expect(isAdditionalProtectionCircuit(sila)).toBe(false);
    expect(isAdditionalProtectionCircuit(inne)).toBe(false);
  });
});
