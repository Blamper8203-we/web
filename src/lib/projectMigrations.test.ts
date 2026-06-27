import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import {
  migrateProjectData,
  projectMigrations,
  runMigrations,
  MIGRATIONS,
  registerMigration,
  type ProjectFileShape,
} from "./projectMigrations";

// WHY: projectMigrations to obszar wysokiego ryzyka (format pliku .dinboard).
// Te testy pinują kontrakt migracji: idempotentność, łańcuch wielokrokowy,
// konwencję klucza (= wersja źródłowa) oraz niegubienie istniejących danych.
//
// Rejestry `projectMigrations` i `MIGRATIONS` są globalne; testy mutujące je
// MUSZĄ sprzątać po sobie, żeby nie wyciekać stanu między testami.

let initialMigrations: typeof MIGRATIONS;

beforeAll(() => {
  initialMigrations = [...MIGRATIONS];
});

afterEach(() => {
  for (const key of Object.keys(projectMigrations)) {
    delete projectMigrations[Number(key)];
  }
  // Przywracamy rejestr do stanu z chwili załadowania modułu — produkcyjna
  // migracja legacy reference designations wraca, testowe znikają.
  MIGRATIONS.length = 0;
  MIGRATIONS.push(...initialMigrations);
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

    const result = migrateProjectData({ schemaVersion: 1 }, 1, 2) as any;

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

    const result = migrateProjectData({ schemaVersion: 1 }, 1, 3) as any;

    expect(order).toEqual([1, 2]);
    expect(result.step1).toBe(true);
    expect(result.step2).toBe(true);
    expect(result.schemaVersion).toBe(3);
  });

  it("pomija brakujące kroki migracji ale wciąż podbija schemaVersion", () => {
    projectMigrations[2] = (data) => ({ ...data, onlyStep2: true });
    // brak migracji dla klucza 1

    const result = migrateProjectData({ schemaVersion: 1 }, 1, 3) as any;

    expect(result.onlyStep2).toBe(true);
    expect(result.schemaVersion).toBe(3);
  });
});

