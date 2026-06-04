import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Application, Container, Text, TextStyle } from "pixi.js";
import { isAuxiliaryNonCircuitSymbol, type SymbolItem } from "../types/symbolItem";
import {
  generateDinRailSvg,
  getDinRailDimensions,
  type DinRailConfig,
} from "../lib/schematic/dinRailGenerator";
import { buildSchematicLayout } from "../lib/schematic/schematicLayoutEngine";
import {
  DIN_RAIL_GROUP_FRAME_PADDING,
  DIN_RAIL_GROUP_BRACKET_BAR_HEIGHT,
  DIN_RAIL_GROUP_BRACKET_LABEL_GAP,
  DIN_RAIL_GROUP_BRACKET_LABEL_HEIGHT,
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
import { useDinRailPreparedAssets } from "../hooks/useDinRailPreparedAssets";
import { useElementSize } from "../hooks/useElementSize";
import {
  DinRailEmptyState,
  DinRailGeneratorDialog,
  DinRailStatusBar,
  DinRailViewportHud,
  DinRailZoomToolbar,
} from "./dinRailUiParts";
import { AppIcon } from "./AppIcon";

const DIN_RAIL_PREVIEW_CANVAS_WIDTH = 360;
const DIN_RAIL_PREVIEW_CANVAS_HEIGHT = 280;
const DIN_RAIL_PREVIEW_MARGIN_X = 40;
const DIN_RAIL_PREVIEW_MARGIN_Y = 28;

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
}

interface WorldRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface WorldPoint {
  x: number;
  y: number;
}

interface NormalizedRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

type InteractionState =
  | { mode: "idle" }
  | { lastX: number; lastY: number; mode: "pan" }
  | {
    anchorWorld: WorldPoint;
    mode: "select";
  }
  | {
    anchorId: string;
    anchorRectStart: WorldRect;
    dragIds: string[];
    mode: "drag";
    pointerWorldStart: WorldPoint;
    startPositions: Map<string, WorldPoint>;
  };

const DEFAULT_CONFIG: DinRailConfig = { rows: 1, modulesPerRow: 24 };
const MAX_INITIAL_SCALE = 0.25;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const PIXI_MAX_RESOLUTION = 2;
const PIXI_LABEL_SYMBOL_LIMIT = 64;
const MANUAL_REFERENCE_DESIGNATION_KEY = "ManualReferenceDesignation";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

