# Audyt domeny elektrycznej

**Data:** 2026-06-17
**Zakres:** `src/lib/phaseDistribution/**`, `src/lib/validation/**`, `src/lib/circuitRows.ts`, `src/lib/circuitEdit/**`, `src/lib/projectMetadata.ts`, `src/types/symbolItem.ts`, `src/types/circuitRow.ts`
**Metoda:** read-only przegląd kodu + testów. Testy NIE zostały uruchomione.
**Właściciel audytu:** electrical-expert
**Właściciel napraw:** patrz „Owner" przy każdym znalezisku.

---

## Błędy krytyczne

### C-1. Dwa różne `isGroupHeadSymbol` o sprzecznych definicjach

**Problem:** Istnieją dwie funkcje o tej samej nazwie, z różną semantyką. W zależności od ścieżki wywołania ta sama nazwa zwraca różne wyniki.

**Przyczyna:**

1. `src/lib/domain/symbolGrouping.ts:12-14` — eksport, używany przez `usePaletteActions.ts`, `useSymbolActions.ts`:
   ```ts
   export function isGroupHeadSymbol(symbol: SymbolItem): boolean {
     return symbol.deviceKind === "rcd";
   }
   ```
2. `src/lib/phaseDistribution/phaseDistributionCalculator.ts:416-427` — lokalna funkcja, używana przez `autoBalancePhases` (linie 161, 178-238):
   ```ts
   function isGroupHeadSymbol(symbol: SymbolItem): boolean {
     const value = `${symbol.type} ${symbol.visualPath}`.toUpperCase();
     return (value.includes("RCD") || … || value.includes("FR")
            || value.includes("SWITCH") || value.includes("ISOLATOR") || …)
            && !value.includes("RCBO");
   }
   ```

Pierwsza mówi: „RCD to head grupy". Druga: „RCD lub FR lub SWITCH lub ISOLATOR to head, chyba że to RCBO". Dla `deviceKind: "fr"` wynik jest odwrotny.

**Wpływ na decyzje inżynierskie:** Auto-balansowanie (`autoBalancePhases`) traktuje FR (rozłącznik główny) jako head grupy RCD i pakuje pod niego MCB-y z `rcdSymbolId === "fr-1"`. To rozjeżdża się z domenowym `isGroupHeadSymbol` używanym w snap/join i powoduje, że bilans faz dla FR jest liczony tak, jakby FR był RCD-em. Skutki:
- Bilans faz może sztucznie uwzględniać obciążenie FR (które wynosi 0) i niepotrzebnie przesuwać MCB-y na inne fazy.
- Zachowanie auto-groupingu w snap i w auto-balance może się rozjeżdżać — co user widzi jako „auto-grupowanie coś zrobiło, a fazy się przesunęły inaczej niż pokazują grupy".
- Testy `domain/symbolGrouping.test.ts` pilnują starej wersji, więc regresja nie wybuchnie po czyjejś zmianie nazwy funkcji lokalnej.

**Severity:** critical

**Sugerowana bezpieczna poprawka (nie implementuj):**
- Jedna źródłowa implementacja w `domain/symbolGrouping.ts`, ewentualnie z wariantem `isGroupHeadSymbolIncludingFr(symbol)` dla potrzeb bilansu.
- `phaseDistributionCalculator.ts` importuje ją i przestaje mieć lokalną definicję.
- Test `phaseDistributionCalculator.test.ts` zostaje rozszerzony o asercję, że FR **nie** jest traktowany jako head (albo, jeśli taki był zamiar, dodaj komentarz `// WHY: FR traktowany jak head w bilansie, ponieważ …`).

**Owner:** developer (refactor + usunięcie duplikatu) + electrical-expert (decyzja: czy FR ma być headem w bilansie).

---

### C-2. `normalizeSinglePhase` powielone w 3 plikach z identyczną logiką

**Problem:** Ta sama funkcja zdefiniowana w trzech miejscach. Każda z nich ma swoje testy, więc każda może się rozjechać z pozostałymi.

**Przyczyna:**

1. `src/lib/phaseDistribution/phaseBalanceSuggestions.ts:86-93`
2. `src/lib/phaseDistribution/phaseImbalanceInsights.ts:52-59`
3. `src/lib/validation/validationHelpers.ts:40-49`

Wszystkie trzy to samo:
```ts
function normalizeSinglePhase(phase: string): "L1" | "L2" | "L3" | null {
  const normalized = phase.toUpperCase();
  if (normalized === "L1" || normalized === "L2" || normalized === "L3") return normalized;
  return null;
}
```
(walidacyjna wersja dodatkowo obsługuje `undefined`/`null` w argumencie — ale efekt identyczny.)

