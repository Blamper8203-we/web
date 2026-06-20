import { useState } from "react";
import type { Point } from "../../lib/routing/wireRoutingEngine";

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

export function useConnectionsDrawing() {
  const [explicitPoints, setExplicitPoints] = useState<Point[]>([]);
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<Point | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<HoveredHotspot | null>(null);
  
  const [hoveredSymbolId, setHoveredSymbolId] = useState<string | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);

  const cancelDrawing = () => {
    setDrawingState(null);
    setCurrentMousePos(null);
    setHoveredHotspot(null);
    setExplicitPoints([]);
  };

  return {
    explicitPoints,
    setExplicitPoints,
    drawingState,
    setDrawingState,
    currentMousePos,
    setCurrentMousePos,
    hoveredHotspot,
    setHoveredHotspot,
    hoveredSymbolId,
    setHoveredSymbolId,
    hoveredWireId,
    setHoveredWireId,
    cancelDrawing,
  };
}
