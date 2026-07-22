# Analiza responsywności mobilnej DINBoard Web

## Data: 2026-06-09
## Zakres: Pełny przegląd CSS i komponentów pod kątem urządzeń mobilnych (< 768px)

---

## 1. Stan obecny – co działa

Aplikacja ma już rozbudowane media queries dla `max-width: 768px` w głównym pliku `App.css`. Zaimplementowano:
- **Panel boczny jako drawer** dla widoku desktop z `mobile-side-drawer-overlay` i `mobile-side-drawer`
- **Sheet tabs na górze obszaru treści** (grid-row: 1, poniżej toolbara) – wzorem desktopu, zamiast fixed bottom bar
- **Toolbar z hamburgerem** (dla Capacitor/natywnej aplikacji)
- **Panel lewy i prawy** na zmianę pokazują się w dolnym obszarze (grid-row: 3)
- **Ukrywanie warstw** (`is-right-panel-hidden`, `is-left-panel-hidden`)
- **Pinch-to-zoom** w `DinRailCanvas.tsx`
- **`touch-action: pan-y`** na elementach palety
- **Polyfill mobile-drag-drop** w `main.tsx`
- **`env(safe-area-inset-top/bottom)`** dla notcha

---

## 2. Problemy krytyczne (błędne lub niespójne zachowanie)

### 2.1. Paski przewijania (scrollbar) nie są responsywne – brak `overflow-y: auto` na głównym kontenerze

**Plik:** `App.css`
**Problem:** Wiele elementów nie ma zdefiniowanego przewijania na wąskich ekranach. Gdy treści są wyższe niż okno, zawartość może być ucięta.

**Lokalizacje do sprawdzenia:**
- `.canvas-area` – brak overflow-y: auto na mobile (w desktopie `overflow: hidden`)
- `.panel-content` wewnątrz `.left-panel` i `.right-panel` – może nie mieć odpowiedniego overflow

### 2.2. Konflikt `grid-template-rows` w `.main-content` na mobile

**Plik:** `App.css`

Na mobile (`max-width: 768px`) grid rows:
```css
.main-content {
  grid-template-columns: 1fr;
  grid-template-rows: auto minmax(0, 1fr) auto;
  /* Row 1 = sheet tabs, Row 2 = canvas, Row 3 = left/right panels */
}
```

**Stan:** Poprawiony – sheet tabs przeniesione na górę (`grid-row: 1`), zamiast fixed bottom bar. Panele na dole (`grid-row: 3`). Sheet tabs zawsze widoczne niezależnie od widoczności paneli.

### 2.3. Znikający pasek statusu (`statusbar`) i `workspace-statusbar`

**Plik:** `App.css`, media 768px:
```css
.statusbar, .workspace-statusbar, .workspace-hud--bottom-left {
  display: none;
}
```

To jest OK dla małych ekranów, ale **`.workspace-hud--bottom-left`** jest również używany jako źródło informacji. Brak jakiegokolwiek zastępnika tych informacji na mobile.

### 2.4. Flyout menu na mobile wymaga poprawy

**Plik:** `App.css`, media 768px:
```css
.flyout-menu, .flyout-menu.wide {
  position: fixed;
  top: 46px;
  left: 6px;
  right: 6px;
  width: auto;
}
```

**Problem:**
- `top: 46px` – może być nieodpowiednie gdy toolbar jest wyższy (kompaktowy header ma 56px)
- Długie menu (np. Plik) może nie mieścić się na ekranie – brak `max-height` i `overflow-y`
- Menu nie uwzględnia safe-area

### 2.5. Brak zabezpieczenia przed przycięciem długich nazw w sheet tabs

**Plik:** `AppSheetTabs.css`, media 768px:
```css
.sheet-tab span {
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
```

**Problem:** Przy 5 zakładkach na małym ekranie (320px), każda ma ~64px szerokości. Przy dłuższych etykietach (np. "Rozdzielnica połączenia", "Schemat obwodów") tekst będzie ucięty. To akceptowalne, ale może być mylące.

---

## 3. Problemy średnie

### 3.1. DinRailGeneratorDialog – brak responsywności

**Plik:** `DinRailCanvas.tsx` (komponent `DinRailGeneratorDialog`)

Na desktopie:
```css
.din-rail-dialog {
  grid-template-columns: minmax(360px, 1fr) 130px;
  width: 520px;
  height: 330px;
}
```

Na mobile (w media query):
```css
.din-rail-dialog {
  grid-template-columns: 1fr;
  width: min(520px, calc(100% - 16px));
  height: min(620px, calc(100% - 16px));
  overflow: auto;
}
```

**Problem:** Wysokość `min(620px, calc(100% - 16px))` może być zbyt duża na bardzo małych ekranach (np. telefon 640px wysokości z paskiem przeglądarki). Lepsze byłoby `min(620px, calc(100vh - 32px))`.

### 3.2. Toolbar na mobile – zbyt wiele elementów w jednym wierszu

**Plik:** `App.css`, media 768px:
```css
.toolbar-shell {
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 6px;
  overflow-x: auto;
}
```

