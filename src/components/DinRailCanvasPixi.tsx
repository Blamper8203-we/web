import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Application, Container, Text, TextStyle } from "pixi.js";
import { type SymbolItem } from "../types/symbolItem";
import type { ConnectionItem } from "../types/connectionItem";
import {
  getDinRailDimensions,
  type DinRailConfig,
} from "../lib/schematic/dinRailGenerator";
import { buildSchematicLayout } from "../lib/schematic/schematicLayoutEngine";
import {
  buildSelectionBounds,
  expandSelectionToGroupIds,
  getDragSelectionIds,
  rectsIntersect,
} from "../lib/dinRailSelection";
import { snapModulePlacementToDinRail } from "../lib/dinRailSnap";
import { snapListwaPlacement } from "../lib/dinRail/listwySnap";
import {
  getPaletteTemplateDimensions,
  supportsDinRailPlacement,
} from "../lib/modules/moduleCatalog";
import { useDinRailForegroundSvgs } from "../hooks/useDinRailForegroundSvgs";
import { useDinRailPreparedAssets } from "../hooks/useDinRailPreparedAssets";
import { useDinRailRailGenerator } from "../hooks/useDinRailRailGenerator";
import { useSvgTerminalsPreloader } from "../hooks/useSvgTerminalsPreloader";
import { useElementSize } from "../hooks/useElementSize";
import { DinRailCanvasViewport } from "./DinRailCanvasViewport";
import {
  DinRailEmptyState,
  DinRailGeneratorDialog,
  DinRailStatusBar,
  DinRailViewportHud,
  DinRailZoomToolbar,
} from "./dinRailUiParts";
import { AppIcon } from "./AppIcon";
import {
  MAX_INITIAL_SCALE,
  MAX_SCALE,
  MIN_SCALE,
  PIXI_MAX_RESOLUTION,
} from "../lib/dinRailCanvas/constants";
import {
  clamp,
  expandRect,
  getSymbolDesignationLabel,
  measureSvgNormalizedRect,
  sameNormalizedRect,
  worldRectFromNormalizedRect,
} from "../lib/dinRailCanvas/geometry";
import type {
  InteractionState,
  NormalizedRect,
  WorldPoint,
  WorldRect,
} from "../lib/dinRailCanvas/types";

export interface DinRailCanvasRail {
  config: DinRailConfig;
  svg: string;
  width: number;
  height: number;
  isVisible: boolean;
}

interface DinRailCanvasProps {
  getPaletteTemplate?: (templateId: string) => {
    category?: string;
    customHeight?: number;
    customWidth?: number;
    deviceKind?: SymbolItem["deviceKind"];
    moduleRef?: string;
    modules: number;
  } | undefined;
  rail: DinRailCanvasRail;
  symbols: SymbolItem[];
  connections?: ConnectionItem[];
  generatorRequest?: number;
  selectedSymbolId?: string | null;
  selectedSymbolIds?: string[];
  onPaletteDrop?: (
    templateId: string,
    x: number,
    y: number,
    options?: { snapToRail?: boolean },
  ) => void;
  onUnsupportedTemplateDrop?: (templateId: string) => void;
  onRailGenerated?: (
    config: DinRailConfig,
    svg: string,
    width: number,
    height: number,
  ) => void;
  onSymbolMoveStart?: (symbolId: string) => void;
  onSymbolMove?: (symbolId: string, x: number, y: number) => void;
  onSymbolMoveEnd?: (symbolId: string) => void;
  onSymbolSelectionChange?: (symbolIds: string[], activeId?: string | null) => void;
  onSymbolSelect?: (symbolId: string | null, options?: { toggle?: boolean }) => void;
  onDeleteSelected?: () => void;
  onZoomChange?: (zoomPercent: number) => void;
  onToggleGroups?: () => void;
  showGroups?: boolean;
  onRequestLeftPanelTab?: (tabName: string) => void;
}

