# Plan: Włączenie zakładki "Połączenia" na urządzeniach mobilnych

**Data:** 2026-07-19
**Autor:** Mavis (audit) — do konsultacji z zewnętrznym agentem (Claude Opus)
**Status:** Draft v1 — czeka na review

---

## 1. TL;DR

Zakładka "Połączenia" (`sheet1_connections` → `DinRailConnectionsCanvas`) jest celowo wyłączona na platformach natywnych (`AppSheetTabs.tsx:32`). Powód: cały pipeline interakcji (pan, zoom, draw, delete) jest zaprojektowany pod **mysz + klawiaturę**, nie pod palec. Audyt wykazał 3 problemy 🔴 (show-stoppery) i 4 problemy 🟡 (użyteczność) na touchu.

**Rekomendacja:** nie włączać zakładki as-is. Najpierw dowieźć P0 (pinch-zoom + gest separation + anuluj), potem włączyć.

**Wysiłek:** ~2-3 dni robocze (senior TS, z testami i refaktorem `useConnectionsMutations`).

**Kto powinien to zrobić:** rein `canvas-expert` (per AGENTS.md §"Routing quick reference"). Ten plan jest gotowy do przekazania.

---

## 2. Kontekst

- `DinRailConnectionsCanvas.tsx` (18 KB) renderuje widok połączeń elektrycznych (drutowanie) na szynie DIN.
- Render = SVG z 8 warstwami: tło szyny, moduły bazowe, przewody, ferrules, moduły wierzchnie, preview rysowania, foreground terminali, hotspoty, hit-targets.
- Interakcje: pan (przeciąganie), zoom (kółko myszy), draw wire (tap na hotspot → drag → tap na drugi hotspot), drag-handle (regulacja trasy), drag-segment (przesuwanie odcinka), delete (Delete/Backspace), undo ostatniego punktu (prawoklik).
- Istnieje gotowy wzorzec pinch-zoom w `src/components/measurementProtocols/PinchZoomImage.tsx` (ale NIE jest używany w connections canvas).
- `ConnectionsLeftPanel.tsx` (16 KB) ma panel właściwości wybranego przewodu + przycisk "Usuń przewód" (linia 160), ale **nie ma listy wszystkich połączeń** — żeby usunąć, trzeba najpierw wybrać.

---

## 3. Audyt: co działa / co nie

### 3.1 Działa na touchu ✅

| Element | Plik:linia | Komentarz |
|---|---|---|
| `touchAction: "none"` na SVG | `DinRailConnectionsCanvas.tsx:338` | Blokuje scroll/zoom strony podczas rysowania |
| Pointer Events API | wszędzie | `onPointerDown/Move/Up` działa dla myszy i dotyku |
| Hit-target circles | `DinRailHitTargets.tsx:13-15` | Promień 38/46/56 px — palec trafi |
| `SchematicZoomDock` (zoom +/-/fit) | `SchematicZoomDock.tsx` | Przyciski działają na tap |
| Initial fit-to-rail | `useConnectionsViewport.ts:31-46` | Centruje niezależnie od rozmiaru kontenera |

### 3.2 Show-stoppery 🔴 (bez tego UX się sypie)

#### 🔴 3.2.1 Brak pinch-to-zoom

`useConnectionsHotkeys.ts:32-37` obsługuje wyłącznie `wheel`. Zero obsługi 2-palców. Użytkownik na telefonie widzi rozdzielnicę z 20 modułami i jedynym narzędziem zoomu są 3 małe przyciski w docku.

**Referencja istniejącego rozwiązania:** `PinchZoomImage.tsx:115-200` ma pełną obsługę 2-palce pinch + pan + double-tap-to-zoom z natywnymi listenerami `{ passive: false }` (krytyczne — React synthetic events są passive od v17).

#### 🔴 3.2.2 Kolizja gestów: 1 palec = draw LUB pan

`useConnectionsMutations.ts:107-114`: 1 palec na tle SVG → pan. Ale ten sam `e.button === 0` z `drawingState` (linie 76-104) → rysowanie. A hotspoty w `DinRailHitTargets.tsx:36` reagują na `onPointerDown` od 1 palca.

Żeby przesunąć widok palcem, trzeba trafić w tło SVG z precyzją pikselową (warunek `e.currentTarget === e.target`). Na telefonie to ruletka.

**Wzorzec do skopiowania** (z `PinchZoomImage.tsx:115-200`):
- **1 palec** = draw / tap na hotspot
- **2 palce** = pan + zoom

#### 🔴 3.2.3 Brak możliwości usunięcia przewodu palcem

