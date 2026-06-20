# Plan poprawy rysowania i edycji DINBoard

Data: 2026-06-20
Status: wstępny szkielet do dyskusji
Autor: Mavis (mavis, root session mvs_b91deb7138064201bdf35e46e8d67734)

## Kontekst

User-developer (ekspert elektryk, autor) potwierdził że:
- Kolory tulejek są poprawne (pokrycie 100%)
- Długości tulejek są poprawne (pokrycie 100%)
- **Edge case: tulejka pojawia się czasem w nieodpowiednim miejscu** — pierwotnie
  oznaczony "do późniejszej naprawy", ale podniesiony do MUST po decyzji
  "rysowanie ma być wszystko ok i łatwe w edycji"

### Stan techniczny (sprawdzony w tej sesji)

**Warstwy canvas (5 warstw):**
1. Tło: Listwy dystrybucyjne, szyny zbiorcze
2. Terminal Hotspots: zielone interaktywne punkty
3. Przewody i tulejki (`DinRailConnectionWires.tsx` 12 KB + `DinRailFerrulesGroup.tsx` 8 KB)
4. Pierwszy plan: RCD, MCB, Złączki
5. Mosiężne szyny (`DinRailConnectionsForegroundLayer.tsx`)

Hierarchia udokumentowana w `docs/TULEJKI_LOGIKA.md`.

**Logika domenowa:**
- `src/lib/dinRailSelection.ts` (7 KB) + testy (3 KB)
- `src/lib/dinRailSnap.ts` (4.7 KB) + testy (3.6 KB)
- `src/lib/routing/wireRoutingEngine.ts` (13 KB) + testy
- `src/lib/connections/connectionsLogic.ts` (3.4 KB) + testy
- `src/lib/connections/canvasHelpers.ts` (6 KB) + testy
- `src/lib/modules/moduleTerminals.ts` (33 KB) — container file

**Hooki UI:**
- `useSymbolDragAndDrop.ts` (8 KB)
- `useSymbolSelection.ts` (2 KB)
- `useSymbolEditing.ts` (3 KB)
- `useSymbolHistory.ts` (7 KB) + testy (11 KB)

**Snapshot do PDF:**
- `src/lib/export/dinRailSnapshotService.ts` (21 KB)
- `src/components/PdfDocumentationPage.tsx` (18 KB)

**Pliki canvasLayers:** 16 plików (łącznie ~64 KB) — największe to
`DinRailConnectionWires` (12 KB) i `DinRailFerrulesGroup` (8 KB).

### Znalezione słabości (w tej sesji)

1. **Edge case: tulejka w nieodpowiednim miejscu** — potwierdzone przez usera
2. **Brak performance budget** — `DinRailCanvasPixi.tsx` nie ma żadnych
   mechanizmów culling/FPS measurement/cache strategy
3. **Brak view-export consistency checks** — `dinRailSnapshotService.ts` 21 KB
   sugeruje dużo logiki snapshotu, ale brak automatycznych testów
   "canvas = PDF"
4. **`src/fixtures/demoData.ts`** — pusta tablica `symbols: []`. Testy E2E
   startują z zerowymi danymi, więc nie pokrywają realnego użycia
5. **`DinRailConnectionsCanvas.tsx`** — 19 KB container file (znany z AGENTS.md)
6. **Drag & drop bounds** — `TULEJKI_LOGIKA.md` sekcja 5 opisuje problem,
   ale implementacja w kodzie nie jest potwierdzona

---

## MUST — przed publicznym wydaniem v1.0

### 1. Naprawić edge case: tulejka w nieodpowiednim miejscu

**Dlaczego krytyczne:** User-developer potwierdził bug. Wpływa na jakość
PDF dokumentacji (klient widzi tulejkę poza zaciskiem). Trudne do debugowania
bo zależy od kąta trasy przewodu.

