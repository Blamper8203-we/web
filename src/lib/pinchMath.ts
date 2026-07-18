/**
 * Wspólny rdzeń matematyczny dla gestu pinch (2 palce) używany przez:
 *  - DIN rail canvas (`useDinRailPinch`)
 *  - schematic canvas (`useSchematicPinch`)
 *
 * WARSTWA: `lib/` — czysta matematyka, bez DOM. Zgodnie z AGENTS.md
 * (Layer discipline): hooki/handlery mogą tu zaglądać, komponenty nie.
 *
 * Funkcja oblicza jednocześnie zoom (odległość palców) i translację
 * (przesunięcie środka palców). Matematyka zoomu jest IDENTYCZNA z
 * `zoomAtPoint` w `schematic/schematicViewportController.ts` oraz
 * `zoomAroundViewportPoint` w `useDinRailViewport.ts`:
 *
 *   worldPoint = (midX - pan) / scale
 *   pan'       = midX - worldPoint * scale'
 *
 * …rozszerzona o translację dwoma palcami (delta midpoint).
 *
 * Wszystkie współrzędne są w viewport space (clientX - rect.left),
 * tak samo jak w wheel handlerach i PinchZoomImage.
 */

export interface PinchInitial {
  /** Skala w momencie rozpoczęcia pinch. */
  initialScale: number;
  /** Pan w momencie rozpoczęcia pinch (panX, panY). */
  initialPanX: number;
  initialPanY: number;
  /** Środek między palcami na starcie (viewport coords). */
  initialMidX: number;
  initialMidY: number;
  /** Odległość między palcami na starcie (px). */
  initialDistance: number;
}

export interface PinchCurrent {
  /** Aktualny środek między palcami (viewport coords). */
  currentMidX: number;
  currentMidY: number;
  /** Aktualna odległość między palcami (px). */
  currentDistance: number;
  minScale: number;
  maxScale: number;
}

export interface PinchTransform {
  scale: number;
  panX: number;
  panY: number;
}

/**
 * Oblicza nowy transform viewportu na podstawie gestu pinch.
 *
 * Zakotwiczenie zoomu w początkowym środku palców + translacja
 * o delta midpointu daje naturalne "przytrzymanie punktu pod palcami":
 * jeśli user rozsunie palce bez przesuwania środka — zoom jest
 * zakotwiczony w tym punkcie; jeśli przesunie środek — pan idzie za nim.
 */
export function computePinchTransform(initial: PinchInitial, current: PinchCurrent): PinchTransform {
  // Guard: initialDistance <= 0 oznacza błędny start (np. palce w tym
  // samym punkcie). Zwracamy stan bez zmian, by nie dzielić przez zero.
  if (initial.initialDistance <= 0) {
    return {
      scale: initial.initialScale,
      panX: initial.initialPanX,
      panY: initial.initialPanY,
    };
  }

  const ratio = current.currentDistance / initial.initialDistance;
  const nextScale = clamp(initial.initialScale * ratio, current.minScale, current.maxScale);
  const scaleRatio = nextScale / initial.initialScale;

  // Zoom zakotwiczony w początkowym środku palców (jak zoomAtPoint).
  // worldX = (initialMidX - initialPanX) / initialScale
  // panZoomedX = initialMidX - worldX * nextScale
  //            = initialMidX - (initialMidX - initialPanX) * scaleRatio
  const panZoomedX = initial.initialMidX - (initial.initialMidX - initial.initialPanX) * scaleRatio;
  const panZoomedY = initial.initialMidY - (initial.initialMidY - initial.initialPanY) * scaleRatio;

  // Translacja dwoma palcami: jeśli user przesuwa oba palce w tę samą stronę,
  // środek się przesuwa i widok ma za nim podążać.
  const panX = panZoomedX + (current.currentMidX - initial.initialMidX);
  const panY = panZoomedY + (current.currentMidY - initial.initialMidY);

  return { scale: nextScale, panX, panY };
}

/**
 * Odległość euklidesowa między dwoma punktami. Używana przez hooki do
 * obliczenia initialDistance/currentDistance z dwóch touchy.
 */
export function touchDistance(
  x1: number, y1: number,
  x2: number, y2: number,
): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.hypot(dx, dy);
}

/**
 * Środek odcinka między dwoma punktami. viewport coords.
 */
export function midpoint(
  x1: number, y1: number,
  x2: number, y2: number,
): { x: number; y: number } {
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
