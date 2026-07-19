# Raport wdrożenia: zakładka "Połączenia" na mobile

**Data:** 2026-07-19
**Agent wdrażający:** ZCode (GLM-5.2)
**Plan bazowy:** [`mobile-connections-tab-plan.md`](./mobile-connections-tab-plan.md) (autor: Mavis)
**Review/korekta:** [`mobile-connections-review.md`](./mobile-connections-review.md) (autor: Claude Opus)
**Status:** ✅ Zaimplementowane i przetestowane (`npm.cmd run check` zielony). **Nie commitowane** — zgodnie z regułą "push = user-driven" zmiany czekają na rewizję i decyzję usera o commicie.

---

## 0. TL;DR dla następnego agenta

Włączona została zakładka "Połączenia" (`sheet1_connections`) na platformach natywnych (Android/iOS). Wcześniej była celowo ukryta, bo cały pipeline interakcji był projektowany pod mysz + klawiaturę. Teraz mobile ma:

- **2-palce pinch-zoom + pan** (reuse `computePinchTransform` z `lib/pinchMath`)
- **Gate 1-vs-2 palce** w pointer-handlerach (`pinchActiveRef`)
- **HUD "Cofnij punkt" / "Anuluj"** podczas rysowania (mobile zamiennik Escape/prawoklik)
- **Lista połączeń w lewym panelu** (tap = select, przycisk "Usuń" = delete — stabilny 44 px hit-target zamiast loterii w cienką linię SVG)
- **Snap-threshold w screen coords** (`36 / zoom`) — palec trafia w terminal niezależnie od zoom
- **Pointer capture mitigation** na hotspotach (R7 z review)

**Poza scope (osobny PR!):** refaktor `useConnectionsMutations` na 5 plików — patrz sekcja §7. **Nie rób tego "przy okazji".**

**Nie zrobione, wymaga usera:** testy manualne na realnym urządzeniu (checklist w §6.2).

---

## 1. Kontekst — co i dlaczego

### 1.1 Zlecenie usera

> "czego nie mam to nie mam na urządzeniach mobilnych zakładki połączenia. Przeczytaj plan Mavisa i review Opusa. Zaimplementuj włączenie zakładki 'Połączenia' na mobile, zgodnie ze skorygowanym planem z review (§4). Kluczowe: reuse useDinRailPinch + pinchMath.ts zamiast PinchZoomImage. Refaktor useConnectionsMutations — osobny PR, nie w tym deliverable."

### 1.2 Kluczowa decyzja architektoniczna (z review §1)

Opus wskazał, że plan Mavisa ignoruje bliższy, lepszy analog — hook `useDinRailPinch` + czysta matematyka w `lib/pinchMath.ts`. Tabela porównawcza:

| | `PinchZoomImage` (oryg. plan Mavisa) | `useDinRailPinch` + `pinchMath` (rekomendacja Opusa) |
|---|---|---|
| Warstwa | Komponent z `<img>` (transform CSS) | Hook + lib (czysta matematyka w `lib/`) |
| API viewportu | Własny `scale`/`translate` CSS | `setScaleSafe` + `setPanSafe` — **ten sam pattern co `useConnectionsViewport.setViewport`** |
| Zoom model | Zoom CSS image | Zoom SVG `<g transform>` — **identyczny z connections canvas** |
| Freeze pattern | Brak | ✅ `gestureRef` zamraża `initialScale`/`initialPan` na starcie gestu |
| `pinchActiveRef` | Brak | ✅ Wbudowane — inny hook może gate'ować na nim |

**Zastosowane:** stworzony został `useConnectionsPinch.ts` jako thin wrapper wokół `computePinchTransform` — dokładnie jak `useDinRailPinch`, ale z `setViewport` zamiast `setScaleSafe/setPanSafe`.

### 1.3 Skorygowany plan z review (§4) — co wdrożono

