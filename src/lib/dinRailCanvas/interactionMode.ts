/**
 * Tryb interakcji na canvasie szyny DIN.
 *
 * WARSTWA: `lib/` — czysta logika decyzyjna, bez DOM. Zgodnie z AGENTS.md
 * (Layer discipline): komponenty/hooki zaglądają tu, nie implementują sami.
 *
 * Model interakcji DIN rail:
 *  - `select` — jeden palec/lewy przycisk = zaznaczanie ramkowe (rubber-band).
 *    Domyślnie na desktop.
 *  - `pan` — jeden palec = przesuwanie widoku. Środek myszy zawsze pan
 *    (zachowanie desktop). Na mobile: domyślnie pan (toggle w toolbarze).
 *
 * Pinch (2 palce) jest obsługiwany oddzielnie przez useDinRailPinch i nie
 * przechodzi przez tę funkcję — tu decydujemy tylko o pojedynczym wskazaniu.
 */
export type DinRailInteractionMode = "select" | "pan";

/**
 * Rozstrzyga tryb interakcji dla pojedynczego pointerdown.
 *
 * Reguły (kolejność = priorytet):
 * 1. Środek myszy (button === 1) → zawsze `pan` (desktop shortcut, bez zmian).
 * 2. Mobile + panModeEnabled → `pan` (jeden palec przesuwa widok).
 * 3. W innych przypadkach → `select` (zachowanie dotychczasowe):
 *    - desktop lewy przycisk (toggle panMode jest ignorowany na desktop).
 *    - mobile z wyłączonym toggle.
 */
export function resolveInteractionMode(
  panModeEnabled: boolean,
  isMobile: boolean,
  button: number,
): DinRailInteractionMode {
  // Środek myszy — zawsze pan, niezależnie od platformy/toggle.
  if (button === 1) {
    return "pan";
  }

  // Mobile z włączonym toggle — pan jednym palcem.
  if (isMobile && panModeEnabled) {
    return "pan";
  }

  // Default: zaznaczanie ramkowe (lewy przycisk na desktop, mobile bez toggle).
  return "select";
}
