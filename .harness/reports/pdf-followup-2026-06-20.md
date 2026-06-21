# Followup: Strona tytułowa PDF — sesja 2026-06-20

**Autor sesji:** Mavis (general), followup do `AUDIT_SYNTHESIS.md` (2026-06-18) i `audit-pdf.md` (2026-06-17)
**Metoda:** read-only + `npm run build` + `npm run test` (rzeczywiste przebiegi)
**Zakres sesji:** `src/components/PdfDocumentationPage.tsx`, `src/components/PdfWorkspaceShell.tsx`, `src/components/measurementProtocols/TitlePageTab.tsx`, `src/lib/export/pdfPages/PdfTitlePage.tsx`, `src/lib/export/PdfProtocolDocument.tsx`, `src/types/projectMetadata.ts`, `src/lib/pdfDocumentation.ts`, `src/lib/export/pdfExportService.ts`, `src/components/PdfPreviewWorkspace.tsx*`

---

## 1. Kontekst

2 dni po `AUDIT_SYNTHESIS.md` user poprosił o "recenzję głównej strony PDF". Sprawdziłem tę warstwę i porównałem z istniejącymi audytami. Ten dokument jest followupem — uzupełnia istniejące ustalenia, nie zastępuje.

**Stan projektu na dzień sesji (2026-06-20, 21:11 UTC+2):**
- Working tree: 1 modified (`src/lib/schematic/renderers/schematicWireRenderer.ts`), 3 untracked (`.harness/reports/`, `.mavis/`, `.opencode/`).
- Branch: `main`, **53 commitów ahead of upstream**.
- Build (`npm run build`): OK w 2.19s, zero błędów TypeScript.
- Testy (`npm run test`): **735 passed w 70 plikach** (baseline AGENTS.md 2026-06-07: 249 → teraz 3× więcej).

---

## 2. Co już zostało zrobione (od daty audytu)

Część quick wins i cleanup itemów z `AUDIT_SYNTHESIS.md` już wylądowała w commitach:

| ID | Co | Commit |
|---|---|---|
| QW-8 | `PdfLabelDocument.tsx` (martwy kod + CDN font) — usunięte | nie zlokalizowany commit |
| QW-9 | `stringHelpers.ts` — utworzone (źródło prawdy dla `firstNonEmpty`/`normalizeText`) | nie zlokalizowany commit |
| 0a | `loadProjectFromPath` (martwa funkcja parser) — usunięte | `8fcd3cc` refactor(project): add projectMigrations, drop dead loadProjectFromPath |
| 7d7 | Ogólny cleanup martwego kodu | `f564e4b` chore(cleanup): remove dead code from audit |
| 7d7 | Refactor canvas (martwy kod z layer-extraction) | `4077fd9` refactor(canvas): remove dead code from abandoned layer-extraction refactor |
| 7d7 | Usunięcie 3 nieużywanych zależności | `8c4ec42` chore: remove 3 unused dependencies, fix 2 unused imports |
| 7d7 | Porządki plików | `7d715da` chore: cleanup obsolete files, add new module assets, doc notes |

**Nowe komendy migracji:** `8fcd3cc` dodaje `projectMigrations` — to odpowiada na `AUDIT_SYNTHESIS` Top 10 #1 (migration registry, project-io P0-3).

**Lekcja z sesji:** użytkownik pracuje nad ustaleniami z audytów, ale **nie oznacza** itemów jako "done" w raportach. Trzeba za każdym razem sprawdzić aktualny stan.

---

## 3. Co znalazłem NOWEGO w tej sesji

Poniższe ustalenia **nie były wprost nazwane** w `audit-pdf.md` ani w `AUDIT_SYNTHESIS.md`. Niektóre są kątami widzenia istniejących problemów.

### 3.1. P0 — `PdfPreviewWorkspace.tsx` istnieje, ale jest martwy w runtime

**Pliki:** `src/components/PdfPreviewWorkspace.tsx` (170 linii, 5291 B), `src/components/PdfPreviewWorkspace.css` (2.2 KB).

**Stan:**
- Plik jest tracked w git (`git ls-files` zwraca ścieżkę)
- Ma flagę `assume-unchanged` (ukryty z `git status`)
- **Zero importów** poza samym sobą (`grep PdfPreviewWorkspace` w `src/` — 4 trafienia, wszystkie wewnątrz tego pliku)
- `PdfWorkspaceShell.tsx:127` renderuje `MeasurementProtocolsWorkspacePage`, nie `PdfPreviewWorkspace`