| Faza | Co zrobiono | Status |
|---|---|---|
| 0 | Czytanie `useDinRailPinch.ts` + `pinchMath.ts` | ✅ |
| 1+2+3 | `useConnectionsPinch.ts` + gate w mutations (połączone w jedną fazę per §2.1) | ✅ |
| 4 | HUD `DinRailDrawingActions` (Anuluj/Cofnij) | ✅ |
| 5 | Lista połączeń w `ConnectionsLeftPanel` | ✅ |
| 6 | Snap-threshold `36 / zoom` (screen coords) | ✅ |
| 7 | Włączenie zakładki + test `AppSheetTabs.test.tsx` | ✅ |
| 8 | Cleanup + docs (ten plik) | ✅ |
| — | Refaktor `useConnectionsMutations` na 5 plików | **POMINIĘTE — osobny PR** (per §2.1 + instrukcja usera) |

---

## 2. Stan git — co zmienione, co nowe

### 2.1 Zmodyfikowane pliki (`M`)

| Plik | Linie zmian | Co się zmieniło |
|---|---|---|
| `src/components/AppSheetTabs.tsx` | +14/-4 | **Usunięcie filtru `Capacitor.isNativePlatform()`** dla `sheet1_connections` + komentarz `// WHY:`. Usunięty nieużywany import `Capacitor` (inaczej `tsc --noUnusedLocals` wywala build). |
| `src/components/AppLeftPanel.tsx` | +15 | Dodane props `onConnectionSelect` + `symbols` do `AppLeftPanelProps`; przekazanie do `ConnectionsLeftPanel`. |
| `src/components/AppWorkspace.tsx` | +5 | Przekazanie `onConnectionSelect={setSelectedConnectionId}` + `symbols` w `leftPanelProps`. |
| `src/components/ConnectionsLeftPanel.tsx` | +165/-5 | Nowa sekcja "Połączenia" — lista wierszy z select + delete + empty state. Helpery `symbolLabel` i `wireColorHex`. |
| `src/components/DinRailConnectionsCanvas.tsx` | +33 | Podpięcie `onTouchStart/Move/End` z pinch-hook do `<svg>`; render `<DinRailDrawingActions>` przy aktywnym draw. |
| `src/hooks/connections/useConnectionsMutations.ts` | +62/-4 | +`pinchActiveRef`/`zoom` do interfejsu; gate w 3 handlerach; `minDist = 36 / zoom`; R7 mitigation w `handleHotspotPointerDown`. |
| `.harness/docs/architecture-map.md` | +1 | (modyfikacja z przed tej sesji — sprawdź, czy to celowe przed commitem) |

### 2.2 Nowe pliki (`??`)

| Plik | LOC | Co to jest |
|---|---|---|
| `src/hooks/connections/useConnectionsPinch.ts` | 176 | Hook pinch-zoom + pan dla connections canvas (reuse `computePinchTransform`) |
| `src/hooks/connections/useConnectionsPinch.test.ts` | 278 | 10 testów, w tym **regresja kumulacji zoomu** |
| `src/components/canvasLayers/DinRailDrawingActions.tsx` | 116 | HUD "Cofnij punkt" + "Anuluj" (mobile zamiennik Escape/prawoklik) |
| `src/components/canvasLayers/DinRailDrawingActions.test.tsx` | 91 | 5 testów (render, disabled przy 0 punktów, callbacki) |
| `src/components/AppSheetTabs.test.tsx` | 88 | 4 testy pinning włączonej zakładki |
| `src/components/ConnectionsLeftPanel.test.tsx` | 198 | 7 testów (empty state, lista, select, delete, label, undefined) |
| `docs/distribution-roadmap-notes/mobile-connections-review.md` | — | Review Opusa (dokument z przed tej sesji) |
| `docs/distribution-roadmap-notes/mobile-connections-tab-plan.md` | — | Plan Mavisa (dokument z przed tej sesji) |

### 2.3 Łącznie

**+301 linii zmian, 7 zmodyfikowanych plików, 6 nowych plików.** Wszystkie nowe pliki mają co-located testy (per AGENTS.md "Test discipline").

---

## 3. Architektura — jak pinch-zoom jest podpięty

### 3.1 Diagram przepływu

