# Plan dystrybucji DINBoard v1.0

Data: 2026-06-20
Status: wstępny szkielet do dyskusji
Autor: Mavis (mavis, root session mvs_b91deb7138064201bdf35e46e8d67734)

## Kontekst

DINBoard to narzędzie dla elektryków do projektowania rozdzielnic, generowania
schematów, walidacji i eksportu PDF dokumentacji wymaganej przez PN-HD 60364.
Początkowo pisanie dla własnej praktyki (user-developer), ale rozszerza target
na innych elektryków — dystrybucja publiczna v1.0.

### Stos technologiczny
- TypeScript + React 19 + Vite 8
- Tauri 2 (desktop: Windows / macOS / Linux)
- Capacitor (iOS + Android, w trakcie budowy)
- VitePWA (PWA web build)
- Pixi.js (canvas DIN rail)
- Vitest + jsdom (testy)

### Platformy docelowe v1.0
| Platforma | Status | Format dystrybucji |
|-----------|--------|--------------------|
| Web (PWA) | działa | URL, instalacja przez przeglądarkę |
| Desktop Windows | działa | Tauri MSI / NSIS installer |
| Desktop macOS | do zbudowania | Tauri DMG |
| Desktop Linux | do zbudowania | AppImage / deb |
| iOS | w budowie | App Store (Capacitor) |
| Android | w budowie | Play Store (Capacitor) |

## Gwarancja kompatybilności: ten sam plik `.dinboard` na każdej platformie

Rdzeń wartości DINBoard: elektryk zaczyna projekt na desktop w biurze,
edituje na telefonie na budowie, pokazuje PDF klientowi na tablecie.
**Ten sam plik, identyczna zawartość, identyczne wyniki.**

### Mechanizmy kompatybilności (już wdrożone)
- `isNativePlatform()` w `moduleCatalog.ts:824-829` i `useProjectActions.ts` — branch logiki per platforma
- `import.meta.env.DEV` w `moduleCatalog.ts:827` — dev-only hacki odcięte od produkcji
- `projectFile.ts` — format pliku niezależny od platformy
- `useDebouncedPersist.ts` — autosave działa na każdej platformie

### Macierz testów kompatybilności (wymagana przed każdym wydaniem)
| Test | Cel |
|------|-----|
| Round-trip: web → Tauri → web | Plik otwarty na dwóch platformach = identyczny |
| Round-trip: PWA → Capacitor → PWA | j.w. dla mobile |
| Drag modułu z palety: desktop Chrome vs iPhone Safari | Polyfill `mobile-drag-drop` nie psuje desktop |
| `useProjectActions` storage path: web vs Tauri | Nie pisze do różnych miejsc |
| Pixi `devicePixelRatio`: retina iPhone (3) vs Android (2.5) vs desktop (1-2) | Brak rozmazania canvasu |
| Touch gestures (pinch, double-tap) na Capacitor vs przeglądarka | Identical UX |
| PWA service worker vs Tauri native assets | Synchronizacja cache SVG modułów |

### Znane pułapki do monitorowania
- **Storage**: PWA Safari ma ITP czyszczący `localStorage` po 7 dniach — `IndexedDB` bezpieczniejszy
- **Pixi**: Capacitor WebView ≠ dokładnie Chrome — testować na realnym urządzeniu
- **Polyfill DnD**: `mobile-drag-drop` w `main.tsx` może konfliktować z natywnym DnD na desktop — warunkować ładowanie
- **Service worker vs Tauri**: PWA `CacheFirst` 30-dniowy vs Tauri asset pipeline — wspólna wersja assetów

---

## MUST — przed publicznym wydaniem v1.0

### 1. Wersjonowanie pliku `.dinboard` + migracje

**Dlaczego krytyczne:** Każdy zapis projektu ma `version`. Klient z v2.5 otwiera
plik z v3.0 — migrator musi działać bezgłośnie. Brak wersjonowania = utrata danych
klienta przy aktualizacji.

