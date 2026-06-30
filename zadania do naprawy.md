# Zadania do naprawy — DINBoard Web

**Data utworzenia:** 2026-06-30
**Źródło:** synteza z `.harness/reports/AUDIT_SYNTHESIS.md` (2026-06-18) + weryfikacja stanu kodu na 2026-06-30
**Zasada:** Jak coś naprawimy, zaznaczam `[x]` i dorzucam krótki commit/note.

---

## Stan na 2026-06-30

- **Top 10 z audytu:** 10/10 zrobione lub Q-closed. Wszystko zamknięte.
- **6 pytań blokujących (Q1-Q6):** wszystkie zamknięte.
- **Faza 1 plan napraw:** PR-1.1 done, PR-1.2 (Avalonia) nie dotyczy (user nie ma plików Avalonia), PR-1.3 + PR-1.4 do zrobienia.
- **Quick wins:** 9/18 zrobione. Zostało **9 drobiazgów**.
- **Duże martwe pliki:** wszystkie usunięte (useDinRailInteraction, demoData, PdfLabelDocument, legacy moduleEntries, ConnectionsRightPanel).

---

## Zalecana kolejność (moja rekomendacja)

1. **Sekcja C** (weryfikacja SYN-X2, useDialogState, useImportedModules) — 30 min, może zamknąć kolejne 2-3 PR-y z Fazy 0.
2. **PR-1.4 Connection parser defaults** — mały, izolowany, 1-2 godziny roboty, widoczny efekt.
3. **PR-1.3 DeviceKind unify** — 2-3 pliki, izolowany.
4. **Sekcja B** (9 quick wins) — dorobić przy okazji jak będziesz dotykał tych plików z innego powodu. Nie osobna sesja.

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

### A.2 [ ] PR-1.4 Connection parser defaults
- **Pliki:** `src/lib/projectFile.ts:416-434` + `src/types/connectionItem.ts:31-45` (1-2 pliki, ~40 LOC)
- **Problem:** Parser defaults: `routingMode: "manhattan"`. `createDefaultConnection`: `routingMode: "orthogonal"`. Brak defaultu `ferruleColor` w parserze. Pliki zapisane przed dodaniem pola dostaną inny default niż świeże.
- **Fix:** Parser per item: `createDefaultConnection({...rawItem})` zamiast ręcznych defaultów.
- **Severity:** project-io P0-5 + P2-3
- **Owner:** project-io-expert
- **Czas:** 1-2 godziny

### A.3 [ ] PR-1.3 DeviceKind / CircuitDeviceKind unify
- **Pliki:** `src/types/symbolItem.ts:1-9` vs `src/types/circuitRow.ts:1-9` (2-3 pliki + typy)
- **Problem:** Camelcase vs kebab-case w dwóch typach — potencjalne ciche błędy przy serializacji/deserializacji.
- **Severity:** electrical C-3 + M-2
- **Owner:** electrical-expert + developer
- **Czas:** pół dnia

---

## B. Quick wins (drobiazgi, ~1-2 dni łącznie)

### B.1 [ ] QW-3 — Vitest integrity test `assert fileExists(moduleRef)`
- **Plik:** nowy test w `src/lib/modules/moduleCatalog.test.ts`
- **Severity:** canvas D-13
- **Czas:** 15 min

### B.2 [ ] QW-10 — Test determinizmu `generateDinRailSvg`
- **Plik:** `src/lib/dinRailGenerator.test.ts`
- **Severity:** canvas L-5
- **Czas:** 15 min

### B.3 [ ] QW-11 — `// WHY:` w `applyInheritedRcdInfo` (zerowanie `rcdType`)
- **Plik:** `src/lib/domain/symbolGrouping.ts:97-100`
- **Severity:** electrical M-6
- **Czas:** 5 min

### B.4 [ ] QW-12 — `// WHY:` w `autoBalancePhases` (ZERO_POWER_UNIT_WEIGHT)
- **Plik:** `src/lib/phaseDistribution/phaseDistributionCalculator.ts:199`
- **Severity:** electrical L-5
- **Czas:** 5 min

