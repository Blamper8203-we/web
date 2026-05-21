# DINBoard Web

Webowa wersja aplikacji DINBoard do projektowania rozdzielnic elektrycznych.

## Stan na dziś (2026-05-20)

- `npm ci` - PASS
- `npm run check` - PASS (73 testy jednostkowe)
- `npm run check:online` - PASS
- Freeze release: tag `web-v1-freeze-2026-05-20`
- Device smoke (`desktop/tablet/mobile`) - PASS w raporcie z `2026-05-09`
- Brak domknięcia bramy deploy (sekcja 3 w `RELEASE_WEB_V1_CHECKLIST.md`)

## Start lokalny

```bash
npm install
npm run dev
```

Do testów na telefonie/tablecie w tej samej sieci:

```bash
npm run dev:host
```

## Routing aplikacji

- `/` - strona informacyjna (landing)
- `/app` - właściwa aplikacja DINBoard

## Build i testy

```bash
npm run build
npm run test
npm run check
```

`npm run check` uruchamia ten sam zestaw, który wykonuje CI.

### Testy celowane (subsystemy wysokiego ryzyka)

```bash
npm run test -- src/lib/validation/electricalValidationService.test.ts
npm run test -- src/lib/phaseDistribution/phaseDistributionCalculator.test.ts
npm run test -- src/lib/dinRailSnap.test.ts src/lib/dinRailSelection.test.ts
npm run test -- src/lib/projectFile.test.ts
```

## CI

Automatyczny pipeline znajduje się w:

- `.github/workflows/ci.yml`

Na `push` do `main`/`master` i na `pull_request` uruchamia:

- `npm ci`
- `npm run build`
- `npm run test`

## Hosting SPA (odświeżanie na /app)

Projekt zawiera gotowe reguły przepisywania:

- `public/_redirects` dla Netlify
- `vercel.json` dla Vercel

### Smoke przed i po deploy

Przed wdrożeniem (lokalny build + symulacja SPA):

```powershell
npm run check:online
```

Raport: `test-artifacts/pre-deploy-smoke/route-smoke.json`

Po wdrożeniu na docelową domenę:

```powershell
$env:DINBOARD_SMOKE_BASE_URL = "https://twoja-domena.pl"
npm run smoke:production
```

Raport: `test-artifacts/post-deploy-smoke/route-smoke.json`

## Pliki projektu

Wersja webowa nie zapisuje bezpośrednio na dysku jak desktop.
Otwieranie działa przez wybór pliku `.dinboard` lub `.json`,
a zapis pobiera nowy plik projektu w przeglądarce.

## Release checklist

Checklista wydania web v1:

- `RELEASE_WEB_V1_CHECKLIST.md`

## Dokumenty projektowe

- `MIGRATION_PLAN.md`
- `DESKTOP_WRAPPER_DECISION.md`
- `QA_FUNCTIONAL_REPORT_2026-05-09.md`
- `DOKUMENTY_MAPA.md`

## Kodowanie i polskie znaki

- Wszystkie pliki `.md`, `.ts`, `.tsx`, `.css` zapisujemy w UTF-8.
- Przed commitem uruchamiaj `npm run test`, bo test `src/lib/textEncoding.test.ts` wykrywa typowe przypadki mojibake.

## Plik tsc_errors.txt

`tsc_errors.txt` jest historycznym snapshotem błędów TypeScript z `2026-05-02`, a nie bieżącym źródłem statusu.
Aktualny status kompilacji sprawdzamy zawsze komendą `npm run build`.
