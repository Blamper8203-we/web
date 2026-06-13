export interface Point {
  x: number;
  y: number;
}

export interface WireRoutingOptions {
  points?: Point[];         // Tablica wyklikanych przez użytkownika punktów (narożników)
  isDrawing?: boolean;      // Flaga: true, jeśli użytkownik jest w trakcie rysowania przewodu
  mousePos?: Point | null;  // Aktualna pozycja kursora (używana do wykrywania kierunku podczas rysowania)
  exitOffset?: number;      // Długość "sztywnego" wyjścia z zacisku (domyślnie 40px)
  fromExitOffset?: number;  // Specyficzny exitOffset dla startu
  toExitOffset?: number;    // Specyficzny exitOffset dla końca
  customOffset?: number;    // Offset dla 3-segmentowej trasy
  customOffsetX?: number;   // Offset X dla 5-segmentowej trasy
  customOffsetY1?: number;  // Offset Y1 dla 5-segmentowej trasy
  customOffsetY2?: number;  // Offset Y2 dla 5-segmentowej trasy
  customRadius?: number;    // Promień zaokrąglenia rogów
  isFromTop?: boolean;
  isToTop?: boolean;
  fromDirection?: "top" | "bottom" | "left" | "right" | "auto-horizontal" | "auto-vertical";
  toDirection?: "top" | "bottom" | "left" | "right" | "auto-horizontal" | "auto-vertical";
  parallelIndex?: number;
  parallelCount?: number;
  fromVisualInset?: number; // O ile px przewód ma zostać 'skrócony' wizualnie przy starcie
  toVisualInset?: number;   // O ile px przewód ma zostać 'skrócony' wizualnie przy końcu
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

  const startExitOffset = options.fromExitOffset ?? exitOffset;
  const endExitOffset = options.toExitOffset ?? exitOffset;

  let firstTarget = to;
  if (explicitPoints.length > 0) firstTarget = explicitPoints[0];
  else if (isDrawing && mousePos) firstTarget = mousePos;

  // Domyślny inset to 10px, ale możemy przekazać specyficzny z konfiguracji terminala
  const fromInset = options.fromVisualInset ?? 10;
  const toInset = options.toVisualInset ?? 10;

  let startDir = options.fromDirection;
  if (!startDir && options.isFromTop !== undefined) {
    startDir = options.isFromTop ? "top" : "bottom";
  }

  if (startDir === "auto-horizontal") {
    const dx = (firstTarget ? firstTarget.x : from.x) - from.x;
    startDir = dx < 0 ? "left" : "right";
  } else if (startDir === "auto-vertical") {
    const dy = (firstTarget ? firstTarget.y : from.y) - from.y;
    startDir = dy < 0 ? "top" : "bottom";
  }

  let startExit: { x: number, y: number, axis: 'x' | 'y' };
  let startVis: { x: number, y: number };

  if (startDir) {
    if (startDir === "top" || startDir === "bottom") {
      let startExitY = from.y + (startDir === "top" ? -startExitOffset : startExitOffset);
      if (firstTarget) {
        if (startDir === "top" && firstTarget.y < from.y) startExitY = Math.min(firstTarget.y, from.y - startExitOffset);
        if (startDir === "bottom" && firstTarget.y > from.y) startExitY = Math.max(firstTarget.y, from.y + startExitOffset);
      }
      startExit = { x: from.x, y: startExitY, axis: 'y' as const };
      startVis = { x: from.x, y: from.y + (startDir === "top" ? -fromInset : fromInset) };
    } else {
      let startExitX = from.x + (startDir === "left" ? -startExitOffset : startExitOffset);
      if (firstTarget) {
        if (startDir === "left" && firstTarget.x < from.x) startExitX = Math.min(firstTarget.x, from.x - startExitOffset);
        if (startDir === "right" && firstTarget.x > from.x) startExitX = Math.max(firstTarget.x, from.x + startExitOffset);
      }
      startExit = { x: startExitX, y: from.y, axis: 'x' as const };
      // VISUAL_INSET: przewód zatrzymuje się przed środkiem terminala
      startVis = { x: from.x + (startDir === "left" ? -fromInset : fromInset), y: from.y };
    }
  } else {
    startExit = getOrthoExit(from, firstTarget, startExitOffset);
    startVis = { x: from.x, y: from.y };
  }

  let endDir = options.toDirection;
  if (!endDir && options.isToTop !== undefined) {
    endDir = options.isToTop ? "top" : "bottom";
  }

  if (endDir === "auto-horizontal") {
    const lastP = explicitPoints.length > 0 ? explicitPoints[explicitPoints.length - 1] : startExit;
    const dx = to.x - (lastP ? lastP.x : to.x);
    endDir = dx > 0 ? "left" : "right";
  } else if (endDir === "auto-vertical") {
    const lastP = explicitPoints.length > 0 ? explicitPoints[explicitPoints.length - 1] : startExit;
    const dy = to.y - (lastP ? lastP.y : to.y);
    endDir = dy > 0 ? "top" : "bottom";
  }

