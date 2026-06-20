# Logika wyświetlania tulejek (Ferrules) i złączek (Terminal Blocks)

> **Ostatnia aktualizacja: 2026-06-20** (mavis, sesja mvs_b91deb7138064201bdf35e46e8d67734)
>
> Sekcje 1, 3, 4, 5 wymagały poprawek względem wcześniejszej wersji:
> - Sekcja 1: lokalizacja funkcji `isTerminalZlaczka` była podana błędnie
> - Sekcja 3: dokument opisywał tylko `FerruleGraphic` flagi, ale pomijał
>   `getFerruleLength()` z `connectionsLogic.ts` który ustala bazową długość
> - Sekcja 4: wartość "domyślnie 160" dotyczy `getFerruleLength`, ale w
>   `FerruleGraphic` default wynosi **150**
> - Sekcja 5: pliki `DinRailConnectionsWiresLayer.tsx` i
>   `useDinRailConnectionsInteraction.ts` **nie istnieją** w obecnym kodzie —
>   logika drag&drop bounds została przeniesiona do
>   `src/hooks/connections/useConnectionsGeometry.ts`

Ten dokument stanowi kompleksowe podsumowanie zasad renderowania tulejek, złączek szynowych, oraz połączeń (przewodów). Obejmuje on zarówno wcześniejsze założenia architektoniczne, jak i nowo wdrożone poprawki (czerwiec 2026), które ostatecznie rozwiązują problemy z widocznością, kolejnością warstw (z-index) oraz nienaturalnym "wrzynaniem się" przewodów w grafikę tulejki.

## 1. Definicja i rozpoznawanie złączek
Złączki z zakładki "Złącza" mają przypisany w kodzie `deviceKind === "terminalBlock"`. Problem polega na tym, że standardowe listwy dystrybucyjne również mają ten sam typ, ale wymagają innego sposobu renderowania.

Aby odróżnić złączki od listew i rozłączników, utworzyliśmy w pliku `src/lib/connections/connectionsLogic.ts` (linia ~58) specjalną funkcję pomocniczą:

```typescript
// Helper to distinguish standard Złączki from Listwy do rozdzielnicy
// Zaktualizowana wersja (2026-06-20) — dodano wyjątek dla "listwy zaciskowe"
export const isTerminalZlaczka = (moduleRef?: string | null): boolean => {
  if (!moduleRef) return false;
  const normalized = moduleRef
    .toLowerCase()
    .replace(/ł/g, "l")                  // polskie "ł" → "l" przed NFD
    .normalize("NFD")                     // rozbij znaki diakrytyczne
    .replace(/[\u0300-\u036f]/g, "");    // usuń combining marks
  return (
    (normalized.includes("zlacz") && !normalized.includes("rozlacz")) ||
    normalized.includes("listwy zaciskowe")
  );
};
```

Kluczowe: `replace(/ł/g, "l")` musi być **przed** `.normalize("NFD")`, inaczej
"ł" (U+0142) zostałoby rozłożone na "l" + łącznik (U+0321) i druga reguła
by go nie usunęła (łączeniki nie są w zakresie `\u0300-\u036f`).

## 2. Kolejność renderowania (Warstwy) i Hotspoty (Terminale)
Kluczem do prawidłowego wyglądu jest ścisła kontrola kolejności elementów SVG. 

Aktualna poprawna kolejność od "najniższej" do "najwyższej" warstwy SVG w obszarze `DinRailConnectionsCanvas.tsx`:
1. **Tło (Warstwa 2):** Listwy dystrybucyjne (`terminalBlock`, które nie są złączkami) i szyny zbiorcze.
2. **Terminal Hotspots:** Zielone, interaktywne kółka oznaczające terminale. Rysowane są *przed* przewodami, dzięki czemu nie "nakładają się" na przewody ani na kołnierze tulejek, co wygląda znacznie bardziej naturalnie.
3. **Przewody i Tulejki (Warstwa 3):** Właściwe linie przewodów oraz grafiki tulejek (`FerruleGraphic`). Przewody przykrywają punkty hotspotów.
4. **Pierwszy plan (Warstwa 4):** Standardowe moduły: RCD, MCB oraz Złączki. Złączki rysowane w tej warstwie przykrywają przewody i górne końce tulejek, dając efekt "wchodzenia" pod plastik.
5. **Mosiężne szyny (Warstwa 5):** Elementy ozdobne na listwach (`DinRailConnectionsForegroundLayer`).

