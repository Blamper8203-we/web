# DINBoard Web Migration Plan

## Cel

Projekt w `F:\stare pliki\Nowy projekt` jest czystą aplikacją webową React + Vite.
Oryginalne repozytorium Avalonia w `C:\Users\blamp\Desktop\Avalonia` traktujemy jako źródło logiki, widoków i reguł domenowych do stopniowej migracji.

## Etap 1 - Web shell

- [x] bootstrap React + TypeScript + Vite
- [x] usunięcie zależności Tauri z webowego buildu
- [x] ustawienie shell UI w stylu DINBoard
- [x] dopasowanie głównego układu 280 / workspace / 320, paska arkuszy i paneli bocznych do `MainWindow.axaml`
- [x] dopasowanie toolbaru, flyoutów, ikon i prawego panelu w kierunku `MainWindow.axaml` / `MainRightPanelView.axaml`
- [x] dopasowanie lewego panelu: paleta modułów, panel projektu i panel dokumentacji do widoków Avalonia
- [x] przeniesienie wszystkich wbudowanych modułów z `Assets/Modules` do webowego `public/assets/modules`
- [x] katalog palety modułów zgodny z folderami Avalonia, z podglądem SVG i parametrami domyślnymi
- [x] dopasowanie paska statusu do `MainStatusBarView.axaml`: ikony, metryki, status pliku i zoom
- [x] przygotowanie miejsc pod projekt, obwody, rozdzielnice, dokumentację
- [x] tryb `dev:host` do testów na urządzeniach mobilnych

## Etap 2 - Dane i pliki projektu

- [x] kontrakty TypeScript dla projektu i obwodów
- [x] localStorage dla stanu roboczego
- [x] import danych testowych
- [x] otwieranie `.dinboard/.json` przez przeglądarkę
- [x] zapis jako pobierany plik `.dinboard`
- [x] migracja starych kluczy `dinboard-tauri.*` do nowych `dinboard-web.*`

## Etap 3 - Widoki o niskim ryzyku

- [x] właściwości projektu
- [x] lista obwodów
- [x] panele dokumentacji
- [x] protokoły pomiarowe

## Etap 4 - Subsystemy wysokiego ryzyka

- [x] canvas i rozmieszczanie elementów
  - [x] geometria A4, paginacja pionowa, symbole i tabela schematu jednokreskowego wg Avalonii
  - [x] inline edit komórek tabeli schematu z undo/redo wg `SchematicCellEditController`
  - [x] skróty edycji `Delete` i `Ctrl+D` dla zaznaczonego elementu
  - [x] multi-select przez Ctrl/Cmd+klik, grupowe przesuwanie, usuwanie i duplikacja
  - [x] ikonowe kontrolki zoomu i dolne metryki canvasów w stylu Avalonia
  - [x] generator szyny DIN wywoływany z paska narzędzi albo pustego canvasu, z dialogiem jak w Avalonia
  - [x] renderowanie rzeczywistych SVG modułów na szynie DIN, drag and drop na szynie oraz snap poziomy/pionowy wzorowany na `SchematicSnapService`
  - [x] zgodność z regułami Avalonia dla kategorii `Listwy` / `Złącza`: bez snapu do szyny DIN
- [x] podstawowa obsługa dotyku na canvasach
- [x] undo/redo
- [x] bilansowanie faz
- [x] walidacja elektryczna
- [x] podstawowy eksport PDF przez drukowanie przeglądarki
- [x] panel edycji zaznaczonego modułu/obwodu z Avalonia `CircuitEditPanelView`
- [x] panel zarządzania parametrami RCD z prawego panelu konfiguracji
- [x] eksport BOM (CSV) oraz eksport PNG z poziomu menu Plik
- [x] pełny eksport PDF zgodny z usługami Avalonia

## Etap 5 - Strona i publikacja web

- [x] docelowy routing strony/aplikacji
- [x] landing lub publiczna strona informacyjna
- [x] konfiguracja hostingu
- [x] testy na mobile/tablet/desktop

## Etap 6 - Desktop później

- [x] decyzja o wrapperze desktopowym

## Ustalenia zakresu web

- Nie wdrażamy kalkulatora indukcji z panelu edycji w obecnym zakresie.
- Nie wdrażamy pakietu instalacyjnego desktop na ten moment.
- Nie wdrażamy generatora szyny prądowej w obecnym zakresie web.
- Nie wdrażamy eksportu LaTeX w obecnym zakresie web.

## Zasady bezpieczeństwa

- nie zmieniać oryginalnego DINBoard podczas migracji
- przenosić ekran po ekranie i zachowywać uruchamialny stan projektu
- logikę domenową migrować najpierw jako czyste funkcje TypeScript
- przed każdym większym etapem uruchamiać `npm run build`
- priorytetem jest parytet 1:1 z Avalonia: układ, kolejność paneli, nazwy zakładek, kolory, gesty i workflow mają być kopiowane z `C:\Users\blamp\Desktop\Avalonia`
- nowe webowe usprawnienia są dopuszczalne dopiero po uzyskaniu parytetu i tylko jako osobny tryb, nie jako domyślny interfejs
ż
