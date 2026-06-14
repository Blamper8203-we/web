# AGENTS.md

## Projekt
DINBoard Web / Tauri

## Zrodlo zasad
Ten plik przenosi zasady pracy ze starego projektu Avalonia:
`C:\Users\blamp\Desktop\Avalonia`.

Najwazniejsze dokumenty zrodlowe:
- `AGENTS.md`
- `AI_CONTEXT.md`
- `ARCHITECTURE_MAP.md`
- `CODE_QUALITY.md`
- `DOMAIN_RULES.md`
- `PREVENTING_CODE_MESS.md`
- `.cursorrules`

## Czym jest projekt
DINBoard to aplikacja inzynierska dla elektrykow. Nie jest to demo ani
zwykla aplikacja wizualna. Zmiany moga wplywac na realne decyzje projektowe:
rozdzielnice, obwody, RCD/MCB, bilans faz, walidacje, zapis projektu i PDF.

## Stos technologiczny nowego projektu
- TypeScript
- React
- Vite
- Tauri
- Pixi.js / DOM SVG dla widokow graficznych
- Vitest

## Cel pracy agenta
Agent ma rozwijac istniejaca aplikacje produkcyjna z naciskiem na:
1. poprawnosc
2. stabilnosc
3. bezpieczenstwo zmian
4. utrzymanie architektury
5. czytelnosc kodu
6. wydajnosc
7. jakosc eksportu i zapisu danych

## Glowna zasada
Preferuj najmniejsza bezpieczna zmiane, ktora rozwiazuje problem bez
przypadkowej zmiany zachowania aplikacji.

Nie poprawiaj "przy okazji" niezaleznch subsystemow.

## Zanim zrobisz nietrywialna zmiane
1. Ustal, ktorego subsystemu dotyczy zadanie.
2. Sprawdz, czy subsystem jest krytyczny.
3. Przeczytaj lokalne typy, helpery i testy dotyczace zmiany.
4. Zastosuj najmniejszy bezpieczny zakres.
5. Nie zmieniaj logiki domenowej bez wyraznej prosby.
6. Uruchom testy odpowiednie dla dotknietego obszaru.

## Obszary wysokiego ryzyka

### Logika elektryczna i domenowa
Traktuj jako krytyczne:
- `src/lib/phaseDistribution/**`
- `src/lib/validation/**`
- `src/lib/circuitRows.ts`
- `src/lib/circuitEdit/**`
- `src/lib/projectMetadata.ts`
- `src/types/symbolItem.ts`
- `src/types/circuitRow.ts`

Nie wolno po cichu zmieniac:
- bilansowania faz
- sumowania obciazen
- progow i wynikow walidacji
- relacji RCD -> MCB/RCBO
- interpretacji faz L1/L2/L3
- danych trafiajacych do zestawien i PDF

Jesli aktualne zachowanie wydaje sie bledne, najpierw opisz:
- obecne zachowanie
- dlaczego jest ryzykowne lub bledne
- wplyw poprawki na wyniki
- testy, ktore to zabezpieczaja

### Szyna DIN, canvas, schemat, interakcje
Traktuj jako krytyczne:
- `src/components/DinRailCanvasPixi.tsx`
- `src/lib/dinRailSelection.ts`
- `src/lib/dinRailSnap.ts`
- `src/lib/schematic/**`
- `src/lib/export/dinRailSnapshotService.ts`

Przy zmianach w tym obszarze pilnuj:
- wydajnosci przy duzej liczbie modulow
- jakosci SVG przy malym i duzym zoomie
- braku migotania
- pointer events
- drag and drop
- snappingu
- zaznaczania grup
- zgodnosci widoku z eksportem/snapshotem

Nie mieszaj geometrii logicznej z dekoracja wizualna. Przyklad: bounding box
grupy powinien pozostac danymi logicznymi, a pozycja ozdobnej klamry powinna
byc liczona osobno w rendererze albo miec osobne pole.

### Import SVG i assety modulow
Traktuj jako krytyczne:
- `src/lib/modules/importedModuleCatalog.ts`
- `src/lib/modules/svgAsset.ts`
- `src/lib/modules/svgNormalization.ts`
- `src/lib/modules/rasterPreview.ts`
- `src/components/SvgImportDialog.tsx`
- `src/components/ModuleAssetPreview.tsx`
- `public/assets/modules/**`

Zasady:
- nie pogarszaj jakosci oryginalnego SVG
- nie dodawaj stylow zmieniajacych kreski/wypelnienia bez wyraznej potrzeby
- waliduj importowane SVG
- zachowuj bezpieczenstwo `dangerouslySetInnerHTML`
- cache'uj kosztowne przetwarzanie, ale nie kosztem jakosci obrazu

### Zapis, odczyt, migracje projektu
Traktuj jako krytyczne:
- `src/lib/projectFile.ts`
- `src/hooks/useProjectActions.ts`
- `src/hooks/useSymbolHistory.ts`
- `src-tauri/**`

Nie wolno po cichu:
- zmieniac kontraktu pliku projektu
- psuc zgodnosci wstecznej
- usuwac danych bez migracji
- zmieniac semantyki pol modelu

Kazda zmiana formatu danych wymaga jasnego opisu i testu round-trip albo
innego sprawdzenia zapisu/odczytu.

### Eksport PDF i dokumentacja wynikowa
Traktuj jako krytyczne:
- `src/lib/export/**`
- `src/components/PdfDocumentationPage.tsx`
- `src/components/PdfPreviewWorkspace.tsx`
- `src/lib/measurementProtocols.ts`

