# Logika wyświetlania tulejek (Ferrules) i złączek (Terminal Blocks)

Ten dokument stanowi kompleksowe podsumowanie zasad renderowania tulejek, złączek szynowych, oraz połączeń (przewodów). Obejmuje on zarówno wcześniejsze założenia architektoniczne, jak i nowo wdrożone poprawki (czerwiec 2026), które ostatecznie rozwiązują problemy z widocznością, kolejnością warstw (z-index) oraz nienaturalnym "wrzynaniem się" przewodów w grafikę tulejki.

## 1. Definicja i rozpoznawanie złączek
Złączki z zakładki "Złącza" mają przypisany w kodzie `deviceKind === "terminalBlock"`. Problem polega na tym, że standardowe listwy dystrybucyjne również mają ten sam typ, ale wymagają innego sposobu renderowania.

Aby odróżnić złączki od listew i rozłączników, utworzyliśmy w pliku `src/components/DinRailConnectionsCanvas.tsx` specjalną funkcję pomocniczą:

```typescript
// Helper to distinguish standard Złączki from Listwy do rozdzielnicy
export const isTerminalZlaczka = (moduleRef?: string | null) => {
  if (!moduleRef) return false;
  const normalized = moduleRef.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Musimy ignorować słowo "rozlacznik" (np. Rozłącznik nadprądowy MCB/RCD)
  return normalized.includes("zlacz") && !normalized.includes("rozlacz");
};
```

## 2. Kolejność renderowania (Warstwy) i Hotspoty (Terminale)
Kluczem do prawidłowego wyglądu jest ścisła kontrola kolejności elementów SVG. 

Aktualna poprawna kolejność od "najniższej" do "najwyższej" warstwy SVG w obszarze `DinRailConnectionsCanvas.tsx`:
1. **Tło (Warstwa 2):** Listwy dystrybucyjne (`terminalBlock`, które nie są złączkami) i szyny zbiorcze.
2. **Terminal Hotspots:** Zielone, interaktywne kółka oznaczające terminale. Rysowane są *przed* przewodami, dzięki czemu nie "nakładają się" na przewody ani na kołnierze tulejek, co wygląda znacznie bardziej naturalnie.
3. **Przewody i Tulejki (Warstwa 3):** Właściwe linie przewodów oraz grafiki tulejek (`FerruleGraphic`). Przewody przykrywają punkty hotspotów.
4. **Pierwszy plan (Warstwa 4):** Standardowe moduły: RCD, MCB oraz Złączki. Złączki rysowane w tej warstwie przykrywają przewody i górne końce tulejek, dając efekt "wchodzenia" pod plastik.
5. **Mosiężne szyny (Warstwa 5):** Elementy ozdobne na listwach (`DinRailConnectionsForegroundLayer`).

## 3. Długość tulejek
Ponieważ złączki są renderowane *nad* przewodami i tulejkami, a punkt zaczepienia (śrubka) znajduje się głęboko pod plastikiem (na około 70% wysokości złączki), standardowa tulejka była w całości ukryta pod złączką.

Aby tulejka była widoczna jako wystający kołnierz pod złączką, jest **wydłużana** dla tego typu modułów.

Długość modyfikowana jest poprzez dodanie flag: `isShort` oraz `isExtraLong` do komponentu `FerruleGraphic`.
- `isExtraLong` ustawione na `true` daje fizyczną długość **230px** (tulejka "wyłania się" na ok. 40px spod złączki).

## 4. Ochrona tulejki przed promieniem zaokrąglenia (customRadius)
Zdarzało się, że podczas generowania przewodu "uciekającego" natychmiast na bok, łuk zaokrąglenia (radius) zaczynał się za wcześnie - fizycznie **wewnątrz** obszaru tulejki.

**Rozwiązanie w silniku routingu:**
Do funkcji `calculateWirePoints` zaimplementowano inteligentny przelicznik pola `exitOffset`. Kiedy na danym punkcie znajduje się tulejka, przewód ma **wymuszony prosty odcinek startowy**.
Minimalna długość prostego odcinka wychodzącego (`requiredExitOffset`) jest sumą długości samej tulejki (domyślnie 160) oraz obranego promienia zaokrąglenia (`customRadius`).
Dzięki temu punkt, od którego łuk zaczyna wykrzywiać przewód, zawsze znajduje się *poniżej* graficznego kołnierza tulejki, całkowicie eliminując błąd graficzny ścinania brzegu.

Poprawka działa globalnie dla wizualizacji (`DinRailConnectionsCanvas`), generowania PDF (`dinRailSnapshotService`) oraz edycji (`DinRailConnectionsWiresLayer`).

## 5. Kolizje przy przeciąganiu ręcznym (Drag & Drop Bounds)
Użytkownik może ręcznie przeciągać i przesuwać fragmenty przewodu po osi X lub Y. Mogło to spowodować, że przewód na siłę podciągnięty zbyt blisko złącza znów skróci swój odcinek wejściowy na tyle, że wejdzie w interakcję z grafiką tulejki.

**Wprowadzono system "Bounds" (ograniczeń) dla przeciągania:**
1. W pliku `DinRailConnectionsWiresLayer.tsx` (gdzie przypisywane są zdarzenia z użyciem myszy `onPointerDown`), na bieżąco obliczane są fizyczne ograniczenia przesunięcia dla danego segmentu przewodu.
2. Margines wynosi:
   - **Bez tulejki:** `80 + customRadius`
   - **Z tulejką:** `170 + customRadius`
3. Ograniczenia `minY / maxY` oraz `minX / maxX` są przypisywane do mechanizmu w `useDinRailConnectionsInteraction.ts`.
4. Podczas przeciągania, silnik automatycznie zablokuje przesunięcie bloku dalej niż pozwala na to margines. To fizycznie zatrzymuje myszkę, skutecznie zachowując idealny wygląd wejścia przewodu do tulejki i uniemożliwiając stworzenie błędu graficznego.

## Podsumowanie ostatnich poprawek:
- ✅ Naprawiono warstwę "Terminal Hotspots" (zielone kółka renderowane są teraz pod przewodami i tulejkami).
- ✅ Usunięto błąd "krzywego startu" przewodu dzięki dynamicznemu `exitOffset` wliczającym do długości także wybrany promień zaokrąglenia (`customRadius`).
- ✅ Wdrożono ograniczenia przesuwania segmentów myszką (kolizje / bounds), upewniając się, że ręczne trasowanie przewodu nie popsuje widoczności tulejki na ekranie.