**Pliki:**
- `src/lib/projectFile.ts` (główna implementacja)
- `src/types/symbolItem.ts` (kontakt z typem symbolu)
- `src/hooks/useProjectActions.ts` (wywołanie save/load)
- nowy: `src/lib/projectFile/migrations/v2-to-v3.ts` (kolejne pliki migracji)
- nowy: `src/lib/projectFile/migrations/index.ts` (registry migracji)

**Definition of Done:**
- Każdy zapis projektu zawiera pole `version: "X.Y"`
- `loadProject()` czyta wersję i wywołuje łańcuch migracji do aktualnej wersji
- Test round-trip dla każdej kombinacji: nowy→nowy, stary→nowy, nowy→stary, stary→stary
- Migracja nigdy nie gubi danych — dodaje pola domyślne, nigdy nie usuwa
- Coverage migracji ≥ 90%

**Czas:** 1-2 tygodnie

**Owner rein:** `project-io-expert`

### 2. Przyjazny error boundary + komunikaty w języku domeny

**Dlaczego krytyczne:** Dystrybucja = inni ludzie. `TypeError: Cannot read
properties of undefined` zamyka im apkę. Komunikaty muszą być w języku
elektryki ("Brak fazy L3 — czy podłączyć?") z akcjami odzyskiwania.

**Pliki:**
- `src/components/AppErrorBoundary.tsx` (główny boundary)
- `src/components/AppErrorBoundary.css` (style recovery UI)
- `src/lib/validation/**` (walidacja z komunikatami)
- każde `try { }` w `src/lib/` (sprawdzić catch)

**Definition of Done:**
- AppErrorBoundary łapie każdy crash i pokazuje recovery UI ("Odblokuj projekt",
  "Cofnij ostatnią zmianę", "Restart sesji")
- Walidacja pisze w języku domeny z akcjami ("Brak obwodu — czy dodać? [Dodaj] [Anuluj]")
- Brak stack trace w UI użytkownika, ale logowanie do konsoli dla developera
- Recovery zawsze oferuje conajmniej 1 akcję (nie "crash i umrzyj")

**Czas:** 1 tydzień

**Owner rein:** `developer` + `electrical-expert` (treść komunikatów)

### 3. Onboarding — pierwsze uruchomienie

**Dlaczego krytyczne:** Nowy użytkownik (inny elektryk) nie ma Twojej głowy
w kodzie. Pierwsze uruchomienie pustego projektu = "co ja mam z tym zrobić?".

**Pliki:**
- `src/components/App.tsx` (state.firstRun)
- `src/components/landing/` (reuse komponentów z landing page)
- nowy: `src/components/OnboardingOverlay.tsx`
- nowy: `src/components/EmptyState.tsx` (generyczny empty state)

**Definition of Done:**
- Nowy user bez projektu widzi jasny komunikat: "Stwórz nowy projekt [Nowy] [Otwórz]"
- Pusty canvas w DIN nie wygląda jak crash, ma placeholder z instrukcją
- Tutorial overlay przy pierwszym uruchomieniu (3-5 ekranów, prawdziwe dane, nie "kliknij tu")
- Empty state dla każdego z 4 (5 po dodaniu Teren) widoków
- Onboarding da się wyłączyć w ustawieniach (po którymś uruchomieniu)

**Czas:** 1 tydzień

**Owner rein:** `developer`

### 4. Tryb terenowy (mobile MVP)

**Dlaczego krytyczne:** Inny elektryk też stoi przy rozdzielnicy z telefonem.
Klient mówi "ten obwód ma być na 10A" — elektryk sięga po telefon, zmienia,
zapisuje. To jest codzienny use case. Bez tego DINBoard jest tylko desktopem
i nie konkuruje z kartką i ołówkiem na budowie.

**Pliki:**
- `src/components/AppSheetTabs.tsx` (dodanie 5. zakładki)
- nowy: `src/components/MobileFieldMode.tsx`
- nowy: `src/components/MobileFieldCircuitRow.tsx` (inline edit obwodu)
- `src/components/CircuitListPage.tsx` (reuse listy)
- `src/components/CircuitEditPanel.tsx` (reuse edycji)
- `src/hooks/useDebouncedPersist.ts` (autosave)
- `src/components/PdfPreviewWorkspace.tsx` (PDF read-only)

