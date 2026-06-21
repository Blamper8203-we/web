# Audyt ogólny: layer discipline, martwy kod, duplikaty helperów

**Data:** 2026-06-17
**Zakres:** `src/**` i `src-tauri/**` z wyłączeniem ścieżek objętych innymi audytami (elektryka, canvas, PDF, project-io).
**Metoda:** read-only przegląd kodu + testów. Testy NIE zostały uruchomione.
**Właściciel audytu:** general
**Właściciel napraw:** patrz „Owner" przy każdym znalezisku.

---

## Legenda severity

- **P0** — realny bug / utrata danych / cicha regresja
- **P1** — wpływ na poprawność, kontrakt lub maintainability (wysoki)
- **P2** — cleanup / duplikacja / naruszenie warstwy (średni)
- **P3** — nit / styl / szum (niski)

---

## Podsumowanie

| Severity | Count |
|---|---|
| P0 | 3 |
| P1 | 7 |
| P2 | 11 |
| P3 | 9 |
| **Razem** | **30** |

Kluczowe obserwacje:
- Trzy poważne martwe stany w `useDialogState` (palette context menu + pending palette removal) o **złych typach** — nigdy nie używane przez nikogo, ale eksportowane.
- Cztery funkcje (`findConnectedComponent`, `getHotspotPhase`, `checkConnectionWarning`, `getSymbolAssetUrl`) zduplikowane między `lib/connections/connectionsLogic.ts` a `lib/connections/canvasHelpers.ts` — z różnymi implementacjami.
- `useImportedModules` definiuje `svgImportDialogOpen` i `importedModulesManagerOpen` (identyczne jak `useDialogState`), ale App.tsx ich nie importuje — martwe 4 stany.
- Hardkodowany sekret Web3Forms access key w `FeedbackModal.tsx:26` — ryzyko reputacyjne + niezgodne z best practices.
- `ConnectionsRightPanel.tsx` to pusty stub: 19 linii, ignoruje wszystkie 5 propsów, renderuje pusty `<div>`.
- `Fixtures/demoData.ts` z funkcją `createDemoSymbols` nie ma żadnego konsumenta ani testu — martwy 127-liniowy plik.
- `types/symbolItem.ts` zawiera `computeDisplayProtection`, `computeRcdInfo`, `computeSpdInfo` — logika obliczająca stringi, wbrew regule „types/ = typy + normalizery".
- Importy po deklaracji funkcji w `App.tsx:73-75` — działające w TS (importy hoistowane), ale styl zły.

---

## P0 — błędy krytyczne

### P0-1. `ConnectionsRightPanel.tsx` to pusty stub ignorujący wszystkie propsy

**Pliki:** `src/components/ConnectionsRightPanel.tsx:12-19`

**Problem:** Komponent ma pełny interfejs `ConnectionsRightPanelProps` z 5 propsami (`connections`, `selectedConnectionId`, `onConnectionSelect`, `onConnectionsChange`, `symbols`) i jest podpięty w `AppRightPanel.tsx:167-174` jako prawy panel dla trybu `sheet1_connections`. Ale implementacja to pusty `<div>` z 19 linii:

```tsx
export function ConnectionsRightPanel(_props: ConnectionsRightPanelProps) {
  return (
    <div
      className="right-panel-content"
      style={{ padding: "16px", height: "100%", boxSizing: "border-box" }}
    />
  );
}
```

`_props` — propsy są celowo ignorowane (prefix `_`).

**Wpływ:** Użytkownik wchodzący w zakładkę „Rozdzielnica połączenia" (`sheet1_connections`) widzi pusty prawy panel. Nie może edytować właściwości wybranego połączenia, koloru kabla, przekroju, typu trasowania — mimo że lewy panel (`ConnectionsLeftPanel.tsx`) dostarcza te wszystkie funkcje edycji (linie 50-87). To jest dokładnie ten sam wzorzec co w canvas-audyt C-1: funkcjonalność jest zaimplementowana w jednym panelu, ale zależny panel jest pustym placeholderem.

**Severity:** P0 — funkcjonalnie niekompletne UI; użytkownik traci połowę zakładki „Połączenia".

**Sugerowana poprawka (nie implementuj):**
- Sprawdzić, czy `_props` ma być faktycznie wykorzystywany — najprawdopodobniej ten komponent powinien renderować tabelę `connections` z kolumnami (color, crossSection, type, routingMode, ferruleColor) i wołać `onConnectionSelect` na klik.
- Alternatywnie: usunąć cały komponent + jego import z `AppRightPanel.tsx` (linie 13, 167-174) i przywrócić panel do istniejącej wersji z `ConnectionsLeftPanel` jako single-pane.
- Decyzja wymaga pytania do usera: czy prawy panel w sheet1_connections miał pokazywać listę połączeń, czy coś innego.

**Owner:** developer + product decision.

---

### P0-2. Martwe stany `paletteContextMenu` / `pendingPaletteRemoval` w `useDialogState` ze ZŁYMI typami

**Pliki:**
- `src/hooks/useDialogState.ts:22-23` (definicja stanu)
- `src/hooks/useDialogState.ts:33-34, 45-46, 71-74, 88-89, 100-101, 110-111` (referencje)
- `src/App.tsx:227-228` (destrukturyzacja — z `usePaletteActions`, nie z `useDialogState`)

**Problem:** `useDialogState` deklaruje własne stany `paletteContextMenu` i `pendingPaletteRemoval` (linie 22-23) o typie:

```ts
{ x: number; y: number; groupTitle: string } | null   // paletteContextMenu
{ groupTitle: string; templateId: string } | null     // pendingPaletteRemoval
```

Ale ten sam hook jest **używany** w `App.tsx:149` (jako `dialog = useDialogState()`), a App.tsx **ignoruje** `dialog.paletteContextMenu` i `dialog.pendingPaletteRemoval`. Zamiast tego, te same właściwości są pobierane z `usePaletteActions` (linie 227-228):

```ts
const { paletteContextMenu, setPaletteContextMenu,
        pendingPaletteRemoval, setPendingPaletteRemoval,
        handlePaletteDrop, ... } = usePaletteActions({...});
```

…gdzie typy są zupełnie inne:

```ts
{ label: string; templateId: string; x: number; y: number } | null   // paletteContextMenu
{ label: string; templateId: string } | null                         // pendingPaletteRemoval
```

Dodatkowo:
- `useDialogState` zwraca `closeAllDialogs` (linia 83-91, 114) — **nigdy nie wywoływane** przez nikogo w kodzie.
- Handler Capacitor Back button (linie 58-81) sprawdza `stateRef.current.paletteContextMenu` i `stateRef.current.pendingPaletteRemoval` — ale te wartości **zawsze są `null`**, bo stan nigdy nie jest ustawiany. Back button dla tych dialogów nie działa.
- `useDialogState.ts:79` — `backListener.then((l) => l.remove())` — promise bez `.catch()`, potencjalny unhandled rejection jeśli listener się nie zainstalował.