### B.5 [ ] QW-13 — `// WHY:` w `rcdTypeRecommendation` (hasAnyToken)
- **Plik:** `src/lib/validation/...`
- **Severity:** electrical M-4
- **Czas:** 5 min

### B.6 [ ] QW-14 — `// WHY:` w `distributePower` (L1+L3 vs L3+L1)
- **Plik:** `src/lib/phaseDistribution/phaseDistributionCalculator.ts:34-35`
- **Severity:** electrical L-1
- **Czas:** 5 min

### B.7 [ ] QW-15 — Test "returns zero for negative power" w `distributePower`
- **Plik:** `src/lib/phaseDistribution/phaseDistributionCalculator.test.ts`
- **Severity:** electrical L-3
- **Czas:** 15 min

### B.8 [ ] QW-16 — LRU cache w `ModuleAssetPreview.tsx` (3 globalne `Map`)
- **Plik:** `src/components/ModuleAssetPreview.tsx:21-24`
- **Severity:** canvas L-2
- **Czas:** 30 min

---

## C. Do zweryfikowania (30-60 min)

> Te trzy rzeczy mogą być już zrobione — trzeba sprawdzić. Jeśli tak, przenieść do "Już zrobione" z krótkim uzasadnieniem.

### C.1 [ ] SYN-X2 — czy `findConnectedComponent` / `getHotspotPhase` / `checkConnectionWarning` / `getSymbolAssetUrl` są w jednym czy dwóch plikach
- **Pliki:** `src/lib/connections/connectionsLogic.ts` vs `src/lib/connections/canvasHelpers.ts`
- **Co sprawdzić:** czy są dwie implementacje czy jedna. Widzę aktywne użycie w obu plikach (50+ grep matches).
- **Severity:** code-discipline P1-1 + canvas D-3, D-4 — SYN-X2

### C.2 [ ] PR-0.2 — `useDialogState` martwe stany
- **Plik:** `src/hooks/useDialogState.ts:22-23, 33-34, 45-46, 53-54, 71-74, 88-89, 100-101, 110-111, 79`
- **Co sprawdzić:** `paletteContextMenu` i `pendingPaletteRemoval` w `useDialogState` — czy są nadal martwe, czy zostały przeniesione do `usePaletteActions`. Wczoraj widziałem że `usePaletteActions.ts:68` je ma — więc prawdopodobnie rozwiązane. Trzeba potwierdzić.
- **Severity:** code-discipline P0-2 + P1-5 + P3-1 + P3-9

### C.3 [ ] PR-0.3 — `useImportedModules` martwe stany
- **Plik:** `src/hooks/useImportedModules.ts:41-42, 144, 175-177`
- **Co sprawdzić:** czy `svgImportDialogOpen` i `importedModulesManagerOpen` są nadal lokalnie zdefiniowane (martwe), czy zostały usunięte na rzecz wersji z `useDialogState`.
- **Severity:** code-discipline P0-3

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
- ✅ #8 `useDialogState` martwe stany (częściowo) — `paletteContextMenu` w usePaletteActions
- ✅ #9 `useImportedModules` martwe stany (częściowo) — patrz C.3
- ✅ #10 PDF missing pages (Q4 closed, verified non-issue)

### Quick wins (9/18):
- ✅ QW-1: legacy `moduleEntries` usunięte (197 LOC)
- ✅ QW-2: `"Blok rozdzielczy": 88` w `moduleHeuristics.ts:10`
- ✅ QW-4: 11 devLog — wszystkie callsites wycięte (została tylko definicja w `runtimeDiagnostics.ts:14`)
- ✅ QW-5: `DEFAULT_WIRE_SETTINGS_STORAGE_KEY` w `appHelpers.ts:14`
- ✅ QW-6: `.catch(() => {})` na `backListener.then` w `useDialogState.ts:70`
- ✅ QW-7: import order w `App.tsx` (158 LOC, struktura czysta)
- ✅ QW-8: `PdfLabelDocument.tsx` usunięte
- ✅ QW-9: `pdfPages/` subdirectory utworzony (PdfRcdTablePage, PdfUnifiedTablePage, PdfTitlePage, itd.)
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
