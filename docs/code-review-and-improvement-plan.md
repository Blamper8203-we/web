# DINBoard — przegląd kodu i plan ulepszeń

Data: 2026-06-22
Autor: GitLab Duo (przegląd na żądanie developera)
Zakres: ocena stanu repozytorium + plan krok po kroku co, gdzie i dlaczego poprawić.

> Ten dokument jest **planem**, nie zmianą kodu. Każdy krok wskazuje konkretne pliki
> i warstwę zgodnie z `AGENTS.md`. Kroki dotykające obszarów wysokiego ryzyka muszą
> przejść przez właściwego reina i zawierać test pinujący zachowanie.

---

## 1. Szczera ocena — co jest dobre

To nie jest demo. To dojrzały, świadomie zaprojektowany projekt inżynierski. Konkretnie:

- **Dyscyplina warstw (MVVM-ish) jest realna.** `components` → `hooks` → `lib` → `types`
  to nie tylko deklaracja w `AGENTS.md`, struktura katalogów faktycznie to odzwierciedla
  (`lib/` ma 12 podkatalogów domenowych, logika nie jest wciśnięta w komponenty).
- **Domena walidacji jest modelowa.** Reguły rozbite na pliki `val-001…val-009` z testem
  obok każdej reguły (`rules/val-00X-*.ts` + `.test.ts`). To wzorcowy sposób organizacji
  reguł inżynierskich — łatwo audytować, łatwo dodać kolejną.
- **Format pliku ma już walidację kształtu i migracje.** `projectFile.ts` zawiera
  `validateWebProjectShape`, `WEB_PROJECT_SCHEMA_VERSION = 2` oraz import
  `migrateProjectData` z `projectMigrations`. Czyli punkt #1 z roadmapy jest częściowo
  zrealizowany, nie od zera.
- **CI istnieje i jest sensowne.** `.github/workflows/ci.yml`: build + lint + unit testy +
  smoke pre-deploy, z labelem `skip-smoke`. Node przypięty przez `.nvmrc`.
- **Cross-platform jest przemyślane.** Tauri + Capacitor + PWA z jawnymi gałęziami
  `isNativePlatform()` i udokumentowanymi pułapkami (cache SW, ITP Safari, DnD polyfill).
- **Dokumentacja dla agentów/ludzi jest wybitna.** `AGENTS.md` + `.harness/` + roadmapa
  dystrybucji opisują obszary wysokiego ryzyka, pułapki i kontrakty. Mało który solo-projekt
  ma taki poziom onboardingu.

## 2. Szczera ocena — co budzi niepokój

Uczciwie, bez owijania:

- **Pliki-kontenery są realnym długiem technicznym.** `DinRailConnectionsCanvas.tsx` (94 KB),
  `MeasurementProtocolsWorkspacePage.tsx` (53 KB), `schematicLayoutEngine.ts` (34 KB),
  `moduleTerminals.ts` (33 KB), `App.tsx` (655 linii) mieszają zbyt wiele odpowiedzialności.
  To nie jest "do wyrzucenia", ale każda zmiana w nich jest droga i ryzykowna.
- **Niespójność wersji Node.** `package.json` ma `engines.node: 24.x`, a CI i `AGENTS.md`
  mówią o Node 22 / `.nvmrc`. `AGENTS.md` opisuje lekcję z 2026-06-21 o bumpie `.nvmrc`
  na 24.12.0. Komentarz w CI wciąż mówi "Node 22 LTS". To dokładnie ten rodzaj dryfu, który
  psuje lockfile (opisany w `AGENTS.md` pkt 8). Wymaga jednego źródła prawdy.
- **Lint jest warnings-only z ~35 ostrzeżeniami.** CI nie failuje na nowych warningach,
  więc liczba może rosnąć niezauważona. To erozja jakości w tle.
- **28 użyć `any` i 68 `console.*`** (wg `AGENTS.md`). Niskie jak na rozmiar, ale bez
  bramki w lincie będą rosnąć.
- **Brak testów E2E.** Cała siatka bezpieczeństwa to testy jednostkowe (baseline 249).
  Przy dystrybucji publicznej krytyczne flow (otwórz → edytuj → eksport PDF) nie są pinowane
  end-to-end.
