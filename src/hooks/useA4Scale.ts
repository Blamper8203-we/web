import { useEffect, useRef } from "react";

/**
 * Automatyczne skalowanie A4 do szerokości wrappera.
 *
 * Dlaczego ResizeObserver a nie container queries:
 * Container queries (`100cqw` + `container-type: inline-size`) potrafią
 * nie reagować w edge cases (parent flex/grid shrink, dynamic padding,
 * niektóre starsze mobile browsers). ResizeObserver daje pewność
 * działania wszędzie i jest trywialny do debugowania.
 *
 * Użycie:
 *   const wrapperRef = useA4Scale<HTMLDivElement>();  // portrait default
 *   const wrapperRef = useA4Scale<HTMLDivElement>(297);  // landscape
 *   return <div ref={wrapperRef} className="a4-page-wrapper">...</div>
 *
 * Wrapper MUSI mieć `width: 100%` i `aspect-ratio` zgodny z orientacją:
 *  - portrait:  aspect-ratio: 210 / 297
 *  - landscape: aspect-ratio: 297 / 210
 * Dzięki temu height wrappera odpowiada przeskalowanej wysokości strony.
 *
 * Hook ustawia CSS variable `--a4-scale` na wrapperze. Dzieci `.a4-page`
 * wewnątrz używają `transform: scale(var(--a4-scale))` do wizualnego
 * dopasowania zachowując naturalne wymiary (210×297mm lub 297×210mm).
 *
 * 1mm w CSS pixels (96dpi baseline): 96 / 25.4 = 3.7795...
 *
 * @param baseWidthMm  Szerokość bazowa strony A4 w milimetrach.
 *   - 210 dla A4 portrait (domyślne)
 *   - 297 dla A4 landscape
 */
export function useA4Scale<T extends HTMLElement>(baseWidthMm: 210 | 297 = 210) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const baseWidthPx = baseWidthMm * (96 / 25.4);

    const update = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      // Na PC wrapper bywa szerszy niż 210mm (canvas-area > 1200px), co
      // dawałoby scale > 1 i wizualnie "przybliżało" stronę. Dokumenty A4
      // powinny wyglądać jak w rzeczywistości — nigdy nie powiększamy
      // ponad naturalną wielkość. Na mobile scale < 1 (pomniejszenie),
      // na PC scale = 1 (naturalna wielkość, biały margines po bokach).
      const scale = Math.min(width / baseWidthPx, 1);
      el.style.setProperty("--a4-scale", String(scale));
    };

    update();

    // ResizeObserver — reaguje na zmianę szerokości wrappera.
    if (typeof ResizeObserver !== "function") {
      // Fallback dla środowisk bez ResizeObserver (np. jsdom w testach).
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseWidthMm]);

  return ref;
}
