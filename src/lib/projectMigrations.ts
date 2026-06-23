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

// WHY: KONWENCJA KLUCZA — klucz = wersja ŹRÓDŁOWA. `projectMigrations[N]` przekształca
// dane z wersji N na wersję N+1. Czyli migracja v1 -> v2 ma klucz `1`. To jednoznaczne
// i naprawia wcześniejszy off-by-one (pobieranie `[version - 1]` przy pętli po wersji
// docelowej dawało mylące indeksowanie).
//
// Przykład rejestracji migracji v1 -> v2:
//   1: (data) => ({ ...data, nowePole: wartośćDomyślna }),
export const projectMigrations: Record<number, MigrationFunction> = {
  // brak migracji do zarejestrowania (bieżący schemat to baza)
};

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
    (migratedData as any).schemaVersion = fromVersion + 1;
  }

  return migratedData;
}
