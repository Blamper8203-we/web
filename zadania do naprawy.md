# Zadania do naprawy — DINBoard Web

**Data utworzenia:** 2026-06-30
**Źródło:** synteza z `.harness/reports/AUDIT_SYNTHESIS.md` (2026-06-18) + weryfikacja stanu kodu na 2026-06-30
**Zasada:** Jak coś naprawimy, zaznaczam `[x]` i dorzucam krótki commit/note.

---

## Stan na 2026-06-30

- **Top 10 z audytu:** 10/10 zrobione lub Q-closed. Wszystko zamknięte.
- **6 pytań blokujących (Q1-Q6):** wszystkie zamknięte.
- **Faza 0 plan napraw:** 4/4 zrobione. Wszystkie domknięte.
- **Faza 1 plan napraw:** 4/4 zrobione (PR-1.1 ✅, PR-1.2 SKIP, PR-1.3 ✅, PR-1.4 ✅). Kompletna.
- **Faza 2-3:** SYN-X2 (PR-3.2) SKIP, reszta do zrobienia.
- **Quick wins:** **18/18 zrobione** (włącznie z QW-16 LRU cache). Kompletne.
- **Duże martwe pliki:** wszystkie usunięte.

---

## Zalecana kolejność (moja rekomendacja)

1. **Faza 2-3** (canvas geometry dups, PDF dups, SymbolHistorySnapshot helper, itd.) — odłożyć na osobną sesję, to są tygodnie roboty.

**Wniosek:** Cały audyt 100% zamknięty (Top 10 + Q1-Q6 + Faza 0 + Faza 1 + 18/18 QW + SYN-X 3/3 + duże martwe pliki). Zostaje tylko Faza 2-3 (duplikaty helperów + refaktory) — nowy cykl pracy, osobna sesja.

---

## A. Realne zadania (Top 10 / Faza 1)

### A.1 [x] PR-1.1 Migration registry ✅ DONE
- **Pliki:** `src/lib/projectFile.ts:353-444` + nowy `src/lib/migrations/` (5-6 plików, ~200 LOC)
- **Problem:** Brak rejestru migracji. Jedyna migracja (`migrateLegacyManualReferenceDesignations`) uruchamia się bezwarunkowo. Dodanie drugiej to copy-paste. Cicha mutacja symboli przy każdym otwarciu pliku gdy `buildSchematicLayout` zwróci inną wartość.
- **Fix:** Nowy `src/lib/migrations/registry.ts` z `MIGRATIONS: Array<{from, to, run}>`. Parser iteruje po rejestrze. Marker `appliedMigrations: string[]` w pliku. Izolowany test dla `migrateLegacyManualReferenceDesignations`.
- **Severity:** project-io P0-3 + P1-2 + P2-9
- **Owner:** project-io-expert
- **Czas:** 1-2 tygodnie
- **Status:** Zrobione — commity `8fcd3cc`..`1ceb06f` + `d4078e6`. Registry w `src/lib/projectMigrations.ts` (237 LOC) z `Migration` interface, `MIGRATIONS[]`, `registerMigration()`, `runMigrations()` (skip-if-applied, universal vs version-scoped), `migrateProjectData()`. Zarejestrowana produkcyjna migracja `v1-to-v2:legacyReferenceDesignations`. Testy `projectMigrations.test.ts` (248 LOC). `projectFile.ts` integruje. Zamknięte 2026-06-30 w tej sesji (closure commit do `AUDIT_SYNTHESIS.md`).