export function DinRailCanvas({
  getPaletteTemplate,
  rail,
  symbols,
  generatorRequest,
  selectedSymbolId,
  selectedSymbolIds,
  onPaletteDrop,
  onUnsupportedTemplateDrop,
  onRailGenerated,
  onSymbolMoveStart,
  onSymbolMove,
  onSymbolMoveEnd,
  onSymbolSelectionChange,
  onSymbolSelect,
  onDeleteSelected,
  onZoomChange,
  onToggleGroups,
  showGroups = true,
  onRequestLeftPanelTab,
}: DinRailCanvasProps) {
  // --- PRELOADER TERMINALI SVG ---
  useSvgTerminalsPreloader(symbols);

  const containerRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pixiHostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const pixiWorldRef = useRef<Container | null>(null);
  const viewportFrameRef = useRef<number | null>(null);
  const interactionRef = useRef<InteractionState>({ mode: "idle" });
  const panRef = useRef<WorldPoint>({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const measuredNodesRef = useRef(new Map<string, HTMLDivElement>());

  const viewportSize = useElementSize(containerRef);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<WorldPoint>({ x: 0, y: 0 });
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [isPixiReady, setIsPixiReady] = useState(false);
  const [selectionRect, setSelectionRect] = useState<WorldRect | null>(null);

  const [symbolNormalizedRects, setSymbolNormalizedRects] = useState<Map<string, NormalizedRect>>(new Map());

  const snappedSymbols = useMemo(
    () => symbols.filter((symbol) => symbol.isSnappedToRail),
    [symbols],
  );
  const rowCenters = useMemo(
    () => getDinRailDimensions(rail.config.rows, rail.config.modulesPerRow).rowCenters,
    [rail.config.modulesPerRow, rail.config.rows],
  );
  const automaticDesignationBySymbolId = useMemo(() => {
    const layout = buildSchematicLayout(symbols);
    const map = new Map<string, string>();

    for (const node of layout.nodes) {
      const designation = node.designation.trim();
      if (designation.length > 0) {
        map.set(node.id, designation);
      }
    }

    return map;
  }, [symbols]);

  const assetMap = useDinRailPreparedAssets(snappedSymbols);
  const foregroundUrls = useDinRailForegroundSvgs(snappedSymbols);

  const interactiveRects = useMemo(() => {
    const nextMap = new Map<string, WorldRect>();

    for (const symbol of snappedSymbols) {
      const measuredRect = symbolNormalizedRects.get(symbol.id);
      const fallbackRect: WorldRect = {
        x: symbol.x,
        y: symbol.y,
        width: symbol.width,
        height: symbol.height,
      };
      const symbolRect = measuredRect
        ? worldRectFromNormalizedRect(symbol, measuredRect)
        : fallbackRect;
      nextMap.set(symbol.id, expandRect(symbolRect, 4));
    }

    return nextMap;
  }, [snappedSymbols, symbolNormalizedRects]);
  const selectedIds = useMemo(() => {
    const nextSelectedIds = new Set(selectedSymbolIds);
    if (selectedSymbolId) {
      nextSelectedIds.add(selectedSymbolId);
    }
    return nextSelectedIds;
  }, [selectedSymbolId, selectedSymbolIds]);
  const selectedSnappedSymbols = useMemo(
    () => snappedSymbols.filter((symbol) => selectedIds.has(symbol.id)),
    [selectedIds, snappedSymbols],
  );
  const selectedBounds = useMemo(
    () => buildSelectionBounds(selectedSnappedSymbols),
    [selectedSnappedSymbols],
  );
  // Feature flag tymczasowo wyłączony. Aby z powrotem włączyć renderowanie
  // etykiet w warstwie Pixi, zamień na `snappedSymbols.length <= PIXI_LABEL_SYMBOL_LIMIT`.
  const shouldRenderPixiLabels = false;

  const railGenerator = useDinRailRailGenerator({
    railConfig: rail.config,
    isRailVisible: rail.isVisible,
    generatorRequest,
    onGenerate: (config, svg, width, height) => {
      onRailGenerated?.(config, svg, width, height);
    },
  });

  const flushViewportState = useCallback(() => {
    setPan((currentPan) => (
      currentPan.x === panRef.current.x && currentPan.y === panRef.current.y
        ? currentPan
        : panRef.current
    ));
    setScale((currentScale) => (
      currentScale === scaleRef.current ? currentScale : scaleRef.current
    ));
  }, []);

  const scheduleViewportState = useCallback(() => {
    if (typeof window === "undefined") {
      flushViewportState();
      return;
    }

    if (viewportFrameRef.current !== null) {
      return;
    }

    viewportFrameRef.current = window.requestAnimationFrame(() => {
      viewportFrameRef.current = null;
      flushViewportState();
    });
  }, [flushViewportState]);

  const setPanSafe = useCallback((nextPan: WorldPoint) => {
    panRef.current = nextPan;
    scheduleViewportState();
  }, [scheduleViewportState]);

  const setScaleSafe = useCallback((nextScale: number) => {
    scaleRef.current = nextScale;
    scheduleViewportState();
  }, [scheduleViewportState]);

  const fitToViewport = useCallback(() => {
    if (
      viewportSize.width <= 0
      || viewportSize.height <= 0
      || rail.width <= 0
      || rail.height <= 0
    ) {
      return;
    }

    const availW = Math.max(viewportSize.width - 100, 120);
    const availH = Math.max(viewportSize.height - 100, 120);
    const nextScale = Math.min(availW / rail.width, availH / rail.height, MAX_INITIAL_SCALE);

    setScaleSafe(nextScale);
    setPanSafe({
      x: (viewportSize.width - rail.width * nextScale) / 2,
      y: (viewportSize.height - rail.height * nextScale) / 2,
    });
  }, [rail.height, rail.width, setPanSafe, setScaleSafe, viewportSize.height, viewportSize.width]);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: (clientX - rect.left - panRef.current.x) / scaleRef.current,
      y: (clientY - rect.top - panRef.current.y) / scaleRef.current,
    };
  }, []);

  const zoomAroundViewportPoint = useCallback((viewportPoint: WorldPoint, nextScaleRaw: number) => {
    const currentScale = scaleRef.current;
    const currentPan = panRef.current;
    const nextScale = clamp(nextScaleRaw, MIN_SCALE, MAX_SCALE);
    const worldX = (viewportPoint.x - currentPan.x) / currentScale;
    const worldY = (viewportPoint.y - currentPan.y) / currentScale;

    setScaleSafe(nextScale);
    setPanSafe({
      x: viewportPoint.x - worldX * nextScale,
      y: viewportPoint.y - worldY * nextScale,
    });
  }, [setPanSafe, setScaleSafe]);

  const zoomIn = useCallback(() => {
    if (!rail.isVisible) {
      return;
    }

    zoomAroundViewportPoint(
      { x: viewportSize.width / 2, y: viewportSize.height / 2 },
      scaleRef.current * 1.1,
    );
  }, [rail.isVisible, viewportSize.height, viewportSize.width, zoomAroundViewportPoint]);

  const zoomOut = useCallback(() => {
    if (!rail.isVisible) {
      return;
    }

    zoomAroundViewportPoint(
      { x: viewportSize.width / 2, y: viewportSize.height / 2 },
      scaleRef.current / 1.1,
    );
  }, [rail.isVisible, viewportSize.height, viewportSize.width, zoomAroundViewportPoint]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!rail.isVisible) {
      return;
    }

    event.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const viewportPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const normalizedDelta =
      event.deltaMode === 1
        ? event.deltaY * 16
        : event.deltaMode === 2
          ? event.deltaY * Math.max(viewportSize.height, 1)
          : event.deltaY;
    const factor = clamp(Math.exp(-normalizedDelta * 0.0015), 0.82, 1.22);
    zoomAroundViewportPoint(viewportPoint, scaleRef.current * factor);
  }, [rail.isVisible, viewportSize.height, zoomAroundViewportPoint]);

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
      const isTerminalBlock = template?.category === "Listwy do rozdzielnicy";

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

  useEffect(() => {
    onZoomChange?.(Math.round(scale * 100));
  }, [onZoomChange, scale]);

  useEffect(() => {
    if (rail.isVisible && viewportSize.width > 0 && viewportSize.height > 0) {
      fitToViewport();
      return;
    }

    if (!rail.isVisible) {
      setScaleSafe(1);
      setPanSafe({ x: 0, y: 0 });
    }
  }, [fitToViewport, rail.isVisible, setPanSafe, setScaleSafe, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    let cancelled = false;

    async function mountApp() {
      const host = pixiHostRef.current;
      if (!shouldRenderPixiLabels || !host || appRef.current) {
        return;
      }

      const app = new Application();
      await app.init({
        width: Math.max(host.clientWidth, 1),
        height: Math.max(host.clientHeight, 1),
        antialias: true,
        autoDensity: true,
        backgroundAlpha: 0,
        resolution: Math.min(window.devicePixelRatio || 1, PIXI_MAX_RESOLUTION),
      });

      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }

      host.appendChild(app.canvas);
      appRef.current = app;
      setIsPixiReady(true);
    }

    void mountApp();

    return () => {
      cancelled = true;
    };
  }, [shouldRenderPixiLabels, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    setSymbolNormalizedRects((previousRects) => {
      let changed = previousRects.size !== assetMap.size;
      const nextRects = new Map<string, NormalizedRect>();

      for (const [symbolId] of assetMap) {
        const node = measuredNodesRef.current.get(symbolId);
        if (!node) {
          const previous = previousRects.get(symbolId);
          if (previous) {
            nextRects.set(symbolId, previous);
          }
          continue;
        }

        const normalized = measureSvgNormalizedRect(node) ?? previousRects.get(symbolId);
        if (!normalized) {
          continue;
        }

        const previous = previousRects.get(symbolId);
        if (!previous || !sameNormalizedRect(previous, normalized)) {
          changed = true;
        }
        nextRects.set(symbolId, normalized);
      }

      if (!changed) {
        return previousRects;
      }

      return nextRects;
    });
  }, [assetMap]);

  useEffect(() => {
    if (shouldRenderPixiLabels) {
      return;
    }

    const app = appRef.current;
    if (!app) {
      return;
    }

    app.destroy(true, { children: true });
    appRef.current = null;
    pixiWorldRef.current = null;
    setIsPixiReady(false);
  }, [shouldRenderPixiLabels]);

  useEffect(() => {
    const app = appRef.current;
    if (!app || viewportSize.width <= 0 || viewportSize.height <= 0) {
      return;
    }

    app.renderer.resize(viewportSize.width, viewportSize.height);
  }, [viewportSize.height, viewportSize.width]);

  useEffect(() => {
    const app = appRef.current;
    if (!app || !isPixiReady || !shouldRenderPixiLabels) {
      return;
    }

    let world = pixiWorldRef.current;
    if (!world) {
      world = new Container();
      pixiWorldRef.current = world;
      app.stage.addChild(world);
    }

    world.position.set(pan.x, pan.y);
    world.scale.set(scale, scale);
  }, [isPixiReady, pan.x, pan.y, scale, shouldRenderPixiLabels]);

  useEffect(() => {
    const app = appRef.current;
    if (!app || !isPixiReady || !shouldRenderPixiLabels) {
      return;
    }

    let world = pixiWorldRef.current;
    if (!world) {
      world = new Container();
      pixiWorldRef.current = world;
      app.stage.addChild(world);
    }

    world.removeChildren();
    world.position.set(panRef.current.x, panRef.current.y);
    world.scale.set(scaleRef.current, scaleRef.current);

    for (const symbol of snappedSymbols) {


      const designationLabel = getSymbolDesignationLabel(
        symbol,
        automaticDesignationBySymbolId,
      );
      if (designationLabel) {
        const designation = new Text({
          text: designationLabel,
          style: new TextStyle({
            fill: "#f8fafc",
            fontFamily: "Segoe UI, Arial, sans-serif",
            fontSize: 14,
            fontWeight: "700",
            align: "center",
            stroke: { color: "#111827", width: 2, join: "round" },
          }),
        });
        designation.x = symbol.x + Math.max(symbol.width, 48) / 2 - designation.width / 2;
        designation.y = symbol.y + symbol.height + 5;
        designation.roundPixels = true;
        world.addChild(designation);
      }
    }
  }, [automaticDesignationBySymbolId, isPixiReady, shouldRenderPixiLabels, snappedSymbols]);

  useEffect(() => {
    return () => {
      if (viewportFrameRef.current !== null) {
        window.cancelAnimationFrame(viewportFrameRef.current);
        viewportFrameRef.current = null;
      }

      const app = appRef.current;
      if (app) {
        app.destroy(true, { children: true });
        appRef.current = null;
        pixiWorldRef.current = null;
        setIsPixiReady(false);
      }
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const onWheelNative = (event: WheelEvent) => {
      handleWheel(event);
    };

    viewport.addEventListener("wheel", onWheelNative, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheelNative);
    };
  }, [handleWheel]);

  const bindMeasuredNode = useCallback((symbolId: string, node: HTMLDivElement | null) => {
    if (node) {
      measuredNodesRef.current.set(symbolId, node);
      return;
    }

    measuredNodesRef.current.delete(symbolId);
  }, []);

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
  }, [onSymbolMoveStart, onSymbolSelect, rail.isVisible, screenToWorld, selectedIds, snappedSymbols]);

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
  }, [onSymbolMove, screenToWorld, setPanSafe, snapModulePlacement, snappedSymbols]);

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

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const types = Array.from(event.dataTransfer.types).map((type) => type.toLowerCase());
    const supportsPalettePayload =
      types.includes("application/x-dinboard-palette")
      || types.includes("text/plain");

    if (!rail.isVisible || !supportsPalettePayload) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDropTarget(true);
  }, [rail.isVisible]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!rail.isVisible) {
      return;
    }

    const templateId =
      event.dataTransfer.getData("application/x-dinboard-palette")
      || event.dataTransfer.getData("text/plain");
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
  }, [getPaletteTemplate, onPaletteDrop, onUnsupportedTemplateDrop, rail.isVisible, screenToWorld, snapModulePlacement]);

  const updateRows = railGenerator.updateRows;
  const updateModulesPerRow = railGenerator.updateModulesPerRow;
  const generateRail = railGenerator.generateRail;
  const openGenerator = railGenerator.openGenerator;
  const closeGenerator = railGenerator.closeGenerator;
  const isGeneratorOpen = railGenerator.isGeneratorOpen;
  const draftConfig = railGenerator.draftConfig;
  const previewSvg = railGenerator.previewSvg;
  const previewDims = railGenerator.previewDims;
  const previewScale = railGenerator.previewScale;
  const totalModules = railGenerator.totalModules;

  return (
    <div className="din-rail-canvas" ref={containerRef}>
      <DinRailViewportHud
        isVisible={rail.isVisible}
        modulesPerRow={rail.config.modulesPerRow}
        rows={rail.config.rows}
      />
      <DinRailZoomToolbar
        canInteract={rail.isVisible}
        onFit={fitToViewport}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onToggleGroups={onToggleGroups}
        showGroups={showGroups}
      />

      {rail.isVisible && selectedIds.size > 0 && onDeleteSelected && (
        <div className="workspace-floating-delete-btn">
          <button
            type="button"
            className="workspace-tool-btn"
            onClick={onDeleteSelected}
            title="Usuń zaznaczone (Delete)"
          >
            <AppIcon name="delete" size={16} />
            <span className="delete-label">Usuń zaznaczone ({selectedIds.size})</span>
          </button>
        </div>
      )}

      <DinRailCanvasViewport
        viewportRef={viewportRef}
        surfaceRef={surfaceRef}
        pixiHostRef={pixiHostRef}
        rail={rail}
        pan={pan}
        scale={scale}
        isDropTarget={isDropTarget}
        shouldRenderPixiLabels={shouldRenderPixiLabels}
        showGroups={showGroups}
        snappedSymbols={snappedSymbols}
        assetMap={assetMap}
        foregroundUrls={foregroundUrls}
        interactiveRects={interactiveRects}
        selectedIds={selectedIds}
        selectionRect={selectionRect}
        selectedBounds={selectedBounds}
        automaticDesignationBySymbolId={automaticDesignationBySymbolId}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onSurfacePointerDown={handleSurfacePointerDown}
        onSurfaceDragOver={handleDragOver}
        onSurfaceDrop={handleDrop}
        onSurfaceDragLeave={() => setIsDropTarget(false)}
        onBeginDragForSymbol={(symbolId) => (event) => beginDragForSymbol(event, symbolId)}
        onRequestLeftPanelTab={onRequestLeftPanelTab}
        bindMeasuredNode={bindMeasuredNode}
      />

      {!rail.isVisible && <DinRailEmptyState onOpenGenerator={openGenerator} />}

      {isGeneratorOpen && (
        <DinRailGeneratorDialog
          draftConfig={draftConfig}
          onClose={closeGenerator}
          onGenerate={generateRail}
          onModulesPerRowChange={updateModulesPerRow}
          onRowsChange={updateRows}
          previewHeight={previewDims.height}
          previewScale={previewScale}
          previewSvg={previewSvg}
          previewWidth={previewDims.width}
        />
      )}

      <DinRailStatusBar
        height={rail.height}
        isVisible={rail.isVisible}
        scale={scale}
        totalModules={totalModules}
        width={rail.width}
      />
    </div>
  );
}
