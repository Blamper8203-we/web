import { useState, useCallback, useEffect } from "react";
import type { ConnectionItem, WireColor, WireType, RoutingMode, FerruleColor } from "../types/connectionItem";
import { createDefaultConnection } from "../types/connectionItem";
import { type SymbolItem } from "../types/symbolItem";
import { getSymbolTerminals, findTerminalByName, type TerminalHotspot } from "../lib/modules/moduleTerminals";
import { getOrthoExit, type Point } from "../lib/routing/wireRoutingEngine";

export interface DraggingHandle {
  connectionId: string;
  type: "Y" | "X" | "Y1" | "Y2";
  defaultChannelY?: number;
  exitY?: number;
  enterY?: number;
  baseX?: number;
  bounds?: { minY?: number; maxY?: number; minX?: number; maxX?: number };
}

export interface DraggingSegment {
  connectionId: string;
  basePoints: Point[];
  indexA: number;
  indexB: number;
  isHorizontal: boolean;
  startX: number;
  startY: number;
  bounds?: { minY?: number; maxY?: number; minX?: number; maxX?: number };
}

export interface DrawingState {
  startSymbolId: string;
  startTerminal: string;
  startX: number;
  startY: number;
  isTop: boolean;
  type: "phase" | "neutral" | "pe";
  direction?: "top" | "bottom" | "left" | "right" | "auto-horizontal" | "auto-vertical";
}

export interface HoveredHotspot {
  symbolId: string;
  terminalName: string;
  absX: number;
  absY: number;
  isTop: boolean;
  type: "phase" | "neutral" | "pe";
  direction?: "top" | "bottom" | "left" | "right" | "auto-horizontal" | "auto-vertical";
}

interface InteractionProps {
  connections: ConnectionItem[];
  symbols: SymbolItem[];
  onConnectionsChange: (newConnections: ConnectionItem[], label: string, statusMsg: string) => void;
  selectedConnectionId: string | null;
  onConnectionSelect: (id: string | null) => void;
  defaultWireSettings: {
    wireColor: WireColor;
    wireCrossSection: number;
    wireType: WireType;
    routingMode: RoutingMode;
    ferruleColor?: FerruleColor;
  };
  getLogicalPoint: (clientX: number, clientY: number) => Point;
  allHotspots: (TerminalHotspot & { symbolId: string, absX: number, absY: number })[];
}