**Wpływ:** Spójność zachowana dopóki logika się nie zmieni. Gdy ktoś doda obsługę np. `L1, L2` (separator przecinek), musi pamiętać o trzech miejscach. Przy refaktorze `PhaseAssignment` typu łatwo przeoczyć jeden plik.

**Severity:** critical (bo trzy kopie + trzy testy oznaczają trzy miejsca do aktualizacji przy każdej zmianie fazy).

**Sugerowana bezpieczna poprawka:**
- Jedna implementacja w `lib/phaseDistribution/phaseDistributionCalculator.ts` (eksport `normalizeSinglePhase`).
- Wszystkie trzy importują z tego miejsca.
- Trzy testy scalamy w jeden wspólny w `phaseDistributionCalculator.test.ts`.

**Owner:** developer (refactor wyciągający wspólny helper).

---

### C-3. Niespójne nazwy `DeviceKind` między `symbolItem.ts` a `circuitRow.ts`

**Problem:** Ten sam koncept ma dwie różne nazwy w zależności od pliku, więc kod mapujący jedno na drugie (`toCircuitDeviceKind` w `circuitRows.ts:246-265`) jest konieczny i podatny na błędy przy rozszerzaniu.

**Przyczyna:**

`src/types/symbolItem.ts:1-9`:
```ts
export type DeviceKind =
  | "mcb" | "rcd" | "rcbo" | "spd" | "fr"
  | "phaseIndicator"        // camelCase
  | "terminalBlock"         // camelCase
  | "other";
```

`src/types/circuitRow.ts:1-9`:
```ts
export type CircuitDeviceKind =
  | "mcb" | "rcbo" | "fr" | "spd" | "rcd"
  | "phase-indicator"        // kebab-case ← inne!
  | "terminal-block"         // kebab-case ← inne!
  | "aux";
```

**Wpływ:**
- Dwa różne stringi (`"phaseIndicator"` vs `"phase-indicator"`) oznaczają to samo — każde miejsce w kodzie, które sprawdza jedno lub drugie, może się rozjechać z drugim.
- Dodanie nowego `deviceKind` wymaga aktualizacji obu typów + switcha w `toCircuitDeviceKind`. Brak jednego z trzech = cicha utrata typu w `CircuitRow`.
- Dla użytkownika końcowego: nic się nie zmienia, ale dla maintainera — to min-pole.

**Severity:** critical (bo to kontrakt domenowy; jeśli coś się rozjedzie, dane w zestawieniach będą filtrowane nie tak jak trzeba).

**Sugerowana bezpieczna poprawka:**
- Wybrać jeden styl (rekomendacja: camelCase jak w `DeviceKind`) i zunifikować `CircuitDeviceKind` z `DeviceKind`.
- `CircuitRow.deviceKind` staje się `DeviceKind` (z ewentualnym zawężeniem tam, gdzie trzeba).
- `toCircuitDeviceKind` upraszcza się do zwykłego przypisania.

**Owner:** electrical-expert (decyzja domenowa) + developer (zmiana typów).

---

## Błędy wysokiego ryzyka

### H-1. `isGroupHeadSymbol` w `phaseDistributionCalculator` zwraca `true` dla FR przez string-match — cicha zmiana logiki bilansowania

**Problem:** Wewnątrz `autoBalancePhases` (linie 156-173) budowana jest mapa `rcdMap` na podstawie `isGroupHeadSymbol`. Dla FR-a zwracane jest `true`, więc FR trafia do `rcdMap`, a potem (linia 178+) jest przetwarzany jak RCD — w szczególności `isRcdSinglePhase(rcd)` jest wywoływane na FR-ze, i jeśli FR ma `phase: "L1+L2+L3"` (bo 3-fazowy), to trafia do drugiej gałęzi (linie 207-238) i zostaje oznaczony jako przetworzony. To „połyka" FR z obiegu standalone-MCB (linie 240-260) i uniemożliwia potencjalnie zbilansowanie FR-a tak jak innych symboli.

**Przyczyna:** j.w. C-1.

