import React from "react";
import type { Point } from "../../lib/routing/wireRoutingEngine";
import type { ConnectionItem } from "../../types/connectionItem";

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

export interface UseConnectionsDragHandleProps {
  draggingHandle: DraggingHandle | null;
  setDraggingHandle: (val: DraggingHandle | null) => void;
  draggingSegment: DraggingSegment | null;
  setDraggingSegment: (val: DraggingSegment | null) => void;
  localConnections: ConnectionItem[];
  setLocalConnections: React.Dispatch<React.SetStateAction<ConnectionItem[]>>;
  onConnectionsChange: (conns: ConnectionItem[], reason: string, description: string) => void;
}

export function useConnectionsDragHandle({
  draggingHandle,
  setDraggingHandle,
  draggingSegment,
  setDraggingSegment,
  localConnections,
  setLocalConnections,
  onConnectionsChange,
}: UseConnectionsDragHandleProps) {
  const handleDragMove = (logicalPos: Point) => {
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
      return true;
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
      return true;
    }

    return false;
  };

  const handleDragEnd = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingHandle || draggingSegment) {
      const finalState = localConnections;
      onConnectionsChange(finalState, "Przesuń trasę", "Przesunięto trasę przewodu");
      setDraggingHandle(null);
      setDraggingSegment(null);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_err) {
      }
      return true;
    }
    return false;
  };

  return {
    handleDragMove,
    handleDragEnd,
  };
}
