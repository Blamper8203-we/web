import { useCallback, useRef, useState } from "react";
import { snapModulePlacementToDinRail } from "../../lib/dinRailSnap";
import { snapListwaPlacement } from "../../lib/dinRail/listwySnap";
import {
  expandSelectionToGroupIds,
  getDragSelectionIds,
  rectsIntersect,
} from "../../lib/dinRailSelection";
import type { SymbolItem } from "../../types/symbolItem";
import type { InteractionState, WorldPoint, WorldRect } from "../../lib/dinRailCanvas/types";
import type { DinRailCanvasRail } from "../../components/DinRailCanvasPixi";

export function useDinRailInteraction({
  rail,
  snappedSymbols,
  selectedIds,
  interactiveRects,
  rowCenters,
  getPaletteTemplate,
  flushViewportState,
  setPanSafe,
  panRef,
  screenToWorld,
  onSymbolMoveStart,
  onSymbolMove,
  onSymbolMoveEnd,
  onSymbolSelect,
  onSymbolSelectionChange,
}: {
  rail: DinRailCanvasRail;
  snappedSymbols: SymbolItem[];
  selectedIds: Set<string>;
  interactiveRects: Map<string, WorldRect>;
  rowCenters: number[];
  getPaletteTemplate?: (templateId: string) => { category?: string; moduleRef?: string } | undefined;
  flushViewportState: () => void;
  setPanSafe: (pan: WorldPoint) => void;
  panRef: React.MutableRefObject<WorldPoint>;
  screenToWorld: (clientX: number, clientY: number) => WorldPoint;
  onSymbolMoveStart?: (symbolId: string) => void;
  onSymbolMove?: (symbolId: string, x: number, y: number) => void;
  onSymbolMoveEnd?: (symbolId: string) => void;
  onSymbolSelect?: (symbolId: string | null, options?: { toggle?: boolean }) => void;
  onSymbolSelectionChange?: (symbolIds: string[], activeId?: string | null) => void;
}) {
  const interactionRef = useRef<InteractionState>({ mode: "idle" });
  const [selectionRect, setSelectionRect] = useState<WorldRect | null>(null);

  const snapModulePlacement = useCallback(
    (
      x: number,
      y: number,
      width: number,
      height: number,
      dragSymbolId?: string,
      options?: {
        forceSnapToRail?: boolean;
        ignoreSymbolIds?: string[];
        isCurrentlySnapped?: boolean;
        moduleRef?: string;
      },
    ) => {
      const template = getPaletteTemplate?.(options?.moduleRef ?? "");
      const isTerminalBlock = template?.category === "Listwy do rozdzielnicy" || template?.category === "GSU";

      if (isTerminalBlock) {
        return snapListwaPlacement({
          x,
          y,
          width,
          height,
          railWidth: rail.width,
          railRows: rail.config.rows,
        });
      }

      return snapModulePlacementToDinRail(
        x,
        y,
        width,
        height,
        rail.width,
        rowCenters,
        snappedSymbols,
        dragSymbolId,
        options,
      );
    },
    [getPaletteTemplate, rail.config.rows, rail.width, rowCenters, snappedSymbols],
  );

  const commitSelectionRect = useCallback((rect: WorldRect) => {
    const selectedSet = new Set<string>();
    for (const symbol of snappedSymbols) {
      const interactiveRect = interactiveRects.get(symbol.id) ?? symbol;
      if (rectsIntersect(rect, interactiveRect)) {
        selectedSet.add(symbol.id);
      }
    }

    const ids = Array.from(selectedSet);
    const expandedIds = expandSelectionToGroupIds(ids, snappedSymbols);
    onSymbolSelectionChange?.(expandedIds, ids[ids.length - 1] ?? null);
  }, [interactiveRects, onSymbolSelectionChange, snappedSymbols]);

  const handleSurfacePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!rail.isVisible) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    if (event.button === 1) {
      interactionRef.current = {
        mode: "pan",
        lastX: event.clientX,
        lastY: event.clientY,
      };
      return;
    }

    const worldPoint = screenToWorld(event.clientX, event.clientY);

    interactionRef.current = {
      mode: "select",
      anchorWorld: worldPoint,
    };

    setSelectionRect({
      x: worldPoint.x,
      y: worldPoint.y,
      width: 0,
      height: 0,
    });
  }, [rail.isVisible, screenToWorld]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;

    if (interaction.mode === "pan") {
      const dx = event.clientX - interaction.lastX;
      const dy = event.clientY - interaction.lastY;
      interactionRef.current = {
        mode: "pan",
        lastX: event.clientX,
        lastY: event.clientY,
      };
      setPanSafe({
        x: panRef.current.x + dx,
        y: panRef.current.y + dy,
      });
      return;
    }

    const worldPoint = screenToWorld(event.clientX, event.clientY);

    if (interaction.mode === "select") {
      setSelectionRect({
        x: Math.min(interaction.anchorWorld.x, worldPoint.x),
        y: Math.min(interaction.anchorWorld.y, worldPoint.y),
        width: Math.abs(worldPoint.x - interaction.anchorWorld.x),
        height: Math.abs(worldPoint.y - interaction.anchorWorld.y),
      });
      return;
    }

    if (interaction.mode !== "drag") {
      return;
    }

    const anchorSymbol = snappedSymbols.find((symbol) => symbol.id === interaction.anchorId);
    if (!anchorSymbol) {
      return;
    }

    const candidateX =
      interaction.anchorRectStart.x + (worldPoint.x - interaction.pointerWorldStart.x);
    const candidateY =
      interaction.anchorRectStart.y + (worldPoint.y - interaction.pointerWorldStart.y);
    const snappedAnchor = snapModulePlacement(
      candidateX,
      candidateY,
      interaction.anchorRectStart.width,
      interaction.anchorRectStart.height,
      anchorSymbol.id,
      {
        isCurrentlySnapped: anchorSymbol.isSnappedToRail,
        ignoreSymbolIds: interaction.dragIds.length > 1 ? interaction.dragIds : undefined,
        moduleRef: anchorSymbol.moduleRef,
      },
    );
    const deltaX = snappedAnchor.x - interaction.anchorRectStart.x;
    const deltaY = snappedAnchor.y - interaction.anchorRectStart.y;

    for (const id of interaction.dragIds) {
      const startPosition = interaction.startPositions.get(id);
      if (!startPosition) {
        continue;
      }

      onSymbolMove?.(id, startPosition.x + deltaX, startPosition.y + deltaY);
    }
  }, [onSymbolMove, screenToWorld, setPanSafe, snapModulePlacement, snappedSymbols, panRef]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    flushViewportState();
    const interaction = interactionRef.current;

    if (interaction.mode === "drag") {
      onSymbolMoveEnd?.(interaction.anchorId);
    }

    if (interaction.mode === "select" && selectionRect) {
      const area = selectionRect.width * selectionRect.height;
      if (area < 16) {
        onSymbolSelect?.(null);
      } else {
        commitSelectionRect(selectionRect);
      }
    }

    interactionRef.current = { mode: "idle" };
    setSelectionRect(null);
  }, [commitSelectionRect, flushViewportState, onSymbolMoveEnd, onSymbolSelect, selectionRect]);

  const beginDragForSymbol = useCallback((
    event: React.PointerEvent<HTMLElement>,
    symbolId: string,
  ) => {
    if (!rail.isVisible) {
      return;
    }

    const svgContainer = event.currentTarget.closest(".din-rail-svg-container");
    if (svgContainer instanceof HTMLElement) {
      svgContainer.setPointerCapture(event.pointerId);
    }
    event.stopPropagation();

    if (event.button === 1) {
      interactionRef.current = {
        mode: "pan",
        lastX: event.clientX,
        lastY: event.clientY,
      };
      return;
    }

    const draggedSymbol = snappedSymbols.find((symbol) => symbol.id === symbolId);
    if (!draggedSymbol) {
      return;
    }

    const worldPoint = screenToWorld(event.clientX, event.clientY);
    const anchorRectStart = {
      x: draggedSymbol.x,
      y: draggedSymbol.y,
      width: draggedSymbol.width,
      height: draggedSymbol.height,
    };
    const dragIds = getDragSelectionIds(draggedSymbol.id, snappedSymbols, selectedIds);
    const startPositions = new Map(
      dragIds.map((id: string) => {
        const symbol = snappedSymbols.find((entry) => entry.id === id)!;
        return [id, { x: symbol.x, y: symbol.y }] as const;
      }),
    );

    interactionRef.current = {
      mode: "drag",
      anchorId: draggedSymbol.id,
      anchorRectStart,
      dragIds,
      pointerWorldStart: worldPoint,
      startPositions,
    };
    onSymbolMoveStart?.(draggedSymbol.id);
    onSymbolSelect?.(draggedSymbol.id, { toggle: event.ctrlKey || event.metaKey });
  }, [onSymbolMoveStart, onSymbolSelect, rail.isVisible, screenToWorld, selectedIds, snappedSymbols]);

  return {
    selectionRect,
    handleSurfacePointerDown,
    handlePointerMove,
    handlePointerUp,
    beginDragForSymbol,
    snapModulePlacement,
  };
}
