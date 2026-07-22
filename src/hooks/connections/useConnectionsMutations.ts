import React from "react";
import type { DrawingState, HoveredHotspot } from "./useConnectionsDrawing";
import type { Point } from "../../lib/routing/wireRoutingEngine";
import type { ConnectionItem, WireColor, WireType, RoutingMode, FerruleColor } from "../../types/connectionItem";
import type { SymbolItem } from "../../types/symbolItem";
import { type TerminalHotspot } from "../../lib/modules/moduleTerminals";
import { useConnectionsDragHandle, type DraggingHandle, type DraggingSegment } from "./useConnectionsDragHandle";
import { useConnectionsDraw } from "./useConnectionsDraw";

export type { DraggingHandle, DraggingSegment };

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
  zoom: number;
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
  pinchActiveRef: React.RefObject<boolean>;
}

export function useConnectionsMutations(props: UseConnectionsMutationsProps) {
  const {
    isPanning,
    setIsPanning,
    panStartRef,
    setViewport,
    pan,
    onConnectionSelect,
    getLogicalPoint,
    pinchActiveRef,
  } = props;

  const { handleDragMove, handleDragEnd } = useConnectionsDragHandle({
    draggingHandle: props.draggingHandle,
    setDraggingHandle: props.setDraggingHandle,
    draggingSegment: props.draggingSegment,
    setDraggingSegment: props.setDraggingSegment,
    localConnections: props.localConnections,
    setLocalConnections: props.setLocalConnections,
    onConnectionsChange: props.onConnectionsChange,
  });

  const {
    handleDrawDown,
    handleDrawMove,
    handleDrawEnd,
    handleHotspotPointerDown,
  } = useConnectionsDraw({
    drawingState: props.drawingState,
    setDrawingState: props.setDrawingState,
    explicitPoints: props.explicitPoints,
    setExplicitPoints: props.setExplicitPoints,
    hoveredHotspot: props.hoveredHotspot,
    setHoveredHotspot: props.setHoveredHotspot,
    currentMousePos: props.currentMousePos,
    setCurrentMousePos: props.setCurrentMousePos,
    symbols: props.symbols,
    allHotspots: props.allHotspots,
    drawingAlignment: props.drawingAlignment,
    localConnections: props.localConnections,
    onConnectionsChange: props.onConnectionsChange,
    onConnectionSelect: props.onConnectionSelect,
    defaultWireSettings: props.defaultWireSettings,
    zoom: props.zoom,
    getLogicalPoint: props.getLogicalPoint,
  });

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pinchActiveRef.current) {
      return;
    }

    if (handleDrawDown(e)) {
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
    if (pinchActiveRef.current) {
      return;
    }
    
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

    if (handleDragMove(logicalPos)) {
      return;
    }

    if (handleDrawMove(logicalPos)) {
      return;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pinchActiveRef.current) {
      return;
    }

    if (isPanning) {
      setIsPanning(false);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_err) {}
      return;
    }

    if (handleDragEnd(e)) {
      return;
    }

    if (handleDrawEnd(e)) {
      return;
    }
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleHotspotPointerDown
  };
}