`useConnectionsHotkeys.ts:62-72` — delete na `Delete`/`Backspace`. Klawiatury na tablecie/phone nie ma. Prawoklik też zablokowany (`DinRailConnectionsCanvas.tsx:340`: `onContextMenu={e.preventDefault()}`). Long-press domyślnie wywołałby context menu — ale jest zablokowany i nie ma handlera.

`ConnectionsLeftPanel.tsx:88-94, 160` ma przycisk "Usuń przewód" **dla zaznaczonego przewodu** — ale żeby zaznaczyć, trzeba trafić w przewód (cienka linia SVG), co na telefonie jest trudne.

### 3.3 Problemy użyteczności 🟡

#### 🟡 3.3.1 Brak przycisku "Anuluj" podczas rysowania

`useConnectionsHotkeys.ts:48-50` — Escape anuluje rysowanie. Podczas `drawingState` user widzi tylko rubber-band i ewentualnie ostrzeżenie elektryczne (`drawingWarning` div). Zero przycisku "Anuluj" w HUD.

#### 🟡 3.3.2 Brak "cofnij ostatni punkt trasy" na touchu

`useConnectionsMutations.ts:65-75` — prawoklik cofa ostatni `explicitPoint`. Na touch: nic. Trzeba albo dodać przycisk "Cofnij" w HUD podczas rysowania, albo double-tap na tło = cofnij.

#### 🟡 3.3.3 Brak toggle kierunku podłączenia (Space)

`useConnectionsHotkeys.ts:53-61` — Space przełącza `isToTop`. Prawdopodobnie częściowo rozwiązane przez lewy panel (edytor właściwości zaznaczonego przewodu), ale wymaga weryfikacji.

#### 🟡 3.3.4 Snapping distance za mały

`useConnectionsMutations.ts:235`: `minDist = 36` (w world coords). Przy `zoom = 0.3` (initial fit) to **~11 px na ekranie** — loteria. Przy zoom 1.0 jest OK. Trzeba liczyć w screen coords z uwzględnieniem aktualnego zoomu albo zwiększyć threshold.

---

## 4. Decyzje architektoniczne (do potwierdzenia z Opusem)

### 4.1 Czy dodawać 2-palce pinch-zoom, czy tylko gest separation?

**Opcja A:** Pełny pinch-zoom (mirror z `PinchZoomImage.tsx`).
- Koszt: ~1 dzień
- Wartość: 10x lepszy UX, naturalny mobile flow
- Rekomendacja: ✅ TAK — bez tego mobile jest nieużyteczny dla >10 modułów

**Opcja B:** Tylko "2 palce = pan, 1 palec = draw".
- Koszt: ~0.5 dnia
- Wartość: rozwiązuje kolizję gestów, ale zoom nadal przez dock
- Rekomendacja: ❌ NIE — to półśrodek, user wraca do telefonu po kilku minutach

**Opcja C:** Nowy dedykowany komponent `ConnectionsViewport` z własnym touch handlerem.
- Koszt: ~1.5 dnia
- Wartość: czysta separacja, testowalne
- Rekomendacja: 🤔 do dyskusji — zależy czy `useConnectionsViewport` ma inne use case

### 4.2 Jak rozwiązać delete wire na touchu?

**Opcja A:** Dodać listę połączeń w `ConnectionsLeftPanel` (po lewej stronie), tap na wiersz = select, długi przycisk "Usuń" obok.
- Koszt: ~3h (panel i tak tam jest, rozszerzenie o listę)
- Rekomendacja: ✅ TAK — rozwiązuje problem precyzji tap na przewód

**Opcja B:** Long-press na przewodzie → context menu z "Usuń" / "Zmień kierunek" / "Właściwości".
- Koszt: ~2h
- Wartość: bardziej naturalny gest, ale trzeba rozróżnić long-press od drag-handle (który też jest drag z hotspotem)
- Rekomendacja: 🤔 drugie miejsce — long-press ma sens dopiero po A

**Opcja C:** Tap na przewodzie (z dużym hit-tolerance ~20 px) → otwiera akcje w HUD u dołu ekranu.
- Koszt: ~2h
- Wartość: dobre dla desktop, na mobile wymaga dużego hit-tolerance
- Rekomendacja: 🟡 przemyślane rozwiązanie jeśli A zostanie odrzucone

### 4.3 Czy refaktorować `useConnectionsMutations`?

Aktualnie 19 KB, jeden `handlePointerMove` obsługuje 4 stany (pan / draw / drag-handle / drag-segment). Dodanie nowej logiki 2-palce to ~150 LOC w środku istniejącego pliku.