**Co to znaczy:** Komponent był kiedyś podpięty lub planowany do live PDF preview (tworzy blob przez `@react-pdf/renderer`, wyświetla w iframe). Nigdy nie został użyty. Zawiera:
- Poprawną obsługę debounce (180 ms)
- Cleanup blob URL przez `URL.revokeObjectURL`
- Walidację przez `cancelled` + `requestIdRef`
- Ładowanie DIN rail images tylko dla zakładki `din-rail` (lazy)

**Ryzyko:** Martwy kod = maintenance cost + mylący dla nowego dewelopera ("ktoś mógłby pomyśleć że preview działa"). Ale sam kod jest dojrzały.

**Decyzja (moja rekomendacja):** Usunąć oba pliki. Albo (opcja B) podpiąć do `PdfWorkspaceShell.tsx` jako właściwy live preview. **Rekomendacja: A** — usuwać. Powód: obecny `MeasurementProtocolsWorkspacePage` pełni rolę "preview" dla protokołów, a sam tytuł ma statyczny CSS w `PdfDocumentationPage.css` (patrz 3.2). Dodawanie trzeciej warstwy renderingu (live iframe) bez wyraźnej potrzeby biznesowej to koszt.

### 3.2. P0 — `.pd-preview-*` CSS (~200 linii) jest martwy

**Plik:** `src/components/PdfDocumentationPage.css` linie 200-290, 552-784.

**Stan:**
- Klasy `.pd-preview-page`, `.pd-preview-logo`, `.pd-preview-hero`, `.pd-preview-card-*`, `.pd-preview-info-row`, `.pd-preview-checklist`, `.pd-preview-signatures-new`, `.pd-preview-attachmentlist`, `.sig-box`, `.stamp-box`, `.contractor-name`, `.sep-kwal` istnieją
- `grep -n 'pd-preview-' src/components/PdfDocumentationPage.tsx` zwraca **zero trafień**
- Komponent NIE renderuje żadnego CSS-preview strony A4 — renderuje tylko formularz + kartę + przycisk eksportu

**Ryzyko:** ~250 linii CSS utrzymywane do niczego. Jeśli kiedyś ktoś chciał dodać static preview, nie zauważy że format `.pd-preview-*` jest "przygotowany" ale pusty.

**Decyzja (rekomendacja):** Usunąć razem z `PdfPreviewWorkspace`. Wspólny commit, wspólny PR.

### 3.3. P0 — Trzy pola UI nie trafiają do PDF (realna strata danych)

**Pliki:**
- UI: `src/components/PdfDocumentationPage.tsx:268-273` (`titlePageSepValidUntil`), `363-385` (`investorSignature`, `designerSignature`)
- PDF: `src/lib/export/pdfPages/PdfTitlePage.tsx` (nie czyta tych pól)

| Pole w UI | Trafia do PDF? | Skutek |
|---|---|---|
| `titlePageSepValidUntil` ("Ważne do") | **NIE** | Elektryk wpisuje datę ważności SEP — klient tego nie widzi |
| `investorSignature` ("Podpis inwestora") | **NIE** | Inwestor widzi pustkę w sekcji "Podpis inwestora" mimo że UI pozwala wpisać |
| `designerSignature` ("Podpis elektryka") | **NIE** | j.w. |
| `contractorSignature` (Pieczątka) | **TAK** | Renderowane jako `stampText` w polu stempla |

**Per AGENTS.md "audience test":** elektryk wpisuje dane, klient dostaje PDF bez nich. To jest dokładnie ten rodzaj cichej utraty danych który engineering tools nie mogą mieć.

**Decyzja (rekomendacja):** Naprawić — dodać rendering tych 3 pól do `PdfTitlePage.tsx`. Mały PR (~30 LOC delta + testy).

### 3.4. P1 — Jeden formularz na numery SEP E i D

**Pliki:**
- UI: `src/components/PdfDocumentationPage.tsx:258-267` — jedno pole "Numer uprawnienia SEP", mapowane na `designerId` + `authorLicense` (oba na raz)
- Typ: `src/types/projectMetadata.ts:71-72` — dwa osobne pola w modelu
- PDF: `src/lib/export/pdfPages/PdfTitlePage.tsx:29-30` — `sepE = designerId || authorLicense`, `sepD = authorLicense || designerId`