- **Stan w `App.tsx` inicjalizowany surowym `JSON.parse` z `try/catch {}`** (np. klucz
  `"dinboard.connections"` zahardkodowany inline, połykane wyjątki). To działa, ale obchodzi
  warstwę `lib/` i normalizatory — niespójne z resztą kodu, gdzie wszystko idzie przez
  normalizery typów.

## 3. Plan krok po kroku — uporządkowany wg ryzyka i wartości

Kolejność: najpierw tanie bramki jakości (chronią przyszłe zmiany), potem dług w plikach-kontenerach,
na końcu większe inicjatywy z roadmapy.

### Krok 0 — Ujednolicić wersję Node (1 dzień, `developer`)

**Problem:** `package.json engines.node: 24.x` vs komentarz CI "Node 22 LTS" vs `.nvmrc`.

**Gdzie:**
- `.nvmrc` — ustalić jedną wartość (zgodnie z lekcją z 2026-06-21 prawdopodobnie `24.12.0`).
- `.github/workflows/ci.yml` — poprawić mylący komentarz "Node 22 LTS".
- `package.json` — `engines.node` zgodne z `.nvmrc`.

**Done:** `node -v` == `.nvmrc` == `engines.node`; komentarz CI prawdziwy; `npm ci` zielone.

### Krok 1 — Zacisnąć bramkę lintu (1-2 dni, `developer` + `code-reviewer`)

**Problem:** lint warnings-only, ~35 warningów, brak ochrony przed nowymi.

**Gdzie:**
- Naprawić istniejące warningi (`npm run lint:fix`, reszta ręcznie).
- `.github/workflows/ci.yml` — po dojściu do zera zmienić na `npm run lint -- --max-warnings 0`.
- Reguła zespołowa: nowy `any` wymaga komentarza `// WHY:` (już w `AGENTS.md`, dodać regułę ESLint jeśli się da).

**Done:** `npm run lint` = 0 warningów; CI failuje na nowym warningu.

### Krok 2 — Uszczelnić inicjalizację stanu w App.tsx (2-3 dni, `developer` + `project-io-expert`)

**Problem:** surowe `JSON.parse` + `catch {}` + zahardkodowany klucz `"dinboard.connections"`
w `App.tsx`, omijające warstwę `lib/`.

**Gdzie:**
- `src/App.tsx` — wyciągnąć logikę odczytu z `localStorage` do `lib/`.
- `src/lib/appHelpers.ts` — dodać stały klucz `CONNECTIONS_STORAGE_KEY` obok istniejących `SYMBOLS_STORAGE_KEY`.
- `src/types/connectionItem.ts` — dodać `normalizeConnectionItems()` analogicznie do `normalizeSymbolItems`.
- nowy: `src/lib/loadInitialState.ts` (czysta funkcja: raw storage → znormalizowany stan).

**Done:** `App.tsx` nie zawiera `JSON.parse` ani magicznych stringów; połknięcia wyjątków
logują do konsoli (diagnostyka dla developera); test jednostkowy `loadInitialState` (uszkodzony JSON → pusty stan, nie crash).

### Krok 3 — Dokończyć wersjonowanie i migracje pliku (1-2 tyg, `project-io-expert`) [roadmapa MUST #1]

**Problem:** istnieje `WEB_PROJECT_SCHEMA_VERSION = 2` i `migrateProjectData`, ale roadmapa
wymaga jawnego łańcucha migracji i pełnego pokrycia round-trip.

**Gdzie:**
- `src/lib/projectFile.ts` — potwierdzić, że `load` czyta `schemaVersion` i woła łańcuch do bieżącej.
- `src/lib/projectMigrations.ts` — rozbić na registry: `migrations/index.ts` + `migrations/vN-to-vM.ts`.
- `src/types/symbolItem.ts` — każda zmiana kształtu = migracja dodająca pola domyślne, nigdy usuwająca.

**Done:** round-trip dla kombinacji nowy→nowy, stary→nowy, nowy→stary; migracja nigdy nie
gubi danych; coverage migracji ≥ 90%.

### Krok 4 — Przyjazny error boundary + komunikaty domenowe (1 tyg, `developer` + `electrical-expert`) [roadmapa MUST #2]