**Rekomendacja: ✅ TAK** — rozbić na sub-handlery, każdy z własnym `useEffect` na native listener. To daje:
- testowalność (każdy stan ma czysty input/output)
- redukcję LOC w `handlePointerMove` z ~250 do ~50
- łatwość dodawania kolejnych gestów (np. 3-palce fit-to-rail)

Wzorzec: native `addEventListener` z `{ passive: false }` w `useEffect` (jak w `PinchZoomImage.tsx:222-237`).

### 4.4 Czy pisać testy?

**Tak**, AGENTS.md wymaga. Obecny baseline: 249 unit testów. Zakres nowych testów:
- `useConnectionsViewport` — pinch distance → zoom factor (czysta funkcja, łatwe)
- `useConnectionsMutations` — gest state machine (trudniejsze, bo zależne od PointerEvent)
- `ConnectionsLeftPanel` — lista połączeń + delete
- `DinRailHitTargets` — hit radius (calculateScreenSnapDistance)

---

## 5. Plan implementacji (fazy)

### Faza 0: Przygotowanie (0.5 dnia)

- [ ] Przeczytać `PinchZoomImage.tsx` end-to-end (zrozumieć wzorzec natywnych listenerów)
- [ ] Przeczytać `useConnectionsMutations.ts` w całości (jest w AGENTS.md jako "container file" 19 KB)
- [ ] Sprawdzić czy `ConnectionsLeftPanel` ma już jakąś listę (już sprawdziłem — nie ma)
- [ ] Sprawdzić test setup (`vitest.setup.ts`, `@testing-library/react`)
- [ ] Skonsultować ten plan z `canvas-expert` reinem

### Faza 1: Refaktor `useConnectionsMutations` (1 dzień)

Rozbić `handlePointerDown/Move/Up` na osobne sub-handlery:

```
hooks/connections/
├── useConnectionsMutations.ts          (orkiestracja, trzyma state)
├── usePointerGestureState.ts           (1 vs 2 palce, ref-y do gestu)
├── useConnectionsPanZoom.ts            (2-palce pan/zoom — mirror PinchZoomImage)
├── useConnectionsDraw.ts               (1-palec: tap na hotspot → draw)
├── useConnectionsDragHandle.ts         (drag-handle, drag-segment — mała zmiana)
└── useConnectionsHotkeys.ts            (klawiatura — bez zmian)
```

Dodanie `usePointerGestureState`:
```ts
type GestureState =
  | { kind: "idle" }
  | { kind: "single-touch-draw"; touchId: number }
  | { kind: "two-touch-panzoom"; touchId1: number; touchId2: number; initialDistance: number; initialZoom: number; initialPan: {x:number; y:number}; centerX: number; centerY: number };

// native touchstart listener { passive: false }
// → zapobiega 1-palec pan w handlePointerDown (gate: if touch count > 0, return)
// → przejmuje pan/zoom w handlePointerMove
```

**Testy:**
- `usePointerGestureState.test.ts` — transitions idle → single → two → idle

### Faza 2: Pinch-zoom (0.5 dnia)

W `useConnectionsPanZoom.ts` (lub bezpośrednio w `useConnectionsViewport.ts`):
- Nowe natywne listenery: `touchstart`, `touchmove`, `touchend` z `{ passive: false }` na `svgRef.current`
- Reuse wzorca z `PinchZoomImage.tsx:115-200`
- Reuse `zoomAround` z `useConnectionsViewport.ts:62-83` (już jest!)
- Nowy limit zoom: min 0.05, max 4.0 (zostawić, dopasować do istniejącego)

**Testy:**
- `useConnectionsViewport.pinch.test.ts` — symulacja 2 touch events, sprawdzić czy `setViewport` wywołany z poprawnym zoomem

### Faza 3: Gest separation (0.5 dnia)

W `useConnectionsMutations.ts`:
- `handlePointerDown`: jeśli `usePointerGestureState` zwraca `two-touch-panzoom`, **return early** (nie tłum pan)
- `handlePointerMove`: jeśli stan to `two-touch-panzoom`, **return early** (nie rysuj preview, nie przenoś hotspotu)
- `handlePointerUp`: tylko jeśli `single-touch-draw` → commit / cancel draw

**Testy:**
- integracja: 2 palce → 1 palec → draw się zaczyna od nowa
- pan tylko w trybie 2-palców

### Faza 4: HUD "Anuluj" + "Cofnij punkt" (0.5 dnia)

Nowy komponent `canvasLayers/DinRailDrawingActions.tsx`:
- Wyświetlany tylko gdy `drawingState !== null`
- Przycisk "Anuluj" → wywołuje `cancelDrawing()` (już istnieje w `useConnectionsDrawing.ts`)
- Przycisk "← Cofnij punkt" → wywołuje `setExplicitPoints(prev => prev.slice(0, -1))`
- Style: floating bottom-center, jak `SchematicZoomDock`

