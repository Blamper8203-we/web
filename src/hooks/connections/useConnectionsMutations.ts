import React from "react";
import type { DrawingState, HoveredHotspot } from "./useConnectionsDrawing";
import type { Point } from "../../lib/routing/wireRoutingEngine";
import type { ConnectionItem, WireColor, WireType, RoutingMode, FerruleColor } from "../../types/connectionItem";
import { createDefaultConnection } from "../../types/connectionItem";
import type { SymbolItem } from "../../types/symbolItem";
import { getSymbolTerminals, type TerminalHotspot, findTerminalByName } from "../../lib/modules/moduleTerminals";
import { getOrthoExit } from "../../lib/routing/wireRoutingEngine";

export interface DraggingHandle {
  connectionId: string;
  type: "Y" | "X" | "Y1" | "Y2";
  defaultChannelY?: number;
  baseX?: number;
  exitY?: number;
  enterY?: number;
  minBound?: number;
  maxBound?: number;
}

export interface DraggingSegment {
  connectionId: string;
  indexA: number;
  indexB: number;
  isHorizontal: boolean;
  startX: number;
  startY: number;
  basePoints: Point[];
  minBound?: number;
  maxBound?: number;
}

export interface UseConnectionsMutationsProps {
  drawingState: DrawingState | null;
  setDrawingState: (val: DrawingState | null) => void;
  explicitPoints: Point[];
  setExplicitPoints: (val: Point[] | ((prev: Point[]) => Point[])) => void;
  hoveredHotspot: HoveredHotspot | null;
  setHoveredHotspot: (val: HoveredHotspot | null) => void;
  currentMousePos: Point | null;
  setCurrentMousePos: (val: Point | null) => void;
  isPanning: boolean;
  setIsPanning: (val: boolean) => void;
  panStartRef: React.MutableRefObject<{ x: number; y: number }>;
  setViewport: React.Dispatch<React.SetStateAction<{ zoom: number; pan: { x: number; y: number } }>>;
  pan: { x: number; y: number };
  onConnectionSelect: (id: string | null) => void;
  draggingHandle: DraggingHandle | null;
  setDraggingHandle: (val: DraggingHandle | null) => void;
  draggingSegment: DraggingSegment | null;
  setDraggingSegment: (val: DraggingSegment | null) => void;
  localConnections: ConnectionItem[];
  setLocalConnections: React.Dispatch<React.SetStateAction<ConnectionItem[]>>;
  symbols: SymbolItem[];
  allHotspots: Array<TerminalHotspot & { symbolId: string; absX: number; absY: number }>;
  drawingAlignment: { snappedPt: Point | null; guides: any[] };
  onConnectionsChange: (conns: ConnectionItem[], reason: string, description: string) => void;
  defaultWireSettings: {
    wireColor: WireColor;
    wireCrossSection: number;
    wireType: WireType;
    routingMode: RoutingMode;
    ferruleColor?: FerruleColor;
  };
  getLogicalPoint: (clientX: number, clientY: number) => Point;
}