**Scope MVP (co w środku):**
- Lista obwodów z dużymi tap targetami (minimum 48×48 px)
- Inline edit: nazwa, amperaż, faza (L1/L2/L3), opis
- Autosave co 2-3 sekundy (wire do `useDebouncedPersist`)
- Read-only podgląd schematu i PDF
- Bottom navigation zamiast hamburger menu
- Filtry: "pokaż tylko moje obwody", "pokaż obwody > 16A"

**Scope out of MVP:**
- Paleta modułów (za dużo na telefonie)
- Drag & drop nowych modułów (Pixi + touch = za trudne)
- Precyzyjne pozycjonowanie na canvasie (za mała precyzja palców)
- Zmiana ilości modułów w rozdzielnicy (desktop only)

**Definition of Done:**
- Działa na iPhone Safari i Chrome Android (klasa A-series)
- Edit → save → reload na desktop widzi tę samą zmianę (round-trip mobile → desktop)
- Tap targets minimum 48×48 px (testowane w DevTools accessibility audit)
- Brak konfliktów touch/Pixi/DnD (testowane na realnym urządzeniu, nie w emulatorze)
- Autosave potwierdza zapis użytkownikowi (subtle indicator, nie modal)

**Czas:** 2-3 tygodnie

**Owner rein:** `developer` + `canvas-expert` (Pixi touch) + `electrical-expert` (walidacja inline)

### 5. Mobile responsiveness — realizacja planu z 9 czerwca

**Dlaczego krytyczne:** Bez tego tryb terenowy nie zadziała na telefonie.
Pięć problemów z `docs/MOBILE_RESPONSIVENESS_ANALYSIS.md`:
1. Scrollbary bez `overflow-y: auto` na `.canvas-area`, `.panel-content`
2. Konflikt `grid-template-rows` w `.main-content` na mobile
3. Znikający pasek statusu (`.workspace-hud--bottom-left`) bez zastępcy
4. Flyout menu na mobile — `top: 46px`, brak `max-height`/`overflow-y`, brak safe-area
5. Długie nazwy w sheet tabs nie skracane

**Plus wydajność Pixi:**
- `devicePixelRatio` cap (`Math.min(window.devicePixelRatio, 2)`)
- FPS measurement na realnym telefonie
- Texture atlas dla wielu modułów

**Pliki:**
- `src/App.css` (media queries dla 768px i mniejszych)
- `src/components/Responsive.css`
- `src/components/AppSheetTabs.css`
- `src/components/DinRailCanvas.tsx` (Pixi performance)
- `src/components/AppHeader.css` (flyout menu)

**Definition of Done:**
- 5 krytycznych problemów z analizy rozwiązanych
- FPS ≥ 30 na telefonie klasy A-series (Xiaomi, Samsung A-series) z 30+ modułami
- Pixi canvas bez rozmazania na retina iPhone (3× DPR)
- Brak layout shift przy obracaniu telefonu (portrait ↔ landscape)
- Testowane na iPhone SE (mały ekran) i iPhone 15 Pro (duży ekran)

**Czas:** 2 tygodnie

**Owner rein:** `canvas-expert` + `developer`

### 6. Wersja apki + About + Changelog

**Dlaczego krytyczne:** Dystrybucja wymaga widocznej wersji. Klient zgłasza
"v2.5 ma bug" — musisz wiedzieć o której wersji mówi.

**Pliki:**
- nowy: `src/components/AboutDialog.tsx`
- nowy: `CHANGELOG.md` (root, standard Keep a Changelog)
- `package.json` (pole `version`)
- `src-tauri/Cargo.toml` (wersja Rust side)