export function useDinRailConnectionsInteraction({
  connections,
  symbols,
  onConnectionsChange,
  selectedConnectionId,
  onConnectionSelect,
  defaultWireSettings,
  getLogicalPoint,
  allHotspots,
}: InteractionProps) {
  const [localConnections, setLocalConnections] = useState<ConnectionItem[]>(connections);
  
  useEffect(() => {
    setLocalConnections(connections);
  }, [connections]);

  const [isPanning, setIsPanning] = useState(false);
  const [draggingHandle, setDraggingHandle] = useState<DraggingHandle | null>(null);
  const [draggingSegment, setDraggingSegment] = useState<DraggingSegment | null>(null);
  
  const [explicitPoints, setExplicitPoints] = useState<Point[]>([]);
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<Point | null>(null);
  
  const [hoveredHotspot, setHoveredHotspot] = useState<HoveredHotspot | null>(null);
  const [hoveredSymbolId, setHoveredSymbolId] = useState<string | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape" && drawingState) {
        setDrawingState(null);
        setCurrentMousePos(null);
        setHoveredHotspot(null);
        return;
      }
      if (e.code === "Space" && selectedConnectionId && !drawingState) {
        e.preventDefault();
        const conn = localConnections.find((c) => c.id === selectedConnectionId);
        if (conn) {
          const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);
          let fallbackIsToTop = true;
          if (toSymbol) {
            const hs = findTerminalByName(getSymbolTerminals(toSymbol), conn.toTerminal);
            if (hs) fallbackIsToTop = hs.isTop;
          }
          const currentIsToTop = conn.isToTop ?? fallbackIsToTop;
          const updated = localConnections.map((c) => {
            if (c.id === selectedConnectionId) {
              return { ...c, isToTop: !currentIsToTop };
            }
            return c;
          });
          onConnectionsChange(updated, "Zmień kierunek podłączenia", "Zmieniono kierunek wejścia przewodu");
        }
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedConnectionId) {
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA" ||
          document.activeElement?.hasAttribute("contenteditable")
        ) {
          return;
        }
        const updatedConnections = localConnections.filter((c) => c.id !== selectedConnectionId);
        onConnectionSelect(null);
        onConnectionsChange(updatedConnections, "Usuń połączenie", "Usunięto połączenie przewodem");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedConnectionId, localConnections, onConnectionsChange, onConnectionSelect, drawingState, symbols]);

  // Wyrównanie punktów (snap) dla podglądu rysowania
  const drawingAlignment = (() => {
    if (!drawingState || !currentMousePos || hoveredHotspot) {
      return { snappedPt: null, guides: [] as Array<{ x1: number; y1: number; x2: number; y2: number; hs: any }> };
    }

    const pts = [{ x: drawingState.startX, y: drawingState.startY }, ...explicitPoints];
    const lastP = pts[pts.length - 1];

    const isHorizontal = Math.abs(currentMousePos.x - lastP.x) > Math.abs(currentMousePos.y - lastP.y);
    const SNAP_TOLERANCE = 18;
    
    const snappedPt = { x: currentMousePos.x, y: currentMousePos.y };
    const guides: Array<{ x1: number; y1: number; x2: number; y2: number; hs: any }> = [];

    if (isHorizontal) {
      snappedPt.y = lastP.y;
      let bestHs = null;
      let minDiff = SNAP_TOLERANCE;
      for (const hs of allHotspots) {
        if (hs.symbolId === drawingState.startSymbolId && hs.name === drawingState.startTerminal) continue;
        const diff = Math.abs(currentMousePos.x - hs.absX);
        if (diff < minDiff) {
          minDiff = diff;
          bestHs = hs;
        }
      }
      if (bestHs) {
        snappedPt.x = bestHs.absX;
        guides.push({
          x1: bestHs.absX, y1: lastP.y, x2: bestHs.absX, y2: bestHs.absY, hs: bestHs,
        });
      }
    } else {
      snappedPt.x = lastP.x;
      let bestHs = null;
      let minDiff = SNAP_TOLERANCE;
      for (const hs of allHotspots) {
        if (hs.symbolId === drawingState.startSymbolId && hs.name === drawingState.startTerminal) continue;
        const diff = Math.abs(currentMousePos.y - hs.absY);
        if (diff < minDiff) {
          minDiff = diff;
          bestHs = hs;
        }
      }
      if (bestHs) {
        snappedPt.y = bestHs.absY;
        guides.push({
          x1: lastP.x, y1: bestHs.absY, x2: bestHs.absX, y2: bestHs.absY, hs: bestHs,
        });
      }
    }

    return { snappedPt, guides };
  })();

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>, panStartCallback: (e: React.PointerEvent) => void) => {
    if (e.button === 2 && drawingState) {
      e.preventDefault();
      if (explicitPoints.length > 0) {
        setExplicitPoints((prev) => prev.slice(0, -1));
      } else {
        setDrawingState(null);
        setCurrentMousePos(null);
        setHoveredHotspot(null);
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      return;
    }

    if (drawingState && e.button === 0) {
      if (hoveredHotspot) return; 

      const logicalPos = getLogicalPoint(e.clientX, e.clientY);
      const targetPt = drawingAlignment.snappedPt || logicalPos;
      const fromPt = { x: drawingState.startX, y: drawingState.startY };
      const firstTarget = explicitPoints.length > 0 ? explicitPoints[0] : targetPt;
      const startExit = getOrthoExit(fromPt, firstTarget);
      const lastP = explicitPoints.length > 0 ? explicitPoints[explicitPoints.length - 1] : startExit;

      let finalX = targetPt.x;
      let finalY = targetPt.y;

      if (Math.abs(targetPt.x - lastP.x) > Math.abs(targetPt.y - lastP.y)) {
          finalY = lastP.y; 
      } else {
          finalX = lastP.x; 
      }

      if (finalX !== lastP.x || finalY !== lastP.y) {
          setExplicitPoints([...explicitPoints, { x: finalX, y: finalY }]);
      }
      return;
    }

    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.currentTarget === e.target)) {
      setIsPanning(true);
      panStartCallback(e);
      e.currentTarget.setPointerCapture(e.pointerId);
      onConnectionSelect(null);
    }
  }, [drawingState, explicitPoints, hoveredHotspot, getLogicalPoint, drawingAlignment.snappedPt, onConnectionSelect]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>, handlePanMove: (e: React.PointerEvent) => void) => {
    const logicalPos = getLogicalPoint(e.clientX, e.clientY);

    if (isPanning) {
      handlePanMove(e);
      return;
    }

    if (draggingHandle) {
      setLocalConnections((prev) =>
        prev.map((c) => {
          if (c.id !== draggingHandle.connectionId) return c;

          let newY = logicalPos.y;
          let newX = logicalPos.x;
          if (draggingHandle.bounds) {
            if (draggingHandle.bounds.minY !== undefined) newY = Math.max(newY, draggingHandle.bounds.minY);
            if (draggingHandle.bounds.maxY !== undefined) newY = Math.min(newY, draggingHandle.bounds.maxY);
            if (draggingHandle.bounds.minX !== undefined) newX = Math.max(newX, draggingHandle.bounds.minX);
            if (draggingHandle.bounds.maxX !== undefined) newX = Math.min(newX, draggingHandle.bounds.maxX);
          }

          if (draggingHandle.type === "Y") {
            return { ...c, customOffset: newY - draggingHandle.defaultChannelY! };
          } else if (draggingHandle.type === "X") {
            return { ...c, customOffsetX: newX - draggingHandle.baseX! };
          } else if (draggingHandle.type === "Y1") {
            return { ...c, customOffsetY1: newY - draggingHandle.exitY! };
          } else if (draggingHandle.type === "Y2") {
            return { ...c, customOffsetY2: newY - draggingHandle.enterY! };
          }
          return c;
        })
      );
      return;
    }

    if (draggingSegment) {
      const dx = logicalPos.x - draggingSegment.startX;
      const dy = logicalPos.y - draggingSegment.startY;

      setLocalConnections((prev) =>
        prev.map((c) => {
          if (c.id !== draggingSegment.connectionId) return c;

          const newPoints = [...draggingSegment.basePoints];
          if (draggingSegment.isHorizontal) {
            const currentY = draggingSegment.basePoints[draggingSegment.indexA]?.y || 0;
            let targetY = currentY + dy;
            if (draggingSegment.bounds) {
              if (draggingSegment.bounds.minY !== undefined) targetY = Math.max(targetY, draggingSegment.bounds.minY);
              if (draggingSegment.bounds.maxY !== undefined) targetY = Math.min(targetY, draggingSegment.bounds.maxY);
            }
            const clampedDy = targetY - currentY;
            
            if (newPoints[draggingSegment.indexA]) newPoints[draggingSegment.indexA] = { ...newPoints[draggingSegment.indexA], y: newPoints[draggingSegment.indexA].y + clampedDy };
            if (newPoints[draggingSegment.indexB]) newPoints[draggingSegment.indexB] = { ...newPoints[draggingSegment.indexB], y: newPoints[draggingSegment.indexB].y + clampedDy };
          } else {
            const currentX = draggingSegment.basePoints[draggingSegment.indexA]?.x || 0;
            let targetX = currentX + dx;
            if (draggingSegment.bounds) {
              if (draggingSegment.bounds.minX !== undefined) targetX = Math.max(targetX, draggingSegment.bounds.minX);
              if (draggingSegment.bounds.maxX !== undefined) targetX = Math.min(targetX, draggingSegment.bounds.maxX);
            }
            const clampedDx = targetX - currentX;
            
            if (newPoints[draggingSegment.indexA]) newPoints[draggingSegment.indexA] = { ...newPoints[draggingSegment.indexA], x: newPoints[draggingSegment.indexA].x + clampedDx };
            if (newPoints[draggingSegment.indexB]) newPoints[draggingSegment.indexB] = { ...newPoints[draggingSegment.indexB], x: newPoints[draggingSegment.indexB].x + clampedDx };
          }
          return { ...c, points: newPoints };
        })
      );
      return;
    }

    if (drawingState) {
      setCurrentMousePos(logicalPos);
      let nearest = null;
      let minDist = 36; 

      for (const hs of allHotspots) {
        if (hs.symbolId === drawingState.startSymbolId && hs.name === drawingState.startTerminal) {
          continue; 
        }
        const dx = hs.absX - logicalPos.x;
        const dy = hs.absY - logicalPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = hs;
        }
      }

      if (nearest) {
        setCurrentMousePos({ x: nearest.absX, y: nearest.absY });
        setHoveredHotspot({
          symbolId: nearest.symbolId,
          terminalName: nearest.name,
          absX: nearest.absX,
          absY: nearest.absY,
          isTop: nearest.isTop,
          direction: nearest.direction,
          type: nearest.type,
        });
      } else {
        setHoveredHotspot(null);
      }
    }
  }, [isPanning, draggingHandle, draggingSegment, drawingState, getLogicalPoint, allHotspots]);

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning) {
      setIsPanning(false);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_err) {
        // Pointer może być już zwolniony — bezpiecznie zignorować.
      }
      return;
    }

    if (draggingHandle || draggingSegment) {
      const finalState = localConnections;
      onConnectionsChange(finalState, "Przesuń trasę", "Przesunięto trasę przewodu");
      setDraggingHandle(null);
      setDraggingSegment(null);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_err) {
        // Pointer może być już zwolniony — bezpiecznie zignorować.
      }
      return;
    }

    if (drawingState && hoveredHotspot) {
      if (drawingState.startSymbolId === hoveredHotspot.symbolId && drawingState.startTerminal === hoveredHotspot.terminalName) {
        return;
      }

      let wireColor = defaultWireSettings.wireColor;
      if (hoveredHotspot.type === "neutral" || drawingState.type === "neutral") {
        wireColor = "blue";
      } else if (hoveredHotspot.type === "pe" || drawingState.type === "pe") {
        wireColor = "green-yellow";
      }

      const cursorY = currentMousePos?.y ?? hoveredHotspot.absY;
      const finalIsToTop = cursorY < hoveredHotspot.absY;
      const finalPoints = explicitPoints.length > 0 ? [...explicitPoints] : undefined;

      const newWire = createDefaultConnection({
        fromSymbolId: drawingState.startSymbolId,
        fromTerminal: drawingState.startTerminal,
        toSymbolId: hoveredHotspot.symbolId,
        toTerminal: hoveredHotspot.terminalName,
        wireColor,
        wireCrossSection: defaultWireSettings.wireCrossSection,
        wireType: defaultWireSettings.wireType,
        routingMode: defaultWireSettings.routingMode,
        ferruleColor: defaultWireSettings.ferruleColor,
        isFromTop: drawingState.isTop,
        fromDirection: drawingState.direction,
        isToTop: finalIsToTop, toDirection: hoveredHotspot?.direction,
        points: finalPoints,
      });

      const isDuplicate = localConnections.some(
        (c) =>
          (c.fromSymbolId === newWire.fromSymbolId &&
            c.fromTerminal === newWire.fromTerminal &&
            c.toSymbolId === newWire.toSymbolId &&
            c.toTerminal === newWire.toTerminal) ||
          (c.fromSymbolId === newWire.toSymbolId &&
            c.fromTerminal === newWire.toTerminal &&
            c.toSymbolId === newWire.fromSymbolId &&
            c.toTerminal === newWire.fromTerminal)
      );

      if (!isDuplicate) {
        const updated = [...localConnections, newWire];
        onConnectionsChange(updated, "Dodaj połączenie", "Dodano połączenie przewodem");
        onConnectionSelect(newWire.id);
      }

      setDrawingState(null);
      setCurrentMousePos(null);
      setHoveredHotspot(null);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_err) {
        // Pointer może być już zwolniony — bezpiecznie zignorować.
      }
    }
  }, [
    isPanning, draggingHandle, draggingSegment, localConnections,
    onConnectionsChange, drawingState, hoveredHotspot, defaultWireSettings,
    currentMousePos, explicitPoints, onConnectionSelect
  ]);

  const handleHotspotPointerDown = useCallback((
    e: React.PointerEvent<SVGCircleElement>,
    hs: TerminalHotspot & { symbolId: string; absX: number; absY: number }
  ) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (drawingState) return;
    
    setDrawingState({
      startSymbolId: hs.symbolId,
      startTerminal: hs.name,
      startX: hs.absX,
      startY: hs.absY,
      isTop: hs.isTop,
      type: hs.type,
      direction: hs.direction,
    });
    setExplicitPoints([]);
    const logicalPoint = getLogicalPoint(e.clientX, e.clientY);
    setCurrentMousePos(logicalPoint);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [drawingState, getLogicalPoint]);

  return {
    localConnections,
    isPanning,
    drawingState,
    explicitPoints,
    currentMousePos,
    hoveredHotspot,
    hoveredSymbolId,
    hoveredWireId,
    drawingAlignment,
    setHoveredHotspot,
    setHoveredSymbolId,
    setHoveredWireId,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleHotspotPointerDown,
    setDraggingHandle,
    setDraggingSegment,
  };
}
