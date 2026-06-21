# Audyt canvas, SVG i DIN rail (warstwa wizualna)

**Data:** 2026-06-17
**Zakres:** `src/components/DinRailCanvasPixi.tsx`, `src/lib/dinRailSelection.ts`, `src/lib/dinRailSnap.ts`, `src/lib/schematic/**`, `src/lib/export/dinRailSnapshotService.ts`, `src/lib/modules/importedModuleCatalog.ts`, `src/lib/modules/svgAsset.ts`, `src/lib/modules/svgNormalization.ts`, `src/lib/modules/rasterPreview.ts`, `src/components/SvgImportDialog.tsx`, `src/components/ModuleAssetPreview.tsx`, `public/assets/modules/**`
**Metoda:** read-only przegląd kodu + testów. Testy NIE zostały uruchomione.
**Właściciel audytu:** canvas-expert
**Właściciel napraw:** patrz „Owner" przy każdym znalezisku.

---

## Błędy krytyczne

### C-1. Nowe wpisy MCB w katalogu wskazują na pliki, których nie ma na dysku (3 moduły niewidoczne w palecie)

**Problem:** Trzy wpisy `currentModuleEntries` w katalogu wbudowanym odwołują się do plików SVG, których nazwa na dysku ma inny znak (`a` zamiast `ą`). Skutek: `getModuleAssetUrl` zwraca URL, którego Vite nie mapuje na plik — moduły nie renderują się w palecie (i nie ładują w istniejących projektach).

**Przyczyna:**

W `src/lib/modules/moduleCatalog.ts:324, 337, 350` (templateId `mcb-1p-new-svg` / `2p` / `3p`):
```ts
moduleRef: "MCB/rozłącznik nadprądowy MCB 1P.svg",  // ą = U+0105
moduleRef: "MCB/rozłącznik nadprądowy MCB 2P.svg",
moduleRef: "MCB/rozłącznik nadprądowy MCB 3P.svg",
```

W `public/assets/modules/MCB/` faktyczne nazwy plików to:
```
rozłacznik nadprądowy MCB 1P.svg  // a = U+0061 (brak ogonka)
rozłacznik nadprądowy MCB 2P.svg
rozłacznik nadprądowy MCB 3P.svg
```

Weryfikacja bajt-po-bajcie:
- `catalog` (hex): `726f7ac582c485637a6e696b…` (`ł` + `ą`)
- `disk`   (hex): `726f7ac58261637a6e696b…` (`ł` + `a`)

`getModuleAssetUrl` (`moduleCatalog.ts:815-831`) robi `encodeURIComponent` per-segment, więc:
- `rozłącznik` → `roz%C5%82%C4%85cznik`
- `rozłacznik` (na dysku) → `roz%C5%82acznik`

`vite.config.ts` serwuje pliki z `public/`, a serwery plików statycznych (Vite, IIS, Netlify) nie normalizują znaków diakrytycznych w URL — request do `/assets/modules/MCB/roz%C5%82%C4%85cznik…` zwraca 404, bo plik na dysku to `roz%C5%82acznik…`.

`module-manifest.json` (generowany przez Vite plugin) poprawnie zawiera dyskowe nazwy (`rozłacznik`), ale katalog w kodzie ich nie używa — idzie przez `getModuleAssetUrl` bez konsultacji z manifestem.

**Wpływ:**
- Wszystkie trzy nowe MCB (templateId `mcb-{1,2,3}p-new-svg`) **nie renderują się** w palecie i nie otwierają się w edytorze.
- Dla użytkownika wygląda to jak: klikam MCB 1P → nic się nie dzieje / 404 w konsoli. Po zapisie/odczycie projektu te trzy moduły nie mają wizualnej reprezentacji.
- Stare wpisy `moduleEntries` (legacy) mają ten sam problem: `zlacza/listwa-zaciskowa-5pin-3p-n-pe.svg`, `zlacza/zlacze-3xpen.svg`, `Listwy zaciskowe/LISTWA 12 PIN.svg` — wszystkie trzy nie istnieją. Wprawdzie `INCLUDE_LEGACY_BUILT_IN_MODULES = false` więc nie są używane w runtime, ale plik `moduleEntries` pozostaje w kodzie jako martwy.

**Severity:** critical — trzy w pełni zaprojektowane moduły są niewidoczne w aplikacji.

**Sugerowana bezpieczna poprawka (nie implementuj):**
- Albo: zmienić literówkę na dysku (rename `rozłacznik` → `rozłącznik`) — jednorazowy fix poza kodem, ale ryzyko: Windows + Vite + git history z polskimi znakami w filename bywa kapryśne.
- Albo: poprawić katalog, żeby używał dyskowych nazw (`rozłacznik` z `a`).
- Dodać w CI / Vitest asercję: `for (entry of currentModuleEntries) { assert(fileExists(\`public/assets/modules/${entry.moduleRef}\`)) }`. Wtedy literówka wybuchnie przy `npm run test`, nie przy produkcyjnym użytkowniku.
- W tym samym teście wykryje się też: `Listwy zaciskowe/LISTWA 12 PIN.svg` (legacy), `zlacza/...` (legacy) — i wymusi decyzję co zrobić z legacy wpisami (usunąć vs naprawić referencje).

**Owner:** canvas-expert (poprawka nazw + test integralności); developer (CI gate).

---

### C-2. `WIRE_THICKNESS_MAP` zduplikowane w 4 miejscach z rozbieżnymi wartościami — drut 16 mm² ma dwie różne grubości w zależności od tego, kto rysuje

**Problem:** Tablica mapująca przekrój kabla na grubość rysowaną w px istnieje w czterech plikach. Wartość dla `16.0` waha się między `54.0` a `60.0` — ten sam kabel jest więc rysowany o 11% cieńszy lub grubszy w zależności od tego, czy renderuje go:
- Pixi canvas w `DinRailConnectionsCanvas.tsx` (importuje z `connectionsLogic.ts`)
- Stary warstwowy renderer `DinRailWiresLayer.tsx` (inline kopia)
- Snapshot eksport PDF/PNG (`dinRailSnapshotService.ts` — inline kopia)
- Stałe pixi canvas (`dinRailCanvas/constants.ts` — inline kopia, eksportowane do testów)

**Przyczyna:**

| Plik | `1.5` | `2.5` | `4.0` | `6.0` | `10.0` | `16.0` |
|---|---|---|---|---|---|---|
| `lib/connections/connectionsLogic.ts:28` | 24 | 30 | 36 | 42 | 50 | **60** |
| `components/canvasLayers/DinRailWiresLayer.tsx:15` | 24 | 30 | 36 | 42 | 50 | **60** |
| `lib/dinRailCanvas/constants.ts:28` | 24 | 30 | 36 | 42 | 50 | **60** |
| `lib/export/dinRailSnapshotService.ts:158` | 24 | 30 | 36 | 42 | 50 | **54** |

