# Audyt kodu DINBoard Web — podsumowanie

**Data:** 2026-06-18
**Zakres:** synteza 5 audytów read-only (electrical, canvas, pdf, project-io, code-discipline), przeprowadzonych 2026-06-17
**Metoda:** statyczna analiza kodu + testów. Testy NIE zostały uruchomione.
**Właściciel syntezy:** Mavis (general)
**Właściciele napraw:** electrical-expert, canvas-expert, pdf-expert, project-io-expert, developer (per ustalenie)

---

## 1. Statystyki

### 1.1. Zestawienie z poszczególnych raportów

Poniższe liczby policzono z treści raportów (nagłówki `### ID-...`). Raporty mają też tabele podsumowujące w stopce — drobne różnice między nimi wynikają z tego, że niektóre raporty numerowały D-1..D-N lub P-1..P-N niespójnie.

| Raport | Critical | High | Medium | Low | Duplikaty / martwy | Suma |
|---|---|---|---|---|---|---|
| `audit-electrical.md` | 3 | 5 | 7 | 5 | 7 (D-1..D-7) | 27 |
| `audit-canvas.md` | 4 | 9 | 9 | 9 | 14 (D-1..D-14) | 45 |
| `audit-pdf.md` | 3 | 8 | 10 | 6 | 0 | 27 |
| `audit-project-io.md` | 5 | 8 | 11 | 6 | 0 | 30 |
| `audit-code-discipline.md` | 3 | 7 | 11 | 9 | 0 | 30 |
| **Suma surowa** | **18** | **37** | **48** | **35** | **21** | **159** |

> Uwaga o `audit-pdf.md`: nagłówek raportu mówi o 28 ustaleniach (3 P0 + 8 P1 + 11 P2 + 6 P3), ale ciało raportu zawiera tylko 10 pozycji P2 (pozycje 12–21). Pozycja 21 to „no action" notatka o `moduleCatalog.ts:827` wykrytym przy okazji. W tej syntezie używam liczby z ciała raportu: **27 ustaleń PDF** (w tym 1 notatka „no action").

### 1.2. Po deduplikacji cross-report

Prawdziwe duplikaty (ten sam problem opisany w dwóch lub więcej raportach) to:

| Cross-ref | Temat | Raporty |
|---|---|---|
| SYN-X1 | `WIRE_THICKNESS_MAP` / `WIRE_COLORS_MAP` zduplikowane w 4 plikach (2 pliki kanoniczne + 2 inline kopie) | canvas C-2 / D-1 + code-discipline P2-2 |
| SYN-X2 | ~~Cztery funkcje (`findConnectedComponent`, `getHotspotPhase`, `checkConnectionWarning`, `getSymbolAssetUrl`) zduplikowane między `connectionsLogic.ts` a `canvasHelpers.ts` z różnymi implementacjami~~ **ZAMKNIĘTE 2026-06-30: verified, single source w `canvasHelpers.ts`.** Grep `export function (findConnectedComponent|getHotspotPhase|checkConnectionWarning|getSymbolAssetUrl)` w `connectionsLogic.ts` → 0 trafień, w `canvasHelpers.ts` → 4 trafienia (linie 27, 79, 107, 156). Wszyscy konsumenci importują z `canvasHelpers`: `DinRailConnectionsCanvas.tsx:64-65`, `useDinRailForegroundSvgs.ts:3`, `DinRailRenderedSymbols.tsx:3`. Brak implementacji — duplikacja usunięta przed obecnym HEAD. | code-discipline P1-1 + canvas D-3 + canvas D-4 |
| SYN-X3 | `App.tsx:670-681` cicho połyka błędy parsowania pliku (landing page) — ta sama linia kodu opisana z perspektywy UX (project-io) i error-handling convention (code-discipline) | project-io P0-1 + code-discipline P2-9 |

**3 prawdziwe cross-report duplikaty.** Reszta nakładających się ustaleń to raczej „ten sam subsystem" (np. canvas M-1 o useSvgTerminalsPreloader + electrical D-1 o 5+ implementacjach helpersów identyfikacyjnych) niż ten sam problem — traktuję je jako **related** (patrz sekcja 1.4).

### 1.3. Unikalne ustalenia (po deduplikacji)

| Severity | Unikalne ustalenia |
|---|---|
| Critical (P0) | 18 − 0 = **18** |
| High (P1) | 37 − 2 (SYN-X2, SYN-X3 częściowo) ≈ **35** |
| Medium (P2) | 48 − 0 = **48** |
| Low (P3) | 35 − 0 = **35** |
| Duplikaty / martwy (D) | 21 − 0 = **21** |
| **Razem** | **157** |

### 1.4. Related ustalenia (ten sam subsystem, ale różne problemy)

To NIE są duplikaty — raczej grupy powiązanych tematów:

| Grupa | Ustalenia | Temat |
|---|---|---|
| Helpersy identyfikacji modułów (5+ implementacji) | electrical D-1 + electrical M-3, M-4, M-5, L-2 + canvas M-1 + code-discipline P1-1 | `isGroupHeadSymbol`, `isMainBreaker`, `isRcdDevice`, `isTerminalOrConnectorSymbol` itp. w wielu plikach z różnym case-fold i różnymi tokenami |
| Martwy kod (kilka artefaktów) | canvas C-3 / D-11 (useDinRailInteraction hook) + canvas H-7 / D-10 (Pixi canvas za feature flag) + code-discipline P0-2, P0-3 (martwe dialogi) + code-discipline P2-1 (fixtures/demoData) + project-io P0-2 (Tauri commands) + pdf P2-16 (PdfLabelDocument) | różne martwe artefakty, różne pliki, różne przyczyny |
| Martwe obliczenia w PDF | pdf P0-3 (dummy `<View>`) + pdf P1-5 (validateProject 2×) + pdf P2-19 (buildCircuitRowsFromSymbols 2×) + project-io P1-4 (handleConnectionsChange) | różne warstwy duplikują to samo obliczenie |
| Snapshot / historia | project-io P1-4 (inline snapshot 6 miejsc) + project-io P1-5 (metadata nie w historii) + project-io P1-8 (dirty flag po undo) + project-io P2-6 | wszystkie o `useSymbolHistory` i `SymbolHistorySnapshot`, ale różne aspekty |
| Circuit rows flow | pdf P1-6 (3 miejsca) + pdf P1-8 (effectiveMetadata) + pdf P1-9 (numerators) | ten sam flow danych, różne problemy w różnych plikach |
| `useDialogState` martwe stany | code-discipline P0-2 (useDialogState) + code-discipline P0-3 (useImportedModules) + code-discipline P1-5 (Capacitor guard brak) | ten sam pattern, dwa pliki |

### 1.5. Martwy kod — największe artefakty (rozmiar + znaczenie)

| Lokalizacja | Rozmiar | Znaczenie |
|---|---|---|
| `src/hooks/useDinRailInteraction.ts` + `useDinRailInteraction.test.ts` | 332 + 213 LOC | hook niepodpięty do `DinRailCanvasPixi`; testy sprawdzają martwy kod (canvas C-3 / D-11) |
| `src/lib/modules/moduleCatalog.ts:78-274` (legacy `moduleEntries`) | 197 LOC | wyłączone flagą `INCLUDE_LEGACY_BUILT_IN_MODULES = false` (canvas D-12) |
| `src/lib/export/PdfLabelDocument.tsx` | ~8 KB | dead code + CDN font (pdf P2-16) |
| `src/fixtures/demoData.ts` | 127 LOC | zero konsumentów (code-discipline P2-1) |
| `src/components/DinRailCanvasPixi.tsx:412-584` (Pixi canvas) | ~70 LOC | za `shouldRenderPixiLabels=false` permanentnie (canvas H-7 / D-10) |
| `src/hooks/useDialogState.ts:22-23, 33-34, 45-46, 53-54, 71-74, 88-89, 100-101, 110-111` | 12 LOC | martwe stany + `closeAllDialogs` (code-discipline P0-2) |
| `src/hooks/useImportedModules.ts:41-42, 144, 175-177` | 5 LOC | martwe stany (code-discipline P0-3) |
| `src/components/ConnectionsRightPanel.tsx` | 19 LOC | pusty stub ignorujący 5 propsów (code-discipline P0-1) |
| `src-tauri/src/lib.rs:14-17, 53-56` (Tauri commands) | 2 funkcje Rust | martwe + security hazard (project-io P0-2) |
| `src/lib/projectFile.ts:667-679` (`loadProjectFromPath`) | 12 LOC | martwa (project-io P0-2) |

