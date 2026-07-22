// =============================================================================
// DinRailConnectionsCanvas — structural map
// =============================================================================
//
// WHY: this file owns the "wire connections" SVG render tree.
// Note: It was previously a ~2130 lines "God file" but has been split into
// multiple `canvasLayers/` and domain-specific hooks (`useConnectionsViewport`,
// `useConnectionsDrawing`, etc.). This file is now primarily the SVG DOM composition.
//
// REGIONS (line numbers shift as the file grows):
//
//   imports + props  ........... ~L1-L40    (pure data, low risk)
//   viewport state/refs ........ ~L41-L180  (zoom, pan, fit-to-rail)
//   pan/zoom callbacks ......... ~L180-L220 (zoomAround / zoomIn / zoomOut)
//   wheel + key listeners ...... ~L218-L450 (useEffect with native listeners;
//                                                ESC cancels draw, Delete
//                                                removes selected wire)
//   derived geometry memos ..... ~L450-L800 (terminal positions, wire paths,
//                                                ferrule data, foreground SVGs)
//   edit/mutate callbacks ...... ~L800-L1117 (updateWire, deleteWire,
//                                                 createConnection, etc.)
//   JSX render .................. ~L1118-end (SVG tree: rail background,
//                                                 wires layer, terminals,
//                                                 ferrule graphics, toolbar)
//
// DO NOT touch regions without knowing which subsubsystem you are in.
//   - Pan/zoom math  → changes affect the whole viewport, easy to regress
//                      fit-to-rail on first mount.
//   - Wire geometry  → changes affect routing (high-risk: touches real
//                      electrical decisions about wire length).
//   - Terminal snap  → must mirror `lib/modules/moduleTerminals.ts`; if you
//                      change one, the other must follow.
//   - Ferrule render → currently lives in `canvasLayers/FerruleGraphic`;
//                      keep heavy parsing out of the render path.
//
// High-risk: this is canvas. Per AGENTS.md, prefer the smallest safe change,
// and pair it with a test under `src/lib/connections/connectionsLogic.test.ts`
// for any geometry that can be expressed as a pure function.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import type { ConnectionItem } from "../types/connectionItem";
import { getSymbolTerminals, findTerminalByName } from "../lib/modules/moduleTerminals";
import { type SymbolItem, isDistributionBlockSymbol } from "../types/symbolItem";
import type { DinRailCanvasRail } from "./DinRailCanvas";
import { AppIcon } from "./AppIcon";
import { useElementSize } from "../hooks/useElementSize";
import { useConnectionsViewport } from "../hooks/connections/useConnectionsViewport";
import { useConnectionsDrawing } from "../hooks/connections/useConnectionsDrawing";
import { useConnectionsHotkeys } from "../hooks/connections/useConnectionsHotkeys";
import { useConnectionsGeometry } from "../hooks/connections/useConnectionsGeometry";
import { useConnectionsMutations, type DraggingHandle, type DraggingSegment } from "../hooks/connections/useConnectionsMutations";
import { useConnectionsPinch } from "../hooks/connections/useConnectionsPinch";
import { useDinRailForegroundSvgs } from "../hooks/useDinRailForegroundSvgs";
import { DinRailConnectionsForegroundLayer } from "./canvasLayers/DinRailConnectionsForegroundLayer";
import { DinRailPlaceholders } from "./canvasLayers/DinRailPlaceholders";
import { DinRailRenderedSymbols } from "./canvasLayers/DinRailRenderedSymbols";
import { DinRailVisualHotspots } from "./canvasLayers/DinRailVisualHotspots";
import { DinRailHitTargets } from "./canvasLayers/DinRailHitTargets";
import { DinRailConnectionWires } from "./canvasLayers/DinRailConnectionWires";
import { DinRailFerrulesGroup } from "./canvasLayers/DinRailFerrulesGroup";
import { DinRailDrawingPreview } from "./canvasLayers/DinRailDrawingPreview";
import { DinRailDrawingActions } from "./canvasLayers/DinRailDrawingActions";
import { SchematicZoomDock } from "./SchematicZoomDock";
import {
  checkConnectionWarning,
  findConnectedComponent,
} from "../lib/connections/canvasHelpers";
import type { DefaultWireSettings } from "../lib/connections/connectionsLogic";

