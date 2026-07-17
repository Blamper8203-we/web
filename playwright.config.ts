import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config for DINBoard Web.
 *
 * WHY preview (not dev): E2E testujemy dystrybuowany artefakt — SSG-built dist/,
 * ten sam który trafia na Vercel i do Tauri/Capacitor. Dev-server (HMR, middleware
 * modułów) ukryłby regresje build/SSG. To zgodne z konwencją scripts/online-smoke.mjs,
 * który też serwuje dist/ na porcie 4173.
 *
 * WHY chromium-only: najmniejszy footprint, wystarcza do PWA smoke. Firefox/WebKit
 * dodajemy gdy pojawią się bug-raporty specyficzne dla tych przeglądarek.
 * Cross-platform (Tauri/Capacitor) testujemy osobno, nie w Playwright.
 *
 * `reuseExistingServer: !CI` — na local odpala npm run preview obok istniejącego,
 * na CI zawsze startuje świeże. Wymaga `npm run build` przed `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // WHY workers: 1 zawsze: wszystkie spec uderzają w jeden preview serwer
  // (single-threaded vite preview). 4 workery równolegle wywołują flakiness
  // przy lazy-loadzie ciężkich chunków (PDF). E2E i tak trwa ~20s — brak
  // parallelizmu jest akceptowalny za pewność determinizmu.
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    // WHY localhost (nie 127.0.0.1): na Windows vite preview nasłuchuje tylko
    // na IPv6 ::1 rozwiązywanym z "localhost"; 127.0.0.1 (IPv4) nie odpowiada.
    // Na CI Linux localhost resolve'uje się do 127.0.0.1 i też działa.
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Akcje nie powinny czekać w nieskończoność — domyślny 30s to za długo dla
    // lokalnej maszyny; 15s wystarcza i szybciej failuje.
    actionTimeout: 15_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run preview",
    // `url` służy jednocześnie jako baseURL-origin i health-check endpoint —
    // Playwright czeka aż ten URL odpowiada zanim puści testy. Nie podajemy `port`,
    // bo Playwright 1.61 traktuje `port` i `url` jako wzajemnie wykluczające.
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    cwd: process.cwd(),
  },
});