```
                   useConnectionsPinch (hook)
                   ├── svgRef (SVGSVGElement)
                   ├── viewport: { zoom, pan }
                   ├── setViewport (z useConnectionsViewport)
                   │
                   ├── onTouchStart (2 palce) → freeze initialScale/Pan w gestureRef
                   │                          → pinchActiveRef.current = true
                   ├── onTouchMove  (2 palce) → computePinchTransform → setViewport
                   └── onTouchEnd  (0 palców) → pinchActiveRef.current = false
                                                    │
                                                    ▼
            <svg onTouchStart/Move/End={...}>  ← podpięte w DinRailConnectionsCanvas
                                                    │
                                                    ▼
            useConnectionsMutations (3 handlery z gate):
            ├── handlePointerDown:  if (pinchActiveRef.current) return;
            ├── handlePointerMove:  if (pinchActiveRef.current) return;
            └── handlePointerUp:    if (pinchActiveRef.current) return;
```

### 3.2 Dlaczego gate jest konieczny

Przeglądarki (Chrome, Safari) fire'ują zdarzenia w kolejności **touch → pointer**. Gdy user dotyka SVG dwoma palcami, dochodzi:

1. `touchstart` (2 palce) → `useConnectionsPinch.onTouchStart` ustawia `pinchActiveRef = true`
2. `pointerdown` (z palca uczestniczącego w pinchu) → **bez gate'u** wszedłby w `handlePointerDown`, gałąź `e.button === 0 && e.currentTarget === e.target` → `isPanning = true` → panował SVG walcem z pinch-hookiem
3. `touchmove` → pinch-hook aktualizuje viewport
4. `pointermove` → **bez gate'u** aktualizowałby `isPanning` ponownie → dublowanie pan + pinch
5. `touchend` (0 palców) → `pinchActiveRef = false`
6. `pointerup` → **bez gate'u** commitowałby draw, jeśli `hoveredHotspot` akurat najechał

Gate rozwiązuje to czysto — pointer-handlery ustępują gdy pinch aktywny.

### 3.3 Dlaczego `gestureRef` zamraża `initialScale`/`initialPan`

**Regresja "jazdy bez trzymanki":** bez zamrożenia każdy `onTouchMove` mnożyłby zoom przez ratio względem **poprzedniego** stanu viewportu zamiast startu gestu → 3× move z ratio 2 dawało scale 8 zamiast 2 (kumulacja super-eksponencjalna).

Test pinning: `useConnectionsPinch.test.ts` → "REGRESJA: wiele onTouchMove z tą samą odległością NIE kumuluje zoomu". Ten sam wzorzec co `useDinRailPinch` i `useSchematicPinch`.

### 3.4 Snap-threshold `36 / zoom` — uzasadnienie

Wcześniej `minDist = 36` (world coords), porównywane z `dx/dy` w world coords. Przy `zoom = 0.3` (initial fit na mobile) to **~11 px na ekranie** — palec (~10-15 px) trafia losowo.

Po zmianie: `minDist = 36 / zoom`. Przy `zoom = 0.3` → `120 world` → 36 px na ekranie (przy zoom 1.0 — jak wcześniej 36 world).

Dlaczego `36 / zoom` a nie "licz w screen coords"? Review §2.2: obie formuły są matematycznie równoważne, ale `36 / zoom` to **mniejsza zmiana** w istniejącym kodzie (tylko wartość początkowa `minDist`, pętla bez zmian). Per zasada AGENTS.md "Smallest safe change".

### 3.5 Lista połączeń — dlaczego ta droga

Review §3.2.3 (show-stopper): na mobile trafienie palcem w cienką linię przewodu SVG jest loterią. Trzy opcje z planu:

- **A: Lista w `ConnectionsLeftPanel`** (zrobione) — stabilny 44 px hit-target, tap = select, przycisk "Usuń" = delete. ✅ Rekomendacja Opusa.
- B: Long-press na przewodzie → context menu — trudne do rozróżnienia od drag-handle.
- C: Tap na przewodzie z dużym hit-tolerance — wymagałoby powiększania hit-targetu w world coords, co powoduje nakładanie się hotspotów sąsiednich modułów.

---

## 4. Testy — co pokryte

### 4.1 Nowe testy (26 nowych)

