import { describe, it, expect } from "vitest";
import { detectPoleCount, detectPoleCountWithFallback, detectPhaseCount } from "./poleCount";
import type { SymbolItem } from "../types/symbolItem";

describe("poleCount", () => {
  function createMockSymbol(overrides: Partial<SymbolItem> = {}): SymbolItem {
    return {
      id: "test",
      type: "Test",
      label: "",
      moduleRef: "",
      visualPath: "",
      deviceKind: "other",
      phase: "L1",
      parameters: {},
      group: null,
      width: 0,
      height: 0,
      ...overrides,
    } as SymbolItem;
  }

  describe("detectPoleCount", () => {
    it("wykrywa na podstawie pełnego słowa (np. 3 POL, 2P, 4 BIEG)", () => {
      expect(detectPoleCount(createMockSymbol({ label: "Rozłącznik 3 POL" }))).toBe(3);
      expect(detectPoleCount(createMockSymbol({ type: "MCB 2P" }))).toBe(2);
      expect(detectPoleCount(createMockSymbol({ label: "Ogranicznik 4 BIEG" }))).toBe(4);
      expect(detectPoleCount(createMockSymbol({ moduleRef: "1 TOR" }))).toBe(1);
    });

    it("wykrywa serię S-30x (np. S-303, S 302)", () => {
      expect(detectPoleCount(createMockSymbol({ type: "S-303" }))).toBe(3);
      expect(detectPoleCount(createMockSymbol({ type: "S 302" }))).toBe(2);
      expect(detectPoleCount(createMockSymbol({ type: "S304" }))).toBe(4);
      expect(detectPoleCount(createMockSymbol({ type: "S-301" }))).toBe(1);
    });

    it("wykrywa na podstawie substringa (4p, 3p, 2p, 1p)", () => {
      expect(detectPoleCount(createMockSymbol({ type: "MCB-3p" }))).toBe(3);
      expect(detectPoleCount(createMockSymbol({ label: "switch4p" }))).toBe(4);
      expect(detectPoleCount(createMockSymbol({ moduleRef: "2p_version" }))).toBe(2);
    });

    it("używa deviceKind jako fallback", () => {
      expect(detectPoleCount(createMockSymbol({ deviceKind: "fr" }))).toBe(4);
      expect(detectPoleCount(createMockSymbol({ deviceKind: "spd" }))).toBe(4);
      expect(detectPoleCount(createMockSymbol({ deviceKind: "phaseIndicator" }))).toBe(4);
      expect(detectPoleCount(createMockSymbol({ deviceKind: "rcd", phase: "3F" }))).toBe(4);
      expect(detectPoleCount(createMockSymbol({ deviceKind: "rcd", phase: "L1" }))).toBe(1); // Nie-trójfazowe RCD -> fallback na fazę (zwróci 1)
    });

    it("korzysta z aspect ratio, gdy wysokość > 0", () => {
      expect(detectPoleCount(createMockSymbol({ width: 25, height: 100 }))).toBe(1); // 0.25
      expect(detectPoleCount(createMockSymbol({ width: 45, height: 100 }))).toBe(2); // 0.45
      expect(detectPoleCount(createMockSymbol({ width: 70, height: 100 }))).toBe(3); // 0.70
      expect(detectPoleCount(createMockSymbol({ width: 85, height: 100 }))).toBe(4); // 0.85
    });

    it("używa przypisanej fazy jako fallback", () => {
      expect(detectPoleCount(createMockSymbol({ phase: "L1+L2+L3" }))).toBe(4);
      expect(detectPoleCount(createMockSymbol({ phase: "L1+L2" }))).toBe(2);
      expect(detectPoleCount(createMockSymbol({ phase: "L3" }))).toBe(1);
    });

    it("zwraca 0 gdy nic nie pasuje", () => {
      expect(detectPoleCount(createMockSymbol({ type: "Unknown", phase: "PENDING" as any }))).toBe(0);
    });
  });

  describe("detectPoleCountWithFallback", () => {
    it("zwraca 1 zamiast 0 dla nierozpoznanych symboli", () => {
      expect(detectPoleCountWithFallback(createMockSymbol({ type: "Unknown", phase: "PENDING" as any }))).toBe(1);
    });

    it("zwraca właściwą wartość dla rozpoznanych", () => {
      expect(detectPoleCountWithFallback(createMockSymbol({ type: "MCB 3P" }))).toBe(3);
    });
  });

  describe("detectPhaseCount", () => {
    it("liczy fazy na podstawie ciągu znaków", () => {
      expect(detectPhaseCount("L1+L2+L3")).toBe(3);
      expect(detectPhaseCount("3F")).toBe(3);
      expect(detectPhaseCount("3P")).toBe(3);
      expect(detectPhaseCount("L1+L2")).toBe(2);
      expect(detectPhaseCount("L2+L3")).toBe(2);
      expect(detectPhaseCount("L1+L3")).toBe(2);
      expect(detectPhaseCount("L1")).toBe(1);
      expect(detectPhaseCount("PENDING")).toBe(1);
      expect(detectPhaseCount("")).toBe(1);
    });
  });
});
