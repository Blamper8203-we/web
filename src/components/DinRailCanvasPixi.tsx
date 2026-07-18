import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type SymbolItem } from "../types/symbolItem";
import type { ConnectionItem } from "../types/connectionItem";
import {
  getDinRailDimensions,
  type DinRailConfig,
} from "../lib/schematic/dinRailGenerator";
import { buildSchematicLayout } from "../lib/schematic/schematicLayoutEngine";
import { buildSelectionBounds } from "../lib/dinRailSelection";
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
  measureSvgNormalizedRect,
  sameNormalizedRect,
  worldRectFromNormalizedRect,
  expandRect,
} from "../lib/dinRailCanvas/geometry";
import "./DinRailCanvas.css";
import type { NormalizedRect, WorldRect } from "../lib/dinRailCanvas/types";

import { useDinRailViewport } from "../hooks/canvas/useDinRailViewport";
import { useIsMobileLayout } from "../hooks/useViewport";
// WHY: useDinRailPixiApp was removed 2026-06-28 — see hooks/canvas/useDinRailPixiApp.ts.
// The mounting flag shouldRenderPixiLabels has been `false` since creation,
// so the Pixi path was permanently dead. Designation labels are now
// rendered via the DOM-based DinRailDesignationLabelsOverlay.
import { useDinRailInteraction } from "../hooks/canvas/useDinRailInteraction";
import { useDinRailPinch } from "../hooks/canvas/useDinRailPinch";
import { useDinRailDragDrop } from "../hooks/canvas/useDinRailDragDrop";

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
  const { t } = useTranslation();
  useSvgTerminalsPreloader(symbols);
  const isMobile = useIsMobileLayout();
  const [panMode, setPanMode] = useState(false);
  const mobileInitRef = useRef(false);

  useEffect(() => {
    if (isMobile && rail.isVisible && !mobileInitRef.current) {
      setPanMode(true);
      mobileInitRef.current = true;
    }
  }, [isMobile, rail.isVisible]);

  const containerRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const measuredNodesRef = useRef(new Map<string, HTMLDivElement>());

  const viewportSize = useElementSize(containerRef);
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
  const { foregroundUrls } = useDinRailForegroundSvgs(snappedSymbols);

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

  // WHY: shouldRenderPixiLabels used to gate the Pixi.js label renderer.
  // Removed 2026-06-28 — the flag has been hard-wired to `false` since
  // creation (git history confirms it was never `true`). The Pixi hook
  // and the `pixi.js` / `@pixi/react` dependencies are gone; labels are
  // rendered via DinRailDesignationLabelsOverlay (DOM, GPU-friendly).
  // If Pixi ever returns, restore the flag and the hook from git history.

  const railGenerator = useDinRailRailGenerator({
    railConfig: rail.config,
    isRailVisible: rail.isVisible,
    generatorRequest,
    onGenerate: (config, svg, width, height) => {
      onRailGenerated?.(config, svg, width, height);
    },
  });

  // 1. Hook obsługujący viewport
  const {
    scale,
    pan,
    panRef,
    scaleRef,
    setPanSafe,
    setScaleSafe,
    flushViewportState,
    fitToViewport,
    screenToWorld,
    zoomIn,
    zoomOut,
  } = useDinRailViewport({
    rail,
    viewportSize,
    containerRef,
    viewportRef,
    onZoomChange,
  });

  // 1b. Pinch-to-zoom (2 palce) na mobile. Musi być przed useDinRailInteraction,
  // bo przekazujemy mu pinchActiveRef — interaction pomija select/drag gdy pinch.
  const {
    pinchActiveRef,
    onTouchStart: onPinchTouchStart,
    onTouchMove: onPinchTouchMove,
    onTouchEnd: onPinchTouchEnd,
  } = useDinRailPinch({
    containerRef,
    scaleRef,
    panRef,
    setScaleSafe,
    setPanSafe,
  });

  // 2. Hook obsługujący renderowanie w PixiJS — usunięty 2026-06-28
  // (shouldRenderPixiLabels permanentnie false, hook nie był nigdy wywoływany).
  // Etykiety oznaczeń renderowane są przez DinRailDesignationLabelsOverlay.

  // 3. Hook obsługujący interakcje (kliknięcia, przeciąganie, zaznaczanie)
  const {
    selectionRect,
    handleSurfacePointerDown,
    handlePointerMove,
    handlePointerUp,
    beginDragForSymbol,
    snapModulePlacement,
  } = useDinRailInteraction({
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
    pinchActiveRef,
    onSymbolMoveStart,
    onSymbolMove,
    onSymbolMoveEnd,
    onSymbolSelect,
    onSymbolSelectionChange,
    panModeEnabled: panMode,
    isMobile,
  });

  // 4. Hook obsługujący Drag & Drop z palety
  const {
    isDropTarget,
    handleDragOver,
    handleDrop,
    handleDragLeave,
  } = useDinRailDragDrop({
    rail,
    getPaletteTemplate,
    snapModulePlacement,
    screenToWorld,
    onPaletteDrop,
    onUnsupportedTemplateDrop,
  });

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

  const bindMeasuredNode = useCallback((symbolId: string, node: HTMLDivElement | null) => {
    if (node) {
      measuredNodesRef.current.set(symbolId, node);
      return;
    }
    measuredNodesRef.current.delete(symbolId);
  }, []);

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
        panMode={panMode}
        onTogglePanMode={isMobile ? () => setPanMode((p) => !p) : undefined}
      />

      {rail.isVisible && selectedIds.size > 0 && onDeleteSelected && (
        <div className="workspace-floating-delete-btn">
          <button
            type="button"
            className="workspace-tool-btn"
            onClick={onDeleteSelected}
            title={t("auto.usuzaznaczonede_49", "Usuń zaznaczone (Delete)")}
          >
            <AppIcon name="delete" size={16} />
            <span className="delete-label">Usuń zaznaczone ({selectedIds.size})</span>
          </button>
        </div>
      )}

      {/* WHY: Mobile drag-drop was previously blocked by a `window.innerWidth <= 768` guard
          on `onSurfacePointerDown`, `onSurfaceDrop`, and `onBeginDragForSymbol`. That guard
          silently no-op'd placing modules on the rail on every phone — PWA mobile web and
          Capacitor iOS/Android — which broke the core UX for the distribution audience.
          The rail surface already has `touch-action: none` in DinRailCanvas.css, so native
          scroll/zoom conflicts are handled by the browser. Multi-touch pinch/pan gestures
          can still be filtered at the source (event.touches) if they ever interfere. */}
      <DinRailCanvasViewport
        viewportRef={viewportRef}
        surfaceRef={surfaceRef}
        rail={rail}
        pan={pan}
        scale={scale}
        isDropTarget={isDropTarget}
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
        onTouchStart={onPinchTouchStart}
        onTouchMove={onPinchTouchMove}
        onTouchEnd={onPinchTouchEnd}
        onSurfacePointerDown={handleSurfacePointerDown}
        onSurfaceDragOver={handleDragOver}
        onSurfaceDrop={handleDrop}
        onSurfaceDragLeave={handleDragLeave}
        onBeginDragForSymbol={(symbolId) => (event: React.PointerEvent<HTMLElement>) => beginDragForSymbol(event, symbolId)}
        onRequestLeftPanelTab={onRequestLeftPanelTab}
        bindMeasuredNode={bindMeasuredNode}
      />

      {/* WHY: chowamy pusty state (CTA "Wygeneruj szynę DIN") gdy dialog
         generatora jest otwarty — wtedy button jest zbędnym szumem za
         backdropem i klikalnym confliktem z dialogiem. */}
      {!rail.isVisible && !railGenerator.isGeneratorOpen && (
        <DinRailEmptyState onOpenGenerator={railGenerator.openGenerator} />
      )}

      {railGenerator.isGeneratorOpen && (
        <DinRailGeneratorDialog
          draftConfig={railGenerator.draftConfig}
          onClose={railGenerator.closeGenerator}
          onGenerate={railGenerator.generateRail}
          onModulesPerRowChange={railGenerator.updateModulesPerRow}
          onRowsChange={railGenerator.updateRows}
          previewHeight={railGenerator.previewDims.height}
          previewScale={railGenerator.previewScale}
          previewSvg={railGenerator.previewSvg}
          previewWidth={railGenerator.previewDims.width}
        />
      )}

      <DinRailStatusBar
        height={rail.height}
        isVisible={rail.isVisible}
        scale={scale}
        totalModules={railGenerator.totalModules}
        width={rail.width}
      />
    </div>
  );
}