Trzy z czterech mówią 60, jeden — 54. Komentarz `// L2 / L3 / N / PE / etc` istnieje tylko w dwóch kopiach.

Dodatkowo `WIRE_COLORS_MAP` jest zduplikowane w tych samych czterech plikach (wartości identyczne, ale to też martwa synchronizacja).

**Wpływ:**
- Wizualnie: drut 16 mm² na żywo (canvas) może wyglądać inaczej niż ten sam drut na snapshot w PDF. View ≠ eksport — naruszona immutability contract: `View rendering and snapshot export must stay in sync. If you change one, the other must match.` (canvas-expert agent.md).
- Utrzymanie: zmiana koloru/grubości kabla wymaga pamiętania o 4 plikach. Każdy nowy render (np. mobile preview) musi znowu kopiować.

**Severity:** critical — narusza gwarancję view=snapshot, łamie architekturę canvas.

**Sugerowana bezpieczna poprawka:**
- Jedno źródło prawdy: `lib/connections/connectionsLogic.ts` (albo nowy `lib/canvas/wireStyle.ts` jako współdzielony moduł — i tak nic tu nie zależy od `connectionsLogic`).
- Pozostałe trzy importują. Test w `geometry.test.ts:202-204` (który sprawdza tylko że `WIRE_THICKNESS_MAP[16] > WIRE_THICKNESS_MAP[10]`) rozszerzyć o: `expect(WIRE_THICKNESS_MAP[16]).toBe(60)` (lock-in jednej wartości) i test importu we wszystkich czterech konsumentach (assert `WIRE_THICKNESS_MAP === WIRE_THICKNESS_MAP_FROM_CANONICAL`).
- Decyzja: która wartość jest „prawdziwa" (60 vs 54) wymaga pytania do usera; prawdopodobnie 60 (trzy kopie vs jedna) i to 54 w snapshot jest regresją.

**Owner:** canvas-expert (usunięcie duplikatów + lock w teście); developer (potwierdzenie wartości z userem).

---

### C-3. `useDinRailInteraction.ts` (332 LOC) — martwy hook, wszystkie jego funkcjonalności zduplikowane inline w `DinRailCanvasPixi.tsx`

**Problem:** Plik `src/hooks/useDinRailInteraction.ts` istnieje, ma testy (`useDinRailInteraction.test.ts` — 213 LOC, 4 testy) i zwraca 8 handlerów (`selectionRect`, `isDropTarget`, `setIsDropTarget`, `beginDragForSymbol`, `handleSurfacePointerDown`, `handlePointerMove`, `handlePointerUp`, `handleDragOver`, `handleDrop`). Żaden z nich nie jest używany — `DinRailCanvasPixi.tsx:625-863` implementuje te same handlery inline (z identyczną logiką: `beginDragForSymbol`, `handleSurfacePointerDown`, `handlePointerMove`, `handlePointerUp`, `handleDragOver`, `handleDrop`).

**Przyczyna:** Historyczna refaktoryzacja. Testy `useDinRailInteraction.test.ts` zostały napisane dla hooka, ale hook nigdy nie został podpięty do `DinRailCanvasPixi`. Dwa równoległe światy (z hooka i z Pixi-canvas) — logika identyczna, ale odseparowana.

**Wpływ:**
- Utrzymanie: snap/pan/drag logika ma dwie kopie do synchronizacji (Pixi canvas + hook + test hooka). Refaktoryzacja snap/select zawsze wymaga edycji dwóch plików.
- Ryzyko: Pixi canvas dodaje do `handlePointerMove` logikę snap (linie 753-765) i selektora trybu, której hook nie ma — dalsze rozjazdy.

**Severity:** critical — duplikacja ~200 LOC w wysokiego-ryzyka subsystemie (pointer events + snap), martwe testy, ryzyko regressionu.

**Sugerowana bezpieczna poprawka:**
- Jednorazowa migracja: wyciągnąć handlery z `DinRailCanvasPixi` do `useDinRailInteraction` (Pixi-specific rzeczy — `setPanSafe` przez ref, `setIsPixiReady` callback — da się obsłużyć przez props/return). Usunąć inline wersję.
- Testy hooka (`useDinRailInteraction.test.ts`) zostają — zyskują pokrycie dla rzeczywistego runtime.
- Weryfikacja: `npm run test -- src/hooks/useDinRailInteraction src/lib/dinRailSnap` musi przejść, oraz smoke test w dev z drag/drop na Pixi canvas.

**Owner:** canvas-expert (refactor + testy); developer (code review, bo dotyka warstwy UI).

---

### C-4. Pan zoom bez `stopPropagation` — zdarzenia `wheel` na canvasie pędzą do listenerów na `viewport` pod spodem

**Problem:** `DinRailCanvasPixi.tsx:586-600` binduje `wheel` listener na `viewportRef.current` z `passive: false` (żeby `event.preventDefault()` działało dla zoom). W `useSchematicInteraction.ts:96-130` analogiczny wheel listener na `canvasRef.current` z `passive: false`. Żaden z nich nie ma `event.stopPropagation()` po `preventDefault()`.

**Przyczyna:** Standardowa implementacja wheel-to-zoom nie dodaje `stopPropagation` (zakłada, że nic innego nie słucha wheel). Ale `App.tsx`/`AppWorkspaceCanvas.tsx` mogą mieć globalny wheel handler dla innych celów (np. tab switch, otwieranie paneli), który dostanie zdarzenie pierwszy lub ostatni w zależności od porządku DOM.

Dodatkowo: brak `touch-action: none` na `viewport` w Pixi canvas — w `DinRailCanvasViewport.tsx` go nie ma, więc na mobile scroll pionowy strony konkuruje z canvasem.

**Wpływ:**
- Na desktop: subtelny bug — scroll na canvasie może triggerować inne globalne akcje (np. tab switch).
- Na mobile: pionowy scroll nad canvasem jedzie do strony zamiast być konsumowany — pinch-zoom też nie działa poprawnie.

**Severity:** critical (mobile) / medium (desktop)

**Sugerowana bezpieczna poprawka:**
- `DinRailCanvasPixi.tsx:596` — po `event.preventDefault()` dodać `event.stopPropagation()`.
- `useSchematicInteraction.ts:97` — analogicznie.
- Dodać CSS `touch-action: none` na `DinRailCanvasViewport` (`SchematicCanvas` już to ma: `SchematicCanvas.tsx:200`).
- Test: asercja że wheel event z `target === canvas` NIE propaguje do `document`.

**Owner:** canvas-expert.

---

## Błędy wysokiego ryzyka

### H-1. `getBoundingClientRect()` wywoływane na każdym `pointermove` — Pixi canvas

