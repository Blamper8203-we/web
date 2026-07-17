import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke tras publicznych — realna przeglądarka (Chromium) w miejsce HTTP-fetch
 * z scripts/online-smoke.mjs. Łapie to, czego jsdom/HTTP nie złapie:
 * runtime JS errors, brak mountu Reacta, zepsute preloady chunków.
 *
 * Trasy zgodne z SPA_ROUTES w scripts/online-smoke.mjs + dwie legal/blog.
 * /app jest świadomie pominięte tutaj (wymaga setupu onboarding/localStorage) —
 * patrz core-flow.spec.ts.
 */

// Krytyczne błędy konsoli, które powinny failować test. Ostrzeżenia zostawiamy
// (np. React Router future flags, deprecation) — to osobny sygnał.
const FAIL_ON_CONSOLE_PATTERNS: RegExp[] = [
  /Uncaught/i,
  /NotImplemented/i,
  /Failed to fetch dynamically import/i,
];

function attachConsoleGate(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (FAIL_ON_CONSOLE_PATTERNS.some((re) => re.test(text))) {
        errors.push(text);
      }
    }
  });
  page.on("pageerror", (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return errors;
}

const ROUTES = [
  { url: "/", name: "landing" },
  { url: "/polityka-prywatnosci", name: "privacy" },
  { url: "/regulamin", name: "terms" },
  { url: "/kontakt", name: "contact" },
  { url: "/o-nas", name: "about" },
  { url: "/poradniki", name: "blog-index" },
];

for (const route of ROUTES) {
  test(`route ${route.name} (${route.url}) mounts without runtime errors`, async ({ page }) => {
    const errors = attachConsoleGate(page);

    const response = await page.goto(route.url);
    expect(response?.status(), `HTTP status for ${route.url}`).toBeLessThan(400);

    // #root musi być obecny (SSG-renderowany shell) i niepusty po hydratacji.
    const root = page.locator("#root");
    await expect(root, "#root exists").toBeAttached();
    // Dajemy chwilkę na hydratację Reacta — czekamy aż root nabędzie children.
    await expect
      .poll(async () => await root.evaluate((el) => el.children.length), { timeout: 10_000 })
      .toBeGreaterThan(0);

    // Koniec testu — sprawdzamy zebrane błędy konsoli.
    expect(errors, `console errors on ${route.url}`).toEqual([]);
  });
}

test("manifest.webmanifest is a valid PWA manifest with /app start_url", async ({ request }) => {
  // Nadbudowa nad expectManifest z scripts/online-smoke.mjs — pinujemy kontrakt
  // PWA, bo jest częścią wartości produktu (instalacja przez przeglądarkę).
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.start_url).toBe("/app");
  expect(manifest.display).toBe("standalone");
  expect(Array.isArray(manifest.icons)).toBe(true);
  expect(manifest.icons.length).toBeGreaterThan(0);
});
