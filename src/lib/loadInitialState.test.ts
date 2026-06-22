import { describe, it, expect } from "vitest";
import {
  loadInitialSymbols,
  loadInitialConnections,
  loadInitialWireSettings,
  DEFAULT_WIRE_SETTINGS,
  type ReadStorage,
} from "./loadInitialState";
import {
  SYMBOLS_STORAGE_KEY,
  CONNECTIONS_STORAGE_KEY,
  DEFAULT_WIRE_SETTINGS_STORAGE_KEY,
} from "./appHelpers";

// WHY: testujemy właściwość "uszkodzone/brakujące dane storage NIE powodują crashu,
// tylko bezpieczny fallback" — to kontrakt inicjalizacji stanu aplikacji.
function makeRead(store: Record<string, string | null | undefined>): ReadStorage {
  return (key: string) => store[key];
}

describe("loadInitialSymbols", () => {
  it("zwraca pustą tablicę gdy brak danych", () => {
    expect(loadInitialSymbols(makeRead({}))).toEqual([]);
  });

  it("zwraca pustą tablicę dla uszkodzonego JSON zamiast rzucać wyjątek", () => {
    const read = makeRead({ [SYMBOLS_STORAGE_KEY]: "{not valid json" });
    expect(() => loadInitialSymbols(read)).not.toThrow();
    expect(loadInitialSymbols(read)).toEqual([]);
  });

  it("zwraca pustą tablicę gdy JSON jest poprawny ale nie jest tablicą symboli", () => {
    const read = makeRead({ [SYMBOLS_STORAGE_KEY]: '"a string"' });
    expect(loadInitialSymbols(read)).toEqual([]);
  });
});

describe("loadInitialConnections", () => {
  it("zwraca pustą tablicę gdy brak danych", () => {
    expect(loadInitialConnections(makeRead({}))).toEqual([]);
  });

  it("zwraca pustą tablicę dla uszkodzonego JSON zamiast rzucać wyjątek", () => {
    const read = makeRead({ [CONNECTIONS_STORAGE_KEY]: "[{broken" });
    expect(() => loadInitialConnections(read)).not.toThrow();
    expect(loadInitialConnections(read)).toEqual([]);
  });

  it("odrzuca elementy bez prawidłowego id i zachowuje poprawne", () => {
    const read = makeRead({
      [CONNECTIONS_STORAGE_KEY]: JSON.stringify([
        { id: "c1", fromSymbolId: "s1", toSymbolId: "s2" },
        { fromSymbolId: "x" }, // brak id -> odrzucone
        null, // smieć -> odrzucone
        "oops", // smieć -> odrzucone
      ]),
    });
    const result = loadInitialConnections(read);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
    // Pola domyślne wypełnione przez createDefaultConnection:
    expect(result[0].wireColor).toBe("black");
    expect(result[0].fromSymbolId).toBe("s1");
  });
});

describe("loadInitialWireSettings", () => {
  it("zwraca wartości domyślne gdy brak danych", () => {
    expect(loadInitialWireSettings(makeRead({}))).toEqual(DEFAULT_WIRE_SETTINGS);
  });

  it("zwraca wartości domyślne dla uszkodzonego JSON zamiast rzucać wyjątek", () => {
    const read = makeRead({ [DEFAULT_WIRE_SETTINGS_STORAGE_KEY]: "{broken" });
    expect(() => loadInitialWireSettings(read)).not.toThrow();
    expect(loadInitialWireSettings(read)).toEqual(DEFAULT_WIRE_SETTINGS);
  });

  it("merguje zapisane pola na domyślne (brakujące pola nie psują reszty)", () => {
    const read = makeRead({
      [DEFAULT_WIRE_SETTINGS_STORAGE_KEY]: JSON.stringify({ wireCrossSection: 6 }),
    });
    const result = loadInitialWireSettings(read);
    expect(result.wireCrossSection).toBe(6);
    expect(result.wireColor).toBe(DEFAULT_WIRE_SETTINGS.wireColor);
    expect(result.routingMode).toBe(DEFAULT_WIRE_SETTINGS.routingMode);
  });
});
