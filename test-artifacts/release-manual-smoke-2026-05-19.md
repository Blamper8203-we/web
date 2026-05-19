# Release Manual Smoke - 2026-05-19

## Cel

Domknąć ręczne punkty z `RELEASE_WEB_V1_CHECKLIST.md`:
- Verify PDF export on a real project
- Verify open/save `.dinboard` flow in browser

## Środowisko

- Aplikacja uruchomiona lokalnie (`npm run dev` lub `npm run preview`).
- Projekt testowy zawierający:
  - minimum 1 rozdzielnicę z modułami,
  - minimum 2 obwody,
  - uzupełnione podstawowe metadane PDF.

## Scenariusz 1: Open/Save `.dinboard` w przeglądarce

1. Otwórz `/app`.
2. Załaduj istniejący plik `.dinboard`.
3. Sprawdź:
   - poprawne odtworzenie modułów/schematu,
   - brak błędów w konsoli,
   - zgodność podstawowych pól projektu.
4. Wprowadź małą zmianę (np. edycja nazwy pola lub parametru obwodu).
5. Zapisz projekt do nowego pliku `.dinboard`.
6. Odśwież aplikację i ponownie otwórz zapisany plik.
7. Potwierdź, że zmiana z kroku 4 jest zachowana.

Wynik: PASS (2026-05-19)

## Scenariusz 2: Eksport PDF na realnym projekcie

1. Otwórz `/app` i przejdź do obszaru dokumentacji PDF.
2. Uzupełnij wymagane pola dokumentacji (jeśli puste).
3. Wygeneruj podgląd PDF.
4. Wykonaj eksport PDF.
5. Otwórz wyeksportowany plik i sprawdź:
   - obecność kluczowych sekcji,
   - zgodność danych z UI,
   - czytelność treści i tabel,
   - brak artefaktów renderowania.

Wynik: PASS (2026-05-19)

## Notatka końcowa

Manualne testy release wykonane i potwierdzone jako PASS.