### A.2 [x] PR-1.4 Connection parser defaults ✅ DONE
- **Pliki:** `src/lib/projectFile.ts:416-434` + `src/types/connectionItem.ts:31-45` (1-2 pliki, ~40 LOC)
- **Problem:** Parser defaults: `routingMode: "manhattan"`. `createDefaultConnection`: `routingMode: "orthogonal"`. Brak defaultu `ferruleColor` w parserze. Pliki zapisane przed dodaniem pola `ferruleColor` dostaną inny default niż świeże.
- **Fix:** Parser per item: `createDefaultConnection({...rawItem})` zamiast ręcznych defaultów.
- **Severity:** project-io P0-5 + P2-3
- **Owner:** project-io-expert
- **Czas:** 1-2 godziny
- **Status:** Zamknięte 2026-06-30. Commity `ee1d8bf` (refactor: scentralizowany `filterConnectionOverrides`) + `92cd04f` (fix: filter zachowuje `fromDirection`/`toDirection`/`customRadius`). Parser `projectFile.ts:247` używa `createDefaultConnection(filterConnectionOverrides(conn))`. Testy `connectionItem.test.ts` (273 LOC) pinują wszystkie defaults + round-trip. Symbol path też naprawiony. Top 10 #5 closure + PR-1.4 oznaczony DONE.

### A.3 [x] PR-1.3 DeviceKind / CircuitDeviceKind unify ✅ DONE
- **Pliki:** `src/types/symbolItem.ts:1-9` vs `src/types/circuitRow.ts:1-9` (2-3 pliki + typy)
- **Problem:** Camelcase vs kebab-case w dwóch typach — potencjalne ciche błędy przy serializacji/deserializacji.
- **Severity:** electrical C-3 + M-2
- **Owner:** electrical-expert + developer
- **Czas:** pół dnia
- **Status:** Zamknięte 2026-06-30. Commity `d004ee2` (consolidate phase distribution, validation, circuit row types) + `2101911` (usuniecie bezwartosciowego aliasu CircuitDeviceKind). `circuitRow.ts` ma 24 LOC, `deviceKind: DeviceKind` importowane z `symbolItem.ts` (linie 1, 6). `toCircuitDeviceKind` (circuitRows.ts:28) i `isKnownCircuitDeviceKind` (symbolItem.ts:265) to funkcje, nie type aliases. Grep `CircuitDeviceKind`: 4 trafienia, wszystkie funkcje. Warstwa 1c + PR-1.3 oznaczone DONE.

---

## B. Quick wins (drobiazgi, ~1-2 dni łącznie)

### B.1 [x] QW-3 — Vitest integrity test `assert fileExists(moduleRef)` ✅ DONE
- **Plik:** nowy test w `src/lib/modules/moduleCatalog.test.ts`
- **Severity:** canvas D-13
- **Czas:** 15 min
- **Status:** Zamknięte 2026-06-30. `moduleCatalog.test.ts:82-98` ma `describe("module catalog integrity")` z testem "every currentModuleEntries moduleRef points to an existing SVG file on disk" + WHY comment. Drugi test analogiczny w linii 207-217 (inny describe block).

### B.2 [x] QW-10 — Test determinizmu `generateDinRailSvg` ✅ DONE
- **Plik:** `src/lib/dinRailGenerator.test.ts`
- **Severity:** canvas L-5
- **Czas:** 15 min
- **Status:** Zamknięte 2026-06-30. Plik przeniesiony do `src/lib/schematic/dinRailGenerator.test.ts:12` z `describe("generateDinRailSvg - determinism")` i 4 testami (dwa wywołania, różne konfiguracje, invalid input). WHY comment w linii 1.

### B.3 [x] QW-11 — `// WHY:` w `applyInheritedRcdInfo` (zerowanie `rcdType`) ✅ DONE
- **Plik:** `src/lib/domain/symbolGrouping.ts:97-100`
- **Severity:** electrical M-6
- **Czas:** 5 min
- **Status:** Zamknięte 2026-06-30. `symbolGrouping.ts:97-102` ma 6-liniowy WHY comment: "zero out ALL four RCD fields together, not just rcdSymbolId. If we cleared rcdSymbolId but left rcdRatedCurrent/residualCurrent/type stale, the symbol would silently report inherited values for an RCD it is no longer attached to."

### B.4 [x] QW-12 — `// WHY:` w `autoBalancePhases` (ZERO_POWER_UNIT_WEIGHT) ✅ DONE
- **Plik:** `src/lib/phaseDistribution/phaseDistributionCalculator.ts:199`
- **Severity:** electrical L-5
- **Czas:** 5 min
- **Status:** Zamknięte 2026-06-30. `phaseDistributionCalculator.ts:217` ma WHY: "ZERO_POWER_UNIT_WEIGHT is a tiny non-zero fallback (0.001) instead..." (kompletny komentarz kilka linii).

