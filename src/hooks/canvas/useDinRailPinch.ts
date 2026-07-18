import { useCallback, useRef } from "react";
import type { WorldPoint } from "../../lib/dinRailCanvas/types";
import { MAX_SCALE, MIN_SCALE } from "../../lib/dinRailCanvas/constants";
import { computePinchTransform, midpoint, touchDistance } from "../../lib/pinchMath";

/**
 * Pinch-to-zoom + pan dwoma palcami dla canvasa szyny DIN.
 *
 * Reuse istniejących `scaleRef`/`panRef`/`setScaleSafe`/`setPanSafe`
 * z `useDinRailViewport` — nowy gest to tylko nowa ścieżka wejścia do
 * tych samych setterów, więc matematyka zoomu pozostaje identyczna
 * jak przy kółku myszy i przyciskach +/-.
 *
 * `pinchActiveRef` jest przekazywany do `useDinRailInteraction`, który
 * pomija pointer-handlery (select/drag) podczas aktywnego pinch —
 * w przeciwnym razie pointerdown odpalony po touchstart wszedłby
 * w tryb zaznaczania ramką.
 */
export function useDinRailPinch({
  containerRef,
  scaleRef,
  panRef,
  setScaleSafe,
  setPanSafe,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scaleRef: React.MutableRefObject<number>;
  panRef: React.MutableRefObject<WorldPoint>;
  setScaleSafe: (nextScale: number) => void;
  setPanSafe: (nextPan: WorldPoint) => void;
}) {
  const pinchActiveRef = useRef(false);

  // Stan gestu trzymany w ref (jak w PinchZoomImage) — aktualizacja
  // viewportu idzie przez setScaleSafe/setPanSafe, które i tak batchują
  // przez requestAnimationFrame. Nie chcemy re-renderu na każdy ruch palca.
  //
  // WHY: initialScale/Pan są ZAMROŻONE na starcie gestu (onTouchStart) i
  // nigdy nie aktualizowane w onTouchMove. Bez tego każdy kolejny move
  // mnożyłby zoom przez ratio względem poprzedniego stanu zamiast startu
  // gestu — zoom kumulowałby się super-eksponencjalnie (jazda bez trzymanki).
  const gestureRef = useRef<{
    initialDistance: number;
    initialMidX: number;
    initialMidY: number;
    initialScale: number;
    initialPanX: number;
    initialPanY: number;
  } | null>(null);

  // Konwertuj clientX/clientY na viewport coords (relatywnie do containera).
  const toViewport = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: clientX, y: clientY };
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, [containerRef]);

  const onTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
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
      initialScale: scaleRef.current,
      initialPanX: panRef.current.x,
      initialPanY: panRef.current.y,
    };
    pinchActiveRef.current = true;
  }, [panRef, scaleRef, toViewport]);

  const onTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
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

    setScaleSafe(result.scale);
    setPanSafe({ x: result.panX, y: result.panY });
  }, [setPanSafe, setScaleSafe, toViewport]);

  const onTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
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