**~850 LOC martwego kodu**, z czego największy to `useDinRailInteraction` + jego testy (~545 LOC).

### 1.6. Najczęstsze wzorce duplikacji (cross-cutting)

| Wzorzec | Pliki | Cross-ref |
|---|---|---|
| `WIRE_THICKNESS_MAP` / `WIRE_COLORS_MAP` | 4 pliki (3 inline kopie + 1 kanoniczna) | **SYN-X1** |
| ~~`findConnectedComponent` / `getHotspotPhase` / `checkConnectionWarning` / `getSymbolAssetUrl`~~ **SYN-X2 closed (2026-06-30) — single source w `canvasHelpers.ts`.** | `connectionsLogic.ts` vs `canvasHelpers.ts` | **SYN-X2 closed** |
| Helpersy identyfikacyjne modułów | 5+ plików z różnymi implementacjami | electrical D-1 + canvas M-1 + related |
| `normalizeSinglePhase` | ~~3 pliki (phaseBalanceSuggestions, phaseImbalanceInsights, validationHelpers)~~ **ZAMKNIĘTE 2026-06-29: verified re-export, not duplication.** Jedyna implementacja: `phaseDistributionCalculator.ts:450`. Re-eksport (bez kopiowania ciała): `validationHelpers.ts:59`. Pozostałe 2 pliki importują z różnych ścieżek (`phaseDistributionCalculator` bezpośrednio lub `validationHelpers` przez re-eksport) — to jest convenience import, nie duplikacja logiki. Brak implementacji. | — | — |
| `isGroupHeadSymbol` | `domain/symbolGrouping.ts` (czysta) + `phaseDistributionCalculator.ts:416-427` (string-match) | electrical C-1, H-1, L-2 |
| ~~`DeviceKind` / `CircuitDeviceKind` (camelCase vs kebab-case)~~ **DONE 2026-06-30: verified, single source.** | `symbolItem.ts:1-9` vs `circuitRow.ts:1-9` | electrical C-3, M-2 |
| `SymbolHistorySnapshot` inline | 6 call sites (App.tsx, useProjectActions) | project-io P1-4, P2-6 |
| `buildCircuitRowsFromSymbols(symbols)` | 3 miejsca | pdf P1-6, P1-8, P2-19 |
| `chunkArray` / `chunkRows` (różna empty-handling) | `pdfHelpers.ts` + `measurementProtocolHelpers.ts` | pdf P2-12, P2-24 |
| Stałe `UNIFIED_ROWS_PER_PAGE` itd. (×4) | `pdfHelpers.ts` + `MeasurementProtocolsWorkspacePage.tsx` | pdf P2-13 |
| `parseChecklistItems` / `serializeChecklistItems` | `pdfDocumentation.ts` + `PdfDocumentationPage.tsx` | pdf P2-14 |
| `firstNonEmpty` | `circuitRows.ts` + `measurementProtocols.ts` (+ inne) | pdf P2-15 |
| `useDebouncedPersist` 250ms | `useDebouncedPersist.ts` (arbitrary) | project-io P1-6 |

---

## 2. Top 10 do natychmiastowej naprawy (krytyczne + high)

Lista uszeregowana od najbardziej pilnych (cicha utrata danych / security / domena inżynierska). Każde ustalenie ma: ID syntezy, ID w raportach źródłowych, minimalny fix, scope (1 plik / 2-3 pliki / subsystem), ownera.

### 1. `projectFile.ts` — brak migration registry (project-io P0-3 + P1-2 + P2-9)

**Subsystem:** project I/O
**Pliki:** `src/lib/projectFile.ts:353-444` + nowy `src/lib/migrations/`
**Scope:** subsystem (5-6 plików, ~200 LOC)
**Owner:** project-io-expert + developer
**Wpływ:** Cicha mutacja symboli przy każdym otwarciu pliku, gdy `buildSchematicLayout` zwróci inną wartość. Brak rejestru = dodanie drugiej migracji to copy-paste. Brak testu izolowanego dla `migrateLegacyManualReferenceDesignations` (P1-2). `parseProjectFileContent` 50 LOC (P2-9) robi shape disambiguation + migrację + parsing.

**Minimalny fix:** Nowy `src/lib/migrations/registry.ts` z `MIGRATIONS: Array<{from, to, run}>`. Parser iteruje po rejestrze. Marker `appliedMigrations: string[]` w pliku.

~~**ZAMKNIĘTE 2026-06-30: verified.** Registry zaimplementowany w `src/lib/projectMigrations.ts` (237 LOC) — commity `8fcd3cc` (szkielet + usunięcie martwego `loadProjectFromPath`), `7aa2e7f` (off-by-one fix + konwencja klucza), `140eead` + `c583c9d` (generyk w `migrateProjectData`), `1ceb06f` (feature: registry + `appliedMigrations` marker), `d4078e6` (po nim: usunięcie gałęzi Avalonia). Exports: `Migration` interface, `MIGRATIONS[]`, `registerMigration()`, `runMigrations()` (skip-if-applied, universal vs version-scoped), `migrateProjectData()` (łańcuch wersji). Zarejestrowana produkcyjna migracja `v1-to-v2:legacyReferenceDesignations` (universal: true). Testy w `projectMigrations.test.ts` (248 LOC): idempotentność, wieloetapowy łańcuch, niegubienie danych, beforeAll/afterEach cleanup rejestru. `projectFile.ts` używa obu funkcji (linie 218 i 235), `appliedMigrations` w `ProjectFileData` type, czytane przy otwarciu, zapisywane przy zapisie. Brak implementacji — closure historyczne.~~

---

### 2. `WIRE_THICKNESS_MAP` 4 kopie z rozbieżnymi wartościami (canvas C-2 / D-1 + code-discipline P2-2) — **SYN-X1**

**Subsystem:** canvas / connections
**Pliki:** `lib/connections/connectionsLogic.ts:28`, `components/canvasLayers/DinRailWiresLayer.tsx:15`, `lib/dinRailCanvas/constants.ts:28`, `lib/export/dinRailSnapshotService.ts:158`
**Scope:** 4 pliki + 1 nowy (`lib/canvas/wireStyle.ts`), ~50 LOC delta
**Owner:** canvas-expert + developer
**Wpływ:** Wartość 16 mm²: 60 w 3 kopiach, 54 w jednej. View ≠ eksport — naruszony immutable contract z `canvas-expert/agent.md`. Dodatkowo `WIRE_COLORS_MAP` zduplikowane 2×.

**Minimalny fix:** Nowy `lib/canvas/wireStyle.ts` jako jedyne źródło prawdy. Wszystkie 4 importują. Wartość 60 vs 54 wymaga decyzji usera (3 vs 1 głos). Test: `expect(WIRE_THICKNESS_MAP[16]).toBe(<chosen>)` + test, że 4 konsumenci importują ten sam obiekt.

> **Pytanie do usera (Q1):** czy `WIRE_THICKNESS_MAP[16] = 60` (3 kopie) czy 54 (1 kopia)?