export function useConnectionsMutations({
  drawingState,
  setDrawingState,
  explicitPoints,
  setExplicitPoints,
  hoveredHotspot,
  setHoveredHotspot,
  currentMousePos,
  setCurrentMousePos,
  isPanning,
  setIsPanning,
  panStartRef,
  setViewport,
  pan,
  onConnectionSelect,
  draggingHandle,
  setDraggingHandle,
  draggingSegment,
  setDraggingSegment,
  localConnections,
  setLocalConnections,
  symbols,
  allHotspots,
  drawingAlignment,
  onConnectionsChange,
  defaultWireSettings,
  getLogicalPoint,
}: UseConnectionsMutationsProps) {
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
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
      const clampedPos = { ...logicalPos };
      const fromSymbol = symbols.find((s) => s.id === drawingState.startSymbolId);
      const fromHS = fromSymbol ? findTerminalByName(getSymbolTerminals(fromSymbol), drawingState.startTerminal, drawingState.isTop) : null;
      const fromDirection = fromHS?.direction || (drawingState.isTop ? "top" : "bottom");

      if (explicitPoints.length === 0) {
        if (fromDirection === "bottom") {
          if (fromSymbol) {
            if (clampedPos.y < fromSymbol.y) {
              clampedPos.y = fromSymbol.y;
            }
            if (clampedPos.y < fromSymbol.y + fromSymbol.height) {
              if (clampedPos.x < fromSymbol.x) {
                clampedPos.x = fromSymbol.x;
              } else if (clampedPos.x > fromSymbol.x + fromSymbol.width) {
                clampedPos.x = fromSymbol.x + fromSymbol.width;
              }
            }
          } else {
            if (clampedPos.y < drawingState.startY) {
              clampedPos.y = drawingState.startY;
            }
          }
        } else if (fromDirection === "top") {
          if (fromSymbol) {
            if (clampedPos.y > fromSymbol.y + fromSymbol.height) {
              clampedPos.y = fromSymbol.y + fromSymbol.height;
            }
            if (clampedPos.y > fromSymbol.y) {
              if (clampedPos.x < fromSymbol.x) {
                clampedPos.x = fromSymbol.x;
              } else if (clampedPos.x > fromSymbol.x + fromSymbol.width) {
                clampedPos.x = fromSymbol.x + fromSymbol.width;
              }
            }
          } else {
            if (clampedPos.y > drawingState.startY) {
              clampedPos.y = drawingState.startY;
            }
          }
        } else if (fromDirection === "left") {
          if (fromSymbol) {
            if (clampedPos.x > fromSymbol.x + fromSymbol.width) {
              clampedPos.x = fromSymbol.x + fromSymbol.width;
            }
            if (clampedPos.x > fromSymbol.x) {
              if (clampedPos.y < fromSymbol.y) {
                clampedPos.y = fromSymbol.y;
              } else if (clampedPos.y > fromSymbol.y + fromSymbol.height) {
                clampedPos.y = fromSymbol.y + fromSymbol.height;
              }
            }
          } else {
            if (clampedPos.x > drawingState.startX) {
              clampedPos.x = drawingState.startX;
            }
          }
        } else if (fromDirection === "right") {
          if (fromSymbol) {
            if (clampedPos.x < fromSymbol.x) {
              clampedPos.x = fromSymbol.x;
            }
            if (clampedPos.x < fromSymbol.x + fromSymbol.width) {
              if (clampedPos.y < fromSymbol.y) {
                clampedPos.y = fromSymbol.y;
              } else if (clampedPos.y > fromSymbol.y + fromSymbol.height) {
                clampedPos.y = fromSymbol.y + fromSymbol.height;
              }
            }
          } else {
            if (clampedPos.x < drawingState.startX) {
              clampedPos.x = drawingState.startX;
            }
          }
        }
      }

      const targetPt = drawingAlignment.snappedPt || clampedPos;
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
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      onConnectionSelect(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const logicalPos = getLogicalPoint(e.clientX, e.clientY);

    if (isPanning) {
      setViewport((prev) => ({
        ...prev,
        pan: {
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        },
      }));
      return;
    }

    if (draggingHandle) {
      setLocalConnections((prev) =>
        prev.map((c) => {
          if (c.id !== draggingHandle.connectionId) return c;

          let targetY = logicalPos.y;
          let targetX = logicalPos.x;
          if (draggingHandle.type.startsWith("Y")) {
             if (draggingHandle.minBound !== undefined) targetY = Math.max(targetY, draggingHandle.minBound);
             if (draggingHandle.maxBound !== undefined) targetY = Math.min(targetY, draggingHandle.maxBound);
          } else {
             if (draggingHandle.minBound !== undefined) targetX = Math.max(targetX, draggingHandle.minBound);
             if (draggingHandle.maxBound !== undefined) targetX = Math.min(targetX, draggingHandle.maxBound);
          }

          if (draggingHandle.type === "Y") {
            const newOffset = targetY - draggingHandle.defaultChannelY!;
            return { ...c, customOffset: newOffset };
          } else if (draggingHandle.type === "X") {
            const newOffsetX = targetX - draggingHandle.baseX!;
            return { ...c, customOffsetX: newOffsetX };
          } else if (draggingHandle.type === "Y1") {
            const newOffsetY1 = targetY - draggingHandle.exitY!;
            return { ...c, customOffsetY1: newOffsetY1 };
          } else if (draggingHandle.type === "Y2") {
            const newOffsetY2 = targetY - draggingHandle.enterY!;
            return { ...c, customOffsetY2: newOffsetY2 };
          }
          return c;
        })
      );
      return;
    }

    if (draggingSegment) {
      let targetX = logicalPos.x;
      let targetY = logicalPos.y;

      if (draggingSegment.isHorizontal) {
         if (draggingSegment.minBound !== undefined) targetY = Math.max(targetY, draggingSegment.minBound);
         if (draggingSegment.maxBound !== undefined) targetY = Math.min(targetY, draggingSegment.maxBound);
      } else {
         if (draggingSegment.minBound !== undefined) targetX = Math.max(targetX, draggingSegment.minBound);
         if (draggingSegment.maxBound !== undefined) targetX = Math.min(targetX, draggingSegment.maxBound);
      }

      const dx = targetX - draggingSegment.startX;
      const dy = targetY - draggingSegment.startY;

      setLocalConnections((prev) =>
        prev.map((c) => {
          if (c.id !== draggingSegment.connectionId) return c;

          const newPoints = [...draggingSegment.basePoints];
          
          if (draggingSegment.isHorizontal) {
            if (newPoints[draggingSegment.indexA]) newPoints[draggingSegment.indexA] = { ...newPoints[draggingSegment.indexA], y: newPoints[draggingSegment.indexA].y + dy };
            if (newPoints[draggingSegment.indexB]) newPoints[draggingSegment.indexB] = { ...newPoints[draggingSegment.indexB], y: newPoints[draggingSegment.indexB].y + dy };
          } else {
            if (newPoints[draggingSegment.indexA]) newPoints[draggingSegment.indexA] = { ...newPoints[draggingSegment.indexA], x: newPoints[draggingSegment.indexA].x + dx };
            if (newPoints[draggingSegment.indexB]) newPoints[draggingSegment.indexB] = { ...newPoints[draggingSegment.indexB], x: newPoints[draggingSegment.indexB].x + dx };
          }

          return { ...c, points: newPoints };
        })
      );
      return;
    }

    if (drawingState) {
      const fromSymbol = symbols.find((s) => s.id === drawingState.startSymbolId);
      const fromHS = fromSymbol ? findTerminalByName(getSymbolTerminals(fromSymbol), drawingState.startTerminal, drawingState.isTop) : null;
      const fromDirection = fromHS?.direction || (drawingState.isTop ? "top" : "bottom");

      const clampedPos = { ...logicalPos };

      if (explicitPoints.length === 0) {
        if (fromDirection === "bottom") {
          if (fromSymbol) {
            if (clampedPos.y < fromSymbol.y) {
              clampedPos.y = fromSymbol.y;
            }
            if (clampedPos.y < fromSymbol.y + fromSymbol.height) {
              if (clampedPos.x < fromSymbol.x) {
                clampedPos.x = fromSymbol.x;
              } else if (clampedPos.x > fromSymbol.x + fromSymbol.width) {
                clampedPos.x = fromSymbol.x + fromSymbol.width;
              }
            }
          } else {
            if (clampedPos.y < drawingState.startY) {
              clampedPos.y = drawingState.startY;
            }
          }
        } else if (fromDirection === "top") {
          if (fromSymbol) {
            if (clampedPos.y > fromSymbol.y + fromSymbol.height) {
              clampedPos.y = fromSymbol.y + fromSymbol.height;
            }
            if (clampedPos.y > fromSymbol.y) {
              if (clampedPos.x < fromSymbol.x) {
                clampedPos.x = fromSymbol.x;
              } else if (clampedPos.x > fromSymbol.x + fromSymbol.width) {
                clampedPos.x = fromSymbol.x + fromSymbol.width;
              }
            }
          } else {
            if (clampedPos.y > drawingState.startY) {
              clampedPos.y = drawingState.startY;
            }
          }
        } else if (fromDirection === "left") {
          if (fromSymbol) {
            if (clampedPos.x > fromSymbol.x + fromSymbol.width) {
              clampedPos.x = fromSymbol.x + fromSymbol.width;
            }
            if (clampedPos.x > fromSymbol.x) {
              if (clampedPos.y < fromSymbol.y) {
                clampedPos.y = fromSymbol.y;
              } else if (clampedPos.y > fromSymbol.y + fromSymbol.height) {
                clampedPos.y = fromSymbol.y + fromSymbol.height;
              }
            }
          } else {
            if (clampedPos.x > drawingState.startX) {
              clampedPos.x = drawingState.startX;
            }
          }
        } else if (fromDirection === "right") {
          if (fromSymbol) {
            if (clampedPos.x < fromSymbol.x) {
              clampedPos.x = fromSymbol.x;
            }
            if (clampedPos.x < fromSymbol.x + fromSymbol.width) {
              if (clampedPos.y < fromSymbol.y) {
                clampedPos.y = fromSymbol.y;
              } else if (clampedPos.y > fromSymbol.y + fromSymbol.height) {
                clampedPos.y = fromSymbol.y + fromSymbol.height;
              }
            }
          } else {
            if (clampedPos.x < drawingState.startX) {
              clampedPos.x = drawingState.startX;
            }
          }
        }
      }

      setCurrentMousePos(clampedPos);

      let nearest = null;
      let minDist = 36; 

      for (const hs of allHotspots) {
        if (hs.symbolId === drawingState.startSymbolId && hs.name === drawingState.startTerminal) {
          continue; 
        }
        const dx = hs.absX - clampedPos.x;
        const dy = hs.absY - clampedPos.y;
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
          type: nearest.type,
          direction: nearest.direction,
        });
      } else {
        setHoveredHotspot(null);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning) {
      setIsPanning(false);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_err) {
      }
      return;
    }

    if (draggingHandle || draggingSegment) {
      const finalState = localConnections;
      onConnectionsChange(finalState, "Przesuń trasę", "Przesunięto trasę przewodu");
      setDraggingHandle(null);
      setDraggingSegment(null);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_err) {
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
      const finalIsToTop = hoveredHotspot.isTop ?? (cursorY < hoveredHotspot.absY);

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
        isToTop: finalIsToTop,
        toDirection: hoveredHotspot?.direction,
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
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleHotspotPointerDown = (
    e: React.PointerEvent<SVGCircleElement>,
    hs: TerminalHotspot & { symbolId: string; absX: number; absY: number }
  ) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (drawingState) {
      return;
    }
    
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
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleHotspotPointerDown
  };
}