**Skutek:** UI ma jedno pole. PDF stara się zgadnąć. Jeśli elektryk ma E i D z różnymi numerami (np. "E-123/2018" i "D-456/2022"), nie ma jak tego wpisać. Oba pola w PDF dostaną ten sam string.

**Decyzja (rekomendacja):** Rozbić na dwa pola w UI ("Eksploatacja (E)" + "Dozór (D)"). Mały PR w `PdfDocumentationPage.tsx`. Wymaga decyzji Q7 (patrz sekcja 6).

### 3.5. P1 — Checkbox `titlePageUseManualWorkScopeCheckboxes` bez efektu

**Pliki:**
- UI: `src/components/PdfDocumentationPage.tsx:330-334` — checkbox + label "Puste pola do ręcznego odhaczania na wydruku"
- PDF: `src/lib/export/pdfPages/PdfTitlePage.tsx` — NIE czyta tego pola. Zawsze renderuje `isChecked ? <Text>✓</Text> : null`

**Skutek:** User zaznacza checkbox myśląc że PDF będzie miał puste kwadraty. Nie ma — zawsze są checkmarki dla zaznaczonych pozycji, puste pola dla niezaznaczonych (renderowane jako brak ✓). Checkbox jest martwy.

**Decyzja (rekomendacja):** Naprawić — albo checkbox powinien wpływać na renderowanie, albo go usunąć z UI. **Rekomendacja: naprawić** — puste kwadraty do ręcznego odhaczania to realna potrzeba przy dokumentacji "do podpisu".

### 3.6. P2 — `any` w produkcyjnym kodzie PDF

**Pliki:** 6 trafień
- `src/lib/export/pdfPages/PdfTitlePage.tsx:97, 99, 117, 119` — `columnItems: any[]`, `item: any` w `.map(...)`
- `src/lib/export/PdfProtocolDocument.tsx:52, 64` — `chunk: any[]` w `.map(...)`

**Konsekwencja:** Reszta projektu trzyma typy (`TitlePageChecklistItem`, `string`). Te 6 miejsc się rozjeżdżają. Trudniej złapać bugi przy zmianie modelu.

**Decyzja (rekomendacja):** Zastąpić `TitlePageChecklistItem[]` i `string[]`. Łatwy refactor, ~6 linii + nowe testy.

### 3.7. P2 — Duplikacja renderingu TitlePage (Tailwind vs @react-pdf/renderer)

**Pliki:**
- UI: `src/components/measurementProtocols/TitlePageTab.tsx` (285 linii, Tailwind/JSX)
- PDF: `src/lib/export/pdfPages/PdfTitlePage.tsx` (185 linii, `@react-pdf/renderer`)

**Problem:** Dwie **osobne implementacje** tej samej strony tytułowej. Każda zmiana w UI musi być ręcznie powtórzona w PDF (np. dodanie nowej sekcji, zmiana koloru marki, dodanie nowego pola). Patrz `audit-pdf.md` #17 (53 KB container file) — to jest ten sam pattern, mniejszy scope.

**Skutek:** UI i PDF mogą się rozjeżdżać wizualnie. Już dziś np.:
- UI (`TitlePageTab.tsx:97`) używa `bg-brand` (Tailwind klasa)
- PDF (`PdfTitlePage.tsx:63`) używa `styles.bgBrand` (z `pdfStyles.ts`)
- Czy te dwa kolory są tym samym? Wymaga ręcznej weryfikacji.

