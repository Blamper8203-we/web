import { useCallback, useRef } from "react";
import type { SchematicLayout } from "../lib/schematic/schematicLayout";
import {
  constrainPan,
  MAX_ZOOM,
  MIN_ZOOM,
  type ViewportState,
} from "../lib/schematic/schematicViewportController";
import { computePinchTransform, midpoint, touchDistance } from "../lib/pinchMath";

/**
 * Pinch-to-zoom + pan dwoma palcami dla canvasa schematu (Canvas 2D).
 *
 * Reuse istniejących `viewport`/`setViewport` z `useSchematicViewport` —
 * nowy gest to tylko nowa ścieżka wejścia do tego samego stanu viewportu
 * co kółko myszy i przyciski +/-. Po obliczeniu transformu wynik jest
 * przepuszczany przez `constrainPan` (identycznie jak wheel handler w
 * useSchematicViewport.ts:108-111), by treść nie uciekła poza canvas.
 *
 * `pinchActiveRef` przekazywany do `useSchematicInteraction` sprawia, że
 * single-pointer panning/drag nie wchodzi w konflikt z pinch.
 */
export function useSchematicPinch({
  canvasRef,
  layout,
  viewport,
  setViewport,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  layout: SchematicLayout | null;
  viewport: ViewportState;
  setViewport: React.Dispatch<React.SetStateAction<ViewportState>>;
}) {
  const pinchActiveRef = useRef(false);

  // Stan gestu w ref — aktualizacja viewportu idzie przez setViewport.
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

  // Konwersja clientX/clientY → canvas-local coords. Identyczna jak
  // getCanvasPoint w useSchematicInteraction.ts.
  const toCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: clientX, y: clientY };
    }
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, [canvasRef]);

  const onTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.touches.length !== 2) {
      return;
    }
    const t1 = event.touches[0];
    const t2 = event.touches[1];
    if (!t1 || !t2) {
      return;
    }
    event.preventDefault();

    const p1 = toCanvasPoint(t1.clientX, t1.clientY);
    const p2 = toCanvasPoint(t2.clientX, t2.clientY);
    const mid = midpoint(p1.x, p1.y, p2.x, p2.y);

    gestureRef.current = {
      initialDistance: touchDistance(p1.x, p1.y, p2.x, p2.y),
      initialMidX: mid.x,
      initialMidY: mid.y,
      // WHY: zamrażamy snapshot viewportu na starcie gestu — zoom ma być
      // liniowy względem startowej odległości palców, nie kumulatywny.
      initialScale: viewport.zoom,
      initialPanX: viewport.panX,
      initialPanY: viewport.panY,
    };
    pinchActiveRef.current = true;
  }, [toCanvasPoint, viewport.panX, viewport.panY, viewport.zoom]);

  const onTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.touches.length !== 2 || !gestureRef.current) {
      return;
    }
    const t1 = event.touches[0];
    const t2 = event.touches[1];
    if (!t1 || !t2) {
      return;
    }
    event.preventDefault();

    const p1 = toCanvasPoint(t1.clientX, t1.clientY);
    const p2 = toCanvasPoint(t2.clientX, t2.clientY);
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
        minScale: MIN_ZOOM,
        maxScale: MAX_ZOOM,
      },
    );

    const canvas = canvasRef.current;
    const nextVp: ViewportState = { zoom: result.scale, panX: result.panX, panY: result.panY };
    // constrainPan — identycznie jak wheel handler. Zapobiega uciekaniu
    // treści poza canvas i centruje gdy content mniejszy niż viewport.
    const constrained = layout && canvas
      ? constrainPan(nextVp, canvas.width, canvas.height, layout.totalWidth, layout.totalHeight)
      : nextVp;
    setViewport(constrained);
  }, [canvasRef, layout, setViewport, toCanvasPoint]);

  const onTouchEnd = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
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
