import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import type { SymbolItem } from "../types/symbolItem";
import {
  generateDinRailSvg,
  getDinRailDimensions,
  type DinRailConfig,
} from "../lib/schematic/dinRailGenerator";
import {
  buildDinRailGroupFrames,
  buildSelectionBounds,
  buildSelectionLabel,
  type DinRailGroupFrameData,
  expandSelectionToGroupIds,
  getDragSelectionIds,
  rectsIntersect,
} from "../lib/dinRailSelection";
import { snapModulePlacementToDinRail } from "../lib/dinRailSnap";
import {
  getPaletteTemplateDimensions,
  supportsDinRailPlacement,
} from "../lib/modules/moduleCatalog";
import { loadPreparedSvgMarkup } from "../lib/modules/svgAsset";
import {
  DinRailEmptyState,
  DinRailGeneratorDialog,
  DinRailStatusBar,
  DinRailViewportHud,
  DinRailZoomToolbar,
} from "./dinRailUiParts";

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
  onZoomChange?: (zoomPercent: number) => void;
}

interface ViewportSize {
  height: number;
  width: number;
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
const GROUP_FRAME_PADDING = 6;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const PIXI_MAX_RESOLUTION = 2;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

function useContainerSize(containerRef: React.RefObject<HTMLDivElement | null>): ViewportSize {
  const [size, setSize] = useState<ViewportSize>({ width: 0, height: 0 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const updateSize = () => {
      setSize({
        width: node.clientWidth,
        height: node.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [containerRef]);

  return size;
}

function worldToScreenRect(rect: WorldRect, pan: WorldPoint, scale: number): WorldRect {
  return {
    x: rect.x * scale + pan.x,
    y: rect.y * scale + pan.y,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

function buildSelectionStyle(rect: WorldRect | null, pan: WorldPoint, scale: number): React.CSSProperties | undefined {
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return undefined;
  }

  const screen = worldToScreenRect(rect, pan, scale);
  return {
    position: "absolute",
    left: `${screen.x}px`,
    top: `${screen.y}px`,
    width: `${screen.width}px`,
    height: `${screen.height}px`,
  };
}

function buildOverlayStyle(rect: WorldRect, pan: WorldPoint, scale: number): React.CSSProperties {
  const screen = worldToScreenRect(rect, pan, scale);
  return {
    position: "absolute",
    left: `${screen.x}px`,
    top: `${screen.y}px`,
    width: `${screen.width}px`,
    height: `${screen.height}px`,
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



function namespaceSvgMarkup(svgMarkup: string, prefix: string): string {
  if (typeof DOMParser === "undefined") {
    return svgMarkup;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== "svg") {
      return svgMarkup;
    }

    const idMap = new Map<string, string>();
    root.querySelectorAll("[id]").forEach((element) => {
      const currentId = element.getAttribute("id");
      if (!currentId) {
        return;
      }

      const nextId = `${prefix}-${currentId}`;
      idMap.set(currentId, nextId);
      element.setAttribute("id", nextId);
    });

    const rewriteValue = (value: string) => {
      let nextValue = value;
      idMap.forEach((nextId, currentId) => {
        nextValue = nextValue
          .split(`url(#${currentId})`).join(`url(#${nextId})`)
          .split(`href="#${currentId}"`).join(`href="#${nextId}"`)
          .split(`xlink:href="#${currentId}"`).join(`xlink:href="#${nextId}"`)
          .split(`="#${currentId}"`).join(`="#${nextId}"`);
      });
      return nextValue;
    };

    root.querySelectorAll("*").forEach((element) => {
      for (const attributeName of element.getAttributeNames()) {
        const value = element.getAttribute(attributeName);
        if (!value || (!value.includes("url(#") && !value.includes("#"))) {
          continue;
        }

        const rewritten = rewriteValue(value);
        if (rewritten !== value) {
          element.setAttribute(attributeName, rewritten);
        }
      }
    });

    return root.outerHTML;
  } catch {
    return svgMarkup;
  }
}

function usePreparedAssetMap(symbols: SymbolItem[]) {
  const [assetMap, setAssetMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const nextSymbols = symbols.filter((symbol) => symbol.visualPath);

    Promise.all(
      nextSymbols.map(async (symbol) => [
        symbol.id,
        await loadPreparedSvgMarkup(symbol.visualPath, symbol.parameters),
      ] as const),
    )
      .then((entries) => {
        if (cancelled) {
          return;
        }

        setAssetMap(new Map(entries));
      })
      .catch(() => {
        if (!cancelled) {
          setAssetMap(new Map());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [symbols]);

  return assetMap;
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
  onZoomChange,
}: DinRailCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiHostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const interactionRef = useRef<InteractionState>({ mode: "idle" });
  const panRef = useRef<WorldPoint>({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const lastGeneratorRequest = useRef(generatorRequest);
  const measuredNodesRef = useRef(new Map<string, HTMLDivElement>());

  const viewportSize = useContainerSize(containerRef);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<WorldPoint>({ x: 0, y: 0 });
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [selectionRect, setSelectionRect] = useState<WorldRect | null>(null);
  const [dragSelectionIds, setDragSelectionIds] = useState<string[]>([]);

  const [draftConfig, setDraftConfig] = useState<DinRailConfig>(
    rail.isVisible ? rail.config : DEFAULT_CONFIG,
  );
  const [symbolVisualRects, setSymbolVisualRects] = useState<Map<string, WorldRect>>(new Map());

  const snappedSymbols = useMemo(
    () => symbols.filter((symbol) => symbol.isSnappedToRail),
    [symbols],
  );
  const rowCenters = useMemo(
    () => getDinRailDimensions(rail.config.rows, rail.config.modulesPerRow).rowCenters,
    [rail.config.modulesPerRow, rail.config.rows],
  );
  const groupFrames = useMemo(
    () => buildDinRailGroupFrames(snappedSymbols, GROUP_FRAME_PADDING),
    [snappedSymbols],
  );
  const assetMap = usePreparedAssetMap(snappedSymbols);
  const interactiveRects = useMemo(() => {
    const nextMap = new Map<string, WorldRect>();

    for (const symbol of snappedSymbols) {
      const measuredRect = symbolVisualRects.get(symbol.id);
      const fallbackRect: WorldRect = {
        x: symbol.x,
        y: symbol.y,
        width: symbol.width,
        height: symbol.height,
      };
      nextMap.set(symbol.id, expandRect(measuredRect ?? fallbackRect, 4));
    }

    return nextMap;
  }, [snappedSymbols, symbolVisualRects]);
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
  const selectionLabel = buildSelectionLabel(selectedSnappedSymbols);
  const isDraggingSelection = dragSelectionIds.length > 0;

  const previewSvg = useMemo(() => generateDinRailSvg(draftConfig), [draftConfig]);
  const previewDims = useMemo(
    () => getDinRailDimensions(draftConfig.rows, draftConfig.modulesPerRow),
    [draftConfig],
  );
  const previewScale = Math.min(340 / previewDims.width, 260 / previewDims.height);
  const totalModules = rail.isVisible
    ? rail.config.rows * rail.config.modulesPerRow
    : draftConfig.rows * draftConfig.modulesPerRow;

  const setPanSafe = useCallback((nextPan: WorldPoint) => {
    panRef.current = nextPan;
    setPan(nextPan);
  }, []);

  const setScaleSafe = useCallback((nextScale: number) => {
    scaleRef.current = nextScale;
    setScale(nextScale);
  }, []);

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

  const snapModulePlacement = useCallback(
    (
      x: number,
      y: number,
      width: number,
      height: number,
      dragSymbolId?: string,
      options?: { forceSnapToRail?: boolean; isCurrentlySnapped?: boolean },
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
      if (!host || appRef.current) {
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
    }

    void mountApp();

    return () => {
      cancelled = true;
    };
  }, [viewportSize.height, viewportSize.width]);

  useEffect(() => {
    const nextRects = new Map<string, WorldRect>();

    for (const symbol of snappedSymbols) {
      const node = measuredNodesRef.current.get(symbol.id);
      if (!node) {
        continue;
      }

      const normalized = measureSvgNormalizedRect(node);
      if (!normalized) {
        continue;
      }

      nextRects.set(symbol.id, worldRectFromNormalizedRect(symbol, normalized));
    }

    setSymbolVisualRects(nextRects);
  }, [assetMap, scale, snappedSymbols]);

  useEffect(() => {
    const app = appRef.current;
    if (!app || viewportSize.width <= 0 || viewportSize.height <= 0) {
      return;
    }

    app.renderer.resize(viewportSize.width, viewportSize.height);
  }, [viewportSize.height, viewportSize.width]);

  useEffect(() => {
    const app = appRef.current;
    if (!app) {
      return;
    }

    app.stage.removeChildren();

    const world = new Container();
    world.position.set(pan.x, pan.y);
    world.scale.set(scale, scale);
    app.stage.addChild(world);

    for (const group of groupFrames) {
      const groupBox = new Graphics();
      groupBox
        .roundRect(group.x, group.y, group.width, group.height, 4)
        .fill({ color: 0x3b82f6, alpha: 0.05 })
        .stroke({ color: 0x3b82f6, alpha: 0.53, width: 1.5 });
      world.addChild(groupBox);

      const groupLabel = new Text({
        text: group.label,
        style: new TextStyle({
          fill: "#ffffff",
          fontFamily: "Segoe UI, Arial, sans-serif",
          fontSize: 9,
          fontWeight: "700",
        }),
      });
      groupLabel.x = group.x + 4;
      groupLabel.y = group.y - 10;
      groupLabel.roundPixels = true;
      world.addChild(groupLabel);
    }

    for (const symbol of snappedSymbols) {


      if (symbol.referenceDesignation) {
        const designation = new Text({
          text: symbol.referenceDesignation,
          style: new TextStyle({
            fill: "#111827",
            fontFamily: "Segoe UI, Arial, sans-serif",
            fontSize: 10,
            fontWeight: "700",
            align: "center",
          }),
        });
        designation.x = symbol.x + Math.max(symbol.width, 48) / 2 - designation.width / 2;
        designation.y = symbol.y + symbol.height + 4;
        designation.roundPixels = true;
        world.addChild(designation);
      }
    }
  }, [assetMap, groupFrames, pan.x, pan.y, scale, selectedIds, snappedSymbols]);

  useEffect(() => {
    return () => {
      const app = appRef.current;
      if (app) {
        app.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

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

    event.currentTarget.setPointerCapture(event.pointerId);
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
    const anchorRectStart = interactiveRects.get(draggedSymbol.id) ?? {
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
    setDragSelectionIds(dragIds);

    onSymbolMoveStart?.(draggedSymbol.id);
    onSymbolSelect?.(draggedSymbol.id, { toggle: event.ctrlKey || event.metaKey });
  }, [interactiveRects, onSymbolMoveStart, onSymbolSelect, rail.isVisible, screenToWorld, selectedIds, snappedSymbols]);

  const handleGroupPointerDown = useCallback((
    event: React.PointerEvent<HTMLDivElement>,
    group: DinRailGroupFrameData,
  ) => {
    if (!rail.isVisible) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
    onSymbolSelect?.(group.anchorSymbolId, { toggle: event.ctrlKey || event.metaKey });
    interactionRef.current = { mode: "idle" };
  }, [onSymbolSelect, rail.isVisible]);

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
      { isCurrentlySnapped: anchorSymbol.isSnappedToRail },
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
    const interaction = interactionRef.current;

    if (interaction.mode === "drag") {
      onSymbolMoveEnd?.(interaction.anchorId);
      setDragSelectionIds([]);
    }


    if (interaction.mode === "select" && selectionRect) {
      const area = selectionRect.width * selectionRect.height;
      if (area < 16) {
        onSymbolSelect?.(null);
      } else {
        commitSelectionRect(selectionRect);
      }
    }

    if (interaction.mode === "idle" && rail.isVisible) {
      onSymbolSelect?.(null);
    }

    interactionRef.current = { mode: "idle" };
    setSelectionRect(null);
  }, [commitSelectionRect, onSymbolMoveEnd, onSymbolSelect, rail.isVisible, selectionRect]);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
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
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomAroundViewportPoint(viewportPoint, scaleRef.current * factor);
  }, [rail.isVisible, zoomAroundViewportPoint]);

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
    });
    onPaletteDrop?.(templateId, snapped.x, snapped.y, { snapToRail: true });
    setIsDropTarget(false);
  }, [getPaletteTemplate, onPaletteDrop, onUnsupportedTemplateDrop, rail.isVisible, screenToWorld, snapModulePlacement]);

  const updateRows = (value: string) => {
    setDraftConfig((prev) => ({
      ...prev,
      rows: Math.max(1, Math.min(10, parseInt(value, 10) || 1)),
    }));
  };

  const updateModulesPerRow = (value: string) => {
    setDraftConfig((prev) => ({
      ...prev,
      modulesPerRow: Math.max(6, Math.min(48, parseInt(value, 10) || 6)),
    }));
  };

  const generateRail = () => {
    const svg = generateDinRailSvg(draftConfig);
    const dims = getDinRailDimensions(draftConfig.rows, draftConfig.modulesPerRow);
    onRailGenerated?.(draftConfig, svg, dims.width, dims.height);
    setIsGeneratorOpen(false);
  };

  const selectionRectStyle = buildSelectionStyle(selectionRect, pan, scale);
  const selectedBoundsStyle = buildSelectionStyle(selectedBounds, pan, scale);
  const railSvgStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: `${rail.width}px`,
    height: `${rail.height}px`,
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
    transformOrigin: "top left",
    pointerEvents: "none",
    zIndex: 1,
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
      />

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
        {rail.isVisible && snappedSymbols.map((symbol) => {
          const markup = assetMap.get(symbol.id);
          if (!markup) {
            return null;
          }

          const namespacedMarkup = namespaceSvgMarkup(markup, `din-${symbol.id}`);

          return (
            <div
              key={symbol.id}
              ref={(node) => bindMeasuredNode(symbol.id, node)}
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
              dangerouslySetInnerHTML={{ __html: namespacedMarkup }}
            />
          );
        })}
        <div
          ref={pixiHostRef}
          style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}
        />


        {rail.isVisible && groupFrames.map((group) => (
          <div
            key={`group-hitbox-${group.id}`}
            className="din-rail-group-hitbox"
            style={{ ...buildOverlayStyle(group, pan, scale), zIndex: 5 }}
            onPointerDown={(event) => handleGroupPointerDown(event, group)}
          />
        ))}
        {rail.isVisible && snappedSymbols.map((symbol) => (
          <button
            key={`symbol-hitbox-${symbol.id}`}
            type="button"
            className={`din-rail-hitbox${selectedIds.has(symbol.id) ? " is-selected" : ""}`}
            style={{ ...buildOverlayStyle(interactiveRects.get(symbol.id) ?? symbol, pan, scale), zIndex: 6 }}
            onPointerDown={(event) => beginDragForSymbol(event, symbol.id)}
            title={symbol.referenceDesignation || symbol.label}
            aria-label={symbol.referenceDesignation || symbol.label || symbol.type}
          />
        ))}
        <div
          className="din-rail-surface"
          onDragLeave={() => setIsDropTarget(false)}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPointerDown={handleSurfacePointerDown}
          onWheel={handleWheel}
          style={{ position: "absolute", inset: 0, zIndex: 4 }}
        />
        {selectedBoundsStyle && (
          <div
            style={{
              ...selectedBoundsStyle,
              zIndex: 6,
              border: `1.5px dashed ${isDraggingSelection ? "rgba(249, 115, 22, 0.92)" : "rgba(249, 115, 22, 0.72)"}`,
              background: isDraggingSelection ? "rgba(249, 115, 22, 0.05)" : "rgba(249, 115, 22, 0.04)",
              borderRadius: "6px",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "4px",
                top: "-20px",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 700,
                pointerEvents: "none",
              }}
            >
              {selectionLabel}
            </div>
          </div>
        )}
        {selectionRectStyle && (
          <div
            style={{
              ...selectionRectStyle,
              zIndex: 6,
              border: "1.5px dashed rgba(249, 115, 22, 0.85)",
              background: "rgba(249, 115, 22, 0.12)",
              pointerEvents: "none",
            }}
          />
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