**Testy:**
- snapshot test komponentu

### Faza 5: Lista połączeń w `ConnectionsLeftPanel` (0.5 dnia)

Dodać sekcję "Lista połączeń" w `ConnectionsLeftPanel.tsx`:
- Tytuł sekcji: "Połączenia" z badge'em liczby
- Lista: każdy wiersz = ikona koloru drutu + `from.symbol → to.symbol` + tap = select
- Wiersz zaznaczony = podświetlenie + przycisk "Usuń" inline
- Scrollowalna, max-height z `overflowY: auto`

**Testy:**
- render: 0 połączeń → "Brak połączeń"
- render: 3 połączenia → 3 wiersze, tap na 2 = select
- delete: tap "Usuń" → callback z 2 połączeniami

### Faza 6: Snapping distance w screen coords (0.25 dnia)

W `useConnectionsMutations.ts:235`:
```ts
// BYŁO:
let minDist = 36;  // world coords

// BĘDZIE:
let minDist = 36 / zoom;  // adjust to world coords for given zoom
// Albo lepiej: liczyć w screen coords
const minScreenDist = 36; // 36 px na ekranie
for (const hs of allHotspots) {
  const screenDx = (hs.absX * zoom + pan.x) - screenX;
  const screenDy = (hs.absY * zoom + pan.y) - screenY;
  const screenDist = Math.sqrt(screenDx*screenDx + screenDy*screenDy);
  if (screenDist < minScreenDist) { ... }
}
```

**Testy:**
- snapping przy zoom 0.3: hit w 11 px screen → snap
- snapping przy zoom 1.0: hit w 36 px screen → snap

### Faza 7: Włączenie zakładki + testy integracyjne (0.5 dnia)

W `AppSheetTabs.tsx:32-34`:
- Usunąć warunek `Capacitor.isNativePlatform()` dla `sheet1_connections`
- Dodać `// WHY: enabled na mobile od 2026-07-XX, wymaga pinch-zoom + listy połączeń`
- Dodać test renderowania na mobile viewport (`describe("on Capacitor native")`)

E2E (jeśli są):
- `e2e/mobile-connections.spec.ts` — uruchomienie symulowanego viewportu 375x812, kliknięcie zakładki, pinch, draw wire, delete

### Faza 8: Cleanup + dokumentacja (0.25 dnia)

- Update `AGENTS.md` §9 (SmartHome) jeśli dotyczy — raczej nie, ale sprawdzić
- Update `docs/distribution-roadmap.md` — dodać wpis do release notes
- Comment cleanup: każdy nowy moduł z `// WHY:`

---

## 6. Strategia testowa

### 6.1 Unit testy (Vitest + jsdom)

| Plik | Co testuje | Nowe/zmienione |
|---|---|---|
| `usePointerGestureState.test.ts` | State machine: idle → single → two → idle | nowy |
| `useConnectionsViewport.pinch.test.ts` | 2-palce → zoom + pan | nowy |
| `useConnectionsMutations.test.ts` (rozbudowa) | Gest routing: 1 vs 2 palce | rozbudowa |
| `ConnectionsLeftPanel.test.tsx` | Lista + delete | nowy |
| `DinRailDrawingActions.test.tsx` | Anuluj + Cofnij | nowy |
| `snapDistance.test.ts` | Konwersja world ↔ screen | nowy |

**Szacunek:** 6-8 nowych testów, ~250-400 LOC. Baseline 249 → ~257 testów.

### 6.2 Testy integracyjne (już istniejące)

- `AppSheetTabs.test.tsx` (jeśli istnieje) — mobile vs desktop rendering
- Sprawdzić istniejące testy `DinRailConnectionsCanvas.test.tsx` — upewnić się, że refaktor nie psuje

### 6.3 Testy manualne (checklist przed merge)

- [ ] Chrome DevTools mobile emulation 375x812 (iPhone SE)
- [ ] Chrome DevTools mobile emulation 412x915 (Pixel 7)
- [ ] Fizycznie Android (jeśli user ma)
- [ ] Touch gestures: pinch, pan, tap hotspot, draw wire, delete
- [ ] Brak conflictów z desktop flow
- [ ] Lighthouse mobile score nie spadł

---

## 7. Ryzyka

### 7.1 Wysokie

**R1: Pinch-zoom kolizja z browser native zoom**
- Mitigacja: `touchAction: "none"` już jest, plus natywne listenery `{ passive: false }` (kluczowe, inaczej preventDefault jest no-op)
- Wzorzec do skopiowania: `PinchZoomImage.tsx:42-44, 222-237`