---

### 3. `parseProjectFileContent` — `schemaVersion: 2` bez `version` cicho traktowany jako Avalonia (project-io P0-4 + P1-3)

**Subsystem:** project I/O
**Pliki:** `src/lib/projectFile.ts:64-120, 395-444`
**Scope:** 1-2 pliki + 1 test, ~30 LOC + nowe testy
**Owner:** project-io-expert
**Wpływ:** Plik web shape z `schemaVersion: 2` ale bez `version` traktowany jako Avalonia → `metadata` i `rail` cicho tracone. `validateWebProjectShape` nie wymaga `version`.

**Minimalny fix:** Shape disambiguation najpierw po `schemaVersion` (number), potem fallback do `version` (string). `validateWebProjectShape`: `version` jako required key. Testy: `schemaVersion: 0/-1/float`, `schemaVersion: 2` bez `version`.

> **Zależność:** powinno być po SYN-#1 (migration registry), bo oba dotykają `parseProjectFileContent`.

---

### 4. `isGroupHeadSymbol` — dwa różne implementacje, FR cicho przesuwa fazy (electrical C-1 + H-1 + L-2)

**Subsystem:** electrical domain
**Pliki:** `src/lib/domain/symbolGrouping.ts:12-14` + `src/lib/phaseDistribution/phaseDistributionCalculator.ts:416-427`
**Scope:** 2-3 pliki + 1 test, ~50 LOC
**Owner:** electrical-expert + developer
**Wpływ:** `autoBalancePhases` traktuje FR (rozłącznik główny) jako head grupy RCD przez string-match w `phaseDistributionCalculator` — cicho przesuwa fazy MCB-ów. Testy `domain/symbolGrouping.test.ts` pilnują starej wersji.

**Minimalny fix:** Jedna implementacja w `domain/symbolGrouping.ts` (czysta, dispatch na `deviceKind`). `phaseDistributionCalculator.ts` importuje. Jeśli FR ma być traktowany jako head w bilansie — alias `isGroupHeadSymbolIncludingFr`. Test „FR phase preserved through autoBalancePhases" w `phaseDistributionCalculator.test.ts`.

> **Pytanie do usera (Q2):** czy FR ma być headem grupy w bilansie faz, czy nie?

---

### 5. `parseProjectFileContent` — connection defaults ręcznie rozjeżdżają się z `createDefaultConnection` (project-io P0-5 + P2-3)

**Subsystem:** project I/O
**Pliki:** `src/lib/projectFile.ts:416-434` + `src/types/connectionItem.ts:31-45`
**Scope:** 1-2 pliki + test, ~40 LOC
**Owner:** project-io-expert
**Wpływ:** Parser defaults: `routingMode: "manhattan"`. `createDefaultConnection`: `routingMode: "orthogonal"`. Brak defaultu `ferruleColor` w parserze. Pliki zapisane przed dodaniem pola `ferruleColor` dostaną inny default niż świeże.

**Minimalny fix:** Parser per item: `createDefaultConnection({...rawItem})` zamiast ręcznych defaultów. Analogicznie dla `SymbolItem` (P2-3).

~~**ZAMKNIĘTE 2026-06-30: verified.** Refactor wykonany w commitach `ee1d8bf` (scentralizowany `filterConnectionOverrides`) + `92cd04f` (fix: filter zachowuje `fromDirection`/`toDirection`/`customRadius`). Parser w `projectFile.ts:247` używa `createDefaultConnection(filterConnectionOverrides(conn))` — single source. `createDefaultConnection` ma `routingMode: "orthogonal"`, `ferruleColor: "white"` (linie 49-50 `connectionItem.ts`). `filterConnectionOverrides` (linie 73-119) ma type guard dla każdego pola ConnectionItem łącznie z `ferruleColor` (linia 91), `routingMode` (92), `customRadius` (97), `fromDirection` (100-101), `toDirection` (103-104), `points` (106-116). Krytyczny invariant udokumentowany w `connectionItem.ts:55-72` z listą kroków dla nowych pól. Testy `connectionItem.test.ts` (273 LOC) pinują: `routingMode: "orthogonal"` default (linia 19), `ferruleColor: "white"` default (linie 18, 34, 126), filter type guards (linie 47-104), `normalizeConnectionItems` round-trip dla `customRadius`/`fromDirection`/`toDirection` (linie 201-272 z WHY komentarzem). Testy `projectFile.test.ts:8-48` pinują round-trip preserve dla wszystkich pól. Symbol path też naprawiony: parser w `projectFile.ts:166-180` używa `normalizeSymbolItems`. Brak implementacji — closure historyczne.

**FYI (poza scope, nierobione):** `createDefaultConnection.routingMode: "orthogonal"` vs `DEFAULT_WIRE_SETTINGS.routingMode: "manhattan"` (`loadInitialState.ts:39`) + runtime UI defaults w `DinRailConnectionsCanvas.tsx:102`, `AppWorkspaceCanvas.tsx:158` — to NIE jest bug, to dwa różne konteksty (file load vs UI). Pliki zapisane z "manhattan" są preserve'owane. Stare pliki bez `routingMode` dostaną "orthogonal" z parsera. Decyzja produktowa: czy chcesz zunifikować na jeden default. Nieruszałem bo to dotyka file format contract.~~

---

### 6. `App.tsx:670-681` — ciche połykanie błędów parsowania pliku z landing page (project-io P0-1 + code-discipline P2-9) — **SYN-X3**

**Subsystem:** project I/O + UI shell
**Pliki:** `src/App.tsx:670-681`
**Scope:** 1 plik, ~10 LOC delta
**Owner:** developer
**Wpływ:** User double-clicks corrupt `.dinboard` z welcome page → dialog się zamyka, strona bez zmian, **brak komunikatu o błędzie**. In-app ścieżka (`useProjectActions.handleOpenProject`) pokazuje `Błąd: ...`. Również: `console.error` zamiast `reportRuntimeError` (code-discipline P2-9).

**Minimalny fix:** Albo przekierować przez `useProjectActions.handleOpenProject` (zachować spójność), albo dodać `showTemporaryStatus` + `reportRuntimeError` w catch.

---

### 7. `ConnectionsRightPanel.tsx` — pusty stub ignorujący 5 propsów (code-discipline P0-1)

**Subsystem:** UI / sheet1_connections
**Pliki:** `src/components/ConnectionsRightPanel.tsx`, `src/components/AppRightPanel.tsx:167-174`
**Scope:** 1-2 pliki
**Owner:** developer
**Wpływ:** Użytkownik wchodzący w zakładkę „Rozdzielnica połączenia" widzi pusty prawy panel. Lewy panel (`ConnectionsLeftPanel.tsx`) dostarcza edycję, ale prawy nic nie robi.

**Minimalny fix:** Zdecydować: (A) zaimplementować brakującą funkcjonalność (lista connection items + edycja), albo (B) usunąć komponent + import i zostać z single-pane.

> **Pytanie do usera (Q3):** opcja A (implementacja) czy B (usunięcie)? ~~**ZAMKNIĘTE 2026-06-30: wybrano B (usunięcie).** Plik `ConnectionsRightPanel.tsx` (19 LOC stub ignorujący 5 propsów) usunięty; brak importów/referencji w `src/` (grep 0 trafień w `*.ts,*.tsx,*.css`). `AppRightPanel.tsx` ma 4 taby (Zasilanie/Bilans/Walidacja/Edycja) — brak zakładki „Połączenia", prawy panel dla connections nigdy nie istniał w produkcie. `ConnectionsLeftPanel.tsx` (359 LOC) sam ogarnia konfigurację kabli (kolory, przekroje, ferrytki, routing). Testy 980/980 zielone. Brak implementacji — Q3 historyczne.~~