**Problem:** W trybie mobilnym hamburger i inne przyciski są w jednym wierszu. Jednak w `AppHeader.tsx` dla isNative=true jest tylko hamburger, ale dla przeglądarki (isNative=false) nie ma na mobile żadnego uproszczenia – wszystkie przyciski (Plik, Widok, Narzędzia, Pomoc, Zgłoś pomysł, Postaw kawę) są wyświetlane. Powinny być ukryte na mobile (zastąpione drawerem).

### 3.3. Brak `overscroll-behavior` na drawerze mobilnym

**Plik:** `App.css`:
```css
.mobile-side-drawer {
  ...
  animation: slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
```

**Problem:** Gdy drawer jest otwarty, przewijanie w nim może powodować "pull-to-refresh" lub overscroll przeglądarki. Brakuje:
```css
.mobile-side-drawer-content {
  overscroll-behavior: contain;
}
```

### 3.4. HUD i floating delete button na mobile

**Plik:** `App.css`, media 768px:
```css
.workspace-floating-delete-btn {
  bottom: auto;
  top: 16px;
  left: auto;
  right: 16px;
  transform: none;
  padding: 2px;
  border-radius: 99px;
}
```

**Problem:** Przycisk jest w prawym górnym rogu, ale gdy na ekranie jest dużo modułów, może nachodzić na toolbar. W fiksie `top: 16px` nie uwzględnia safe-area-top ani wysokości toolbara.

### 3.5. Schematic zoom dock na mobile

**Plik:** `SchematicCanvas.tsx` – komponent `schematic-zoom-dock`

Na małych ekranach zoom dock jest w `schematic-zoom-dock` (position: absolute, right: 14px, bottom: 48px).

**Stan:** Poprawione – zoom dock ma `bottom: calc(48px + 68px)` na mobile, uwzględniający sheet tabs bar.

### 3.6. PDF Workspace na mobile – split pane za wąski

**Plik:** `App.css`, media 768px:
```css
.main-content.is-pdf-workspace {
  grid-template-rows: 44px minmax(0, 1fr) minmax(280px, 46vh);
}
```

**Problem:** Gdy arkusz PDF i prawy panel są widoczne na małym ekranie, dolna część zajmuje 40vh. To może być za mało na jakieś użyteczne treści, ale zredukowano z 46vh do 40vh.

### 3.7. `min-height: 92px` w toolbar-shell

**Plik:** `App.css`:
```css
.toolbar-shell {
  min-height: 92px;
}
```

Na mobile ta wysokość pozostaje. Lepsze byłoby:
```css
@media (max-width: 768px) {
  .toolbar-shell {
    min-height: 56px;
  }
}
```

### 3.8. SVG Import Dialog – przycięcie na małych ekranach

**Plik:** `App.css`, media 768px:
```css
.svg-import-dialog {
  width: min(calc(100vw - 16px), 680px);
  height: min(calc(100vh - 16px), 680px);
}
```

**Problem:** `calc(100vh - 16px)` nie uwzględnia toolbara. Dialog może być przycięty u dołu. Lepsze: `calc(100vh - 120px)`.

**Stan:** Poprawione – `calc(100vh - 120px)`.

### 3.9. Canvas `touch-action` – brak pełnej kontroli

**Plik:** `DinRailCanvas.tsx`, canvas area:
```css
.din-rail-surface {
  cursor: grab;
  background: transparent;
  touch-action: none;
}
```

To jest poprawne dla samego canvasa, ale **DinRailCanvas.tsx** używa React pointer events + Wheel event. Na Androidzie może to działać nieidealnie gdy przeglądarka próbuje interpretować gesty.

W `SchematicCanvas.tsx` canvas ma `touchAction: "none"` inline – to jest poprawne.

### 3.10. Sheet tabs przeniesione na górę (zamiast fixed bottom bar)

**Decyzja UX:** Sheet tabs przeniesione z `position: fixed; bottom: 0` na górę obszaru treści (`grid-row: 1; position: relative`), wzorem układu desktopowego.

**Zmiany:**
- `.app-shell` nie ma już `padding-bottom: 68px`
- `.sheet-tabs-bar` na mobile: `position: relative; grid-row: 1; border-bottom: 1px solid var(--panel-border)` (zamiast `position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000`)
- `.main-content` grid: `grid-template-rows: auto minmax(0, 1fr) auto` (row 1 = sheet tabs, row 2 = canvas, row 3 = panele)
- `env(safe-area-inset-bottom)` usunięty (sheet tabs nie są już na dole)

**Zalety:**
- Odzyskanie ~68px pionowej przestrzeni na treść
- Spójność z desktopowym układem (tabs na górze)
- Bottom area wolna dla gestów i interakcji z canvasem

---

## 4. Problemy w logice JavaScript/TypeScript

### 4.1. `useSheetPanelState` – inicjalizacja `showRightPanel` i `showLeftPanel`

**Plik:** `src/hooks/useSheetPanelState.ts`
```typescript
const [showRightPanel, setShowRightPanel] = useState(() => window.innerWidth > 768);
const [showLeftPanel, setShowLeftPanel] = useState(() => window.innerWidth > 768);
```