**Wpływ:**
- Back button na Androidzie (przez Capacitor) NIE zamyka palette context menu i pending removal confirm — użytkownik musi kliknąć poza lub Escape, a nie działa sprzętowy „wstecz".
- 12 martwych linii kodu + 6 martwych setów w useState + 1 martwy export `closeAllDialogs`.
- Ktoś w przyszłości może „naprawić" `useDialogState` używając jego własnych stanów — wtedy typy się rozjedzie i pojawi się cichy bug.
- Brak `.catch()` na `backListener.then` to minor — ale jeśli Capacitor nie zainicjalizuje się, dostaniemy unhandled promise rejection w każdym rerenderze.

**Severity:** P0 — dwa martwe stany o złych typach + zepsuty back button dla dwóch dialogów + obietnica bez catch.

**Sugerowana poprawka:**
1. **Wariant A (bezpieczny):** usunąć `paletteContextMenu` i `pendingPaletteRemoval` z `useDialogState` (linie 22-23, 33-34, 45-46, 53-54, 71-74, 88-89, 100-101, 110-111). Usunąć `closeAllDialogs` (nigdy nie używane). Skupić `useDialogState` wyłącznie na: RCD, Help, SvgImport, ImportedModules, UnsavedChanges.
2. **Wariant B (ryzykowny):** przenieść `paletteContextMenu` i `pendingPaletteRemoval` z `usePaletteActions` do `useDialogState` i przekazywać do `usePaletteActions` jako parametry — to wymaga przepisania interfejsu i zmiany 8 propsów App.tsx. **Nie rób tego** bez wyraźnej prośby usera.
3. **Niezależnie:** dodać `.catch(() => {})` do `backListener.then(...)` w cleanup useEffect.

**Owner:** developer.

---

### P0-3. Martwe stany `svgImportDialogOpen` / `importedModulesManagerOpen` w `useImportedModules` — duplikują `useDialogState`

**Pliki:**
- `src/hooks/useImportedModules.ts:41-42` (definicja stanu)
- `src/hooks/useImportedModules.ts:144` (setter wewnętrzny)
- `src/hooks/useImportedModules.ts:175-177` (eksport)
- `src/App.tsx:154-165` (destrukturyzacja — pomija te propsy)

**Problem:** `useImportedModules` definiuje:

```ts
const [svgImportDialogOpen, setSvgImportDialogOpen] = useState(false);
const [importedModulesManagerOpen, setImportedModulesManagerOpen] = useState(false);
```

Eksportuje je w hooku (linie 175-177) i ustawia `setSvgImportDialogOpen(false)` wewnętrznie w `handleSvgImportCommit` (linia 144). Ale te same nazwy są też w `useDialogState` (linie 20-21). App.tsx używa **wersji z useDialogState** (linie 486, 487, 624, 627, 615, 621) — wersja z `useImportedModules` jest ignorowana.

Weryfikacja: destrukturyzacja w `App.tsx:154-165` pobiera z `useImportedModules` tylko `importedModules`, `paletteGroups`, `paletteTemplateMap`, `importedModuleCategoryOptions`, `activePaletteGroupTitle`, `setActivePaletteGroupTitle`, `handleHidePaletteTemplate`, `handleSvgImportCommit`, `handleImportedModuleCategoryChange`, `handleRemoveImportedModule`. Żaden z `svgImportDialogOpen`, `importedModulesManagerOpen` ani ich setterów nie jest wzięty.

**Wpływ:**
- Wywołanie `setSvgImportDialogOpen(false)` w `handleSvgImportCommit:144` ustawia **lokalny stan wewnątrz useImportedModules**, ale UI nie jest podpięte do tego stanu — nic się nie zmienia wizualnie. To wygląda na logikę, która kiedyś działała, ale została przeniesiona.
- 2 martwe stany + 2 martwe settery + 1 martwe wywołanie settera = 5 martwych linii.

**Severity:** P0 — martwy stan z `setSvgImportDialogOpen(false)` wygląda jak bug fix do czasu aż ktoś zrozumie, dlaczego dialog się nie zamyka po imporcie. W praktyce dialog zamyka się przez inny mechanizm (App.tsx:627) — bo `useDialogState` wersja obsługuje `onClose`.

**Sugerowana poprawka:**
- Usunąć `svgImportDialogOpen` (linia 41) + `importedModulesManagerOpen` (linia 42) + ich eksport (linie 175-177) + wywołanie `setSvgImportDialogOpen(false)` w `handleSvgImportCommit:144`.
- Ewentualnie: przenieść logikę zamykania dialogu do callbacka `handleSvgImportCommit` jeśli jest potrzebna — ale to już jest w App.tsx po stronie konsumenta.

**Owner:** developer.

---

## P1 — wysokie

### P1-1. Cztery funkcje zduplikowane między `connectionsLogic.ts` a `canvasHelpers.ts` z RÓŻNYMI implementacjami

**Pliki:**
- `src/lib/connections/connectionsLogic.ts:47-165` (definicje 4 funkcji)
- `src/lib/connections/canvasHelpers.ts:27-162` (definicje 4 funkcji)
- `src/lib/connections/canvasHelpers.test.ts` (testy tylko wersji z canvasHelpers)

**Problem:** Cztery funkcje mają kopie w obu plikach:

| Funkcja | `connectionsLogic.ts` | `canvasHelpers.ts` | Używana wersja |
|---|---|---|---|
| `findConnectedComponent` | linia 47-81 | linia 27-72 | canvasHelpers |
| `getHotspotPhase` | linia 83-102 | linia 79-98 | canvasHelpers |
| `checkConnectionWarning` | linia 104-146 | linia 107-149 | canvasHelpers |
| `getSymbolAssetUrl` | linia 148-165 | linia 156-162 | obie! |

`DinRailConnectionsCanvas.tsx:54-59` importuje:
- `getFerruleLength` z `connectionsLogic` (jedyna wersja)
- `checkConnectionWarning`, `findConnectedComponent`, `getSymbolAssetUrl` z `canvasHelpers`

`useDinRailForegroundSvgs.ts:3` importuje `getSymbolAssetUrl` z `connectionsLogic` — **inna implementacja niż ta w canvasHelpers**.

Różnice w `getSymbolAssetUrl`:
- **canvasHelpers wersja (linia 156-162):** prosta, tylko normalizuje leading slash
- **connectionsLogic wersja (linia 148-165):** dodaje prefiks `assets/modules/` jeśli brakuje, ma fallback `return "/"` dla pustej ścieżki

