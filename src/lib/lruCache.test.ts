import { describe, expect, it } from "vitest";
import { setWithLruEviction, touchLruEntry } from "./lruCache";

describe("setWithLruEviction", () => {
  it("wyrzuca najstarszy wpis gdy rozmiar przekroczy maxSize", () => {
    const map = new Map<string, number>();
    setWithLruEviction(map, "a", 1, 3);
    setWithLruEviction(map, "b", 2, 3);
    setWithLruEviction(map, "c", 3, 3);
    expect(map.size).toBe(3);

    setWithLruEviction(map, "d", 4, 3);
    expect(map.size).toBe(3);
    expect(map.has("a")).toBe(false);
    expect(map.has("b")).toBe(true);
    expect(map.has("c")).toBe(true);
    expect(map.has("d")).toBe(true);
  });

  it("wyrzuca wiele wpisow jesli rozmiar skoczy daleko powyzej maxSize", () => {
    const map = new Map<string, number>();
    setWithLruEviction(map, "a", 1, 2);
    setWithLruEviction(map, "b", 2, 2);
    setWithLruEviction(map, "c", 3, 2);
    setWithLruEviction(map, "d", 4, 2);
    setWithLruEviction(map, "e", 5, 2);
    expect(map.size).toBe(2);
    expect(map.has("a")).toBe(false);
    expect(map.has("b")).toBe(false);
    expect(map.has("c")).toBe(false);
    expect(map.has("d")).toBe(true);
    expect(map.has("e")).toBe(true);
  });

  it("update istniejacego klucza zachowuje rozmiar i odswieza insertion order", () => {
    const map = new Map<string, number>();
    setWithLruEviction(map, "a", 1, 2);
    setWithLruEviction(map, "b", 2, 2);
    setWithLruEviction(map, "a", 11, 2);
    expect(map.size).toBe(2);
    expect(map.get("a")).toBe(11);
    // Po re-set "a" jest nowy, "b" jest najstarszy.
    setWithLruEviction(map, "c", 3, 2);
    expect(map.has("a")).toBe(true);
    expect(map.has("b")).toBe(false);
    expect(map.has("c")).toBe(true);
  });

  it("nie robi nic jesli maxSize jest 0 lub ujemne (degeneratywny przypadek)", () => {
    const map = new Map<string, number>();
    setWithLruEviction(map, "a", 1, 0);
    expect(map.size).toBe(0);
    setWithLruEviction(map, "b", 2, -1);
    expect(map.size).toBe(0);
  });

  it("nie wyrzuca jesli rozmiar jest ponizej maxSize", () => {
    const map = new Map<string, number>();
    setWithLruEviction(map, "a", 1, 10);
    setWithLruEviction(map, "b", 2, 10);
    expect(map.size).toBe(2);
    expect(map.has("a")).toBe(true);
    expect(map.has("b")).toBe(true);
  });
});

describe("touchLruEntry", () => {
  it("zwraca wartosc i przesuwa klucz na koniec insertion order", () => {
    const map = new Map<string, number>();
    map.set("a", 1);
    map.set("b", 2);
    map.set("c", 3);

    expect(touchLruEntry(map, "a")).toBe(1);
    expect(Array.from(map.keys())).toEqual(["b", "c", "a"]);
  });

  it("zwraca undefined dla brakujacego klucza bez modyfikacji mapy", () => {
    const map = new Map<string, number>();
    map.set("a", 1);
    expect(touchLruEntry(map, "missing")).toBeUndefined();
    expect(Array.from(map.keys())).toEqual(["a"]);
  });

  it("pozwala LRU eviction zachowac ostatnio uzywane wpisy", () => {
    // WHY: ten scenariusz jest przyczyna dla ktorego `touchLruEntry` istnieje.
    // Bez touch, setWithLruEviction wyzucilby "a" (najstarszy w insertion order),
    // mimo ze uzytkownik wlasnie go obejrzal. Z touch, "a" jest przesuwany na
    // koniec i "b" jest zamiast tego wyrzucany.
    const map = new Map<string, number>();
    setWithLruEviction(map, "a", 1, 2);
    setWithLruEviction(map, "b", 2, 2);
    setWithLruEviction(map, "c", 3, 2); // wyrzuc "a"

    expect(map.has("a")).toBe(false);
    expect(map.has("b")).toBe(true);
    expect(map.has("c")).toBe(true);

    // Ponowne uzycie "c" (symulacja: user wraca do tego samego preview)
    setWithLruEviction(map, "d", 4, 3); // size 3, brak eviction
    touchLruEntry(map, "b"); // "b" swiezy, "c" najstarszy
    setWithLruEviction(map, "e", 5, 3); // wyrzuc "c", nie "b"

    expect(map.has("b")).toBe(true);
    expect(map.has("c")).toBe(false);
    expect(map.has("d")).toBe(true);
    expect(map.has("e")).toBe(true);
  });
});