### B.5 [x] QW-13 — `// WHY:` w `rcdTypeRecommendation` (hasAnyToken) ✅ DONE
- **Plik:** `src/lib/validation/...`
- **Severity:** electrical M-4
- **Czas:** 5 min
- **Status:** Zamknięte 2026-06-30. `rcdTypeRecommendation.ts:47` ma WHY: "hasAnyToken does case-insensitive Polish-aware substring matching..." (wyjaśnia semantykę helpera).

### B.6 [x] QW-14 — `// WHY:` w `distributePower` (L1+L3 vs L3+L1) ✅ DONE
- **Plik:** `src/lib/phaseDistribution/phaseDistributionCalculator.ts:34-35`
- **Severity:** electrical L-1
- **Czas:** 5 min
- **Status:** Zamknięte 2026-06-30. `phaseDistributionCalculator.ts:37-40` ma WHY: "order matters in the switch labels above — 'L1+L3' splits equally across L1 and L3, but 'L3+L1' (reversed) does NOT match any case and falls through to the L1-only default branch, returning [powerW, 0, 0]."

### B.7 [x] QW-15 — Test "returns zero for negative power" w `distributePower` ✅ DONE
- **Plik:** `src/lib/phaseDistribution/phaseDistributionCalculator.test.ts`
- **Severity:** electrical L-3
- **Czas:** 15 min
- **Status:** Zamknięte 2026-06-30. Dwa testy: linia 216 "returns zeros for negative power regardless of phase" + linia 223 "returns zeros for zero power regardless of phase". WHY comment w linii 212 ("no power in, no power out — negative or zero power must short-circuit").

### B.8 [x] QW-16 — LRU cache w `ModuleAssetPreview.tsx` (3 globalne `Map`) ✅ DONE
- **Plik:** `src/components/ModuleAssetPreview.tsx:21-24`
- **Severity:** canvas L-2
- **Czas:** 30 min
- **Status:** Zamknięte 2026-06-30 (commit `4f43afb`). Nowy `src/lib/lruCache.ts` z `setWithLruEviction` + `touchLruEntry`. `ModuleAssetPreview.tsx` używa `MAX_PREVIEW_CACHE_SIZE = 100`. 3× `.set()` → `setWithLruEviction`, 3× `.get()` → `touchLruEntry` (true LRU). 8 testów w `lruCache.test.ts`. Bonus: implementacja złapała bug — `Map.set` na existing key NIE przesuwa go na koniec insertion order (per spec: value updated, position unchanged). Fix: delete+set w `setWithLruEviction`. Lekcja zapisana w pamięci agenta.

---

## C. Do zweryfikowania (30-60 min)

> Te trzy rzeczy mogą być już zrobione — trzeba sprawdzić. Jeśli tak, przenieść do "Już zrobione" z krótkim uzasadnieniem.

### C.1 [x] SYN-X2 — czy `findConnectedComponent` / `getHotspotPhase` / `checkConnectionWarning` / `getSymbolAssetUrl` są w jednym czy dwóch plikach ✅ DONE
- **Pliki:** `src/lib/connections/connectionsLogic.ts` vs `src/lib/connections/canvasHelpers.ts`
- **Co sprawdzić:** czy są dwie implementacje czy jedna. Widzę aktywne użycie w obu plikach (50+ grep matches).
- **Severity:** code-discipline P1-1 + canvas D-3, D-4 — SYN-X2
- **Status:** Zamknięte 2026-06-30. `connectionsLogic.ts` → 0 trafień dla 4 funkcji, `canvasHelpers.ts` → 4 trafienia (linie 27, 79, 107, 156). Single source. Konsumenci importują z `canvasHelpers`: `DinRailConnectionsCanvas.tsx:64-65`, `useDinRailForegroundSvgs.ts:3`, `DinRailRenderedSymbols.tsx:3`. PR-3.2 oznaczony SKIP.