**Definition of Done:**
- Wersja z `package.json` wyświetlana w menu: "DINBoard v2.5.1"
- "Co nowego" otwiera changelog z ostatnich 5 wydań (markdown render)
- `CHANGELOG.md` w standardzie Keep a Changelog
- Każdy release ma wpis: data, lista zmian, link do issues
- Wersja wyświetlana też w publicLandingPage (footer)

**Czas:** 2-3 dni

**Owner rein:** `developer`

### 7. Pipeline dystrybucji

**Dlaczego krytyczne:** Bez tego nie ma wydania. Tauri build dla 3 OS, PWA
deploy, GitHub Releases z binarkami.

**Pliki:**
- `.github/workflows/release.yml` (nowy)
- `.github/workflows/ci.yml` (nowy lub rozbudowa)
- `vite.config.ts` (PWA build configuration)
- `src-tauri/Cargo.toml` (workspace)
- `capacitor.config.ts`
- `package.json` (scripts: `build:win`, `build:mac`, `build:linux`, `build:pwa`)

**Definition of Done:**
- `npm.cmd run build` produkuje Tauri installer dla Windows (MSI / NSIS)
- `npm.cmd run build:mac` (na Mac runnerze) produkuje DMG
- `npm.cmd run build:linux` produkuje AppImage / deb
- PWA buduje się i deployuje na Vercel/Netlify
- GitHub Actions buduje release automatycznie przy tagu `v*.*.*`
- Każdy release ma binarki dla 3 OS + PWA URL w opisie
- Podpisane binarki dla macOS (developer ID)

**Czas:** 1-2 tygodnie (w tym setup Mac/Linux runnerów)

**Owner rein:** `developer`

---

**Suma MUST:** ~7-10 tygodni przy ~20h/tydzień solo.

---

## SHOULD — przed pierwszymi płacącymi klientami (ale nie blokuje wydania v1.0)

### 8. Drukarka etykiet (Brother / Dymo / Zebra)

**Dlaczego ważne:** Elektryk musi oznaczyć każdy obwód naklejką na
rozdzielnicy. DINBoard zna już nazwy obwodów — brakuje tylko layoutu etykiety
i wysyłki do drukarki. Codzienna wartość, wyróżnia DINBoard z tłumu.

**Pliki:**
- nowy: `src/lib/export/labelPrinter.ts`
- nowy: `src/components/PrintLabelsDialog.tsx`
- opcjonalnie: integracja z Brother bPAC SDK / Dymo SDK / Zebra Browser Print

**Scope:**
- Layout etykiety per obwód (nazwa, amperaż, faza, opis)
- Wysyłka przez WebUSB (Chrome/Edge) lub Bluetooth (PWA na Android)
- Wsparcie przynajmniej jednego producenta na start (Brother P-touch rekomendowany)
- Preview przed drukiem

**Definition of Done:**
- Wydruk 10 etykiet z jednego projektu trwa < 30 sekund
- Obsługa przynajmniej Brother P-touch (najpopularniejsza w Polsce)
- Preview pokazuje dokładnie to co zostanie wydrukowane
- Brak błędów gdy drukarka niepodłączona (komunikat friendly)

**Czas:** 1-2 tygodnie

**Owner rein:** `developer`

### 9. Presety rozdzielnic

**Dlaczego ważne:** Dla mniej doświadczonych elektryków lub szybkiego
prototypu. "Mieszkanie 60m² 3-faza RCD 40A/30mA + 8 MCB" → wybieram,
dostosowuję, eksportuję. Obniża barierę wejścia.

**Pliki:**
- nowy: `src/lib/presets/` (JSON z presetami)
- nowy: `src/components/PresetsDialog.tsx`
- nowy: `src/lib/presets/builtinPresets.ts` (5-10 startowych)

**Scope:**
- 5-10 dobrych konfiguracji: mieszkanie 60m², mieszkanie 100m², dom 150m², biuro 100m², warsztat 1-faza, warsztat 3-faza, etc.
- Każdy preset: lista obwodów, dobór zabezpieczeń, schemat startowy
- Możliwość zapisania własnego presetu z bieżącego projektu

