import { describe, expect, it } from "vitest";
import {
  createDefaultConnection,
  filterConnectionOverrides,
  normalizeConnectionItems,
} from "./connectionItem";

describe("createDefaultConnection", () => {
  it("zwraca polaczenie z domyslnymi wartosciami", () => {
    const conn = createDefaultConnection();

    expect(conn.id).toMatch(/^[0-9a-f-]{36}$/); // UUID
    expect(conn.fromSymbolId).toBe("");
    expect(conn.toSymbolId).toBe("");
    expect(conn.wireColor).toBe("black");
    expect(conn.wireCrossSection).toBe(2.5);
    expect(conn.wireType).toBe("LgY");
    expect(conn.ferruleColor).toBe("white");
    expect(conn.routingMode).toBe("orthogonal");
  });

  it("overrides nadpisuja wybrane pola", () => {
    const conn = createDefaultConnection({
      wireColor: "blue",
      wireCrossSection: 4,
      routingMode: "manhattan",
    });

    expect(conn.wireColor).toBe("blue");
    expect(conn.wireCrossSection).toBe(4);
    expect(conn.routingMode).toBe("manhattan");
    // Nienaruszone pola
    expect(conn.wireType).toBe("LgY");
    expect(conn.ferruleColor).toBe("white");
  });
});

describe("filterConnectionOverrides", () => {
  it("zwraca pusty obiekt dla null/undefined/non-object", () => {
    expect(filterConnectionOverrides(null)).toEqual({});
    expect(filterConnectionOverrides(undefined)).toEqual({});
    expect(filterConnectionOverrides("string")).toEqual({});
    expect(filterConnectionOverrides(42)).toEqual({});
    expect(filterConnectionOverrides([])).toEqual({});
  });

  it("wyciaga tylko pola z poprawnym typem", () => {
    const raw = {
      id: "conn-1",
      fromSymbolId: "sym-1",
      // fromTerminal ma zly typ - pomin
      fromTerminal: 42,
      wireCrossSection: 2.5,
      // ferruleColor ma zly typ - pomin
      ferruleColor: null,
      isFromTop: true,
      routingMode: "smart",
    };

    const overrides = filterConnectionOverrides(raw);

    expect(overrides.id).toBe("conn-1");
    expect(overrides.fromSymbolId).toBe("sym-1");
    expect(overrides.fromTerminal).toBeUndefined();
    expect(overrides.wireCrossSection).toBe(2.5);
    expect(overrides.ferruleColor).toBeUndefined();
    expect(overrides.isFromTop).toBe(true);
    expect(overrides.routingMode).toBe("smart");
  });

  it("id musi byc niepustym stringiem (pusty id odrzuca sie automatycznie)", () => {
    expect(filterConnectionOverrides({ id: "valid" }).id).toBe("valid");
    expect(filterConnectionOverrides({ id: "" }).id).toBeUndefined();
    expect(filterConnectionOverrides({ id: "   " }).id).toBeUndefined(); // trim
    expect(filterConnectionOverrides({ id: 42 }).id).toBeUndefined();
    expect(filterConnectionOverrides({}).id).toBeUndefined();
  });

  it("filtruje punkty - tylko te z poprawnym x/y", () => {
    const raw = {
      points: [
        { x: 10, y: 20 },
        { x: "bad", y: 20 }, // pomin (x nie jest number)
        { x: 10 },           // pomin (brak y)
        null,                // pomin
        { x: 30, y: 40 },
      ],
    };

    const overrides = filterConnectionOverrides(raw);

    expect(overrides.points).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
  });

  it("points = [] (po filtracji) nie sa ustawiane w overrides", () => {
    const overrides = filterConnectionOverrides({
      points: [{ x: "bad", y: "bad" }],
    });

    expect(overrides.points).toBeUndefined();
  });

  it("kompatybilnosc z createDefaultConnection - laczenie wyniku daje poprawny ConnectionItem", () => {
    const raw = {
      id: "conn-x",
      fromSymbolId: "sym-a",
      toSymbolId: "sym-b",
      wireColor: "blue",
      wireCrossSection: 4,
      routingMode: "manhattan",
    };

    const conn = createDefaultConnection(filterConnectionOverrides(raw));

    expect(conn.id).toBe("conn-x");
    expect(conn.fromSymbolId).toBe("sym-a");
    expect(conn.toSymbolId).toBe("sym-b");
    expect(conn.wireColor).toBe("blue");
    expect(conn.wireCrossSection).toBe(4);
    expect(conn.routingMode).toBe("manhattan");
    // Dla pol ktorych nie bylo w raw - uzyte domyslne
    expect(conn.wireType).toBe("LgY");
    expect(conn.ferruleColor).toBe("white");
  });
});

describe("normalizeConnectionItems", () => {
  it("zwraca [] dla null/undefined/non-array", () => {
    expect(normalizeConnectionItems(null)).toEqual([]);
    expect(normalizeConnectionItems(undefined)).toEqual([]);
    expect(normalizeConnectionItems("string")).toEqual([]);
  });

  it("odrzuca polaczenia bez prawidlowego id", () => {
    const items = normalizeConnectionItems([
      { id: "good", fromSymbolId: "sym-1" },
      { fromSymbolId: "sym-1" }, // brak id - odrzuc
      { id: "" },                 // pusty id - odrzuc
      { id: 42 },                 // zly typ - odrzuc
      { id: "also-good" },
    ]);

    expect(items).toHaveLength(2);
    expect(items[0].id).toBe("good");
    expect(items[1].id).toBe("also-good");
  });

  it("odrzuca nieprawidlowe elementy (null, string, array)", () => {
    const items = normalizeConnectionItems([
      { id: "good" },
      null,
      "string",
      [],
      42,
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("good");
  });

  it("zachowuje wszystkie pola zgodne z ConnectionItem", () => {
    const items = normalizeConnectionItems([
      {
        id: "conn-1",
        fromSymbolId: "sym-1",
        fromTerminal: "2",
        toSymbolId: "sym-2",
        toTerminal: "1",
        wireColor: "blue",
        wireCrossSection: 4,
        ferruleColor: "red",
        routingMode: "manhattan",
        isFromTop: true,
        points: [{ x: 10, y: 20 }],
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "conn-1",
      fromSymbolId: "sym-1",
      toSymbolId: "sym-2",
      wireColor: "blue",
      wireCrossSection: 4,
      ferruleColor: "red",
      routingMode: "manhattan",
      isFromTop: true,
    });
    expect(items[0].points).toEqual([{ x: 10, y: 20 }]);
  });
});