# START HERE — DINBoard Web

Szybki punkt wejścia dla nowego człowieka lub agenta AI. Cel: **zbuduj, odpal,
wiedz gdzie co jest i czego nie ruszać** w 5 minut. Głębsze tematy → linki na dole.

---

## Co to jest

Inżynierska aplikacja web/desktop/mobile do projektowania **rozdzielnic
elektrycznych** wg PN-HD 60364: budowa szyny DIN, prowadzenie przewodów, bilans
faz L1/L2/L3, walidacja reguł, eksport dokumentacji powykonawczej PDF.

Stos: **React 19 · Vite 8 · TypeScript 6 · Vitest 4**, pakowane na **Tauri 2**
(desktop) i **Capacitor 8** (iOS/Android), web jako **PWA** (Workbox).
Aplikacja jest **pl-only by design**.

---

## Start w 3 komendach

```bash
npm ci        # wymaga Node z .nvmrc (obecnie 24.12.0)
npm run dev   # http://localhost:5173
npm run check # build + testy (to samo co robi CI lokalnie)
```

Trasy: `/` = landing (marketing), `/app` = właściwy edytor rozdzielnicy,
`/poradniki` = blog, `/polityka-prywatnosci` itd. = legal.

---

## Mapa repo (gdzie co jest)

| Ścieżka | Co |
|---|---|
| `src/App.tsx` | Routing (landing + `/app` + blog + legal), splash, error boundary |
| `src/components/` | UI. `AppWorkspace` = edytor; `DinRailCanvas` + `canvasLayers/` = canvas szyny; `landing/`, `blog/`, `legal/`, `pwa/`; `AppIcon.tsx` = inline SVG ikony (bez CDN) |
| `src/lib/` | **Domena.** `schematic/` (auto-layout schematu), `validation/` (14 reguł, 1 plik/reguła), `phaseDistribution/` (bilans faz), `modules/` (katalog + zaciski), `connections/`, `export/` (PDF), `projectMigrations.ts` (format `.dinboard`) |
| `src/hooks/` | Hooki Reacta (stan workspace, canvas, paleta, akcje projektu) |
| `src/locales/pl/translation.json` | i18n — jedyny język (pl) |
| `src/types/` | Typy domenowe (`symbolItem`, `circuitRow`, `connectionItem`…) |

Pełna mapa warstw i przepływu danych: [.harness/docs/architecture-map.md](../.harness/docs/architecture-map.md).

---

## Komendy

```bash
npm run dev        # dev server (Vite)
npm run build      # tsc + vite-react-ssg (SSG + PWA)
npm run test       # Vitest (raz)
npm run lint       # ESLint (CI wymaga 0 warningów)
npm run check      # build + test — brama CI
npm run test:e2e   # Playwright (Chromium)
```

Konwencje: pliki `.ts/.tsx/.css/.md` w **UTF-8 bez BOM**. Commit:
`type(scope): opis` (np. `fix(phaseBalance): …`). Jeden commit = jedna logiczna
zmiana. Testy obok pliku (`foo.ts` → `foo.test.ts`).

---

## Czego NIE ruszać bez ostrożności

- **Format `.dinboard` + `projectMigrations.ts`** — zmiana bez migracji psuje
  istniejące projekty użytkowników. Ma testy round-trip. Dodajesz pole? Dodaj migrację.
- **Duże pliki logiki domenowej** (`SmartHomeCanvas.tsx`, `moduleTerminals`,
  silnik layoutu schematu, snap szyny DIN) — refaktor **tylko w parze z testem**.
- **14 reguł walidacji** (`src/lib/validation/rules/`) — architektura „1 plik/reguła"
  jest celowa, nie „za dużo plików".
- **Cache PWA** dla `assets/modules/*.svg` (`CacheFirst`) — celowe, opisane w AGENTS.md.
- **Decyzje domenowe** (np. 11 wariantów `PhaseAssignment`, brak skalowania
  „Blok rozdzielczy") — pytaj autora, nie zgaduj. To największy ukryty dług.

Granice zmian dla agenta AI + high-risk areas: [AGENTS.md](../AGENTS.md).

---

## Testy i CI

- `.github/workflows/ci.yml` na każdym PR i push do `main`: **Lint (0 warnings) →
  Build (tsc+vite) → Unit tests**, potem smoke i e2e (skippowalne labelami
  `skip-smoke` / `skip-e2e`).
- Polityka testów (round-trip, must-test, high-risk): [.harness/docs/test-policy.md](../.harness/docs/test-policy.md).

---

## Dalej

| Plik | Co w nim |
|---|---|
| [README.md](../README.md) | Przegląd, status, ograniczenia |
| [AGENTS.md](../AGENTS.md) | Zasady agenta AI, high-risk areas, granice |
| [PLAN-ULEPSZEN.md](../PLAN-ULEPSZEN.md) | Bieżący plan ulepszeń (living checklist) |
| [.harness/docs/](../.harness/docs/) | architecture-map · code-standards · test-policy · git-workflow |
