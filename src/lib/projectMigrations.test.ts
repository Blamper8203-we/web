import { describe, it, expect, vi, afterEach } from "vitest";
import {
  migrateProjectData,
  projectMigrations,
  type ProjectFileShape,
} from "./projectMigrations";

// WHY: projectMigrations to obszar wysokiego ryzyka (format pliku .dinboard).
// Te testy pinują kontrakt migracji: idempotentność, łańcuch wielokrokowy,
// konwencję klucza (= wersja źródłowa) oraz niegubienie istniejących danych.
//
// Rejestr `projectMigrations` jest globalny; testy mutujące go MUSZĄ sprzątać
// po sobie, żeby nie wyciekać stanu między testami.

afterEach(() => {
  for (const key of Object.keys(projectMigrations)) {
    delete projectMigrations[Number(key)];
  }
  vi.restoreAllMocks();
});

describe("migrateProjectData", () => {
  it("jest no-op gdy current === target", () => {
    const data: ProjectFileShape = { schemaVersion: 2, foo: "bar" };
    expect(migrateProjectData(data, 2, 2)).toBe(data);
  });

  it("jest no-op gdy current > target (nowszy plik)", () => {
    const data: ProjectFileShape = { schemaVersion: 3 };
    expect(migrateProjectData(data, 3, 2)).toBe(data);
  });

  it("ustawia schemaVersion na docelową nawet bez zarejestrowanej migracji", () => {
    const result = migrateProjectData({ schemaVersion: 1 }, 1, 2);
    expect(result.schemaVersion).toBe(2);
  });

  it("nie mutuje obiektu wejściowego", () => {
    const data: ProjectFileShape = { schemaVersion: 1, keep: "me" };
    const result = migrateProjectData(data, 1, 2);
    expect(data.schemaVersion).toBe(1); // wejście nietknięte
    expect(result).not.toBe(data);
    expect(result.keep).toBe("me"); // dane zachowane
  });

  it("używa klucza = wersja źródłowa (v1 -> v2 ma klucz 1)", () => {
    const migration = vi.fn((data: ProjectFileShape) => ({ ...data, added: true }));
    projectMigrations[1] = migration;

    const result = migrateProjectData({ schemaVersion: 1 }, 1, 2);

    expect(migration).toHaveBeenCalledTimes(1);
    expect(result.added).toBe(true);
    expect(result.schemaVersion).toBe(2);
  });

  it("wykonuje łańcuch wielokrokowy w kolejności (v1 -> v2 -> v3)", () => {
    const order: number[] = [];
    projectMigrations[1] = (data) => {
      order.push(1);
      return { ...data, step1: true };
    };
    projectMigrations[2] = (data) => {
      order.push(2);
      return { ...data, step2: true };
    };

    const result = migrateProjectData({ schemaVersion: 1 }, 1, 3);

    expect(order).toEqual([1, 2]);
    expect(result.step1).toBe(true);
    expect(result.step2).toBe(true);
    expect(result.schemaVersion).toBe(3);
  });

  it("pomija brakujące kroki migracji ale wciąż podbija schemaVersion", () => {
    projectMigrations[2] = (data) => ({ ...data, onlyStep2: true });
    // brak migracji dla klucza 1

    const result = migrateProjectData({ schemaVersion: 1 }, 1, 3);

    expect(result.onlyStep2).toBe(true);
    expect(result.schemaVersion).toBe(3);
  });
});