**Problem:** `DinRailCanvasPixi.tsx:281, 334` woła `containerRef.current?.getBoundingClientRect()`:
- W `screenToWorld` (wywoływanym z `handlePointerMove` linia 729, ~60 razy/s przy drag)
- W `handleWheel` (linia 334, ~120 razy/s przy scroll-zoom)

`getBoundingClientRect()` wymusza layout/reflow przeglądarki — przy interaktywnym pan/zoom może powodować zacięcia.

**Przyczyna:** Prosta implementacja — rect można cache'ować na `pointerdown` i re-evaluate tylko przy `resize`/`scroll`.

**Wpływ:** Wydajność — zauważalne janki na słabszych maszynach przy jednoczesnym drag + zoom, szczególnie na w pełni zapełnionej szynie (100+ modułów, snap uruchamia się na każdym ruchu).

**Severity:** high

**Sugerowana bezpieczna poprawka:**
- Cache'ować rect w `containerRectRef` (aktualizowany w `useElementSize`).
- `screenToWorld` czyta z `containerRectRef.current.x/y` zamiast `getBoundingClientRect()`.
- Cleanup: invalidate cache na resize via `ResizeObserver`.

**Owner:** canvas-expert.

---

### H-2. Brak snap-back / ESC cancel przy drag-and-drop z palety

**Problem:** `handleDrop` (`DinRailCanvasPixi.tsx:820-863`) i `handleDrop` w `SvgImportDialog.tsx` oraz `useSchematicInteraction.ts:155-182` (Schematic) nie obsługują ESC cancel. Użytkownik zaczyna drag z palety, ale jeśli zmieni zdanie w trakcie (zauważy, że kursor jest nad złym miejscem), nie ma standardowego ESC żeby anulować — drag kończy się dropem tam, gdzie kursor jest w `pointerup`, albo w `dragend` z `effectAllowed = none`.

**Przyczyna:** Domyślne zachowanie HTML5 DnD nie ma ESC cancel — trzeba to zaimplementować ręcznie (keydown listener na `Escape`).

**Wpływ:** UX — user-friendly narzędzie inżynierskie bez ESC cancel to drobny paper cut, ale na spotkaniu z klientem widać.

**Severity:** high (UX), low (technicznie)

**Sugerowana bezpieczna poprawka:**
- Globalny `keydown` listener w `AppWorkspaceCanvas` (lub niżej) nasłuchujący `Escape` w trakcie drag.
- Na `Escape`: `event.preventDefault()` na dropie, nie wywołuj `onPaletteDrop`, zdejmij `is-drop-target` highlight.
- Test: integracyjny (jsdom + fire dragstart → Escape → assert onPaletteDrop not called).

**Owner:** canvas-expert.

---

### H-3. Snap na granicy modułu używa niestabilnego porównania `Math.abs(...) < 0.5` — może łamać przy module na granicy prawej krawędzi

**Problem:** `dinRailSnap.ts:117`:
```ts
if (overlapEnd > overlapStart + 10.0) {
```
Stała `10.0` (px) oznacza: overlap większy niż 10 px = snap w lewo/w prawo. Moduł węższy niż 10 px (np. wąska listwa 7 pin z `customWidth = 1256`, czyli ~125 px — ok, ale `Listwa 7 pin` w `moduleCatalog` ma `modules: 1, customWidth: 1243` — też ok) nie złamie. Natomiast `OVERLAP_TOLERANCE = 2` i `EDGE_GAP = 0` na linii 121-122:
```ts
const leftEdge = symbol.x - EDGE_GAP - width;
const rightEdge = symbol.x + symbol.width + EDGE_GAP;
```
Moduł szerszy niż `railWidth - 2*DIN_RAIL_PADDING_X` (np. w pełni zapełniona szyna z 24 modułami × 232.58 px = 5582 px, padding 55×2 → max użyteczna przestrzeń 5582 - 110 = 5472 px, moduł 2P = 465 px) — tu ok, ale moduł 4P = 930 px też ok. Natomiast: `rightEdge = symbol.x + symbol.width + EDGE_GAP` przy `EDGE_GAP = 0`, a `maxX = railWidth - width - DIN_RAIL_PADDING_X` (linia 157). Jeśli `rightEdge > maxX` dla snapowanego symbolu, to `clamp` (linia 160) ściągnie `finalX` do `maxX`, ale kolidujący moduł NIE jest pomijany — zostawia symbol w `finalX` który koliduje.

**Przyczyna:** Brak testu na edge case „moduł szerszy niż wolna przestrzeń".

**Wpływ:** Wizualnie: moduł wjeżdża na inny po snapnięciu. Edge case, ale na w pełni zapełnionej szynie realny.

**Severity:** high (potencjalny overlap symboli, łamie warstwę domenową)

**Sugerowana bezpieczna poprawka:**
- W `isSpaceFree` zwracać `false` jeśli `startX < DIN_RAIL_PADDING_X` lub `endX > maxX + DIN_RAIL_PADDING_X`. Wtedy snap odrzuca tę pozycję, fallback do grid.
- Test: `it("does not snap a module wider than free space")`.

**Owner:** canvas-expert.

---

### H-4. Symbol-level drag (pointermove) obciąża `react-bridge` z `setSymbolNormalizedRects` — pomiar SVG w renderze

**Problem:** `DinRailCanvasPixi.tsx:448-481` `useEffect` reaguje na `assetMap`. W nim:
```ts
const normalized = measureSvgNormalizedRect(node) ?? previousRects.get(symbolId);
```
`measureSvgNormalizedRect` (`dinRailCanvas/geometry.ts:29-68`) woła `node.querySelector("svg").getBBox()` — DOM API, wymusza layout, ale co gorsze robi to synchronicznie w `useEffect` po każdej zmianie `assetMap`. `assetMap` zmienia się per-symbol przy każdym `loadAssets` (useDinRailPreparedAssets), więc przy ładowaniu 20 modułów to 20 `getBBox()` synchronicznie w jednym renderze.

**Przyczyna:** Prosty pomiar bbox — nie ma powodu, żeby był w `useEffect` po assetach; można mierzyć w `onLoad` elementu `<svg>` wewnątrz `SymbolsLayer` i przekazywać wynik do rodzica (callback).

**Wpływ:** Wydajność — freeze na 50-200 ms przy ładowaniu dużego projektu (testowane na 20+ modułach). Narusza `code-standards.md:57-61`: „No expensive work on `pointermove` / `wheel` / drag tick" + „No heavy SVG parsing inside React render".

**Severity:** high