Eksport PDF jest czescia wyniku inzynierskiego. Nie zmieniaj po cichu:
- danych wejsciowych raportu
- kolejnosci informacji o znaczeniu technicznym
- sekcji dokumentacji
- zgodnosci miedzy UI a PDF

## Granice architektury w projekcie webowym
Odpowiednik zasad MVVM ze starego Avalonia:

- `components`: UI, layout, kontrolki i zachowanie wizualne.
- `hooks`: orkiestracja stanu UI i przeplywow uzytkownika.
- `lib`: logika domenowa, obliczenia, walidacja, eksport, import, parsery.
- `types`: kontrakty danych i modele.
- `src-tauri`: integracja desktopowa/systemowa.

Nie przenos logiki domenowej do komponentow React ani CSS.
Komponenty moga skladac UI, ale obliczenia, walidacja, eksport i transformacje
danych powinny byc w `lib` lub w wyspecjalizowanych hookach.

## Zasady wydajnosci
- Nie wykonuj ciezkiego parsowania SVG w renderze React.
- Nie wykonuj kosztownych obliczen na kazdym pointer move, wheel albo drag.
- Cache'uj wyniki zalezne od stabilnych kluczy.
- Przy pan/zoom pilnuj plynnosci, ale nie rasteryzuj SVG w sposob psujacy jakosc.
- Unikaj niepotrzebnego przebudowywania duzych warstw DOM.
- Dla wypelnionej szyny DIN testuj zachowanie na duzej liczbie modulow.

## Zasady refaktoryzacji
Wolno:
- wyodrebniac male helpery
- poprawiac nazwy
- rozdzielac odpowiedzialnosci
- dodawac testy charakterystyki przed zmiana ryzykownej logiki
- usuwac martwy kod, jesli jest pewnosc, ze nie jest uzywany

Nie wolno bez wyraznej potrzeby:
- przepisywac duzych dzialajacych fragmentow
- mieszac refaktoru z nowa funkcja
- zmieniac wielu subsystemow naraz
- dodawac nowych frameworkow lub zaleznosci
- "ulepszac" algorytmow domenowych bez celu inzynierskiego

## Zasady testow
Uruchamiaj testy adekwatne do zmiany:

```powershell
npm.cmd run build
npm.cmd run test
```

Dla zmian lokalnych preferuj najpierw test celowany, potem caly zestaw:

```powershell
npm.cmd run test -- src/lib/dinRailSelection.test.ts
```

Dodawaj testy dla:
- nowej logiki domenowej
- zmian w walidacji
- zmian w grupowaniu RCD/MCB
- zmian w zapisie/odczycie
- zmian w parserach/importerach
- zmian w algorytmach layoutu/snapowania

## Review przed zakonczeniem pracy
Przed uznaniem zadania za gotowe sprawdz:
- czy zmiana miesci sie w zamierzonym subsystemie
- czy nie ma przypadkowych zmian domenowych
- czy UI i eksport dalej uzywaja tej samej semantyki danych
- czy build przechodzi
- czy odpowiednie testy przechodza
- czy opisales ryzyko, jesli dotknieto obszaru krytycznego

## Preferowany styl odpowiedzi przy zadaniach nietrywialnych
Odpowiadaj konkretnie:
1. Problem
2. Przyczyna
3. Bezpieczna poprawka
4. Co zmieniono
5. Co przetestowano

## Najwazniejsze zakazy
- Nie zmieniaj po cichu logiki elektrycznej.
- Nie psuj relacji RCD -> MCB/RCBO.
- Nie psuj zapisu/odczytu projektu.
- Nie psuj undo/historii zmian.
- Nie psuj eksportu PDF.
- Nie pogarszaj jakosci SVG modulow.
- Nie wprowadzaj migotania ani regresji wydajnosci canvas.
- Nie rob szerokich refaktorow przy okazji malej poprawki.

## Znane ograniczenia narzedziowe

### `@emnapi/wasi-threads` orphan w lockfile

`package-lock.json` zawiera historyczny wpis `node_modules/@emnapi/wasi-threads@1.2.2`
bedacy pozostaloscia z poprzedniej wersji lockfile (commit 7d715da). Zadna
obecna paczka nie deklaruje `@emnapi/wasi-threads` jako bezposredniej
zaleznosci - jest to staly `optional` dep `@rolldown/binding-wasm32-wasi`,
ale w nowszej wersji `@rolldown` uzywa `@emnapi/wasi-threads@1.2.1` w
nested `node_modules/@rolldown/binding-wasm32-wasi/node_modules/...`.

`npm install` (z aktywnym instalowaniem) **zaciagnie ten wpis z powrotem**
nawet po recznym usunieciu z `node_modules`, bo czyta istniejacy wpis
z lockfile i uznaje go za wymagany. `npm ci` i `npm install
--package-lock-only` go nie zaciagaja.

Praktyczna regula:
- Po `npm install` orphan prawdopodobnie wroci
- Po `npm ci` orphan NIE powinien wrocic (czysta instalacja z lockfile)
- Po `npm install --package-lock-only` orphan NIE wroci

Nie jest to krytyczne - 220 KB paczki z 0 aktywnym uzyciem. Jesli chcesz
trwale usunac: usun wpis z `package-lock.json` recznie (linie 2009-2019)
i uzywaj `npm ci` zamiast `npm install` do reinstalacji.

