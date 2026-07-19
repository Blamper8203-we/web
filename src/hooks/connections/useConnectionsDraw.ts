import React from "react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import type { Point } from "../../lib/routing/wireRoutingEngine";
import type { DrawingState, HoveredHotspot } from "./useConnectionsDrawing";
import type { ConnectionItem, WireColor, WireType, RoutingMode, FerruleColor } from "../../types/connectionItem";
import type { SymbolItem } from "../../types/symbolItem";
import { getSymbolTerminals, type TerminalHotspot, findTerminalByName } from "../../lib/modules/moduleTerminals";
import { getOrthoExit } from "../../lib/routing/wireRoutingEngine";
import { createDefaultConnection } from "../../types/connectionItem";

export interface UseConnectionsDrawProps {
  drawingState: DrawingState | null;
  setDrawingState: (val: DrawingState | null) => void;
  explicitPoints: Point[];
  setExplicitPoints: (val: Point[] | ((prev: Point[]) => Point[])) => void;
  hoveredHotspot: HoveredHotspot | null;
  setHoveredHotspot: (val: HoveredHotspot | null) => void;
  currentMousePos: Point | null;
  setCurrentMousePos: (val: Point | null) => void;
  symbols: SymbolItem[];
  allHotspots: Array<TerminalHotspot & { symbolId: string; absX: number; absY: number }>;
  drawingAlignment: { snappedPt: Point | null; guides: any[] };
  localConnections: ConnectionItem[];
  onConnectionsChange: (conns: ConnectionItem[], reason: string, description: string) => void;
  onConnectionSelect: (id: string | null) => void;
  defaultWireSettings: {
    wireColor: WireColor;
    wireCrossSection: number;
    wireType: WireType;
    routingMode: RoutingMode;
    ferruleColor?: FerruleColor;
  };
  zoom: number;
  getLogicalPoint: (clientX: number, clientY: number) => Point;
}

export function useConnectionsDraw({
  drawingState,
  setDrawingState,
  explicitPoints,
  setExplicitPoints,
  hoveredHotspot,
  setHoveredHotspot,
  currentMousePos,
  setCurrentMousePos,
  symbols,
  allHotspots,
  drawingAlignment,
  localConnections,
  onConnectionsChange,
  onConnectionSelect,
  defaultWireSettings,
  zoom,
  getLogicalPoint,
}: UseConnectionsDrawProps) {

  const handleHotspotPointerDown = (
    e: React.PointerEvent<SVGCircleElement>,
    hs: TerminalHotspot & { symbolId: string; absX: number; absY: number }
  ) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (drawingState) {
      return;
    }
    
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light });
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
    if (e.pointerType !== "touch") {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handleDrawDown = (e: React.PointerEvent<SVGSVGElement>): boolean => {
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
      return true;
    }

    if (drawingState && e.button === 0) {
      if (hoveredHotspot) return true;

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
      return true;
    }
    
    return false;
  };

  const handleDrawMove = (logicalPos: Point): boolean => {
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
      let minDist = zoom > 0 ? 36 / zoom : 36;

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
      return true;
    }
    return false;
  };

  const handleDrawEnd = (e: React.PointerEvent<SVGSVGElement>): boolean => {
    if (drawingState && hoveredHotspot) {
      if (drawingState.startSymbolId === hoveredHotspot.symbolId && drawingState.startTerminal === hoveredHotspot.terminalName) {
        return true;
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
        
        if (Capacitor.isNativePlatform()) {
          Haptics.impact({ style: ImpactStyle.Light });
        }
      }

      setDrawingState(null);
      setCurrentMousePos(null);
      setHoveredHotspot(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
      return true;
    }
    return false;
  };

  return {
    handleHotspotPointerDown,
    handleDrawDown,
    handleDrawMove,
    handleDrawEnd,
  };
}
