// WHY: Migracje formatu pliku .dinboard (web-shape). Klient z wersją X otwiera
// plik zapisany w wersji < bieżącej — musi przejść łańcuch migracji bezgłośnie i
// bez utraty danych. To obszar wysokiego ryzyka (AGENTS.md): migracja zawsze
// DODAJE pola domyślne, nigdy nie usuwa i nie zmienia semantyki istniejących.
//
// `any` jest tu świadome: dane wejściowe to surowy JSON o nieznanym kształcie
// (różne wersje historyczne). Typowanie per-wersja żyłoby wewnątrz konkretnej
// funkcji migracji, nie w sygnaturze rejestru.
export type ProjectFileShape = Record<string, unknown>;
export type MigrationFunction = (data: ProjectFileShape) => ProjectFileShape;

// ----------------------------------------------------------------------------
// Wersjonowane migracje (Record<fromVersion, fn>) — używane przez migrateProjectData.
// Migracja[N] przekształca dane z wersji N na wersję N+1. Pusta dla bieżącego
// schematu (bazowego).
// ----------------------------------------------------------------------------
export const projectMigrations: Record<number, MigrationFunction> = {};

// ----------------------------------------------------------------------------
// Migration registry (string-ID, appliedMigrations marker)
//
// Dlaczego oba? Record<number, fn> jest ergonomic dla łańcucha wersji
// (schemaVersion v1 -> v2 -> v3) ale nie pozwala oznaczyć "ta migracja już
// została zastosowana". Marker `appliedMigrations: string[]` w pliku umożliwia
// pominięcie kosztownych/idempotentnych migracji na kolejnych otwarciach.
//
// Wersjonowane migracje nadal idą przez migrateProjectData (krok po kroku
// schemaVersion), a uniwersalne (universal: true) idą przez runMigrations
// i są zapisywane w appliedMigrations.
// ----------------------------------------------------------------------------
export type MigrationId = string;

export interface Migration {
  /** Stabilne ID używane w markerze `appliedMigrations`. NIGDY nie zmieniaj po wydaniu. */
  id: MigrationId;
  /** Opcjonalny zakres wersji schematu. Jeśli pominięty, migracja jest uniwersalna. */
  appliesFrom?: number;
  appliesTo?: number;
  /** Dla uniwersalnych: migracja uruchamiana przy każdym otwarciu dopóki nie zostanie zapisana w `appliedMigrations`. */
  universal?: boolean;
  /** Funkcja przekształcająca. Musi być idempotentna dla `universal: true`. */
  run: (data: ProjectFileShape) => ProjectFileShape;
}

export const MIGRATIONS: Migration[] = [];

/** Rejestruje migrację. Wywołanie z istniejącym ID nadpisuje wpis. */
export function registerMigration(migration: Migration): void {
  const idx = MIGRATIONS.findIndex((m) => m.id === migration.id);
  if (idx >= 0) {
    MIGRATIONS[idx] = migration;
  } else {
    MIGRATIONS.push(migration);
  }
}

export interface RunMigrationsResult {
  data: ProjectFileShape;
  appliedMigrations: string[];
  /** Migracje, które faktycznie zmieniły dane podczas tego wywołania. */
  applied: string[];
}

/**
 * Uruchamia migracje z rejestru, pomijając te już zapisane w `appliedMigrations`.
 *
 * Wersjonowane migracje (z `appliesFrom`/`appliesTo`) są pomijane jeśli
 * `schemaVersion` danych jest poza zakresem — służą tylko jako oznaczenie
 * kroków łańcucha `migrateProjectData`.
 *
 * Uniwersalne (`universal: true`) uruchamiane są niezależnie od schemaVersion.
 */
export function runMigrations(
  data: ProjectFileShape,
  appliedMigrations: readonly string[] = [],
): RunMigrationsResult {
  const applied = new Set(appliedMigrations);
  const newlyApplied: string[] = [];
  let current = data;

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;

    if (!migration.universal) {
      const schemaVersion = typeof current.schemaVersion === "number" ? current.schemaVersion : -1;
      if (migration.appliesFrom !== undefined && schemaVersion !== migration.appliesFrom) {
        continue;
      }
    }

    const result = migration.run(current);
    if (result !== current) {
      current = result;
    }
    newlyApplied.push(migration.id);
    applied.add(migration.id);
  }

  return {
    data: current,
    appliedMigrations: Array.from(applied),
    applied: newlyApplied,
  };
}

