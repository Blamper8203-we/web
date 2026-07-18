import { test, expect } from "@playwright/test";

/**
 * Pinuje że publiczne linki nawigacyjne (header + footer) działają end-to-end.
 *
 * Uwaga o tekstach: link do /poradniki ma widoczny tekst "Baza wiedzy" (header,
 * LandingHeader.tsx:28-33) lub "Kompendium" (footer, LandingFooter.tsx:27) — NIE
 * "Poradniki". Link /kontakt istnieje TYLKO w footerze (header go nie ma). Matchujemy
 * po rolach (getByRole link + name) + atrybucie href, nie po polskim słowie.
 *
 * Wszystkie linki to plain <a> (pełny reload, nie SPA transition) — patrz
 * raport eksploracji. Dlatego waitForURL po clicku, nie oczekujemy client-side.
 */

test("landing header link 'Baza wiedzy' navigates to /poradniki", async ({ page }) => {
  await page.goto("/");
  // Header jest w PublicLandingPage.tsx:43, nav w LandingHeader.tsx:25.
  const link = page.getByRole("link", { name: "Baza wiedzy" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "/poradniki");

  await link.click();
  await page.waitForURL("**/poradniki");
  // BlogIndex (BlogIndex.tsx) renderuje listę artykuli — pinujemy że coś się
  // pojawiło po pełnym reloadzie (nie blank page).
  await expect(page.locator("#root")).not.toBeEmpty();
});

test("landing footer link 'Kompendium' navigates to /poradniki", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Kompendium" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "/poradniki");

  await link.click();
  await page.waitForURL("**/poradniki");
  await expect(page.locator("#root")).not.toBeEmpty();
});

test("landing footer link 'Kontakt' navigates to /kontakt", async ({ page }) => {
  // Testujemy poprawność linku kontakt w stopce.
  await page.goto("/");
  const link = page.getByRole("contentinfo").getByRole("link", { name: "Kontakt" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "/kontakt");

  await link.click();
  await page.waitForURL("**/kontakt");
  // ContactPage renderuje formularz — pinujemy że strona się wyrenderowała.
  await expect(page.locator("#root")).not.toBeEmpty();
});

test("landing footer legal links are reachable (privacy + terms)", async ({ page }) => {
  // Szybki sanity check że legalne strony (renderowane też przez SSG) linkują
  // poprawnie z footera — to część zaufania RODO.
  //
  // Uwaga o tekstach: i18n key landing.footer.privacy -> "Polityka prywatności",
  // landing.footer.terms -> "Warunki korzystania" (NIE "Regulamin" — mimo że URL
  // to /regulamin). Matchujemy po realnym widocznym tekście, nie po polskim
  // słowie klucza. src/locales/pl/translation.json:722-723.
  await page.goto("/");

  for (const [name, path] of [
    ["Polityka prywatności", "/polityka-prywatnosci"],
    ["Warunki korzystania", "/regulamin"],
  ] as const) {
    const link = page.getByRole("link", { name, exact: true }).first();
    await expect(link).toHaveAttribute("href", path);
    await Promise.all([page.waitForURL(`**${path}`), link.click()]);
    await expect(page.locator("#root")).not.toBeEmpty();
    await page.goto("/");
  }
});
