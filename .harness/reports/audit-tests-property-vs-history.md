# Audyt testów DINBoard Web — property vs history guards

**Data:** 2026-06-27
**Metoda:** sample-based read top 10 największych test files, klasyfikacja it/test bloków
**Scope:** czy dany test pilnuje WŁAŚCIWOŚCI systemu (property guard) czy tylko HISTORYCZNEGO WYNIKU (history guard)
**Właściciel:** Mavis (general)
**Właściciele napraw:** developer, electrical-expert, canvas-expert, pdf-expert per ustalenie

---

## Definicje (do spornej interpretacji)

- **Property guard** — test aseruje zachowanie systemu dla klasy danych wejściowych ("X zwraca Y dla każdego MCB"). Refaktor impl zachowujący kontrakt nie łamie testu. Test NIE jest zależny od konkretnego rozmiaru fixture / historycznego wyniku.
- **History guard** — test aseruje konkretną wartość wyliczoną historycznie ("fixture ma 7 symboli, 20 połączeń"). Refaktor lub zmiana fixture może go złamać bez zmiany zachowania systemu. Test jest zależny od historycznego stanu, nie właściwości.
- **Mixed** — elementy obu; aseruje właściwość, ale wartość oczekiwana jest historyczna.

---

## Top 10 — klasyfikacja

### 1. `useProjectActions.test.ts` — 929 LOC, 42 tests — **HIGH quality**

Property tests z explicite `// WHY:` komentarzami przy nietrywialnych asercjach. Komentarze są wartościowe — np.:
> Real-validator coverage (np. że faktycznie łapie duplikat id) jest w `projectFileSemantics.test.ts`.

To pokazuje świadome rozgraniczenie: hook testuje hook behavior, validator testuje validator behavior.

**Słabsza assercja (mixed):**
- Linia 421: `statusMessages.some((m) => m.includes("Błąd"))` — substring check na errorze. Przechodzi dla każdego erroru zawierającego "Błąd", nawet jeśli hook zgłasza błąd z zupełnie innego powodu. Property: "komunikat błędu pojawia się" — działa. Ale nie pilnuje **konkretnego kodu/komunikatu**.

### 2. `useSymbolActions.test.ts` — 883 LOC, 35 tests — **HIGH quality, ale 1 confused test**

**🔴 Finding 2.1: `useSymbolActions.test.ts:189` confused test**

Nazwa: `prevents double-execution when called twice with stale closure (race condition guard)`
Ale assercja (linia 222-223):
```ts
// Second call succeeds normally because lock is released
expect(commands).toHaveLength(2);
```

Test aseruje **brak race condition guard**, nie jego istnienie. Komentarze wewnątrz testu same to przyznają ("The lock just prevents concurrent execution, not sequential"). Refaktor który **usunie** lock przejdzie test.

**Prawdopodobna geneza:** test został napisany gdy lock był inny, potem lock zmieniono na "released after call", ale nazwa i `// Uses isDeletingRef synchronously to prevent re-entry` zostały. Nazwa sugeruje konkretny kontrakt, assercja go nie pilnuje.

**Rekomendacja:** dwie opcje:
- **A**: Rename do `sequential calls execute independently` (matches reality).
- **B**: Dodaj prawdziwy concurrent test — `Promise.all([handleDeleteSelected(), handleDeleteSelected()])` i asercja że `commands.length === 1`.

### 3. `schematicLayoutEngine.test.ts` — 714 LOC, 21 tests — **MEDIUM-HIGH quality**

Property-based. Większość testów pilnuje realnych właściwości ("places X equivalently", "does not hide Y", "keeps Z compact").

**🟡 Finding 3.1: Stale comment fixed in this audit (`schematicLayoutEngine.test.ts:702` → 10+5)** — poprawione w ramach tego audytu.

Było: `// Root nodes should have 2 chunks representing the RCD head (12 + 3).` (resztka po refaktorze MAX_MODULES_PER_CARD 12→10). Assercje były prawidłowe (10+5), ale komentarz mylący. Fix: 1 linia.

**🟢 Finding 3.2: Naming inconsistency (low)**
Linie 11, 23, 75, 92 używają stylu `Build_WithX_ShouldY` (PascalCase + underscores). Reszta pliku (linie 126+) używa natural language ("Stable sorting of..."). To historyczny rozdźwięk — starsze testy miały format BDD-style, nowsze są property-name. Kosmetyka, niski priorytet.

### 4. `electricalValidationService.test.ts` — 674 LOC, 28 tests — **HIGH quality**

Jeden test per reguła walidacyjna. Czyste property.

**🟢 Finding 4.1: Negative assertion (acceptable)**
Linia 736: `expect(result.warnings.some((entry) => entry.code === 'VAL-004')).toBe(false)` — assercja że konkretny kod ostrzeżenia się NIE pojawia. Property: "no spurious VAL-004 warning for three-phase circuits". Działa, ale nie pilnuje wartości wyliczenia (tylko czy nie ma warninga). Jeśli formuła zacznie zwracać zupełnie inne złe wartości bez ostrzeżenia VAL-004 — test przejdzie. Akceptowalny trade-off dla "no spurious warning" semantic.

### 5. `PdfProtocolDocument.test.ts` — 546 LOC, 12 tests — **HIGH quality**

Czyste property na realnych fixture'ach i round-tripach. Asercje sprawdzają konkretne engineering values ("01A / 2026", "Obwód testowy 0" do "Obwód testowy 15", contractor name "Usługi Elektryczne PRO-EL").

### 6. `circuitEditFieldDefinitions.test.ts` — 369 LOC, 28 tests — **HIGH quality**

