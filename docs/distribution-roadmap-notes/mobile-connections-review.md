# Review: Plan włączenia zakładki "Połączenia" na mobilnych

**Reviewer:** Claude Opus (konsultacja)
**Data:** 2026-07-19
**Ocena ogólna:** Plan jest **solidny i dobrze zdiagnozowany**. 3 show-stoppery trafione celnie. Mam jedną krytyczną lukę architektoniczną, kilka korekt i odpowiedzi na 7 otwartych pytań.

---

## 1. Krytyczna luka: plan ignoruje istniejący `useDinRailPinch` + `pinchMath`

> [!IMPORTANT]
> Plan wskazuje `PinchZoomImage.tsx` jako wzorzec do skopiowania (§3.2.1, §4.1, §7.1). Ale w codebase jest **bliższy, lepszy analog** — hook [useDinRailPinch.ts](file:///f:/stare%20pliki/Nowy%20projekt/src/hooks/canvas/useDinRailPinch.ts) + czysta matematyka w [pinchMath.ts](file:///f:/stare%20pliki/Nowy%20projekt/src/lib/pinchMath.ts).

### Dlaczego to ważne:

| | `PinchZoomImage` | `useDinRailPinch` + `pinchMath` |
|---|---|---|
| **Warstwa** | Komponent z `<img>` (transform CSS) | Hook + lib (czysta matematyka w `lib/`) |
| **API viewportu** | Własny `scale`/`translate` CSS | `setScaleSafe` + `setPanSafe` — **ten sam pattern co `useConnectionsViewport.setViewport`** |
| **Zoom model** | Zoom CSS image | Zoom SVG `<g transform>` — **identyczny z connections canvas** (linia 383: `translate(${pan.x}, ${pan.y}) scale(${zoom})`) |
| **Istniejące testy** | 6 testów | 6 testów w [useDinRailPinch.test.ts](file:///f:/stare%20pliki/Nowy%20projekt/src/hooks/canvas/useDinRailPinch.test.ts), w tym **regresja na kumulację zoomu** |
| **Freeze pattern** | Brak (każdy move liczy od bieżącego stanu) | ✅ `gestureRef.current` zamraża `initialScale`/`initialPan` na start gestu |
| **`pinchActiveRef`** | Brak — nie potrzebuje | ✅ Wbudowane — hook eksportuje `pinchActiveRef`, inne hooki mogą gate'ować na nim |

### Rekomendacja:

**Zamiast** tworzyć `useConnectionsPanZoom.ts` (faza 2), **stworzyć** `useConnectionsPinch.ts` jako thin wrapper wokół `computePinchTransform` z `pinchMath.ts` — dokładnie tak jak `useDinRailPinch` robi. Różnica to tylko:
- `svgRef` (SVGSVGElement) zamiast `containerRef` (HTMLDivElement)
- `setViewport()` zamiast `setScaleSafe/setPanSafe`
- Ten sam `computePinchTransform`, ten sam `midpoint/touchDistance`

Koszt: ~60 LOC zamiast ~150. Zero nowej matematyki. Testy: kopia `useDinRailPinch.test.ts` z zamienionymi ref'ami.

---

## 2. Korekty do planu

### 2.1 Faza 1 (refaktor `useConnectionsMutations`): za dużo za wcześnie

Plan proponuje rozbicie na 5 plików (§5, Faza 1). Problemem jest to, że `useConnectionsMutations` nie jest hookiem z wieloma `useState`/`useEffect` — to **jedna funkcja zwracająca 4 handlery** ([useConnectionsMutations.ts:520-525](file:///f:/stare%20pliki/Nowy%20projekt/src/hooks/connections/useConnectionsMutations.ts#L520-L525)):

```ts
return {
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handleHotspotPointerDown
};
```

Rozbijanie tego na 5 hooków to **refaktor z ryzykiem**, nie prerequisite. Pinch-zoom nie wymaga zmiany w `useConnectionsMutations` — wymaga **obok niego** nowego hooka, który:
1. Nasłuchuje `touchstart`/`touchmove`/`touchend` na `svgRef`
2. Ustawia `pinchActiveRef.current = true/false`
3. Wywołuje `setViewport()` z nowym zoomem/panem

A w `handlePointerDown` / `handlePointerMove` dodaje się jedną linijkę:

```ts
if (pinchActiveRef.current) return; // 2-palce → hook pinch przejmuje
```

**Rekomendacja:** Przenieść refaktor `useConnectionsMutations` do fazy 8 (cleanup) albo osobnego PR. Fazy 1-3 zastąpić jedną fazą: `useConnectionsPinch.ts` + gate w `handlePointerDown/Move`.

### 2.2 Faza 6 (snapping distance): propozycja w planie jest odwrotna

Plan mówi (§5, Faza 6):
```ts
// BĘDZIE:
let minDist = 36 / zoom;  // adjust to world coords for given zoom
```

To jest **odwrotnie**. Aktualnie `minDist = 36` jest w **world coords** i porównywany z `dx/dy` w world coords ([useConnectionsMutations.ts:385-397](file:///f:/stare%20pliki/Nowy%20projekt/src/hooks/connections/useConnectionsMutations.ts#L385-L397)). Dzielenie przez zoom zmniejsza threshold przy zoom-out — a potrzebujemy odwrotnie.

Poprawna formuła (żeby 36 px na ekranie = snap):
```ts
const minDist = 36 / zoom;  // ← to jest OK! World dist = screen dist / zoom
```

Zaraz — Mavis miał rację. `36 / zoom` daje większy world-distance przy mniejszym zoomie, co jest poprawne. Ale poniżej (druga propozycja — screen coords) jest czystsza i nie wymaga zmiany reszty logiki. **Rekomendacja: screen coords** (druga propozycja w planie), bo jest czytelniejsza i odporna na refaktory.

### 2.3 `pointerCapture` w `handleHotspotPointerDown` — potencjalny conflict z pinch

[useConnectionsMutations.ts:517](file:///f:/stare%20pliki/Nowy%20projekt/src/hooks/connections/useConnectionsMutations.ts#L517):
```ts
e.currentTarget.setPointerCapture(e.pointerId);
```

Pointer capture na hotspot circle przechwytuje **wszystkie** pointermove/pointerup dla tego palca. Jeśli user dotknie hotspotem jednym palcem a drugim tłem, pointer capture na pierwszym palcu uniemożliwi pinch (bo pointermove idzie do circle, nie SVG). 

**Mitigacja:** W `handleHotspotPointerDown`, jeśli `e.pointerType === "touch"`, **nie** ustawiaj pointer capture. Na touchu capture nie jest potrzebny (palec nie "ucieka" z elementu tak jak kursor myszy).

---

## 3. Odpowiedzi na 7 otwartych pytań (§9)

### Q1: Pinch-zoom wystarczy, czy 3-palce fit-to-rail?

**2 palce wystarczą.** Double-tap-to-fit to miły bonus, ale nie show-stopper. 3-palce to egzotyka, żaden popularny mobile CAD tego nie robi (AutoCAD Mobile, BricsCAD, Revit — wszędzie 2 palce + double-tap). Przycisk "fit" w `SchematicZoomDock` już istnieje i działa na tap.

Jeśli chcesz double-tap: dodaj `lastTapTime` ref, `if (Date.now() - lastTapTime < 300) resetZoom()`. ~10 LOC. Nie wymaga osobnej fazy.

### Q2: Search/filter w ConnectionsLeftPanel?

**Nie teraz.** Przy 50+ połączeniach lista jest długa, ale electrician zna symbol (np. "B16 1P → szyna N"). Grupowanie po symbolu źródłowym (accordion) > search. Ale to feature, nie prerequisite. Dodaj po fazie 7, jeśli feedback z testów manualnych wskaże problem.

### Q3: Refaktor `useConnectionsMutations` w osobnym PR?

**Tak, osobny PR.** Jak uzasadniłem w §2.1 — pinch-zoom nie wymaga refaktoru tego pliku. Gate `if (pinchActiveRef.current) return` to 2 linijki. Rozbijanie 19 KB hooka na 5 plików to ryzykowny refaktor, który powinien mieć własne review i testy regresyjne. Nie mieszaj z deliverable'em "włącz zakładkę na mobile".

### Q4: Hit radius 38/46/56 — wystarczający?

**Tak, wystarczający.** Apple's Human Interface Guidelines mówią minimum 44 pt (~44 px na 1x). Hit targets w [DinRailHitTargets.tsx](file:///f:/stare%20pliki/Nowy%20projekt/src/components/canvasLayers/DinRailHitTargets.tsx) to 38-56 px **w world coords**. Przy zoom 0.3 to 11-17 px na ekranie — za mało. Ale po dodaniu pinch-zoom user naturalnie zoomuje, i przy zoom 0.6+ to 23-34 px — akceptowalne.

Nie powiększaj hit radius w world coords — to spowoduje nakładanie się hotspotów sąsiednich modułów. Lepsze rozwiązanie to **snap threshold w screen coords** (faza 6) — rozwiązuje ten sam problem czyściej.

### Q5: E2E — real device farm czy Chrome emulation?

**Chrome DevTools mobile emulation wystarczy na start.** Playwright `--device="Pixel 7"` symuluje touch events poprawnie. BrowserStack ma sens dopiero po v1.0, kiedy masz paying users na iOS.

Jedno zastrzeżenie: **iOS Safari pinch** zachowuje się inaczej niż Chrome (Safari domyślnie robi pinch-to-zoom na stronie mimo `touchAction: none`, trzeba `<meta name="viewport" content="... user-scalable=no">`). Sprawdź, czy `index.html` ma to ustawione. Jeśli nie — dodaj do fazy 7.

### Q6: Haptic feedback?

**Tak, ale po fazie 7.** `Capacitor.Haptics.impact({ style: "light" })` na `handleHotspotPointerDown` i `handlePointerUp` (commit wire) to ~6 LOC. Warto, bo daje taktylne potwierdzenie "złapałeś terminal" / "przewód dodany". Ale to polish, nie prerequisite.

### Q7: PWA install prompt?

**Poza scope.** Nie mieszaj. Flaguj w `distribution-roadmap.md` jeśli chcesz.

---

## 4. Skorygowany plan (skrót)

| Faza | Oryginał | Propozycja | Czas |
|---|---|---|---|
| 0 | Przygotowanie | Bez zmian, ale **dodaj**: przeczytaj `useDinRailPinch.ts` i `pinchMath.ts` | 0.5 d |
| 1 | Refaktor `useConnectionsMutations` (1d) | **Przenieś do osobnego PR.** Zamiast tego: nowy `useConnectionsPinch.ts` + gate w mutations | 0.5 d |
| 2 | Pinch-zoom (0.5d) | Wchłonięte w nową fazę 1 | — |
| 3 | Gest separation (0.5d) | Wchłonięte w nową fazę 1 (gate = 2 linijki) | — |
| 4 | HUD Anuluj/Cofnij | Bez zmian | 0.5 d |
| 5 | Lista połączeń | Bez zmian | 0.5 d |
| 6 | Snapping distance | Bez zmian (screen coords) | 0.25 d |
| 7 | Włączenie zakładki | Dodaj: sprawdź `user-scalable=no` w `<meta viewport>`. Dodaj: nie ustawiaj pointer capture na touch w hotspot handler. | 0.5 d |
| 8 | Cleanup + docs | Dodaj: **opcjonalny** refaktor `useConnectionsMutations` jako follow-up PR | 0.25 d |
| **Razem** | **4.5 d** | **~3 d** (bez refaktoru mutations) | |

> [!TIP]
> Krótszy plan = mniejsze review = szybsze włączenie zakładki. Refaktor mutations jest **wartościowy**, ale może iść niezależnie, po tym jak zakładka działa.

---

## 5. Ryzyko pominięte w planie

### R7 (nowe): `setPointerCapture` na hotspotach blokuje pinch

Opisane w §2.3. Mitigacja: `if (e.pointerType !== "touch") e.currentTarget.setPointerCapture(e.pointerId)`.

### R8 (nowe): iOS `user-scalable` meta tag

Jeśli `<meta name="viewport">` nie ma `user-scalable=no`, Safari robi własny pinch-zoom na stronie jednocześnie z Twoim. Efekt: podwójny zoom (raz strona, raz SVG). Sprawdź [index.html](file:///f:/stare%20pliki/Nowy%20projekt/index.html) przed fazą 7.

### R9 (nowe): `touchAction: "none"` na SVG vs. scroll w lewym panelu

`touchAction: "none"` ([DinRailConnectionsCanvas.tsx:338](file:///f:/stare%20pliki/Nowy%20projekt/src/components/DinRailConnectionsCanvas.tsx#L338)) jest na `<svg>`. Lewy panel (`ConnectionsLeftPanel`) jest osobnym elementem z `overflowY: auto`. To powinno być OK — ale zweryfikuj na real device, że scroll panelu nie koliduje z gestem na SVG (edge case: palec zaczyna na panelu i przesuwa się na canvas).

---

## 6. Podsumowanie

| Aspekt | Ocena |
|---|---|
| Diagnoza 3 show-stopperów | ✅ Celna |
| Diagnoza 4 problemów UX | ✅ Celna |
| Wybór wzorca (PinchZoomImage) | ⚠️ Zastąp `useDinRailPinch` + `pinchMath` |
| Rozmiar refaktoru (faza 1) | ⚠️ Za duży na ten deliverable — osobny PR |
| Estymacja | ✅ Realistyczna (po korekcie: ~3d zamiast 4.5d) |
| Testy | ✅ Dobry zakres, poprawna strategia |
| Ryzyka | ⚠️ Brakuje R7-R9 (pointer capture, viewport meta, touch scroll) |
| Otwarte pytania | ✅ Odpowiedzi wyżej |