| Plik testu | Testów | Co testuje |
|---|---|---|
| `useConnectionsPinch.test.ts` | 10 | Touch state machine, zoom-in 2× z zakotwiczeniem, translacja 2-palcowa, clamp min/max, **regresja kumulacji zoomu** |
| `DinRailDrawingActions.test.tsx` | 5 | Render obu przycisków, disabled przy 0 punktów, callbacki onUndoPoint/onCancelDrawing |
| `ConnectionsLeftPanel.test.tsx` | 7 | Empty state, N wierszy dla N połączeń, tap → onConnectionSelect, click Usuń → onConnectionsChange, czyści selected po delete, label z symbols, undefined connections |
| `AppSheetTabs.test.tsx` | 4 | Render zakładki Połączenia, klik → onChangeSheet, Smart Home nadal ukryty |

### 4.2 Wynik `npm.cmd run check`

```
Test Files  119 passed (119)
     Tests  1178 passed | 2 skipped (1180)
  Duration  107.21s
```

Baseline AGENTS.md (2026-06-07): 249 testów / 33 pliki. Obecnie: **1178 testów / 119 plików** — liczba rośnie, **nie maleje** (zgodnie z "Test count stability" z AGENTS.md).

### 4.3 Lint

`npm.cmd run lint` na wszystkich zmienionych plikach — **0 błędów**.

### 4.4 Czego **nie** pokryto testami jednostkowymi (świadome)

