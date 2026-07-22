import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Granica mobile/desktop layoutu. Poniżej tej szerokości (włącznie)
 * traktujemy aplikację jako mobilną (ukrywamy panele, hamburger menu itp.).
 *
 * Trzymane jako jedna stała, żeby nie rozjeżdżało się z
 * `Responsive.css` (`@media (max-width: 768px)`),
 * `useSheetPanelState` (debounce 768) i `AppHeader` (useState window.innerWidth).
 */
export const MOBILE_MAX_WIDTH_PX = 768;

const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_MAX_WIDTH_PX}px)`;

function isNativePlatformNow(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return Capacitor.isNativePlatform();
  } catch {
    // Capacitor może rzucić, gdy plugin nie jest zarejestrowany w web.
    return false;
  }
}

/**
 * Czy aktualny viewport ma szerokość mobile (≤ 768px).
 *
 * - SSR-safe: na serwerze zwraca `false` (brak `window.matchMedia`).
 * - Reaguje na zmianę szerokości okna (obrót telefonu, resize okna, split-view).
 * - Brak hydration mismatch: na mobile klient zaczyna od `false` (jak SSR),
 *   po pierwszym `useEffect` synchronizuje się z prawdziwą szerokością.
 *
 * Wcześniej ta sama logika była rozrzucona w trzech miejscach:
 * - `AppHeader.tsx`: `useState(false) + useEffect(window.innerWidth <= 768)`
 * - `AppWorkspace.tsx`: inline `window.innerWidth <= 768` w callbackach (3×
 *   nie reagowało na resize — czytało tylko w momencie kliknięcia)
 * - `DinRailCanvas.tsx`: inline guard, usunięty po regresji
 *   (patrz `DinRailCanvas.mobileDragDrop.test.ts`)
 */
export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // WHY: jsdom i niektóre starsze przeglądarki nie mają window.matchMedia.
    // W takim środowisku hook pozostaje przy wartości początkowej (false),
    // a konsumenci mogą polegać na CSS media queries jako fallback.
    if (typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
    const update = () => {
      setIsMobile(mql.matches);
    };
    update();
    mql.addEventListener("change", update);
    return () => {
      mql.removeEventListener("change", update);
    };
  }, []);

  return isMobile;
}

/**
 * Czy aplikacja działa jako natywna platforma Capacitor (iOS / Android / Electron).
 *
 * - SSR-safe: na serwerze `false`.
 * - W runtime wartość się nie zmienia (Capacitor ustala to przy starcie aplikacji),
 *   więc po pierwszej synchronizacji w `useEffect` zwraca już stałą.
 */
export function useIsNativePlatform(): boolean {
  const [isNative, setIsNative] = useState<boolean>(false);

  useEffect(() => {
    setIsNative(isNativePlatformNow());
  }, []);

  return isNative;
}

/**
 * Czy aplikacja powinna renderować się w układzie mobilnym.
 * Prawda, gdy: platforma natywna (Capacitor) LUB wąski viewport (≤ 768px).
 *
 * Używane jako jeden source of truth dla mobile/desktop w komponentach,
 * które muszą wybrać inny markup dla małych ekranów (hamburger vs menu tekstowe,
 * BottomNav vs header, FAB vs sidebar itp.).
 */
export function useIsMobileLayout(): boolean {
  const isNative = useIsNativePlatform();
  const isMobileViewport = useIsMobileViewport();
  return isNative || isMobileViewport;
}
