# Analiza DINBoard + plan ulepszeń

**Data:** 2026-07-22
**Autor analizy:** Claude (Opus 4.8)
**Zakres:** przegląd całości repo, stan zdrowia, priorytetyzowany plan napraw i ulepszeń
**Metoda:** statyczny przegląd kodu + realne uruchomienie `tsc`, `eslint`, `vitest`

---

## 1. Co o tym myślę (szczera ocena)

Krótko: **to jest jedna z najbardziej zdyscyplinowanych baz kodu solo-developera, jakie widziałem.**
To nie jest grzecznościowy komplement — poniżej twarde dane, które to potwierdzają, i realne
problemy, które psują ten obraz.

### Stan zdrowia (zweryfikowany 2026-07-22)

| Sygnał | Wynik | Komentarz |
|---|---|---|
| `tsc --noEmit` | ✅ exit 0 | zero błędów typów w całym `src/` |
| `eslint .` | ✅ exit 0 | zero ostrzeżeń, flat config |
| `vitest run` | ✅ **1172 passing** / 2 skipped, 119 plików | README mówił 698 — urosło ~1.7× |
| `as any` / `: any` w `src/` (bez testów) | ~55 | niski, biorąc pod uwagę 46k LOC |
| `@ts-ignore` / `@ts-expect-error` | 20 | akceptowalne |
| `eslint-disable` | 5 | świetnie |
| `TODO`/`FIXME`/`HACK` | 2 | prawie zero — komentarze są opisowe, nie „potem to zrobię" |

### Co robi wrażenie

- **Dyscyplina domenowa.** Realne modelowanie elektryki wg PN-HD 60364: bilans faz L1/L2/L3,
  14 reguł walidacji (RCD→MCB, napięcia, prądy, IP) rozbitych po jednym pliku na regułę, katalog
  modułów, dystrybucja zacisków. To nie jest „CRUD z ikonkami" — to inżynieria.
