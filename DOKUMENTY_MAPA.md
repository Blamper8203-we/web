# Mapa dokumentów DINBoard Web

## Główne dokumenty

- `AGENTS.md`
  - Cel: zasady pracy agenta i granice zmian.
  - Właściciel: zespół aplikacji.

- `ARCHITEKTURA_APLIKACJI.md`
  - Cel: opis warstw i przepływu danych.
  - Właściciel: zespół aplikacji.

- `MIGRATION_PLAN.md`
  - Cel: status migracji z Avalonia do Web/Tauri.
  - Właściciel: zespół aplikacji.

- `DESKTOP_WRAPPER_DECISION.md`
  - Cel: decyzja i uzasadnienie wrappera desktopowego.
  - Właściciel: zespół aplikacji.

- `QA_FUNCTIONAL_REPORT_2026-05-09.md`
  - Cel: wynik walidacji funkcjonalnej.
  - Właściciel: QA / zespół aplikacji.

- `RELEASE_WEB_V1_CHECKLIST.md`
  - Cel: bieżąca checklista wydaniowa.
  - Właściciel: release owner.

- `TODO_DOKUMENTACJI.md`
  - Cel: porządki dokumentacyjne do wykonania.
  - Właściciel: zespół aplikacji.

## Dokumenty źródłowe przeniesione lokalnie

- `AI_CONTEXT.md`
- `ARCHITECTURE_MAP.md`
- `CODE_QUALITY.md`
- `DOMAIN_RULES.md`
- `PREVENTING_CODE_MESS.md`
- `.cursorrules`

Te pliki są lokalnymi skrótami zasad ze starego repo Avalonia i stanowią punkt odniesienia do pracy w tym repo.

## Procedura aktualizacji dokumentacji po zmianie obszaru krytycznego

1. Zaktualizuj `RELEASE_WEB_V1_CHECKLIST.md` i wpisz datę walidacji.
2. Jeśli zmiana dotyczy logiki domenowej lub zapisu, dopisz notę w `MIGRATION_PLAN.md`.
3. Jeśli zmienia się przepływ danych lub warstwy, zaktualizuj `ARCHITEKTURA_APLIKACJI.md`.
4. Jeśli doszły nowe ryzyka, dopisz je do `TODO_DOKUMENTACJI.md`.
5. Uruchom adekwatne testy i wpisz wynik w opisie PR/commit.