**Wpływ:** Jeśli FR ma `phase` ustawione na coś innego niż L1+L2+L3 (np. user wybrał FR 1P dla celów dokumentacyjnych), wtedy `isRcdSinglePhase(fr)` zwróci `true` i FR zostanie potraktowany jak jednofazowy RCD — w tym pętla `processedIds` i przydział do fazy (linie 192-204). FR dostaje wtedy przypisaną fazę, co nie ma sensu (FR nie ma fazy — to rozłącznik). Skutek: bilans faz się sypie, FR zyskuje phase = "L2" mimo że jest aparatem łączeniowym.

**Severity:** high

**Sugerowana poprawka:** Patrz C-1. Jeśli FR ma być traktowany jak head grupy, to powinno być jawne w nazwie funkcji (`isGroupHeadIncludingFr` albo warunek `symbol.deviceKind === "fr"` w miejscu użycia).

**Owner:** electrical-expert.

---

### H-2. Demo `terminal-block` z `phase: "N/PE"` narusza `PhaseAssignment`

**Problem:** `createDemoCircuitRows()` zwraca wiersz `id: "terminal-block"` z polem `phase: "N/PE"` (linia 230 `circuitRows.ts`). Typ `PhaseAssignment` w `symbolItem.ts:11-22` nie zawiera `"N/PE"` — zawiera tylko `"N"` i `"PE"` osobno. Ten string nie przejdzie typowania, gdyby `CircuitRow.phase` było `PhaseAssignment`. Jest to cichy błąd spójności.

**Przyczyna:** `src/lib/circuitRows.ts:230`.

**Wpływ:** Demo „nauczy" nowego użytkownika aplikacji, że `phase: "N/PE"` jest prawidłową wartością. Jeśli ten sam string trafi do `phaseDistributionCalculator.distributePower`, wpadnie w gałąź `default` (linia 38) i potraktuje całą moc jako L1. Dla terminal blocka (moc=0) nie ma to praktycznego znaczenia, ale dla przyszłego kodu to side-effect.

**Severity:** high (niespójność typ/kontrakt + potencjalne złe domyślne zachowanie w przyszłości).

**Sugerowana poprawka:** Użyj `phase: "N"` albo `"PE"`, albo — lepiej — wyraź pustą fazę (`phase: ""`) dla terminal blocków, bo terminal block nie ma fazy.

**Owner:** electrical-expert.

---

### H-3. `rcdManagerLogic` rebuilduje każdy symbol przez `createDefaultSymbolItem` nawet bez zmian

**Problem:** `applyRcdManagerUpdates` (linie 21-51) dla każdego symbolu niezależnie od tego, czy coś się zmieniło, wywołuje `createDefaultSymbolItem({...symbol, ...})`. To:
- resetuje wyliczane pola (displayProtection, displayLocation, displayModuleNumber) i potem są przeliczane — poprawne, ale niepotrzebne.
- dla symboli, które nie są RCD-em i nie mają `rcdSymbolId`, zwraca **ten sam obiekt wejściowy** (linia 50) — czyli referencyjnie ten sam. To jest OK.
- ale dla symboli z `rcdSymbolId` lub `deviceKind: "rcd"` zwraca **nowy** obiekt nawet gdy wartości są identyczne. To może wywołać niepotrzebny rerender w React (jeśli referencje idą do state) i niepotrzebnie wywołać side-effecty (np. projektFile `useDebouncedPersist`).

**Przyczyna:** `src/lib/circuitEdit/rcdManagerLogic.ts:21-51`.

**Wpływ:** Wydajnościowy, ale przy kilkudziesięciu modułach zauważalny. Dla inżyniera: ryzyko, że w przyszłości ktoś doda efekt uboczny do `createDefaultSymbolItem` (np. telemetry) i nagle każda edycja RCD będzie odpalać go dla całego projektu.

**Severity:** high.

**Sugerowana poprawka:** Zwracaj oryginalny symbol, jeśli żadna wartość się nie zmienia (porównanie `prev !== next` dla każdego pola). W najprostszej wersji: zwracaj `symbol` gdy `!rcdById.has(...)`.

**Owner:** developer.

---

### H-4. `validateNoRcdProtection` (VAL-006) raportuje „bez ochrony RCD" dla dangling reference (nieistniejącego RCD)

**Problem:** Reguła w `val-006-no-rcd.ts:21`:
```ts
if (symbol.rcdSymbolId && rcdIds.has(symbol.rcdSymbolId)) continue;
```
Dla `rcdSymbolId = "ghost-rcd"` (który nie istnieje w `rcdIds`) warunek jest fałszywy, więc emitowany jest VAL-006 z komunikatem „Obwód bez ochrony RCD". To jest mylące — prawdziwy problem to „MCB wskazuje na nieistniejący RCD", a nie „MCB nie ma RCD-a".