## 3. Długość tulejek — dualny mechanizm (ważne!)

**UWAGA (zaktualizowane 2026-06-20):** Długość tulejki jest kontrolowana z **dwóch
miejsc** w kodzie, nie z jednego. Refaktor z czerwca 2026 przeniósł logikę
bazową do `getFerruleLength()` w `connectionsLogic.ts`, ale `FerruleGraphic`
dalej ma własne flagi `isShort`/`isExtraLong` jako visual override.

### 3.1 Bazowa długość — `getFerruleLength(deviceKind, moduleRef)`

Zdefiniowana w `src/lib/connections/connectionsLogic.ts` (linia ~64). Decyduje
o bazowej wartości w pikselach dla każdego typu modułu:

| Typ modułu | Długość bazowa | Warunek w kodzie |
|---|---|---|
| Listwy do rozdzielnicy | **50 px** | `normalizedRef.includes("listwy do rozdzielnicy")` |
| Złączka (`Złącza/`) | **90 px** | `isTerminalZlaczka(moduleRef)` |
| Inne terminalBlock | **90 px** | `deviceKind === "terminalBlock"` |
| Kontrolki faz, Zabezpieczenia | **20 px** | `phaseIndicator` / `zabezpieczajacy` |
| Pozostałe (MCB, RCD, SPD...) | **160 px** | default |

Wartość ta jest wykorzystywana m.in. przez `useConnectionsGeometry.ts`
(`src/hooks/connections/`) do obliczania `requiredExitOffset` (sekcja 4).

### 3.2 Visual override — `<FerruleGraphic isExtraLong isShort />`

Zdefiniowane w `src/components/canvasLayers/FerruleGraphic.tsx` (linia ~28).
Komponent samodzielnie wybiera długość wg propsów:

```typescript
const length = customLength !== undefined
  ? customLength
  : (isSquare   ? thickness + 4   // np. Kontrolki faz (kwadratowa tulejka)
     : isExtraLong ? 230           // Blok rozdzielczy — tulejka "wyłania się" 40px spod złączki
     : isShort     ? 80            // krótsza (np. zwarte listwy)
     : 150);                       // DEFAULT (nie 160 — patrz uwaga poniżej)
```

**Kluczowa obserwacja:** default w `FerruleGraphic` to **150**, nie 160.
Wartość 160 pochodzi z `getFerruleLength` (bazowa). Te dwie wartości nie
są zsynchronizowane — wybór między nimi zależy od tego czy wywołujący
przekazuje `customLength` z `getFerruleLength`, czy polega na własnym
default FerruleGraphic.

### 3.3 Kiedy wywołujący powinien przekazać `customLength`?

Jeśli moduł ma niestandardową geometrię (np. Blok rozdzielczy 4×7 który ma
wystającą tulejkę), wywołujący powinien:
1. Wywołać `getFerruleLength(deviceKind, moduleRef)` → dostaje 90 dla terminalBlock
2. Sprawdzić czy moduł pasuje do `isDistributionBlockSymbol` → jeśli tak,
   użyć `isExtraLong=true` żeby override FerruleGraphic dał 230
3. W przeciwnym razie — użyć bazowej wartości z `getFerruleLength` jako
   `customLength`, NIE polegać na default FerruleGraphic

**Potencjalna przyczyna edge case'a tulejki w nieodpowiednim miejscu:**
wywołujący może przekazywać `customLength=90` (z `getFerruleLength` dla
terminalBlock) zamiast włączać `isExtraLong=230` dla Blok rozdzielczy.
To daje krótszą tulejkę niż architektura złączki zakłada, i tulejka
"chowa się" pod złączkę zamiast z niej wystawać.

## 4. Ochrona tulejki przed promieniem zaokrąglenia (customRadius)
Zdarzało się, że podczas generowania przewodu "uciekającego" natychmiast na bok, łuk zaokrąglenia (radius) zaczynał się za wcześnie - fizycznie **wewnątrz** obszaru tulejki.