**Wpływ:**
- Dwie wersje `getSymbolAssetUrl` to ryzyko: hook `useDinRailForegroundSvgs` dostaje URL z prefiksem `assets/modules/`, ale komponent główny dostaje surową ścieżkę. Jeśli ktoś zmieni którąś implementację, niespójność się ujawni dopiero w runtime.
- Dwie wersje `findConnectedComponent` — wersja `canvasHelpers` obsługuje `startIsTop` (3-argumentowa), wersja `connectionsLogic` nie (2-argumentowa). Jeśli ktokolwiek zaimportuje złą wersję, trace będzie niepoprawny.
- 4 kopie × testy w 1 pliku (canvasHelpers) = martwa część `connectionsLogic.ts` z 4 funkcjami, której testy nie istnieją.

**Severity:** P1 — realne ryzyko regresji przy każdej zmianie.

**Sugerowana poprawka:**
- Zostawić `getFerruleLength`, `getAutoFerruleColor`, `WIRE_COLORS_MAP`, `FERRULE_COLORS_MAP`, `WIRE_THICKNESS_MAP`, `isTerminalZlaczka` w `connectionsLogic.ts`.
- Przenieść `findConnectedComponent`, `getHotspotPhase`, `checkConnectionWarning` do `canvasHelpers.ts` (gdzie już są + mają testy) i usunąć duplikaty z `connectionsLogic.ts`.
- Dla `getSymbolAssetUrl`: wybrać jedną wersję (rekomendacja: `connectionsLogic` wersja z prefiksem, bo hook tego potrzebuje), usunąć drugą, zaktualizować `useDinRailForegroundSvgs` i `DinRailConnectionsCanvas` żeby obie importowały z jednego źródła.
- Dodać testy dla `getSymbolAssetUrl` w `canvasHelpers.test.ts` (po przeniesieniu).

**Owner:** developer.

---

### P1-2. Hardkodowany Web3Forms access key w kodzie klienta

**Plik:** `src/components/FeedbackModal.tsx:26`

**Problem:**
```ts
body: JSON.stringify({
  access_key: "128e7269-2a2d-43ec-8c77-dda324386556",
  ...
}),
```

Klucz API jest wklejony w JS-owym bundlu, który pobiera każdy użytkownik. Web3Forms access keys są z założenia publiczne (działają z domeny), więc to nie jest klasyczny secret leak. **ALE** Web3Forms pozwala na konfigurację allow-list domen i rate-limitów per klucz, więc wyciek klucza = ktoś może:
- Zasypać formularz feedbacku spamem.
- Fałszować zgłoszenia (udosabniać atakującego).
- Wyczerpać darmowy limit.

Sprawdzenie: `rg "128e7269" -n` — klucz pojawia się TYLKO w `FeedbackModal.tsx`. Nie ma fallbacku do env vars.

**Wpływ:**
- Reputacyjne: skrzynka twórcy może zostać zasypana spamem.
- Bezpieczeństwo: klucz nie może być zrotowany bez re-deployu.

**Severity:** P1 — niski exploit potential, ale łatwa poprawka.

**Sugerowana poprawka:**
- Przenieść klucz do `import.meta.env.VITE_WEB3FORMS_ACCESS_KEY` z fallbackiem lub bez (tzn. wyłączyć formularz jeśli brak).
- Ograniczyć akceptację klucza do konkretnej domeny w panelu Web3Forms (opcjonalnie).
- Dodać `// WHY: klucz jest publicznie dostępny (Web3Forms tak działa), ale chcemy go scentralizować w env` komentarz w .env.example.

**Owner:** developer (poprawka) + tester (test że env var działa).

---

### P1-3. `types/symbolItem.ts` zawiera logikę obliczającą — narusza warstwę `types/`

**Plik:** `src/types/symbolItem.ts:237-278`

**Problem:** `types/` wg AGENTS.md powinien zawierać „typy + normalizery" ale NIE logikę obliczającą. Tymczasem `symbolItem.ts` zawiera:

```ts
function computeDisplayProtection(symbol: SymbolBase): string { ... }   // linia 237-248
function computeDisplayLocation(symbol: SymbolBase): string { ... }     // linia 250-252
function computeDisplayModuleNumber(symbol: SymbolBase): string { ... } // linia 254-260
function computeRcdInfo(symbol: SymbolBase): string { ... }             // linia 262-267
function computeSpdInfo(symbol: SymbolBase): string { ... }             // linia 269-274
function computeIsTerminalBlock(symbol: SymbolBase): boolean { ... }    // linia 276-278
```

Te funkcje robią `toUpperCase().includes("RCD")`, warunkowe formatowanie stringów, itp. To jest obliczeniowa logika domenowa, która powinna mieszkać w `lib/`.

Dodatkowo `createDefaultSymbolItem` (linia 152-235) woła te funkcje, więc NIE da się ich wyciągnąć bez naruszenia kontraktu `createDefaultSymbolItem`.

**Wpływ:**
- Testy typu `createDefaultSymbolItem` (których jest wiele) pośrednio testują te compute-funkcje, ale nie ma dla nich osobnych testów jednostkowych.
- Jeśli ktoś chce zrozumieć "co wyświetli się w kolumnie Protection", musi czytać types/, nie lib/.

**Severity:** P1 — naruszenie warstwy w centralnym miejscu.

**Sugerowana poprawka:**
- Przenieść compute-funkcje do `lib/domain/displayFields.ts` (nowy plik) lub do istniejącego `lib/circuitEdit/`.
- `createDefaultSymbolItem` w `types/` importuje je z `lib/`.
- Zachować `normalizeSymbolItems` w `types/` (to jest normalizer — pasuje do warstwy).
- Dodać testy jednostkowe dla każdej compute-funkcji.

**Owner:** developer (refactor) + electrical-expert (review czy semantyka się nie zmieni).

---

### P1-4. `appHelpers.ts` re-eksportuje cały `lib/domain/*` — to barrel-file, ale ukrywa ścieżki

**Pliki:**
- `src/lib/appHelpers.ts:16-20` (5 `export *` do lib/domain/)
- Konsumenci (np. `usePaletteActions.ts:18`, `useSymbolActions.ts:19`) importują z `'../lib/appHelpers'`

**Problem:** `lib/domain/*` zawiera 5 plików z 30+ eksportami. Konsumenci nigdy nie importują z `lib/domain/*` bezpośrednio — zawsze przez `lib/appHelpers`. To tworzy ukrytą zależność: `appHelpers.ts` pełni rolę „barrel file" dla całej warstwy domain.

Konsekwencje:
- Nowa osoba w kodzie nie wie, że `lib/domain/` istnieje.
- Refaktoring `appHelpers.ts` (np. przeniesienie do `lib/app/state.ts`) zmusza do refaktoringu wszystkich importów.
- Testy dla `lib/domain/*.ts` istnieją, ale konsumenci nie wiedzą, że te testy istnieją.

**Wpływ:** Maintainability. Brak testów dla samego `appHelpers.ts` (testy są w `lib/domain/*.test.ts`).

**Severity:** P1 — ukrywa architekturę, ale działa.

