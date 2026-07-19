import { useCallback, useRef } from "react";
import { computePinchTransform, midpoint, touchDistance } from "../../lib/pinchMath";

/**
 * Pinch-to-zoom + pan dwoma palcami dla canvasa połączeń (rozdzielnica,
 * widok drutowania).
 *
 * Reuse istniejących `viewport`/`setViewport` z `useConnectionsViewport` —
 * nowy gest to tylko nowa ścieżka wejścia do tego samego stanu viewportu
 * co kółko myszy i przyciski +/- w `SchematicZoomDock`. Matematyka zoomu
 * (zakotwiczenie w środku palców, translacja dwoma palcami, clamp do
 * min/max) jest identyczna z `useDinRailPinch` i `useSchematicPinch` —
 * obie korzystają z `computePinchTransform` z `lib/pinchMath`.
 *
 * `pinchActiveRef` jest przekazywany do `useConnectionsMutations`, który
 * pomija pointer-handlery (pan / draw / drag-handle / drag-segment)
 * podczas aktywnego pinch — w przeciwnym razie pointerdown wywołany
 * po touchstart (Chrome / Safari zachowują kolejność: touch → pointer)
 * wszedłby w tryb rysowania lub pan w trakcie trwającego pinch.
 */

// WHY: identyczne limity co `useConnectionsViewport.zoomAround`
// (useConnectionsViewport.ts:62-83: `Math.min(Math.max(prev.zoom * factor, 0.05), 4.0)`).
// Wymuszamy tu te same wartości, żeby pinch i wheel działy do tych samych
// granic — user nie wjedzie pinchem poza widełki, w które wheel go nie wpuści.
const MIN_SCALE = 0.05;
const MAX_SCALE = 4.0;

export interface Viewport {
  zoom: number;
  pan: { x: number; y: number };
}

export function useConnectionsPinch({
  svgRef,
  viewport,
  setViewport,
  resetZoom,
}: {
  /**
   * Ref do elementu <svg>, na którym nasłuchujemy touch events. Używamy
   * `getBoundingClientRect()` do zamiany `clientX/Y` (ekran) na współrzędne
   * viewportowe (relatywne do SVG).
   */
  svgRef: React.RefObject<SVGSVGElement | null>;
  /**
   * Aktualny stan viewportu. W odróżnieniu od `useDinRailPinch` (który
   * trzyma scale/pan w osobnych refach), tu przekazujemy viewport jako
   * całość — identycznie z `useSchematicPinch` i `useConnectionsViewport`.
   * Powoduje to re-bind callbacków przy każdej zmianie viewport, ale to
   * nie jest problem: `onTouchStart` i tak jest wywoływany tylko raz na
   * gest, a w trakcie gestu viewport i tak się zmienia.
   */
  viewport: Viewport;
  /**
   * Setter stanu z `useConnectionsViewport`. Akceptuje partial update,
   * więc w `onTouchMove` przekazujemy pełny nowy obiekt viewportu.
   */
  setViewport: React.Dispatch<React.SetStateAction<Viewport>>;
  /**
   * Reset zoom - wywoływany przy double-tap
   */
  resetZoom: () => void;
}) {
  const pinchActiveRef = useRef(false);

  // Stan gestu trzymany w ref — aktualizacja viewportu idzie przez
  // setViewport, który re-renderuje Canvas. Nie chcemy re-renderu na
  // każdy ruch palca (touchmove fire'uje 60+ razy/s), więc setViewport
  // wywołujemy z pełnym obiektem a ref trzyma tylko niezmienniki gestu.
  //
  // WHY: initialScale/Pan są ZAMROŻONE na starcie gestu (onTouchStart)
  // i NIGDY nie aktualizowane w onTouchMove. Bez tego każdy kolejny
  // move mnożyłby zoom przez ratio względem poprzedniego stanu zamiast
  // startu gestu — zoom kumulowałby się super-eksponencjalnie (jazda
  // bez trzymanki). Regresja: zob. test useConnectionsPinch.test.ts
  // "REGRESJA: wiele onTouchMove z tą samą odległością NIE kumuluje zoomu".
  const gestureRef = useRef<{
    initialDistance: number;
    initialMidX: number;
    initialMidY: number;
    initialScale: number;
    initialPanX: number;
    initialPanY: number;
  } | null>(null);

  // Konwersja clientX/clientY → viewport coords (relatywnie do SVG).
  // Identyczny wzorzec jak w useDinRailPinch.toViewport i
  // useSchematicPinch.toCanvasPoint.
  const toViewport = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: clientX, y: clientY };
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, [svgRef]);

  const lastTapTime = useRef(0);

  const onTouchStart = useCallback((event: React.TouchEvent<SVGSVGElement>) => {
    if (event.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        resetZoom();
      }
      lastTapTime.current = now;
      return;
    }
    if (event.touches.length !== 2) {
      return;
    }
    const t1 = event.touches[0];
    const t2 = event.touches[1];
    if (!t1 || !t2) {
      return;
    }
    event.preventDefault();

    const p1 = toViewport(t1.clientX, t1.clientY);
    const p2 = toViewport(t2.clientX, t2.clientY);
    const mid = midpoint(p1.x, p1.y, p2.x, p2.y);

    gestureRef.current = {
      initialDistance: touchDistance(p1.x, p1.y, p2.x, p2.y),
      initialMidX: mid.x,
      initialMidY: mid.y,
      // WHY: zamrażamy snapshot viewportu na starcie gestu — zoom ma być
      // liniowy względem startowej odległości palców, nie kumulatywny.
      initialScale: viewport.zoom,
      initialPanX: viewport.pan.x,
      initialPanY: viewport.pan.y,
    };
    pinchActiveRef.current = true;
  }, [toViewport, viewport.pan.x, viewport.pan.y, viewport.zoom, resetZoom]);

  const onTouchMove = useCallback((event: React.TouchEvent<SVGSVGElement>) => {
    if (event.touches.length !== 2 || !gestureRef.current) {
      return;
    }
    const t1 = event.touches[0];
    const t2 = event.touches[1];
    if (!t1 || !t2) {
      return;
    }
    event.preventDefault();

    const p1 = toViewport(t1.clientX, t1.clientY);
    const p2 = toViewport(t2.clientX, t2.clientY);
    const mid = midpoint(p1.x, p1.y, p2.x, p2.y);
    const distance = touchDistance(p1.x, p1.y, p2.x, p2.y);

    const result = computePinchTransform(
      {
        initialScale: gestureRef.current.initialScale,
        initialPanX: gestureRef.current.initialPanX,
        initialPanY: gestureRef.current.initialPanY,
        initialDistance: gestureRef.current.initialDistance,
        initialMidX: gestureRef.current.initialMidX,
        initialMidY: gestureRef.current.initialMidY,
      },
      {
        currentMidX: mid.x,
        currentMidY: mid.y,
        currentDistance: distance,
        minScale: MIN_SCALE,
        maxScale: MAX_SCALE,
      },
    );

    setViewport({
      zoom: result.scale,
      pan: { x: result.panX, y: result.panY },
    });
  }, [setViewport, toViewport]);

  const onTouchEnd = useCallback((event: React.TouchEvent<SVGSVGElement>) => {
    // Reset gestu dopiero gdy wszystkie palce zejdą — jeśli user odczepi
    // jednego z dwóch, zostaje mu 1-palcowa interakcja (pointer events).
    if (event.touches.length === 0) {
      gestureRef.current = null;
      pinchActiveRef.current = false;
    }
  }, []);

  return {
    pinchActiveRef,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