Czyste property per deviceKind/field combo. Wzorcowy przykład test-driven API: każdy test pilnuje konkretnego kontraktu edycji pola.

### 7. `appHelpers.test.ts` — 328 LOC, 11 tests — **HIGH quality**

Czyste property z explicite `// WHY:` przy nietrywialnych (np. "cycles grouped 2P RCD heads through single phases and applies them to child circuits" — pilnuje całej sekwencji).

### 8. `projectFile.test.ts` — 327 LOC, 15 tests — **HIGH quality**

Round-trip tests + Avalonia disambiguation + `appliedMigrations` marker. Każdy test sprawdza konkretny contract. Property-based.

### 9. `ferrulePosition.test.ts` — 307 LOC, 16 tests — **MEDIUM quality, 2 history guards**

**🟡 Finding 9.1: `ferrulePosition.test.ts:98` fixture shape history guard**

```ts
it("fixture loads with expected shape (schemaVersion 2, 7 symbols, 20 connections)", () => {
  expect(project.schemaVersion).toBe(2);
  expect(project.symbols).toHaveLength(7);
  expect(project.connections).toHaveLength(20);
});
```

History guard. Dodanie jednego symbolu do `testProject.dinboard` (np. nowego test case) łamie ten test mimo że **zachowanie systemu jest poprawne**. To test **fixture size**, nie property systemu.

Ale: ten test **pełni też inną rolę** — sanity check że fixture się ładuje. Jeśli fixture zostanie uszkodzony, ten test łapie to wcześniej niż inne. **Property guard by był lepszy**: "fixture ładuje się bez błędu i ma co najmniej 1 symbol" (lub: sprawdzić konkretne ID zamiast count).

**Rekomendacja:** Zmień na property:
```ts
expect(project.schemaVersion).toBeGreaterThanOrEqual(2);
expect(project.symbols.length).toBeGreaterThan(0);
expect(project.connections.length).toBeGreaterThan(0);
// Opcjonalnie: asercja że fixture zawiera specyficzny symbol którego reszta testów wymaga
expect(project.symbols.find(s => s.id === "...")).toBeDefined();
```

Albo: dodaj explicite `// WHY:` że pin size jest zamierzony.

**🟢 Finding 9.2: Diagnostic-only test (`ferrulePosition.test.ts:105-126`)**

```ts
// WHY: to jest raport diagnostyczny, nie asercja. ...
if (mismatches.length > 0) {
  console.warn(...)
}
// Sanity check: raport nie jest pusty (fixture się ładuje)
expect(Array.isArray(mismatches)).toBe(true);
```

Test **nigdy nie failuje** poza sanity check. Property: brak. Ale intencjonalnie z `// WHY:` komentarzem. Wartość: ostrzega developera jeśli fixture ma niespójne kolory tulejek.

**Rekomendacja:** Zostawić, ale może przenieść do dev-only skryptu lub oznaczyć tagiem `it.todo`/`it.skip` w CI. Obecnie to 20+ LOC testu który niczego nie pilnuje.

### 10. `referenceDesignations.test.ts` — 290 LOC, 46 tests — **HIGH quality**

Jeden test per deviceKind/edge case. 46 czystych property. Wzorcowy coverage.

---

## Podsumowanie

### Statystyki
- **Property guards:** 7/10 plików (70%) — `useProjectActions`, `electricalValidationService`, `PdfProtocolDocument`, `circuitEditFieldDefinitions`, `appHelpers`, `projectFile`, `referenceDesignations`, częściowo `useSymbolActions` (34/35).
- **Mixed:** 2/10 — `ferrulePosition` (history guard + diagnostic), `schematicLayoutEngine` (stale comments + naming).
- **Confused naming:** 1/10 — `useSymbolActions.test.ts:189`.

### Konkretne akcje (priority order)

| # | Severity | Akcja | Effort |
|---|---|---|---|
| 1 | HIGH | Rename lub fix `useSymbolActions.test.ts:189` (confused race-condition test) | 5 min |
| 2 | HIGH | ~~Fix stale comment `schematicLayoutEngine.test.ts:702`~~ | done w tym audycie |
| 3 | MEDIUM | `ferrulePosition.test.ts:98` zmiana na property guard (counts → existence check) | 5 min |
| 4 | LOW | `ferrulePosition.test.ts:105` oznaczyć jako diagnostic-only (skip w CI) | 10 min |
| 5 | LOW | `schematicLayoutEngine.test.ts` ujednolicić naming convention (legacy `Build_WithX` → natural language) | 30 min |

### Ryzyka i ograniczenia audytu

1. **Sample-based**: zbadano 10 z 33 test files. Istnieje prawdopodobieństwo że inne pliki mają podobne problemy. Rekomendacja: rozszerzyć audyt na pozostałe 23 pliki.

2. **Subiektywna klasyfikacja**: linia między "mixed" a "property" jest płynna. Test z explicite `// WHY:` komentarzem i konkretną wartością (np. `connection has id === "conn-1"`) jest property dla konkretnego input, ale jednocześnie history dla implementacji.

3. **Audyt nie wykrywa**: brakujących testów (coverage gap), testów które testują złą rzecz (np. sprawdzają mock a nie real code), testów z fake-green (mock jest błędny ale zwraca oczekiwaną wartość).

4. **Refaktory które łamią dobre testy**: w tym audycie nie sprawdzono który test jest brittle na proste refaktory (np. zamiana `for` na `map`). To inna klasa problemu.

5. **Time pressure**: zbadano top 10, ale nie głęboko. Niektóre znalezione "confused naming" mogą mieć nieoczywiste wyjaśnienie w git history.