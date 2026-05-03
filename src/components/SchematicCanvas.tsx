import { useRef, useEffect, useState, useCallback } from "react";
import type { SymbolItem } from "../types/symbolItem";
import type { SchematicLayout, SchematicNode } from "../lib/schematic/schematicLayout";
import { buildSchematicLayout } from "../lib/schematic/schematicLayoutEngine";
import { renderSchematic } from "../lib/schematic/schematicRenderer";
import {
  createDefaultViewport,
  zoomAtPoint,
  panBy,
  screenToWorld,
  worldToScreen,
  type ViewportState,
} from "../lib/schematic/schematicViewportController";
import { snapToRail } from "../lib/schematic/schematicSnapService";
import {
  findSchematicCellAt,
  getSchematicCellValue,
  type SchematicCellRect,
  type SchematicEditableField,
} from "../lib/schematic/schematicCellEdit";
import { AppIcon } from "./AppIcon";

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
}

interface EditingCell {
  symbolId: string;
  field: SchematicEditableField;
  initialValue: string;
  value: string;
  rect: SchematicCellRect;
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
}: SchematicCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<HTMLInputElement>(null);
  const [layout, setLayout] = useState<SchematicLayout | null>(null);
  const [viewport, setViewport] = useState<ViewportState>(createDefaultViewport());
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [draggingSymbolId, setDraggingSymbolId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const editingCellRef = useRef<EditingCell | null>(null);
  const lastPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setLayout(buildSchematicLayout(symbols));
  }, [symbols]);

  useEffect(() => {
    onZoomChange?.(Math.round(viewport.zoom * 100));
  }, [onZoomChange, viewport.zoom]);

  useEffect(() => {
    editingCellRef.current = editingCell;
  }, [editingCell]);

  useEffect(() => {
    if (!editingCell) {
      return;
    }

    window.requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      editor.focus();
      const caret = editor.value.length;
      editor.setSelectionRange(caret, caret);
    });
  }, [editingCell]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    renderSchematic(ctx, layout, {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      zoom: viewport.zoom,
      panX: viewport.panX,
      panY: viewport.panY,
      activePageIndex: 0,
      selectedNodeId: selectedSymbolId ?? undefined,
      selectedNodeIds: selectedSymbolIds,
    });
  }, [layout, viewport, selectedSymbolId, selectedSymbolIds]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const [canvasX, canvasY] = getCanvasPoint(canvas, e.clientX, e.clientY);
    setViewport((vp) => zoomAtPoint(vp, canvasX, canvasY, factor));
  }, []);

  const beginCellEdit = useCallback(
    (hit: NonNullable<ReturnType<typeof findSchematicCellAt>>) => {
      const symbol = symbols.find((item) => item.id === hit.node.id);
      if (!symbol) {
        return false;
      }

      const value = getSchematicCellValue(symbol, hit.node, hit.field);
      const nextCell = {
        symbolId: symbol.id,
        field: hit.field,
        initialValue: value,
        value,
        rect: hit.rect,
      };

      editingCellRef.current = nextCell;
      setEditingCell(nextCell);
      onSymbolSelect?.(symbol.id);
      return true;
    },
    [onSymbolSelect, symbols],
  );

  const commitCellEdit = useCallback(() => {
    const current = editingCellRef.current;
    if (!current) {
      return;
    }

    editingCellRef.current = null;
    setEditingCell(null);

    if (current.value !== current.initialValue) {
      onCellEdit?.(current.symbolId, current.field, current.value);
    }
  }, [onCellEdit]);

  const cancelCellEdit = useCallback(() => {
    editingCellRef.current = null;
    setEditingCell(null);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.pointerType === "mouse" && (e.button === 1 || (e.button === 0 && e.altKey))) {
        commitCellEdit();
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.setPointerCapture(e.pointerId);
        }
        setIsPanning(true);
        lastPointer.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (e.pointerType === "mouse" && e.button !== 0) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const [canvasX, canvasY] = getCanvasPoint(canvas, e.clientX, e.clientY);
      const worldPos = screenToWorld(viewport, canvasX, canvasY);

      const cellHit = layout ? findSchematicCellAt(layout, worldPos[0], worldPos[1]) : null;
      if (cellHit) {
        commitCellEdit();
        if (beginCellEdit(cellHit)) {
          e.preventDefault();
          return;
        }
      }

      commitCellEdit();
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.setPointerCapture(e.pointerId);
      }

      const clickedNode = layout ? findNodeAtPosition(layout.nodes, worldPos[0], worldPos[1]) : null;
      const clickedSymbol = clickedNode
        ? symbols.find((symbol) => symbol.id === clickedNode.id) ?? null
        : findSymbolAtPosition(symbols, worldPos[0], worldPos[1]);

      if (clickedSymbol) {
        const shouldToggle = e.ctrlKey || e.metaKey;
        const keepsMultiSelection =
          !shouldToggle &&
          selectedSymbolIds.length > 1 &&
          selectedSymbolIds.includes(clickedSymbol.id);

        setIsDragging(true);
        setDraggingSymbolId(clickedSymbol.id);
        onSymbolMoveStart?.(clickedSymbol.id);
        if (!keepsMultiSelection) {
          onSymbolSelect?.(clickedSymbol.id, { toggle: shouldToggle });
        }
      } else {
        onSymbolSelect?.(null);
        setIsPanning(true);
        lastPointer.current = { x: e.clientX, y: e.clientY };
      }
    },
    [
      beginCellEdit,
      commitCellEdit,
      viewport,
      layout,
      symbols,
      selectedSymbolIds,
      onSymbolMoveStart,
      onSymbolSelect,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isPanning) {
        const dx = e.clientX - lastPointer.current.x;
        const dy = e.clientY - lastPointer.current.y;
        setViewport((vp) => panBy(vp, dx, dy));
        lastPointer.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (isDragging && draggingSymbolId && layout) {
        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }

        const [canvasX, canvasY] = getCanvasPoint(canvas, e.clientX, e.clientY);
        const worldPos = screenToWorld(viewport, canvasX, canvasY);
        let newX = worldPos[0];
        let newY = worldPos[1];

        if (snapEnabled) {
          const snap = snapToRail(newX, newY, layout);
          if (snap.snappedToRail) {
            newX = snap.snappedX;
            newY = snap.snappedY;
          }
        }

        onSymbolMove?.(draggingSymbolId, newX, newY);
      }
    },
    [isPanning, isDragging, draggingSymbolId, viewport, layout, snapEnabled, onSymbolMove],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (isDragging && draggingSymbolId) {
      onSymbolMoveEnd?.(draggingSymbolId);
    }

    setIsPanning(false);
    setIsDragging(false);
    setDraggingSymbolId(null);
  }, [isDragging, draggingSymbolId, onSymbolMoveEnd]);

  const zoomAroundCanvasCenter = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setViewport((vp) => zoomAtPoint(vp, centerX, centerY, factor));
  };

  const editorPosition = editingCell ? getEditorPosition(editingCell.rect, viewport) : null;

  return (
    <div
      className={`schematic-workspace ${isDropTarget ? "is-drop-target" : ""}`}
      onDragEnter={(e) => {
        const types = Array.from(e.dataTransfer.types).map(t => t.toLowerCase());
        if (!types.includes("application/x-dinboard-palette")) {
          return;
        }

        e.preventDefault();
        setIsDropTarget(true);
      }}
      onDragOver={(e) => {
        const types = Array.from(e.dataTransfer.types).map(t => t.toLowerCase());
        if (!types.includes("application/x-dinboard-palette")) {
          return;
        }

        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setIsDropTarget(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) {
          return;
        }

        setIsDropTarget(false);
      }}
      onDrop={(e) => {
        const templateId = e.dataTransfer.getData("application/x-dinboard-palette") || e.dataTransfer.getData("text/plain");
        if (!templateId) {
          setIsDropTarget(false);
          return;
        }

        e.preventDefault();
        setIsDropTarget(false);

        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }

        const [canvasX, canvasY] = getCanvasPoint(canvas, e.clientX, e.clientY);
        const worldPos = screenToWorld(viewport, canvasX, canvasY);
        let nextX = worldPos[0];
        let nextY = worldPos[1];

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
      <div className="schematic-zoom-dock" aria-label="Sterowanie zoomem">
        <button
          type="button"
          className="workspace-tool-btn"
          title="Pomniejsz"
          aria-label="Pomniejsz"
          onClick={() => zoomAroundCanvasCenter(1 / 1.15)}
        >
          <AppIcon name="zoomOut" size={17} />
        </button>
        <button
          type="button"
          className="workspace-tool-btn"
          title="Dopasuj do widoku"
          aria-label="Dopasuj do widoku"
          onClick={() => setViewport(createDefaultViewport())}
        >
          <AppIcon name="zoomFit" size={17} />
        </button>
        <button
          type="button"
          className="workspace-tool-btn"
          title="Powiększ"
          aria-label="Powiększ"
          onClick={() => zoomAroundCanvasCenter(1.15)}
        >
          <AppIcon name="zoomIn" size={17} />
        </button>
        <div className="schematic-zoom-badge">{Math.round(viewport.zoom * 100)}%</div>
      </div>

      <canvas
        ref={canvasRef}
        className="schematic-canvas"
        style={{
          cursor: isPanning ? "grabbing" : isDragging ? "move" : "default",
          touchAction: "none",
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      {editingCell && editorPosition && (
        <input
          ref={editorRef}
          className="schematic-cell-editor"
          value={editingCell.value}
          style={{
            left: editorPosition.left,
            top: editorPosition.top,
            width: editorPosition.width,
            height: editorPosition.height,
            fontSize: editorPosition.fontSize,
            padding: `${editorPosition.paddingY}px ${editorPosition.paddingX}px`,
            lineHeight: `${editorPosition.lineHeight}px`,
          }}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setEditingCell((current) => {
              if (!current) {
                return current;
              }

              const next = { ...current, value };
              editingCellRef.current = next;
              return next;
            });
          }}
          onBlur={commitCellEdit}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              commitCellEdit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              cancelCellEdit();
            }
          }}
          onPointerDown={(event) => event.stopPropagation()}
        />
      )}

      {isDropTarget && (
        <div className="schematic-drop-overlay">
          <div className="schematic-drop-card schematic-drop-card--compact">
            <strong>Upuść moduł na arkusz</strong>
          </div>
        </div>
      )}

    </div>
  );
}