export interface DinRailConnectionsCanvasProps {
  rail: DinRailCanvasRail;
  symbols: SymbolItem[];
  connections: ConnectionItem[];
  onConnectionsChange: (newConnections: ConnectionItem[], label: string, statusMsg: string) => void;
  selectedConnectionId: string | null;
  onConnectionSelect: (id: string | null) => void;
  setWorkspaceZoomPercent: (zoom: number) => void;
  currentWireSettings?: DefaultWireSettings;
  onRequestLeftPanelTab?: (tabName: string) => void;
  onSymbolSelect?: (id: string | null, options?: { toggle?: boolean }) => void;
  selectedSymbolId?: string | null;
}

export function DinRailConnectionsCanvas({
  rail,
  symbols,
  connections,
  onConnectionsChange,
  selectedConnectionId,
  onConnectionSelect,
  setWorkspaceZoomPercent,
  currentWireSettings,
  onRequestLeftPanelTab,
  onSymbolSelect,
  selectedSymbolId,
}: DinRailConnectionsCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const defaultWireSettings: DefaultWireSettings = currentWireSettings || {
    wireColor: "black",
    wireCrossSection: 2.5,
    wireType: "LgY",
    routingMode: "manhattan"
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const containerSize = useElementSize(containerRef);

  const {
    setViewport,
    zoom,
    pan,
    isPanning,
    setIsPanning,
    panStartRef,
    zoomAround,
    zoomIn,
    zoomOut,
    resetZoom,
    getLogicalPoint,
    isInitialized,
  } = useConnectionsViewport({
    rail,
    containerSize,
    svgRef,
    setWorkspaceZoomPercent,
  });

  // Connections local state for smooth interactive dragging
  const [localConnections, setLocalConnections] = useState<ConnectionItem[]>(connections);
  useEffect(() => {
    setLocalConnections(connections);
  }, [connections]);

  // Routing adjustment state (supports bidirectional dragging)
  const [draggingHandle, setDraggingHandle] = useState<DraggingHandle | null>(null);
  const [draggingSegment, setDraggingSegment] = useState<DraggingSegment | null>(null);

  // Drawing state
  const {
    explicitPoints,
    setExplicitPoints,
    drawingState,
    setDrawingState,
    currentMousePos,
    setCurrentMousePos,
    hoveredHotspot,
    setHoveredHotspot,
    hoveredSymbolId,
    setHoveredSymbolId,
    hoveredWireId,
    setHoveredWireId,
    cancelDrawing,
  } = useConnectionsDrawing();

  // Electrical Trace Path Highlighting
  const highlightedComponent = useMemo(() => {
    let startSymbolId: string | null = null;
    let startTerminal: string | null = null;
    let startIsTop: boolean | undefined = undefined;

    if (hoveredHotspot) {
      startSymbolId = hoveredHotspot.symbolId;
      startTerminal = hoveredHotspot.terminalName;
      startIsTop = hoveredHotspot.isTop;
    } else if (drawingState) {
      startSymbolId = drawingState.startSymbolId;
      startTerminal = drawingState.startTerminal;
      startIsTop = drawingState.isTop;
    } else if (hoveredWireId || selectedConnectionId) {
      const wireId = hoveredWireId || selectedConnectionId;
      const wire = connections.find((c) => c.id === wireId);
      if (wire) {
        startSymbolId = wire.fromSymbolId;
        startTerminal = wire.fromTerminal;
        startIsTop = wire.isFromTop;
      }
    }

    if (!startSymbolId || !startTerminal) {
      const emptyTerminalKeys: Set<string> = new Set();
      const emptyConnectionIds: Set<string> = new Set();
      return { terminalKeys: emptyTerminalKeys, connectionIds: emptyConnectionIds };
    }

    return findConnectedComponent(connections, startSymbolId, startTerminal, startIsTop);
  }, [hoveredHotspot, hoveredWireId, selectedConnectionId, drawingState, connections]);

  // Electrical safety check during drawing
  const drawingWarning = useMemo(() => {
    if (!drawingState || !hoveredHotspot) return null;
    const fromSymbol = symbols.find((s) => s.id === drawingState.startSymbolId);
    const toSymbol = symbols.find((s) => s.id === hoveredHotspot.symbolId);
    if (!fromSymbol || !toSymbol) return null;

    const fromHS = findTerminalByName(getSymbolTerminals(fromSymbol), drawingState.startTerminal, drawingState.isTop);
    const toHS = findTerminalByName(getSymbolTerminals(toSymbol), hoveredHotspot.terminalName, hoveredHotspot.isTop);
    if (!fromHS || !toHS) return null;

    return checkConnectionWarning(fromSymbol, fromHS, toSymbol, toHS);
  }, [drawingState, hoveredHotspot, symbols]);



  // Native wheel handler and keyboard shortcuts
  useConnectionsHotkeys({
    svgRef,
    zoomAround,
    drawingState,
    cancelDrawing,
    selectedConnectionId,
    localConnections,
    symbols,
    onConnectionsChange,
    onConnectionSelect,
  });

  // Extract inner SVG content
  const railInnerHtml = useMemo(() => {
    if (!rail.svg) return "";
    return rail.svg.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "");
  }, [rail.svg]);

  // Dynamiczny CSS: Osłona musi być nad przewodami, więc w głównym SVG szyny 
  // (które jest pod przewodami) ZAWSZE ją ukrywamy. Wyświetlimy ją w ForegroundLayer.
  const coverHiddenCss = `[id="Oslona"] { display: none !important; }`;


  const { foregroundUrls, baseModifiedUrls } = useDinRailForegroundSvgs(symbols);

  const {
    hotspotsData,
    allHotspots,
    groupedWiredPaths,
    drawingAlignment,
    previewPath,
    actualDrawingFromDir,
    actualDrawingToDir,
  } = useConnectionsGeometry({
    symbols,
    localConnections,
    drawingState,
    currentMousePos,
    explicitPoints,
    hoveredHotspot,
  });





  // WHY: 2-palce pinch-zoom dla mobile (Capacitor / touch). Hook reużywa
  // matematyki z `lib/pinchMath` (computePinchTransform) — identycznej
  // z `useDinRailPinch` dla szyny DIN i `useSchematicPinch` dla schematu.
  // pinchActiveRef jest przekazywany do `useConnectionsMutations`, który
  // pomija pointer-handlery (pan / draw / drag) w trakcie aktywnego pinch
  // — inaczej pointerdown z pojedynczego palca wszedłby w draw w środku
  // trwającego gestu dwóch palców.
  const {
    pinchActiveRef: connectionsPinchActiveRef,
    onTouchStart: onConnectionsTouchStart,
    onTouchMove: onConnectionsTouchMove,
    onTouchEnd: onConnectionsTouchEnd,
  } = useConnectionsPinch({
    svgRef,
    viewport: { zoom, pan },
    setViewport,
    resetZoom,
  });

  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleHotspotPointerDown
  } = useConnectionsMutations({
    drawingState,
    setDrawingState,
    explicitPoints,
    setExplicitPoints,
    hoveredHotspot,
    setHoveredHotspot,
    currentMousePos,
    setCurrentMousePos,
    isPanning,
    setIsPanning,
    panStartRef,
    setViewport,
    pan,
    zoom,
    onConnectionSelect,
    draggingHandle,
    setDraggingHandle,
    draggingSegment,
    setDraggingSegment,
    localConnections,
    setLocalConnections,
    symbols,
    allHotspots,
    drawingAlignment,
    onConnectionsChange,
    defaultWireSettings,
    getLogicalPoint,
    pinchActiveRef: connectionsPinchActiveRef,
  });

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "var(--bg-canvas)",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Zoom / Pan Toolbar Overlay */}
      <SchematicZoomDock
        zoomPercent={Math.round(zoom * 100)}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomFit={resetZoom}
      />

      {/* Connection Safety Warning Alert */}
      {drawingWarning && (
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            background: "#ef4444",
            color: "#ffffff",
            padding: "8px 16px",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(239, 68, 68, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: "Inter, Roboto, sans-serif",
            pointerEvents: "none",
          }}
        >
          <AppIcon name="validation" size={16} />
          <span>{drawingWarning}</span>
        </div>
      )}

      {/* WHY: HUD Anuluj/Cofnij punkt — pokazywany tylko w trakcie aktywnego
          rysowania przewodu. Na desktopie odpowiednikiem jest Escape (anuluj)
          i prawoklik (cofnij punkt); na mobile jedyną drogą jest ten HUD.
          Patrz docs/distribution-roadmap-notes/mobile-connections-review.md §4. */}
      {drawingState && (
        <DinRailDrawingActions
          explicitPointsCount={explicitPoints.length}
          onUndoPoint={() => setExplicitPoints((prev) => prev.slice(0, -1))}
          onCancelDrawing={cancelDrawing}
        />
      )}


      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height: "100%",
          touchAction: "none",
          opacity: isInitialized ? 1 : 0,
          transition: "opacity 0.15s ease-in-out",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={onConnectionsTouchStart}
        onTouchMove={onConnectionsTouchMove}
        onTouchEnd={onConnectionsTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          {/* Yellow Green striped pattern for PE connections */}
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

          {/* 3D Wire Shading & Reflection Filters */}
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

        {/* Dynamiczny CSS: ukrywa Osłonę w tle szyny gdy użytkownik zdejmie pokrywę */}
        {coverHiddenCss && (
          <style>{coverHiddenCss}</style>
        )}

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* 1. DIN Rail background */}
          <g
            className={`din-rail-svg-background ${drawingState ? 'cursor-crosshair' : ''}`}
            style={{ opacity: 0.85 }}
            dangerouslySetInnerHTML={{ __html: railInnerHtml }}
          />

          {/* DIN Rail Placeholders for Terminal Blocks */}
          <DinRailPlaceholders
            rail={rail}
            symbols={symbols}
            onRequestLeftPanelTab={onRequestLeftPanelTab}
          />

          {/* 2. Base Symbols (drawn under wires, e.g. distribution blocks base, phase indicators) */}
          <DinRailRenderedSymbols
            symbols={symbols}
            hoveredSymbolId={hoveredSymbolId}
            setHoveredSymbolId={setHoveredSymbolId}
            filterFn={(s) => isDistributionBlockSymbol(s) || s.deviceKind === "phaseIndicator" || !!foregroundUrls[s.id] || (s.moduleRef || "").toLowerCase().includes("zabezpieczajacy") || (s.moduleRef || "").toLowerCase().includes("zabezpieczenia")}
            overrideUrls={baseModifiedUrls}
            isDrawing={!!drawingState}
            zoom={zoom}
          />



          {/* 3. Render connection wires */}
          <DinRailConnectionWires
            groupedWiredPaths={groupedWiredPaths}
            selectedConnectionId={selectedConnectionId}
            onConnectionSelect={onConnectionSelect}
            setHoveredWireId={setHoveredWireId}
            highlightedComponent={highlightedComponent}
            getLogicalPoint={getLogicalPoint}
            setDraggingHandle={setDraggingHandle}
            setDraggingSegment={setDraggingSegment}
          />

          {/* 3.5 Ferrules drawn on top of wires but UNDER symbols and terminal block foreground (brass) */}
          <DinRailFerrulesGroup
            groupedWiredPaths={groupedWiredPaths}
            symbols={symbols}
            drawingState={drawingState}
            defaultWireSettings={defaultWireSettings}
            actualDrawingFromDir={actualDrawingFromDir}
            actualDrawingToDir={actualDrawingToDir}
            hoveredHotspot={hoveredHotspot}
          />

          {/* 4. Normal Symbols (drawn over wires) */}
          <DinRailRenderedSymbols
            symbols={symbols}
            hoveredSymbolId={hoveredSymbolId}
            setHoveredSymbolId={setHoveredSymbolId}
            onSymbolSelect={onSymbolSelect}
            selectedSymbolId={selectedSymbolId}
            filterFn={(s) => s.deviceKind !== "phaseIndicator" && !isDistributionBlockSymbol(s) && !foregroundUrls[s.id] && !(s.moduleRef || "").toLowerCase().includes("zabezpieczajacy") && !(s.moduleRef || "").toLowerCase().includes("zabezpieczenia")}
            isDrawing={!!drawingState}
            zoom={zoom}
          />

          {/* 4. Active drawing rubber-band preview */}
          <DinRailDrawingPreview
            previewPath={previewPath}
            drawingState={drawingState}
            drawingAlignment={drawingAlignment}
            currentMousePos={currentMousePos}
            defaultWireSettings={defaultWireSettings}
            drawingWarning={drawingWarning}
          />

          {/* 5. Foreground parts of terminal blocks (brass/mosiądz on top) */}
          <DinRailConnectionsForegroundLayer
            symbols={symbols.filter(s => s.deviceKind === "terminalBlock")}
            foregroundUrls={foregroundUrls}
            onSymbolSelect={onSymbolSelect}
            isDrawing={!!drawingState}
          />

          {/* 5.5 Visual Hotspots for all modules rendered on top of the SVG body,
               so they are not hidden behind the SVG fill of normal modules. */}
          <DinRailVisualHotspots
            hotspotsData={hotspotsData}
            hoveredHotspot={hoveredHotspot}
            drawingState={drawingState}
            highlightedComponent={highlightedComponent}
          />

          {/* 6. Invisible Hotspot Hit Targets layered on top of everything to ensure they are interactive */}
          <DinRailHitTargets
            hotspotsData={hotspotsData}
            drawingState={drawingState}
            hoveredHotspot={hoveredHotspot}
            setHoveredHotspot={setHoveredHotspot}
            handleHotspotPointerDown={handleHotspotPointerDown}
          />
        </g>
      </svg>
    </div>
  );
}
