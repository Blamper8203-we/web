import { describe, it, expect } from "vitest";
import {
  normalizeValidationText,
  isMainBreaker,
  isSpd,
  isIndicator,
  isThreePhaseDevice,
  isRcdDevice,
  isRcboDevice,
} from "./deviceIdentification";
import type { SymbolItem } from "../types/symbolItem";

describe("deviceIdentification", () => {
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
    } as unknown as SymbolItem;
  }

  it("normalizeValidationText normalizuje polskie znaki i wielkość liter", () => {
    expect(normalizeValidationText("Wyłącznik", "RÓŻNICOWY")).toBe("wylacznik roznicowy");
    expect(normalizeValidationText("Ł", "Ą", "Ć", "Ś", "Ń")).toBe("l a c s n");
    expect(normalizeValidationText(undefined, undefined, "FR", "")).toBe("  fr ");
  });

  it("isMainBreaker rozpoznaje rozłącznik główny", () => {
    expect(isMainBreaker(createMockSymbol({ type: "FR 303" }))).toBe(true);
    expect(isMainBreaker(createMockSymbol({ label: "Rozłącznik" }))).toBe(true);
    expect(isMainBreaker(createMockSymbol({ type: "Switch 3P" }))).toBe(true);
    expect(isMainBreaker(createMockSymbol({ label: "Przełącznik sieci" }))).toBe(true);
    expect(isMainBreaker(createMockSymbol({ type: "MCB" }))).toBe(false);
  });

  it("isSpd rozpoznaje ograniczniki przepięć", () => {
    expect(isSpd(createMockSymbol({ type: "Ogranicznik SPD" }))).toBe(true);
    expect(isSpd(createMockSymbol({ type: "T2 SPD" }))).toBe(true);
    expect(isSpd(createMockSymbol({ type: "MCB" }))).toBe(false);
  });

  it("isIndicator rozpoznaje lampki kontrolne", () => {
    expect(isIndicator(createMockSymbol({ label: "Kontrolka faz" }))).toBe(true);
    expect(isIndicator(createMockSymbol({ label: "Lampka" }))).toBe(true);
    expect(isIndicator(createMockSymbol({ type: "Phase indicator" }))).toBe(true);
    expect(isIndicator(createMockSymbol({ type: "Sygnalizator" }))).toBe(true);
    expect(isIndicator(createMockSymbol({ type: "MCB" }))).toBe(false);
  });

  it("isThreePhaseDevice poprawnie odczytuje fazy z właściwości phase", () => {
    expect(isThreePhaseDevice(createMockSymbol({ phase: "L1+L2+L3" }))).toBe(true);
    expect(isThreePhaseDevice(createMockSymbol({ phase: "3F" }))).toBe(true);
    expect(isThreePhaseDevice(createMockSymbol({ phase: "L1" }))).toBe(false);
  });

  it("isThreePhaseDevice wykrywa 3P po nazwach", () => {
    expect(isThreePhaseDevice(createMockSymbol({ type: "MCB 3P" }))).toBe(true);
    expect(isThreePhaseDevice(createMockSymbol({ type: "RCD 4P" }))).toBe(true);
    expect(isThreePhaseDevice(createMockSymbol({ label: "3p+n" }))).toBe(true);
    expect(isThreePhaseDevice(createMockSymbol({ type: "MCB 1P" }))).toBe(false);
  });

  it("isRcdDevice korzysta z deviceKind oraz tekstów", () => {
    expect(isRcdDevice(createMockSymbol({ deviceKind: "rcd" }))).toBe(true);
    expect(isRcdDevice(createMockSymbol({ type: "RCD" }))).toBe(true);
    expect(isRcdDevice(createMockSymbol({ label: "Wyłącznik różnicowoprądowy" }))).toBe(true);
    expect(isRcdDevice(createMockSymbol({ type: "RCCB" }))).toBe(true);
    expect(isRcdDevice(createMockSymbol({ deviceKind: "mcb", type: "B16" }))).toBe(false);
  });

  it("isRcboDevice korzysta z deviceKind oraz tekstów", () => {
    expect(isRcboDevice(createMockSymbol({ deviceKind: "rcbo" }))).toBe(true);
    expect(isRcboDevice(createMockSymbol({ type: "RCBO B16" }))).toBe(true);
    expect(isRcboDevice(createMockSymbol({ deviceKind: "mcb", type: "B16" }))).toBe(false);
  });
});
