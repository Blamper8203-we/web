# Przełącznik trybu Pan/Select na mobile — DIN rail canvas

## Kontekst
Pinch dwoma palcami działa (po naprawie kumulacji), ale user woli pan **jednym palcem**. Dziś jeden palec na DIN rail = zaznaczanie ramką (rubber-band), pan wymaga dwóch palców z pinch albo środkowego przycisku myszy (niemożliwe na telefonie). Schemat już działa intuicyjnie (1 palec na pustym = pan), ale DIN rail ma inny model interakcji.

## Decyzje użytkownika
1. **Przycisk przełącznika tylko na mobile** (`useIsMobileLayout()` z `src/hooks/useViewport.ts`). Desktop zachowuje obecny model (środek myszy = pan, lewy = ramka).
2. **Pan jako domyślny na mobile** przy wejściu w zakładkę DIN rail.

## Architektura (zgodna z layer discipline)

### 1. Nowy typ + helper — `src/lib/dinRailCanvas/interactionMode.ts`
Czysty, testowalny enum + funkcja decyzyjna (gdzie matematyka/logika, nie w komponencie):
```ts
export type DinRailInteractionMode = "select" | "pan";

/**
 * Zwraca tryb interakcji na podstawie: stanu toggle, mobile detection,
 * i przycisku myszy. Logika:
 * - środek myszy (button=1) → zawsze pan (zachowanie desktop)
 * - mobile + panMode toggle on → pan jednym palcem
 * - w остальных случаях → select (zachowanie dotychczasowe)
 */
export function resolveInteractionMode(
  panModeEnabled: boolean,
  isMobile: boolean,
  button: number,
): "pan" | "select"
```
Test: button=1 → pan zawsze; mobile+panMode+button=0 → pan; desktop+panMode+button=0 → select (toggle nie działa na desktop, ale funkcja zachowuje spójność); mobile+panMode off+button=0 → select.

### 2. Edycje `src/hooks/canvas/useDinRailInteraction.ts`
- Nowy prop `panModeEnabled: boolean` + `isMobile: boolean` w sygnaturze hooka.
- W `handleSurfacePointerDown` — po pinch guard, zamiast sztywnego `if (button === 1)`:
  ```ts
  const mode = resolveInteractionMode(panModeEnabled, isMobile, event.button);
  if (mode === "pan") {
    interactionRef.current = { mode: "pan", lastX: event.clientX, lastY: event.clientY };
    return;
  }
  // else: obecna logika select (ramka)
  ```
- `handlePointerMove` — bez zmian (już obsługuje `interaction.mode === "pan"`).
- `handlePointerUp` — bez zmian (`flushViewportState` + reset do idle działa uniwersalnie).
- `beginDragForSymbol` — bez zmian (drag symbolu nadal działa w obu trybach; w trybie pan user nie zacznie dragu z powierzchni, ale z hitboxu symbolu — to OK, bo drag z symbolu to celowa akcja).

### 3. Edycje `src/components/dinRailUiParts.tsx` — `DinRailZoomToolbar`
- Nowe propsy: `panMode?: boolean`, `onTogglePanMode?: () => void`.
- Nowy przycisk toggle (wzorzec identyczny jak "klamry grup" — `is-active` klasa), z nową ikoną `hand`.
- Ikona dodana do `AppIcon` (punkt 4).
- Tytuł/aria-label PL: "Przesuwanie widoku" / "Zaznaczanie".

### 4. Nowa ikona `hand` — `src/components/AppIcon.tsx`
- Dodaj `"hand"` do `AppIconName` union.
- Dodaj ścieżkę SVG (standardowa ikona dłoni/łapki — jak w Figmie/Figma hand tool, czyli otwarta dłoń). Użyję prostego outline'a.

### 5. Edycje `src/components/DinRailCanvasPixi.tsx`
- Import `useIsMobileLayout` z `src/hooks/useViewport.ts`.
- Nowy stan: `const [panMode, setPanMode] = useState(false)`.
- **Domyślny Pan na mobile**: `useEffect` ustawia `setPanMode(true)` gdy `isMobile && rail.isVisible` przy pierwszym mountcie/włączeniu canvasa. UWAGA: nie resetować przy każdym renderze — tylko przy zmianie `isMobile` false→true lub pierwszym `rail.isVisible` true.
- Przekazać `panMode`/`setPanMode` do `DinRailZoomToolbar` (gdy mobile) i `panModeEnabled={panMode}` + `isMobile` do `useDinRailInteraction`.

### 6. CSS (opcjonalnie)
- Bez zmian — `workspace-tool-btn.is-active` już ma style (używane przez toggle klamer grup).

## Testy (baseline 1099 — nie może spaść; nowe funkcje → nowe testy)

1. **`src/lib/dinRailCanvas/interactionMode.test.ts`** (nowy) — test `resolveInteractionMode` dla wszystkich kombinacji (button=1/0, mobile true/false, panMode on/off). 4-6 przypadków.
2. **`src/hooks/canvas/useDinRailInteraction.test.ts`** (rozszerzenie) — dodać testy:
   - mobile + panMode on + pointerdown(button=0) → wchodzi w pan mode (setPanSafe wywołany po move).
   - mobile + panMode off + pointerdown(button=0) → wchodzi w select mode (jak dziś).
   - desktop + panMode on + pointerdown(button=0) → select (toggle nie działa na desktop — UX: desktop ma środek myszy).
   - Istniejący test middle-mouse pan nadal przechodzi (button=1 → pan zawsze).
   - **Wymaga**: aktualizacja setupu testowego — dodać `panModeEnabled`, `isMobile` do UseProps + setup.

## Compliance z AGENTS.md (obszar wysokiego ryzyka)
- DIN rail canvas jest w "High-risk areas" → wymagany opis before/after + test pinning.
- **Obecnie**: jeden palec = zaznaczanie ramką, pan = środek myszy (niemożliwy na mobile) lub 2 palce z pinch.
- **Po zmianie**: jeden palec = pan (domyślnie na mobile, po włączeniu toggle), select/drag nadal dostępne (toggle off albo drag z symbolu).
- **Wpływ na decyzje inżynierskie**: NIE zmienia matematyki viewportu ani pozycjonowania symboli — tylko to, który tryb interakcji jest aktywny po pointerdown. Pozycje symboli, snap, fazy nienaruszone. Pinch (2 palce) nadal działa równolegle.
- **Test pinning**: `interactionMode.test.ts` + testy hooka weryfikują że resolve jest deterministyczny i że pan mode wywołuje `setPanSafe` (jak middle-mouse pan wcześniej).

## Kolejność implementacji
1. `interactionMode.ts` + test → foundation.
2. Ikona `hand` w `AppIcon.tsx`.
3. `useDinRailInteraction.ts` — prop + resolve, aktualizacja istniejącego testu.
4. `dinRailUiParts.tsx` — przycisk toggle w toolbarze.
5. `DinRailCanvasPixi.tsx` — stan panMode, mobile detection, domyślny Pan na mobile, wiring.
6. `npm.cmd run check`.

## Co NIE jest w scope
- Schemat (już ma 1-palcowy pan na pustym — działa intuicyjnie).
- PDF (pan = natywny scroll, już działa).
- Pan jednym palcem na desktop (desktop zachowuje środek myszy — świadomie, per decyzja).
- Zmiana domyślnego trybu na desktop (zostaje Select).
- SmartHome canvas (ukryty w UI).