### C.2 [x] PR-0.2 — `useDialogState` martwe stany ✅ DONE
- **Plik:** `src/hooks/useDialogState.ts:22-23, 33-34, 45-46, 53-54, 71-74, 88-89, 100-101, 110-111, 79`
- **Co sprawdzić:** `paletteContextMenu` i `pendingPaletteRemoval` w `useDialogState` — czy są nadal martwe, czy zostały przeniesione do `usePaletteActions`. Wczoraj widziałem że `usePaletteActions.ts:68` je ma — więc prawdopodobnie rozwiązane. Trzeba potwierdzić.
- **Severity:** code-discipline P0-2 + P1-5 + P3-1 + P3-9
- **Status:** Zamknięte 2026-06-30. `useDialogState.ts` ma 98 LOC, 5 aktywnych stanów, żadnych martwych. `paletteContextMenu` / `pendingPaletteRemoval` żyją w `usePaletteActions.ts:68, 75` (single source). Guard `isNativePlatform()` dodany, `.catch(() => {})` na `backListener.then`. Top 10 #8 closure + PR-0.2 oznaczony DONE.

### C.3 [x] PR-0.3 — `useImportedModules` martwe stany ✅ DONE
- **Plik:** `src/hooks/useImportedModules.ts:41-42, 144, 175-177`
- **Co sprawdzić:** czy `svgImportDialogOpen` i `importedModulesManagerOpen` są nadal lokalnie zdefiniowane (martwe), czy zostały usunięte na rzecz wersji z `useDialogState`.
- **Severity:** code-discipline P0-3
- **Status:** Zamknięte 2026-06-30. Plik ma 178 LOC, 5 aktywnych stanów, brak lokalnych `svgImportDialogOpen` / `importedModulesManagerOpen`. `handleSvgImportCommit` nie ma już `setSvgImportDialogOpen` setter call. Dialogi otwierane/zamykane przez `useDialogState` w `AppWorkspace.tsx`. Top 10 #9 closure + PR-0.3 oznaczony DONE.

---

## Już zrobione (kontekst historyczny, nie do roboty)

### Top 10 z audytu:
- ✅ #1 Migration registry (commity `8fcd3cc`..`1ceb06f` + `d4078e6`)
- ✅ #2 WIRE_THICKNESS_MAP unify (Q1 closed, single source 60)
- ✅ #3 Avalonia disambiguation (user: brak plików Avalonia, gałąź usunięta)
- ✅ #4 `isGroupHeadSymbol` unify (Q2 closed, FR transparentny)
- ✅ #5 Connection parser defaults (częściowo) — patrz A.2, zostały jeszcze realne rozjazdy
- ✅ #6 Landing page error (App.tsx zrefaktorowane z 681 do 158 LOC, catch w useAppPersistence)
- ✅ #7 `ConnectionsRightPanel` (Q3 closed, usunięte)
- ✅ #8 `useDialogState` martwe stany (98 LOC, 5 aktywnych stanów, single source w usePaletteActions, .catch() dodany)
- ✅ #9 `useImportedModules` martwe stany (178 LOC, 5 aktywnych stanów, setSvgImportDialogOpen usunięte z handleSvgImportCommit)
- ✅ #10 PDF missing pages (Q4 closed, verified non-issue)

### Faza 0 plan napraw (4/4 done):
- ✅ PR-0.1: Martwy Tauri + `loadProjectFromPath` (`src-tauri/src/lib.rs` nie ma `read_project_file`/`write_project_file`, `loadProjectFromPath` usunięte w `8fcd3cc`)
- ✅ PR-0.2: `useDialogState` martwe stany (patrz C.2)
- ✅ PR-0.3: `useImportedModules` martwe stany (patrz C.3)
- ✅ PR-0.4: SKIP (Q3 closed, Wariant B)

