import type { CSSProperties, RefObject, UIEventHandler } from "react";
import {
  buildDinRailGroupFrames,
} from "../lib/dinRailSelection";
import type { SymbolItem } from "../types/symbolItem";
import type { WorldPoint, WorldRect } from "../lib/dinRailCanvas/types";
import type { DinRailCanvasRail } from "./DinRailCanvasPixi";
import type { PreparedSymbolAsset } from "../hooks/useDinRailPreparedAssets";
import { isTerminalZlaczka } from "../lib/connections/connectionsLogic";

// Import warstw
import { DinRailListwyPlaceholdersLayer } from "./canvasLayers/DinRailListwyPlaceholdersLayer";
import { DinRailGroupsLayer } from "./canvasLayers/DinRailGroupsLayer";
import { DinRailSymbolsLayer } from "./canvasLayers/DinRailSymbolsLayer";
import { DinRailTerminalBlocksForegroundLayer } from "./canvasLayers/DinRailTerminalBlocksForegroundLayer";
import { DinRailDesignationLabelsOverlay } from "./canvasLayers/DinRailDesignationLabelsOverlay";
import { DinRailHitboxesLayer } from "./canvasLayers/DinRailHitboxesLayer";
import { DinRailSelectionOverlay } from "./canvasLayers/DinRailSelectionOverlay";

type DesignationMap = Map<string, string>;
type DinRailPreparedAsset = PreparedSymbolAsset;

export interface DinRailCanvasViewportProps {
  viewportRef: RefObject<HTMLDivElement | null>;
  surfaceRef: RefObject<HTMLDivElement | null>;
  pixiHostRef: RefObject<HTMLDivElement | null>;
  rail: DinRailCanvasRail;
  pan: WorldPoint;
  scale: number;
  isDropTarget: boolean;
  shouldRenderPixiLabels: boolean;
  showGroups: boolean;
  snappedSymbols: SymbolItem[];
  assetMap: Map<string, DinRailPreparedAsset>;
  foregroundUrls: Record<string, string>;
  interactiveRects: Map<string, WorldRect>;
  selectedIds: Set<string>;
  selectionRect: WorldRect | null;
  selectedBounds: WorldRect | null;
  automaticDesignationBySymbolId: DesignationMap;
  onPointerMove: UIEventHandler<HTMLDivElement>;
  onPointerUp: UIEventHandler<HTMLDivElement>;
  onPointerCancel: UIEventHandler<HTMLDivElement>;
  onSurfacePointerDown: UIEventHandler<HTMLDivElement>;
  onSurfaceDragOver: UIEventHandler<HTMLDivElement>;
  onSurfaceDrop: UIEventHandler<HTMLDivElement>;
  onSurfaceDragLeave: () => void;
  onBeginDragForSymbol: (symbolId: string) => (event: React.PointerEvent<HTMLElement>) => void;
  onRequestLeftPanelTab?: (tabName: string) => void;
  // Allow callers to inject a custom asset measurement bridge (the parent
  // component owns the ref map that drives SVG normalization measurements).
  bindMeasuredNode: (symbolId: string, node: HTMLDivElement | null) => void;
}

/**
 * Renders the world-space content of a DIN rail canvas viewport.
 * All coordinates inside this component are transformed via `worldTransform`,
 * which is derived from `pan` and `scale` in the parent.
 *
 * The component is pure with respect to the props — pointer state, asset
 * preparation, and the rail generator live in the parent `DinRailCanvas`.
 */
