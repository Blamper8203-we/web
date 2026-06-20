# Roadmap rozwoju domenowego DINBoard Web
Niniejszy dokument opisuje priorytetowe kierunki rozwoju aplikacji w kolejności
od najbezpieczniejszego do największej wartości biznesowej.
Każdy krok ma cel, zakres i kryteria akceptacji, dzięki czemu kolejne zmiany
pozostaną małe i lokalne.

## Stan na dziś
- Jądro modelu: `metadata` + `symbols`.
- Widoki: `sheet1` rozdzielnica, `sheet2` schemat, `sheet3` lista obwodów, `sheet4` PDF.
- Domena elektryczna i plik projektu są już wyodrębnione, ale część logiki mieszania w komponentach nadal istnieje.
- `App.tsx` pełni rolę głównego orkiestratora, przez co każda nowa funkcjonalność dodatkowo go obciąża.

## Priorytety ogólne
1. Zmniejszyć odpowiedzialność `App.tsx` i innych komponentów shell.
2. Wydzielić kontenery per arkusz, aby logika UI była bliżej widoku.
3. Skonsolidować dane dokumentacyjne, żeby nie powtarzać tego samego layoutu w HTML i PDF.
4. Oczyszczać kodowanie polskich znaków w kolejnych zmianach.
5. Stopniowo podnosić pokrycie testami w obszarach wysokiego ryzyka.

---

## Krok 1: Wydzielić kontenery arkuszy z `App.tsx`
- **Cel:** ograniczyć `App.tsx` do orkiestracji stanu i przekazywania hooków.
- **Zakres:** sekcje layoutowe dla `sheet1`..`sheet4`.
- **Efekt:** kolejne poprawki będą dotyczyć pojedynczych kontenerów, a nie całej aplikacji.

## Krok 2: Ujednolicić mechanizm zapisu/odczytu projektu
- **Cel:** zminimalizować ryzyko utraty danych podczas rozbudowy funkcji I/O.
- **Zakres:** `lib/projectFile.ts` + `hooks/useProjectActions.ts`.
- **Efekt:** wszystkie nowe zmiany będa przechodzić przez ten sam kontrakt.

## Krok 3: Wyodrębnić fragmenty PDF z `lib/export/PdfProtocolDocument.tsx` do mniejszych unitów
- **Cel:** poprawić czytelność i ułatwić zmianę sekcji PDF bez dotykania całego renderera.
- **Zakres:** wydzielić generowanie poszczególnych sekcji PDF jako osobne helpery.
- **Efekt:** niższe ryzyko regresji w eksporcie dokumentacji.

## Krok 4: Dodać więcej testów w obszarach wysokiego ryzyka
- **Cel:** zabezpieczyć najważniejsze reguły elektryczne i schematyczne.
- **Zakres:** walidacja, snapowanie, selekcja, histoia zmian, formaty PDF.
- **Efekt:** zmiany będą zwracane szybciej na błąd i będą łatwiejsze do wdrożenia.

## Krok 5: Spójnić encoding i normalizację polskich znaków
- **Cel:** wyeliminować źródła błędów w porównaniach tekstowych.
- **Zakres:** unifikację użycia `normalizeSymbolIdentityText` i podobnych helperów.
- **Efekt:** zmniejszenie ryzyka błędnego dopasowania nazw, oznaczeń i filtrów.

---

## Kryteria powodzenia roadmapy
- Każdy krok zakończony testami i min. jedną kontrolą jakości.
- Brak zmian w regułach elektrycznych bez poprzedniego opisu ryzyka.
- Brak utraty zgodności wstecznej pliku `.dinboard`.
- Każdy element roadmapy opcjonalnie przenoszony do osobnego pliku `plans/<krok>.md`, jeśli szczegóły się rozrosną.
