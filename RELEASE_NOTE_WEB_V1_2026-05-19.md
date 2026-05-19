# Release Note - Web v1 (2026-05-19)

## Zakres wydania

- Aplikacja webowa DINBoard z routingiem:
  - `/` (landing)
  - `/app` (workspace)
- Stabilny build i testy (`npm run check`).
- Walidacja online (`npm run check:online`) z potwierdzeniem tras SPA.
- Uporządkowana dokumentacja release i checklista.

## Znane ograniczenia

- Brak wdrożenia:
  - eksportu LaTeX,
  - generatora szyny prądowej,
  - kalkulatora indukcji.
- Przed pełnym release produkcyjnym wymagane:
  - ręczny test eksportu PDF na realnym projekcie,
  - ręczny test open/save `.dinboard` w przeglądarce,
  - post-deploy smoke na docelowym URL.

## Wynik walidacji technicznej

- `npm ci` - PASS
- `npm run check` - PASS
- `npm run check:online` - PASS