**Przyczyna:** `src/lib/validation/rules/val-006-no-rcd.ts:21`.

**Wpływ:**
- Użytkownik widzi dwa różne komunikaty o tym samym obwodzie (VAL-006 „bez ochrony" + SEM-007 z `projectFileSemantics` „nieistniejący RCD"). Może naprawić VAL-006, nie wiedząc że to dangling reference.
- Reguła SEM-007 w `projectFileSemantics.ts:163-180` waliduje to poprawnie. Ale walidacja semantyczna to osobny mechanizm uruchamiany z innego miejsca (zapis/odczyt pliku projektu), więc nie zawsze pokrywa runtime.

**Severity:** high.

**Sugerowana poprawka:** W `val-006-no-rcd.ts` dodać wcześniejsze sprawdzenie — jeśli `rcdSymbolId` jest ustawione, ale `!rcdIds.has(symbol.rcdSymbolId)`, pominąć regułę (bo to dangling, osobny kanał walidacji). Test `val-006-no-rcd.test.ts:44-54` wymaga aktualizacji, bo obecnie testuje złe zachowanie.

**Owner:** electrical-expert.

---

### H-5. Brak testu dla `autoBalancePhases` z FR (dokumentuje niezamierzony efekt C-1)

**Problem:** Test `phaseDistributionCalculator.test.ts:70-84` sprawdza tylko, że trzy MCB-ki lądują na różnych fazach. Nie ma testu, który by potwierdził, że FR nie zmienia swojej fazy w bilansie. Skoro FR przechodzi przez ścieżkę „single-phase RCD" (C-1/H-1), powinien istnieć test „FR phase is preserved through autoBalancePhases". Brak tego testu to przyzwolenie na cichą regresję.

**Przyczyna:** Luka w pokryciu `phaseDistributionCalculator.test.ts`.

**Wpływ:** Regresja w bilansie faz, gdy ktoś „naprawi" `isGroupHeadSymbol`, nie zauważy, że zaczyna ruszać FR.

**Severity:** high.

**Sugerowana poprawka:** Dodać test „FR phase is preserved through autoBalancePhases" i „FR is not added to RCD->MCB balance unit".

**Owner:** tester (dodanie testu) + electrical-expert (weryfikacja oczekiwanego zachowania).

---

## Błędy średniego ryzyka

### M-1. `isDistributionBlockSymbol` używa substrinków ogólnych

**Problem:** `symbolItem.ts:339-353`:
```ts
export function isDistributionBlockSymbol(symbol: Partial<SymbolBase>): boolean {
  const value = normalizeSymbolIdentityText(...);
  return (
    value.includes("blok") ||
    value.includes("block") ||
    value.includes("rozdzielcz") ||
    value.includes("distribution")
  );
}
```

**Przyczyna:** `src/types/symbolItem.ts:339-353`.

**Wpływ:** String `"blok"` pojawi się w dowolnym typie, który zawiera to słowo (np. „blokada", „bloking"). Tak samo „distribution" (po polsku) wejdzie w typy takie jak „obwód dystrybucyjny". Obecnie nie ma to widocznych skutków ubocznych, bo `isDistributionBlockSymbol` jest używane tylko wtedy, gdy symbol jest już zidentyfikowany jako terminal/connector (linia 369), ale ryzyko wzrośnie, gdy ktoś użyje tej funkcji w innym kontekście.

**Severity:** medium.