export function DinRailCanvasViewport({
  viewportRef,
  surfaceRef,
  pixiHostRef,
  rail,
  pan,
  scale,
  isDropTarget,
  shouldRenderPixiLabels,
  showGroups,
  snappedSymbols,
  assetMap,
  foregroundUrls,
  interactiveRects,
  selectedIds,
  selectionRect,
  selectedBounds,
  automaticDesignationBySymbolId,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onSurfacePointerDown,
  onSurfaceDragOver,
  onSurfaceDrop,
  onSurfaceDragLeave,
  onBeginDragForSymbol,
  onRequestLeftPanelTab,
  bindMeasuredNode,
}: DinRailCanvasViewportProps) {
  const railSvgStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: `${rail.width}px`,
    height: `${rail.height}px`,
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
    transformOrigin: "top left",
    pointerEvents: "none",
    zIndex: 10,
  };

  const worldTransform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
  const worldLayerBaseStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: `${rail.width}px`,
    height: `${rail.height}px`,
    transform: worldTransform,
    transformOrigin: "top left",
    pointerEvents: "none",
  };
  const hitboxLayerStyle: CSSProperties = { ...worldLayerBaseStyle, zIndex: 60 };
  const overlayLayerStyle: CSSProperties = { ...worldLayerBaseStyle, zIndex: 70 };
  const labelOverlayStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 50,
  };

  const groupFrames = buildDinRailGroupFrames(snappedSymbols, GROUP_FRAME_PADDING);

  return (
    <div
      ref={viewportRef}
      className={`din-rail-svg-container ${isDropTarget ? "is-drop-target" : ""}`}
      style={{ cursor: rail.isVisible ? "grab" : "default" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {rail.isVisible && rail.svg && (
        <div
          aria-hidden="true"
          style={railSvgStyle}
          dangerouslySetInnerHTML={{ __html: rail.svg }}
        />
      )}

      <DinRailListwyPlaceholdersLayer
        rail={rail}
        snappedSymbols={snappedSymbols}
        worldLayerBaseStyle={worldLayerBaseStyle}
        onRequestLeftPanelTab={onRequestLeftPanelTab}
      />

      {rail.isVisible && showGroups && (
        <DinRailGroupsLayer groupFrames={groupFrames} pan={pan} scale={scale} selectedIds={selectedIds} />
      )}

      <DinRailSymbolsLayer
        rail={rail}
        pan={pan}
        scale={scale}
        snappedSymbols={snappedSymbols}
        selectedIds={selectedIds}
        assetMap={assetMap}
        bindMeasuredNode={bindMeasuredNode}
      />

      {rail.isVisible && hasTerminalBlocks(snappedSymbols) && (
        <DinRailTerminalBlocksForegroundLayer
          rail={rail}
          worldTransform={worldTransform}
          symbols={snappedSymbols}
          foregroundUrls={foregroundUrls}
        />
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

      <DinRailDesignationLabelsOverlay
        rail={rail}
        pan={pan}
        scale={scale}
        snappedSymbols={snappedSymbols}
        automaticDesignationBySymbolId={automaticDesignationBySymbolId}
        labelOverlayStyle={labelOverlayStyle}
      />

      {rail.isVisible && (
        <DinRailHitboxesLayer
          rail={rail}
          snappedSymbols={snappedSymbols}
          selectedIds={selectedIds}
          interactiveRects={interactiveRects}
          automaticDesignationBySymbolId={automaticDesignationBySymbolId}
          hitboxLayerStyle={hitboxLayerStyle}
          onBeginDragForSymbol={onBeginDragForSymbol}
        />
      )}

      <div
        ref={surfaceRef}
        className="din-rail-surface"
        onDragLeave={onSurfaceDragLeave}
        onDragOver={onSurfaceDragOver}
        onDrop={onSurfaceDrop}
        onPointerDown={onSurfacePointerDown}
        style={{ position: "absolute", inset: 0, zIndex: 40 }}
      />

      {(selectedBounds || selectionRect) && (
        <DinRailSelectionOverlay
          selectedBounds={selectedBounds}
          selectionRect={selectionRect}
          overlayLayerStyle={overlayLayerStyle}
        />
      )}
    </div>
  );
}

const GROUP_FRAME_PADDING = 24;

// -- Sub-components ---------------------------------------------------------



// -- Helpers ----------------------------------------------------------------

function hasTerminalBlocks(symbols: SymbolItem[]): boolean {
  return symbols.some(
    (s) => s.deviceKind === "terminalBlock" && !isTerminalZlaczka(s.moduleRef),
  );
}