describe("runMigrations (registry z appliedMigrations)", () => {
  it("zwraca dane bez zmian gdy nie ma zarejestrowanych migracji do uruchomienia", () => {
    const data: ProjectFileShape = { foo: "bar" };
    const result = runMigrations(data, ["v1-to-v2:legacyReferenceDesignations"]);
    expect(result.data).toBe(data);
    expect(result.appliedMigrations).toEqual(["v1-to-v2:legacyReferenceDesignations"]);
    expect(result.applied).toEqual([]);
  });

  it("uruchamia uniwersalną migrację i dodaje ID do appliedMigrations", () => {
    const migration = vi.fn((data: ProjectFileShape) => ({ ...data, applied: true }));
    registerMigration({ id: "test:universal", universal: true, run: migration });

    const result = runMigrations({}, ["v1-to-v2:legacyReferenceDesignations"]);

    expect(migration).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ applied: true });
    expect(result.applied).toEqual(["test:universal"]);
    expect(result.appliedMigrations).toEqual([
      "v1-to-v2:legacyReferenceDesignations",
      "test:universal",
    ]);
  });

  it("pomija migrację której ID jest już w appliedMigrations", () => {
    const migration = vi.fn((data: ProjectFileShape) => ({ ...data, applied: true }));
    registerMigration({ id: "test:already-applied", universal: true, run: migration });

    const result = runMigrations(
      {},
      ["test:already-applied", "v1-to-v2:legacyReferenceDesignations"],
    );

    expect(migration).not.toHaveBeenCalled();
    expect(result.data).toEqual({});
    expect(result.applied).toEqual([]);
    expect(result.appliedMigrations).toEqual([
      "test:already-applied",
      "v1-to-v2:legacyReferenceDesignations",
    ]);
  });

  it("wersjonowana migracja nie uruchamia się gdy schemaVersion poza zakresem", () => {
    const migration = vi.fn((data: ProjectFileShape) => ({ ...data, versioned: true }));
    registerMigration({
      id: "test:versioned",
      appliesFrom: 1,
      appliesTo: 2,
      run: migration,
    });

    // appliedMigrations zawiera produkcyjną migrację żeby ją pominąć i skupić
    // się na test:versioned.
    const result = runMigrations(
      { schemaVersion: 5 },
      ["v1-to-v2:legacyReferenceDesignations"],
    );

    expect(migration).not.toHaveBeenCalled();
    expect(result.data).toEqual({ schemaVersion: 5 });
    expect(result.applied).toEqual([]);
  });

  it("wersjonowana migracja uruchamia się gdy schemaVersion = appliesFrom", () => {
    const migration = vi.fn((data: ProjectFileShape) => ({ ...data, versioned: true }));
    registerMigration({
      id: "test:v1-to-v2",
      appliesFrom: 1,
      appliesTo: 2,
      run: migration,
    });

    const result = runMigrations(
      { schemaVersion: 1 },
      ["v1-to-v2:legacyReferenceDesignations"],
    );

    expect(migration).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ schemaVersion: 1, versioned: true });
    expect(result.appliedMigrations).toContain("test:v1-to-v2");
  });

  it("uniwersalna migracja uruchamia się niezależnie od schemaVersion", () => {
    const migration = vi.fn((data: ProjectFileShape) => ({ ...data, universalRan: true }));
    registerMigration({ id: "test:always", universal: true, run: migration });

    const result = runMigrations(
      { schemaVersion: 999 },
      ["v1-to-v2:legacyReferenceDesignations"],
    );

    expect(migration).toHaveBeenCalledTimes(1);
    expect(result.applied).toContain("test:always");
  });

  it("registerMigration z istniejącym ID nadpisuje wpis", () => {
    registerMigration({
      id: "test:overwrite",
      universal: true,
      run: (data) => ({ ...data, v: 1 }),
    });
    registerMigration({
      id: "test:overwrite",
      universal: true,
      run: (data) => ({ ...data, v: 2 }),
    });

    const beforeCount = MIGRATIONS.filter((m) => m.id === "test:overwrite").length;
    expect(beforeCount).toBe(1);

    const result = runMigrations({}, ["v1-to-v2:legacyReferenceDesignations"]);
    expect(result.data).toMatchObject({ v: 2 });
  });

  it("zachowuje dane nieobjęte migracją (dane nie są gubione)", () => {
    const migration = vi.fn((data: ProjectFileShape) => ({ ...data, migrated: true }));
    registerMigration({ id: "test:preserve", universal: true, run: migration });

    const result = runMigrations(
      { keep: "me", other: 42 },
      ["v1-to-v2:legacyReferenceDesignations"],
    );

    expect(result.data).toMatchObject({ keep: "me", other: 42, migrated: true });
  });

  it("nie mutuje obiektu wejściowego", () => {
    const migration = vi.fn((data: ProjectFileShape) => ({ ...data, newField: true }));
    registerMigration({ id: "test:no-mutate", universal: true, run: migration });

    const data: ProjectFileShape = { original: true };
    const result = runMigrations(data, ["v1-to-v2:legacyReferenceDesignations"]);

    expect(data).toEqual({ original: true });
    expect(result.data).not.toBe(data);
    expect(result.data).toMatchObject({ original: true, newField: true });
  });

  it("produkcyjna migracja legacyReferenceDesignations jest zarejestrowana", () => {
    // Po inicjalizacji modułu MIGRATIONS powinien zawierać co najmniej
    // migrację legacy reference designations. To pinuje istnienie tej migracji
    // w rejestrze (gwarantuje że ktoś przypadkiem jej nie usunieł).
    const legacy = MIGRATIONS.find((m) => m.id === "v1-to-v2:legacyReferenceDesignations");
    expect(legacy).toBeDefined();
    expect(legacy?.universal).toBe(true);
    expect(legacy?.appliesFrom).toBe(1);
    expect(legacy?.appliesTo).toBe(2);
  });
});
