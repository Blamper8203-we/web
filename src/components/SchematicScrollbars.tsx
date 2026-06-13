import React, { useRef } from "react";
import type { ViewportState } from "../lib/schematic/schematicViewportController";
import type { SchematicLayout } from "../lib/schematic/schematicLayout";

interface SchematicScrollbarsProps {
  viewport: ViewportState;
  layout: SchematicLayout | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onScroll: (newPanX: number, newPanY: number) => void;
}

export function SchematicScrollbars({
  viewport,
  layout,
  canvasRef,
  onScroll,
}: SchematicScrollbarsProps) {
  const dragRef = useRef<{
    axis: "x" | "y";
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  if (!layout || !canvasRef.current) return null;

  const canvasWidth = canvasRef.current.width;
  const canvasHeight = canvasRef.current.height;

  const contentWidth = layout.totalWidth * viewport.zoom;
  const contentHeight = layout.totalHeight * viewport.zoom;

  const showX = contentWidth > canvasWidth;
  const showY = contentHeight > canvasHeight;

  const thumbWidth = Math.max(30, (canvasWidth / contentWidth) * canvasWidth);
  const thumbHeight = Math.max(30, (canvasHeight / contentHeight) * canvasHeight);

  const maxPanX = contentWidth - canvasWidth;
  const progressX = maxPanX > 0 ? Math.min(1, Math.max(0, -viewport.panX / maxPanX)) : 0;
  const thumbX = progressX * (canvasWidth - thumbWidth);

  const maxPanY = contentHeight - canvasHeight;
  const progressY = maxPanY > 0 ? Math.min(1, Math.max(0, -viewport.panY / maxPanY)) : 0;
  const thumbY = progressY * (canvasHeight - thumbHeight);

  const handlePointerDown = (e: React.PointerEvent, axis: "x" | "y") => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      axis,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: viewport.panX,
      startPanY: viewport.panY,
    };
    
    const handleMove = (moveEv: PointerEvent) => {
      if (!dragRef.current) return;
      const { axis, startX, startY, startPanX, startPanY } = dragRef.current;
      
      if (axis === "x") {
        const dx = moveEv.clientX - startX;
        const trackWidth = canvasWidth - thumbWidth;
        const panChange = trackWidth > 0 ? (dx / trackWidth) * maxPanX : 0;
        onScroll(startPanX - panChange, startPanY);
      } else {
        const dy = moveEv.clientY - startY;
        const trackHeight = canvasHeight - thumbHeight;
        const panChange = trackHeight > 0 ? (dy / trackHeight) * maxPanY : 0;
        onScroll(startPanX, startPanY - panChange);
      }
    };
    
    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <>
      {showY && (
        <div className="schematic-scrollbar schematic-scrollbar-y">
          <div
            className="schematic-scrollbar-thumb"
            style={{ height: thumbHeight, transform: `translateY(${thumbY}px)` }}
            onPointerDown={(e) => handlePointerDown(e, "y")}
          />
        </div>
      )}
      {showX && (
        <div className="schematic-scrollbar schematic-scrollbar-x">
          <div
            className="schematic-scrollbar-thumb"
            style={{ width: thumbWidth, transform: `translateX(${thumbX}px)` }}
            onPointerDown={(e) => handlePointerDown(e, "x")}
          />
        </div>
      )}
    </>
  );
}