function getEditorPosition(
  rect: SchematicCellRect,
  viewport: ViewportState,
): {
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  paddingX: number;
  paddingY: number;
  lineHeight: number;
} {
  const [left, top] = worldToScreen(viewport, rect.x, rect.y);
  const height = rect.height * viewport.zoom;
  const fontSize = Math.max(10.5, Math.min(11.5 * viewport.zoom, height * 0.62));

  return {
    left,
    top,
    width: rect.width * viewport.zoom,
    height,
    fontSize,
    paddingX: Math.max(6, 8 * viewport.zoom),
    paddingY: Math.max(2, 3 * viewport.zoom),
    lineHeight: fontSize,
  };
}

function getCanvasPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): [number, number] {
  const rect = canvas.getBoundingClientRect();
  return [clientX - rect.left, clientY - rect.top];
}

function findNodeAtPosition(
  nodes: SchematicNode[],
  worldX: number,
  worldY: number,
): SchematicNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (
      worldX >= node.x &&
      worldX <= node.x + node.width &&
      worldY >= node.y &&
      worldY <= node.y + node.height
    ) {
      return node;
    }
  }

  return null;
}

function findSymbolAtPosition(
  symbols: SymbolItem[],
  worldX: number,
  worldY: number,
): SymbolItem | null {
  for (const symbol of symbols) {
    if (
      worldX >= symbol.x &&
      worldX <= symbol.x + symbol.width &&
      worldY >= symbol.y &&
      worldY <= symbol.y + symbol.height
    ) {
      return symbol;
    }
  }

  return null;
}
