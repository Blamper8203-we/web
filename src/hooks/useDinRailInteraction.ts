import { useCallback, useRef, useState } from "react";
import type { InteractionState, WorldPoint, WorldRect } from "../components/canvasLayers/canvasTypes";
import type { SymbolItem } from "../types/symbolItem";
import { getPaletteTemplateDimensions, supportsDinRailPlacement } from "../lib/modules/moduleCatalog";
import { expandSelectionToGroupIds, getDragSelectionIds, rectsIntersect } from "../lib/dinRailSelection";

export function useDinRailInteraction({
  isRailVisible,
  screenToWorld,
  panRef,
  setPanSafe,
  flushViewportState,
  snappedSymbols,
  interactiveRects,
  selectedIds,
  snapModulePlacement,
  getPaletteTemplate,
  onSymbolSelect,
  onSymbolMoveStart,
  onSymbolMove,
  onSymbolMoveEnd,
  onPaletteDrop,
  onUnsupportedTemplateDrop,
  onSymbolSelectionChange,
}: {
  isRailVisible: boolean;
  screenToWorld: (x: number, y: number) => WorldPoint;
  panRef: React.MutableRefObject<WorldPoint>;
  setPanSafe: (pan: WorldPoint) => void;
  flushViewportState: () => void;
  snappedSymbols: SymbolItem[];
  interactiveRects: Map<string, WorldRect>;
  selectedIds: Set<string>;
  snapModulePlacement: (
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
  ) => { x: number; y: number };
  getPaletteTemplate?: (templateId: string) => {
    category?: string;
    customHeight?: number;
    customWidth?: number;
    deviceKind?: SymbolItem["deviceKind"];
    moduleRef?: string;
    modules: number;
  } | undefined;
  onSymbolSelect?: (symbolId: string | null, options?: { toggle?: boolean }) => void;
  onSymbolMoveStart?: (symbolId: string) => void;
  onSymbolMove?: (symbolId: string, x: number, y: number) => void;
  onSymbolMoveEnd?: (symbolId: string) => void;
  onPaletteDrop?: (templateId: string, x: number, y: number, options?: { snapToRail?: boolean }) => void;
  onUnsupportedTemplateDrop?: (templateId: string) => void;
  onSymbolSelectionChange?: (symbolIds: string[], activeId?: string | null) => void;
}) {
  const interactionRef = useRef<InteractionState>({ mode: "idle" });
  const [selectionRect, setSelectionRect] = useState<WorldRect | null>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const commitSelectionRect = useCallback(
    (rect: WorldRect) => {
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
    },
    [interactiveRects, onSymbolSelectionChange, snappedSymbols],
  );

  const beginDragForSymbol = useCallback(
    (event: React.PointerEvent<HTMLElement>, symbolId: string) => {
      if (!isRailVisible) return;

      const container = event.currentTarget.closest(".din-rail-viewport") ?? event.currentTarget;
      if (container instanceof HTMLElement) {
        container.setPointerCapture(event.pointerId);
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
      if (!draggedSymbol) return;

      const worldPoint = screenToWorld(event.clientX, event.clientY);
      const anchorRectStart = {
        x: draggedSymbol.x,
        y: draggedSymbol.y,
        width: draggedSymbol.width,
        height: draggedSymbol.height,
      };
      const dragIds = getDragSelectionIds(draggedSymbol.id, snappedSymbols, selectedIds);
      const startPositions = new Map(
        dragIds.map((id) => {
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
    },
    [isRailVisible, screenToWorld, snappedSymbols, selectedIds, onSymbolMoveStart, onSymbolSelect],
  );

  const handleSurfacePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isRailVisible) return;

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
    },
    [isRailVisible, screenToWorld],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
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

      if (interaction.mode !== "drag") return;

      const anchorSymbol = snappedSymbols.find((symbol) => symbol.id === interaction.anchorId);
      if (!anchorSymbol) return;

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
        if (!startPosition) continue;
        onSymbolMove?.(id, startPosition.x + deltaX, startPosition.y + deltaY);
      }
    },
    [screenToWorld, setPanSafe, panRef, snapModulePlacement, snappedSymbols, onSymbolMove],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
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
    },
    [flushViewportState, onSymbolMoveEnd, onSymbolSelect, selectionRect, commitSelectionRect],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const types = Array.from(event.dataTransfer.types).map((type) => type.toLowerCase());
      const supportsPalettePayload =
        types.includes("application/x-dinboard-palette") || types.includes("text/plain");

      if (!isRailVisible || !supportsPalettePayload) return;

      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsDropTarget(true);
    },
    [isRailVisible],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!isRailVisible) return;

      const templateId =
        event.dataTransfer.getData("application/x-dinboard-palette") ||
        event.dataTransfer.getData("text/plain");
      const template = getPaletteTemplate?.(templateId);
      if (!template) {
        setIsDropTarget(false);
        return;
      }

      if (!supportsDinRailPlacement(template)) {
        if (template.category === "Listwy do rozdzielnicy") {
          event.preventDefault();
          const world = screenToWorld(event.clientX, event.clientY);
          const size = getPaletteTemplateDimensions(template);
          const snapped = snapModulePlacement(world.x, world.y, size.width, size.height, undefined, {
            forceSnapToRail: true,
            moduleRef: template.moduleRef,
          });
          onPaletteDrop?.(templateId, snapped.x, snapped.y, { snapToRail: true });
          setIsDropTarget(false);
          return;
        }

        event.preventDefault();
        setIsDropTarget(false);
        onUnsupportedTemplateDrop?.(templateId);
        return;
      }

      event.preventDefault();
      const world = screenToWorld(event.clientX, event.clientY);
      const size = getPaletteTemplateDimensions(template);
      const snapped = snapModulePlacement(world.x, world.y, size.width, size.height, undefined, {
        forceSnapToRail: true,
        moduleRef: template.moduleRef,
      });
      onPaletteDrop?.(templateId, snapped.x, snapped.y, { snapToRail: true });
      setIsDropTarget(false);
    },
    [isRailVisible, getPaletteTemplate, screenToWorld, snapModulePlacement, onPaletteDrop, onUnsupportedTemplateDrop],
  );

  return {
    selectionRect,
    isDropTarget,
    setIsDropTarget,
    beginDragForSymbol,
    handleSurfacePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDragOver,
    handleDrop,
  };
}
