export interface Point {
  x: number;
  y: number;
}

export interface WireRoutingOptions {
  points?: Point[];         // Tablica wyklikanych przez użytkownika punktów (narożników)
  isDrawing?: boolean;      // Flaga: true, jeśli użytkownik jest w trakcie rysowania przewodu
  mousePos?: Point | null;  // Aktualna pozycja kursora (używana do wykrywania kierunku podczas rysowania)
  exitOffset?: number;      // Długość "sztywnego" wyjścia z zacisku (domyślnie 40px)
  customOffset?: number;    // Offset dla 3-segmentowej trasy
  customOffsetX?: number;   // Offset X dla 5-segmentowej trasy
  customOffsetY1?: number;  // Offset Y1 dla 5-segmentowej trasy
  customOffsetY2?: number;  // Offset Y2 dla 5-segmentowej trasy
  customRadius?: number;    // Promień zaokrąglenia rogów
  isFromTop?: boolean;
  isToTop?: boolean;
  parallelIndex?: number;
  parallelCount?: number;
}

/**
 * Inteligentnie wykrywa najlepszy kierunek wyjścia/wejścia (Góra, Dół, Lewo, Prawo)
 * na podstawie pozycji punktu docelowego.
 */
export function getOrthoExit(origin: Point, target: Point | null, offsetSize: number = 40): { x: number, y: number, axis: 'x' | 'y' } {
    // Jeśli nie ma celu, domyślnie wychodzimy w dół
    if (!target) return { x: origin.x, y: origin.y + offsetSize, axis: 'y' };
    
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    
    // Sprawdzamy czy główny ruch myszką/celem jest w osi X czy Y
    if (Math.abs(dx) > Math.abs(dy)) {
        return { 
            x: origin.x + (dx !== 0 ? Math.sign(dx) : 1) * offsetSize, 
            y: origin.y,
            axis: 'x' // Wyjście poziome (w lewo lub w prawo)
        };
    } else {
        return { 
            x: origin.x, 
            y: origin.y + (dy !== 0 ? Math.sign(dy) : 1) * offsetSize,
            axis: 'y' // Wyjście pionowe (w górę lub w dół)
        };
    }
}

export function calculateWirePoints(from: Point, to: Point, options: WireRoutingOptions = {}): Point[] {
  const {
    points: explicitPoints = [],
    isDrawing = false,
    mousePos = null,
    exitOffset = 40
  } = options;

  let firstTarget = to;
  if (explicitPoints.length > 0) firstTarget = explicitPoints[0];
  else if (isDrawing && mousePos) firstTarget = mousePos;

  let startExitY = from.y + (options.isFromTop ? -exitOffset : exitOffset);
  if (options.isFromTop !== undefined && firstTarget) {
      if (options.isFromTop && firstTarget.y < from.y) startExitY = firstTarget.y;
      if (!options.isFromTop && firstTarget.y > from.y) startExitY = firstTarget.y;
  }
  const startExit = options.isFromTop !== undefined
      ? { x: from.x, y: startExitY, axis: 'y' as const }
      : getOrthoExit(from, firstTarget, exitOffset);

  // Przesunięcie wizualne przewodu, żeby nie rysował się po środku śruby tylko wsuwał się "pod" krawędź plastiku/otworu.
  // Ucinamy przewód idealnie 22px przed śrubą (końcówka przewodu będzie renderowana z strokeLinecap="butt", aby ucinało się płasko)
  const VISUAL_INSET = 22;
  const startVis = options.isFromTop !== undefined 
      ? { x: from.x, y: from.y + (options.isFromTop ? -VISUAL_INSET : VISUAL_INSET) } 
      : { x: from.x, y: from.y };
  
  const endVis = options.isToTop !== undefined 
      ? { x: to.x, y: to.y + (options.isToTop ? -VISUAL_INSET : VISUAL_INSET) } 
      : { x: to.x, y: to.y };

  if (isDrawing || explicitPoints.length > 0) {
    const p: Point[] = [];
    p.push({ x: startVis.x, y: startVis.y });
    p.push({ x: startExit.x, y: startExit.y });

    explicitPoints.forEach(ep => p.push(ep));

    if (!isDrawing) {
      const lastP = explicitPoints.length > 0 ? explicitPoints[explicitPoints.length - 1] : startExit;
      
      let endEntryY = to.y + (options.isToTop ? -exitOffset : exitOffset);
      if (options.isToTop !== undefined && lastP) {
          if (options.isToTop && lastP.y < to.y) endEntryY = lastP.y;
          if (!options.isToTop && lastP.y > to.y) endEntryY = lastP.y;
      }
      const endEntry = options.isToTop !== undefined
          ? { x: to.x, y: endEntryY, axis: 'y' as const }
          : getOrthoExit(to, lastP, exitOffset);
      
      const corner = endEntry.axis === 'y' 
          ? { x: endEntry.x, y: lastP.y } 
          : { x: lastP.x, y: endEntry.y };
          
      p.push(corner);
      p.push({ x: endEntry.x, y: endEntry.y });
      if (!isDrawing) {
        p.push({ x: endVis.x, y: endVis.y });
      } else {
        p.push({ x: to.x, y: to.y }); // Podczas rysowania do samego kursora
      }
    }

    return p;
  }

  let fallbackEndEntryY = to.y + (options.isToTop ? -exitOffset : exitOffset);
  if (options.isToTop !== undefined && from) {
      if (options.isToTop && from.y < to.y) fallbackEndEntryY = from.y;
      if (!options.isToTop && from.y > to.y) fallbackEndEntryY = from.y;
  }
  const endEntry = options.isToTop !== undefined
      ? { x: to.x, y: fallbackEndEntryY, axis: 'y' as const }
      : getOrthoExit(to, from, exitOffset);
      
  const p: Point[] = [
    { x: startVis.x, y: startVis.y },
    { x: startExit.x, y: startExit.y }
  ];

  // 5-segment routing support (like Visio, for terminals facing same axis)
  if (startExit.axis === endEntry.axis && startExit.axis === 'y' && options.customOffsetX !== undefined) {
      const defaultMidX = (startExit.x + endEntry.x) / 2;
      const channelX = defaultMidX + options.customOffsetX;
      const exitY = startExit.y + (options.customOffsetY1 ?? 0);
      const enterY = endEntry.y + (options.customOffsetY2 ?? 0);
      
      p.push({ x: startExit.x, y: exitY });
      p.push({ x: channelX, y: exitY });
      p.push({ x: channelX, y: enterY });
      p.push({ x: endEntry.x, y: enterY });
  }
  // Łączenie punktu wyjścia z punktem wejścia (kształty C, U, S, Z)
  else if (startExit.axis === endEntry.axis) {
      if (startExit.axis === 'y') {
          const defaultMidY = (startExit.y + endEntry.y) / 2;
          const midY = defaultMidY + (options.customOffset ?? 0);
          p.push({ x: startExit.x, y: midY }, { x: endEntry.x, y: midY });
      } else {
          const defaultMidX = (startExit.x + endEntry.x) / 2;
          const midX = defaultMidX + (options.customOffsetX ?? 0);
          p.push({ x: midX, y: startExit.y }, { x: midX, y: endEntry.y });
      }
  } else {
      const corner = startExit.axis === 'y' 
          ? { x: startExit.x, y: endEntry.y } 
          : { x: endEntry.x, y: startExit.y };
      p.push(corner);
  }

  p.push({ x: endEntry.x, y: endEntry.y });
  p.push({ x: endVis.x, y: endVis.y });

  return p;
}