// ----------------------------------------------------------------------------
// Łańcuch migracji wersjonowanych (schemaVersion)
// ----------------------------------------------------------------------------
// WHY: Łańcuch migracji od currentVersion do targetVersion. Idempotentny gdy już
// na docelowej (lub nowszej) wersji. Każdy krok ustawia schemaVersion, dzięki czemu
// zapis po migracji ma poprawną wersję nawet jeśli dana migracja nie ruszyła treści.
//
// WHY constraint `T extends object` (a nie `ProjectFileShape`): wołający w
// projectFile.ts przekazuje `RawProjectFileData` — typ o nazwanych polach BEZ
// indeksowej sygnatury, który NIE spełnia `extends Record<string, unknown>`.
// `object` przyjmuje każdy typ obiektowy i zachowuje typ zwracany (T), więc
// przypisanie `parsed = migrateProjectData(parsed, ...)` kompiluje się bez zmian.
// Wewnątrz traktujemy dane jako ProjectFileShape (kontrolowane rzutowanie).
export function migrateProjectData<T extends object>(
  data: T,
  currentVersion: number,
  targetVersion: number,
): T {
  if (currentVersion >= targetVersion) {
    return data;
  }

  let migratedData = { ...data } as T & ProjectFileShape;

  // Krok przekształca z `fromVersion` na `fromVersion + 1`, aż osiągniemy cel.
  for (let fromVersion = currentVersion; fromVersion < targetVersion; fromVersion++) {
    const migration = projectMigrations[fromVersion];
    if (migration) {
      migratedData = { ...migratedData, ...migration(migratedData) } as T & ProjectFileShape;
    }
    (migratedData as { schemaVersion?: number }).schemaVersion = fromVersion + 1;
  }

  return migratedData;
}

// ----------------------------------------------------------------------------
// Implementacja migracji: legacy manual reference designations
//
// WHY (historyczny): starsze wersje pliku miały referenceDesignation zapisywane
// automatycznie przy każdym otwarciu. Po dodaniu `MANUAL_REFERENCE_DESIGNATION_KEY`
// parametr `true` jest wymagane żeby oznaczyć, że użytkownik chce zatrzymać
// swoje oznaczenie (i nie zostać nadpisanym przez auto-layout). Ta migracja
// skanuje istniejące symbole i oznacza te, których designation nie zgadza się
// z automatyczną — żeby nie były nadpisywane.
//
// `universal: true` zapewnia, że pliki v2 zapisane PRZED dodaniem markera
// `appliedMigrations` też przejdą tę migrację raz. Po zapisie z markerem
// kolejne otwarcia ją pomijają.
// ----------------------------------------------------------------------------
import type { SymbolItem } from "../types/symbolItem";
import { MANUAL_REFERENCE_DESIGNATION_KEY } from "../types/symbolItem";
import { buildSchematicLayout } from "./schematic/schematicLayoutEngine";

function cloneForAutomaticDesignationAnalysis(symbol: SymbolItem): SymbolItem {
  const parameters = { ...symbol.parameters };
  delete parameters[MANUAL_REFERENCE_DESIGNATION_KEY];

  return {
    ...symbol,
    referenceDesignation: "",
    parameters,
  };
}

function buildAutomaticDesignationMap(symbols: SymbolItem[]): Map<string, string> {
  const layout = buildSchematicLayout(symbols);
  const automaticDesignations = new Map<string, string>();

  for (const node of layout.nodes) {
    const designation = node.designation.trim();
    if (designation.length > 0) {
      automaticDesignations.set(node.id, designation);
    }
  }

  return automaticDesignations;
}

function migrateLegacyManualReferenceDesignations(symbols: SymbolItem[]): SymbolItem[] {
  if (symbols.length === 0) {
    return symbols;
  }

  const automaticDesignations = buildAutomaticDesignationMap(
    symbols.map(cloneForAutomaticDesignationAnalysis),
  );
  let changed = false;

  const migratedSymbols = symbols.map((symbol) => {
    const currentDesignation = symbol.referenceDesignation.trim();
    const isManualDesignation =
      symbol.parameters[MANUAL_REFERENCE_DESIGNATION_KEY]?.toLocaleLowerCase("pl-PL") === "true";

    if (currentDesignation.length === 0 || isManualDesignation) {
      return symbol;
    }

    const automaticDesignation = automaticDesignations.get(symbol.id);
    if (!automaticDesignation) {
      return symbol;
    }

    if (currentDesignation !== automaticDesignation) {
      changed = true;
      return {
        ...symbol,
        referenceDesignation: currentDesignation,
        parameters: {
          ...symbol.parameters,
          [MANUAL_REFERENCE_DESIGNATION_KEY]: "true",
        },
      };
    }

    return symbol;
  });

  return changed ? migratedSymbols : symbols;
}

registerMigration({
  id: "v1-to-v2:legacyReferenceDesignations",
  appliesFrom: 1,
  appliesTo: 2,
  universal: true,
  run: (data) => {
    if (!Array.isArray(data.symbols)) return data;
    const migrated = migrateLegacyManualReferenceDesignations(data.symbols as SymbolItem[]);
    return { ...data, symbols: migrated };
  },
});