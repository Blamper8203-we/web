import React, { useRef, useEffect, useState, useCallback } from "react";
import type { SymbolItem } from "../types/symbolItem";
import type { ProjectMetadata } from "../types/projectMetadata";
import type { SchematicLayout, SchematicNode } from "../lib/schematic/schematicLayout";
import { buildSchematicLayout } from "../lib/schematic/schematicLayoutEngine";
import { renderSchematic, SCHEMATIC_BODY_Y_OFFSET } from "../lib/schematic/schematicRenderer";
import {
  createDefaultViewport,
  resetViewport,
  constrainPan,
  zoomAtPoint,
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
  metadata?: ProjectMetadata;
  resetRequest?: number;
  scrollToPageRequest?: { pageIndex: number; timestamp: number } | null;
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
  metadata,
  resetRequest = 0,
  scrollToPageRequest = null,
}: SchematicCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<HTMLInputElement>(null);
  const [layout, setLayout] = useState<SchematicLayout | null>(null);
  const [viewport, setViewport] = useState<ViewportState>(createDefaultViewport());
  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const animFrameId = useRef<number | null>(null);

  const animateViewport = useCallback((targetVp: ViewportState, durationMs = 250) => {
    if (animFrameId.current !== null) {
      cancelAnimationFrame(animFrameId.current);
    }
    
    const startVp = viewportRef.current;
    const startTime = performance.now();
    
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      
      setViewport({
        panX: startVp.panX + (targetVp.panX - startVp.panX) * ease,
        panY: startVp.panY + (targetVp.panY - startVp.panY) * ease,
        zoom: startVp.zoom + (targetVp.zoom - startVp.zoom) * ease,
      });
      
      if (progress < 1) {
        animFrameId.current = requestAnimationFrame(tick);
      } else {
        animFrameId.current = null;
      }
    };
    
    animFrameId.current = requestAnimationFrame(tick);
  }, []);

  const resetView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) return;
    const target = resetViewport(canvas.width, canvas.height, layout.totalWidth, layout.totalHeight);
    animateViewport(target);
  }, [layout, animateViewport]);

  useEffect(() => {
    if (resetRequest > 0) {
      resetView();
    }
  }, [resetRequest, resetView]);

  useEffect(() => {
    if (scrollToPageRequest && layout) {
      const page = layout.pages.find((p) => p.pageIndex === scrollToPageRequest.pageIndex);
      if (page && canvasRef.current) {
        const targetPanY = -page.offsetY * viewport.zoom + 30; // 30px padding
        animateViewport({ panX: viewport.panX, panY: targetPanY, zoom: viewport.zoom }, 400);
      }
    }
  }, [scrollToPageRequest, layout, animateViewport]);
  
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
      metadata,
    });
  }, [layout, viewport, selectedSymbolId, selectedSymbolIds, metadata]);

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

  // Constrain viewport when layout/zoom changes
  useEffect(() => {
    if (!layout || !canvasRef.current) return;
    const canvas = canvasRef.current;
    
    setViewport(vp =>
      constrainPan(vp, canvas.width, canvas.height, layout.totalWidth, layout.totalHeight)
    );
  }, [layout, viewport.zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault(); // Blocks browser zoom (passive: false is required)

      if (e.ctrlKey || e.metaKey) {
        if (animFrameId.current !== null) {
          cancelAnimationFrame(animFrameId.current);
          animFrameId.current = null;
        }
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const [canvasX, canvasY] = getCanvasPoint(canvas, e.clientX, e.clientY);
        setViewport((vp) => {
          const zoomed = zoomAtPoint(vp, canvasX, canvasY, factor);
          return layout ? constrainPan(zoomed, canvas.width, canvas.height, layout.totalWidth, layout.totalHeight) : zoomed;
        });
      } else {
        if (animFrameId.current !== null) {
          cancelAnimationFrame(animFrameId.current);
          animFrameId.current = null;
        }
        setViewport((vp) => {
          const dx = e.shiftKey ? e.deltaY : e.deltaX;
          const dy = e.shiftKey ? 0 : e.deltaY;
          const panned = { ...vp, panX: vp.panX - dx, panY: vp.panY - dy };
          return layout
            ? constrainPan(panned, canvas.width, canvas.height, layout.totalWidth, layout.totalHeight)
            : panned;
        });
      }
    };

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleNativeWheel);
  }, [layout]);

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

      const clickedNode = layout ? findNodeAtPosition(layout, worldPos[0], worldPos[1]) : null;
      const clickedSymbol = clickedNode
        ? symbols.find((symbol) => symbol.id === clickedNode.id) ?? null
        : null;

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
        if (animFrameId.current !== null) {
          cancelAnimationFrame(animFrameId.current);
          animFrameId.current = null;
        }
        const dx = e.clientX - lastPointer.current.x;
        const dy = e.clientY - lastPointer.current.y;
        
        setViewport((vp) => {
          const panned = { ...vp, panX: vp.panX + dx, panY: vp.panY + dy };
          const canvas = canvasRef.current;
          if (layout && canvas) {
            return constrainPan(panned, canvas.width, canvas.height, layout.totalWidth, layout.totalHeight);
          }
          return panned;
        });
        
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
        let newY = worldPos[1] - SCHEMATIC_BODY_Y_OFFSET;
        const draggedSymbol = symbols.find((symbol) => symbol.id === draggingSymbolId) ?? null;

        if (snapEnabled) {
          const snap = snapToRail(newX, newY, layout, {
            ignoreSymbolIds: [draggingSymbolId],
            moduleRef: draggedSymbol?.moduleRef,
            symbolHeight: draggedSymbol?.height,
            symbolWidth: draggedSymbol?.width,
            symbols,
          });
          if (snap.snappedToRail) {
            newX = snap.snappedX;
            newY = snap.snappedY;
          }
        }

        onSymbolMove?.(draggingSymbolId, newX, newY);
      }
    },
    [isPanning, isDragging, draggingSymbolId, viewport, layout, snapEnabled, onSymbolMove, symbols],
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
    
    const zoomed = zoomAtPoint(viewportRef.current, centerX, centerY, factor);
    const target = layout
      ? constrainPan(zoomed, canvas.width, canvas.height, layout.totalWidth, layout.totalHeight)
      : zoomed;
      
    animateViewport(target);
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
          onClick={resetView}
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
        />

      <CustomScrollbars 
        viewport={viewport} 
        layout={layout} 
        canvasRef={canvasRef} 
        onScroll={(newPanX, newPanY) => {
          if (animFrameId.current !== null) {
            cancelAnimationFrame(animFrameId.current);
            animFrameId.current = null;
          }
          setViewport((vp) =>
            layout && canvasRef.current
              ? constrainPan({ ...vp, panX: newPanX, panY: newPanY }, canvasRef.current.width, canvasRef.current.height, layout.totalWidth, layout.totalHeight)
              : { ...vp, panX: newPanX, panY: newPanY }
          );
        }}
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
  layout: SchematicLayout,
  worldX: number,
  worldY: number,
): SchematicNode | null {
  for (const node of getRootNodes(layout.nodes)) {
    const hit = hitNode(node, worldX, worldY);
    if (hit) {
      return hit;
    }
  }

  return null;
}