- **Komentarze `// WHY:`** wyjaśniają *decyzje*, nie *co robi kod*. To rzadkość i realnie obniża
  próg wejścia do trudnych miejsc (np. `distributePower` „L1+L3 vs L3+L1", cache PWA dla `+` w URL).
- **Ślad audytu.** `zadania do naprawy.md` + `.harness/reports/` pokazują, że dług był
  systematycznie zamykany (Top 10 audytu, quick winy, martwe pliki). Migration registry z markerem
  `appliedMigrations`, undo/redo, round-trip testy formatu `.dinboard` — to dojrzałe wzorce.
- **Multi-platform naprawdę.** Web (PWA/Workbox), desktop (Tauri 2), mobile (Capacitor 8, iOS+Android)
  z jednego stanu. Lazy-loading ciężkich rzeczy (`AppWorkspace`, `@react-pdf/renderer`, `SmartHomeCanvas`),
  ręczne chunki pod PDF-engine. Przemyślane.

### Co psuje ten obraz (i dlatego jest plan)

1. **Repo jest zaśmiecone ~8 MB śledzonych binariów i jednorazowych plików**, które nie powinny
   być w gicie. To pierwsza rzecz, którą widzi każdy nowy człowiek/agent — i wygląda gorzej niż
   kod pod spodem.
2. **Nazewnictwo „Pixi" jest kłamstwem.** Renderer Pixi.js został usunięty, ale główny komponent
   canvasu nazywa się `DinRailCanvasPixi.tsx`, a typ `DinRailCanvasRail` ciągnie się przez ~40 plików.
   To najgorsza pułapka „tylko autor rozumie" w całym projekcie — dotyczy centralnego komponentu.
3. **i18n jest w stanie zawieszonym.** Tylko `pl` (929 kluczy), wszystkie w formacie
   `auto.xxx_NNN` (maszynowo wyekstrahowane), a w repo leżą porzucone artefakty niemieckiego
   (`missing-keys-de.json`, `missing-translations-report.json`). Albo wielojęzyczność jest celem
   i trzeba ją zrobić porządnie, albo nie jest i te pliki wprowadzają w błąd.
4. **Splash 3000 ms przy każdym starcie edytora.** To celowa decyzja brandingowa, ale 3 s
   wymuszonego czekania to realny koszt UX przy narzędziu, które elektryk odpala wielokrotnie
   dziennie.
5. **Domena nieudokumentowana** — sam README to nazywa „największym ukrytym długiem": dlaczego
   `PhaseAssignment` ma 11 wariantów, dlaczego „Blok rozdzielczy" nigdy nie skaluje itd.

---

## 2. Plan — priorytetyzowany

Legenda wysiłku: **S** = < 1 h, **M** = pół dnia, **L** = 1–3 dni, **XL** = > 3 dni.
Kolejność w tabelach = kolejność wykonania.

### P0 — Higiena repo (zrób najpierw, jest tanie i widoczne)

Cel: czyste `git status`, brak binariów w historii roboczej, repo które „wygląda tak dobrze jak kod".

| # | Zadanie | Pliki | Wysiłek | Status |
|---|---|---|---|---|
| P0-1 | `git rm --cached` śmieci + rozszerz `.gitignore` | `public.rar`, `empty-box.png`, `pdf30*`, `index.rar`, `out/`, `diff.txt`/`diff2.txt`, `git_log_logoBox.txt`, `missing-keys*.json`, `missing-translations-report.json`, `dev-host.*.log`, `test-artifacts/**/*.png` + `route-smoke.json` | **S** | ✅ **DONE 2026-07-22** — 22 pliki odpięte, `.gitignore` rozszerzony, pliki zostają na dysku. Staged, czeka na commit. |
| P0-2 | Usuń crash log JVM z roota | `hs_err_pid4004.log` (68 KB, nietrackowany) | **S** | ✅ **DONE 2026-07-22** — usunięty z dysku, `hs_err_pid*.log` w `.gitignore`. |
| P0-3 | Zdecyduj los jednorazowych skryptów | `fix_all.cjs`, `fix_builtin.cjs`, `fix_svg.cjs` — do `scripts/debug/` (już w `.gitignore`) albo usuń. Uwaga: `scripts/i18n-*.mjs` + `find-polish-strings.mjs` też są martwe przy pl-only. | **S** | ⏳ otwarte |
| P0-4 | Commit/stash bieżącego WIP (7 zmodyfikowanych plików `connections`) | żeby wejść w plan z czystego baseline | **S** | ⏳ otwarte (WIP nietknięty, celowo poza commitem higieny) |
| P0-5 | (Opcjonalnie) odchudzenie historii `.git` (27 MB) | `git filter-repo` na dużych blobach — **ryzykowne, przepisuje historię**, robić świadomie i z backupem, nie w tym samym PR | **M** |

> **Uwaga do P0-1:** to są pliki **śledzone** — samo `.gitignore` ich nie usunie z indeksu.
> Trzeba `git rm --cached <plik>` (zostają na dysku, znikają z repo), potem wpis w `.gitignore`.
> `empty-box.png` i `public.rar` prawdopodobnie są potrzebne lokalnie — nie kasuj z dysku,
> tylko z trackingu.

### P1 — Korekty i UX (szybkie, odczuwalne dla użytkownika)

| # | Zadanie | Gdzie | Wysiłek |
|---|---|---|---|
| P1-1 | **Splash: min. floor zamiast sztywnych 3000 ms.** ✅ **DONE 2026-07-22** (commit `6e3bc03`) — stała `SPLASH_MIN_VISIBLE_MS=1200` użyta w mount effect i `triggerSplash`. Zweryfikowane w przeglądarce: `app-ready` OK, splash chowany, workspace renderuje się bez błędów. | `src/App.tsx` | **M** |
| P1-2 | **Rozstrzygnij i18n.** ✅ **DECYZJA 2026-07-22: pl-only.** Artefakty niemieckiego odpięte od repo (P0-1). Zostaje: komentarz „app is pl-only by design" przy inicjalizacji i18n + rozważyć usunięcie martwych `scripts/i18n-*.mjs`, `find-polish-strings.mjs`, `audit-translations.mjs`. | root + `src/locales/` | **S** |
| P1-3 | **Błędy runtime NIE docierają do dewelopera.** ⚠️ **USTALONE 2026-07-22:** `reportRuntimeError` w produkcji robi tylko `console.error` (komentarz: „Keep diagnostics local until a privacy-reviewed monitoring backend is configured"). Globalne handlery + ErrorBoundary są podpięte, ale dead-end w konsoli usera. Na 3 platformach = zero widoczności crashy na produkcji. **Rekomendacja:** podłączyć backend (np. Sentry) za zgodą z `CookieConsent`. Seam gotowy w `reportRuntimeError`. Wymaga decyzji o vendorze + privacy — osobne zadanie. | `src/lib/runtimeDiagnostics.ts` | **L** |
| P1-4 | Przegląd `any`/`@ts-ignore`. ✅ **DONE 2026-07-22** (commit `7132931`, częściowo). Ustalenia: **wszystkie 20 `@ts-expect-error` są w testach i udokumentowane** (zdrowe, nie dług). Z 55 `any` większość to uzasadniony interop (`@react-pdf`, parsowanie SVG, API przeglądarki). Poprawiono 3 realne w kodzie logiki (`projectMigrations`, `getRootNodes`, `window.lucide`) — tsc przy okazji odkrył latentny bug maskowany przez `any`. Reszta `any` = interop, zostawiona świadomie. | `src/**` | **M** |

### P2 — Architektura i utrzymywalność (średni termin, osobne PR-y)

| # | Zadanie | Gdzie | Wysiłek |
|---|---|---|---|
| P2-1 | **Zabij nazwę „Pixi".** ✅ **DONE 2026-07-22** (commit `f1456d7`) — `git mv DinRailCanvasPixi.tsx → DinRailCanvas.tsx` + aktualizacja 33 ścieżek importu (w tym `?raw` w testach) + docs. Komponent był już `export function DinRailCanvas`; „Pixi" żyło tylko w nazwie pliku. Typ `DinRailCanvasRail` bez zmian. Zweryfikowane: tsc czysto, 1172 testy bez zmian. WIP `connections` rozdzielony chirurgicznie (staged tylko linia importu). **Uwaga:** hook `useDinRailPixiApp.ts` celowo zostaje — nazwa jest szczera (to wyłączony guard Pixi). | `src/components/DinRailCanvas.tsx` + 32 konsumentów | **L** |
| P2-2 | **Rozbij największe pliki logiki (nie renderery).** Priorytet wg zmienności, nie samego rozmiaru. | `SmartHomeCanvas.tsx` (966), `circuitEditFieldDefinitions.ts` (610), `phaseDistributionCalculator.ts` (584) | **L** |
| P2-3 | Renderery (stabilne, duże) zostaw — refaktor tylko w parze z testem. | `dinRailSnapshotService.ts` (824), `pdfStyles.ts` (784), `dinRailSvgRenderer.ts` (724) | — |
| P2-4 | **Dokumentacja domeny (`docs/domain/`).** ADR-y na 5 pytań, które „rozumie tylko autor": 11 wariantów `PhaseAssignment`, brak skalowania „Blok rozdzielczy", semantyka RCD-inheritance, `WIRE_THICKNESS_MAP[16]=60`, format `.dinboard`. To największy realny dług wg samego README. **Wymaga wiedzy autora o „dlaczego" — nie da się zrobić na oślep.** | nowe `docs/domain/*.md` | **L** |
| P2-5 | **Dedup `getRootNodes`.** ✅ **DONE 2026-07-22.** ⚠️ **Sprostowanie:** kopie NIE były identyczne — `useSchematicInteraction` i `schematicCellEdit` tak (wykluczają tylko dzieci), ale `schematicRenderUtils` dodatkowo wyklucza węzły `topDevice`. Ślepy merge = bug. **Zrobione:** 2 identyczne kopie → wspólny `getRootNodes` w `schematicNodeIdentification.ts`; wersja renderująca zmieniona na `getRenderRootNodes` (szczera nazwa) z WHY o różnicy. **TODO(autor):** potwierdź, że wykluczenie `topDevice` w renderze jest zamierzone, nie latentny bug. | `schematicNodeIdentification`, `useSchematicInteraction`, `schematicCellEdit`, `schematicRenderUtils`, `schematicRenderer` | **M** |

### P3 — Produkt / wzrost / infra (dłuższy horyzont)

| # | Zadanie | Dlaczego | Wysiłek |
|---|---|---|---|
| P3-1 | **Budżet rozmiaru bundla + Lighthouse w CI.** To PWA — regresja wagi wejściowej bije w mobile i SEO. Dodaj próg (np. `size-limit`) i Lighthouse CI na `/`. | **M** |
| P3-2 | **Audyt dostępności (a11y).** Elektryk na tablecie/telefonie w terenie: focus, kontrast, cele dotykowe, aria na canvasie/panelach. | **L** |
| P3-3 | **Potwierdź, że CI blokuje merge.** README wspomina `check:online` — upewnij się, że `tsc`+`eslint`+`vitest` są required checks na PR do `main`. | **S** |
| P3-4 | **Wielojęzyczność „na serio" (jeśli cel biznesowy).** Klucze `auto.xxx_NNN` są nieutrzymywalne — przejście na semantyczne klucze + realny pipeline tłumaczeń (de/en). Duży, osobny projekt. | **XL** |
| P3-5 | **Onboarding nowego developera/agenta.** `AGENTS.md` (24 KB) jest bogate, ale rozproszone. Jeden `docs/START-HERE.md`: „zbuduj, odpal, gdzie co jest, czego nie ruszać". | **M** |
| P3-6 | **CDN w runtime na landingu.** ⚠️ **ODKRYTE 2026-07-22:** `useLandingAssets.ts` ładuje `unpkg.com/lucide@latest` + Google Fonts w runtime. `@latest` = niepinowana zależność zewnętrzna (ryzyko supply-chain + zmiana wyglądu bez commita) i dodatkowy round-trip. Rozważ zbundlowanie ikon (paczka npm) lub przynajmniej pin wersji + SRI. | **M** |

---

## 3. Rekomendowana pierwsza sesja (gdybym miał zacząć jutro)

1. **P0-1..P0-4** — jeden PR „chore: repo hygiene". ~1 h, natychmiast czyste repo. Zero ryzyka dla kodu.
2. **P1-1 (splash)** — jeden mały PR, odczuwalny dla każdego użytkownika.
3. **P2-1 (rename Pixi)** — osobny mechaniczny PR, gdy P0 domknięte. Po nim baza jest szczera nazewniczo.

Reszta (P2-4 dokumentacja domeny, P3) to praca ciągła — rób po jednym ADR / jednym budżecie na sesję.

---

## 4. Czego świadomie NIE zmieniać

- **Ręczne chunki i lazy-loading** w `vite.config.ts` — są przemyślane i skomentowane.
- **Format `.dinboard` + migration registry** — działa, ma testy round-trip. Nie dotykać bez migracji.
- **14 reguł walidacji, jeden plik na regułę** — to dobra architektura, nie „za dużo plików".
- **Cache PWA `CacheFirst` dla SVG modułów** — celowe, udokumentowane w AGENTS.md.

---

*Ten plik to migawka na 2026-07-22. Zaznaczaj `[x]` przy zrobionych pozycjach i dopisuj commit/notę,
tak jak w `zadania do naprawy.md`.*
