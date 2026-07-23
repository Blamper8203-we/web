# Format pliku `.dinboard`

Kontrakt zapisu/odczytu projektu rozdzielnicy. Jedyny trwały format danych apki.

## ✅ Co (z kodu)

**Rozszerzenie i typ.** `.dinboard` (parser akceptuje też `.json`).
Domyślna nazwa: `zlecenie.dinboard`. Zawartość to **JSON**.
Źródło: [`src/lib/projectFile.ts:8-10`](../../src/lib/projectFile.ts).

**Bieżąca wersja schematu:** `WEB_PROJECT_SCHEMA_VERSION = 2`
([`projectFile.ts:10`](../../src/lib/projectFile.ts)).

**Kształt pliku** (`ProjectFileData`, [`projectFile.ts:13-33`](../../src/lib/projectFile.ts)):

| Pole | Typ | Uwaga |
|---|---|---|
| `metadata` | `ProjectMetadata \| null` | dane zlecenia (inwestor, adres…) |
| `symbols` | `SymbolItem[]` | aparaty na szynie |
| `connections?` | `ConnectionItem[]` | przewody |
| `version` | `string` | wersja aplikacji, która zapisała plik |
| `rail?` | `{ svg, width, height, rows, modulesPerRow, isVisible } \| null` | szyna DIN |
| `schemaVersion?` | `number` | wersja schematu danych (do migracji) |
| `appliedMigrations?` | `string[]` | migracje już zastosowane (skip idempotentnych) |

**Walidacja przy odczycie** ([`projectFile.ts:104-109`](../../src/lib/projectFile.ts)):
- `schemaVersion` musi być dodatnią liczbą całkowitą → inaczej `throw "Nieprawidlowe schemaVersion"`.
- `schemaVersion` **nowsza** niż `WEB_PROJECT_SCHEMA_VERSION` → `throw` (nie otwieramy
  plików z przyszłości — starszy build nie zna nowego schematu).

**Migracje** ([`projectFile.ts:217-218`](../../src/lib/projectFile.ts) +
[`projectMigrations.ts`](../../src/lib/projectMigrations.ts)):
- Jeśli `schemaVersion < WEB_PROJECT_SCHEMA_VERSION` → `migrateProjectData(...)`
  iteruje po rejestrze migracji `from → to`, krok po kroku.
- `appliedMigrations[]` pozwala pominąć migracje uniwersalne już zastosowane.
- Migracje mają testy round-trip (patrz `projectMigrations.test.ts`).

**Zasada:** dodajesz nowe pole do symbolu/połączenia → dodaj też **default w parserze**
i (jeśli zmienia semantykę) **migrację**. Rozjazd defaultów parser vs
`createDefault*` był realnym bugiem (patrz `zadania do naprawy.md`, PR-1.4).

## ❓ Dlaczego — brak pytań

To kontrakt techniczny, nie decyzja domenowa — „co" wystarcza. Jedyna rzecz warta
odnotowania: brak jawnego pola „magic"/sygnatury pliku (rozpoznanie po rozszerzeniu
+ strukturze JSON). Jeśli to świadome — ok; jeśli nie — rozważ dodanie markera typu.
