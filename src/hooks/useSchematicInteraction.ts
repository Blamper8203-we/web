import { useState, useCallback, useRef } from "react";
import type { SchematicLayout, SchematicNode } from "../lib/schematic/schematicLayout";
import { findSchematicCellAt } from "../lib/schematic/schematicCellEdit";
import { screenToWorld, constrainPan, type ViewportState } from "../lib/schematic/schematicViewportController";
import { snapToRail } from "../lib/schematic/schematicSnapService";
import type { SymbolItem } from "../types/symbolItem";
import { SCHEMATIC_BODY_Y_OFFSET } from "../lib/schematic/schematicRenderer";

export function useSchematicInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  layout: SchematicLayout | null,
  symbols: SymbolItem[],
  viewport: ViewportState,
  setViewport: React.Dispatch<React.SetStateAction<ViewportState>>,
  stopAnimation: () => void,
  selectedSymbolIds: string[],
  beginCellEdit: (hit: NonNullable<ReturnType<typeof findSchematicCellAt>>) => boolean,
  commitCellEdit: () => void,
  onSymbolMoveStart?: (symbolId: string) => void,
  onSymbolMove?: (symbolId: string, x: number, y: number) => void,
  onSymbolMoveEnd?: (symbolId: string) => void,
  onSymbolSelect?: (symbolId: string | null, options?: { toggle?: boolean }) => void,
  snapEnabled = true,
) {
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingSymbolId, setDraggingSymbolId] = useState<string | null>(null);
  const lastPointer = useRef({ x: 0, y: 0 });

  const getCanvasPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    return [clientX - rect.left, clientY - rect.top];
  };

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
      canvasRef,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isPanning) {
        stopAnimation();
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
    [isPanning, isDragging, draggingSymbolId, viewport, layout, snapEnabled, onSymbolMove, symbols, canvasRef, stopAnimation, setViewport],
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

  return {
    isPanning,
    isDragging,
    draggingSymbolId,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    getCanvasPoint,
  };
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
