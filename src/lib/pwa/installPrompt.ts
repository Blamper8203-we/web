/**
 * Detekcja możliwości instalacji PWA (Add to Home Screen).
 *
 * Warstwa lib — czysta logika, bez React, bez DOM-effects. Testowalna
 * w Vitest/jsdom przez mocki `window.matchMedia` i `navigator.userAgent`.
 *
 * Dlaczego to jest osobny plik (a nie inline w hooku):
 * - zasada warstw z AGENTS.md: `lib/` liczy, `hooks/` orkiestrują stan.
 * - logika detekcji ma nieprzyjemne przypadki brzegowe (iOS nie wspiera
 *   `beforeinstallprompt`, iPad w trybie desktop, UA-snip Firefox na iOS),
 *   które chcemy pokryć testami jednostkowymi w izolacji.
 */

/**
 * Zdarzenie `beforeinstallprompt` — TS nie zna go natywnie w lib.dom.d.ts.
 *
 * Definicja zgodna ze specyfikacją:
 * https://web.dev/articles/customize-install
 * Pole `userChoice` jest Promise, który rozwiązuje się po decyzji użytkownika
 * (przed lub po zamknięciu natywnego prompta).
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

export type InstallPlatform = "ios" | "android" | "desktop" | "other";

/**
 * Czy aplikacja działa już w trybie standalone — czyli została zainstalowana
 * (PWA na ekranie głównym /.desktop PWA / Capacitor).
 *
 * Dwa sygnały:
 * 1. `matchMedia('(display-mode: standalone)')` — standard W3C, działa na
 *    Android Chrome, Edge desktop, Firefox.
 * 2. `(navigator as any).standalone === true` — iOS Safari private flag,
 *    bo iOS nie raportuje `display-mode: standalone` mimo instalacji.
 *
 * SSR-safe: na serwerze `window` nie istnieje → zwraca false.
 */
export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (typeof window.matchMedia === "function") {
      if (window.matchMedia("(display-mode: standalone)").matches) return true;
      // WHY: `display-mode: minimal-ui` / `window-controls-overlay` też oznaczają
      // zainstalowaną PWA (użytkownik może wybrać te tryby w display_override).
      if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
      if (window.matchMedia("(display-mode: window-controls-overlay)").matches) {
        return true;
      }
    }
  } catch {
    // jsdom / starsze przeglądarki mogą rzucić przy nieznanym media query.
  }
  // WHY: iOS Safari legacy flag — jedyny sygnał instalacji na iPhone.
  // Kastujemy na any celowo (flaga nie jest w typach lib.dom.d.ts).
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

/**
 * Czy urządzenie to prawdopodobnie iOS (iPhone / iPad / iPod) w przeglądarce.
 *
 * UWAGA: nazwa mówi "Ios" a nie "IosSafari", bo na iOS **żadna** przeglądarka
 * (Safari, Chrome iOS, Firefox iOS) nie wspiera `beforeinstallprompt` — każda
 * używa ręcznego "Share → Dodaj do ekranu początkowego". Więc dla każdej z nich
 * pokazujemy overlay z instrukcją.
 *
 * Dwa case'y UA:
 * - klasyczny: `/iPad|iPhone|iPod/.test(userAgent)`
 * - iPadOS 13+ udaje macOS desktop: `platform === 'MacIntel'` + `maxTouchPoints > 1`
 *
 * SSR-safe: na serwerze zwraca false.
 */
export function isProbablyIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // WHY: Apple zmienił UA iPada (iPadOS 13+) na desktopowy macOS, ale zostawił
  // maxTouchPoints > 1 — jedyny pewny sygnał "to dotykowy iPad, nie Mac".
  if (navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1) {
    return true;
  }
  return false;
}

/**
 * Rozpoznaje platformę instalacyjną na podstawie UA + feature detection.
 *
 * Używane przez UI do decyzji, jaką ścieżkę instalacji pokazać:
 * - `ios` → overlay z instrukcją "Share → Dodaj do ekranu początkowego"
 * - `android` / `desktop` → czekamy na `beforeinstallprompt`, pokazujemy
 *   natywny prompt przez `deferredEvent.prompt()`
 * - `other` → niewspierana przeglądarka (rzadkie), nie pokazujemy przycisku
 */
export function detectInstallPlatform(): InstallPlatform {
  if (isProbablyIos()) return "ios";
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/Android/.test(ua)) return "android";
  // WHY: Desktop vs other — rozróżniamy Windows/macOS/Linux od reszty,
  // bo na desktopie Chrome/Edge/Brave wspierają instalację PWA.
  if (/Windows|Macintosh|Linux x86|Mac OS X/.test(ua)) return "desktop";
  return "other";
}

/**
 * Czy w ogóle warto pokazywać jakikolwiek przycisk instalacji na tej
 * platformie. false gdy: już standalone (zainstalowane) LUB platforma
 * całkowicie niewspierana.
 *
 * Uwaga: to NIE sprawdza, czy `beforeinstallprompt` już odpalił — to sprawdza
 * tylko czy platforma *potencjalnie* wspiera instalację. Faktyczną gotowość
 * na Android/desktop potwierdza hook `usePwaInstall` przez nasłuchiwanie eventu.
 */
export function canShowInstallButton(platform: InstallPlatform): boolean {
  if (isStandaloneMode()) return false;
  // WHY: pokazujemy przycisk na iOS (instrukcja), Android (prompt) i desktop
  // (prompt). `other` (np. KaiOS, smart TV) — ukrywamy, bo i tak nie zadziała.
  return platform === "ios" || platform === "android" || platform === "desktop";
}