**Gdzie:**
- `src/components/AppErrorBoundary.tsx` / `.css` — recovery UI z min. 1 akcją ("Odblokuj projekt", "Cofnij ostatnią zmianę", "Restart sesji").
- `src/lib/validation/**` — komunikaty po polsku w języku elektryki, z akcją.
- Przegląd każdego `catch` w `src/lib/` — żaden nie połyka błędu w ciszy w UI.

**Done:** brak stack trace w UI; każdy błąd ma komunikat domenowy + akcję; log do konsoli zostaje.

### Krok 5 — Rozbić pliki-kontenery (iteracyjnie, per rein właściciel) [dług techniczny]

**Zasada:** to realne refaktory, nie "przy okazji". Każdy plik osobno, z przeglądem `// WHY:`
każdej sekcji i charakteryzacyjnym testem PRZED przeniesieniem.

**Kolejność (od największego ryzyka/wartości):**
1. `src/components/DinRailConnectionsCanvas.tsx` (94 KB) → wydzielić: warstwę canvas, warstwę połączeń, UI, stan. `canvas-expert`.
2. `src/lib/schematic/schematicLayoutEngine.ts` (34 KB) → layout / geometria / reguły per-element. `canvas-expert`.
3. `src/lib/modules/moduleTerminals.ts` (33 KB) → detekcja terminali / layout pinów / przypadki "Blok rozdzielczy". `canvas-expert`.
4. `src/components/MeasurementProtocolsWorkspacePage.tsx` (53 KB) → UI / stan formularza / kompozycja tabel. `pdf-expert`.
5. `src/App.tsx` (655 linii) → wydzielić routing arkuszy i warstwę dialogów do osobnych hooków/komponentów. `developer`.

**Done per plik:** zachowanie przed/po identyczne (charakteryzacyjny test zielony); brak nowej
mechaniki dispatchu dla "Blok rozdzielczy" (mirror istniejącego wzorca string + komentarz).

### Krok 6 — Testy E2E core flow (1 tyg, `tester`) [roadmapa SHOULD #11]

**Gdzie:**
- nowy: `e2e/`, `playwright.config.ts`.
- `.github/workflows/ci.yml` — dodać job E2E przed release.

**Scenariusze:** (1) otwórz → dodaj obwód → zmień amperaż → eksport PDF; (2) tryb terenowy →
edytuj → autosave → reload; (3) round-trip pliku między platformami.

**Done:** min. 3 scenariusze; E2E w CI; raport HTML/JSON w artefaktach.

### Krok 7 — Wersja + Changelog + About (2-3 dni, `developer`) [roadmapa MUST #6]

**Gdzie:**
- nowy: `CHANGELOG.md` (Keep a Changelog).
- nowy: `src/components/AboutDialog.tsx` (wersja z `package.json`).
- `src-tauri/Cargo.toml` — wersja po stronie Rust spójna.

**Done:** wersja widoczna w menu i w stopce landing page; "Co nowego" renderuje changelog.

---

## 4. Czego NIE robić (świadome decyzje)

- **Nie refaktorować string-dispatchu "Blok rozdzielczy" / "Listwy zaciskowe" / "Złącza"**
  na enum przy okazji. To osobny PR po rozmowie z developerem (`AGENTS.md` pkt 2).
- **Nie usuwać `package-lock.json` aby "naprawić" lockfile.** Przełączać Node przez nvm,
  nie kasować lockfile (`AGENTS.md` pkt 8).
- **Nie dodawać nowych reguł `runtimeCaching` w PWA bez potrzeby** — zaskoczą użytkownika.
- **Nie zmniejszać liczby testów.** Baseline 249; każdy feature dokłada testy.

## 5. Sugerowana sekwencja (zależności)

```
Krok 0 (Node)  ─┐
Krok 1 (Lint)  ─┼─ tanie bramki jakości, robić najpierw
Krok 2 (App init) ─┘
        ↓
Krok 3 (Migracje) ── chroni dane klienta przed każdym kolejnym featurem
        ↓
Krok 4 (Error boundary) ── wszechobecny przy każdej nowej funkcji
        ↓
Krok 5 (Pliki-kontenery) ── iteracyjnie, równolegle do reszty, per rein
        ↓
Krok 6 (E2E)  ─┐
Krok 7 (Wersja/Changelog) ─┴─ przed v1.0 release
```
