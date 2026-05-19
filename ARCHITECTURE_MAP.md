# Architecture Map (skrót lokalny)

## Warstwy

- `components` - UI i zachowanie wizualne.
- `hooks` - orkiestracja stanu i przepływów.
- `lib` - logika domenowa i obliczenia.
- `types` - kontrakty danych.
- `src-tauri` - integracja desktop/system.

## Zasady granic

- Nie przenoś logiki domenowej do komponentów React.
- Nie mieszaj geometrii logicznej z dekoracją wizualną.
- Dla obszarów krytycznych stosuj testy charakterystyki i regresji.

Szczegółowy opis architektury: `ARCHITEKTURA_APLIKACJI.md`.