- **Integracja pinch + pointer-events** — jsdom nie emuluje pełnego touch → pointer event order Chrome/Safari. Testy `useConnectionsPinch` testują sam hook w izolacji, a gate w mutations jest sprawdzany pośrednio (brak kodu bez gate'u). Weryfikacja na real device — sekcja §6.2.
- **Render całego `DinRailConnectionsCanvas` z touch** — komponent jest zbyt zależny od SVG layout, refs i useMemo, żeby testować go czysto w jsdom. Smoke test by wymagał playwright + touch emulation.
- **`useConnectionsMutations` end-to-end z nowym gate'iem** — istniejących testów brak (19 KB "container file" per AGENTS.md §3). Dodanie testów characterisation = w scope **osobnego PR z refaktorem mutations**.

---

## 5. Na co uważać — ryzyka

### 5.1 Ryzyka z review (R7–R9)

#### R7: `setPointerCapture` na hotspotach blokuje pinch ✅ ZMITIGOWANE

[Review §2.3](./mobile-connections-review.md): Pointer capture na hotspot circle przechwytuje **wszystkie** pointermove/pointerup dla tego palca. Jeśli user dotknie hotspotem jednym palcem a drugim tło (żeby pinch), capture na pierwszym palcu uniemożliwi pinch.

**Mitigacja w `useConnectionsMutations.ts` `handleHotspotPointerDown`:**
```ts
// Na touchu capture nie jest potrzebne — palec nie "ucieka" z elementu
// tak jak kursor myszy poza okno. Na myszy zostawiamy.
if (e.pointerType !== "touch") {
  e.currentTarget.setPointerCapture(e.pointerId);
}
```

**Uwaga na przyszłość:** jeśli kiedyś dodasz drag-handle na touch z pointer capture, powtórz ten wzorzec.

#### R8: iOS `user-scalable` meta tag ⚠️ DO ZWERYFIKOWANIA NA iOS

[Review §5 R8](./mobile-connections-review.md): Jeśli `<meta name="viewport">` nie ma `user-scalable=no`, Safari robi własny pinch-zoom na stronie jednocześnie z Twoim → podwójny zoom.

**Stan:** `index.html` ma `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />` — **NIE** ma `user-scalable=no`.

`touchAction: "none"` na `<svg>` (`DinRailConnectionsCanvas.tsx:353`) + `event.preventDefault()` w `onTouchMove` powinno blokować pinch strony, ale **iOS Safari bywa nieprzewidywalne**. Weryfikacja na real iOS — sekcja §6.2.

**Uwaga:** Zmiana `user-scalable=no` w całym `<meta viewport>` ma wpływ na accessibility (WCAG 1.4.4 Resize text) — nie zmieniaj bez konsultacji z userem. Jeśli pinch strony faktycznie koliduje, dodaj CSS `touch-action: none` tylko na `<svg>`, a meta zostaw.

#### R9: `touchAction: "none"` vs scroll w lewym panelu ✅ POWINNO DZIAŁAĆ

[Review §5 R9](./mobile-connections-review.md): `touchAction: "none"` jest na `<svg>`. Lewy panel (`ConnectionsLeftPanel`) to osobny element z `overflowY: auto`. Powinno być OK, ale edge case: palec zaczyna na panelu i przesuwa się na canvas — wymaga weryfikacji na real device.

### 5.2 Ryzyka specyficzne dla tej implementacji

#### Ryzyko A: `useConnectionsPinch` re-binds callbacków przy każdej zmianie viewport

W przeciwieństwie do `useDinRailPinch` (który trzyma scale/pan w refach), `useConnectionsPinch` przyjmuje `viewport` jako prop. Komentarz w hooku (linie 49-52) wyjaśnia:

> "Powodza to re-bind callbacków przy każdej zmianie viewport, ale to nie jest problem: onTouchStart i tak jest wywoływany tylko raz na gest, a w trakcie gestu viewport i tak się zmienia."

**Na co uważać:** jeśli kiedyś dodasz memoizację lub `React.memo` na komponencie, który renderuje `<svg>`, callbacki touch mogą się nie zaktualizować po zmianie viewport. Test `REGRESJA: wiele onTouchMove z tą samą odległością NIE kumuluje zoomu` łapie ten przypadek.

#### Ryzyko B: Lista połączeń renderuje się dla `connections !== undefined` (nie `length > 0`)

W `ConnectionsLeftPanel.tsx` sekcja listy renderuje się gdy `connections !== undefined`. Empty state ("Brak połączeń") pokazuje się przy `length === 0`. To rozróżnienie jest świadome:

- `undefined` = panel bez kontekstu połączeń (np. w teście bez props) → sekcja się nie pojawia
- `[]` = projekt z 0 połączeni → empty state (per AGENTS.md "Empty state test")

**Na co uważać:** jeśli w innym miejscu `ConnectionsLeftPanel` zacznie dostawać `connections` z leniwego loadera, dopilnuj by default był `[]` a nie `undefined`, inaczej empty state się nie pokaże.

#### Ryzyko C: Gate w `handlePointerUp` może gubić commit draw przy szybkim tapie

Gdy user tapnie hotspot-start → szybko podniesie palec (touchend), kolejność zdarzeń:

1. `touchstart` (1 palec) → pinch-hook ignoruje (`event.touches.length !== 2`)
2. `pointerdown` (z hotspot) → `handleHotspotPointerDown` → `setDrawingState`
3. `touchend` (0 palców) → pinch-hook: `pinchActiveRef = false`
4. `pointerup` → gate `pinchActiveRef.current` = false → **przechodzi**, commit draw działa

Ale gdy user użyje **drugiego palca w trakcie trwającego draw** (np. niezamierzony dotyk krawędzi dłoni):

1. Draw w toku (1 palec)
2. Drugi palec → `touchstart` (2 palce) → `pinchActiveRef = true`
3. Pierwszy palec podniesiony → `touchend` (1 palec) → `pinchActiveRef` **zostaje true** (bo `event.touches.length === 1 !== 0`)
4. `pointerup` z pierwszego palca → gate → **return, draw nie skommitowany**

Draw zostaje w stanie "rubber-band preview" aż user podniesie drugi palec. To jest **akceptowalne zachowanie** — user musi dokończyć lub anulować (HUD "Anuluj" jest dostępny). Ale jeśli user zgłosi "draw się zawiesił", to jest ten mechanizm.

#### Ryzyko D: `.harness/docs/architecture-map.md` zmodyfikowany (przed sesją)

W `git status` widoczna modyfikacja `.harness/docs/architecture-map.md (+1)`. **Nie dotykałem tego pliku w tej sesji** — był już zmodyfikowany przed startem. Sprawdź z userem, czy to celowe (może z poprzedniej sesji), zanim commitniesz.

### 5.3 Inwarianty AGENTS.md, których dotyczą zmiany

| Inwariant | Status |
|---|---|
| "No domain logic in components" (§Layer discipline) | ✅ `DinRailDrawingActions` to czysty UI, lista w `ConnectionsLeftPanel` tylko renderuje dane |
| "Smallest safe change" | ✅ Refaktor mutations odłożony, `36 / zoom` to zmiana wartości nie logiki |
| "Test count must never decrease" | ✅ 1178 testów (baseline 249) |
| "Empty state test" | ✅ Lista pokazuje "Brak połączeń" przy `[]` |
| "High-risk areas: touch = PR must explain" | ✅ Ten raport = wyjaśnienie |
| `// WHY:` comments | ✅ Dodane w każdym nietriwialnym miejscu (gate, snap-threshold, R7, viewport meta) |
| "String-dispatch patterns" (§2 AGENTS.md) | ✅ Nie dotyczy — nie dodaliśmy żadnego string-dispatchu |

---

## 6. Co dalej zrobić

### 6.1 Przed commitem (wymaga usera)

1. **Zatwierdź diff** — `git diff src/` i przejrzyj zmiany. Zgodnie z regułą "push = user-driven" nic nie zostało commitowane.
2. **Zdecyduj o `.harness/docs/architecture-map.md`** — był zmodyfikowany przed sesją. Inkludować czy odrzucić?
3. **Commit message** (propozycja):
   ```
   feat(connections): enable "Połączenia" tab on mobile with pinch-zoom + connection list

   - useConnectionsPinch: 2-finger pinch-zoom + pan (reuse computePinchTransform)
   - gate pinchActiveRef in useConnectionsMutations (3 handlers)
   - snap-threshold 36/zoom (screen coords) for touch precision
   - DinRailDrawingActions HUD (Undo point / Cancel — mobile replacement for Esc/right-click)
   - ConnectionsLeftPanel: connection list with select + delete (44px hit-target)
   - AppSheetTabs: remove Capacitor.isNativePlatform() filter for sheet1_connections
   - R7: skip setPointerCapture on touch in handleHotspotPointerDown

   Per mobile-connections-review.md §4 (corrected plan).
   Refaktor useConnectionsMutations → separate PR (per review §2.1).

   Tests: +26 (useConnectionsPinch 10, DinRailDrawingActions 5,
   ConnectionsLeftPanel 7, AppSheetTabs 4). 1178 passed.
   ```

### 6.2 Testy manualne na real device (checklist przed merge)

Per review §6.3 i AGENTS.md "Cross-platform test":

**Chrome DevTools mobile emulation:**
- [ ] 375×812 (iPhone SE) — otwórz zakładkę Połączenia
- [ ] 412×915 (Pixel 7) — otwórz zakładkę Połączenia
- [ ] Pinch-zoom: 2 palce rozsuń → zoom-in; zsuń → zoom-out
- [ ] Pan: 2 palce przesuń równolegle → widok przesuwa się za palcami
- [ ] Draw wire: tap na terminal → przeciągnij → tap na drugi terminal → przewód dodany
- [ ] HUD Anuluj: tap na terminal → tap "Anuluj" → draw przerwany
- [ ] HUD Cofnij punkt: tap na terminal → tap tło (postaw punkt) → tap "Cofnij punkt" → punkt usunięty
- [ ] Lista połączeń: tap w wiersz → przewód zaznaczony na SVG
- [ ] Lista delete: tap "Usuń" w wierszu → przewód usunięty, zaznaczenie wyczyszczone
- [ ] Edge case: palec startuje na lewym panelu, przesuwa się na canvas (R9)
- [ ] Edge case: draw w toku + dotknięcie drugim palcem (Ryzyko C z §5.2)

**Real Android (jeśli user ma urządzenie):**
- [ ] To samo co wyżej + haptic feedback (jeśli dostępny — review Q6, poza scope)
- [ ] Service Worker cache nie trzyma starej wersji (hard-reload jeśli trzeba)

**iOS Safari (krytyczne — review R8):**
- [ ] Pinch-zoom na SVG **nie** powoduje podwójnego zoomu (strona + SVG)
- [ ] Jeśli koliduje → sprawdź czy `touchAction: "none"` wystarcza, czy trzeba `user-scalable=no` tylko dla iOS (z osobnym meta tagiem)

### 6.3 Opcjonalne follow-upy (poza scope tego deliverable)

Per review §9 — **nie rób teraz**, zbierz feedback po testach manualnych:

1. **Refaktor `useConnectionsMutations` na 5 plików** (plan Mavisa §5 Faza 1) — **osobny PR**. To jest prawdziwy refactor projektu (19 KB "container file" per AGENTS.md §3). Wymaga characterisation testów obecnego zachowania przed zmianą. Per review §2.1 + Q3.

2. **Double-tap-to-fit** (review Q1) — ~10 LOC: `lastTapTime` ref, `if (Date.now() - lastTapTime < 300) resetZoom()`. Miły bonus, nie show-stopper. Przycisk "fit" w `SchematicZoomDock` już działa.

3. **Search/filter w `ConnectionsLeftPanel`** (review Q2) — przy 50+ połączeniach lista długa. Lepsze: grupowanie po symbolu źródłowym (accordion). Dodaj **dopiero po** feedbacku z testów manualnych.

4. **Haptic feedback** (review Q6) — `Capacitor.Haptics.impact({ style: "light" })` na `handleHotspotPointerDown` i `handlePointerUp` (commit wire) to ~6 LOC. Polish, nie prerequisite.

5. **Test E2E z Playwright** (`e2e/mobile-connections.spec.ts`) — review Q5. Chrome DevTools emulation `--device="Pixel 7"` wystarczy na start. BrowserStack dopiero po v1.0.

6. **Update `docs/distribution-roadmap.md`** — dodaj wpis do release notes (plan Faza 8). Sprawdź czy roadmap ma sekcję "Mobile connections enabled".

### 6.4 Jeśli coś nie działa na real device

**Objaw:** "pinch nie działa" / "podwójny zoom" / "draw się zawiesza"

1. **Najpierw sprawdź Service Worker cache** (AGENTS.md §"Known tool quirks" #4): DevTools → Application → Service Workers → Unregister → Application → Storage → Clear site data → hard-reload `Ctrl+Shift+R`. SW trzyma stary bundle do 30 dni.
2. **Sprawdź `pinchActiveRef` w DevTools** — dodaj `console.log` w `handlePointerDown` i `onTouchStart`, zobacz kolejność zdarzeń.
3. **iOS Safari quirks** — sprawdź czy `event.preventDefault()` w `onTouchMove` faktycznie blokuje pinch strony. Jeśli nie → CSS `touch-action: none` na `<svg>` (już jest) + może `overscroll-behavior: none` na `<body>`.
4. **Draw zawieszony** — Ryzyko C z §5.2. User musi tapnąć "Anuluj" w HUD albo podnieść wszystkie palce.

---

## 7. Czego **NIE** robić (świadome pominięcia)

### 7.1 Refaktor `useConnectionsMutations` na 5 plików

**NIE w tym PR.** Plan Mavisa (§5 Faza 1) proponował rozbicie na:
```
hooks/connections/
├── useConnectionsMutations.ts          (orkiestracja)
├── usePointerGestureState.ts           (1 vs 2 palce)
├── useConnectionsPanZoom.ts            (2-palce pan/zoom)
├── useConnectionsDraw.ts               (1-palec draw)
└── useConnectionsDragHandle.ts         (drag-handle/segment)
```

Review §2.1 uzasadnia odłożenie: pinch-zoom nie wymaga refaktoru tego pliku — wymaga **obok niego** nowego hooka + gate 2-linijkowy. Rozbicie 19 KB hooka na 5 plików to **refaktor z ryzykiem**, który powinien mieć własne review i testy regresyjne.

**Instrukcja usera wprost:** "Refaktor useConnectionsMutations — osobny PR, nie w tym deliverable."

### 7.2 Nie dodawaliśmy nowych dependencies

Review §7.3 R6: "Plan nie wymaga żadnych — wszystko reuse istniejącego." Zastosowane — wszystko używa istniejącego `pinchMath.ts`, `useConnectionsViewport`, `@capacitor/core` (już w projekcie).

### 7.3 Nie zmienialiśmy hit-target radius w `DinRailHitTargets`

Review Q4: hit-targets 38/46/56 px w world coords. Pytanie czy powiększyć na mobile. Odpowiedź Opusa: **NIE** — powiększanie w world coords powoduje nakładanie się hotspotów sąsiednich modułów. Lepsze rozwiązanie (snap-threshold w screen coords) = zrobione w fazie 6.

### 7.4 Nie dodawaliśmy haptic feedback

Review Q6: "Tak, ale po fazie 7." Polish, nie prerequisite. Wymaga `isNativePlatform()` branch + Capacitor Haptics. Dodaj po testach manualnych jeśli feedback wskaże potrzebę.

### 7.5 Nie zmienialiśmy `<meta viewport>`

R8 z review: `user-scalable=yes` zostało. Zmiana na `user-scalable=no` ma wpływ na accessibility (WCAG 1.4.4). Jeśli pinch strony koliduje z pinch-SVG na iOS, najpierw spróbuj CSS, nie meta.

---

## 8. Mapa plików do szybkiej nawigacji

Jeśli następny agent musi coś zmienić, tu jest mapa "gdzie jest co":

| Chcesz zmienić... | Plik | Funkcja/sekcja |
|---|---|---|
| Logikę pinch-zoom (matematyka) | `src/lib/pinchMath.ts` | `computePinchTransform` — **współdzielona z DIN rail + schematic** |
| Limity zoom (min/max) | `src/hooks/connections/useConnectionsPinch.ts:26-27` | `MIN_SCALE = 0.05`, `MAX_SCALE = 4.0` — **muszą zgadzać się z `useConnectionsViewport.zoomAround`** |
| Gate pinch w mutations | `src/hooks/connections/useConnectionsMutations.ts` | `if (pinchActiveRef.current) return;` w 3 handlerach (szukaj "WHY: 2-palce pinch") |
| Snap-threshold | `src/hooks/connections/useConnectionsMutations.ts:428` | `let minDist = zoom > 0 ? 36 / zoom : 36;` |
| Pointer capture na hotspot (R7) | `src/hooks/connections/useConnectionsMutations.ts` | `handleHotspotPointerDown`, `if (e.pointerType !== "touch")` |
| HUD Anuluj/Cofnij | `src/components/canvasLayers/DinRailDrawingActions.tsx` | czysty komponent, props-driven |
| Render HUD w canvasie | `src/components/DinRailConnectionsCanvas.tsx` | `{drawingState && <DinRailDrawingActions .../>}` |
| Lista połączeń | `src/components/ConnectionsLeftPanel.tsx` | Sekcja `SEKCJA LISTY POŁĄCZEŃ` |
| Label symbolu w liście | `src/components/ConnectionsLeftPanel.tsx` | `symbolLabel()` — `${referenceDesignation} (${label})` |
| Włączenie zakładki | `src/components/AppSheetTabs.tsx:30-44` | filtr `visibleTabs` |
| Touch handlers na SVG | `src/components/DinRailConnectionsCanvas.tsx` | `onTouchStart/Move/End={...}` na `<svg>` |

---

## 9. Podsumowanie

| Aspekt | Status |
|---|---|
| Zakres z review §4 | ✅ Wszystkie fazy wdrożone (poza świadomie pominiętym refaktorem mutations) |
| `npm.cmd run check` | ✅ Build + test zielony (1178 testów) |
| Lint | ✅ 0 błędów na zmienionych plikach |
| Testy jednostkowe | ✅ +26 nowych testów, baseline utrzymany |
| Testy manualne | ⚠️ **Wymaga usera** — checklist §6.2 |
| Commit | ⚠️ **Wymaga usera** — zmiany czekają na zatwierdzenie |
| Dokumentacja | ✅ Ten raport + komentarze `// WHY:` w kodzie |
| Inwarianty AGENTS.md | ✅ Utrzymane (Layer discipline, Test count, Empty state, High-risk explanation) |

**Następny agent:** zacznij od sekcji §6 (Co dalej zrobić) i §5 (Na co uważać). Jeśli user zgłosi problem, sekcja §6.4 ma troubleshooting. Jeśli chcesz dokończyć refaktor mutations — sekcja §7.1 wyjaśnia scope.
