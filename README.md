# DINBoard Web

Webowa wersja aplikacji DINBoard do projektowania rozdzielnic elektrycznych.

## Stan na dziś (2026-06-04)

- `npm ci` - PASS
- `npm run build` - PASS
- `npm run test` - PASS (172 testy jednostkowe, 30 plików testowych)
- Build produkcyjny: ~2.3s, 943 moduły

### Ostatnie zmiany

- **2026-06-04**: Oczyszczono dokumentację projektu – usunięto nieaktualne pliki. Aktualna dokumentacja: `AGENTS.md`, `ARCHITEKTURA_APLIKACJI.md`, `README.md`.

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
# Walidacja elektryczna
npm run test -- src/lib/validation/electricalValidationService.test.ts
# Bilans faz
npm run test -- src/lib/phaseDistribution/phaseDistributionCalculator.test.ts
# Szyna DIN
npm run test -- src/lib/dinRailSnap.test.ts src/lib/dinRailSelection.test.ts
# Zapis/odczyt projektu
npm run test -- src/lib/projectFile.test.ts
# Schemat jednokreskowy
npm run test -- src/lib/schematic/schematicLayoutEngine.test.ts
# Eksport PDF
npm run test -- src/lib/export/PdfProtocolDocument.test.ts
# Regresja szyny DIN
npm run test:din-rail-regression
```

### Lista wszystkich testów (30 plików, 172 testy)

| Obszar | Plik | Testy |
|--------|------|-------|
| Walidacja elektryczna | `electricalValidationService.test.ts` | 28 |
| Silnik layoutu schematu | `schematicLayoutEngine.test.ts` | 21 |
| Skróty klawiszowe | `appShortcuts.test.ts` | 12 |
| PDF | `PdfProtocolDocument.test.ts` | 11 |
| Bilans faz | `phaseDistributionCalculator.test.ts` | 9 |
| Snap szyny DIN | `dinRailSnap.test.ts` | 8 |
| Typy symboli | `symbolItem.test.ts` | 7 |
| Akcje symboli | `useSymbolActions.test.ts` | 7 |
| Selekcja szyny DIN | `dinRailSelection.test.ts` | 5 |
| Katalog modułów | `moduleCatalog.test.ts` | 5 |
| Metadane projektu | `projectMetadata.test.ts` | 5 |
| Viewport schematu | `schematicViewportController.test.ts` | 5 |
| Spójność grup | `groupConsistency.test.ts` | 6 |
| Importowane moduły | `importedModuleCatalog.test.ts` | 6 |
| Helper aplikacji | `appHelpers.test.ts` | 6 |
| Pozostałe (15 plików) | różne | ~30 |

## CI

Automatyczny pipeline znajduje się w:

- `.github/workflows/ci.yml`

Na `push` do `main`/`master` i na `pull_request` uruchamia:

- `npm ci`
- `npm run check:online` (build + testy + smoke tras SPA)

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

## Dokumentacja projektu

Aktualne dokumenty:

- `AGENTS.md` – zasady pracy agenta i granice zmian
- `ARCHITEKTURA_APLIKACJI.md` – opis warstw i przepływu danych
- `README.md` – ten plik

## Kodowanie i polskie znaki

- Wszystkie pliki `.md`, `.ts`, `.tsx`, `.css` zapisujemy w UTF-8.
- Przed commitem uruchamiaj `npm run test`, bo test `src/lib/textEncoding.test.ts` wykrywa typowe przypadki mojibake.

## Plik tsc_errors.txt

`tsc_errors.txt` jest historycznym snapshotem błędów TypeScript z `2026-05-02`, a nie bieżącym źródłem statusu.
Aktualny status kompilacji sprawdzamy zawsze komendą `npm run build`.