**Pliki:**
- `src/lib/connections/connectionsLogic.ts` (logika obliczania pozycji)
- `src/components/canvasLayers/FerruleGraphic.tsx` (renderowanie)
- `src/lib/routing/wireRoutingEngine.ts` (pin assignment vs terminal position)
- `src/lib/modules/moduleTerminals.ts:74-119` (specjalne case'y Blok rozdzielczy)
- nowy: `src/lib/connections/ferrulePositionCalculator.ts` (dedykowana logika)

**Definition of Done:**
- Minimum 5 wizualnych testów regresji (snapshot lub grid alignment)
- Test: tulejka pojawia się dokładnie na pin assignment, ±1 px
- Test: obrót trasy przewodu nie zmienia pozycji tulejki
- Test: specjalne case'y (Blok rozdzielczy, Listwa zaciskowa) mają swoje assercje
- Reprodukcja buga z `TULEJKI_LOGIKA.md` sekcja 4 (`requiredExitOffset`)
  jest pokryta testem

**Czas:** 1-2 tygodnie

**Owner rein:** `canvas-expert` + `electrical-expert`

### 2. Performance budget dla Pixi canvas

**Dlaczego krytyczne:** DINBoard nie ma żadnych metryk wydajności. Przy 50+
modułach (realny projekt dla 6-obwodowego domu z pełnym RCD/MCB/PE) Pixi
może lagować. Wydajność to UX — spowolnienie = frustracja.

**Pliki:**
- `src/components/DinRailCanvasPixi.tsx` (11 KB)
- `src/lib/dinRailCanvas/` (5 plików)
- nowy: `src/lib/dinRailCanvas/performanceMonitor.ts`

**Co zrobić:**
- FPS counter w trybie dev (widoczny overlay)
- Texture atlas dla powtarzalnych grafik modułów
- `devicePixelRatio` cap (`Math.min(window.devicePixelRatio, 2)`)
- Sprite pooling dla tulejek (reuse zamiast alokacji)
- Culling: nie rysuj modułów poza viewport
- Lazy rendering dla warstw z wieloma elementami (`DinRailConnectionWires`)

**Definition of Done:**
- FPS ≥ 30 na telefonie klasy A-series z 50+ modułami
- FPS ≥ 60 na desktop z 100+ modułami
- Dev mode pokazuje FPS overlay
- Benchmark test: renderowanie 100 modułów < 16ms per frame
- Profil pamięci: < 200 MB RAM dla typowego projektu

**Czas:** 1-2 tygodnie

**Owner rein:** `canvas-expert`

### 3. View-export consistency (canvas = PDF)

**Dlaczego krytyczne:** DINBoard to narzędzie inżynierskie — PDF jest deliverable.
Jeśli klient widzi co innego na ekranie niż w PDF, to utrata zaufania.
Obecnie snapshot service 21 KB bez automatycznych testów = ryzyko.

**Pliki:**
- `src/lib/export/dinRailSnapshotService.ts` (21 KB)
- `src/components/PdfDocumentationPage.tsx` (18 KB)
- nowy: `src/lib/export/snapshotTestCases.ts` (fixture projects)

**Co zrobić:**
- Testy wizualne: ten sam projekt renderowany w canvas vs PDF = pixel-perfect
- Fixture projects: 3-5 reprezentatywnych projektów (mieszkanie 60m², dom 150m²,
  warsztat, biuro, custom)
- Test: zmiana w `moduleCatalog.ts` nie psuje snapshotu dla istniejących projektów
- Raport z testów: ile pokrycia, które elementy nie są testowane

**Definition of Done:**
- 3-5 fixture projects (realne projekty, nie syntetyczne)
- Test: snapshot canvas → PDF dla każdego fixture = identyczny
- Test: zmiana `customRadius` nie powoduje regresji wizualnej
- Test: Blok rozdzielczy + Listwa zaciskowa + MCB + RCD renderują się tak samo
- CI/CD uruchamia te testy przed każdym release

**Czas:** 2 tygodnie

**Owner rein:** `canvas-expert` + `pdf-expert`

### 4. Drag & drop bounds — dokończenie z TULEJKI_LOGIKA.md

**Dlaczego krytyczne:** Dokumentacja opisuje problem i rozwiązanie. Jeśli
implementacja jest niedokończona, user-developer zauważy to przy pierwszym
użyciu na realnym projekcie. Łatwiej dokończyć teraz niż debugować w terenie.

**Pliki:**
- `src/components/canvasLayers/DinRailConnectionWires.tsx` (12 KB)
- `src/hooks/useSymbolDragAndDrop.ts` (8 KB)
- `src/components/DinRailConnectionsCanvas.tsx` (19 KB)

**Co zrobić:**
- Sprawdzić status implementacji bounds (czy zrobione czy nie)
- Jeśli nie: dodać minimalną długość prostego odcinka po wylądowaniu na tulejce
- Testy: przeciągnięcie przewodu na tulejkę nie "wcina się" w jej grafikę
- Testy: snap do tulejki respektuje `requiredExitOffset` z TULEJKI_LOGIKA.md sekcja 4

**Definition of Done:**
- Bounds działają dla wszystkich kątów trasy przewodu
- Test: snap + bounds interakcja nie łamie tulejki
- Dokumentacja zaktualizowana (status: implemented)

**Czas:** 3-5 dni

**Owner rein:** `canvas-expert`

### 5. Snap clarity — kiedy snap działa, wizualna informacja

**Dlaczego krytyczne:** Snap pomaga lub przeszkadza w zależności od tego
czy user widzi gdzie zaskoczy. Bez wizualnej informacji snap jest magią.
Przy 100 modułach snap do najbliższego terminala może być zaskakujący.

**Pliki:**
- `src/lib/dinRailSnap.ts` (4.7 KB) + testy
- `src/components/canvasLayers/DinRailVisualHotspots.tsx` (4 KB)
- nowy: `src/components/canvasLayers/SnapIndicator.tsx`

**Co zrobić:**
- Wizualny indicator aktywnego snap (np. kółko, linia, highlight)
- Snap target widoczny przed drop (preview)
- Snap off mode dla ekspertów (Power User: Ctrl+drag bez snap)
- Snap distance configurable w ustawieniach (domyślnie 8 px)

**Definition of Done:**
- Snap indicator pojawia się gdy user zbliża moduł do snap target
- Snap target jest highlighted przed drop
- Ctrl+drag = free move (bez snap)
- Ustawienie "Snap distance" w panelu preferencji

**Czas:** 1 tydzień

**Owner rein:** `canvas-expert`

### 6. Hitbox precyzja i dostępność

**Dlaczego krytyczne:** Hitbox za mały = trudno kliknąć mały element.
Hitbox za duży = zasłania inne elementy. Plus accessibility: klawiatura
musi działać (Tab, Enter, Escape).

**Pliki:**
- `src/components/canvasLayers/DinRailHitboxesLayer.tsx` (2 KB)
- `src/components/canvasLayers/DinRailHitTargets.tsx` (4 KB)
- `src/lib/dinRailSelection.ts` (7 KB)

**Co zrobić:**
- Audit hitboxów: minimum 24×24 px dla każdego interaktywnego elementu
- Hover state dla każdego interaktywnego elementu (cursor: pointer)
- Klawiatura: Tab = nawigacja między modułami, Enter = edytuj, Escape = anuluj
- Focus ring widoczny (nie ukryty outline)

**Definition of Done:**
- Każdy moduł ma hitbox ≥ 24×24 px
- Każdy interaktywny element ma hover state
- Klawiatura: pełna nawigacja po canvasie (testy accessibility)
- Focus ring widoczny (WCAG AA kontrast)

**Czas:** 1 tydzień

**Owner rein:** `canvas-expert` + `developer`

### 7. Undo/redo coverage

**Dlaczego krytyczne:** User edituje projekt, robi błąd, chce cofnąć.
Obecny `useSymbolHistory.ts` (7 KB) pokrywa symbole. Czy pokrywa
wires, ferrule policy, layout changes?

**Pliki:**
- `src/hooks/useSymbolHistory.ts` (7 KB) + testy (11 KB)
- `src/hooks/useSymbolActions.ts` (3 KB) + testy (34 KB)

**Co zrobić:**
- Audit: jakie akcje są undo'able? (drag, edit, delete, snap, ...)
- Dodanie undo dla: wire add/remove, ferrule regeneration, layout changes
- Test: każda undo'able akcja ma swój test round-trip
- Wizualne: toast/info "Akcja cofnięta" po Ctrl+Z

**Definition of Done:**
- 100% akcji edycyjnych jest undo'able
- Ctrl+Z / Ctrl+Y działają globalnie
- Toast potwierdza akcję undo/redo
- Testy round-trip dla każdej akcji undo'able

**Czas:** 1 tydzień

**Owner rein:** `developer`

---

## SHOULD — przed pierwszymi płacącymi klientami

### 8. Grupowa edycja (multi-select)

**Dlaczego ważne:** Elektryk chce przesunąć 5 obwodów naraz, albo zmienić
fazę wszystkim MCB jednocześnie. Bez grupowej edycji = 5× klikanie.

**Pliki:**
- `src/lib/dinRailSelection.ts` (7 KB)
- `src/hooks/useSymbolSelection.ts` (2 KB)
- `src/components/canvasLayers/DinRailSelectionOverlay.tsx` (1 KB)
- `src/components/canvasLayers/DinRailGroupsLayer.tsx` (4 KB)

**Co zrobić:**
- Shift+klik = dodaj do selekcji
- Ctrl+A = zaznacz wszystko
- Marquee selection (przeciągnij ramkę)
- Multi-edit: zmiana fazy/amperażu dla wszystkich zaznaczonych
- Multi-drag: przesuwanie grupy z zachowaniem offsetów

**Definition of Done:**
- Shift+klik działa
- Ctrl+A zaznacza wszystko
- Marquee selection działa (drag z pustego miejsca)
- Multi-edit dla fazy/amperażu działa
- Multi-drag przesuwa grupę z offsetami

**Czas:** 1-2 tygodnie

**Owner rein:** `canvas-expert` + `developer`

### 9. Context menu (prawy klik)

**Dlaczego ważne:** Prawy klik na moduł = menu kontekstowe z akcjami.
Bez tego user musi pamiętać skróty lub szukać w toolbar.

**Pliki:**
- nowy: `src/components/canvasLayers/ContextMenu.tsx`
- `src/hooks/useSymbolActions.ts`

**Co zrobić:**
- Prawy klik na moduł: Edytuj, Duplikuj, Usuń, Zmień fazę, Lock/Unlock
- Prawy klik na przewód: Usuń, Zmień grubość, Lock
- Prawy klik na puste canvas: Dodaj moduł, Wklej, Cofnij
- Klawisz Escape = zamknij menu

**Definition of Done:**
- Menu kontekstowe dla modułu, przewodu, pustego canvasu
- Akcje dostępne w menu są też w toolbar (spójność)
- Klawisz Escape zamyka menu
- Menu respektuje pozycję kursora (nie wychodzi poza ekran)

**Czas:** 3-5 dni

**Owner rein:** `developer`

### 10. Skróty klawiszowe dla zaawansowanych

**Dlaczego ważne:** Power user (sam user-developer + doświadczeni elektrycy)
chcą szybko pracować. Ctrl+C/V/X, Delete, Ctrl+D (duplicate), Ctrl+G (group).

**Pliki:**
- nowy: `src/hooks/useKeyboardShortcuts.ts`
- `src/hooks/useSymbolActions.ts`

**Standardowe skróty:**
- Ctrl+Z / Ctrl+Y: undo/redo
- Ctrl+C / Ctrl+V / Ctrl+X: copy/paste/cut
- Delete: usuń zaznaczone
- Ctrl+D: duplikuj zaznaczone
- Ctrl+A: zaznacz wszystko
- Ctrl+G / Ctrl+Shift+G: grupuj / rozgrupuj
- Ctrl+L: zablokuj/odblokuj (lock)
- Ctrl+S: zapisz (mimo autosave)
- Ctrl+Shift+S: zapisz jako

**Definition of Done:**
- Lista skrótów dostępna w Help dialogu
- Skróty działają globalnie (nie tylko w canvas)
- Konflikt z przeglądarką (Ctrl+W itp.) rozwiązany
- Wszystkie skróty są testowane (symulowane keydown event)

**Czas:** 3-5 dni

**Owner rein:** `developer`

### 11. Drag preview (przed upuszczeniem)

**Dlaczego ważne:** Drag z palety do canvasu — user widzi gdzie moduł
wyląduje *zanim* upuści. Bez preview = dużo "upuść, nie tu, cofnij".

**Pliki:**
- `src/hooks/useSymbolDragAndDrop.ts` (8 KB)
- `src/components/canvasLayers/DinRailDrawingPreview.tsx` (5 KB)

**Co zrobić:**
- Ghost element przy drag (follow mouse)
- Highlight snap target
- Wizualny wskaźnik "można tu upuścić" vs "nie można"
- Anulowanie: Escape lub drop poza canvas

**Definition of Done:**
- Ghost podąża za kursorem
- Snap target jest highlighted
- Drop na nieprawidłowe miejsce = visual feedback (czerwone kółko?)
- Escape anuluje drag

**Czas:** 3-5 dni

**Owner rein:** `canvas-expert`

### 12. Realistyczny demo data (nie puste `fixtures/demoData.ts`)

**Dlaczego ważne:** Testy E2E startują z pustymi danymi. To nie pokrywa
realnego użycia. Demo dla nowego użytkownika powinno być wypełnione.

**Pliki:**
- `src/fixtures/demoData.ts` (3.1 KB, puste `symbols: []`)
- nowy: `src/fixtures/sampleProjects.ts`

**Co zrobić:**
- 3 sample projects (mieszkanie 60m², dom 150m², biuro 80m²)
- Każdy z: 5-10 obwodów, dobór MCB/RCD, pełną listą materiałów
- Przykład użycia w `App.tsx` "Otwórz projekt przykładowy"

**Definition of Done:**
- 3 sample projects z pełnymi danymi
- Menu "Projekty przykładowe" w `AppHeaderFileMenu`
- Testy E2E startują z sample project zamiast pustego

**Czas:** 2-3 dni (głównie treść domenowa)

**Owner rein:** `electrical-expert` (treść) + `developer` (integracja)

---

## NICE — po v1.0, roadmap v1.1+

### 13. Animacje (płynne przejścia, nie "skokowe")
- Snap animation, layout transitions
- Ale ostrożnie: animacje mogą lagować na słabszych urządzeniach

### 14. Widok 3D rozdzielnicy
- Realistyczny preview jak wygląda rozdzielnica po montażu
- Wysoki effort, ale wyróżniający

### 15. AR (rozszerzona rzeczywistość) preview
- Nakładanie schematu na zdjęcie istniejącej rozdzielnicy
- Future feature, duży effort

### 16. Auto-layout (inteligentne rozmieszczanie)
- "Ułóż optymalnie" — automatyczne pozycjonowanie modułów
- Wymaga algorytmów graph layout (Sugiyama itp.)

---

## Sekwencja wykonania (rekomendowana)

```
1. Edge case tulejka (1)              ← sygnowane przez usera, najwyższy priorytet
2. Performance budget (2)             ← bez tego "wszystko ok" nie jest mierzalne
3. View-export consistency (3)        ← PDF to deliverable, musi być spójny
4. Drag & drop bounds (4)             ← dokończenie z TULEJKI_LOGIKA
5. Snap clarity (5)                   ← UX rysowania
6. Hitbox precyzja (6)                ← dostępność
7. Undo/redo coverage (7)             ← bezpieczeństwo edycji
   --- v1.0 RELEASE ---
8. Grupowa edycja (8)
9. Context menu (9)
10. Skróty klawiszowe (10)
11. Drag preview (11)
12. Sample projects (12)
```

---

## Reguły dla agentów (reins) — obowiązkowe

Uzupełnienie reguł z `AGENTS.md` sekcja "Distribution target and audience":

1. **Visual regression test required** — każda zmiana w canvas/wires/ferrules
   musi mieć test wizualny (snapshot lub grid alignment). Bez tego łatwo
   wprowadzić subtelny bug który user zobaczy dopiero w terenie.

2. **Performance budget honored** — żadna zmiana nie może obniżyć FPS poniżej
   budżetu (30 mobile, 60 desktop). Nowy feature musi mieć benchmark.

3. **View-export consistency** — zmiana w canvas/wires/snap wymaga
   jednoczesnej aktualizacji snapshot service. Test pixel-perfect wymagany.

4. **No keyboard trap** — każda akcja dostępna myszką musi być dostępna
   klawiaturą. Tab/Enter/Escape testowane.

5. **Undo coverage** — każda edytowalna akcja musi być undo'able.
   Historia musi pokrywać pełen flow edycji.

6. **Container files need extraction** — pliki > 15 KB w `src/components/canvasLayers/`
   powinny być rozbite na mniejsze odpowiedzialności. Aktualnie:
   `DinRailConnectionWires.tsx` 12 KB (granica), `DinRailConnectionsCanvas.tsx` 19 KB (już container).

---

## Definition of Done dla "rysowanie jest wszystko ok i łatwe w edycji"

- [ ] Edge case tulejki naprawiony, 5+ testów regresji
- [ ] FPS ≥ 30 mobile / 60 desktop przy 50+ modułach
- [ ] View-export consistency: 3-5 fixture projects, test pixel-perfect
- [ ] Drag bounds działają, udokumentowane w TULEJKI_LOGIKA
- [ ] Snap indicator widoczny, Ctrl+drag = free move
- [ ] Hitbox ≥ 24×24 px dla każdego interaktywnego elementu
- [ ] Klawiatura: pełna nawigacja, focus ring widoczny
- [ ] Undo/redo dla 100% akcji edycyjnych
- [ ] Sample projects (3) dostępne w menu
- [ ] Grupowa edycja + multi-select
- [ ] Context menu (prawy klik)
- [ ] Skróty klawiszowe dla power userów
- [ ] Drag preview przed upuszczeniem
- [ ] Brak regresji w `npm.cmd run check`
- [ ] Test count wzrósł (≥ 270 baseline + nowe)

---

## Otwarte pytania do usera-developera

- [ ] Edge case tulejki — masz screenshot / konkretny projekt gdzie to się dzieje?
      To przyspieszy debug.
- [ ] Sample projects — czy chcesz żebym przygotował treść domenową
      (lista obwodów dla mieszkania 60m² itp.) czy wolisz sam?
- [ ] Skróty klawiszowe — czy masz preferencje dla niestandardowych
      (np. Ctrl+Shift+F = znajdź obwód)?
- [ ] Multi-select — czy priorytet to multi-edit (zmiana fazy) czy
      multi-drag (przesuwanie grupy)? Czy oba?

---

## Changelog tego dokumentu

- 2026-06-20 — utworzenie planu (mavis, sesja mvs_b91deb7138064201bdf35e46e8d67734)
