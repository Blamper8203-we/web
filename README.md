# DINBoard Web

Webowa wersja aplikacji DINBoard do projektowania rozdzielnic elektrycznych. Projekt działa jako klasyczna aplikacja React + Vite uruchamiana w przeglądarce.

## Uruchamianie lokalne

```bash
npm install
npm run dev
```

Do testów na telefonie w tej samej sieci:

```bash
npm run dev:host
```

Po uruchomieniu Vite pokaże adres lokalny oraz adres sieciowy, który można otworzyć na urządzeniu mobilnym.

## Build produkcyjny

```bash
npm run build
npm run preview
```

## Pliki projektu

Wersja webowa nie zapisuje bezpośrednio na dysku jak aplikacja desktopowa. Otwieranie projektu działa przez wybór pliku `.dinboard` lub `.json`, a zapis pobiera nowy plik projektu w przeglądarce.

## Desktop później

Kod Tauri może zostać dołożony później jako osobny wrapper dla wersji desktopowej. Aktualny `package.json` i build są ustawione pod czystą aplikację webową.