function hitNode(
  node: SchematicNode,
  worldX: number,
  worldY: number,
): SchematicNode | null {
  if (
    worldX >= node.x - 4 &&
    worldX <= node.x + node.width + 4 &&
    worldY >= node.y + SCHEMATIC_BODY_Y_OFFSET - 4 &&
    worldY <= node.y + SCHEMATIC_BODY_Y_OFFSET + node.height + 4
  ) {
    return node;
  }

  for (const child of node.children) {
    const hit = hitNode(child, worldX, worldY);
    if (hit) {
      return hit;
    }
  }

  return null;
}

function getRootNodes(nodes: SchematicNode[]): SchematicNode[] {
  const childIds = new Set(nodes.flatMap((node) => node.children.map((child) => child.id)));
  return nodes.filter((node) => !childIds.has(node.id));
}

function CustomScrollbars({
  viewport,
  layout,
  canvasRef,
  onScroll,
}: {
  viewport: ViewportState;
  layout: SchematicLayout | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onScroll: (newPanX: number, newPanY: number) => void;
}) {
  const dragRef = React.useRef<{
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
        <div style={{
          position: "absolute", right: 2, top: 0, bottom: showX ? 14 : 0, width: 10,
          background: "transparent", borderRadius: 5, zIndex: 10, touchAction: "none"
        }}>
          <div 
            onPointerDown={(e) => handlePointerDown(e, "y")}
            style={{
              position: "absolute", top: thumbY, width: "100%", height: thumbHeight,
              background: "var(--scrollbar-thumb)", borderRadius: 5, cursor: "pointer"
            }} 
          />
        </div>
      )}
      {showX && (
        <div style={{
          position: "absolute", left: 0, bottom: 2, right: showY ? 14 : 0, height: 10,
          background: "transparent", borderRadius: 5, zIndex: 10, touchAction: "none"
        }}>
          <div 
            onPointerDown={(e) => handlePointerDown(e, "x")}
            style={{
              position: "absolute", left: thumbX, height: "100%", width: thumbWidth,
              background: "var(--scrollbar-thumb)", borderRadius: 5, cursor: "pointer"
            }} 
          />
        </div>
      )}
    </>
  );
}

