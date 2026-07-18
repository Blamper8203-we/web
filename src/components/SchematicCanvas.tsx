import { useRef, useEffect, useState, useCallback } from "react";
import type { SymbolItem } from "../types/symbolItem";
import type { ProjectMetadata } from "../types/projectMetadata";
import type { SchematicLayout } from "../lib/schematic/schematicLayout";
import { buildSchematicLayout } from "../lib/schematic/schematicLayoutEngine";
import { renderSchematic, SCHEMATIC_BODY_Y_OFFSET } from "../lib/schematic/schematicRenderer";
import { snapToRail } from "../lib/schematic/schematicSnapService";
import { type SchematicEditableField } from "../lib/schematic/schematicCellEdit";
import { screenToWorld } from "../lib/schematic/schematicViewportController";

import { useSchematicViewport } from "../hooks/useSchematicViewport";
import { useSchematicInteraction } from "../hooks/useSchematicInteraction";
import { useSchematicPinch } from "../hooks/useSchematicPinch";
import { useSchematicCellEdit } from "../hooks/useSchematicCellEdit";

import { SchematicZoomDock } from "./SchematicZoomDock";
import { SchematicCellEditor } from "./SchematicCellEditor";
import { SchematicScrollbars } from "./SchematicScrollbars";
import "./SchematicCanvas.css";

interface SchematicCanvasProps {
  symbols: SymbolItem[];
  onSymbolMoveStart?: (symbolId: string) => void;
  onSymbolMove?: (symbolId: string, x: number, y: number) => void;
  onSymbolMoveEnd?: (symbolId: string) => void;
  onSymbolSelect?: (symbolId: string | null, options?: { toggle?: boolean }) => void;
  onPaletteDrop?: (templateId: string, x: number, y: number) => void;
  onCellEdit?: (symbolId: string, field: SchematicEditableField, value: string) => void;
  selectedSymbolId?: string | null;
  selectedSymbolIds?: string[];
  snapEnabled?: boolean;
  onZoomChange?: (zoomPercent: number) => void;
  metadata?: ProjectMetadata;
  resetRequest?: number;
  scrollToPageRequest?: { pageIndex: number; timestamp: number } | null;
}

export function SchematicCanvas({
  symbols,
  onSymbolMoveStart,
  onSymbolMove,
  onSymbolMoveEnd,
  onSymbolSelect,
  onPaletteDrop,
  onCellEdit,
  selectedSymbolId,
  selectedSymbolIds = selectedSymbolId ? [selectedSymbolId] : [],
  snapEnabled = true,
  onZoomChange,
  metadata,
  resetRequest = 0,
  scrollToPageRequest = null,
}: SchematicCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layout, setLayout] = useState<SchematicLayout | null>(null);

  useEffect(() => {
    setLayout(buildSchematicLayout(symbols));
  }, [symbols]);

  const {
    viewport,
    setViewport,
    resetView,
    zoomAroundCanvasCenter,
    stopAnimation,
  } = useSchematicViewport(layout, canvasRef, resetRequest, scrollToPageRequest, onZoomChange);

  // Pinch-to-zoom (2 palce) na mobile. Przed interaction hook — przekazujemy
  // mu pinchActiveRef, by single-pointer panning/drag nie konkurował z pinch.
  const {
    pinchActiveRef: schematicPinchActiveRef,
    onTouchStart: onSchematicPinchStart,
    onTouchMove: onSchematicPinchMove,
    onTouchEnd: onSchematicPinchEnd,
  } = useSchematicPinch({
    canvasRef,
    layout,
    viewport,
    setViewport,
  });

  const {
    editingCell,
    setEditingCell,
    beginCellEdit,
    commitCellEdit,
    cancelCellEdit,
  } = useSchematicCellEdit(symbols, onCellEdit, onSymbolSelect);

  const {
    isPanning,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    getCanvasPoint,
  } = useSchematicInteraction(
    canvasRef,
    layout,
    symbols,
    viewport,
    setViewport,
    stopAnimation,
    selectedSymbolIds,
    beginCellEdit,
    commitCellEdit,
    onSymbolMoveStart,
    onSymbolMove,
    onSymbolMoveEnd,
    onSymbolSelect,
    snapEnabled,
    schematicPinchActiveRef,
  );

  const [isDropTarget, setIsDropTarget] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderSchematic(ctx, layout, {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      zoom: viewport.zoom,
      panX: viewport.panX,
      panY: viewport.panY,
      activePageIndex: 0,
      selectedNodeId: selectedSymbolId ?? undefined,
      selectedNodeIds: selectedSymbolIds,
      metadata,
    });
  }, [layout, viewport, selectedSymbolId, selectedSymbolIds, metadata]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  return (
    <div
      className={`schematic-workspace ${isDropTarget ? "is-drop-target" : ""}`}
      onDragEnter={(e) => {
        const types = Array.from(e.dataTransfer.types).map((t) => t.toLowerCase());
        if (!types.includes("application/x-dinboard-palette")) return;
        e.preventDefault();
        setIsDropTarget(true);
      }}
      onDragOver={(e) => {
        const types = Array.from(e.dataTransfer.types).map((t) => t.toLowerCase());
        if (!types.includes("application/x-dinboard-palette")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setIsDropTarget(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setIsDropTarget(false);
      }}
      onDrop={(e) => {
        const templateId =
          e.dataTransfer.getData("application/x-dinboard-palette") ||
          e.dataTransfer.getData("text/plain");
        if (!templateId) {
          setIsDropTarget(false);
          return;
        }
        e.preventDefault();
        setIsDropTarget(false);

        const canvas = canvasRef.current;
        if (!canvas) return;

        const [canvasX, canvasY] = getCanvasPoint(canvas, e.clientX, e.clientY);
        const worldPos = screenToWorld(viewport, canvasX, canvasY);
        let nextX = worldPos[0];
        let nextY = worldPos[1] - SCHEMATIC_BODY_Y_OFFSET;

        if (snapEnabled && layout) {
          const snap = snapToRail(nextX, nextY, layout);
          if (snap.snappedToRail) {
            nextX = snap.snappedX;
            nextY = snap.snappedY;
          }
        }
        onPaletteDrop?.(templateId, nextX, nextY);
      }}
    >
      <SchematicZoomDock
        zoomPercent={Math.round(viewport.zoom * 100)}
        onZoomIn={() => zoomAroundCanvasCenter(1.15)}
        onZoomOut={() => zoomAroundCanvasCenter(1 / 1.15)}
        onZoomFit={resetView}
      />

      <canvas
        ref={canvasRef}
        className="schematic-canvas"
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          display: "block",
          cursor: isPanning ? "grabbing" : isDragging ? "move" : "default",
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={onSchematicPinchStart}
        onTouchMove={onSchematicPinchMove}
        onTouchEnd={onSchematicPinchEnd}
      />

      <SchematicScrollbars
        viewport={viewport}
        layout={layout}
        canvasRef={canvasRef}
        onScroll={(newPanX, newPanY) => {
          stopAnimation();
          setViewport((vp) => ({ ...vp, panX: newPanX, panY: newPanY }));
        }}
      />

      {editingCell && (
        <SchematicCellEditor
          editingCell={editingCell}
          viewport={viewport}
          onChange={(value) => setEditingCell((current) => current ? { ...current, value } : null)}
          onCommit={commitCellEdit}
          onCancel={cancelCellEdit}
        />
      )}
    </div>
  );
}
