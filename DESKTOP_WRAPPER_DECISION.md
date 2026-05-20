# Desktop Wrapper Decision

Data decyzji: 2026-05-09

## Kontekst

Webowa migracja DINBoard jest funkcjonalnie gotowa do wydania v1.
Desktop wrapper pozostaje etapem "później", ale potrzebna była formalna decyzja technologiczna.

## Opcje

1. Tauri (Rust + WebView)
2. Electron (Chromium + Node runtime)
3. PWA installable (bez natywnego wrappera)

## Kryteria

- zgodność z istniejącym repo (obecny `src-tauri`)
- rozmiar paczki i koszt utrzymania
- bezpieczeństwo uruchomienia lokalnego
- prostota dystrybucji na Windows
- gotowość do integracji z logiką lokalnych plików

## Decyzja

Wybrana opcja docelowa: **Tauri**.

## Uzasadnienie

- Projekt ma już zalążki `src-tauri`, więc wejście kosztowe jest najniższe.
- Binarki Tauri są zwykle znacznie lżejsze od Electron.
- Model bezpieczeństwa i bridge API dobrze pasują do aplikacji inżynierskiej.
- Webowa część pozostaje ta sama, co minimalizuje ryzyko regresji UI.

## Zakres teraz vs później

Teraz:

- formalna decyzja technologiczna (zamknięcie punktu decyzyjnego z planu)

Później:

- przygotowanie paczki instalacyjnej
- podpisywanie/aktualizacje
- testy end-to-end desktopowe