**Rozwiązanie w silniku routingu:**
Do funkcji `calculateWirePoints` zaimplementowano inteligentny przelicznik pola `exitOffset`. Kiedy na danym punkcie znajduje się tulejka, przewód ma **wymuszony prosty odcinek startowy**.
Minimalna długość prostego odcinka wychodzącego (`requiredExitOffset`) jest sumą długości samej tulejki (wartość z `getFerruleLength()` — domyślnie **160 px** dla typowych modułów, **150 px** dla default w `FerruleGraphic`, lub inna wg typu modułu — patrz sekcja 3.1) oraz obranego promienia zaokrąglenia (`customRadius`).
Dzięki temu punkt, od którego łuk zaczyna wykrzywiać przewód, zawsze znajduje się *poniżej* graficznego kołnierza tulejki, całkowicie eliminując błąd graficzny ścinania brzegu.

Poprawka działa globalnie dla wizualizacji (`DinRailConnectionsCanvas`), generowania PDF (`dinRailSnapshotService`) oraz edycji (`DinRailConnectionsWiresLayer`).

## 5. Drag & Drop Bounds dla przewodów — **nie zaimplementowane**

> ⚠️ **Status 2026-06-20:** Bounds dla drag&drop wires **NIE SĄ zaimplementowane**
> w aktualnym kodzie. Sekcja zachowana jako plan historyczny / ewentualne TODO.
>
> - Marginesy `80 + customRadius` (bez tulejki) i `170 + customRadius` (z tulejką)
>   **nie pojawiają się nigdzie w `src/`** (zweryfikowano regexsem `customRadius`)
> - Pliki `DinRailConnectionsWiresLayer.tsx` i `useDinRailConnectionsInteraction.ts`
>   **nie istnieją** — prawdopodobnie usunięte w czerwcowym refaktorze
> - Bounds w `dinRailSelection.ts:25,49,52,74-77,191-198` obsługują **selekcję**
>   (bbox zaznaczonych elementów), NIE drag&drop wires
> - Logika `exitOffset` / `requiredExitOffset` (patrz sekcja 4) działa w
>   `useConnectionsGeometry.ts:235,251,303,387,400,404` i chroni przed
>   zaokrągleniem (radius) wciskającym się w tulejkę — ale to inny mechanizm
>   niż bounds dla drag
>
> **Plan historyczny (do ewentualnej reimplementacji):**
>
> Użytkownik mógłby ręcznie przeciągać i przesuwać fragmenty przewodu po
> osi X lub Y. Aby zapobiec "wcinaniu się" przewodu pod plastik tulejki
> z powodu zbyt agresywnego przesunięcia, planowano wprowadzić:
>
> 1. Marginesy:
>    - **Bez tulejki:** `80 + customRadius`
>    - **Z tulejką:** `170 + customRadius`
> 2. Ograniczenia `minY / maxY` oraz `minX / maxX` przypisywane do
>    segmentu przewodu na czas trwania drag
> 3. Silnik blokuje przesunięcie gdy user próbuje wyjść poza margines
>
> Jeśli bounds dla drag&drop wires są potrzebne w przyszłości, implementacja
> powinna trafić do `useConnectionsGeometry.ts` lub dedykowanego hooku
> (np. `useWireDragBounds.ts`). Sugerowany stack: pointer events + useMemo
> na bounds + `setPointerCapture` na czas trwania drag.

## Podsumowanie ostatnich poprawek:
- ✅ Naprawiono warstwę "Terminal Hotspots" (zielone kółka renderowane są teraz pod przewodami i tulejkami).
- ✅ Usunięto błąd "krzywego startu" przewodu dzięki dynamicznemu `exitOffset` wliczającym do długości także wybrany promień zaokrąglenia (`customRadius`).
- ❌ **Bounds dla drag&drop wires NIE SĄ zaimplementowane** — patrz sekcja 5. Poprawka czerwiec 2026 usunęła plik `useDinRailConnectionsInteraction.ts`; bounds trzeba reimplementować od nowa jeśli są potrzebne.
- ✅ (2026-06-20) Naprawiono dualność długości tulejki — `DinRailFerrulesGroup.tsx` włącza `isExtraLong` dla Blok rozdzielczy zamiast hardcoded `false`.
- ✅ (2026-06-20) Dodano filtr orphan connections w `projectFile.ts` — connections z brakującym `fromSymbolId`/`toSymbolId` są odrzucane z warnem (patrz nowy test `src/lib/connections/ferrulePosition.test.ts`).
