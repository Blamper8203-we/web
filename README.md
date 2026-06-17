# DINBoard Web

Inżynierska aplikacja web/desktop/mobile do projektowania rozdzielnic
elektrycznych według PN-HD 60364. Buduje rozdzielnicę, prowadzi przewody,
robi bilans faz, waliduje, eksportuje dokumentację powykonawczą PDF.

**Status (2026-06-16):** produkcyjna aplikacja solo-developera, działa na
desktopie (Tauri 2), web (PWA), iOS/Android (Capacitor 8).

---

## Stan techniczny

| Metryka | Wartość |
|---|---|
| Testy jednostkowe | **698 passing** (69 plików) |
| `npm run build` | PASS, ~1.2–2 s |
| `npm run test` | PASS, ~35–45 s |
| `npm run check` (build + test) | PASS |
| Commits (30 dni) | 139+ |
| Stos | React 19, Vite 8, Pixi 8, Tauri 2, Capacitor 8, Vitest 4 |

---

## Co działa

- **4 widoki arkuszy** na jednym stanie (`symbols` + `metadata`):
  - Szyna DIN (canvas Pixi, drag, snap, RCD/MCB)
  - Schemat jednokreskowy (auto-layout, etykiety)
  - Lista obwodów (eksport BOM)
  - Dokumentacja PDF (protokoły pomiarowe, karta tytułowa)
- **Domena elektryczna** w `src/lib/`: bilans faz L1/L2/L3, walidacja reguł
  (RCD→MCB, napięcia, prądy, IP), katalog modułów, dystrybucja zacisków.
- **Zapis/odczyt projektu** w formacie `.dinboard` z migracjami i
  undo/redo.
- **SVG modułów** z trzema źródłami prawdy zsynchronizowanymi w dev
  (plik, katalog, manifest generowany przez Vite).
- **3 platformy**: web (PWA z Workbox), desktop (Tauri 2), mobile
  (iOS/Android przez Capacitor 8).
- **Ciągła integracja** w `.github/workflows/ci.yml` (`npm run check:online`).

---

## Znane ograniczenia i dług techniczny

| Co | Gdzie | Wpływ | Status |
|---|---|---|---|
| Plik-kontener canvas | `src/components/DinRailConnectionsCanvas.tsx` (2130 linii) | Duże zmiany ryzykowne | Mapa regionów dodana (2026-06), pełny split odłożony |
| Duży moduł terminali | `src/lib/modules/moduleTerminals.ts` (33 KB) | Wysoki próg wejścia | Stabilny, refaktor tylko w parze z testem |
| Asymetria testów | `src/lib/circuitEdit/` miała 1 test dla 19 KB logiki | Ryzyko regresji w polach obwodu | +27 testów dodanych (2026-06-16), ryzyko obniżone |
| Walidacja monolityczna | `electricalValidationService.ts` miał 25.9 KB / 750 linii | Plik-kontener 14 reguł + helpery + stałe | Rozbite (2026-06): 4 pliki helperów + 14 reguł + dispatcher 5 KB |
| Orphan w lockfile | `@emnapi/wasi-threads@1.2.2` | Żaden (220 KB, 0 użycia) | Udokumentowany w AGENTS.md |
| Cache PWA | `/assets/modules/*.svg` CacheFirst 30 dni | Po zmianie SVG użytkownik musi hard-reload | Standard dla PWA, opisany w AGENTS.md |

---

## Aktualny focus

W kolejności ważności:

1. **Audyt kodu** (`.mavis/plans/plan-audit.yaml` — gotowy plan, raporty
   do `audit-electrical / canvas / pdf / project-io / code-discipline`).
   Plan nigdy nie został wykonany do końca.
2. **Dalsze wzmocnienie testów w high-risk areas** (po C dawce
   `circuitEditFieldDefinitions`).
3. **Refaktoring długich plików** (po C, realny projekt, wymaga osobnego PR).
4. **Dokumentacja domeny** — dlaczego `PhaseAssignment` ma 11 wariantów,
   dlaczego `Blok rozdzielczy` nigdy nie używa skalowania „none", itp.
   To jest największy ukryty dług, bo tylko autor rozumie te decyzje.

---

## Start lokalny

```bash
npm install        # pierwsza instalacja (uwaga: orphan w lockfile, ignoruj)
npm run dev        # Vite dev server (http://localhost:5173)
npm run dev:host   # tryb dostępny z innych urządzeń w sieci
```

Wymaga Node ≥ 22.12.0 (jest `.nvmrc`).

---

## Build i testy

```bash
npm run build      # tsc + Vite
npm run test       # Vitest, uruchomione raz
npm run check      # build + test (to robi CI)
npm run lint       # ESLint flat config
npm run lint:fix   # ESLint z auto-fix
```

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
# Pola edycji obwodu (nowe, 28 testów)
npm run test -- src/lib/circuitEdit/circuitEditFieldDefinitions.test.ts
# Reguły walidacji elektrycznej (po refaktorze: 14 reguł, 1 plik per reguła)
npm run test -- src/lib/validation/rules/
# Regresja szyny DIN
npm run test:din-rail-regression
```

---

## Routing aplikacji

- `/` — strona informacyjna (landing)
- `/app` — właściwa aplikacja DINBoard

SPA, wymaga reguł przepisywania na hostingu:

- `public/_redirects` dla Netlify
- `vercel.json` dla Vercel

---

## Smoke przed/po deploy

```bash
# lokalny build + symulacja SPA
npm run check:online
# raport: test-artifacts/pre-deploy-smoke/route-smoke.json

# po deploy na domenę docelową
$env:DINBOARD_SMOKE_BASE_URL = "https://twoja-domena.pl"
npm run smoke:production
# raport: test-artifacts/post-deploy-smoke/route-smoke.json
```

---

## Dokumentacja projektu

| Plik | Co w nim |
|---|---|
| `AGENTS.md` | Zasady pracy agenta AI, granice zmian, high-risk areas |
| `.harness/agent.md` | Orchestrator (Harness) — Mavis, reguły routingu |
| `.harness/docs/code-standards.md` | Warstwy, wydajność, SVG, styl |
| `.harness/docs/test-policy.md` | Polityka testów Vitest, round-trip, must-test |
| `.harness/docs/architecture-map.md` | Mapa warstw i przepływu danych |
| `.harness/docs/git-workflow.md` | Branching, prefiksy commitów, high-risk gate |
| `.harness/reins/<rola>/agent.md` | Reguły dla poszczególnych ról AI |

---

## Konwencje

- Wszystkie pliki `.md`/`.ts`/`.tsx`/`.css` w **UTF-8 bez BOM**.
- Polskie znaki w stringach normalizowane przez `normalizeSymbolIdentityText`.
- Commit message: `<type>(<scope>): <description>`, np. `fix(phaseBalance): exclude auxiliary symbols`.
- Testy: obok pliku (`foo.ts` → `foo.test.ts`).
- Jeden commit = jedna logiczna zmiana, mały zakres.

---

## Plik tsc_errors.txt

`tsc_errors.txt` jest historycznym snapshotem błędów TypeScript
z `2026-05-02`, a nie bieżącym źródłem statusu. Aktualny status
kompilacji sprawdzamy zawsze komendą `npm run build`.