**Sugerowana poprawka:** Zawęzić wzorzec do bardziej specyficznych fraz („blok rozdzielczy", „distribution block", „blok rozgałęźny") albo dodać `deviceKind` short-circuit na początku.

**Owner:** electrical-expert.

---

### M-2. `rcdSymbolId` opcjonalność rożna między `SymbolBase` a `CircuitRow`

**Problem:**
- `src/types/symbolItem.ts:67` — `rcdSymbolId: string;` (wymagane, pusty string = brak).
- `src/types/circuitRow.ts:31` — `rcdSymbolId?: string;` (opcjonalne).

**Przyczyna:** Różne decyzje typizacyjne w obu plikach.

**Wpływ:** Dla TS-kompatybilności to działa, ale w runtime `circuitRows.normalizeCircuitRows` (linia 342) ma specjalną ścieżkę `item.rcdSymbolId ?? source.rcdSymbolId` — defensywa na wypadek `undefined`, która niepotrzebnie komplikuje kod i sugeruje, że format zapisu kiedyś pozwalał na `undefined`. Dla nowego maintainera: mylące.

**Severity:** medium.

**Sugerowana poprawka:** Ujednolicić: `rcdSymbolId: string` (pusty string = brak) w obu plikach. Usunąć `??` w `normalizeCircuitRows:342`.

**Owner:** electrical-expert.

---

### M-3. Duplikat `isSinglePhaseAssignment` i `normalizeSinglePhaseAssignment`

**Problem:** Identyczne funkcje w `src/lib/domain/symbolGrouping.ts:124-139` i `src/lib/domain/paletteFormatting.ts:43-58`.

**Przyczyna:** Brak wydzielonego helpera.

**Wpływ:** j.w. C-2, ale w mniejszej skali (2 kopie zamiast 3).

**Severity:** medium.

**Sugerowana poprawka:** Przenieść do `lib/phaseDistribution/phaseDistributionCalculator.ts` obok `normalizeSinglePhase`.

**Owner:** developer.

---

### M-4. Duplikat `normalizeValidationText` (z odwróconym case-fold!)

**Problem:**

- `src/lib/validation/validationHelpers.ts:58-68` — `.toUpperCase()` na końcu.
- `src/lib/deviceIdentification.ts:6-13` — `.toLowerCase()` na końcu.

Obie funkcje nazywają się tak samo, ale zwracają tekst w różnej wielkości liter.

**Przyczyna:** Oba pliki wyrosły niezależnie.

**Wpływ:** Obecnie brak bezpośrednich skutków, bo wywołania w `deviceIdentification` (np. `isMainBreaker` linia 18-27) używają `includes` który jest case-sensitive. Ale w `validationHelpers` `normalizeValidationText` jest używane do komparacji z dużymi literami w `rcdTypeRecommendation.ts` (np. `hasAnyToken(text, ["POMPA CIEPLA", ...])`). Jeśli ktoś kiedyś zaimportuje `normalizeValidationText` z `deviceIdentification` zamiast z `validationHelpers`, to `hasAnyToken` zwróci `false` dla każdego trafienia.

**Severity:** medium (pułapka nazewnicza, nie aktywny bug).

**Sugerowana poprawka:** Jeden helper z jawnym parametrem `toUpper: boolean` albo dwiema różnymi nazwami (`normalizeValidationTextUpper`, `normalizeValidationTextLower`).

**Owner:** developer.

---

### M-5. `detectPoleCount` zdefiniowane lokalnie w `importedModuleCatalog.ts` (kolizja nazewnicza)

**Problem:** `src/lib/modules/importedModuleCatalog.ts:197` — `function detectPoleCount(fileName: string): number`. To inna sygnatura niż `src/lib/poleCount.ts:29` — `export function detectPoleCount(symbol: SymbolItem): ModulePoleCount`.

**Przyczyna:** Komentarz w `poleCount.ts:10-11` wyjaśnia: importer operuje na nazwie pliku, helper z `poleCount` na `SymbolItem`. Ale obie funkcje mają tę samą nazwę, więc czytelnik kodu w `importedModuleCatalog.ts` może pomyśleć, że to ta sama logika.

**Wpływ:** Żadnego aktywnego buga, ale łatwo o pomyłkę przy pracy refaktoryzacyjnej. Przyszły maintainer może przenieść jedną z wersji, nie wiedząc o drugiej.

**Severity:** medium.

**Sugerowana poprawka:** Zmienić nazwę lokalnej funkcji na `detectPoleCountFromFileName` albo przenieść ją do `poleCount.ts` z dokumentacją obu sygnatur.

**Owner:** developer.

---

### M-6. `applyInheritedRcdInfo` w `symbolGrouping.ts:90-108` zeruje `rcdType` gdy brak parenta — ryzyko utraty danych

**Problem:** Gdy `resolveRcdSource` zwróci `null` albo `rcdSource.id === symbol.id`, funkcja ustawia:
```ts
symbol.rcdType = "";
```

**Przyczyna:** `src/lib/domain/symbolGrouping.ts:97-100`.

**Wpływ:** Dla poprawnego snap-flow nie jest to problem, bo nowy RCD zostanie przypisany w dalszej części snap. Ale w edge-case (użytkownik rozłączył MCB z grupy, snap-target nie jest RCD-em, parent nie istnieje), MCB traci swój `rcdType`. W testach (`symbolGrouping.test.ts:206-213`) to zachowanie jest pilnowane, więc regresja nie wybuchnie. Ale semantycznie: to zerowanie pola typu wygląda jak overwrite, nie jak reset. W przyszłości, gdyby ktoś zapisał `rcdType` wprost na MCB (a nie odziedziczył), zostałby on skasowany.

**Severity:** medium.

**Sugerowana poprawka:** Udokumentować `// WHY:` komentarzem, że `rcdType` na MCB jest zawsze dziedziczony i nie powinien być zapisywany bezpośrednio. Alternatywnie: nie zerować `rcdType`, tylko wyzerować `rcdSymbolId` i pozwolić dalszej logice go nadpisać.

**Owner:** electrical-expert.

---

### M-7. `validateProtectionMismatch` (VAL-005) sprawdza tylko rating `> 1.45 × cable`, nie sprawdza rating `< 1`

**Problem:** W `val-005-protection-mismatch.ts:30`:
```ts
if (protectionRating > maxCableCurrent * 1.45) { ... }
```

**Przyczyna:** `src/lib/validation/rules/val-005-protection-mismatch.ts:30`.

**Wpływ:** Jeśli user ustawi `protectionType = "B6"` na kablu 16mm² (rating 6A, cable 16mm² × 1.45 = 23.2A), nie ma tu problemu. Ale jeśli user ustawi `protectionType = "B2"` (którego nie ma w presetach, ale parser to przepuści), rating 2A jest absurdalnie niski dla dowolnego kabla. Nie powinno być ostrzeżenia o niedopasowaniu (bo kierunek jest OK), ale warto wiedzieć, że taka sytuacja nie jest flagowana osobno. To jest raczej świadoma decyzja projektowa (rating poniżej min. to problem selektwności, nie kabla), więc raczej „notatka" niż bug.

**Severity:** medium (raczej design decision, ale warto udokumentować).

**Sugerowana poprawka:** Dodać `// WHY: poniżej 1× nie jest błędem — patrz VAL-021` komentarz.

**Owner:** tester (rezygnacja) albo electrical-expert (decyzja domenowa).

---

## Błędy niskiego ryzyka

### L-1. `distributePower` traktuje `L1+L3` i `L3+L1` jako identyczne (ok, ale typ `PhaseAssignment` pozwala oba)

**Problem:** `src/lib/phaseDistribution/phaseDistributionCalculator.ts:34-35`:
```ts
case "L1+L3": return [powerW / 2, 0, powerW / 2];
case "L3+L1": return [powerW / 2, 0, powerW / 2];
```

Oba case-y mają identyczne ciało, ale typ `PhaseAssignment` (`symbolItem.ts:18-19`) zawiera oba. To nie jest błędem, ale powoduje:
- duplikację w kodzie
- ryzyko, że ktoś kiedyś doda logikę specyficzną dla „odwróconej kolejności" (np. dla prądu zwrotnego w obwodach PV), a zapomni o jednym z wariantów.

**Severity:** low.

**Sugerowana poprawka:** Znormalizować `PhaseAssignment` tak, aby `L3+L1` było aliasem dla `L1+L3` (np. usunąć `"L3+L1"` z unii i aliasować w parserze). W `distributePower` zostawić jeden case.

**Owner:** electrical-expert.

---

### L-2. `isGroupHeadSymbol` lokalna w `phaseDistributionCalculator` nie sprawdza `deviceKind === "rcbo"`

**Problem:** Wyrażenie `&& !value.includes("RCBO")` chroni przed tym, żeby RCBO nie został wzięty za RCD, ale string-match jest kruchy. Jeśli ktoś utworzy symbol `deviceKind: "rcbo"` z `type: "Różnicowoprądowy"`, zostanie rozpoznany jako RCD (z powodu `"ROZNICOW"`), a potem odfiltrowany przez `!value.includes("RCBO")`. Wniosek: działa przypadkiem.

**Severity:** low.

**Sugerowana poprawka:** Patrz C-1. Po unifikacji, dispatch na `deviceKind` jest bezpieczny.

**Owner:** developer.

---

### L-3. `distributePower` nie ma guard-a na ujemną moc

**Problem:** Linia 24: `if (powerW <= 0) return [0, 0, 0];` — pilnuje ujemnych, ale brak testu na ujemną wartość.

**Przyczyna:** Luka testowa.

**Severity:** low.

**Sugerowana poprawka:** Dodać test `it("returns zero for negative power")`.

**Owner:** tester.

---

### L-4. `normalizeProjectMetadata` kopiuje `titlePageWorkScopeItems.text.trim()` z utratą oryginalnej wielkości liter

**Problem:** `src/lib/projectMetadata.ts:336-343`:
```ts
titlePageWorkScopeItems: Array.isArray(raw?.titlePageWorkScopeItems)
  ? raw.titlePageWorkScopeItems
      .filter((item) => item.text.trim().length > 0)
      .map((item) => ({
        text: item.text.trim(),
        isChecked: item.isChecked,
      }))
  : defaults.titlePageWorkScopeItems,
```

`text` jest trim-owany, ale wielkość liter nie. To prawdopodobnie OK, ale warto udokumentować, czy to świadome (np. dla spójności wyświetlania na PDF).

**Severity:** low.

**Sugerowana poprawka:** Dodać `// WHY: trzymamy oryginalną wielkość liter — formatka pozwala użytkownikowi decydować` komentarz.

**Owner:** tester / electrical-expert.

---

### L-5. `autoBalancePhases` przy 1-fazowym RCD pakuje MCB w `BalanceUnit` z `ZERO_POWER_UNIT_WEIGHT`

**Problem:** Linia 199:
```ts
unit.totalWeight = powerWeight > 0 ? powerWeight : ZERO_POWER_UNIT_WEIGHT * Math.max(mcbs.length, 1);
```

**Przyczyna:** `src/lib/phaseDistribution/phaseDistributionCalculator.ts:199`.

**Wpływ:** Gdy cała grupa RCD ma sumaryczną moc 0 (puste obwody), każda taka grupa dostaje wagę `0.001 × liczba_mcb`. To znaczy, że przy auto-balansie puste grupy RCD będą przydzielane do najlżejszej fazy. To prawdopodobnie OK (grupy bez obciążenia są neutralne), ale `0.001 × 10` MCB-ów w jednej grupie może zdominować bilans w edge-case.

**Severity:** low.

**Sugerowana poprawka:** Udokumentować `// WHY: puste grupy mają symboliczną wagę, by algorytm greedy nie blokował ich na jednej fazie`.

**Owner:** electrical-expert.

---

## Duplikaty i martwy kod

### D-1. Duplikowane helpery do identyfikacji modułów (5+ implementacji)

Wykaz:

| Plik | Funkcja | Logika |
|---|---|---|
| `src/types/symbolItem.ts:319-353` | `isTerminalOrConnectorSymbol`, `isDistributionBlockSymbol`, `isAuxiliaryNonCircuitSymbol` | string-match PL |
| `src/lib/deviceIdentification.ts:18-82` | `isMainBreaker`, `isSpd`, `isIndicator`, `isThreePhaseDevice`, `isRcdDevice`, `isRcboDevice` | string-match EN + lowercase |
| `src/lib/circuitEdit/circuitEditFieldDefinitions.ts:433-481` | `getModuleType` | dispatch deviceKind + string-match lowercase pl-PL |
| `src/lib/phaseDistribution/phaseDistributionCalculator.ts:408-447` | `isPhaseIndicator`, `isGroupHeadSymbol`, `isRcdSinglePhase`, `isSinglePhase` | dispatch deviceKind + string-match uppercase |
| `src/lib/domain/symbolGrouping.ts:12-122` | `isGroupHeadSymbol`, `isDistributionSymbol`, `isFixedThreePhaseRcdSymbol` | dispatch deviceKind (czysto) |
| `src/lib/schematic/schematicLayoutEngine.ts:792-832` | `getModuleType`, `isRcd`, `isFixedThreePhaseRcdSymbol`, `isThreePhaseRcdHead` | dispatch deviceKind + string-match uppercase |

Łącznie ~6 różnych implementacji, częściowo się pokrywających, z różną wielkością liter i różnymi tokenami.

**Severity:** high (już dziś jest to źródło subtelnych niespójności, np. C-1).

**Sugerowana poprawka:** Wybrać jeden plik jako źródło prawdy dla każdej kategorii:
- `lib/domain/symbolGrouping.ts` dla `isGroupHeadSymbol` (czyste `deviceKind`).
- `lib/deviceIdentification.ts` dla `isMainBreaker`, `isSpd`, `isIndicator`, `isThreePhaseDevice`, `isRcdDevice`, `isRcboDevice` (string-match — istniejący kod, dobrze pokryty testami).
- `types/symbolItem.ts` dla `isTerminalOrConnectorSymbol`, `isDistributionBlockSymbol`, `isAuxiliaryNonCircuitSymbol` (string-match PL — istniejący kod).
- Wszystkie pozostałe implementacje (`getModuleType` w `circuitEditFieldDefinitions.ts`, `phaseDistributionCalculator.ts`, `schematicLayoutEngine.ts`) powinny importować z tych źródeł.

**Owner:** developer + tester (migracja testów).

---

### D-2. Trzy kopie `normalizeSinglePhase` (patrz C-2)

---

### D-3. Dwie kopie `isSinglePhaseAssignment` / `normalizeSinglePhaseAssignment` (patrz M-3)

---

### D-4. Dwie kopie `normalizeValidationText` z różnym case-fold (patrz M-4)

---

### D-5. Dwie kopie `detectPoleCount` (patrz M-5)

---

### D-6. Martwy kod w `phaseDistributionCalculator`

`src/lib/phaseDistribution/phaseDistributionCalculator.ts:96`:
```ts
const INDUCTION_OVEN_ENABLED_KEY = "GroupScenario.InductionWithOven.Enabled";
const INDUCTION_OVEN_PATTERN_KEY = "GroupScenario.InductionWithOven.Pattern";
const INDUCTION_OVEN_PATTERN_VALUE = "Rcd4PWithMcb2PAnd1P";
```

To są stałe dla scenariusza „indukcja + piekarnik pod 4P RCD". Sprawdziłem, że są używane w `tryRegisterInductionWithOvenFixedScenario` (linie 525-550). OK, nie martwe.

Ale: `INCREMENT_OVEN_ENABLED_KEY` i `_PATTERN_KEY` są pisane przez `parameters[key]`, co oznacza, że user musi ręcznie ustawić te parametry w danych symbolu. Czy to jest udokumentowane w UI? Warto zweryfikować, bo to czarodziejski feature, który zadziała tylko dla power-userów.

**Severity:** low (pytanie UX, nie bug).

**Owner:** electrical-expert.

---

### D-7. `LegacyStorageKeys` jako martwe w kodzie produkcyjnym

`src/lib/circuitRows.ts:10`:
```ts
const LEGACY_CIRCUIT_ROWS_STORAGE_KEY = "dinboard-tauri.circuit-rows.v1";
```

Podobnie w `src/lib/projectMetadata.ts:13`. To jest fallback dla odczytu ze starego klucza z Tauri — używany tylko przy migracji. **Nie jest martwy** (jest w `safeGetItemSync(... ?? LEGACY_...)`), ale warto wiedzieć, że to nie-do-usunięcia kod, dopóki nie ma pewności, że wszyscy userzy zmigrowali.

**Severity:** low (notatka).

**Owner:** project-io-expert.

---

## Podsumowanie

| Severity | Count |
|---|---|
| critical | 3 |
| high | 5 |
| medium | 7 |
| low | 5 |
| duplikaty | 6 |
| **Razem znalezisk** | **26** |

### Top 3 do naprawy w pierwszej kolejności

1. **C-1 / H-1** — zunifikować `isGroupHeadSymbol` w `domain/symbolGrouping.ts` (jedyne źródło prawdy) i usunąć lokalną definicję w `phaseDistributionCalculator.ts`. To jednocześnie naprawia ciche przesuwanie faz dla FR.
2. **C-2** — wyciągnąć `normalizeSinglePhase` do jednego źródła.
3. **C-3** — ujednolicić `DeviceKind` / `CircuitDeviceKind` (jedna nazwa, camelCase).

### Drugi priorytet (pozwala na rówoległą pracę)

- **H-2** (demo `phase: "N/PE"`) — szybka zmiana.
- **H-3** (rebuild symboli w `rcdManagerLogic`) — wpływa na wydajność.
- **H-4** (VAL-006 mylący dla dangling reference) — fix + test.
- **H-5** (brak testu „FR preserved in autoBalancePhases") — musi powstać po C-1.
- **D-1** (5+ implementacji helperów identyfikacyjnych) — największa inwestycja, ale najbardziej wartościowa w długim terminie.

### Owner-by-owner podsumowanie

| Owner | Znaleziska |
|---|---|
| developer | C-1 (częściowo), C-2, H-3, M-3, M-4, M-5, L-2, D-1, D-5 |
| electrical-expert | C-1 (częściowo), C-3, H-1, H-2, H-5, L-1, M-1, M-2, M-6, L-5, D-6 |
| tester | H-5, L-3, L-4 |
| project-io-expert | D-7 (notatka) |

---

*Audit wykonany read-only. Testy NIE zostały uruchomione — weryfikacja regresji zostanie przeprowadzona w kolejnym kroku (po naprawach).*