  if (isDrawing || explicitPoints.length > 0) {
    const p: Point[] = [];
    p.push({ x: startVis.x, y: startVis.y });
    p.push({ x: startExit.x, y: startExit.y });

    explicitPoints.forEach(ep => p.push(ep));

    const lastP = explicitPoints.length > 0 ? explicitPoints[explicitPoints.length - 1] : startExit;
    
    let endEntry: { x: number, y: number, axis: 'x' | 'y' };
    let endVisInner: { x: number, y: number };

    if (endDir) {
      if (endDir === "top" || endDir === "bottom") {
        let endEntryY = to.y + (endDir === "top" ? -endExitOffset : endExitOffset);
        if (lastP) {
          if (endDir === "top" && lastP.y < to.y) endEntryY = Math.min(lastP.y, to.y - endExitOffset);
          if (endDir === "bottom" && lastP.y > to.y) endEntryY = Math.max(lastP.y, to.y + endExitOffset);
        }
        endEntry = { x: to.x, y: endEntryY, axis: 'y' as const };
        endVisInner = { x: to.x, y: to.y + (endDir === "top" ? -toInset : toInset) };
      } else {
        let endEntryX = to.x + (endDir === "left" ? -endExitOffset : endExitOffset);
        if (lastP) {
          if (endDir === "left" && lastP.x < to.x) endEntryX = Math.min(lastP.x, to.x - endExitOffset);
          if (endDir === "right" && lastP.x > to.x) endEntryX = Math.max(lastP.x, to.x + endExitOffset);
        }
        endEntry = { x: endEntryX, y: to.y, axis: 'x' as const };
        endVisInner = { x: to.x + (endDir === "left" ? -toInset : toInset), y: to.y };
      }
    } else {
      endEntry = getOrthoExit(to, lastP, endExitOffset);
      endVisInner = { x: to.x, y: to.y };
    }
    
    const corner = endEntry.axis === 'y' 
        ? { x: endEntry.x, y: lastP.y } 
        : { x: lastP.x, y: endEntry.y };
        
    p.push(corner);
    p.push({ x: endEntry.x, y: endEntry.y });
    if (!isDrawing) {
      p.push({ x: endVisInner.x, y: endVisInner.y });
    } else {
      p.push({ x: to.x, y: to.y }); // Podczas rysowania do samego kursora
    }

    return p;
  }

  let fallbackEndEntry: { x: number, y: number, axis: 'x' | 'y' };
  let endVisFallback: { x: number, y: number };

  if (endDir) {
    if (endDir === "top" || endDir === "bottom") {
      let fallbackEndEntryY = to.y + (endDir === "top" ? -endExitOffset : endExitOffset);
      if (from) {
        if (endDir === "top" && from.y < to.y) fallbackEndEntryY = Math.min(from.y, to.y - endExitOffset);
        if (endDir === "bottom" && from.y > to.y) fallbackEndEntryY = Math.max(from.y, to.y + endExitOffset);
      }
      fallbackEndEntry = { x: to.x, y: fallbackEndEntryY, axis: 'y' as const };
      endVisFallback = { x: to.x, y: to.y + (endDir === "top" ? -toInset : toInset) };
    } else {
      let fallbackEndEntryX = to.x + (endDir === "left" ? -endExitOffset : endExitOffset);
      if (from) {
        if (endDir === "left" && from.x < to.x) fallbackEndEntryX = Math.min(from.x, to.x - endExitOffset);
        if (endDir === "right" && from.x > to.x) fallbackEndEntryX = Math.max(from.x, to.x + endExitOffset);
      }
      fallbackEndEntry = { x: fallbackEndEntryX, y: to.y, axis: 'x' as const };
      endVisFallback = { x: to.x + (endDir === "left" ? -toInset : toInset), y: to.y };
    }
  } else {
    fallbackEndEntry = getOrthoExit(to, from, endExitOffset);
    endVisFallback = { x: to.x, y: to.y };
  }
  
  const endEntry = fallbackEndEntry;
      
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
      // When fromDirection is explicitly horizontal (left/right), prefer short horizontal then vertical
      const preferVerticalFirst = startExit.axis === 'y' ||
          options.fromDirection === 'left' || options.fromDirection === 'right';
      const corner = preferVerticalFirst
          ? { x: startExit.x, y: endEntry.y } 
          : { x: endEntry.x, y: startExit.y };
      p.push(corner);
  }

  p.push({ x: endEntry.x, y: endEntry.y });
  p.push({ x: endVisFallback.x, y: endVisFallback.y });

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
  const radius = options.customRadius ?? 52;
  return pointsToRoundedPath(p, radius);
}