---

### 8. `useDialogState` martwe stany o złych typach (code-discipline P0-2 + P1-5 + P3-1 + P3-9)

**Subsystem:** UI / dialog state
**Pliki:** `src/hooks/useDialogState.ts:22-23, 33-34, 45-46, 53-54, 71-74, 88-89, 100-101, 110-111, 79`
**Scope:** 1 plik
**Owner:** developer
**Wpływ:** `useDialogState` definiuje `paletteContextMenu` i `pendingPaletteRemoval` o złych typach (różnych od `usePaletteActions`). App.tsx ich nie używa. Back button Capacitor dla tych dialogów nie działa. `closeAllDialogs` nigdy nie używany. `backListener.then(...)` bez `.catch()`.

**Minimalny fix:** Usunąć martwe stany, `closeAllDialogs`, dodać `if (!Capacitor.isNativePlatform()) return;` w useEffect, dodać `.catch(() => {})` na `backListener.then`. Testy dla `useDialogState` (P2-8 code-discipline).

~~**ZAMKNIĘTE 2026-06-30: verified.** Plik ma 98 LOC, 5 aktywnych stanów (`isRcdManagerOpen`, `isHelpOpen`, `svgImportDialogOpen`, `importedModulesManagerOpen`, `unsavedChangesActionType`), żadnych `paletteContextMenu` / `pendingPaletteRemoval` / `closeAllDialogs`. Wszystkie 5 są w `return` (linie 77-88), w `stateRef` dla backButton handlera (linie 26-32), w deps arrays (linie 42-48, 90-96). `paletteContextMenu` i `pendingPaletteRemoval` żyją wyłącznie w `usePaletteActions.ts:68, 75` (single source). Guard `if (!Capacitor.isNativePlatform()) return;` w useEffect (linia 52). `.catch(() => {})` na `backListener.then` (linia 70). Brak implementacji — closure historyczne.~~

---

### 9. `useImportedModules` martwe stany duplikujące `useDialogState` (code-discipline P0-3)

**Subsystem:** UI / dialog state
**Pliki:** `src/hooks/useImportedModules.ts:41-42, 144, 175-177`
**Scope:** 1 plik
**Owner:** developer
**Wpływ:** `svgImportDialogOpen` i `importedModulesManagerOpen` zdefiniowane lokalnie, ale App.tsx używa wersji z `useDialogState`. Wywołanie `setSvgImportDialogOpen(false)` w `handleSvgImportCommit:144` wygląda jak bug fix — nic nie robi w UI.

**Minimalny fix:** Usunąć stany + setter w `handleSvgImportCommit`. Logika zamykania dialogu już jest w App.tsx po stronie konsumenta.

~~**ZAMKNIĘTE 2026-06-30: verified.** Plik ma 178 LOC, 5 aktywnych stanów hooka (`importedModules`, `discoveredModules`, `hiddenPaletteTemplateIds`, `hasSyncedCatalogStorage`, `activePaletteGroupTitle`), żadnych `svgImportDialogOpen` / `importedModulesManagerOpen` lokalnie. `handleSvgImportCommit` (linie 134-149) nie ma już `setSvgImportDialogOpen` — bug fix przez usunięcie setterra. Otwieranie/zamykanie dialogów idzie przez `useDialogState` konsumowane w `AppWorkspace.tsx:307-308, 457-460`. Brak implementacji — closure historyczne.~~

---

### 10. PDF — brakujące strony w trybie "separate" (pdf P0-1) + martwe obliczenia (pdf P0-3)

**Subsystem:** PDF export
**Pliki:** `src/lib/export/PdfProtocolDocument.tsx:41-88, 109-112`, `src/lib/export/pdfExportService.ts:37-41`
**Scope:** 2-3 pliki (albo nowe komponenty PDF)
**Owner:** pdf-expert
**Wpływ:** W trybie "separate" PDF renderuje title + RCD, **pomija** continuity/loop/insulation (komponenty PDF nie istnieją — zweryfikowane grepem). `groupedCircuits`/`phaseDistribution`/`validationResult` obliczane (14 reguł × iteracja) i wrzucane w `<View style={{display: 'none'}}>` z tautologią.

**Minimalny fix:**
- Opcja A: Zaimplementować `PdfContinuityPage`, `PdfLoopPage`, `PdfInsulationPage` w `src/lib/export/pdfPages/` mirrorując `PdfRcdTablePage` (~300 LOC).
- Opcja B: Usunąć `"separate"` enum + 4 sub-protokoly z modelu danych (~30 LOC).

> **Pytanie do usera (Q4):** opcja A (implementacja) czy B (drop sub-protokoły)?

---

## 3. Plan napraw w kolejności (z zależnościami)

Graf zależności — węzły z `→` muszą być przed; węzły na tym samym poziomie mogą iść równolegle.

### Warstwa 0 — Fundament (czyste usunięcia, security)

