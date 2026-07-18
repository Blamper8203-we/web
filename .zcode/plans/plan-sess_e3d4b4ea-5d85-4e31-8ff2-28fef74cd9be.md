# Plan: naprawa scrolla listy modułów na mobile

## Problem
Na smartfonie dotknięcie elementu w palecie modułów (`palette-item`) blokuje przewijanie listy. Użytkownik nie może przewinąć np. listy "Złącza" zaczynając swipe od modułu.

## Cause (root)
`src/components/AppLeftPanel.tsx:169-174`:
```tsx
onTouchStart={(event) => {
  event.preventDefault();      // ← anuluje gest scrolla dla całej sekwencji dotyku
  onPaletteItemTap?.(item.templateId);
}}
```
`touchstart` odpala się **natychmiast** przy dotknięciu — zanim przeglądarka zdecyduje tap/scroll/long-press. `preventDefault()` na `touchstart` anuluje rozpoznawanie gestu, więc scroll jest zablokowany. Dlatego opisane "działa za drugim dotknięciem" to iluzja — scroll i tak nie działa, tylko kolejny tap dodaje kolejny moduł.

## Safe fix
Zmiana w **jednym pliku**: `src/components/AppLeftPanel.tsx`. Przeniesienie tap-z-logiki z `touchstart` na `touchend` + detekcja ruchu palca. **Brak zmian w** `usePaletteActions.ts`, `AppWorkspace.tsx`, hookach — `onPaletteItemTap` zachowuje tę samą sygnaturę i semantykę, więc haptik (`Haptics.impact` po dodaniu) i zwijanie panelu (`sheetPanel.setShowLeftPanel(false)`) działają jak dotychczas.

### Nowy handler (zastępuje obecny `onTouchStart`)
- `onTouchStart` — **tylko** rejestruje pozycję startową palca (clientX/Y). **Bez `preventDefault`** — scroll pozostaje obsługiwany przez przeglądarkę.
- `onTouchMove` — rejestruje pozycję bieżącą (do obliczenia dystansu w `touchend`).
- `onTouchEnd` — jeśli dystans palca (od start do end) **<10px** → to był tap → woła `onPaletteItemTap`. Jeśli **≥10px** → to był scroll/swipe → **nic nie robi** (moduł się nie dodaje, lista się przewinęła).
- Próg 10px to standard UI (iOS/Android używają ~10px do odróżnienia tap od pan).

### Stan referencyji
Ponieważ handler jest w JSX inline w `.map()`, a każdy `palette-item` potrzebuje własnej pozycji startowej, użyję `useRef` na obiekcie-worek (jeden ref na komponent `AppLeftPanel`, przechowuje `{ x, y } | null` dla aktualnego dotyku). To wystarczy bo jednocześnie trwa maks. 1 sekwencja tap/scroll na palecie (multitouch na palecie nie ma sensu).

### Dlaczego NIE w hooku (`usePaletteActions`)
Logika "czy to był tap czy scroll" jest geometrią UI, nie domeną palette. Według MVVM (AGENTS.md) to zostaje w komponencie. `onPaletteItemTap` pozostaje czystym intencją "użytkownik kliknął moduł — dodaj go".

### Dostępność (a11y)
- `onClick` **pozostaje nietknięty** (nie ma go dziś w palette-item, ale `draggable=true` + native click działa na desktopie). Desktop (mysz) nie używa touch handlers — będzie działać jak wcześniej.
- `event.preventDefault()` w `touchend` NIE jest potrzebny — scroll został już obsłużony (lub nie) na podstawie ruchu, a przeglądarka sama nie robi nic szkodliwego na `touchend`.

## What changed
1. `src/components/AppLeftPanel.tsx`:
   - Dodany `useRef<{ x: number; y: number } | null>(null)` na górze komponentu (śledzenie startu dotyku).
   - `onTouchStart` → zapisuje `ref.current = { x: touch.clientX, y: touch.clientY }` (bez preventDefault, bez wołania tapa).
   - `onTouchMove` → aktualizuje bieżącą pozycję w ref (opcjonalnie — wystarczy liczyć dystans w touchend; decyduję w implementacji).
   - `onTouchEnd` → jeśli `|endPos - startPos| < 10px` → `onPaletteItemTap?.(templateId)`; czyści `ref.current = null`.
   - Aktualizacja komentarza `// WHY:` wyjaśniająca nowy model (tap = dodaj, swipe = przewiń).
2. Brak innych zmian.

## Test
- **Test jednostkowy** w nowym lub istniejącym pliku testowym: symulacja `touchstart` → `touchend` w tym samym miejscu (0px ruchu) → `onPaletteItemTap` wywołany 1×. Symulacja `touchstart` → `touchmove` 30px → `touchend` → `onPaletteItemTap` NIE wywołany. Pinuje kontrakt "tap dodaje, swipe nie".
  - `AppLeftPanel` nie ma dziś testu; jeśli ciężko go zamontować (dużo zależności), dodam test logiki detekcji jako czystą funkcję wydzieloną do `src/lib/...` — ale to opcjonalne, zależy od kosztu montażu.
- **Manualny smoke**: `npm run dev` → DevTools mobile viewport → dodaj moduł tap → sprawdź że swipe po liście przewija. Nie zrobię realnego mobile testu tutaj.
- **Lint zero-warning** + **`npm run check`** (1047 unit tests green, baseline utrzymany).

## Świadomie NIE robię
- Nie zmieniam zwijania panelu po tap (status quo — potwierdzone).
- Nie dodaję osobnego haptiku (już jest w `usePaletteActions.ts:335`).
- Nie zmieniam desktop DnD (`onDragStart` nietknięty).
- Nie refaktoruję całego palette UX — tylko ta jedna regresja.
- Nie ruszam AGENTS.md (to nie high-risk zmiana kontraktu, tylko naprawa buga w istniejącym komponencie — choć komponent jest w "container files" tabeli teraz, nie dotykam jego struktury).

## Ryzyko
Niskie. Zmiana w 1 pliku, 3 handlery. Najgorszy przypadek: jeśli detekcja ruchu zawiedzie na jakimś dziwnym WebView (np. Capacitor iOS z nietypowym `touchmove`), tap może nie zadziałać — ale fallback to nadal `draggable=true` (DnD), więc desktop i tak działa, a mobile zyskuje scroll. Próg 10px jest bezpieczny (iOS używa 10px, Android 8-10px).

## Co jeśli chcesz więcej po naprawie
Po wdrożeniu mogę dodać: animację "wciśnięcia" modułu przy aktywacji (visual feedback), albo dedykowany FAB "Dodaj moduł" (już jest `FloatingAddButton.css` — może istnieje). To osobne zadanie.