**Definition of Done:**
- 5 presetów dostępnych od razu po instalacji
- Każdy preset ma nazwę domenową ("Mieszkanie 60m² 3-faza") i opis
- Po wybraniu presetu użytkownik widzi kompletny projekt, może edytować
- Preset można zapisać z bieżącego projektu (użytkownik własny)

**Czas:** 1 tydzień

**Owner rein:** `electrical-expert` (treść presetów) + `developer`

### 10. Help system / FAQ w apce

**Dlaczego ważne:** Inny elektryk nie zna DINBoard. Bez helpa nie rozwiąże
prostego problemu i zrezygnuje. Help musi być kontekstowy (per widok).

**Pliki:**
- `src/components/HelpDialog.tsx` (masz bazę)
- nowy: `src/lib/helpContent.ts` (treść helpa per widok)
- nowy: `src/components/ContextualHelp.tsx` (ikona `?` per widok)

**Scope:**
- Help per widok (DIN, Schemat, Lista obwodów, PDF, Teren)
- FAQ z 20-30 najczęstszymi pytaniami
- Wyszukiwarka w helpie
- Link do pełnej dokumentacji (osobna strona lub PDF)

**Definition of Done:**
- Ikona `?` w każdym z 5 widoków, otwiera help kontekstowy
- FAQ z minimum 20 pytań (po polsku)
- Wyszukiwarka w helpie (full-text)
- Help offline (nie wymaga internetu)

**Czas:** 3-5 dni

**Owner rein:** `developer`

### 11. Testy E2E (Playwright)

**Dlaczego ważne:** Smoke test dla najważniejszych flow. Łapie regresje
które umykają testom jednostkowym. Przed każdym release.

**Pliki:**
- nowy: `e2e/` (katalog z testami)
- nowy: `playwright.config.ts`
- `.github/workflows/ci.yml` (dodanie E2E do pipeline)

**Scope:**
- Test 1: Otwórz → dodaj obwód → zmień amperaż → eksportuj PDF
- Test 2: Tryb terenowy → edytuj obwód → autosave → reload
- Test 3: Round-trip pliku między platformami

**Definition of Done:**
- Playwright skonfigurowany z headless mode
- Minimum 3 scenariusze E2E pokrywające core flow
- E2E uruchamia się w GitHub Actions przed release
- Raport z testów (HTML + JSON) w CI artifacts

**Czas:** 1 tydzień

**Owner rein:** `tester`

---

## NICE — po v1.0, roadmap v1.1+

### 12. Współdzielenie projektów (chmura)

**Dlaczego nice:** User-developer powiedział że nie czuje tego tematu.
Dystrybucja nie wymaga. Po v1.0 jeśli klienci poproszą.

**Kierunek:** Supabase / Firebase jako backend, sync między urządzeniami,
opcjonalny tryb "współpraca" z linkiem do zaproszenia.

**Czas:** 4-8 tygodni (duży feature)

### 13. Tryb recenzji klienta (komentarze bez edycji)

**Dlaczego nice:** Klient mówi "zmień obwód 5 na 10A". Zamiast nowego maila
— apka ma tryb komentarzy. Klik na obwód, komentarz, eksport jako raport.

**Czas:** 1-2 tygodnie

### 14. Eksport do EPLAN

**Dlaczego nice:** Branżowy standard w dużych firmach. Realna wartość
dla klientów enterprise. Wysoki effort.

**Czas:** 4-6 tygodni

### 15. Kalkulator doboru zabezpieczeń

**Dlaczego nice:** Elektryk wpisuje obciążenie + długość obwodu, apka
podpowiada MCB, przekrój, RCD. DINBoard ma już fragmenty tego (RCD,
fazy) — wymaga scalenia.

**Czas:** 2-3 tygodnie

---

## Sekwencja wykonania (kolejność rekomendowana)

Każdy krok buduje na poprzednim. Zmiana kolejności zwiększa ryzyko regresji.

