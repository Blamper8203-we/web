# DINBoard Web Migration Plan

## Cel

Projekt w `F:\stare pliki\Nowy projekt` jest czysta aplikacja webowa React + Vite. Oryginalne repozytorium Avalonia w `C:\Users\blamp\Desktop\Avalonia` traktujemy jako zrodlo logiki, widokow i reguł domenowych do stopniowej migracji.

## Etap 1 - Web shell

- [x] bootstrap React + TypeScript + Vite
- [x] usuniecie zaleznosci Tauri z webowego buildu
- [x] ustawienie shell UI w stylu DINBoard
- [x] dopasowanie glownego ukladu 280 / workspace / 320, paska arkuszy i paneli bocznych do `MainWindow.axaml`
- [x] dopasowanie toolbaru, flyoutow, ikon i prawego panelu w kierunku `MainWindow.axaml` / `MainRightPanelView.axaml`
- [x] dopasowanie lewego panelu: paleta modulow, panel projektu i panel dokumentacji do widokow Avalonia
- [x] przeniesienie wszystkich wbudowanych modulow z `Assets/Modules` do webowego `public/assets/modules`
- [x] katalog palety modulow zgodny z folderami Avalonia, z podgladem SVG i parametrami domyslnymi
- [x] dopasowanie paska statusu do `MainStatusBarView.axaml`: ikony, metryki, status pliku i zoom
- [x] przygotowanie miejsc pod projekt, obwody, rozdzielnice, dokumentacje
- [x] tryb `dev:host` do testow na urzadzeniach mobilnych

## Etap 2 - Dane i pliki projektu

- [x] kontrakty TypeScript dla projektu i obwodow
- [x] localStorage dla stanu roboczego
- [x] import danych testowych
- [x] otwieranie `.dinboard/.json` przez przegladarke
- [x] zapis jako pobierany plik `.dinboard`
- [x] migracja starych kluczy `dinboard-tauri.*` do nowych `dinboard-web.*`

## Etap 3 - Widoki o niskim ryzyku

- [x] wlasciwosci projektu
- [x] lista obwodow
- [x] panele dokumentacji
- [x] protokoly pomiarowe

## Etap 4 - Subsystemy wysokiego ryzyka

- [ ] canvas i rozmieszczanie elementow
  - [x] geometria A4, paginacja pionowa, symbole i tabela schematu jednokreskowego wg Avalonii
  - [x] inline edit komorek tabeli schematu z undo/redo wg `SchematicCellEditController`
  - [x] skroty edycji `Delete` i `Ctrl+D` dla zaznaczonego elementu
  - [x] multi-select przez Ctrl/Cmd+klik, grupowe przesuwanie, usuwanie i duplikacja
  - [x] ikonowe kontrolki zoomu i dolne metryki canvasow w stylu Avalonia
  - [x] generator szyny DIN wywolywany z paska narzedzi albo pustego canvasu, z dialogiem jak w Avalonia
  - [x] renderowanie rzeczywistych SVG modulow na szynie DIN, drag and drop na szynie oraz snap poziomy/pionowy wzorowany na `SchematicSnapService`
  - [x] zgodnosc z regułami Avalonia dla kategorii `Listwy` / `Zlacza`: bez snapu do szyny DIN
- [x] podstawowa obsluga dotyku na canvasach
- [x] undo/redo
- [x] bilansowanie faz
- [x] walidacja elektryczna
- [x] podstawowy eksport PDF przez drukowanie przegladarki
- [x] panel edycji zaznaczonego modulu/obwodu z Avalonia `CircuitEditPanelView`
- [ ] kalkulator indukcji z panelu edycji
- [ ] pelny eksport PDF zgodny z uslugami Avalonia

## Etap 5 - Strona i publikacja web

- [ ] docelowy routing strony/aplikacji
- [ ] landing lub publiczna strona informacyjna
- [ ] konfiguracja hostingu
- [ ] testy na mobile/tablet/desktop

## Etap 6 - Desktop pozniej

- [ ] decyzja o wrapperze desktopowym
- [ ] pakiet instalacyjny dopiero po ustabilizowaniu webowej aplikacji

## Zasady bezpieczenstwa

- nie zmieniac oryginalnego DINBoard podczas migracji
- przenosic ekran po ekranie i zachowywac uruchamialny stan projektu
- logike domenowa migrowac najpierw jako czyste funkcje TypeScript
- przed kazdym wiekszym etapem uruchamiac `npm run build`
- priorytetem jest parytet 1:1 z Avalonia: uklad, kolejnosc paneli, nazwy zakladek, kolory, gesty i workflow maja byc kopiowane z `C:\Users\blamp\Desktop\Avalonia`
- nowe webowe usprawnienia sa dopuszczalne dopiero po uzyskaniu parytetu i tylko jako osobny tryb, nie jako domyslny interfejs