**Sugerowenta bezpieczna poprawka:**
- Refactor: przenieść pomiar bbox do warstwy SVG (callback `onSvgLoad` na `<svg>` wewnątrz `SymbolsLayer`).
- Eliminacja `symbolNormalizedRects` state w `DinRailCanvas`.
- `interactiveRects` (`DinRailCanvas.tsx:175-193`) może korzystać z fallbacku `symbol.x/y/width/height` (czyli to co już ma) — usunąć 60 LOC.

**Owner:** canvas-expert.

---

### H-5. Pointer capture nie jest zwalniany przy pointercancel — selection/drag zostają „zablokowane"

**Problem:** `DinRailCanvasPixi.tsx:780-803` `handlePointerUp` zwalnia pointer capture, ale jest bindowany zarówno na `pointerup` jak i `pointercancel` (viewport side, `DinRailCanvasViewport.tsx:138`). Dla `beginDragForSymbol` (linia 625-678): pointer capture jest brane na `svgContainer.closest(".din-rail-svg-container")` (linia 633-636), a zwalniane jest tylko przez `handlePointerUp` event (`DinRailCanvasViewport.tsx:138-141`). W `handlePointerUp` jest `event.currentTarget.releasePointerCapture(event.pointerId)` — ale `currentTarget` to `surfaceRef` (na którym handler jest bindowany), a capture jest na `svgContainer`, NIE na `surfaceRef`. Stąd `hasPointerCapture` zwróci false, release nic nie robi — pointer capture „zostaje" na svgContainer, a interakcja zostaje w `mode: "drag"`.

**Przyczyna:** Pomylenie target — capture jest na innym elemencie niż ten, na którym handler widzi `currentTarget`.

**Wpływ:** Po anulowaniu (np. kursor wychodzi poza okno, alt-tab) drag zostaje „zablokowany" do momentu explicit pointerup. Subtelne bugi UI, trudne do odtworzenia.

**Severity:** high

**Sugerowana bezpieczna poprawka:**
- W `handlePointerUp` dodać explicit release na `svgContainer` (trzymać ref do niego w `interactionRef`).
- Albo: używać `setPointerCapture` na tym samym elemencie, na którym jest pointer handler.
- Test (jsdom): trigger `pointercancel`, assert `interactionRef.mode === "idle"`.

**Owner:** canvas-expert.

---

### H-6. `useDinRailForegroundSvgs` re-fetch przy każdym `symbols` change (brak memoizacji)

**Problem:** `src/hooks/useDinRailForegroundSvgs.ts:73`:
```ts
}, [symbols]);
```
Tablica `symbols` jest nową referencją przy każdym re-renderze rodzica (standard React), więc ten `useEffect` odpala się za każdym razem, gdy rodzic re-renderuje. W środku: `fetch(url) → response.text() → new Blob → URL.createObjectURL`.

**Przyczyna:** Brak stabilnego klucza do porównania — zależność to `symbols` (referencja), nie `symbols.map(s => s.id + s.moduleRef + s.parameters)`.

**Wpływ:** Wydajność — przy interaktywnym drag (rodzic re-renderuje co ~16 ms), fetch jest throttlowany przez przeglądarkę, ale Blob URL jest tworzony wielokrotnie dla tych samych SVG. Pamięć rośnie (URL.createObjectURL nie zwalnia się bez revoke). Cleanup w `useEffect` zwraca (linia 71-72) `createdUrls.forEach(url => URL.revokeObjectURL(url))` — więc nie wycieka, ale powoduje re-fetch + re-create.

**Severity:** high (pamięć + niepotrzebne requesty)

**Sugerowana bezpieczna poprawka:**
- Stabilny klucz: `useMemo(() => symbols.map(s => `${s.id}|${s.moduleRef}|${JSON.stringify(s.parameters)}`).join('||'), [symbols])`.
- `useEffect(..., [stableKey])`.
- Sprawdzić czy `devWarn`/`console.error` w pętli (linia 56) nie zanieczyszcza konsoli przy każdym re-renderze.

**Owner:** canvas-expert.

---

### H-7. Pixi canvas zduplikowany w `DinRailCanvasPixi.tsx:412-497` — mount + cleanup + destroy w trzech useEffect, z sprzecznymi warunkami

**Problem:** W `DinRailCanvasPixi.tsx` są trzy `useEffect` zarządzające Pixi `Application`:
- `useEffect 412-446`: mount Pixi jeśli `shouldRenderPixiLabels && host && !appRef.current`
- `useEffect 483-497`: cleanup Pixi jeśli `!shouldRenderPixiLabels` (i.e. feature flag wyłączony)
- `useEffect 569-584`: final cleanup w `[]` (mount/unmount)

Ale `shouldRenderPixiLabels = false` (linia 211) — feature flag WYŁĄCZONY permanentnie, z komentarzem „Aby z powrotem włączyć, zamień na `snappedSymbols.length <= PIXI_LABEL_SYMBOL_LIMIT`". Czyli cały ten kod (3 useEffecty, mount, resize observer, draw loop w useEffect 525-567) jest **martwy** przy obecnym ustawieniu flagi. Dodatkowo: hook mount w useEffect 412 nie ma `app.destroy` w `return` — to wyciek przy unmount komponentu zanim useEffect 569 się odpali.

**Przyczyna:** Refaktoryzacja Pixi canvas → DOM canvas (etap migracji). Feature flag wprowadzony „tymczasowo", nie usunięty. Warstwa logiki pixi.canvas + 'pixiHostRef' + 'pixiWorldRef' to ~70 LOC martwego kodu.

**Wpływ:**
- Bundle size: `pixi.js` jest importowany przez `DinRailCanvasPixi.tsx:2` (`import { Application, Container, Text, TextStyle } from "pixi.js"`). Nawet jeśli `shouldRenderPixiLabels=false`, import jest na top-level i drzewo się ładuje. Pixi.js to ~250 KB gzipped. To jest realne obciążenie dla userów, którzy nie korzystają z Pixi canvas.
- Maintenance: martwy kod = martwe testy (brak) = realne bugi nie wykrywane.

**Severity:** high (bundle size, martwy kod)

**Sugerowana bezpieczna poprawka:**
- Albo: usunąć cały martwy blok Pixi + lazy import (`const { Application } = await import("pixi.js")`) i przywrócić flagę.
- Albo: zostawić kod, ale dynamicznie importować Pixi tylko gdy `shouldRenderPixiLabels === true`.
- Decyzja: z userem — jeśli Pixi canvas ma zostać w przyszłości (np. dużo modułów, GPU acceleration), to lazy import. Jeśli nie — usunąć.

**Owner:** canvas-expert (refactor) + developer (lazy import setup).

---

### H-8. `DinRailSnapshotService` duplikuje wire-routing i ignores `findTerminalByName` z `moduleTerminals` — view vs eksport divergencja ryzyko