**Problem:**
- Te wartości są ustalane tylko przy pierwszym renderze. Jeśli użytkownik obróci telefon, stan się nie zaktualizuje automatycznie.
- Brak nasłuchiwania `resize` do automatycznego przełączania paneli.

### 4.2. Brak obsługi gestów przesunięcia (swipe) do zamknięcia drawer'a

**Plik:** `AppHeader.tsx` – brak swipe-to-close na `mobile-side-drawer`.

### 4.3. `mobile-drag-drop` polyfill może powodować problemy

**Plik:** `main.tsx`
```typescript
polyfill({
  dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride
});
```

Ten polyfill jest potrzebny dla drag & drop na dotykowych urządzeniach. Jednak:
- Może kolidować z dotykowym przewijaniem (scroll) w palecie modułów
- `touch-action: pan-y` na `.palette-item` już ogranicza ten problem, ale nie całkowicie go eliminuje

### 4.4. DinRailCanvas – pinch zoom na touch urządzeniach

**Plik:** `DinRailCanvas.tsx`:
```typescript
viewport.addEventListener("touchstart", onTouchStartNative, { passive: false });
viewport.addEventListener("touchmove", onTouchMoveNative, { passive: false });
```

**Problem:** `preventDefault()` w touchstart/touchmove może zablokować przewijanie strony, gdy użytkownik próbuje przewinąć stronę w innym miejscu niż canvas. Na szczęście event listener jest tylko na viewportRef, co ogranicza ryzyko.

---

## 5. Status wdrożenia

### ✅ PRIORYTET 1 – Wdrożone (2026-06-09)

| # | Problem | Status | Pliki |
|---|---------|--------|-------|
| 1 | Toolbar na mobile – hamburger zamiast desktop menu | ✅ | `AppHeader.tsx`, `App.css` |
| 2 | Konflikt grid-template-rows – sheet tabs zawsze widoczne | ✅ | `App.css` |
| 3 | DinRailGeneratorDialog wysokość – `calc(100vh - 120px)` | ✅ | `App.css` |
| 4 | Flyout menu overflow – scroll + max-height | ✅ | `App.css` |
| 5 | Schematic zoom dock – nie koliduje z sheet tabs | ✅ | `App.css` |

### ✅ PRIORYTET 2 – Wdrożone (2026-06-09)

| # | Problem | Status | Pliki |
|---|---------|--------|-------|
| 6 | `useSheetPanelState` – resize listener z debounce | ✅ | `useSheetPanelState.ts` |
| 7 | Swipe-to-close dla drawer'a (przeciągnięcie w lewo >50px) | ✅ | `AppHeader.tsx` |
| 8 | Toolbar-shell min-height: 56px na mobile | ✅ | `App.css` (zrobione w P1) |
| 9 | SVG Import Dialog – `calc(100vh - 120px)` | ✅ | `App.css` |
| 10 | Overscroll-behavior: contain na drawer content | ✅ | `App.css` |

### ⏳ PRIORYTET 3 – Do rozważenia

| # | Problem | Status |
|---|---------|--------|
| 11 | PDF Workspace split – `minmax(200px, 40vh)` zamiast `minmax(280px, 46vh)` | ✅ |
| 12 | Statusbar na mobile – minimalistyczny pasek z nazwą pliku (fixed bottom: 8px) | ✅ |
| 13 | Canvas drop target – już obsługiwany przez polyfill `mobile-drag-drop` | ✅ (bez zmian) |

---

## 6. Podsumowanie

### 🔧 Co zostało naprawione

1. **Toolbar na mobile**: Desktopowe przyciski menu (Plik/Widok/Narzędzia/Pomoc/Zgłoś pomysł/Postaw kawę) są ukryte na ekranach ≤768px – zastąpione hamburgerem i drawerem, działa zarówno w web jak i natywnie
2. **Sheet tabs na górze** (zamiast fixed bottom bar): Odzyskano ~68px przestrzeni na dole. Tabs w `grid-row: 1` poniżej toolbara, spójne z desktopem
3. **Dialogi nie są przycięte**: DinRailGenerator i SVG Import używają `calc(100vh - 120px)`
4. **Flyout menu scrollowalne**: Dodano max-height i overflow-y: auto
5. **Zoom dock na mobile**: Uwzględnia sheet tabs bar
6. **Auto-przełączanie paneli przy resize**: `useSheetPanelState` reaguje na zmianę rozmiaru okna z debounce 200ms
7. **Swipe-to-close drawer**: Przeciągnięcie w lewo >50px zamyka drawer
8. **Toolbar niższy na mobile**: `min-height: 56px` zamiast 92px
9. **Overscroll-behavior**: Drawer content nie powoduje pull-to-refresh
10. **PDF Workspace split**: Zmniejszony panel dolny `minmax(200px, 40vh)`
11. **Statusbar na mobile**: Minimalistyczny floating pasek u dołu (`bottom: 8px`) z nazwą pliku + kropką niezapisane