```
1. Schema migration (1)
   ↓ bo każdy nowy feature psuje plik klienta bez migracji
2. Wersja + Changelog (6)
   ↓ tani framework do wydania
3. Error boundary (2)
   ↓ wszechobecny przy każdym nowym featurze
4. Onboarding (3)
   ↓ blokuje percepcję "produkt jest gotowy"
5. Tryb terenowy (4)
   ↓ rdzeń mobile MVP
6. Mobile responsiveness (5)
   ↓ tryb terenowy bez tego nie zadziała na telefonie
7. Pipeline dystrybucji (7)
   ↓ bez tego nie wydasz v1.0

   --- v1.0 RELEASE ---

8. Drukarka etykiet (8)
9. Presety (9)
10. Help system (10)
11. Testy E2E (11)
```

---

## Reguły dla agentów (reins) — obowiązkowe

Każdy rein implementujący feature w DINBoard musi sprawdzić te reguły:

1. **Audience test:** Czy inny elektryk (nie user-developer) zrozumie ten
   feature bez dodatkowego wyjaśnienia? Jeśli nie → uprościć lub dodać help.

2. **Empty state test:** Czy feature ma sensowny komunikat gdy projekt jest
   pusty / nie ma danych? Pusty canvas to nie crash.

3. **Cross-platform test:** Czy feature przejdzie macierz kompatybilności
   (round-trip web/desktop/mobile)? Szczególnie storage i canvas.

4. **Error friendly test:** Czy każdy możliwy błąd ma komunikat w języku
   domeny i akcję odzyskiwania? Brak stack trace w UI.

5. **Migration safety:** Czy zmiana w `projectFile.ts` lub `symbolItem.ts`
   jest kompatybilna wstecz? Czy migracja istnieje?

6. **Test stability:** Czy liczba testów rośnie, nie maleje? Czy
   `npm.cmd run test` przechodzi na czystym checkout?

7. **Bundle size:** Czy nowy feature nie dodaje > 50KB do bundla web?
   PWA ma limit cache.

8. **Accessibility:** Czy tap targets ≥ 48×48 px? Czy kolory mają kontrast
   WCAG AA? Czy klawiatura działa (Tab, Enter, Escape)?

---

## Definition of Done dla v1.0

Cały projekt przeszedł:

- [ ] `npm.cmd run check` (build + test) — zero błędów
- [ ] `npm.cmd run smoke:production` — smoke testy produkcyjne
- [ ] Macierz kompatybilności web/desktop/mobile — wszystkie testy green
- [ ] Test count ≥ 280 (baseline 249 + nowe testy)
- [ ] Round-trip test schema migration — wszystkie wersje przechodzą
- [ ] Bundle size PWA < 5 MB
- [ ] FPS ≥ 30 na telefonie klasy średniej z 30+ modułami
- [ ] Empty states dla każdego widoku
- [ ] Error boundary z recovery UI na każdym widoku
- [ ] Wersja apki widoczna w UI, CHANGELOG.md aktualny
- [ ] GitHub Actions buduje release dla 3 OS automatycznie
- [ ] Onboarding overlay dla nowego użytkownika
- [ ] Tryb terenowy z pełnym scope MVP
- [ ] 5 problemów mobile responsiveness rozwiązanych

---

## Otwarte pytania do usera-developera

- [ ] Mac build runner — masz dostęp do Mac w GitHub Actions? Czy potrzebujesz
      help z setup?
- [ ] Code signing dla macOS — czy masz Apple Developer ID?
- [ ] Distribution channel — tylko GitHub Releases, czy też własna strona
      z download mirror?
- [ ] App Store / Play Store — czy planujesz na v1.0, czy v1.1?
- [ ] Pierwsza grupa docelowa — polscy elektrycy (start), czy od razu EU?
- [ ] Pricing / licensing — darmowe, freemium, jednorazowa opłata? (ważne
      dla rozmów z przyszłymi klientami)

---

## Changelog tego dokumentu

- 2026-06-20 — utworzenie planu (mavis, sesja mvs_b91deb7138064201bdf35e46e8d67734)