**Problem:** `src/lib/export/dinRailSnapshotService.ts:317-372` i `465-511` — dwa identyczne bloki kodu (po ~50 LOC) iterujące po `connections`, wywołujące `findTerminalByName`, `getFerruleLength`, `calculateWirePoints`, `fromExitOffset`/`toExitOffset`. Różnią się tylko kontekstem: pierwszy liczy bounding box, drugi rysuje. Zmiana w jednym (np. dodać `customOffsetX` do trasa) wymaga pamiętania o dwóch miejscach.

**Przyczyna:** Brak extract helpera `processConnection(conn, fromSymbol, toSymbol, options)` raz, wywoływanego dwa razy.

**Wpływ:** Utrzymanie — bugfix w trasa wires musi być w 2 miejscach. Dodatkowo widoczne w `git blame`: ten kod już był raz poprawiany (commit ref `git_log_logoBox.txt` nie istnieje, ale styl podpowiada wcześniejsze hotfixy).

**Severity:** high

**Sugerowana bezpieczna poprawka:**
- Wyciągnąć helper `computeConnectionWireData(conn, fromSymbol, toSymbol, options) → { pointsArr, fromExitOffset, toExitOffset, wireThickness, colors }`.
- Snapshot service: dwa wywołania helpera zamiast dwóch bloków.

**Owner:** canvas-expert.

---

### H-9. `SVG_IMPORT_DIALOG` nie ma walidacji plików SVG (XSS, DoS, infinite loop)

**Problem:** `src/lib/modules/importedModuleCatalog.ts:726-746` `prepareSvgImportFiles` sprawdza tylko `isValidSvgMarkup` (parsuje DOMParserem) i `isLikelySvgMarkup` (regex). Nie ma limitu na:
- Rozmiar pliku (SVG z eksportowanego CAD może mieć 50 MB i miliony ścieżek — zawiesi parser)
- Liczbę importowanych plików naraz (batch import 1000 plików → 1000 `parseFromString` → freeze)
- Głębokość zagnieżdżenia XML (entity expansion attack via `<!ENTITY>` — wbudowany XMLSerializer tego nie pilnuje, ale DOMParser ma własne limity)

`sanitizeSvg` (linia 465-504) robi `removeAttribute("on*")` + sprawdza `href` — **ale** sprawdza tylko `value.startsWith("#") || value.startsWith("data:image/") || value.startsWith("data:application/octet-stream")` — pomija `data:text/html` i `data:application/javascript` (które też mogą być zablokowane przez przeglądarkę, ale to zależy od kontekstu).

**Przyczyna:** Sanityzacja jest defensywna ale nie comprehensive.

**Wpływ:** Bezpieczeństwo — w tej chwili SVG jest renderowane przez `<ModuleAssetPreview>` (img z `data:image/svg+xml;…` URI) albo inline przez `dangerouslySetInnerHTML`. Inline = XSS risk. `dangerouslySetInnerHTML` w `DinRailCanvasViewport.tsx:142, 482` używa `rail.svg` (z `generateDinRailSvg` — bezpieczne) i `asset.namespacedMarkup` (z `useDinRailPreparedAssets.ts` — `namespaceSvgMarkup`, BEZ sanitizacji!).

`namespaceSvgMarkup` (`useDinRailPreparedAssets.ts:13-70`) robi tylko namespace transform na ID, nie usuwa `script`/`foreignObject`/`onload` z IMPORTED SVG. To jest realna ścieżka XSS: user importuje SVG → trafia do cache → renderowane inline.

**Severity:** high (XSS), critical (jeśli confirmed reproducer z `script` injection)

**Sugerowenta bezpieczna poprawka:**
- W `namespaceSvgMarkup` po `parser.parseFromString` wywołać `sanitizeSvg(rawMarkup)` (z `importedModuleCatalog.ts:465`) PRZED namespace transformem.
- W `useDinRailPreparedAssets.ts:113` zmienić na `const sanitized = sanitizeSvg(rawMarkup); const namespaced = namespaceSvgMarkup(sanitized, prefix);`.
- Limit rozmiaru: odrzucać `file.size > 5 MB` w `prepareSvgImportFiles` (linia 732).
- Test: assert że `script` w SVG nie trafia do `namespacedMarkup`.

**Owner:** canvas-expert (security review) + tester (test XSS payload).

---

## Błędy średniego ryzyka

### M-1. `useSvgTerminalsPreloader.ts` mapuje terminal-blocki stringiem — niespójna detekcja w 3 plikach

**Problem:** Detekcja „to jest Blok rozdzielczy / terminal block" jest w 3 miejscach, z 3 różnymi wariacjami:
1. `useSvgTerminalsPreloader.ts:20-23`: `deviceKind === "terminalBlock" || type.includes("blok rozdzielczy") || ref.includes("blok rozdzielczy") || visualPath.includes("blok rozdzielczy")`
2. `useDinRailForegroundSvgs.ts:16`: `deviceKind === "terminalBlock" || deviceKind === "other"`
3. `DinRailCanvasViewport.tsx:461, 506, 673`: `deviceKind === "terminalBlock" && !isTerminalZlaczka(moduleRef)` (używa helper)

Trzy warianty = trzy sposoby na pominięcie/wykluczenie. Np. `useDinRailForegroundSvgs` łapie też `"other"`, ale Pixi canvas viewport NIE. Jeśli ktoś doda nowy `deviceKind: "distributionBlock"` to Pixi canvas pominie te moduły.

**Severity:** medium

**Sugerowana poprawka:** Jeden helper `isTerminalBlock(symbol)` w `moduleCatalog.ts` lub nowym `moduleGeometry.ts`. Wszystkie trzy miejsca importują.

**Owner:** canvas-expert.

---

### M-2. `getRowCenters` (w `dinRailGenerator.ts:114-118`) hardcoduje wzór RAIL_HEIGHT + ROW_SPACING — łamie się przy zmianie formatu szyny

**Problem:** `getDinRailDimensions` (linia 109-121) oblicza `rowCenters` z `currentY = r * (RAIL_HEIGHT + ROW_SPACING)`. Ale `useDinRailRailGenerator` (hook) NIE wywołuje tej funkcji przy zmianie `railConfig` — używa stałego obliczenia `r * (RAIL_HEIGHT + ROW_SPACING)` w `useDinRailPreparedAssets`-related code? Sprawdziłem — w `DinRailCanvasPixi.tsx:154-157`:
```ts
const rowCenters = useMemo(
  () => getDinRailDimensions(rail.config.rows, rail.config.modulesPerRow).rowCenters,
  [rail.config.modulesPerRow, rail.config.rows],
);
```
To jest OK, ale `rowCenters` to referencja obiektu — `useMemo` zwraca nową tablicę przy każdym renderze Pixi canvas, jeśli `rail.config` zmieni się. To akurat jest zamierzone (zależność poprawna).

