import { describe, expect, it } from "vitest";
import {
  formatProtocolNumberLabel,
  formatProtocolTitle,
  getSuffix,
} from "./pdfHelpers";

describe("formatProtocolNumberLabel", () => {
  it("strips 'Protokół Nr' prefix", () => {
    expect(formatProtocolNumberLabel("Protokół Nr 03/12")).toBe("03/12");
  });

  it("strips 'Protokół pomiarów Nr' prefix (extended form)", () => {
    expect(formatProtocolNumberLabel("Protokół pomiarów Nr 03/12")).toBe("03/12");
  });

  it("is case-insensitive (matches i flag)", () => {
    expect(formatProtocolNumberLabel("PROTOKÓŁ NR 03/12")).toBe("03/12");
  });

  it("returns unchanged when no prefix", () => {
    expect(formatProtocolNumberLabel("03/12")).toBe("03/12");
  });

  it("returns empty string for undefined", () => {
    expect(formatProtocolNumberLabel(undefined)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(formatProtocolNumberLabel("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(formatProtocolNumberLabel("   ")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(formatProtocolNumberLabel("  Protokół Nr 03/12  ")).toBe("03/12");
  });

  // To jest defensywna unifikacja — wcześniej PdfUnifiedTablePage.tsx
  // przekazywał `string` (compile error gdy undefined), MeasurementProtocolsWorkspacePage
  // przekazywał `string | undefined`. Po unifikacji oba przypadki działają.
  it("handles undefined without throwing (defensive: unifies two call sites)", () => {
    expect(() => formatProtocolNumberLabel(undefined)).not.toThrow();
  });
});

describe("getSuffix", () => {
  // Implementacja zwraca litery alfabetu: 0='A', 1='B', 2='C'... (ASCII 65+index).
  // Używane do oznaczania "część X/Y" w nagłówkach protokołu.

  it("returns empty for single chunk (1 of 1)", () => {
    expect(getSuffix(1, 0)).toBe("");
  });

  it("returns 'A' for first chunk of multi (0 of 3)", () => {
    expect(getSuffix(3, 0)).toBe("A");
  });

  it("returns 'B' for middle chunk (1 of 3)", () => {
    expect(getSuffix(3, 1)).toBe("B");
  });

  it("returns 'C' for last chunk (2 of 3)", () => {
    expect(getSuffix(3, 2)).toBe("C");
  });
});

describe("formatProtocolTitle", () => {
  it("appends suffix right after 'Protokół Nr X' (no space)", () => {
    // Format: "Protokół Nr" + (number) + suffix — suffix jest wstawiane
    // bezpośrednio po liczbie (np. "Protokół Nr 03A/12").
    expect(formatProtocolTitle("Protokół Nr 03/12", "A")).toBe("Protokół Nr 03A/12");
  });

  it("returns unchanged when suffix is empty", () => {
    expect(formatProtocolTitle("Protokół Nr 03/12", "")).toBe("Protokół Nr 03/12");
  });

  it("appends suffix to first number when no 'Protokół Nr' match", () => {
    expect(formatProtocolTitle("Custom Title 5", "A")).toBe("Custom Title 5A");
  });

  it("appends suffix at end when no number found", () => {
    expect(formatProtocolTitle("Title Without Number", "A")).toBe("Title Without Number A");
  });
});