### Faza 1 (4/4 done):
- ✅ PR-1.1: Migration registry (patrz A.1)
- ⏭️ PR-1.2: Avalonia disambiguation — SKIP (user: brak plików Avalonia, gałąź usunięta w `d4078e6`)
- ✅ PR-1.3: DeviceKind / CircuitDeviceKind unify (patrz A.3) — commity `d004ee2` + `2101911`
- ✅ PR-1.4: Connection parser defaults (patrz A.2) — commity `ee1d8bf` + `92cd04f`

### Faza 2-3 (1/15 done):
- ⏭️ PR-3.2: SYN-X2 dedup (canvasHelpers single source) — patrz C.1
- 🔲 reszta (canvas geometry dups, PDF dups, SymbolHistorySnapshot helper, itd.) — do roboty w przyszłości

### Cross-report duplikaty (SYN-X):
- ✅ SYN-X1 (WIRE_THICKNESS_MAP) — Q1 closed
- ✅ SYN-X2 (4 funkcje canvasHelpers) — patrz C.1
- ✅ SYN-X3 (App.tsx landing page error) — Top 10 #6 closed (App.tsx zrefaktorowane)

### Quick wins (18/18):
- ✅ QW-1: legacy `moduleEntries` usunięte (197 LOC)
- ✅ QW-2: `"Blok rozdzielczy": 88` w `moduleHeuristics.ts:10`
- ✅ QW-3: integrity test w `moduleCatalog.test.ts:82-98` (patrz B.1)
- ✅ QW-4: 11 devLog — wszystkie callsites wycięte (została tylko definicja w `runtimeDiagnostics.ts:14`)
- ✅ QW-5: `DEFAULT_WIRE_SETTINGS_STORAGE_KEY` w `appHelpers.ts:14`
- ✅ QW-6: `.catch(() => {})` na `backListener.then` w `useDialogState.ts:70`
- ✅ QW-7: import order w `App.tsx` (158 LOC, struktura czysta)
- ✅ QW-8: `PdfLabelDocument.tsx` usunięte
- ✅ QW-9: `firstNonEmpty` helper w `stringHelpers.ts:1` (importowany z circuitRows.ts i measurementProtocols.ts)
- ✅ QW-10: determinism test (patrz B.2)
- ✅ QW-11: WHY o zerowaniu RCD pól (patrz B.3)
- ✅ QW-12: WHY o ZERO_POWER_UNIT_WEIGHT (patrz B.4)
- ✅ QW-13: WHY o hasAnyToken (patrz B.5)
- ✅ QW-14: WHY o L1+L3 vs L3+L1 (patrz B.6)
- ✅ QW-15: negative/zero power test (patrz B.7)
- ✅ QW-16: LRU cache w `ModuleAssetPreview.tsx` (patrz B.8) — commit `4f43afb`, +1 nowy plik (`lruCache.ts`) + 1 nowy test (8 testów)
- ✅ QW-17: `getProjectFileName` helper w `appHelpers.ts:98`
- ✅ QW-18: App.tsx zrefaktorowane (158 LOC, brak `console.error` w catch)

### Duże martwe pliki (wszystkie usunięte):
- ✅ `src/hooks/useDinRailInteraction.ts` (332 LOC) + jego testy (213 LOC)
- ✅ `src/fixtures/demoData.ts` (127 LOC)
- ✅ `src/lib/export/PdfLabelDocument.tsx` (~8 KB + CDN font)
- ✅ `src/lib/modules/moduleCatalog.ts:78-274` legacy `moduleEntries` (197 LOC)
- ✅ `src/components/ConnectionsRightPanel.tsx` (19 LOC)

### Pytania blokujące (wszystkie zamknięte):
- ✅ Q1: WIRE_THICKNESS_MAP[16] = 60 (commit `3291993`)
- ✅ Q2: FR transparentny w bilansie (verified 2026-06-29)
- ✅ Q3: ConnectionsRightPanel usunięte (commit `cb99401`)
- ✅ Q4: PDF "separate" non-issue (commit `5302051`)
- ✅ Q5: Pixi dawno usunięty (commit `3c81a20`)
- ✅ Q6: `documentation*` w PDF (commit `5302051`)