function buildWorldRectStyle(rect: WorldRect): React.CSSProperties {
  return {
    position: "absolute",
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

function expandRect(rect: WorldRect, padding: number): WorldRect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function measureSvgNormalizedRect(node: HTMLDivElement): NormalizedRect | null {
  const svg = node.querySelector("svg");
  if (!(svg instanceof SVGSVGElement)) {
    return null;
  }

  const viewBox = svg.viewBox?.baseVal;
  if (!viewBox || viewBox.width <= 0 || viewBox.height <= 0) {
    return null;
  }

  try {
    const bbox = svg.getBBox();
    if (bbox.width <= 0 || bbox.height <= 0) {
      return null;
    }

    const normalized: NormalizedRect = {
      x: (bbox.x - viewBox.x) / viewBox.width,
      y: (bbox.y - viewBox.y) / viewBox.height,
      width: bbox.width / viewBox.width,
      height: bbox.height / viewBox.height,
    };

    if (
      !Number.isFinite(normalized.x)
      || !Number.isFinite(normalized.y)
      || !Number.isFinite(normalized.width)
      || !Number.isFinite(normalized.height)
      || normalized.width <= 0
      || normalized.height <= 0
    ) {
      return null;
    }

    return normalized;
  } catch {
    return null;
  }
}

function worldRectFromNormalizedRect(symbol: SymbolItem, normalized: NormalizedRect): WorldRect {
  return {
    x: symbol.x + normalized.x * symbol.width,
    y: symbol.y + normalized.y * symbol.height,
    width: normalized.width * symbol.width,
    height: normalized.height * symbol.height,
  };
}

function sameNormalizedRect(left: NormalizedRect, right: NormalizedRect): boolean {
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height;
}

function getSymbolDesignationLabel(
  symbol: SymbolItem,
  automaticDesignationBySymbolId: Map<string, string>,
): string {
  const manualDesignation = symbol.referenceDesignation.trim();
  const isManualDesignation =
    symbol.parameters[MANUAL_REFERENCE_DESIGNATION_KEY]?.toLocaleLowerCase("pl-PL") === "true";

  if (isManualDesignation && manualDesignation.length > 0) {
    return manualDesignation;
  }

  // For terminal blocks and distribution blocks, use the pre-computed displayModuleNumber
  // which contains the correct prefix (N1, PE1, BL1, X1)
  if (isAuxiliaryNonCircuitSymbol(symbol)) {
    return symbol.displayModuleNumber || manualDesignation;
  }

  return automaticDesignationBySymbolId.get(symbol.id) ?? "";
}



export function DinRailCanvas({
  getPaletteTemplate,
  rail,
  symbols,
  generatorRequest = 0,
  selectedSymbolId,
  selectedSymbolIds = selectedSymbolId ? [selectedSymbolId] : [],
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
}: DinRailCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const pixiHostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const pixiWorldRef = useRef<Container | null>(null);
  const viewportFrameRef = useRef<number | null>(null);
  const interactionRef = useRef<InteractionState>({ mode: "idle" });
  const panRef = useRef<WorldPoint>({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const lastGeneratorRequest = useRef(generatorRequest);
  const measuredNodesRef = useRef(new Map<string, HTMLDivElement>());

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
  const assetMap = useDinRailPreparedAssets(snappedSymbols);
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
    ) => snapModulePlacementToDinRail(
      x,
      y,
      width,
      height,
      rail.width,
      rowCenters,
      snappedSymbols,
      dragSymbolId,
      options,
    ),
    [rail.width, rowCenters, snappedSymbols],
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
            fontSize: 11,
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
    const surface = surfaceRef.current;
    if (!surface) {
      return;
    }

    const onWheelNative = (event: WheelEvent) => {
      handleWheel(event);
    };

    surface.addEventListener("wheel", onWheelNative, { passive: false });
    return () => {
      surface.removeEventListener("wheel", onWheelNative);
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
    zIndex: 1,
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
    zIndex: 6,
  };
  const overlayLayerStyle: React.CSSProperties = {
    ...worldLayerBaseStyle,
    zIndex: 7,
  };
  const labelOverlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 5,
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
        {rail.isVisible && showGroups && (
          <svg
            className="din-rail-groups-layer"
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              overflow: "visible",
              zIndex: 10,
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
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {groupFrames.map((group) => {
                const isSelected = group.symbolIds.some((id) => selectedIds.has(id));
                const isSingle = group.memberCount <= 1;
                const screenX = group.x * scale + pan.x;
                const screenY = group.y * scale + pan.y;
                const screenWidth = Math.max(1, group.width * scale);
                const isVeryLowZoom = scale < 0.15;
                const barH = clamp(DIN_RAIL_GROUP_BRACKET_BAR_HEIGHT * scale, 4, 7);
                const legH = clamp(DIN_RAIL_GROUP_BRACKET_LEG_HEIGHT * scale, 10, 44);
                const labelH = clamp(DIN_RAIL_GROUP_BRACKET_LABEL_HEIGHT * scale, 10, 34);
                const labelGap = clamp(DIN_RAIL_GROUP_BRACKET_LABEL_GAP * scale, 2, 14);
                const labelPadX = clamp(10 * scale, 4, 16);
                const labelFont = clamp(13 * scale, 8, 17);

                const topY = Math.max(4, screenY - DIN_RAIL_GROUP_BRACKET_OFFSET_Y * scale);
                const color = isSelected
                  ? "rgba(13,121,242,1)"
                  : isSingle
                    ? "rgba(82,148,255,0.5)"
                    : "rgba(82,148,255,0.9)";

                const legGrad = isSelected ? "url(#svg-bracket-leg-selected)" : "url(#svg-bracket-leg-default)";
                const label = formatDinRailGroupLabel(group.label, group.id);
                const estLabelW = Math.min(label.length * labelFont * 0.65 + labelPadX * 2, 360);
                const labelX = screenX + screenWidth / 2;
                const labelY = isVeryLowZoom
                  ? topY + 1
                  : Math.max(4, topY - labelGap - labelH);
                const showTextLabel = true;

                return (
                  <g key={`svg-group-${group.id}`} filter={isSelected ? "url(#svg-bracket-glow)" : undefined}>
                    {/* Pozioma belka */}
                    <rect x={screenX} y={topY} width={screenWidth} height={barH} fill={color} />
                    {/* Lewa nóżka */}
                    <rect x={screenX} y={topY} width={barH} height={legH} fill={legGrad} />
                    {/* Prawa nóżka */}
                    <rect x={screenX + screenWidth - barH} y={topY} width={barH} height={legH} fill={legGrad} />
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
                zIndex: 2,
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
        <div
          ref={pixiHostRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
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

              // Find the stable index of the symbol on this rail to alternate offsets (staggering)
              const sameRailSymbols = snappedSymbols
                .filter((s) => Math.abs(s.y - symbol.y) < 5)
                .sort((a, b) => a.x - b.x);
              const indexInRail = sameRailSymbols.findIndex((s) => s.id === symbol.id);

              const isStaggerZoom = scale < 0.3;

              let staggerOffset = 6;
              if (isStaggerZoom) {
                const staggerLevels = 2;
                staggerOffset = 6 + (indexInRail >= 0 ? indexInRail % staggerLevels : 0) * 12;
              }

              return (
                <div
                  key={`symbol-label-${symbol.id}`}
                  style={{
                    position: "absolute",
                    left: symbol.x * scale + pan.x + Math.max(symbol.width * scale, 48 * scale) / 2,
                    top: symbol.y * scale + pan.y + symbol.height * scale + staggerOffset,
                    transform: "translateX(-50%)",
                    transformOrigin: "center",
                    color: "#f8fafc",
                    fontFamily: "Segoe UI, Arial, sans-serif",
                    fontSize: `${clamp(11 * scale, 8, 15)}px`,
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
          style={{ position: "absolute", inset: 0, zIndex: 4 }}
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
