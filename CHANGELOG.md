# Changelog

Wszystkie istotne zmiany w DINBoard Web są dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
projekt stosuje [Semantic Versioning](https://semver.org/lang/pl/).

## [Unreleased]

## [0.2.0] - 2026-06-22

### Added
- Trzecia akcja odzyskiwania w ekranie błędu („Wyczyść bieżący projekt”): archiwizuje
  bieżący stan (bez kasowania danych) i uruchamia aplikację z pustym zleceniem, by
  przerwać pętlę błędu przy uszkodzonym stanie roboczym.
- Okno „O aplikacji” z numerem wersji i skrótem ostatnich zmian.
- Numer wersji widoczny w interfejsie (źródło prawdy: `package.json`).
- `CHANGELOG.md` w standardzie Keep a Changelog.

### Changed
- Inicjalizacja stanu aplikacji przeniesiona do warstwy `lib/` (`loadInitialState`):
  uszkodzone dane w pamięci przeglądarki dają bezpieczny stan początkowy zamiast błędu.
- Ujednolicono źródło wersji Node (`.nvmrc`) w konfiguracji CI.

### Fixed
- Naprawiono błąd indeksowania w migracji formatu pliku `.dinboard`, który mógł
  prowadzić do nieprawidłowej migracji przy aktualizacji wersji schematu.

[Unreleased]: https://gitlab.com/dinboard-group/DINBOARD-project/-/compare/v0.2.0...HEAD
[0.2.0]: https://gitlab.com/dinboard-group/DINBOARD-project/-/tags/v0.2.0