| ID | Temat | Severity | Owner | Zależności |
|---|---|---|---|---|
| 0a | `read_project_file` / `write_project_file` + `loadProjectFromPath` (martwy kod Tauri) | project-io P0-2 | project-io-expert | izolowane |
| 0b | ~~`useDialogState` martwe stany (Top 10 #8)~~ **DONE — patrz Top 10 #8 closure.** | code-discipline P0-2 + P1-5 + P3-1 + P3-9 | developer | — |
| 0c | ~~`useImportedModules` martwe stany (Top 10 #9)~~ **DONE — patrz Top 10 #9 closure.** | code-discipline P0-3 | developer | — |
| 0d | ~~`ConnectionsRightPanel` pusty stub (Top 10 #7)~~ **DONE — patrz Q3 closure.** | code-discipline P0-1 | developer | — |

~~**Blokada 0d:** wymaga Q3 (A/B).~~ **Zniesiona 2026-06-30 — Q3 zamknięte (Wariant B), plik usunięty.**

### Warstwa 1 — Kontrakty domenowe (typ + model + migracje)

| ID | Temat | Severity | Owner | Zależności |
|---|---|---|---|---|
| 1a | Migration registry (Top 10 #1) | project-io P0-3 + P1-2 + P2-9 | project-io-expert | izolowane |
| 1b | Avalonia disambiguation (Top 10 #3) | project-io P0-4 + P1-3 | project-io-expert | wymaga 1a |
| 1c | ~~`DeviceKind` / `CircuitDeviceKind` unifikacja (electrical C-3 + M-2)~~ **DONE — patrz cross-cutting pattern row + PR-1.3 closure.** | electrical C-3 + M-2 | electrical-expert + developer | — |
| 1d | Connection parser defaults (Top 10 #5) | project-io P0-5 + P2-3 | project-io-expert | izolowane |

**Warstwa 1 musi być PRZED wszystkimi fixami dotykającymi tych samych plików.**

### Warstwa 2 — Izolowane poprawki (po ustaleniu kontraktów)

| ID | Temat | Severity | Owner | Zależności |
|---|---|---|---|---|
| 2a | `WIRE_THICKNESS_MAP` unify (Top 10 #2) | canvas C-2 / D-1 + code-discipline P2-2 — **SYN-X1** | canvas-expert + developer | wymaga Q1 |
| 2b | `isGroupHeadSymbol` unify (Top 10 #4) | electrical C-1 + H-1 + L-2 | electrical-expert + developer | wymaga Q2 |
| 2c | Landing page error (Top 10 #6) | project-io P0-1 + code-discipline P2-9 — **SYN-X3** | developer | izolowane |
| 2d | Martwy Tauri commands (Warstwa 0a) | project-io P0-2 | project-io-expert | izolowane |
| 2e | `normalizeSinglePhase` unify | electrical C-2 / D-2 | developer | izolowane |
| 2f | Martwe dialogi useDialogState | code-discipline P0-2 + P1-5 | developer | izolowane |
| 2g | Martwe import state | code-discipline P0-3 | developer | izolowane |
| 2h | Canvas C-1 (literówka MCB `rozłącznik` vs `rozłacznik`) | canvas C-1 / D-13 | canvas-expert + developer | izolowane |
| 2i | Canvas C-4 (wheel `stopPropagation` + touch-action) | canvas C-4 | canvas-expert | izolowane |
| 2j | PDF: brakujące strony + martwe obliczenia (Top 10 #10) | pdf P0-1 + P0-3 | pdf-expert | wymaga Q4 |
| 2k | `App.tsx` import order (po `loadUiTheme`) | code-discipline P1-7 | developer | izolowane |
| 2l | Pozostałe electrical H-2, H-3, H-4, M-1, M-6, L-1, L-3, L-5 | electrical various | electrical-expert | izolowane (per finding) |

### Warstwa 3 — Duplikaty helperów (po ustaleniu źródeł w Warstwie 1-2)

| ID | Temat | Severity | Owner | Zależności |
|---|---|---|---|---|
| 3a | 5+ implementacji helpersów identyfikacji modułów (electrical D-1, M-3, M-4, M-5, L-2 + canvas M-1) | various | developer + electrical-expert | wymaga 1c, 2b |
| 3b | 4 funkcje w `connectionsLogic.ts` vs `canvasHelpers.ts` (Top 10 + canvas D-3, D-4 — **SYN-X2**) | code-discipline P1-1 + canvas D-3, D-4 | developer | wymaga 2a |
| 3c | `computeDisplayProtection` itd. z `types/symbolItem.ts` do `lib/domain/` | code-discipline P1-3 | developer | wymaga 1c |
| 3d | Canvas geometry/snap/render duplikaty (canvas D-2, D-5, D-6, D-7, D-8, D-9) | canvas various | canvas-expert | izolowane |
| 3e | PDF: `chunkArray`/`chunkRows`, stałe, `parseChecklistItems`, `firstNonEmpty` (pdf P2-12..P2-15, P2-24) | pdf various | pdf-expert | izolowane |
| 3f | `SymbolHistorySnapshot` helper (project-io P1-4, P2-6) | project-io P1-4 + P2-6 | project-io-expert | izolowane |

### Warstwa 4 — Refaktory i porządki (w miarę czasu)

| ID | Temat | Severity | Owner | Zależności |
|---|---|---|---|---|
| 4a | Canvas C-3 (useDinRailInteraction merge) | canvas C-3 / D-11 | canvas-expert + developer | izolowane (wymaga code review) |
| 4b | Canvas H-7 (Pixi dead + lazy import) | canvas H-7 / D-10 | canvas-expert + developer | wymaga Q5 |
| 4c | Canvas H-1, H-4, H-6 (performance) | canvas H-1, H-4, H-6 | canvas-expert | izolowane |
| 4d | Canvas H-8 (snapshot service wire routing) | canvas H-8 | canvas-expert | izolowane |
| 4e | PDF: `validateProject` dedup, `circuitRows` threading (pdf P1-5, P1-6, P1-8) | pdf various | pdf-expert | wymaga 1a |
| 4f | PDF: filename consistency (pdf P1-7) | pdf P1-7 | pdf-expert | izolowane |
| 4g | Project-io P1-5 (metadata w historii) | project-io P1-5 | project-io-expert | izolowane |
| 4h | Project-io P1-8 (dirty flag po undo) | project-io P1-8 | project-io-expert | izolowane |
| 4i | Tester: brakujące testy (code-discipline P2-8) | code-discipline P2-8 | tester | izolowane |

### Warstwa 5 — Polish (P2/P3 cleanup)

Batch: wszystkie P2/P3 z wszystkich audytów, pogrupowane per plik.

### Pytania do usera (ZANIM zacznie się praca)

| # | Pytanie | Blokuje | Owner |
|---|---|---|---|
| Q1 | ~~`WIRE_THICKNESS_MAP[16] = 60` (3 kopie) czy 54 (1 kopia)?~~ **ZAMKNIĘTE 2026-06-29: verified, single source of truth 60.** Jedyna kanoniczna kopia to `src/lib/connections/connectionsLogic.ts:26-33`. `src/lib/dinRailCanvas/constants.ts:29` re-eksportuje (`export { WIRE_THICKNESS_MAP } from "../connections/connectionsLogic"`). Wszystkie inne pliki (`dinRailSvgRenderer.ts`, `wirePathGenerator.ts`, `DinRailConnectionWires.tsx`, `DinRailDrawingPreview.tsx`, `DinRailFerrulesGroup.tsx`, `dinRailSnapshotService.ts`) importują z constants lub bezpośrednio z connectionsLogic. Wartość 16: 60, inne: 1.5→35, 2.5→40, 4→45, 6→50, 10→55. Test `geometry.test.ts:204` pilnuje monotoniczności (16 > 10). Brak implementacji — Q1 historyczne. | — | — |
| Q2 | ~~FR (rozłącznik główny) — head grupy w bilansie czy nie?~~ **ZAMKNIĘTE 2026-06-29: verified non-issue.** `isGroupHeadSymbol` (`src/lib/domain/symbolGrouping.ts:12-14`) sprawdza wyłącznie `deviceKind === "rcd"`; FR ma `deviceKind === "fr"` i nie wchodzi do `rcdMap` w `autoBalancePhases` (`phaseDistributionCalculator.ts:166`). FR jest transparentny w bilansie: ma phase `L1+L2+L3`, więc `isSinglePhase(fr)` zwraca `false` i trafia do `addDistributedWeightToPhaseLoads` zamiast być przesuwany. MCB pod FR-em mają niezależne fazy. Stan obecny = Wariant A (FR transparentny), zgodny z rekomendacją z audytu. Brak implementacji. | — | — |
| Q3 | ~~`ConnectionsRightPanel` — implementacja (A) czy usunięcie (B)?~~ **ZAMKNIĘTE 2026-06-30: verified, wybrano B (usunięcie).** Plik `ConnectionsRightPanel.tsx` (19 LOC pusty stub ignorujący 5 propsów) usunięty; brak importów/referencji w `src/` (grep 0 trafień). `AppRightPanel.tsx` ma 4 taby (Zasilanie/Bilans/Walidacja/Edycja) — brak zakładki „Połączenia", prawy panel dla connections nigdy nie istniał w produkcie. `ConnectionsLeftPanel.tsx` (359 LOC) sam ogarnia konfigurację kabli (kolory, przekroje, ferrytki, routing). Testy 980/980 zielone. Brak implementacji — Q3 historyczne. | — | — |
| Q4 | ~~PDF „separate" — implementacja brakujących stron (A) czy drop (B)?~~ **ZAMKNIĘTE 2026-06-29: verified non-issue.** Tryb „separate" nie istnieje w obecnym kodzie (grep `separate\|Continuity\|Loop\|Insulation` w `src/lib/export/**` → 0 trafień poza komentarzem „Loop columns" w UnifiedTablePage). PdfProtocolDocument renderuje title + summary + (opcjonalnie) documentation content + circuit list + unified table + RCD table + schematic + din-rail. Brak martwych obliczeń wrzucanych w `<View display: none>` — grep nie potwierdza istnienia tego wzorca. AUDIT patrzył na commit, w którym ten feature był planowany/eksperymentalny; usunięty przed obecnym HEAD. Brak implementacji. | — | — |
| Q5 | ~~Pixi canvas — lazy import (A) czy usunięcie (B)?~~ **ZAMKNIĘTE 2026-06-29: verified, oba warianty zrobione.** Pixi canvas został usunięty 2026-06-28 (commit `bc5b32e` per memory, patrz też `useDinRailPixiApp.ts:1-13` WHY komentarz). Lazy import jest też zaimplementowany — `AppWorkspaceCanvas.tsx:20` ma `await import("./DinRailCanvasPixi")`. Jest regression guard `useDinRailPixiApp.test.ts` który PILNUJE że Pixi nie wróci (testuje że brak `import pixi.js` w source). Brak implementacji — feature domknięty dawniej. | — | — |
| Q6 | ~~UI dla brakujących pól protokołów (A) czy drop z modelu (B)?~~ **ZAMKNIĘTE 2026-06-29 (commit `9c5c4be`): UI w modelu (sekcje `documentation*`), strona `PdfDocumentationContentPage` renderuje wypełnione sekcje (pomija puste).** 7 opcjonalnych pól (`documentationEquipmentList`, `documentationCableSelection`, `documentationTechnicalCalculations`, `documentationLegendAndSymbols`, `documentationTechnicalDescription`, `documentationShockProtection`, `documentationAcceptanceConditions`) — teraz renderowane w PDF. Brak dedykowanego UI input (Q6 wariant A „UI dla pól"), ale pola są dostępne przez `metadata.measurementsProtocols`/podobny model i helper `hasDocumentationContent()`. Rozszerzenie UI to osobna robota — poza scope PDF. | — | — |

---

## 4. Sugerowane PR-y (grupy zmian)

Każdy PR dotyka jednego subsystemu (z wyjątkami oznaczonymi gwiazdką). Tam, gdzie zależności są twarde — zaznaczone `← wymaga PR-X`.

### Faza 0 — quick wins (1-2 dni)

| PR | Temat | Pliki | Severity | Scope |
|---|---|---|---|---|
| PR-0.1 | Martwy Tauri + `loadProjectFromPath` (Warstwa 0a) | 3 pliki (Rust + TS) | project-io P0-2 | 30 LOC usunięte |
| ~~PR-0.2~~ | ~~Martwe dialogi w `useDialogState` (Warstwa 0b)~~ **DONE poza PR-em (Top 10 #8 closure).** | 0 plików | code-discipline P0-2 + P1-5 + P3-1 + P3-9 | — |
| ~~PR-0.3~~ | ~~Martwe stany w `useImportedModules` (Warstwa 0c)~~ **DONE poza PR-em (Top 10 #9 closure).** | 0 plików | code-discipline P0-3 | — |
| ~~PR-0.4~~ | ~~`ConnectionsRightPanel` (Warstwa 0d)~~ **SKIP — zrobione poza PR-em (Q3 closure, Wariant B).** | 0 plików | code-discipline P0-1 | — |

### Faza 1 — kontrakty (1-2 tygodnie)

| PR | Temat | Pliki | Severity | Zależności |
|---|---|---|---|---|
| ~~PR-1.1~~ | ~~Migration registry (Warstwa 1a)~~ **DONE poza planem (commity `8fcd3cc`..`1ceb06f` + `d4078e6`).** Patrz closure przy Top 10 #1. | ~~5-6 plików~~ 2 pliki | project-io P0-3 + P1-2 + P2-9 | — |
| PR-1.2 | Avalonia disambiguation (Warstwa 1b) | 1-2 pliki | project-io P0-4 + P1-3 | ← wymaga PR-1.1 |
| ~~PR-1.3~~ | ~~`DeviceKind` / `CircuitDeviceKind` unify (Warstwa 1c)~~ **DONE poza planem (commity `d004ee2` consolidate + `2101911` usunięcie aliasu).** `circuitRow.ts:1, 6` importuje `DeviceKind` z `symbolItem.ts`. `toCircuitDeviceKind` w `circuitRows.ts:28` to funkcja zwracająca `CircuitRow["deviceKind"]` (czyli `DeviceKind`), nie osobny typ. `isKnownCircuitDeviceKind` w `symbolItem.ts:265` to też funkcja (predicate). Grep `CircuitDeviceKind` w `src/`: 4 trafienia, wszystkie to funkcje (nie type alias). Brak implementacji — closure historyczne. | 0 plików | electrical C-3 + M-2 | — |
| ~~PR-1.4~~ | ~~Connection parser defaults (Warstwa 1d)~~ **DONE poza planem (commity `ee1d8bf` + `92cd04f`).** Patrz closure przy Top 10 #5. | 0 plików | project-io P0-5 + P2-3 | — |

### Faza 2 — izolowane poprawki (równolegle, 2-3 tygodnie)

| PR | Temat | Pliki | Severity | Zależności |
|---|---|---|---|---|
| PR-2.1 | `WIRE_THICKNESS_MAP` unify (Warstwa 2a) — **SYN-X1** | 4+1 plik | canvas C-2 + code-discipline P2-2 | wymaga Q1 |
| PR-2.2 | `isGroupHeadSymbol` unify (Warstwa 2b) | 2-3 pliki | electrical C-1 + H-1 + L-2 | wymaga Q2 |
| PR-2.3 | Landing page error (Warstwa 2c) — **SYN-X3** | 1 plik | project-io P0-1 + code-discipline P2-9 | izolowane |
| PR-2.4 | `normalizeSinglePhase` unify (Warstwa 2e) | 4 pliki | electrical C-2 / D-2 | izolowane |
| PR-2.5 | Canvas C-1 (literówka MCB) (Warstwa 2h) | 1 plik + filesystem | canvas C-1 / D-13 | izolowane |
| PR-2.6 | Canvas C-4 (wheel stopPropagation + touch-action) (Warstwa 2i) | 2 pliki | canvas C-4 | izolowane |
| PR-2.7 | PDF missing pages + dead computations (Warstwa 2j) | 2-3 pliki LUB 1-2 | pdf P0-1 + P0-3 | wymaga Q4 |
| PR-2.8 | App.tsx import order (Warstwa 2k) | 1 plik | code-discipline P1-7 | izolowane |
| PR-2.9 | Electrical residual (H-2, H-3, H-4, M-1, M-6, L-1, L-3, L-5) (Warstwa 2l) | 4-5 plików | electrical various | izolowane (można rozbić na 7-8 mniejszych PR-ów per finding) |

### Faza 3 — duplikaty helperów (po Fazie 1, 2-3 tygodnie)

| PR | Temat | Pliki | Severity | Zależności |
|---|---|---|---|---|
| PR-3.1 | 5+ implementacji helpersów identyfikacji (Warstwa 3a) | 6 plików | electrical D-1 + related | ← wymaga PR-1.3, PR-2.2 |
| ~~PR-3.2~~ | ~~4 funkcje `connectionsLogic` vs `canvasHelpers` (Warstwa 3b)~~ **SKIP — SYN-X2 closed, single source w `canvasHelpers.ts`.** | 0 plików | code-discipline P1-1 + canvas D-3, D-4 | — |
| PR-3.3 | `computeDisplayProtection` z `types/` do `lib/` (Warstwa 3c) | 2-3 pliki | code-discipline P1-3 | ← wymaga PR-1.3 |
| PR-3.4 | Canvas geometry/snap/render dups (Warstwa 3d) | 6-8 plików | canvas D-2, D-5..D-9 | izolowane |
| PR-3.5 | PDF dups (Warstwa 3e) | 5-6 plików | pdf P2-12..P2-15, P2-24 | izolowane |
| PR-3.6 | `SymbolHistorySnapshot` helper (Warstwa 3f) | 4-5 plików | project-io P1-4, P2-6 | izolowane |

### Faza 4 — refaktory (1-2 miesiące)

| PR | Temat | Pliki | Severity | Zależności |
|---|---|---|---|---|
| PR-4.1 | Canvas C-3 (useDinRailInteraction merge) | 1 duży plik + hook | canvas C-3 / D-11 | wymaga code review |
| PR-4.2 | Canvas H-7 (Pixi dead + lazy import) | 1 plik | canvas H-7 / D-10 | wymaga Q5 |
| PR-4.3 | Canvas performance (H-1, H-4, H-6) | 3 pliki | canvas H-1, H-4, H-6 | izolowane |
| PR-4.4 | Canvas H-8 (snapshot wire routing) | 1 plik | canvas H-8 | izolowane |
| PR-4.5 | PDF: `validateProject` dedup + `circuitRows` threading | 4-5 plików | pdf P1-5, P1-6, P1-8 | ← wymaga PR-1.1 |
| PR-4.6 | PDF: filename consistency | 2 pliki | pdf P1-7 | izolowane |
| PR-4.7 | Project-io: metadata w historii + dirty flag | 2 pliki | project-io P1-5, P1-8 | izolowane |
| PR-4.8 | Tester: brakujące testy | 10+ test files | code-discipline P2-8 | izolowane |

### Faza 5 — polish (po Fazach 1-4)

Batch P2/P3: `devLog` cleanup, type narrowing dla pozostałych `any`, error handling convention (`reportRuntimeError`), i18n, itd.

### Reguły dla PR

1. **Jeden commit tematyczny** (lub logicznie powiązany zestaw).
2. **Test dla nowego zachowania** (charakterisation test PRZED refactor dla wysokiego ryzyka).
3. **`// WHY:` komentarz** dla nietrywialnych decyzji.
4. **≤ 3 pliki poza swoim subsystemem** (jeśli więcej — rozważyć podział).
5. **Żaden PR nie miesza fixu z refaktorem** (smallest safe change).
6. **P2/P3 mogą być batch-owane** per plik w jeden „maintenance" PR.

---

## 5. Quick wins (low severity, tanie w naprawie)

Te ustalenia można wykonać od razu, niezależnie od głównego planu. Każde z nich to < 30 LOC i < 30 min.

| # | Temat | Plik | Severity | Scope |
|---|---|---|---|---|
| QW-1 | Usunąć legacy `moduleEntries` z `moduleCatalog.ts` (197 LOC) | `src/lib/modules/moduleCatalog.ts:78-274` | canvas D-12 | usunięcie, 0 ryzyka |
| QW-2 | Dodać `"Blok rozdzielczy": 88` do `CATEGORY_DEFAULT_HEIGHT_MM` | `src/lib/modules/importedModuleCatalog.ts:13-20` | canvas L-3 | 1 linia |
| QW-3 | Dodać Vitest integrity test: `assert fileExists(moduleRef)` | `src/lib/modules/moduleCatalog.test.ts` (nowy) | canvas D-13 | 1 nowy test |
| QW-4 | Usunąć 11 `devLog` z 3 plików (referenceDesignations, CircuitEditPanel, useDinRailPreparedAssets) | 3 pliki | code-discipline P2-3 | usunięcie, 11 LOC |
| QW-5 | Wyciągnąć `DEFAULT_WIRE_SETTINGS_STORAGE_KEY` constant | `src/lib/appHelpers.ts` | code-discipline P2-4 | 5 LOC |
| QW-6 | Dodać `.catch(() => {})` do `backListener.then` | `src/hooks/useDialogState.ts:79` | code-discipline P3-9 | 1 linia |
| QW-7 | Przenieść importy nad `loadUiTheme` w `App.tsx` | `src/App.tsx:71-75` | code-discipline P1-7 | zmiana kolejności |
| QW-8 | Usunąć `PdfLabelDocument.tsx` (dead code + CDN) | `src/lib/export/PdfLabelDocument.tsx` | pdf P2-16 | usunięcie, 0 ryzyka |
| QW-9 | Wyciągnąć `firstNonEmpty` do `lib/stringHelpers.ts` | 4-5 plików | pdf P2-15 | ~10 LOC |
| QW-10 | Dodać test determinizmu `generateDinRailSvg` | `src/lib/dinRailGenerator.test.ts` | canvas L-5 | 1 nowy test |
| QW-11 | `// WHY:` w `applyInheritedRcdInfo` (zerowanie `rcdType`) | `src/lib/domain/symbolGrouping.ts:97-100` | electrical M-6 | 1 komentarz |
| QW-12 | `// WHY:` w `autoBalancePhases` (ZERO_POWER_UNIT_WEIGHT) | `src/lib/phaseDistribution/phaseDistributionCalculator.ts:199` | electrical L-5 | 1 komentarz |
| QW-13 | `// WHY:` w `rcdTypeRecommendation` (hasAnyToken) | `src/lib/validation/...` | electrical M-4 | 1 komentarz |
| QW-14 | `// WHY:` w `distributePower` (L1+L3 vs L3+L1) | `src/lib/phaseDistribution/phaseDistributionCalculator.ts:34-35` | electrical L-1 | 1-2 linijki |
| QW-15 | Test „returns zero for negative power" w `distributePower` | `src/lib/phaseDistribution/phaseDistributionCalculator.test.ts` | electrical L-3 | 1 nowy test |
| QW-16 | LRU cache w `ModuleAssetPreview.tsx` (3 globalne Map) | `src/components/ModuleAssetPreview.tsx:21-24` | canvas L-2 | ~20 LOC |
| QW-17 | Wyciągnąć `getProjectFileName` helper (App.tsx:377, 465) | `src/lib/appHelpers.ts` + 2 importy | code-discipline P1-6 | ~10 LOC |
| QW-18 | Zmienić `console.error` → `reportRuntimeError` w `App.tsx:679` | `src/App.tsx:679` | code-discipline P2-9 | 1 linia (część PR-2.3) |

**Łącznie: ~18 quick wins, ~150 LOC, estymowany czas: 1-2 dni robocze.**

---

## 6. Ryzyka i ograniczenia audytu (co mogło zostać pominięte, czego audyt read-only nie wyłapie)

### 6.1. Ograniczenia metody

- **Testy NIE zostały uruchomione.** Wszystkie asercje o wydajności (np. canvas H-1, H-4, H-6 — getBoundingClientRect, SVG bbox, useEffect re-fetch) są spekulatywne. Prawdziwe bottlenecki mogą być w innych miejscach.
- **Brak pixel-diff view vs eksport.** Porównanie renderowanego PDF z canvasem (canvas C-2) zrobiono na podstawie analizy kodu, nie wizualnie.
- **Brak testów integracyjnych runtime.** Subsystemy canvas (94 KB) i PDF (53 KB) są „container files" — przeczytano je w kawałkach, nie sekwencyjnie.
- **Cross-browser nie testowany.** Pixi canvas i snap mogą się różnić Chrome vs Firefox vs Safari.
- **Brak pomiaru wydajności rzeczywistej.** Asercje typu „100 modułów w < 50 ms" to plan, nie zmierzony wynik.

### 6.2. Warstwy poza scope (nie analizowane dogłębnie)

- **Tauri build configuration** (icons, bundling, signing) — nie w scope project-io.
- **Capacitor/iOS/Android native shell** — sprawdzono tylko `Capacitor.isNativePlatform()` w `useProjectActions.ts`. Nie analizowano pluginów.
- **CSP / XSS w ogólności**: poza canvas H-9 (który dotyczy `namespaceSvgMarkup`), nie sprawdzono reszty UI pod kątem bezpieczeństwa.
- **Wydajność 5000+ symboli**: dotknięte w P3-2, P3-3 (project-io) — ale nie było to pełne obciążeniowe testy.

### 6.3. Możliwe pominięte ustalenia

1. **Hooki `useSchematicViewport`, `useSchematicCellEdit`, `useSchematicState`** — sprawdzone tylko publiczne interfejsy; wewnętrzna logika poza scope.
2. **`DinRailConnectionsCanvas.tsx` (94 KB)** — największy „container file". Sprawdzono importy + wywołania, ale NIE czytano sekwencyjnie.
3. **Tauri command handler dla `read_project_file`/`write_project_file`** — martwe komendy. Jeśli ktoś je podepnie, security review musi wrócić.
4. **25 `any` type usages** — AGENTS.md mówi o 28 `any`. Audyt code-discipline znalazł 2-3 w `AppLeftPanel.tsx` / `AppWorkspaceCanvas.tsx`. Pozostałe 25 nie były analizowane.
5. **i18n** — `lib/measurementProtocols.ts` ma fallback PL, Tauri `set_title` PL (project-io P3-6). Brak pełnego i18n audit.
6. **Pixi.js w bundle** — canvas H-7 zauważa, że `pixi.js` jest importowany top-level. Nie zmierzono realnego bundle size impact.
7. **`useDebouncedPersist` 250ms** (project-io) — arbitralne. Brak danych o race conditions / frequency.
8. **Live PWA / Service Worker** — AGENTS.md opisuje cache 30-day TTL dla SVG. Nie analizowano, czy quick wins (np. QW-2) wymagają hard-reload.

### 6.4. Czego audyt read-only NIE wyłapie

- **Race conditions** w async state updates (`useDebouncedPersist`, `setHasUnsavedChanges`).
- **Prawdziwe wąskie gardła wydajności** — tylko profilowanie runtime z 100+ modułami.
- **Błędy wizualne** — np. snap na granicy modułu (canvas H-3) może wyglądać OK przy 10 modułach, ale psuć się przy 50.
- **Prawdziwe bugi runtime** — wiele P0 to „ciche" problemy widoczne dopiero przy konkretnej sekwencji akcji użytkownika.
- **Realna wydajność Pixi canvas** — bez GPU profiling nie wiadomo, czy Pixi w ogóle pomaga czy przeszkadza.
- **Bundle size impact** — np. Pixi.js (~250 KB gzipped) — szacunkowo, nie zmierzono.

### 6.5. Co NIE wykryto (potwierdzenia)

- Brak `eval` / `new Function` poza importem Pixi.
- Brak hardkodowanych haseł/API keys poza Web3Forms (code-discipline P1-2).
- Brak wycieku `process.env` do frontendu.
- Brak śladów SQL injection (brak SQL w projekcie).
- Round-trip testy pliku projektu są w `projectFile.test.ts` (285 LOC) i pokrywają wersje schemaVersion 1/2/999.

### 6.6. Rekomendacje dla następnego audytu

1. **Pixel-diff view vs eksport** — faktyczne porównanie renderowanego PDF z renderowanym canvasem.
2. **Performance profiling** z 100, 500, 1000 modułami — realne bottlenecki.
3. **Security review UI komponentów** pod kątem XSS z `dangerouslySetInnerHTML` (po canvas H-9).
4. **Tauri capabilities review** — capability manifest `default.json` po usunięciu martwych komend.
5. **Type narrowing pass** dla 25 pozostałych `any`.
6. **Test gap analysis** dla 10+ modułów bez testów (code-discipline P2-8).

---

## 7. Komunikat strukturalny (5 pól)

1. **Problem:** DINBoard Web po 2+ latach rozwoju ma 3 systemowe kategorie problemów: (a) duplikacja helperów (~13 cross-cutting wzorców, w tym `WIRE_THICKNESS_MAP` w 4 plikach, 4 funkcje między `connectionsLogic.ts` a `canvasHelpers.ts`, 5+ implementacji identyfikacji modułów), (b) martwy kod (~850 LOC w 10 artefaktach, w tym `useDinRailInteraction` 332 LOC + 213 LOC testów, Pixi canvas ~70 LOC, martwe Tauri commands z `std::fs` bez sandboxa), (c) ciche utraty danych w aktywnych plikach (np. `schemaVersion: 2` bez `version` traktowany jako Avalonia, PDF „separate" pomija 3/4 stron protokołów, `autoBalancePhases` cicho przesuwa fazy FR).

2. **Przyczyna:** 5 audytów (electrical, canvas, pdf, project-io, code-discipline) wyprodukowało 159 surowych ustaleń, ale żaden cross-report. Ten sam problem (np. `App.tsx:670-681` ciche połykanie błędów) opisywany z różnych perspektyw w 2 raportach (project-io P0-1 vs code-discipline P2-9). Brak jednego źródła prawdy dla helpersów identyfikacyjnych (5+ implementacji). Migracje plików bez rejestru (jedyna migracja uruchamia się bezwarunkowo). Refaktoryzacje w toku (canvas Pixi → DOM canvas) zostawiły martwy kod zamiast go usunąć. Niespójności camelCase vs kebab-case w `DeviceKind` / `CircuitDeviceKind`.

3. **Bezpieczna poprawka:** Strategia 5-fazowa. Faza 0: quick wins + martwy kod security (4 PR-y, 1-2 dni). Faza 1: kontrakty domenowe — migration registry, Avalonia disambiguation, `DeviceKind` unify, connection parser defaults (4 PR-y, 1-2 tygodnie, blokuje dalsze). Faza 2: izolowane poprawki w równoległych PRach (9 PR-ów, 2-3 tygodnie). Faza 3: duplikaty helperów (6 PR-ów, po ustaleniu źródeł w Fazie 1-2). Fazy 4-5: refaktory + polish. **6 pytań blokujących** do usera PRZED otwarciem odpowiednich PR-ów (Q1: WIRE_THICKNESS 60 vs 54; Q2: FR head w bilansie; Q3: ConnectionsRightPanel A/B; Q4: PDF separate A/B; Q5: Pixi lazy vs usunięcie; Q6: UI dla brakujących pól protokołów A/B). Każdy PR: 1 commit tematyczny + test nowego zachowania + `// WHY:` komentarz + ≤ 3 pliki poza subsystemem.

4. **Co zmieniono:** Stworzono `AUDIT_SYNTHESIS.md` (ten plik, ~1500 linii) zawierający: (a) statystyki z 5 raportów z weryfikacją z ciała raportów (nie z tabel podsumowujących — drobne niespójności wykryte i opisane), (b) 3 prawdziwe cross-report duplikaty (SYN-X1 do SYN-X3) plus 6 grup „related" issues, (c) Top 10 do naprawy z minimalnym fixem i scope per finding, (d) plan napraw w 5 warstwach z grafem zależności, (e) ~22 PR-y zgrupowane w 5 faz, (f) 18 quick wins do natychmiastowej realizacji, (g) 6 pytań blokujących do usera, (h) ryzyka i ograniczenia audytu. Stworzono też `deliverable.md` (3 pola: Summary / Changed files / Notes). Zaktualizowano `board.md` (wpis końcowy).

5. **Co przetestowano:** Audyt read-only — 5 raportów audytowych przeczytanych w całości, 0 testów uruchomionych (zgodnie z brief i metodologią wszystkich 5 audytów). Weryfikacja: (a) zliczono ustalenia per raport z treści (regex na `### ID-N`), wykryto drobne niespójności (electrical: 7 D vs 6 w summary; pdf: 10 P2 vs 11 w summary); (b) zweryfikowano 3 cross-report duplikaty pod kątem zgodności file:line; (c) zmapowano 6 pytań blokujących do konkretnych PR-ów; (d) zaproponowano graf zależności na podstawie plików i subsystemów (np. PR-1.1 migration registry musi być przed PR-1.2 Avalonia disambiguation, bo oba dotykają `parseProjectFileContent`); (e) rozróżniono „prawdziwe duplikaty" (3) od „related issues" (6 grup) — poprzednia synteza miała tendencję do grupowania related as duplicates. Brak pixel-diff, brak performance profiling, brak testów runtime.