export function pointsToRoundedPath(points: Point[], radius: number): string {
  const noDups = points.filter((pt, i, arr) => {
    if (i === 0) return true;
    return Math.abs(pt.x - arr[i - 1].x) > 0.5 || Math.abs(pt.y - arr[i - 1].y) > 0.5;
  });

  const cleanPoints = noDups.filter((pt, i, arr) => {
    if (i === 0 || i === arr.length - 1) return true;
    const prev = arr[i - 1];
    const next = arr[i + 1];
    
    const isCollinearX = Math.abs(prev.x - pt.x) < 0.5 && Math.abs(pt.x - next.x) < 0.5;
    const isCollinearY = Math.abs(prev.y - pt.y) < 0.5 && Math.abs(pt.y - next.y) < 0.5;
    
    return !(isCollinearX || isCollinearY);
  });

  if (cleanPoints.length < 2) return "";

  if (radius <= 0 || cleanPoints.length < 3) {
      return `M ${cleanPoints.map(pt => `${pt.x} ${pt.y}`).join(' L ')}`;
  }

  let d = `M ${cleanPoints[0].x} ${cleanPoints[0].y}`;

  for (let i = 1; i < cleanPoints.length - 1; i++) {
    const prev = cleanPoints[i - 1];
    const curr = cleanPoints[i];
    const next = cleanPoints[i + 1];

    const dPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const dNext = Math.hypot(next.x - curr.x, next.y - curr.y);

    const maxRPrev = i === 1 ? dPrev : dPrev / 2;
    const maxRNext = i === cleanPoints.length - 2 ? dNext : dNext / 2;
    const maxR = Math.min(maxRPrev, maxRNext, radius);

    if (maxR < 1) {
        d += ` L ${curr.x} ${curr.y}`;
        continue;
    }

    const uPrev = { x: (prev.x - curr.x) / dPrev, y: (prev.y - curr.y) / dPrev };
    const uNext = { x: (next.x - curr.x) / dNext, y: (next.y - curr.y) / dNext };

    const ptA = { x: curr.x + uPrev.x * maxR, y: curr.y + uPrev.y * maxR };
    const ptB = { x: curr.x + uNext.x * maxR, y: curr.y + uNext.y * maxR };

    d += ` L ${ptA.x} ${ptA.y} Q ${curr.x} ${curr.y} ${ptB.x} ${ptB.y}`;
  }

  d += ` L ${cleanPoints[cleanPoints.length - 1].x} ${cleanPoints[cleanPoints.length - 1].y}`;
  
  return d;
}

/**
 * Główna funkcja generująca ścieżkę (atrybut 'd' dla SVG <path>)
 */
export function calculateWirePath(from: Point, to: Point, options: WireRoutingOptions = {}): string {
  const p = calculateWirePoints(from, to, options);
  const radius = options.customRadius ?? 0;
  return pointsToRoundedPath(p, radius);
}

