import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Application, Container, Text, TextStyle } from "pixi.js";
import { type SymbolItem } from "../types/symbolItem";
import type { ConnectionItem } from "../types/connectionItem";
import { getSymbolTerminals, resolveConnectionIsFromTop, resolveConnectionIsToTop } from "../lib/modules/moduleTerminals";
import { calculateWirePath } from "../lib/routing/wireRoutingEngine";
import {
  generateDinRailSvg,
  getDinRailDimensions,
  type DinRailConfig,
} from "../lib/schematic/dinRailGenerator";
import { buildSchematicLayout } from "../lib/schematic/schematicLayoutEngine";
import {
  DIN_RAIL_GROUP_FRAME_PADDING,
  DIN_RAIL_GROUP_BRACKET_LABEL_GAP,
  DIN_RAIL_GROUP_BRACKET_LEG_HEIGHT,
  DIN_RAIL_GROUP_BRACKET_OFFSET_Y,
  buildDinRailGroupFrames,
  buildSelectionBounds,
  expandSelectionToGroupIds,
  formatDinRailGroupLabel,
  getDragSelectionIds,
  rectsIntersect,
} from "../lib/dinRailSelection";
import { snapModulePlacementToDinRail } from "../lib/dinRailSnap";
import {
  getPaletteTemplateDimensions,
  supportsDinRailPlacement,
} from "../lib/modules/moduleCatalog";
import { useDinRailForegroundSvgs } from "../hooks/useDinRailForegroundSvgs";
import { DinRailConnectionsForegroundLayer } from "./canvasLayers/DinRailConnectionsForegroundLayer";
import { isTerminalZlaczka } from "../lib/connections/connectionsLogic";
import { useDinRailPreparedAssets } from "../hooks/useDinRailPreparedAssets";
import { useSvgTerminalsPreloader } from "../hooks/useSvgTerminalsPreloader";
import { useElementSize } from "../hooks/useElementSize";
import {
  DinRailEmptyState,
  DinRailGeneratorDialog,
  DinRailStatusBar,
  DinRailViewportHud,
  DinRailZoomToolbar,
} from "./dinRailUiParts";
import { AppIcon } from "./AppIcon";
import {
  DEFAULT_CONFIG,
  DIN_RAIL_PREVIEW_CANVAS_WIDTH,
  DIN_RAIL_PREVIEW_CANVAS_HEIGHT,
  DIN_RAIL_PREVIEW_MARGIN_X,
  DIN_RAIL_PREVIEW_MARGIN_Y,
  MAX_INITIAL_SCALE,
  MAX_SCALE,
  MIN_SCALE,
  PIXI_LABEL_SYMBOL_LIMIT,
  PIXI_MAX_RESOLUTION,
  WIRE_COLORS_MAP,
  WIRE_THICKNESS_MAP,
} from "../lib/dinRailCanvas/constants";
import {
  buildWorldRectStyle,
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
  connections = [],
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
  const lastGeneratorRequest = useRef(generatorRequest);
  const measuredNodesRef = useRef(new Map<string, HTMLDivElement>());

  const [showWires, setShowWires] = useState(false);

  const viewportSize = useElementSize(containerRef);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<WorldPoint>({ x: 0, y: 0 });
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isPixiReady, setIsPixiReady] = useState(false);
  const [selectionRect, setSelectionRect] = useState<WorldRect | null>(null);

  const [draftConfig, setDraftConfig] = useState<DinRailConfig>(
    rail.isVisible ? rail.config : DEFAULT_CONFIG,
  );
  const [symbolNormalizedRects, setSymbolNormalizedRects] = useState<Map<string, NormalizedRect>>(new Map());

  const snappedSymbols = useMemo(
    () => symbols.filter((symbol) => symbol.isSnappedToRail),
    [symbols],
  );
  const rowCenters = useMemo(
    () => getDinRailDimensions(rail.config.rows, rail.config.modulesPerRow).rowCenters,
    [rail.config.modulesPerRow, rail.config.rows],
  );
  const groupFrames = useMemo(
    () => buildDinRailGroupFrames(snappedSymbols, DIN_RAIL_GROUP_FRAME_PADDING),
    [snappedSymbols],
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

  const groupedWiredPaths = useMemo(() => {
    const keyCounts: Record<string, number> = {};
    const keyIndices: Record<string, number> = {};

    return connections.map((conn) => {
      const fromSymbol = symbols.find((s) => s.id === conn.fromSymbolId);
      const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);
      
      if (!fromSymbol || !toSymbol) return null;

      const fromHS = getSymbolTerminals(fromSymbol).find((h) => h.name === conn.fromTerminal);
      const toHS = getSymbolTerminals(toSymbol).find((h) => h.name === conn.toTerminal);

      if (!fromHS || !toHS) return null;

      const fromPt = { x: fromSymbol.x + fromHS.x, y: fromSymbol.y + fromHS.y };
      const toPt = { x: toSymbol.x + toHS.x, y: toSymbol.y + toHS.y };

      // Compute sorting key for parallel offsets
      const key = [conn.fromSymbolId, conn.toSymbolId].sort().join(":");
      const totalCount = keyCounts[key] || 0;
      keyCounts[key] = totalCount + 1;

      return {
        connection: conn,
        fromPt,
        toPt,
        fromHS,
        toHS,
        fromSymbol,
        toSymbol,
        key,
      };
    }).filter(Boolean).map((d) => {
      if (!d) return null;
      const index = keyIndices[d.key] || 0;
      keyIndices[d.key] = index + 1;

      const path = calculateWirePath(d.fromPt, d.toPt, {
        isFromTop: resolveConnectionIsFromTop(d.fromSymbol, d.connection.isFromTop, d.fromHS),
        isToTop: resolveConnectionIsToTop(d.toSymbol, d.connection.isToTop, d.toHS),
        parallelIndex: index,
        parallelCount: keyCounts[d.key],
        customOffset: d.connection.customOffset,
        customOffsetX: d.connection.customOffsetX,
        customOffsetY1: d.connection.customOffsetY1,
        customOffsetY2: d.connection.customOffsetY2,
        points: d.connection.points,
        customRadius: d.connection.customRadius,
      });

      return {
        ...d,
        pathData: path,
        parallelIndex: index,
        parallelCount: keyCounts[d.key],
      };
    });
  }, [connections, symbols]);

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
  const shouldRenderPixiLabels = false && snappedSymbols.length <= PIXI_LABEL_SYMBOL_LIMIT;

  const safePreviewConfig = useMemo<DinRailConfig>(() => ({
    rows: Math.max(1, draftConfig.rows || 1),
    modulesPerRow: Math.max(6, draftConfig.modulesPerRow || 6),
  }), [draftConfig]);

  const previewSvg = useMemo(() => generateDinRailSvg(safePreviewConfig), [safePreviewConfig]);
  const previewDims = useMemo(
    () => getDinRailDimensions(safePreviewConfig.rows, safePreviewConfig.modulesPerRow),
    [safePreviewConfig],
  );
  const previewScale = Math.min(
    (DIN_RAIL_PREVIEW_CANVAS_WIDTH - DIN_RAIL_PREVIEW_MARGIN_X * 2) / previewDims.width,
    (DIN_RAIL_PREVIEW_CANVAS_HEIGHT - DIN_RAIL_PREVIEW_MARGIN_Y * 2) / previewDims.height,
    1,
  );
  const totalModules = rail.isVisible
    ? rail.config.rows * rail.config.modulesPerRow
    : (draftConfig.rows || 1) * (draftConfig.modulesPerRow || 6);

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
         const topY = -1200;
         const rectHeight = 300;
         const bottomY = (rail.config.rows - 1) * (1642.0 + 50.0) + 2400;

         const gap = 300;
         const rectWidth = Math.min(2000, rail.width * 0.35);
         const centerX = rail.width / 2;
         const leftRectX = centerX - rectWidth - gap / 2;
         const rightRectX = centerX + gap / 2;
         
         const leftCenterX = leftRectX + rectWidth / 2;
         const rightCenterX = rightRectX + rectWidth / 2;

         let snapX = x;
         const distLeft = Math.abs((x + width/2) - leftCenterX);
         const distRight = Math.abs((x + width/2) - rightCenterX);
         
         if (distLeft < distRight && distLeft < 1500) snapX = leftCenterX - width / 2;
         else if (distRight <= distLeft && distRight < 1500) snapX = rightCenterX - width / 2;

         const inTopZone = y >= topY - 200 && y <= topY + rectHeight + 200;
         const inBottomZone = y >= bottomY - 200 && y <= bottomY + rectHeight + 200;

         if (inTopZone) return { x: snapX, y: topY + rectHeight / 2 - height / 2 };
         if (inBottomZone) return { x: snapX, y: bottomY + rectHeight / 2 - height / 2 };
         
         const distTop = Math.abs(y - topY);
         const distBottom = Math.abs(y - bottomY);
         if (distTop < distBottom) return { x: snapX, y: topY + rectHeight / 2 - height / 2 };
         return { x: snapX, y: bottomY + rectHeight / 2 - height / 2 };
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

  const openGenerator = useCallback(() => {
    setDraftConfig(rail.isVisible ? rail.config : DEFAULT_CONFIG);
    setIsGeneratorOpen(true);
  }, [rail.config, rail.isVisible]);

  useEffect(() => {
    if (generatorRequest === lastGeneratorRequest.current) {
      return;
    }

    lastGeneratorRequest.current = generatorRequest;
    openGenerator();
  }, [generatorRequest, openGenerator]);

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
  }, [onSymbolMove, rail.width, screenToWorld, setPanSafe, snapModulePlacement, snappedSymbols]);

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
  }, [commitSelectionRect, flushViewportState, onSymbolMoveEnd, onSymbolSelect, rail.isVisible, selectionRect]);

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

  const updateRows = (value: string) => {
    if (value.trim() === "") {
      setDraftConfig((prev) => ({
        ...prev,
        rows: "" as unknown as number,
      }));
      return;
    }
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return;
    }
    setDraftConfig((prev) => ({
      ...prev,
      rows: parsed,
    }));
  };

  const updateModulesPerRow = (value: string) => {
    if (value.trim() === "") {
      setDraftConfig((prev) => ({
        ...prev,
        modulesPerRow: "" as unknown as number,
      }));
      return;
    }
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return;
    }
    setDraftConfig((prev) => ({
      ...prev,
      modulesPerRow: parsed,
    }));
  };

  const generateRail = () => {
    const normalizedConfig: DinRailConfig = {
      rows: Math.max(1, Math.min(10, Math.round(draftConfig.rows) || 1)),
      modulesPerRow: Math.max(6, Math.min(48, Math.round(draftConfig.modulesPerRow) || 6)),
    };
    const svg = generateDinRailSvg(normalizedConfig);
    const dims = getDinRailDimensions(normalizedConfig.rows, normalizedConfig.modulesPerRow);
    onRailGenerated?.(normalizedConfig, svg, dims.width, dims.height);
    setIsGeneratorOpen(false);
  };

  const selectionRectStyle = selectionRect ? buildWorldRectStyle(selectionRect) : undefined;
  const selectedBoundsStyle = selectedBounds ? buildWorldRectStyle(selectedBounds) : undefined;
  const worldTransform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
  const railSvgStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: `${rail.width}px`,
    height: `${rail.height}px`,
    transform: worldTransform,
    transformOrigin: "top left",
    pointerEvents: "none",
    zIndex: 10,
  };
  const worldLayerBaseStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: `${rail.width}px`,
    height: `${rail.height}px`,
    transform: worldTransform,
    transformOrigin: "top left",
    pointerEvents: "none",
  };
  const hitboxLayerStyle: React.CSSProperties = {
    ...worldLayerBaseStyle,
    zIndex: 60,
  };
  const overlayLayerStyle: React.CSSProperties = {
    ...worldLayerBaseStyle,
    zIndex: 70,
  };
  const labelOverlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 50,
  };

  const renderListwyPlaceholders = () => {
    if (!rail.isVisible) return null;
    
    const rectWidth = Math.min(2000, rail.width * 0.35);
    const rectHeight = 300;
    const gap = 300;
    
    const centerX = rail.width / 2;
    const leftRectX = centerX - rectWidth - gap / 2;
    const rightRectX = centerX + gap / 2;
    
    const topY = -1200;
    const bottomY = (rail.config.rows - 1) * (1642.0 + 50.0) + 2400;

    const baseStyle: React.CSSProperties = {
      position: "absolute",
      width: `${rectWidth}px`,
      height: `${rectHeight}px`,
      border: "12px dashed #475569", // slate-600
      borderRadius: "24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      pointerEvents: "auto",
      backgroundColor: "rgba(15, 23, 42, 0.4)", // slate-900 with opacity
      boxSizing: "border-box",
      transition: "border-color 0.2s, background-color 0.2s",
    };

    const textStyle: React.CSSProperties = {
      fontSize: "80px",
      fontWeight: "bold",
      color: "#94a3b8", // slate-400
      fontFamily: "system-ui, sans-serif",
      textTransform: "uppercase",
      letterSpacing: "4px",
      pointerEvents: "none",
    };

    const createPlaceholder = (x: number, y: number, key: string) => (
      <div
        key={key}
        style={{ ...baseStyle, left: `${x}px`, top: `${y}px` }}
        onClick={() => onRequestLeftPanelTab?.("Listwy do rozdzielnicy")}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#94a3b8";
          e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.6)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#475569";
          e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.4)";
        }}
      >
        <span style={textStyle}>DODAJ LISTWY</span>
      </div>
    );

    const isZoneOccupied = (zoneX: number, zoneY: number) => {
      return snappedSymbols.some((s) => {
        const template = getPaletteTemplate?.(s.moduleRef);
        const isListwa = template?.category === "Listwy do rozdzielnicy" || s.moduleRef?.includes("Listwy do rozdzielnicy");
        if (!isListwa) return false;
        const sCenterX = s.x + s.width / 2;
        const sCenterY = s.y + s.height / 2;
        const zoneCenterX = zoneX + rectWidth / 2;
        const zoneCenterY = zoneY + rectHeight / 2;
        return Math.abs(sCenterX - zoneCenterX) < rectWidth * 0.8 && Math.abs(sCenterY - zoneCenterY) < rectHeight * 0.8;
      });
    };

    return (
      <div
        className="din-rail-listwy-placeholders"
        style={{
          ...worldLayerBaseStyle,
          zIndex: 20,
        }}
      >
        {!isZoneOccupied(leftRectX, topY) && createPlaceholder(leftRectX, topY, "top-left")}
        {!isZoneOccupied(rightRectX, topY) && createPlaceholder(rightRectX, topY, "top-right")}
        {!isZoneOccupied(leftRectX, bottomY) && createPlaceholder(leftRectX, bottomY, "bottom-left")}
        {!isZoneOccupied(rightRectX, bottomY) && createPlaceholder(rightRectX, bottomY, "bottom-right")}
      </div>
    );
  };

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
        onToggleWires={() => setShowWires((w) => !w)}
        showWires={showWires}
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

      <div
        ref={viewportRef}
        className={`din-rail-svg-container ${isDropTarget ? "is-drop-target" : ""}`}
        style={{ cursor: rail.isVisible ? "grab" : "default" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {rail.isVisible && rail.svg && (
          <div
            aria-hidden="true"
            style={railSvgStyle}
            dangerouslySetInnerHTML={{ __html: rail.svg }}
          />
        )}
        {renderListwyPlaceholders()}
        {rail.isVisible && showWires && connections && connections.length > 0 && (
          <svg
            className="din-rail-wires-layer"
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: `${rail.width}px`,
              height: `${rail.height}px`,
              transform: worldTransform,
              transformOrigin: "top left",
              pointerEvents: "none",
              zIndex: 15,
              overflow: "visible",
            }}
          >
            <defs>
              <pattern
                id="green-yellow-stripe"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="12" height="24" fill="#FFD600" />
                <rect x="12" width="12" height="24" fill="#2e7d32" />
              </pattern>
              <filter id="shadow-blur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.0" />
              </filter>
              <filter id="wire-soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feOffset dx="1.5" dy="2.0" result="offset" />
                <feGaussianBlur in="offset" stdDeviation="1.5" />
              </filter>
              <filter id="wire-soft-highlight" x="-50%" y="-50%" width="200%" height="200%">
                <feOffset dx="-1.5" dy="-2.0" result="offset" />
                <feGaussianBlur in="offset" stdDeviation="1.5" />
              </filter>
              <filter id="wire-sharp-highlight" x="-50%" y="-50%" width="200%" height="200%">
                <feOffset dx="-2.0" dy="-3.0" result="offset" />
                <feGaussianBlur in="offset" stdDeviation="0.6" />
              </filter>
            </defs>

            {groupedWiredPaths.map((w) => {
              if (!w) return null;
              const wireThickness = WIRE_THICKNESS_MAP[w.connection.wireCrossSection] || 4.5;
              
              const offsetDistance = 6;
              const parallelCount = w.parallelCount || 1;
              const offset = parallelCount > 1 ? (w.parallelIndex - (parallelCount - 1) / 2) * offsetDistance : 0;
              const x1 = w.fromPt.x + (w.fromHS.isTop ? offset : -offset);
              const x2 = w.toPt.x + (w.toHS.isTop ? offset : -offset);

              const ferruleExtension = Math.max(16, Math.round(wireThickness * 0.4));
              const ferruleLength = 115 + ferruleExtension;
              const FERRULE_INSET = 22; // Offset od środka śruby do krawędzi plastiku

              const fromY1 = w.fromPt.y + (w.fromHS.isTop ? -FERRULE_INSET : FERRULE_INSET);
              const fromY2 = w.fromPt.y + (w.fromHS.isTop ? -(ferruleLength + FERRULE_INSET) : (ferruleLength + FERRULE_INSET));

              const toY1 = w.toPt.y + (w.toHS.isTop ? -FERRULE_INSET : FERRULE_INSET);
              const toY2 = w.toPt.y + (w.toHS.isTop ? -(ferruleLength + FERRULE_INSET) : (ferruleLength + FERRULE_INSET));

              return (
                <g key={w.connection.id}>
                  <line
                    x1={x1}
                    y1={fromY1}
                    x2={x1}
                    y2={fromY2}
                    stroke="#000000"
                    strokeWidth={wireThickness + 3.0}
                    strokeLinecap="butt"
                  />
                  <line
                    x1={x2}
                    y1={toY1}
                    x2={x2}
                    y2={toY2}
                    stroke="#000000"
                    strokeWidth={wireThickness + 3.0}
                    strokeLinecap="butt"
                  />
                  {/* 1. Dark outline base */}
                  <path
                    d={w.pathData}
                    fill="none"
                    stroke={
                      w.connection.wireColor === "black"
                        ? "#888888"
                        : (WIRE_COLORS_MAP[w.connection.wireColor]?.dark || "#1a1a1a")
                    }
                    strokeWidth={wireThickness + 1.8}
                    strokeLinecap="butt"
                    strokeLinejoin="round"
                  />
                  {/* 2. Main color (Midtone) */}
                  <path
                    d={w.pathData}
                    fill="none"
                    stroke={
                      w.connection.wireColor === "green-yellow"
                        ? "#2e7d32"
                        : (WIRE_COLORS_MAP[w.connection.wireColor]?.hex || "#555")
                    }
                    strokeWidth={wireThickness}
                    strokeLinecap="butt"
                    strokeLinejoin="round"
                  />
                  {/* 3. Yellow stripes overlay for PE */}
                  {w.connection.wireColor === "green-yellow" && (
                    <path
                      d={w.pathData}
                      fill="none"
                      stroke="#FFD600"
                      strokeWidth={wireThickness}
                      strokeDasharray={`${wireThickness * 1.2} ${wireThickness * 1.2}`}
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        )}
        {rail.isVisible && showGroups && (
          <svg
            className="din-rail-groups-layer"
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              overflow: "visible",
              zIndex: 100,
            }}
          >
            <defs>
              <linearGradient id="svg-bracket-leg-default" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(82,148,255,0.95)" />
                <stop offset="100%" stopColor="rgba(82,148,255,0)" />
              </linearGradient>
              <linearGradient id="svg-bracket-leg-selected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(13,121,242,1)" />
                <stop offset="100%" stopColor="rgba(13,121,242,0)" />
              </linearGradient>
              <filter id="svg-bracket-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {groupFrames.map((group) => {
                const isSelected = group.symbolIds.some((id) => selectedIds.has(id));
                const isSingle = group.memberCount <= 1;
                const screenX = group.x * scale + pan.x;
                const screenY = group.y * scale + pan.y;
                const screenWidth = Math.max(1, group.width * scale);
                const barH = clamp(1 * scale, 1, 2);
                const legH = clamp(DIN_RAIL_GROUP_BRACKET_LEG_HEIGHT * scale, 4, 28);
                const labelH = clamp(22 * scale, 12, 26);
                const labelGap = clamp(DIN_RAIL_GROUP_BRACKET_LABEL_GAP * scale, 1, 8);
                const labelPadX = clamp(10 * scale, 4, 12);
                const labelFont = clamp(12.5 * scale, 8, 16);

                const topY = screenY - DIN_RAIL_GROUP_BRACKET_OFFSET_Y * scale;
                const color = isSelected
                  ? "rgba(13,121,242,1)"
                  : isSingle
                    ? "rgba(82,148,255,0.5)"
                    : "rgba(82,148,255,0.85)";

                const legGrad = isSelected ? "url(#svg-bracket-leg-selected)" : "url(#svg-bracket-leg-default)";
                const label = formatDinRailGroupLabel(group.label, group.id);
                const estLabelW = Math.min(label.length * labelFont * 0.65 + labelPadX * 2, 360);
                const labelX = screenX + screenWidth / 2;
                const labelY = topY - labelGap - labelH;
                const showTextLabel = true;

                return (
                  <g key={`svg-group-${group.id}`}>
                    <g>
                      {/* Pozioma belka */}
                      <rect x={screenX} y={topY} width={screenWidth} height={barH} fill={color} />
                      {/* Lewa nóżka */}
                      <rect x={screenX} y={topY} width={barH} height={legH} fill={legGrad} />
                      {/* Prawa nóżka */}
                      <rect x={screenX + screenWidth - barH} y={topY} width={barH} height={legH} fill={legGrad} />
                    </g>
                    {/* Etykieta – tło (szkło/blur) */}
                    {showTextLabel && (
                      <rect
                        x={labelX - estLabelW / 2}
                        y={labelY}
                        width={estLabelW}
                        height={labelH}
                        rx={4} ry={4}
                        fill={isSelected ? "rgba(13,121,242,0.95)" : "rgba(10, 15, 25, 0.9)"}
                        stroke={isSelected ? "#fff" : "rgba(82,148,255,0.45)"}
                        strokeWidth={1}
                      />
                    )}
                    {/* Etykieta – tekst */}
                    {showTextLabel && (
                      <text
                        x={labelX}
                        y={labelY + labelH / 2 + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#fff"
                        fontSize={labelFont}
                        fontWeight={700}
                        fontFamily="Inter, system-ui, sans-serif"
                      >
                        {label}
                      </text>
                    )}
                  </g>
                );
            })}
          </svg>
        )}

        {rail.isVisible && snappedSymbols.map((symbol) => {
          const isListwa = symbol.deviceKind === "terminalBlock" && !isTerminalZlaczka(symbol.moduleRef);

          const asset = assetMap.get(symbol.id);
          if (!asset) {
            return null;
          }

          return (
            <div
              key={symbol.id}
              ref={(node) => bindMeasuredNode(symbol.id, node)}
              className={`din-rail-symbol-preview${selectedIds.has(symbol.id) ? " is-selected" : ""}`}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: `${symbol.width}px`,
                height: `${symbol.height}px`,
                transform: `translate(${symbol.x * scale + pan.x}px, ${symbol.y * scale + pan.y}px) scale(${scale})`,
                transformOrigin: "top left",
                pointerEvents: "none",
                zIndex: isListwa ? 12 : 20,
              }}
              dangerouslySetInnerHTML={
                asset.namespacedMarkup
                  ? { __html: asset.namespacedMarkup }
                  : undefined
              }
            >
              {asset.imageSrc && (
                <img alt="" draggable={false} src={asset.imageSrc} />
              )}
            </div>
          );
        })}
                  {/* Foreground parts of terminal blocks */}
          {rail.isVisible && snappedSymbols.some(s => s.deviceKind === "terminalBlock" && !isTerminalZlaczka(s.moduleRef)) && (
            <svg
              className="din-rail-foreground-layer"
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: `${rail.width}px`,
                height: `${rail.height}px`,
                transform: worldTransform,
                transformOrigin: "top left",
                pointerEvents: "none",
                zIndex: 25,
                overflow: "visible",
              }}
            >
              <DinRailConnectionsForegroundLayer
                symbols={snappedSymbols.filter(s => s.deviceKind === "terminalBlock" && !isTerminalZlaczka(s.moduleRef))}
                foregroundUrls={foregroundUrls}
              />
            </svg>
          )}
          <div
            ref={pixiHostRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,
            pointerEvents: "none",
            display: shouldRenderPixiLabels ? "block" : "none",
          }}
        />
        {rail.isVisible && (
          <div
            aria-hidden="true"
            style={labelOverlayStyle}
          >
            {snappedSymbols.map((symbol) => {
              const designationLabel = getSymbolDesignationLabel(
                symbol,
                automaticDesignationBySymbolId,
              );
              if (!designationLabel) {
                return null;
              }

              return (
                <div
                  key={`symbol-label-${symbol.id}`}
                  style={{
                    position: "absolute",
                    left: symbol.x * scale + pan.x + Math.max(symbol.width * scale, 48 * scale) / 2,
                    top: symbol.y * scale + pan.y + symbol.height * scale + 4,
                    transform: "translateX(-50%)",
                    transformOrigin: "center",
                    color: "#f8fafc",
                    fontFamily: "Segoe UI, Arial, sans-serif",
                    fontSize: `${clamp(13.5 * scale, 10, 18)}px`,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    textShadow:
                      "0 0 1px #111827, 0 0 3px #111827, 0 0 5px #111827",
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                  }}
                >
                  {designationLabel}
                </div>
              );
            })}
          </div>
        )}
        {rail.isVisible && (
          <div style={hitboxLayerStyle}>
            {snappedSymbols.map((symbol) => (
              <button
                key={`symbol-hitbox-${symbol.id}`}
                type="button"
                className={`din-rail-hitbox${selectedIds.has(symbol.id) ? " is-selected" : ""}`}
                style={{
                  ...buildWorldRectStyle(interactiveRects.get(symbol.id) ?? symbol),
                  pointerEvents: "auto",
                }}
                onPointerDown={(event) => beginDragForSymbol(event, symbol.id)}
                title={
                  getSymbolDesignationLabel(symbol, automaticDesignationBySymbolId)
                  || symbol.label
                }
                aria-label={
                  getSymbolDesignationLabel(symbol, automaticDesignationBySymbolId)
                  || symbol.label
                  || symbol.type
                }
              />
            ))}
          </div>
        )}
        <div
          ref={surfaceRef}
          className="din-rail-surface"
          onDragLeave={() => setIsDropTarget(false)}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPointerDown={handleSurfacePointerDown}
          style={{ position: "absolute", inset: 0, zIndex: 40 }}
        />
        {(selectedBoundsStyle || selectionRectStyle) && (
          <div aria-hidden="true" style={overlayLayerStyle}>
            {selectedBoundsStyle && (
              <div
                style={{
                  ...selectedBoundsStyle,
                  border: "none",
                  background: "transparent",
                  borderRadius: "6px",
                  pointerEvents: "none",
                }}
              >
              </div>
            )}
            {selectionRectStyle && (
              <div
                style={{
                  ...selectionRectStyle,
                  border: "none",
                  background: "var(--state-info-soft)",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        )}
      </div>

      {!rail.isVisible && <DinRailEmptyState onOpenGenerator={openGenerator} />}

      {isGeneratorOpen && (
        <DinRailGeneratorDialog
          draftConfig={draftConfig}
          onClose={() => setIsGeneratorOpen(false)}
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