**Sugerowana poprawka:**
- Zostawić jak jest (jeśli barrel-file jest świadomą decyzją architektoniczną).
- Alternatywnie: zmienić importy w konsumentach na bezpośrednie `'../lib/domain/symbolGrouping'` itd., a `appHelpers.ts` zachować tylko dla helperów UI (createPaletteDragPreview, isEditableShortcutTarget, re-eksporty typów).
- Dodać `// WHY: barrel-file dla warstwy domain, żeby konsumenci nie musieli znać struktury katalogów` komentarz.

**Owner:** developer (decyzja architektoniczna).

---

### P1-5. `useDialogState` roszczeniowo importuje Capacitor na każdym renderze platformy webowej

**Plik:** `src/hooks/useDialogState.ts:2`

**Problem:**
```ts
import { App as CapApp } from "@capacitor/app";
```

Ten import wykonuje się na web buildzie. AGENTS.md wyraźnie mówi (sekcja 5 w „Things that are NOT obvious"): "Wrap Capacitor calls in try/catch — the web build runs the same code without Capacitor." I to robi `CapApp.addListener` w `useEffect` (linia 59) — jest w useEffect, więc runtime error jest bezpieczny. **ALE** sam import statyczny `import { App as CapApp }` na webzie może:
- Zwiększyć rozmiar bundla (jeśli Capacitor App plugin ma polyfill).
- Wyrzucić błąd jeśli Capacitor global nie jest zainicjowany w web buildzie.

Sprawdzenie: `App.tsx`, `moduleCatalog.ts:824-829` i `useProjectActions.ts` używają wzorca `Capacitor.isNativePlatform()` przed wywołaniem — `useDialogState` tego NIE robi.

**Wpływ:**
- Jeśli Capacitor App plugin nie zarejestruje się poprawnie w web buildzie, `CapApp.addListener` zwróci `undefined` lub rzuci — ale to jest w useEffect, więc tylko console.error.
- Brak guard `Capacitor.isNativePlatform()` jest niezgodny ze wzorcem reszty kodu.

**Severity:** P1 — niezgodność ze wzorcem, potencjalny runtime error.

**Sugerowana poprawka:**
- Dodać guard `if (!Capacitor.isNativePlatform()) return;` na początku useEffect w linii 58-81.
- Dodać `.catch(() => {})` do `backListener.then((l) => l.remove())` w cleanup.

**Owner:** developer.

---

### P1-6. Dwukrotnie obliczane `projectFileName` w App.tsx (duplikacja logiki)

**Plik:** `src/App.tsx:377` i `src/App.tsx:465`

**Problem:** Te same 2 linijki logiki w dwóch miejscach:

```ts
// linia 377
const projectFileName = (currentFilePath ? currentFilePath.split(/[\\/]/).pop() : "Nowe zlecenie") ?? "Nowe zlecenie";
```

```ts
// linia 465
projectFileName={currentFilePath ? currentFilePath.split(/[/\\]/).pop() || "Nowe zlecenie" : "Nowe zlecenie"}
```

`projectFileName` z linii 377 jest używany w `<AppStatusBar>` (linia 600), a inline wersja w linii 465 jest przekazywana do `<AppHeader>` (linia 465). Te dwie wartości powinny być identyczne, ale są obliczane osobno.

Różnice składniowe (oba robią to samo):
- `split(/[\\/]/)` vs `split(/[/\\]/)` — ten sam efekt.
- `?? "Nowe zlecenie"` vs `|| "Nowe zlecenie"` — `??` jest poprawniejsze (nie traktuje `""` jako nullish), ale `split().pop()` nigdy nie zwraca `""` w tych kontekstach.

**Wpływ:** Minimalne — ale jeśli ktoś zmieni fallback w jednym miejscu, drugie się rozjedzie.

**Severity:** P1 (utrzymanie dwóch wersji tego samego).

**Sugerowana poprawka:**
- Wyciągnąć helper:
  ```ts
  // lib/appHelpers.ts
  export function getProjectFileName(path: string | null): string {
    if (!path) return "Nowe zlecenie";
    return path.split(/[\\/]/).pop() || "Nowe zlecenie";
  }
  ```
- Użyć w obu miejscach.

**Owner:** developer.

---

### P1-7. `App.tsx:73-75` — importy po deklaracji funkcji

**Plik:** `src/App.tsx:71-75`

**Problem:** W `App.tsx` `loadUiTheme()` (linia 64-71) jest zadeklarowana PRZED importami `ProjectFileData`, `openProjectFile`, `safeGetItemSync`, `safeSetItem`, `initStorageService` (linie 73-75). TypeScript to akceptuje (importy są hoistowane), ale styl jest mylący.

```ts
function loadUiTheme(): AppUiTheme {
  try {
    const value = safeGetItemSync(UI_THEME_STORAGE_KEY);   // używa importu z linii 75
    return value === "classic" ? "classic" : "modern";
  } catch {
    return "modern";
  }
}

import type { ProjectFileData } from "./lib/projectFile";
import { openProjectFile } from "./lib/projectFile";
import { safeGetItemSync, safeSetItem, initStorageService } from "./lib/storageService";
```

**Wpływ:** Maintainability — ktoś czytając plik szuka importów na górze i nie widzi `storageService` w pierwszym przebiegu.

**Severity:** P1 — styl.

**Sugerowana poprawka:**
- Przenieść wszystkie importy do bloku 1-75 (nad `function AppWorkspace`).
- `loadUiTheme` pozostaje w miejscu.

**Owner:** developer.

---

## P2 — średnie

### P2-1. Martwy plik `fixtures/demoData.ts` (127 linii, zero konsumentów)

**Pliki:**
- `src/fixtures/demoData.ts:1-127` (cały plik)
- `rg "createDemoSymbols"` — jedyne trafienie to sam plik (linia 4)

**Problem:** `createDemoSymbols` to 127 linii kodu tworzącego dwa RCD + siedem MCB w poprawnym formacie `SymbolItem`. Zero importów w całym `src/`. Zero testów.

**Wpływ:**
- Martwy kod w repo. Nikt go nie woła, więc regresja (np. nowe pole w `SymbolItem`) NIE wybuchnie w demo.
- Jeśli kiedyś developer doda przycisk „Load demo", to i tak musi dostosować fixture.

**Severity:** P2 — martwy kod, ale duży.

**Sugerowana poprawka:**
- Jeśli demo NIE jest planowane: usunąć cały plik.
- Jeśli demo JEST planowane: dodać testy + podpiąć do menu (np. „Plik → Otwórz demo").
- Nie rób nic: śmieci w repo.

**Owner:** developer (decyzja) + product.

---

### P2-2. `connectionsLogic.ts` eksportuje duplikaty wire/ferrule color maps

**Pliki:**
- `src/lib/connections/connectionsLogic.ts:5-15` (WIRE_COLORS_MAP)
- `src/lib/connections/connectionsLogic.ts:17-26` (FERRULE_COLORS_MAP)
- `src/lib/dinRailCanvas/constants.ts:16-26` (WIRE_COLORS_MAP — DUPLIKAT)
- Sprawdzenie: tylko FerruleGraphic.tsx importuje FERRULE_COLORS_MAP z connectionsLogic (linia 1).

**Problem:** Canvas audit (C-2) znalazł WIRE_THICKNESS_MAP zduplikowane 4× — ale nie WIRE_COLORS_MAP ani FERRULE_COLORS_MAP. Te są zduplikowane 2×:

- `connectionsLogic.ts:5-15` (WIRE_COLORS_MAP)
- `dinRailCanvas/constants.ts:16-26` (WIRE_COLORS_MAP — identyczna zawartość)

WIRE_COLORS_MAP używana jest z `dinRailCanvas/constants.ts` (patrz DinRailConnectionsCanvas.tsx:60-63).

**Wpływ:** Przy każdej zmianie kolorów kabli trzeba pamiętać o obu plikach. Canvas audit C-2 już zgłosił WIRE_THICKNESS_MAP — ten sam problem.

**Severity:** P2 — duplicat utrzymaniowy.

**Sugerowana poprawka:**
- Zrobić razem z canvas-audit C-2 (WIRE_THICKNESS_MAP). Wybrać jedno źródło (rekomendacja: `connectionsLogic.ts` lub nowy `lib/canvas/wireStyle.ts`) i usunąć drugą kopię.
- Ten raport NIE implementuje — czeka na decyzję z canvas audit.

**Owner:** canvas-expert + developer (już w kanale canvas audit).

---

### P2-3. Nadmiarowe `devLog` w produkcyjnych ścieżkach (3 przykłady)

**Pliki:**
- `src/lib/domain/referenceDesignations.ts:95, 101, 104, 109, 113` (5 wywołań w `getAuxiliaryPrefix`)
- `src/components/CircuitEditPanel.tsx:59, 61, 62-67` (3 wywołania w `handleSave`)
- `src/hooks/useDinRailPreparedAssets.ts:89, 90, 122` (3 wywołania)

**Problem:** AGENTS.md „Known tool quirks": "68 console.* calls remain in the codebase as diagnostic traces. They are not bugs, but they are noise". Ale `devLog` też jest śladem. Przykłady:

`referenceDesignations.ts:95-114`:
```ts
export function getAuxiliaryPrefix(symbol: SymbolItem): string {
  if (isDistributionBlockSymbol(symbol)) {
    devLog('[AUX] BL prefix for:', symbol.label, symbol.moduleRef);
    return "BL";
  }
  const text = ...;
  devLog('[AUX] text for prefix check:', JSON.stringify(text.substring(0, 120)));
  if (...) {
    devLog('[AUX] PE prefix for:', symbol.label);
    return "PE";
  }
  ...
  devLog('[AUX] X prefix for:', symbol.label, symbol.moduleRef);
  return "X";
}
```

5 wywołań `devLog` w funkcji, która jest wywoływana w `assignAuxiliaryReferenceDesignations` (pętla po symbolach) — dla każdej edycji palety to 5-10 linii logów w devtools.

`CircuitEditPanel.tsx:59-67`:
```ts
const handleSave = () => {
  devLog("🟡 [CircuitEditPanel.handleSave] values:", values);
  const nextSymbol = applyCircuitEditValues(symbol, values);
  devLog("🟡 [CircuitEditPanel.handleSave] nextSymbol FULL OBJECT:", nextSymbol);
  devLog("🟡 [CircuitEditPanel.handleSave] nextSymbol.parameters DETAILED:", {...});
  ...
};
```

3 wywołania w jednej funkcji `handleSave` — loguje cały obiekt SymbolItem przy każdym zapisie edycji obwodu.

**Wpływ:** Noise w dev console. Zasłania prawdziwe błędy.

**Severity:** P2 — szum, ale łatwa poprawka.

**Sugerowana poprawka:**
- Usunąć wszystkie 11 `devLog` z tych 3 plików.
- Jeśli konkretny ślad jest potrzebny do debug, zostawić JEDEN z komentarzem `// WHY: ...`.
- W przyszłości: wprowadzić `// TODO: cleanup devLog po debugowaniu` przy każdym nowym użyciu.

**Owner:** developer.

---

### P2-4. Magic string `"dinboard.default_wire_settings"` powtórzony, inline'owy typ `defaultWireSettings` w App.tsx

**Plik:** `src/App.tsx:107-125, 115, 305`

**Problem:** Typ `defaultWireSettings` jest zdefiniowany inline w dwóch miejscach:

```ts
// App.tsx:107-113
const [defaultWireSettings, setDefaultWireSettings] = useState<{
  wireColor: WireColor;
  wireCrossSection: number;
  wireType: WireType;
  routingMode: RoutingMode;
  ferruleColor?: FerruleColor;
}>(() => { ... });
```

Taki sam typ jest powtórzony w `ConnectionsLeftPanel.tsx:3-21` (jako props), a w `AppLeftPanel.tsx:28-29` zdegradowany do `any`.

Dodatkowo klucz `"dinboard.default_wire_settings"` jest wpisany literalnie 2× (linie 115, 305) — to ryzyko literówki i brak autouzupełniania.

**Wpływ:** Brak typowej kontroli w AppLeftPanel.tsx (`any`).

**Severity:** P2 — maintainability.

**Sugerowana poprawka:**
- Wyciągnąć `interface DefaultWireSettings {...}` do `lib/connections/connectionsLogic.ts` (eksportować obok `getAutoFerruleColor`).
- Wyciągnąć klucz do `const DEFAULT_WIRE_SETTINGS_STORAGE_KEY = "dinboard.default_wire_settings"` obok istniejącego `SYMBOLS_STORAGE_KEY` w `lib/appHelpers.ts`.
- Użyć w obu miejscach.

**Owner:** developer.

---

### P2-5. AppLeftPanel.tsx:28-29 — typy `any` w propsach

**Plik:** `src/components/AppLeftPanel.tsx:28-29`

**Problem:**
```ts
defaultWireSettings?: any;
onChangeDefaultWireSettings?: (settings: any) => void;
```

To są 2 z 28 `any` w całym codebase (wg AGENTS.md „28 any type usages"). W komponentach UI `any` w propsach to:
- Utrata typecheck dla wywołującego.
- Wymaga ręcznego utrzymywania zgodności z rzeczywistym typem (w `App.tsx:107-125`).

**Severity:** P2 — naruszenie reguły „don't add a new one without a comment explaining why the type is genuinely unknowable".

**Sugerowana poprawka:**
- Użyć typu z poprawki P2-4.

**Owner:** developer.

---

### P2-6. AppWorkspaceCanvas.tsx:58 — typ `any` w propsie

**Plik:** `src/components/AppWorkspaceCanvas.tsx:58`

**Problem:** `defaultWireSettings?: any;` (linia 58) — trzeci `any` w propsach komponentu (patrz P2-5).

**Wpływ:** Identyczny jak P2-5.

**Severity:** P2.

**Sugerowana poprawka:** Identyczna jak P2-5.

**Owner:** developer.

---

### P2-7. `usePaletteActions.ts:445 linii` — duży plik, mieszane odpowiedzialności

**Plik:** `src/hooks/usePaletteActions.ts`

**Problem:** Plik 445 linii, zawiera:
- `handlePaletteDrop` (200+ linii, 100-353) — logika snap-to-rail, group creation, terminal block placement, all in one function
- `handlePaletteDropOnSheet2` (355-366)
- `handlePaletteInsert` (368-417)
- `handleUnsupportedDinRailDrop` (419-426)
- `handleConfirmPaletteRemoval` (428-433)

Nie jest w kanale „container files" AGENTS.md (które są wymienione z nazw), ale przekracza próg 400 linii i ma wyraźnie mieszane odpowiedzialności (snap logic + group creation + palette UI).

**Wpływ:** Maintainability — refactor jednej odpowiedzialności dotyka całego pliku.

**Severity:** P2 — duży ale działający.

**Sugerowana poprawka:**
- Wyciągnąć logikę snap-to-rail (linie 232-325) do osobnego helpera w `lib/palette/dropLogic.ts`.
- Wyciągnąć logikę terminal block placement (linie 191-231) do `lib/palette/terminalBlockPlacement.ts`.
- Zachować hook jako cienką warstwę orkiestracji (100-150 linii).

**Owner:** developer.

---

### P2-8. Brak testów dla krytycznych helperów

**Pliki bez testów (w moim scope):**
- `src/lib/poleCount.ts` (113 linii) — brak testu
- `src/lib/deviceIdentification.ts` (83 linie) — brak testu
- `src/lib/runtimeDiagnostics.ts` (90 linii) — brak testu
- `src/lib/storageService.ts` (115 linii) — brak testu
- `src/lib/routing/wireRoutingEngine.ts` (315 linii) — test istnieje (19 linii, 2 testy, patrz P3-3)
- `src/lib/appShortcuts.ts` (92 linie) — test istnieje (appShortcuts.test.ts, 156 linii, OK)
- `src/hooks/useElementSize.ts` — brak testu (33 linie, prosta funkcja)
- `src/hooks/useDinRailPreparedAssets.ts` — brak testu (139 linii, skomplikowany)
- `src/hooks/useImportedModules.ts` — brak testu (184 linii, skomplikowany + storage)
- `src/hooks/useDialogState.ts` — brak testu (127 linii, obsługuje back button + state ref)
- `src/hooks/useSchematicState.ts` — brak testu (41 linii, proste)
- `src/hooks/useSchematicViewport.ts` — brak testu (164 linie, skomplikowany)
- `src/hooks/useSchematicInteraction.ts` — brak testu (229 linii, skomplikowany)
- `src/hooks/usePaletteActions.ts` — brak testu (445 linii!)
- `src/hooks/useSymbolActions.ts` — test istnieje (34796 bytes)
- `src/hooks/useSymbolHistory.ts` — test istnieje (11406 bytes)
- `src/hooks/useDinRailForegroundSvgs.ts` — brak testu (76 linii)
- `src/hooks/useDinRailRailGenerator.ts` — brak testu (146 linii)
- `src/hooks/useSchematicCellEdit.ts` — brak testu (70 linii)
- `src/hooks/useSvgTerminalsPreloader.ts` — brak testu (57 linii)
- `src/hooks/useToolbarMenuState.ts` — brak testu (53 linie)
- `src/components/ProjectPropertiesPage.tsx` (364 linii) — brak testu
- `src/components/ValidationPanel.tsx` (275 linii) — brak testu
- `src/components/CircuitListPage.tsx` (155 linii) — brak testu
- `src/components/AppHeader.tsx` (343 linii) — brak testu
- `src/components/FeedbackModal.tsx` (109 linii) — brak testu (z hardcoded key!)
- `src/components/ConnectionsRightPanel.tsx` (19 linii) — pusty stub, ale brak testu
- `src/components/AppDialogsLayer.tsx` (170 linii) — brak testu
- `src/components/ImportedModulesDialog.tsx` (107 linii) — brak testu
- `src/components/RcdManagementDialog.tsx` (4815 bytes) — brak testu

**Wpływ:** Regresja w tych modułach nie wybuchnie w CI. Szczególnie ryzykowne:
- `usePaletteActions.ts` (445 linii, snap + group creation)
- `useDialogState.ts` (martwe stany — patrz P0-2)
- `useSchematicInteraction.ts` (229 linii, pan/zoom/drag)

**Severity:** P2 — dużo modułów bez testów, ale nie wszystkie są krytyczne.

**Sugerowana poprawka (priorytet):**
1. Dodać testy dla `poleCount.ts` i `deviceIdentification.ts` (czyste funkcje domenowe, łatwe).
2. Dodać testy dla `useDialogState` (po usunięciu martwych stanów).
3. Dodać testy dla `usePaletteActions` (wymaga mock storage, ale snap logic to czysta funkcja).
4. Dodać testy dla `FeedbackModal` (po przeniesieniu key do env).
5. Reszta — w miarę czasu.

**Owner:** tester.

---

### P2-9. Niespójne error handling — `console.error` vs `reportRuntimeError` vs swallow

**Pliki:**
- `src/App.tsx:679` — `console.error(e);` (naruszenie wzorca — reszta kodu używa `reportRuntimeError`)
- `src/hooks/useDinRailForegroundSvgs.ts:56` — `console.error("Error fetching foreground SVG for", symbol.id, e);`
- `src/lib/storageService.ts:77, 94` — `console.warn(...)`
- `src/lib/runtimeDiagnostics.ts:63` — `console.error("DINBoard runtime diagnostic", {...})` (to jest OK — wewnątrz `reportRuntimeError`)
- `src/App.tsx:97, 104, 117` — `} catch { /* ignore */ }` (swallow)
- `src/lib/appHelpers.ts:33` — `} catch { return null; }` (swallow + fallback)
- `src/lib/deviceIdentification.ts` — brak error handlingu (ale to pure functions, nie ma co łapać)

**Problem:**
- AGENTS.md mówi: "Wrap Capacitor calls in try/catch — the web build runs the same code without Capacitor." Ale NIE mówi gdzie raportować błędy runtime. Niemniej istnieje `lib/runtimeDiagnostics.ts:reportRuntimeError` — dedykowany helper.
- `App.tsx:679` powinien używać `reportRuntimeError(e, { source: "unhandled-error" })` zamiast `console.error(e)`.
- `useDinRailForegroundSvgs.ts:56` powinien używać `devError` (gated do dev) lub `devLog` zamiast `console.error` (które działa w produkcji).
- `storageService.ts:77, 94` — to jest wewnętrzny helper, ale `console.warn` w produkcji to szum.

**Wpływ:** Szum w konsoli produkcyjnej + niespójny mechanizm raportowania błędów.

**Severity:** P2.

**Sugerowana poprawka:**
- `App.tsx:679` — zmienić na `reportRuntimeError(e, { source: "unhandled-error" })`.
- `useDinRailForegroundSvgs.ts:56` — zmienić na `devLog("🔶 [useDinRailForegroundSvgs] Failed to fetch", symbol.id, String(e))`.
- `storageService.ts:77, 94` — zmienić na `devWarn(...)` (gated do dev) LUB zostawić `console.warn` ale z `// WHY:` komentarzem.
- `App.tsx:97, 104, 117` (swallow) — dodać `devWarn("App.tsx: ignoring corrupt localStorage value", e)` żeby było widać w dev.

**Owner:** developer.

---

### P2-10. Brak testu `ConnectionsRightPanel.tsx` (P0-1 implikacja)

**Plik:** `src/components/ConnectionsRightPanel.tsx`

**Problem:** Pusty stub (P0-1) nie ma testu, więc regresja „kiedyś był, teraz jest pusty" nie zostanie wykryta w CI.

**Severity:** P2 — implikacja P0-1.

**Sugerowana poprawka:** Rozwiązanie P0-1 + dodanie testu renderowania.

**Owner:** tester (po developer fix P0-1).

---

### P2-11. Hook `useSvgTerminalsPreloader.ts` dispatchuje `setVersion` zamiast zwracać `version` przez referencję

**Plik:** `src/hooks/useSvgTerminalsPreloader.ts:7, 35-37, 47-49`

**Problem:** Hook zwraca `version` (counter) — konsumenci muszą go używać jako dependency w useEffect. Przez to każda zmiana wymusza re-render konsumenta.

Nie jest to klasyczny problem (React convention), ale `setVersion(v => v + 1)` jest tu tylko po to, żeby wymusić re-render — pattern code smell.

**Severity:** P2 — działa, ale można uprościć (np. przez `useSyncExternalStore`).

**Sugerowana poprawka:**
- Rozważyć `useSyncExternalStore(svgTerminalCache.subscribe, svgTerminalCache.getSnapshot)` zamiast ręcznego countera.
- Nie implementować, jeśli działa — niski priorytet.

**Owner:** developer.

---

## P3 — drobne

### P3-1. `useDialogState` deklaruje typy `paletteContextMenu` z `groupTitle: string` — literówka czy deprecated pole?

**Plik:** `src/hooks/useDialogState.ts:22-23`

**Problem:** Typ paletteContextMenu ma pole `groupTitle: string`, ale `usePaletteActions.ts:69-74` (jedyna działająca wersja) ma `label: string; templateId: string; x: number; y: number`. Pole `groupTitle` nigdzie indziej nie występuje.

Prawdopodobnie to pozostałość po wczesnej wersji API, gdzie menu było na poziomie grupy modułów (np. „Złączki" jako grupa). Ale teraz menu kontekstowe jest per-template.

**Severity:** P3 — martwy martwy typ (patrz P0-2).

**Sugerowana poprawka:** Część P0-2.

**Owner:** developer.

---

### P3-2. `App.tsx:91-92` — `useImportedModules` w App.tsx ma `_` prefix na `_handleImportedModuleCategoryChange` w sprawdzeniu

Nie znaleziono. Pominę.

### P3-3. `wireRoutingEngine.test.ts` ma tylko 2 testy dla 315-liniowego pliku

**Plik:** `src/lib/routing/wireRoutingEngine.test.ts` (19 linii, 2 testy)

**Problem:** Testy sprawdzają tylko:
- `getOrthoExit` z `to` — 1 przypadek
- `calculateWirePath` — sprawdza że wynik zawiera `M 100 100` i `L`

To są smoke testy. Nie pokrywają:
- 12 wariantów `startDir` (top, bottom, left, right, auto-horizontal, auto-vertical, isFromTop, isToTop, mousePos, explicitPoints)
- `isDrawing` mode
- Bez punktów vs z punktami
- Opcje `customOffset`, `customOffsetX/Y1/Y2`, `customRadius`
- Wszystkie ścieżki przez `if (startDir)` i `if (endDir)` if-else

**Severity:** P3 — smoke testy w kluczowej funkcji UI (wire routing).

**Sugerowana poprawka:**
- Dodać 10+ testów pokrywających główne gałęzie.
- Wzorzec: tabela z `(startDir, endDir, isDrawing, hasExplicitPoints)` → oczekiwany `axis` ostatniego segmentu.

**Owner:** tester (lub developer, bo to logika).

---

### P3-4. `pdfDocumentation.test.ts` ma 3 testy dla 186-liniowego pliku — ale pokrycie jest OK

**Plik:** `src/lib/pdfDocumentation.test.ts`

**Problem:** Pokrywa 3 funkcje (`getPdfDocumentationTabs`, `getProtocolLabel`) z 3 testami. Pozostałe 4 funkcje (`buildWorkScopeText`, `buildAttachmentText`, `parseChecklistItems`, `parseLineList`, `getSelectedProtocolHeader`, `updateSelectedProtocolHeader`) nie są testowane.

**Severity:** P3 — smoke testy na parserach tekstu.

**Sugerowana poprawka:** Dodać testy dla `parseChecklistItems` (parsuje `[ ]` i `[x]` markery) i `parseLineList` (deduplikacja po case-insensitive lowercase).

**Owner:** tester.

---

### P3-5. `useDinRailPreparedAssets.ts:89-90` — loguje cały assetRequestKey (potencjalnie wrażliwy)

**Plik:** `src/hooks/useDinRailPreparedAssets.ts:89-90`

**Problem:**
```ts
devLog("🔷 [useDinRailPreparedAssets] assetRequestKey changed, reloading assets. symbols count:", symbols.length);
devLog("🔷 [useDinRailPreparedAssets] assetRequestKey:", assetRequestKey);
```

`assetRequestKey` zawiera `serializeParameters(symbol.parameters)` — czyli wszystkie parametry symbolu (np. `CURRENT`, `B10`, `B16`, `ManualPhase`, `BLUE_COVER_VISIBILITY`). To NIE jest sekret, ale dla inżyniera patrzącego w dev console przy projekcie klienta — widać pełną konfigurację.

**Severity:** P3 — niska prywatność (parametry nie są sekretami), ale szum.

**Sugerowana poprawka:** Zredukować do `devLog("[useDinRailPreparedAssets] reload, symbols count:", symbols.length)`.

**Owner:** developer.

---

### P3-6. `AppDialogsLayer.tsx:110-136` — inline JSX dla confirmation dialog zamiast komponentu

**Plik:** `src/components/AppDialogsLayer.tsx:110-136`

**Problem:** Dialog potwierdzenia usunięcia (29 linii) jest inline'owany w `AppDialogsLayer` zamiast być osobnym komponentem jak inne dialogi (Help, RcdManagement, ImportedModules).

**Wpływ:** Minimalny — ale `AppDialogsLayer` mógłby być krótszy.

**Severity:** P3.

**Sugerowana poprawka:** Wyciągnąć do `PaletteRemovalConfirmDialog.tsx`.

**Owner:** developer.

---

### P3-7. `DinRailCanvasViewport.tsx` (20 KB) — duży plik canvas-audit zostawił w spokoju

Plik jest w scope canvas-audytu, więc ten raport go nie tyka. Ale to info dla developera, że canvas-audit C-3 sugeruje, że ten plik też ma mieszane odpowiedzialności.

**Severity:** P3.

**Sugerowana poprawka:** Koordynacja z canvas-audit owner.

**Owner:** canvas-expert.

---

### P3-8. `Console.warn` w `storageService.ts:77, 94` — działa w produkcji

**Plik:** `src/lib/storageService.ts:77, 94`

**Problem:** `console.warn` jest widoczne w produkcji (w przeciwieństwie do `devWarn`). Ale to fallback gdy storage zawiedzie — wtedy USER widzi ostrzeżenie, co jest poprawne.

**Severity:** P3 — technicznie poprawne zachowanie (użytkownik powinien wiedzieć), ale łatwo pomylić z innymi `console.warn` (które są bug).

**Sugerowana poprawka:** Dodać `// WHY: to jest user-facing fallback warning, nie dev diagnostic` komentarz.

**Owner:** developer.

---

### P3-9. Brak `.catch` na `backListener.then` w useDialogState

**Plik:** `src/hooks/useDialogState.ts:79`

**Problem:** `backListener.then((l) => l.remove())` — promise bez catch. Jeśli Capacitor nie zainicjalizuje się lub addListener zwróci odrzucony promise, mamy unhandled rejection.

**Severity:** P3 — minor (Capacitor init jest w main.tsx i rzadko się nie udaje).

**Sugerowana poprawka:** `backListener.then((l) => l.remove()).catch(() => {});`

**Owner:** developer (część P1-5).

---

## Duplikaty i martwy kod — podsumowanie dla developera

| Lokalizacja | Problem | Severity | Owner |
|---|---|---|---|
| `lib/connections/connectionsLogic.ts:47-81, 83-102, 104-146, 148-165` vs `lib/connections/canvasHelpers.ts:27-72, 79-98, 107-149, 156-162` | 4 zduplikowane funkcje | P1 | developer |
| `hooks/useDialogState.ts:22-23, 33-34, 45-46, 53-54, 71-74, 88-89, 100-101, 110-111, 79` | Martwe stany paletteContextMenu/pendingPaletteRemoval o złych typach + closeAllDialogs + unhandled promise | P0 | developer |
| `hooks/useImportedModules.ts:41-42, 144, 175-177` | Martwe stany svgImportDialogOpen/importedModulesManagerOpen | P0 | developer |
| `components/ConnectionsRightPanel.tsx` | Pusty stub ignorujący 5 propsów | P0 | developer |
| `fixtures/demoData.ts` | 127 linii bez konsumenta | P2 | developer |
| `lib/domain/referenceDesignations.ts:95, 101, 104, 109, 113` | 5 devLog w produkcji | P2 | developer |
| `components/CircuitEditPanel.tsx:59, 61, 62-67` | 3 devLog w produkcji | P2 | developer |
| `hooks/useDinRailPreparedAssets.ts:89, 90, 122` | 3 devLog w produkcji | P2 | developer |
| `hooks/useSheetPanelState.ts:80-89, 111, 127` | `openLeftPanelWithTab` martwy (App.tsx inline) | P2 | developer |
| `lib/connections/connectionsLogic.ts:5-15` vs `lib/dinRailCanvas/constants.ts:16-26` | WIRE_COLORS_MAP zduplikowane (2 kopie) | P2 | canvas-audit |
| `components/FeedbackModal.tsx:26` | Hardcoded Web3Forms access key | P1 | developer |
| `types/symbolItem.ts:237-278` | compute-funkcje (logika) w types/ | P1 | developer |
| `App.tsx:73-75` | Importy po deklaracji funkcji | P1 | developer |
| `App.tsx:377, 465` | Duplikacja obliczania projectFileName | P1 | developer |
| `App.tsx:679` | console.error zamiast reportRuntimeError | P2 | developer |
| `AppLeftPanel.tsx:28-29` | `defaultWireSettings?: any` | P2 | developer |
| `AppWorkspaceCanvas.tsx:58` | `defaultWireSettings?: any` | P2 | developer |
| `App.tsx:107-125, 115, 305` | Magic string "dinboard.default_wire_settings" × 2 + inline type | P2 | developer |
| `useSchematicState.ts:11-13, 17-23, 25-40` | `useSchematicState` + `useSchematicViewport` rozproszone podobne stany | — (poza scope) | — |

---

## Testy brakujące dla krytycznych modułów

| Moduł | Rozmiar | Severity | Właściciel |
|---|---|---|---|
| `lib/poleCount.ts` | 113 | P2 | tester |
| `lib/deviceIdentification.ts` | 83 | P2 | tester |
| `lib/runtimeDiagnostics.ts` | 90 | P2 | tester |
| `lib/storageService.ts` | 115 | P2 | tester |
| `hooks/usePaletteActions.ts` | 445 | P2 | tester |
| `hooks/useDialogState.ts` | 127 | P2 (po P0-2) | tester |
| `hooks/useSchematicViewport.ts` | 164 | P2 | tester |
| `hooks/useSchematicInteraction.ts` | 229 | P2 | tester |
| `hooks/useImportedModules.ts` | 184 | P2 | tester |
| `hooks/useDinRailPreparedAssets.ts` | 139 | P3 | tester |
| `components/ProjectPropertiesPage.tsx` | 364 | P3 | tester |
| `components/ValidationPanel.tsx` | 275 | P3 | tester |
| `components/FeedbackModal.tsx` | 109 | P3 (po P1-2) | tester |

---

## Sugerowana kolejność napraw

1. **P0-1** `ConnectionsRightPanel.tsx` — pusty stub. Zapytać usera o oczekiwane zachowanie, potem implementacja + test.
2. **P0-2** `useDialogState` martwe stany — usunąć (wariant A z opisu).
3. **P0-3** `useImportedModules` martwe stany — usunąć.
4. **P1-1** Duplikaty w `connectionsLogic.ts` — zostawić `getFerruleLength` + przenieść resztę do `canvasHelpers.ts`.
5. **P1-2** Web3Forms key do env var.
6. **P1-3** Compute-funkcje z `types/symbolItem.ts` do `lib/domain/`.
7. **P1-5** Guard `Capacitor.isNativePlatform()` w `useDialogState`.
8. **P1-6** Wyciągnąć `getProjectFileName` helper.
9. **P1-7** Uporządkować importy w App.tsx.
10. **P2-3, P2-9** Cleanup devLog + error handling.
11. **P2-1, P2-2, P2-4..P2-7, P2-10, P2-11, P3-x** — maintainability cleanups, w miarę czasu.
12. **P2-8** Nowe testy (po uprzątnięciu martwego kodu).