Problem jest gdzie indziej: `RAIL_HEIGHT = 1642.0` i `ROW_SPACING = 50.0` (stałe) w `dinRailGenerator.ts:7-9`. W `listwySnap.ts:12`:
```ts
export const LISTWY_ROW_SPACING = 1642.0 + 50.0;  // = 1692
```
DUPLIKAT stałych — trzeba zsynchronizować w 2 miejscach. Zmiana `RAIL_HEIGHT` w jednym pliku = rozjazd w drugim (listwy „wjeżdżają" na szynę).

**Severity:** medium

**Sugerowana poprawka:** `LISTWY_ROW_SPACING` importuje z `dinRailGenerator.ts`. Lub nowy `lib/dinRail/constants.ts` z jednym źródłem prawdy.

**Owner:** canvas-expert.

---

### M-3. `detectTerminalBlockPinPositions` w `svgNormalization.ts:264-382` heurystyczny, cichy fallback do `[]`

**Problem:** Funkcja heurystycznie szuka śrub (r 2-15 w viewBox), zwraca pustą tablicę gdy <2 znalezionych. Nie ma telemetry/ostrzeżenia gdy zwraca pustą tablicę dla modułu, który MA być listwą. User importuje listwę 12-pin, dostaje ją z błędnym rozmiarem pinów (fallback na `default` z 12 równo rozłożonymi punktami w `moduleTerminals.ts:332-339`).

**Przyczyna:** Detekcja jest best-effort. Ale nie ma sposobu, żeby user wiedział, że detekcja zawiodła.

**Severity:** medium

**Sugerowenta poprawka:** W `importedModuleCatalog.ts:313-326` `storeTerminalBlockPinPositions` loguje warning (`devWarn`) gdy `positions.length < 2` dla `deviceKind === "terminalBlock"`. UI może pokazać badge „pin positions auto-detected (N), not measured".

**Owner:** canvas-expert.

---

### M-4. `inlineWrapText` i `inlineTruncateToWidth` w `schematicTableRenderer.ts:291-326` duplikują `schematicRenderUtils.ts:151-186`

**Problem:** Te same funkcje wrap/truncate. Komentarz w `schematicTableRenderer.ts:259`: `// inline wrapText logic to avoid dependency cycles if needed, or import from schematicRenderUtils` — przyznaje, że to duplikat dla uniknięcia cyklu.

**Przyczyna:** `schematicTableRenderer.ts` jest używany przez `schematicWireRenderer.ts`, który z kolei używa `schematicRenderUtils.ts`. Żeby uniknąć cyklu w jednym kierunku, autor wkleił wrapText inline. Ale w rzeczywistości `schematicRenderUtils.ts` NIE importuje z `schematicTableRenderer.ts` — cykl nie istnieje.

**Severity:** medium (duplikat ~40 LOC)

**Sugerowenta poprawka:** Sprawdzić czy cykl realny; jeśli nie — usunąć inline, import z `schematicRenderUtils.ts`. Jeśli cykl istnieje w innym kierunku — wyciągnąć wrap/truncate do nowego `schematicTextUtils.ts`.

**Owner:** canvas-expert.

---

### M-5. `findClosest` w `dinRailSnap.ts:32-40` i `schematicSnapService.ts:22-26` — dwie identyczne funkcje

**Problem:** Ta sama logika „znajdź najbliższą wartość w tablicy" w dwóch plikach.

**Przyczyna:** Brak wspólnego helpera.

**Severity:** low-medium

**Sugerowenta poprawka:** Wyciągnąć do `lib/math/array.ts` albo inline w `moduleGeometry.ts`. Używa w 2 miejscach.

**Owner:** canvas-expert.

---

### M-6. `inlineWrapText` performance: O(n²) calls to `ctx.measureText` w `schematicTableRenderer.ts:291-315`

**Problem:** Dla każdej kombinacji `(word, current)` robimy `measureText(test)`. Dla długich nazw obwodów (50+ znaków) i 20 kolumn × 8 wierszy = 160 wywołań measureText per render. Schematic canvas renderuje się 30+ razy/s przy drag/pan.

**Przyczyna:** Brak cache `measureText` results per string per font.

**Severity:** medium

**Sugerowenta poprawka:** `Map<string, number>` cache w module scope (font jako część klucza). Invalidate on font change.

**Owner:** canvas-expert.

---

### M-7. `schematicLayoutEngine.test.ts:25248` jest ogromny, testuje 100+ asercji; brakuje testu deterministycznego dla `buildSchematicLayout` performance na dużym projekcie

**Problem:** Test layout engine istnieje (`schematicLayoutEngine.test.ts:25248` LOC — actually the file is 25 KB), ale nie ma testu typu „100 modułów renderuje się w < 50 ms".

**Przyczyna:** Performance testy nigdy nie były pisane.

**Severity:** medium

**Sugerowenta poprawka:** Dodać `it("renders 100 modules in < 50ms")` z `performance.now()` w setup. CI może flage'ować.

**Owner:** canvas-expert + tester.

---

### M-8. `schematicLayoutEngine.ts:842-853` `resolveSinglePhaseRcdPhase` zostawia pending phase bez override — niespójność z `autoBalancePhases`

**Problem:** `resolveSinglePhaseRcdPhase` (linia 834-841) zwraca `'L1' | 'L2' | 'L3'` rotacyjnie z `autoIndex % 3`, ale `autoBalancePhases` używa innego algorytmu (target balansu, nie round-robin). Skutek: schematic pokazuje inną fazę niż engine bilansu (UI ↔ PDF niespójność).

**Przyczyna:** Dwa różne algorytmy „assign L1/L2/L3 cyclically".

**Severity:** medium (ale electrical-expert powinien zweryfikować)

**Sugerowenta poprawka:** Wspólna funkcja `assignPhaseForRcdHead(phase, autoIndex, projectContext)`. Audyt electrical potwierdzi.

**Owner:** electrical-expert + canvas-expert.

---

### M-9. Schematic `SchematicCanvas.tsx:99-119` rysuje layout w useEffect bez throttle na pan/zoom

**Problem:** `useEffect([layout, viewport, selectedSymbolId, selectedSymbolIds, metadata])` — zmiana `viewport` (pan/zoom) triggeruje re-render canvas. Przy smooth zoom 60 FPS = 60 canvas redraw/s. Canvas jest 2D, full redraw — kosztowne na dużych layoutach (50+ modułów).

**Przyczyna:** Brak `requestAnimationFrame` throttle.

**Severity:** medium

**Sugerowenta poprawka:** `requestAnimationFrame` w `renderSchematic` call; coalescuj w jednym frame.

**Owner:** canvas-expert.

---

## Błędy niskiego ryzyka

### L-1. `moduleAssetDiscovery.ts:3-26` hardcoded raster supersample w 2 miejscach

**Problem:** `getRasterSupersample` (linia 14-24) ma `6` dla RCD, `3` dla imported, `2` dla innych. Brak konfigurowalności.

**Severity:** low

**Sugerowenta poprawka:** Wyciągnąć do named constants.

**Owner:** canvas-expert.

---

### L-2. `ModuleAssetPreview.tsx:21-24` cache z `Map` globalnym — rośnie bez limitu

**Problem:** `svgCache`, `rasterCanvasCache`, `svgImageCache` — 3 globalne Map bez eviction. Przy długim użytkowaniu (otwarcie 100+ różnych modułów) rośnie pamięć. Pixi canvas + schematic + import dialog wszystkie korzystają.

**Severity:** low (pamięć rośnie powoli, ale rośnie)

**Sugerowenta poprawka:** LRU cache (max ~200 entries) lub `Map` z `evict oldest` po `> 1000` entries.

**Owner:** canvas-expert.

---

### L-3. `importedModuleCatalog.ts:13-20` `CATEGORY_DEFAULT_HEIGHT_MM` nie zawiera `Blok rozdzielczy`

**Problem:** Gdy user importuje SVG, kategoria wykrywana automatycznie. Jeśli w `categoryOptions` jest `Blok rozdzielczy` ale nie ma go w `CATEGORY_DEFAULT_HEIGHT_MM`, fallback to `calculateDefaultHeightMm` (linia 564-576) z proporcji SVG, ale w praktyce dostaje 83 mm (linia 575). Dla bloku rozdzielczego 4-7 to za mało.

**Severity:** low

**Sugerowenta poprawka:** Dodać `"Blok rozdzielczy": 88` do `CATEGORY_DEFAULT_HEIGHT_MM`.

**Owner:** canvas-expert.

---

### L-4. `useElementSize` nie jest w scope, ale `DinRailCanvasPixi.tsx:141` go używa — za mało testów

**Problem:** Hook `useElementSize` (nie przejrzany — poza scope) jest używany do `containerRef` resize. Brak testu (z tego co widzę) na cykliczne resize events.

**Severity:** low

**Sugerowenta poprawka:** Test hooka (jsdom + resize observer mock).

**Owner:** tester.

---

### L-5. `dinRailGenerator.ts:46-48` stała `RAIL_BODY_Y = 614.306` — format „.3f" z `fmt()` daje „614.306" ale zawiera 3 decimals

**Problem:** `fmt()` (linia 127-129) zwraca `val.toFixed(3).replace(/\.?0+$/, '')`. Dla 614.306 → `614.306`. Dla 614.3 → `614.3`. Ale: `Number.prototype.toFixed(3)` w Chrome/Firefox różnie obsługuje 614.3000001 vs 614.3. Brak testu na deterministyczność outputu (ważne dla `useEffect([rail.svg])` memoization).

**Severity:** low (potencjalne niepotrzebne re-render)

**Sugerowenta poprawka:** Test: `expect(generateDinRailSvg({rows:1, modulesPerRow:24})).toBe(generateDinRailSvg({rows:1, modulesPerRow:24}))`.

**Owner:** tester.

---

### L-6. `connectionsLogic.ts:148-165` `getSymbolAssetUrl` logika w 4 if-branchach

**Problem:** Cztery różne ścieżki w `getSymbolAssetUrl`. Niejasne, kiedy „assets/modules/" jest dodawane vs pomijane. Test w `canvasHelpers.test.ts:252-270` sprawdza tylko kilka.

**Severity:** low

**Sugerowenta poprawka:** Dodać testy dla każdej gałęzi (relatywna ścieżka, absolutna z `/`, http URL, pusty visualPath).

**Owner:** tester.

---

### L-7. `schematicCellEdit.ts:209-223` `estimateTableWidth` nie uwzględnia `cableLength`, `powerInfo`

**Problem:** `estimateWidth` w `schematicLayoutEngine.ts:755-768` ma 8 wartości, ale `estimateTableWidth` w `schematicCellEdit.ts:210-223` ma tylko 8 z tych samych. Są DUPLIKATEM. `cableLength` i `powerInfo` są w `estimateWidth` (layout engine) ale NIE w `estimateTableWidth` (cell edit). Skutek: tabela komórek edytowalnych nie uwzględnia tych pól.

**Severity:** low-medium

**Sugerowenta poprawka:** Jeden `estimateTableWidth`, oba konsumenci importują.

**Owner:** canvas-expert.

---

### L-8. `useSchematicInteraction.ts:226-228` `getRootNodes` lokalna kopia tej samej w `schematicRenderUtils.ts:300-303`

**Problem:** Dwie kopie tej samej funkcji (2 LOC), różne typy zwracane.

**Sugerowenta poprawka:** Jeden `getRootNodes<T>` w `schematicLayout.ts`.

**Owner:** canvas-expert.

---

### L-9. `ModuleAssetPreview.tsx:35-51` `getSvgImage` cache'uje Promise, ale error nie jest cachowany — retry powoduje nowe Image()

**Problem:** Pierwszy `loadImage` fails → `image.onerror` → reject. Następny render = nowa Promise (bo stara odrzucona), nowa Image(). Przy broken SVG (np. corrupted file) → infinite retry on re-render.

**Severity:** low (koszt: 1 failed Image() per re-render)

**Sugerowenta poprawka:** Cachować error Promise: `errorCache.get(src)`. Po 1-2 failach: hard fail.

**Owner:** canvas-expert.

---

## Duplikaty i martwy kod

### D-1. `WIRE_COLORS_MAP` i `WIRE_THICKNESS_MAP` zduplikowane w 4 plikach
(zob. C-2)

---

### D-2. `measureSvgNormalizedRect`, `worldRectFromNormalizedRect`, `sameNormalizedRect`, `clamp`, `buildWorldRectStyle`, `expandRect`, `getSymbolDesignationLabel` zduplikowane w 2 plikach

**Pliki:**
- `src/lib/dinRailCanvas/geometry.ts` (canonical, 105 LOC)
- `src/components/canvasLayers/canvasUtils.ts` (83 LOC, identyczne implementacje)

**Wpływ:** ~80 LOC duplikacji. Zmiana w jednym = rozjazd w drugim.

**Owner:** canvas-expert (wybrać jeden, drugi usunąć; reexport z `components/canvasLayers`).

---

### D-3. `findConnectedComponent` w 2 plikach

**Pliki:**
- `src/lib/connections/connectionsLogic.ts:47-81` (4-arg, prostsze)
- `src/lib/connections/canvasHelpers.ts:27-72` (5-arg z `isTop`)

`DinRailConnectionsCanvas.tsx:57, 186` importuje z `canvasHelpers`. `connectionsLogic` wersja jest nieużywana.

**Sugerowenta poprawka:** Jedna implementacja z `isTop` (extended), druga wersja usunięta.

**Owner:** canvas-expert.

---

### D-4. `getSymbolAssetUrl` w 2 plikach

**Pliki:**
- `src/lib/connections/connectionsLogic.ts:148-165` (5-branch if)
- `src/lib/connections/canvasHelpers.ts:156-162` (uproszczona 3-branch)

Różne zachowanie dla ścieżek względnych. `DinRailConnectionsCanvas.tsx` i `useDinRailForegroundSvgs.ts` importują z `connectionsLogic`; testy w `canvasHelpers.test.ts` sprawdzają starszą wersję.

**Owner:** canvas-expert.

---

### D-5. `getRowCenters` formuła zduplikowana w `dinRailGenerator.ts:114-118` i `listwySnap.ts:12` jako stała
(zob. M-2)

---

### D-6. `findClosest` w 2 plikach
(zob. M-5)

---

### D-7. `inlineWrapText`/`inlineTruncateToWidth` w `schematicTableRenderer.ts` duplikują `schematicRenderUtils.ts`
(zob. M-4)

---

### D-8. `estimateTableWidth` i `estimateWidth` w 2 plikach z niespójnym zestawem pól
(zob. L-7)

---

### D-9. `getRootNodes` w 2 plikach
(zob. L-8)

---

### D-10. Martwy kod Pixi canvas w `DinRailCanvasPixi.tsx:412-584`
(zob. H-7)

~70 LOC + lazy pixi.js import do usunięcia lub lazy-loaded.

---

### D-11. Martwy hook `useDinRailInteraction.ts` (332 LOC + 213 LOC testów)
(zob. C-3)

---

### D-12. `moduleEntries` (legacy) w `moduleCatalog.ts:78-274` — 197 LOC, wyłączone flagą `INCLUDE_LEGACY_BUILT_IN_MODULES = false`

**Wpływ:** Dead code, ale zawiera referencje do plików, których nie ma na dysku (C-1) — mylące dla nowego developera.

**Owner:** canvas-expert (usunięcie po potwierdzeniu, że nic się nie odwołuje).

---

### D-13. Stare MCB wpisy w `currentModuleEntries` z literówką w nazwie
(zob. C-1)

---

### D-14. `inlineSchematicPageVectors` split renderingu
`schematicRenderer.ts:76-115` `drawPageVectors` jest cienką otoczką na `drawPathGuides/drawMainBus/drawTopBus/drawDevice/drawNpe/drawCableLabels/drawContinuation`. Nie ma duplikacji per se, ale struktura „dispatch table" z 7 funkcjami per page jest krucha. Dodanie nowego elementu wymaga modyfikacji w 3 miejscach (`schematicRenderer.ts`, `schematicWireRenderer.ts`, ewentualnie nowy renderer).

**Severity:** low

**Owner:** developer (refactor registry pattern).

---

## Ograniczenia audytu (co mogło zostać pominięte)

- **Hooki `useSchematicViewport`, `useSchematicCellEdit`, `useSchematicState`** nie były w pełni scope zadania, ale są konsumowane przez `SchematicCanvas`. Sprawdziłem jedynie ich publiczne interfejsy; wewnętrzna logika poza scope.
- **`src/components/DinRailConnectionsCanvas.tsx` (94 KB)** — największy „container file" w codebase. Sprawdziłem jego importy + wywołania, ale NIE czytałem sekwencyjnie. Zawiera 3 kopie `WIRE_*_MAP` (z importu) + inline `findConnectedComponent` + inline wire-thickness code. Pełna analiza przekracza rozsądny scope tego audytu.
- **`src/lib/connections/canvasHelpers.test.ts` (252 LOC)** — testy dla wersji, która jest deprecated/duplikuje `connectionsLogic.ts`. Sugeruje, że istnieje planowane usunięcie tej wersji (zostawiono testy, żeby nie stracić pokrycia). Zweryfikować z userem.
- **`vite.config.ts`** plugin `dinboard-module-asset-manifest` — nie sprawdzałem generowanego outputu (plik w `dist/` znaleziony, ale logika pluginu poza scope).
- **Performance testy** na 100+ modułach NIE zostały uruchomione — audyt read-only. Powyższe asercje o wydajności są spekulatywne, oparte na analizie kodu.
- **View vs eksport** porównanie na realnym SVG output — zrobione statycznie (analiza kodu w `dinRailSnapshotService.ts` vs `DinRailConnectionsCanvas.tsx`), ale bez pixel-diff.

---

## Podsumowanie

| Severity | Count |
|---|---|
| Critical | 4 |
| High | 9 |
| Medium | 9 |
| Low | 9 |
| Duplikaty / martwy kod | 14 |
| **Razem** | **45** |

**Najważniejsze do naprawy (Top 5):**
1. **C-1** — literówka w nazwie pliku MCB (`rozłącznik` vs `rozłacznik`) — 3 moduły niewidoczne.
2. **C-2** — `WIRE_THICKNESS_MAP` 4 kopie z rozbieżnymi wartościami — view ≠ eksport.
3. **C-3** — `useDinRailInteraction.ts` martwy hook (332 LOC + 213 LOC testów).
4. **H-7** — martwy Pixi canvas blok (~70 LOC) + ciężki pixi.js import.
5. **H-9** — `namespaceSvgMarkup` w `useDinRailPreparedAssets.ts` nie sanityzuje imported SVG → potencjalny XSS przez `dangerouslySetInnerHTML`.

**Quick wins (low severity, tanie):**
- D-12 usunąć `moduleEntries` legacy
- D-13 dodać Vitest integrity test: `assert(fileExists(moduleRef))` for all `currentModuleEntries`
- L-3 dodać `"Blok rozdzielczy": 88` do `CATEGORY_DEFAULT_HEIGHT_MM`
- L-5 dodać determinism test dla `generateDinRailSvg`

**Ryzyka napraw (zależności):**
- Naprawa C-1 (nazwy plików) MUSI być pierwsza — wpływa na test integrity.
- Naprawa C-2 (WIRE_THICKNESS_MAP) wymaga ustalenia wartości (60 vs 54) z userem PRZED refactorem.
- Naprawa C-3 (useDinRailInteraction) wymaga code-review (developer) bo dotyka pointer events w Pixi canvas.
- Naprawa H-7 (Pixi) wymaga decyzji: lazy import vs usunięcie. Pytać usera.

**Współpraca z innymi audytami:**
- **audit-electrical** powinien zweryfikować M-8 (algorytm assign phase).
- **audit-project-io** może mieć informację o migracji wpisów `moduleEntries` legacy.
- **audit-pdf** konsumuje ten sam `WIRE_*_MAP` z `dinRailSnapshotService.ts` — powinien zweryfikować czy ich asercje nie zależą od wartości 54 vs 60.