**R2: Refaktor `useConnectionsMutations` psuje istniejące flow desktop**
- Mitigacja: faza 1 ma być wyłącznie przeniesieniem kodu (no behavior change), commit per faza
- Weryfikacja: `npm.cmd run check` (= build + test) po każdej fazie

**R3: Touch gestures vs drag-handle (regulacja trasy) — jak rozróżnić?**
- Drag-handle: 1 palec na **małym uchwycie** (kwadrat ~8px)
- Pan: 1 palec na **tle**
- Obecna logika: `e.currentTarget === e.target` (trafiasz w tło, nie w uchwyt)
- Na touch: palec łapie uchwyt łatwiej niż tło — i tak działa OK
- Ryzyko niskie, ale weryfikacja manualna w fazie 7

### 7.2 Średnie

**R4: Brak testów na `DinRailConnectionsCanvas` end-to-end**
- Sprawdzić w `e2e/` — jeśli są testy canvas, rozszerzyć
- Jeśli nie ma, dodać smoke test: renderuj canvas, symuluj 2 touchstart events, sprawdź czy zoom się zmienił

**R5: iOS Safari quirks**
- `PinchZoomImage.tsx` działa na iOS (testy istnieją), więc wzorzec sprawdzony
- Ale warto manualnie przetestować na iOS w fazie 7 (lub przynajmniej Safari Technology Preview)

### 7.3 Niskie

**R6: Nowe pakiety / dependencies**
- Plan nie wymaga żadnych — wszystko reuse istniejącego
- ✅ zero nowych zależności

---

## 8. Estymacja czasu

| Faza | Zadanie | Czas |
|---|---|---|
| 0 | Przygotowanie (czytanie, research) | 0.5 dnia |
| 1 | Refaktor `useConnectionsMutations` | 1.0 dnia |
| 2 | Pinch-zoom | 0.5 dnia |
| 3 | Gest separation | 0.5 dnia |
| 4 | HUD Anuluj/Cofnij | 0.5 dnia |
| 5 | Lista połączeń w lewym panelu | 0.5 dnia |
| 6 | Snapping distance | 0.25 dnia |
| 7 | Włączenie zakładki + e2e | 0.5 dnia |
| 8 | Cleanup + docs | 0.25 dnia |
| **Razem** | | **4.5 dnia** |

Plus bufor 1 dzień na poprawki po review + ewentualne testy regresji.

**Realnie: 1 sprint (5-6 dni roboczych).**

---

## 9. Otwarte pytania do konsultacji z Opusem

1. **Czy pinch-zoom wystarczy, czy też 3-palce fit-to-rail?** (Wzorzec z innych CAD-ów: zwykle 2-palce = pan/zoom, double-tap = fit)

2. **Czy w `ConnectionsLeftPanel` dodać search/filter połączeń?** (Przy 50+ połączeniach lista staje się długa)

3. **Czy `useConnectionsMutations` rozbić od razu w fazie 1, czy w osobnym PR po dostarczeniu funkcjonalności?** (Mniej ryzyka vs. mniejsza ilość kodu do review)

4. **Czy `DinRailHitTargets` hit radius (38/46/56) jest wystarczający na mobile, czy powiększyć?** (palec to ~10-15 px, więc 38-56 to 3-4x — powinno OK, ale warto potwierdzić)

5. **Czy zrobić `e2e/mobile-connections.spec.ts` z real device farm (BrowserStack), czy wystarczy Chrome DevTools mobile emulation?** (AGENTS.md nie mówi; Playwright już jest w projekcie)

6. **Czy jest sens dodać haptic feedback przy draw / delete na mobile?** (`isNativePlatform()` branch + Capacitor Haptics — wpływa na UX, ale to feature, nie bug fix)

7. **Czy PWA install prompt powinien jakoś sugerować "otwórz w natywnej apce dla lepszego UX połączeń"?** (raczej poza scope, ale flaguję)

---

## 10. Następne kroki

Po zatwierdzeniu tego planu:

1. **Ty:** konsultujesz z Opusem (lub innym agentem) — pytanie "czy ten plan ma luki / co byś zrobił inaczej?"
2. **Ja:** przekazuję zaakceptowany plan do `canvas-expert` reina jako zadanie z deliverables
3. **canvas-expert:** implementuje faza po fazi, commit per faza
4. **Ty:** testujesz manualnie na fizycznym urządzeniu po fazie 7
5. **Po Twojej akceptacji:** push + PR (zgodnie z Twoją regułą "push = user-driven")
