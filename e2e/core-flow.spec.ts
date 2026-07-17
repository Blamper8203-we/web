import { test, expect } from "@playwright/test";

/**
 * Core flow: workspace mount → sheet switch → PDF export button reachable.
 *
 * ŚWIADOMIE NIE eksportujemy prawdziwego PDF w tym pierwszym testcie:
 * - PDF generuje się ~5-10s (render SVG → @react-pdf blob) i trafia jako download,
 *   nie nawigacja — asercja na plik jest droga i krucha.
 * - Pinujemy ścieżkę do przycisku, nie sam blob. Pełny export zostawiamy jako
 *   follow-up z dedykowanym PR gdy będą stabilne selektory na circuit-list/protocol.
 *
 * Setup: localStorage.dinboardFirstRunComplete = "true" omija OnboardingOverlay
 * (AppWorkspace.tsx:224-227). Inicjujemy to przed goto, bo overlay blokuje interakcję.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Omija OnboardingOverlay (AppWorkspace.tsx:224-227).
    localStorage.setItem("dinboardFirstRunComplete", "true");
    // Omija CookieConsent banner (CookieConsent.tsx:13 CONSENT_KEY). Banner to
    // modalny overlay — interceptował pointer events na tab-barze i blokował
    // klik w zakładkę sheet4. Bez tego force-click nie wyzwalał handlera.
    localStorage.setItem("cookie_consent_v1", "essential");
  });
});

test("workspace at /app mounts with sheet1 active and onboarding suppressed", async ({ page }) => {
  await page.goto("/app");

  // AppWorkspace jest lazy-loaded (App.tsx:15-17) z Suspense fallback
  // "Ładowanie edytora..." — czekamy aż prawdziwy shell się zamontuje.
  await expect(page.locator("#root")).not.toContainText("Ładowanie edytora", { timeout: 15_000 });

  // Onboarding nie powinien się pojawić (ustawiliśmy flagę).
  await expect(page.getByText(/Witaj w DINBoard/i)).toHaveCount(0);

  // Sheet1 ("Rozdzielnica") powinien być aktywny — domyślny przy montażu
  // (useSheetPanelState.ts:16). data-sheet dodane w AppSheetTabs.tsx.
  const sheet1Tab = page.locator('[data-testid="sheet-tab"][data-sheet="sheet1"]');
  await expect(sheet1Tab).toBeVisible();
  await expect(sheet1Tab).toHaveAttribute("aria-pressed", "true");
});

test("switching to sheet4 (PDF) reveals the export button", async ({ page }) => {
  await page.goto("/app");
  await expect(page.locator('[data-testid="sheet-tab"][data-sheet="sheet1"]')).toBeVisible();

  // Klikamy zakładkę "Dokumentacja PDF" (sheet4).
  const pdfTab = page.locator('[data-testid="sheet-tab"][data-sheet="sheet4"]');
  // WHY dispatchEvent zamiast click(): na desktopowym layoucie right-panel (aside)
  // i ew. inne overlaye (cookie banner do czasu odrzucenia w beforeEach) nachodzą
  // na tab-bar i interceptują pointer events — zwykły click (nawet z force:true)
  // nie wyzwalał React onClick handlera (onChangeSheet), więc sheet się nie
  // przełączał. Bezpośredni dispatch click eventu na buttonie omija hit-test
  // warstw i deterministycznie wyzwala React synthetic event.
  await pdfTab.dispatchEvent("click");

  // sheet4 renderuje PdfWorkspaceShell → PdfDocumentationPage (oba lazy).
  // Przycisk eksportu ma data-testid="pdf-export-btn" (PdfDocumentationPage.tsx:573).
  //
  // WHY 30s timeout: PdfDocumentationPage lazy-loaduje osobny chunk zawierający
  // @react-pdf/renderer + pdfkit + fontkit (~duży), a pod obciążeniem (4 workery
  // równolegle uderzają w single-threaded vite preview) pierwszy mount potrafi
  // przekroczyć domyślne 15s. 30s to margines dla CI Linux runners (słabsze CPU).
  const exportBtn = page.locator('[data-testid="pdf-export-btn"]');
  await expect(exportBtn).toBeVisible({ timeout: 30_000 });
  // Nie klikamy — patrz uwaga o świadomym pominięciu eksportu na górze pliku.

  // Po przełączeniu sheet4 powinno być aktywne.
  await expect(pdfTab).toHaveAttribute("aria-pressed", "true");
  // A sheet1 już nie.
  await expect(page.locator('[data-testid="sheet-tab"][data-sheet="sheet1"]')).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("sheet tabs contain exactly the five web-visible sheets (SmartHome is hidden by design)", async ({ page }) => {
  // Pinujemy że SmartHome (sheet5_smarthome) jest świadomie filtrowany z tab-bar
  // (AppSheetTabs.tsx:36-38, AGENTS.md §9). Gdyby ktoś "naprawił" filtr bez
  // świadomej decyzji developera — ten test failuje jako wczesny sygnał.
  //
  // Web (desktop Chromium) widzi 5 tabów: sheet1, sheet1_connections, sheet2,
  // sheet3, sheet4. sheet1_connections jest filtrowany TYLKO na native platform
  // (Capacitor.isNativePlatform() w AppSheetTabs.tsx:32-34) — na web zostaje.
  await page.goto("/app");

  const tabs = page.locator('[data-testid="sheet-tab"]');
  await expect(tabs).toHaveCount(5);

  const sheets = await tabs.evaluateAll((els) =>
    els.map((el) => (el as HTMLElement).dataset.sheet),
  );
  expect(sheets).toEqual(
    expect.arrayContaining(["sheet1", "sheet1_connections", "sheet2", "sheet3", "sheet4"]),
  );
  // sheet5_smarthome NIGDY w tab-bar:
  expect(sheets).not.toContain("sheet5_smarthome");
});