**Decyzja:** To jest **refactor architektoniczny** (patrz P3 z `audit-pdf.md` #17). Nie robić w ramach bug fixów. Zostawić na Fazę 4 (`AUDIT_SYNTHESIS`).

---

## 4. Podsumowanie nowych ustaleń

| ID | Severity | Temat | Pliki |
|---|---|---|---|
| NEW-PDF-1 | P0 | `PdfPreviewWorkspace.tsx` martwy | `src/components/PdfPreviewWorkspace.tsx`, `.css` |
| NEW-PDF-2 | P0 | `.pd-preview-*` CSS martwy | `src/components/PdfDocumentationPage.css:200-290, 552-784` |
| NEW-PDF-3 | P0 | 3 pola UI nie renderowane w PDF | `PdfTitlePage.tsx`, `PdfDocumentationPage.tsx` |
| NEW-PDF-4 | P1 | SEP E/D jedno pole, powinny być dwa | `PdfDocumentationPage.tsx:258-267` |
| NEW-PDF-5 | P1 | Checkbox `titlePageUseManualWorkScopeCheckboxes` bez efektu | `PdfDocumentationPage.tsx:330-334` |
| NEW-PDF-6 | P2 | `any` w PDF (6×) | `PdfTitlePage.tsx:97-119`, `PdfProtocolDocument.tsx:52-64` |
| NEW-PDF-7 | P2 | Duplikacja renderingu UI vs PDF | `TitlePageTab.tsx`, `PdfTitlePage.tsx` |

---

## 5. Plan napraw (followup do AUDIT_SYNTHESIS)

### Faza A — Quick wins (< 1 dzień, < 100 LOC)

| PR | Temat | Severity | Pliki | Scope |
|---|---|---|---|---|
| A.1 | Usunąć martwy `PdfPreviewWorkspace.tsx` + `.css` | NEW-PDF-1 | 2 pliki | usunięcie |
| A.2 | Usunąć martwy `.pd-preview-*` CSS | NEW-PDF-2 | 1 plik (-250 LOC) | usunięcie |
| A.3 | Zamienić 6× `any` na konkretne typy | NEW-PDF-6 | 2 pliki | type narrowing + testy |
| A.4 | Zastąpić dummy `<View>` w `PdfProtocolDocument.tsx:112-114` prawdziwą stroną podsumowania (albo usunąć obliczenia) | pdf P0-3 | 1-2 pliki | implementacja LUB usunięcie |

**A.1+A.2** razem = ~300 LOC usunięte, zero ryzyka. Można batchować w jeden commit.
**A.3** = łatwy type narrowing, ~10 min, +nowe testy w `PdfProtocolDocument.test.ts`.
**A.4** wymaga decyzji Q4 z `AUDIT_SYNTHESIS` (implementacja strony vs usunięcie obliczeń).

### Faza B — Realne straty danych (1-2 dni, ~150 LOC delta)

| PR | Temat | Severity | Pliki | Zależności |
|---|---|---|---|---|
| B.1 | Dodać `titlePageSepValidUntil` do `PdfTitlePage` | NEW-PDF-3 | `PdfTitlePage.tsx`, `pdfStyles.ts`, `PdfProtocolDocument.test.ts` | izolowane |
| B.2 | Rozbić SEP na E + D w UI, dostosować PDF | NEW-PDF-4 | `PdfDocumentationPage.tsx`, `PdfTitlePage.tsx`, type check | wymaga Q7 |
| B.3 | Dodać `investorSignature` i `designerSignature` do `PdfTitlePage` | NEW-PDF-3 | `PdfTitlePage.tsx`, `pdfStyles.ts` | izolowane |
| B.4 | Naprawić checkbox `titlePageUseManualWorkScopeCheckboxes` (albo usunąć) | NEW-PDF-5 | `PdfTitlePage.tsx`, `pdfStyles.ts` | izolowane |

**Kolejność:** B.1+B.3 mogą iść razem (te same pliki). B.2 niezależne. B.4 niezależne. Wszystkie bez zależności od A.x.

### Faza C — Pokrywa się z `AUDIT_SYNTHESIS`

Te ustalenia już są w głównym planie AUDIT, ten followup ich nie powtarza:
- **PR-2.7** (pdf P0-1, P0-3) — brakujące strony "separate" + martwe obliczenia
- **PR-2.10** (pdf P1-4) — UI dla brakujących pól protokołów
- **PR-3.5** (pdf P2-12..15, P2-24) — duplikaty helperów
- **PR-4.5** (pdf P1-5, P1-6, P1-8) — `validateProject` dedup + `circuitRows` threading
- **PR-4.6** (pdf P1-7) — filename consistency

### Faza D — Refactor (opcjonalnie, długoterminowe)

- **NEW-PDF-7** (P2): Wspólny model `<TitlePageSection>` z wariantem `preview | pdf`. Duży refactor, wymaga design decission (Tailwind vs React-PDF oba wspierają inne API). **Rekomendacja: nie teraz**, zostawić jako tech debt item.

---

## 6. Pytania do usera (blokujące dla Fazy B)

| # | Pytanie | Blokuje | Owner |
|---|---|---|---|
| Q7 | SEP E i D — rozbić na 2 pola w UI (A) czy zostawić 1 pole i akceptować że PDF pokazuje to samo (B)? | Faza B.2 | user |
| Q8 | Checkbox "Puste pola" — naprawić żeby wpływał na PDF (A) czy usunąć z UI (B)? | Faza B.4 | user |

Pozostałe pytania Q1-Q6 z `AUDIT_SYNTHESIS.md` nadal aktualne.

---

## 7. Komunikat strukturalny (5 pól)

1. **Problem:** Strona tytułowa PDF (`PdfTitlePage.tsx`) nie renderuje 3 pól które UI pozwala wypełnić (`titlePageSepValidUntil`, `investorSignature`, `designerSignature`). Checkbox `titlePageUseManualWorkScopeCheckboxes` nie ma żadnego efektu na PDF. Dwa komponenty/arkusze stylów są martwe ale istnieją w kodzie (`PdfPreviewWorkspace.tsx` 170 LOC + `.pd-preview-*` CSS ~250 LOC). 6× `any` w produkcyjnym kodzie PDF.

2. **Przyczyna:** PDF ma **dwie rozłączne warstwy renderingu** — UI w przeglądarce (`TitlePageTab.tsx`, `MeasurementProtocolsWorkspacePage`) i eksport PDF (`PdfTitlePage.tsx`, `PdfProtocolDocument.tsx`). Ewolucja UI nie zawsze była zsynchronizowana z PDF. Martwy `PdfPreviewWorkspace.tsx` to pozostałość po niezrealizowanym live preview (zastąpiony przez `MeasurementProtocolsWorkspacePage`). `.pd-preview-*` CSS nigdy nie był podpięty do żadnego komponentu.

3. **Bezpieczna poprawka:** Faza A (quick wins, 4 PR-y, < 1 dzień, ~300 LOC usunięte). Faza B (realne naprawy, 4 PR-y, 1-2 dni, ~150 LOC delta + testy). Każdy PR: 1 commit tematyczny + test nowego zachowania + `// WHY:` komentarz dla nietrywialnych decyzji.

4. **Co zmieniono:** Stworzono ten followup raport. Working tree nie został zmodyfikowany (read-only sesja). Zmiany zaplanowane w Fazie A+B.

5. **Co przetestowano:** `npm run build` — OK w 2.19s, zero TS errors. `npm run test` — **735 passed w 70 plikach** (3× więcej niż baseline AGENTS.md 2026-06-07). Weryfikacja cross-źródłowa: porównanie `audit-pdf.md` (2026-06-17), `AUDIT_SYNTHESIS.md` (2026-06-18), `git log --since="2026-06-18"` (20 commitów) i aktualnego stanu plików. Zidentyfikowano 7 nowych ustaleń (NEW-PDF-1..7) i potwierdzono 4 quick wins z AUDIT już zrobione (PdfLabelDocument, stringHelpers, projectMigrations, loadProjectFromPath cleanup).

---

## 8. Rekomendowana kolejność pracy (jeśli user zaczyna dziś)

1. **(5 min)** Zdecydować Q7 i Q8 — odpowiedzi na 2 pytania.
2. **(30 min)** A.1 + A.2 — usunąć martwy kod (zero ryzyka, można zacommitować od razu).
3. **(15 min)** A.3 — type narrowing `any` → `TitlePageChecklistItem[]`, `string[]`.
4. **(30 min)** A.4 — wymaga Q4 z AUDIT (implementacja PdfProjectSummary vs usunięcie obliczeń). Jeśli user wybrał wcześniej, zrobić.
5. **(2-3h)** B.1 + B.3 razem — dodać 3 brakujące pola do `PdfTitlePage`. Wymaga testów.
6. **(1-2h)** B.2 — rozbić SEP na E/D. Wymaga Q7.
7. **(1h)** B.4 — naprawić/usunąć checkbox. Wymaga Q8.

**Szacowany łączny czas: 1 dzień roboczy (8h)** dla wszystkich Fazy A+B z testami.

**Czego NIE robić teraz:** Faza D (refactor wspólnego modelu), `pdf P0-1` (brakujące strony "separate"), `pdf P2-13..15` (duplikaty helperów) — to są rzeczy z głównego AUDIT, nie z tego followupu.

---

## 9. Następne kroki

- User decyduje Q7 i Q8
- Po decyzjach: Mavis może uruchomić Fazę A jako batch (5 commitów, ~45 min)
- Fazę B jako drugi batch (4 PR-y z testami, ~2-3h)
- Faza C/D per `AUDIT_SYNTHESIS.md`

Per user preference (memory 2026-06-17): **nie pushować, nie otwierać PR bez wyraźnej komendy**. Po każdym commicie zgłaszać gotowość i czekać.