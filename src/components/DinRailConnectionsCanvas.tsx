import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import type { ConnectionItem, WireColor, WireType, RoutingMode, FerruleColor } from "../types/connectionItem";
import { createDefaultConnection } from "../types/connectionItem";
import { type SymbolItem, isDistributionBlockSymbol } from "../types/symbolItem";
import { getSymbolTerminals, type TerminalHotspot, findTerminalByName, resolveConnectionIsFromTop, resolveConnectionIsToTop } from "../lib/modules/moduleTerminals";
import { calculateWirePath, calculateWirePoints, getOrthoExit, type Point } from "../lib/routing/wireRoutingEngine";
import type { DinRailCanvasRail } from "./DinRailCanvasPixi";
import { AppIcon } from "./AppIcon";
import { useElementSize } from "../hooks/useElementSize";
import { useDinRailProcessedSvgs } from "../hooks/useDinRailForegroundSvgs";
import { DinRailConnectionsForegroundLayer } from "./canvasLayers/DinRailConnectionsForegroundLayer";
import { FerruleGraphic } from "./canvasLayers/FerruleGraphic";
import { getFerruleLength, isTerminalZlaczka } from "../lib/connections/connectionsLogic";
import {
  checkConnectionWarning,
  findConnectedComponent,
  getSymbolAssetUrl,
} from "../lib/connections/canvasHelpers";
import {
  WIRE_COLORS_MAP,
  WIRE_THICKNESS_MAP,
} from "../lib/dinRailCanvas/constants";

interface DinRailConnectionsCanvasProps {
  rail: DinRailCanvasRail;
  symbols: SymbolItem[];
  connections: ConnectionItem[];
  onConnectionsChange: (newConnections: ConnectionItem[], label: string, statusMsg: string) => void;
  selectedConnectionId: string | null;
  onConnectionSelect: (id: string | null) => void;
  setWorkspaceZoomPercent: (zoom: number) => void;
  defaultWireSettings: {
    wireColor: WireColor;
    wireCrossSection: number;
    wireType: WireType; ferruleColor?: FerruleColor;
    routingMode: RoutingMode;
  };
  onRequestLeftPanelTab?: (tabName: string) => void;
}

export function DinRailConnectionsCanvas({
  rail,
  symbols,
  connections,
  onConnectionsChange,
  selectedConnectionId,
  onConnectionSelect,
  setWorkspaceZoomPercent,
  defaultWireSettings,
  onRequestLeftPanelTab,
}: DinRailConnectionsCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerSize = useElementSize(containerRef);

  // Viewport navigation state
  const [viewport, setViewport] = useState({ zoom: 0.3, pan: { x: 100, y: 100 } });
  const { zoom, pan } = viewport;
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Connections local state for smooth interactive dragging
  const [localConnections, setLocalConnections] = useState<ConnectionItem[]>(connections);
  useEffect(() => {
    setLocalConnections(connections);
  }, [connections]);

  // Routing adjustment state (supports bidirectional dragging)
  const [draggingHandle, setDraggingHandle] = useState<{
    connectionId: string;
    type: "Y" | "X" | "Y1" | "Y2";
    defaultChannelY?: number;
    exitY?: number;
    enterY?: number;
    baseX?: number;
    minBound?: number;
    maxBound?: number;
  } | null>(null);

  const [draggingSegment, setDraggingSegment] = useState<{
    connectionId: string;
    basePoints: Point[];
    indexA: number;
    indexB: number;
    isHorizontal: boolean;
    startX: number;
    startY: number;
    minBound?: number;
    maxBound?: number;
  } | null>(null);

  // Drawing state - prosty system drag-and-drop ortogonalny i Rysowanie Ręczne
  const [explicitPoints, setExplicitPoints] = useState<Point[]>([]);
  const [drawingState, setDrawingState] = useState<{
    startSymbolId: string;
    startTerminal: string;
    startX: number;
    startY: number;
    isTop: boolean;
    type: "phase" | "neutral" | "pe"; direction?: "top" | "bottom" | "left" | "right" | "auto-horizontal" | "auto-vertical";
  } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<Point | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<{
    symbolId: string;
    terminalName: string;
    absX: number;
    absY: number;
    isTop: boolean;
    type: "phase" | "neutral" | "pe"; direction?: "top" | "bottom" | "left" | "right" | "auto-horizontal" | "auto-vertical";
  } | null>(null);

  const [hoveredSymbolId, setHoveredSymbolId] = useState<string | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);

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

  // Sync zoom status bar
  useEffect(() => {
    setWorkspaceZoomPercent(Math.round(zoom * 100));
  }, [zoom, setWorkspaceZoomPercent]);

  // Center/Fit rail initially
  const hasInitializedFit = useRef(false);
  useEffect(() => {
    if (hasInitializedFit.current || !rail.width || !rail.height) return;
    if (containerSize.width > 0 && containerSize.height > 0) {
      const scaleX = (containerSize.width - 80) / rail.width;
      const scaleY = (containerSize.height - 80) / rail.height;
      const initialScale = Math.min(scaleX, scaleY, 0.45);
      
      const initialPanX = (containerSize.width - rail.width * initialScale) / 2;
      const initialPanY = (containerSize.height - rail.height * initialScale) / 2;
      
      setViewport({ zoom: initialScale, pan: { x: initialPanX, y: initialPanY } });
      hasInitializedFit.current = true;
    }
  }, [rail.width, rail.height, containerSize.width, containerSize.height]);

  const zoomAround = useCallback((clientX: number, clientY: number, factor: number) => {
    setViewport((prev) => {
      const nextZoom = Math.min(Math.max(prev.zoom * factor, 0.05), 4.0);
      const svg = svgRef.current;
      if (!svg) return prev;
      const rect = svg.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      const nextPanX = mouseX - (mouseX - prev.pan.x) * (nextZoom / prev.zoom);
      const nextPanY = mouseY - (mouseY - prev.pan.y) * (nextZoom / prev.zoom);
      return {
        zoom: nextZoom,
        pan: { x: nextPanX, y: nextPanY },
      };
    });
  }, []);

  const zoomIn = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    zoomAround(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.2);
  }, [zoomAround]);

  const zoomOut = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    zoomAround(rect.left + rect.width / 2, rect.top + rect.height / 2, 1 / 1.2);
  }, [zoomAround]);

  // Native wheel handler for zoom centering
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = 1.08;
      const zoomFactor = e.deltaY < 0 ? scaleFactor : 1 / scaleFactor;
      zoomAround(e.clientX, e.clientY, zoomFactor);
    };

    svg.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => {
      svg.removeEventListener("wheel", handleWheelNative);
    };
  }, [zoomAround]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Anuluj rysowanie
      if (e.code === "Escape" && drawingState) {
        setDrawingState(null);
        setCurrentMousePos(null);
        setHoveredHotspot(null);
        return;
      }
      // Toggle selected connection's direction with Space
      if (e.code === "Space" && selectedConnectionId && !drawingState) {
        e.preventDefault();
        const conn = localConnections.find((c) => c.id === selectedConnectionId);
        if (conn) {
          const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);
          let fallbackIsToTop = true;
          if (toSymbol) {
            const hs = findTerminalByName(getSymbolTerminals(toSymbol), conn.toTerminal, conn.isToTop);
            if (hs) fallbackIsToTop = hs.isTop;
          }
          const currentIsToTop = conn.isToTop ?? fallbackIsToTop;
          const updated = localConnections.map((c) => {
            if (c.id === selectedConnectionId) {
              return { ...c, isToTop: !currentIsToTop };
            }
            return c;
          });
          onConnectionsChange(updated, "Zmień kierunek podłączenia", "Zmieniono kierunek wejścia przewodu");
        }
        return;
      }
      // Delete selected connection
      if ((e.key === "Delete" || e.key === "Backspace") && selectedConnectionId) {
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA" ||
          document.activeElement?.hasAttribute("contenteditable")
        ) {
          return;
        }
        const updatedConnections = localConnections.filter((c) => c.id !== selectedConnectionId);
        onConnectionSelect(null);
        onConnectionsChange(updatedConnections, "Usuń połączenie", "Usunięto połączenie przewodem");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedConnectionId, localConnections, onConnectionsChange, onConnectionSelect, drawingState, symbols]);

  // Extract inner SVG content
  const railInnerHtml = useMemo(() => {
    if (!rail.svg) return "";
    return rail.svg.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "");
  }, [rail.svg]);

  // Dynamiczny CSS ukrywający grupę Osłona w tle szyny
  // gdy użytkownik zdejmie osłonę przez przełącznik w prawym panelu.
  // rail.svg jest statyczny (generowany raz), więc nie odzwierciedla zmian parametrów –
  // dlatego nadpisujemy widoczność przez <style> wstrzyknięty do SVG.
  const coverHiddenCss = useMemo(() => {
    const hiddenIds = symbols
      .filter(
        (s) =>
          s.deviceKind === "terminalBlock" &&
          (s.parameters?.BLUE_COVER_VISIBILITY === "hidden" ||
            s.parameters?.BLUE_COVER_VISIBILITY === "none")
      )
      .map((s) => s.id);

    if (hiddenIds.length === 0) return "";

    // Ukryj element o id="Osłona" w całym SVG canvasa.
    // Jeśli na szynie jest wiele bloków z różnymi stanami, każdy ma własny
    // placeholder zastąpiony przez rail generator – ale w tej wersji targetujemy
    // po id grupy, które jest stałe ("Osłona").
    return `[id="Osłona"] { display: none !important; }`;
  }, [symbols]);


  const { foregroundUrls, baseUrls } = useDinRailProcessedSvgs(symbols);

  // Pre-calculate hotspots for symbols
  const hotspotsData = useMemo(() => {
    return symbols.map((symbol) => {
      const hotspots = getSymbolTerminals(symbol);
      return {
        symbolId: symbol.id,
        moduleRef: symbol.moduleRef,
        symbol: symbol,
        hotspots: hotspots.map((hs) => ({
          ...hs,
          absX: symbol.x + hs.x,
          absY: symbol.y + hs.y,
        })),
      };
    });
  }, [symbols]);

  // Flatten hotspots for snapping
  const allHotspots = useMemo(() => {
    return hotspotsData.flatMap((d) =>
      d.hotspots.map((h) => ({
        ...h,
        symbolId: d.symbolId,
      }))
    );
  }, [hotspotsData]);

  // Helper to map screen to logical coordinates
  const getLogicalPoint = useCallback((clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom,
    };
  }, [pan, zoom]);


  // Pan / Canvas Mouse Events
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // PPM (Right Mouse Button) cofa punkt lub anuluje rysowanie
    if (e.button === 2 && drawingState) {
      e.preventDefault();
      if (explicitPoints.length > 0) {
        setExplicitPoints((prev) => prev.slice(0, -1));
      } else {
        setDrawingState(null);
        setCurrentMousePos(null);
        setHoveredHotspot(null);
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      return;
    }

    // Podczas rysowania, kliknięcie LKM w puste miejsce dodaje punkt załamania
    if (drawingState && e.button === 0) {
      if (hoveredHotspot) return; // Kliknięcie w terminal kończy w handlePointerUp

      const logicalPos = getLogicalPoint(e.clientX, e.clientY);
      
      const clampedPos = { ...logicalPos };
      const fromSymbol = symbols.find((s) => s.id === drawingState.startSymbolId);
      const fromHS = fromSymbol ? findTerminalByName(getSymbolTerminals(fromSymbol), drawingState.startTerminal, drawingState.isTop) : null;
      const fromDirection = fromHS?.direction || (drawingState.isTop ? "top" : "bottom");

      if (explicitPoints.length === 0) {
        if (fromDirection === "bottom") {
          if (fromSymbol) {
            if (clampedPos.y < fromSymbol.y) {
              clampedPos.y = fromSymbol.y;
            }
            if (clampedPos.y < fromSymbol.y + fromSymbol.height) {
              if (clampedPos.x < fromSymbol.x) {
                clampedPos.x = fromSymbol.x;
              } else if (clampedPos.x > fromSymbol.x + fromSymbol.width) {
                clampedPos.x = fromSymbol.x + fromSymbol.width;
              }
            }
          } else {
            if (clampedPos.y < drawingState.startY) {
              clampedPos.y = drawingState.startY;
            }
          }
        } else if (fromDirection === "top") {
          if (fromSymbol) {
            if (clampedPos.y > fromSymbol.y + fromSymbol.height) {
              clampedPos.y = fromSymbol.y + fromSymbol.height;
            }
            if (clampedPos.y > fromSymbol.y) {
              if (clampedPos.x < fromSymbol.x) {
                clampedPos.x = fromSymbol.x;
              } else if (clampedPos.x > fromSymbol.x + fromSymbol.width) {
                clampedPos.x = fromSymbol.x + fromSymbol.width;
              }
            }
          } else {
            if (clampedPos.y > drawingState.startY) {
              clampedPos.y = drawingState.startY;
            }
          }
        } else if (fromDirection === "left") {
          if (fromSymbol) {
            if (clampedPos.x > fromSymbol.x + fromSymbol.width) {
              clampedPos.x = fromSymbol.x + fromSymbol.width;
            }
            if (clampedPos.x > fromSymbol.x) {
              if (clampedPos.y < fromSymbol.y) {
                clampedPos.y = fromSymbol.y;
              } else if (clampedPos.y > fromSymbol.y + fromSymbol.height) {
                clampedPos.y = fromSymbol.y + fromSymbol.height;
              }
            }
          } else {
            if (clampedPos.x > drawingState.startX) {
              clampedPos.x = drawingState.startX;
            }
          }
        } else if (fromDirection === "right") {
          if (fromSymbol) {
            if (clampedPos.x < fromSymbol.x) {
              clampedPos.x = fromSymbol.x;
            }
            if (clampedPos.x < fromSymbol.x + fromSymbol.width) {
              if (clampedPos.y < fromSymbol.y) {
                clampedPos.y = fromSymbol.y;
              } else if (clampedPos.y > fromSymbol.y + fromSymbol.height) {
                clampedPos.y = fromSymbol.y + fromSymbol.height;
              }
            }
          } else {
            if (clampedPos.x < drawingState.startX) {
              clampedPos.x = drawingState.startX;
            }
          }
        }
      }

      const targetPt = drawingAlignment.snappedPt || clampedPos;
      const fromPt = { x: drawingState.startX, y: drawingState.startY };
      const firstTarget = explicitPoints.length > 0 ? explicitPoints[0] : targetPt;
      const startExit = getOrthoExit(fromPt, firstTarget);
      const lastP = explicitPoints.length > 0 ? explicitPoints[explicitPoints.length - 1] : startExit;

      let finalX = targetPt.x;
      let finalY = targetPt.y;

      if (Math.abs(targetPt.x - lastP.x) > Math.abs(targetPt.y - lastP.y)) {
          finalY = lastP.y; 
      } else {
          finalX = lastP.x; 
      }

      if (finalX !== lastP.x || finalY !== lastP.y) {
          setExplicitPoints([...explicitPoints, { x: finalX, y: finalY }]);
      }
      return;
    }

    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.currentTarget === e.target)) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      onConnectionSelect(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const logicalPos = getLogicalPoint(e.clientX, e.clientY);

    if (isPanning) {
      setViewport((prev) => ({
        ...prev,
        pan: {
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        },
      }));
      return;
    }

    if (draggingHandle) {
      setLocalConnections((prev) =>
        prev.map((c) => {
          if (c.id !== draggingHandle.connectionId) return c;

          let targetY = logicalPos.y;
          let targetX = logicalPos.x;
          if (draggingHandle.type.startsWith("Y")) {
             if (draggingHandle.minBound !== undefined) targetY = Math.max(targetY, draggingHandle.minBound);
             if (draggingHandle.maxBound !== undefined) targetY = Math.min(targetY, draggingHandle.maxBound);
          } else {
             if (draggingHandle.minBound !== undefined) targetX = Math.max(targetX, draggingHandle.minBound);
             if (draggingHandle.maxBound !== undefined) targetX = Math.min(targetX, draggingHandle.maxBound);
          }

          if (draggingHandle.type === "Y") {
            const newOffset = targetY - draggingHandle.defaultChannelY!;
            return { ...c, customOffset: newOffset };
          } else if (draggingHandle.type === "X") {
            const newOffsetX = targetX - draggingHandle.baseX!;
            return { ...c, customOffsetX: newOffsetX };
          } else if (draggingHandle.type === "Y1") {
            const newOffsetY1 = targetY - draggingHandle.exitY!;
            return { ...c, customOffsetY1: newOffsetY1 };
          } else if (draggingHandle.type === "Y2") {
            const newOffsetY2 = targetY - draggingHandle.enterY!;
            return { ...c, customOffsetY2: newOffsetY2 };
          }
          return c;
        })
      );
      return;
    }

    if (draggingSegment) {
      let targetX = logicalPos.x;
      let targetY = logicalPos.y;

      if (draggingSegment.isHorizontal) {
         if (draggingSegment.minBound !== undefined) targetY = Math.max(targetY, draggingSegment.minBound);
         if (draggingSegment.maxBound !== undefined) targetY = Math.min(targetY, draggingSegment.maxBound);
      } else {
         if (draggingSegment.minBound !== undefined) targetX = Math.max(targetX, draggingSegment.minBound);
         if (draggingSegment.maxBound !== undefined) targetX = Math.min(targetX, draggingSegment.maxBound);
      }

      const dx = targetX - draggingSegment.startX;
      const dy = targetY - draggingSegment.startY;

      setLocalConnections((prev) =>
        prev.map((c) => {
          if (c.id !== draggingSegment.connectionId) return c;

          const newPoints = [...draggingSegment.basePoints];
          
          if (draggingSegment.isHorizontal) {
            // Dragging Y
            if (newPoints[draggingSegment.indexA]) newPoints[draggingSegment.indexA] = { ...newPoints[draggingSegment.indexA], y: newPoints[draggingSegment.indexA].y + dy };
            if (newPoints[draggingSegment.indexB]) newPoints[draggingSegment.indexB] = { ...newPoints[draggingSegment.indexB], y: newPoints[draggingSegment.indexB].y + dy };
          } else {
            // Dragging X
            if (newPoints[draggingSegment.indexA]) newPoints[draggingSegment.indexA] = { ...newPoints[draggingSegment.indexA], x: newPoints[draggingSegment.indexA].x + dx };
            if (newPoints[draggingSegment.indexB]) newPoints[draggingSegment.indexB] = { ...newPoints[draggingSegment.indexB], x: newPoints[draggingSegment.indexB].x + dx };
          }

          return { ...c, points: newPoints };
        })
      );
      return;
    }

    if (drawingState) {
      const fromSymbol = symbols.find((s) => s.id === drawingState.startSymbolId);
      const fromHS = fromSymbol ? findTerminalByName(getSymbolTerminals(fromSymbol), drawingState.startTerminal, drawingState.isTop) : null;
      const fromDirection = fromHS?.direction || (drawingState.isTop ? "top" : "bottom");

      const clampedPos = { ...logicalPos };

      if (explicitPoints.length === 0) {
        if (fromDirection === "bottom") {
          if (fromSymbol) {
            if (clampedPos.y < fromSymbol.y) {
              clampedPos.y = fromSymbol.y;
            }
            if (clampedPos.y < fromSymbol.y + fromSymbol.height) {
              if (clampedPos.x < fromSymbol.x) {
                clampedPos.x = fromSymbol.x;
              } else if (clampedPos.x > fromSymbol.x + fromSymbol.width) {
                clampedPos.x = fromSymbol.x + fromSymbol.width;
              }
            }
          } else {
            if (clampedPos.y < drawingState.startY) {
              clampedPos.y = drawingState.startY;
            }
          }
        } else if (fromDirection === "top") {
          if (fromSymbol) {
            if (clampedPos.y > fromSymbol.y + fromSymbol.height) {
              clampedPos.y = fromSymbol.y + fromSymbol.height;
            }
            if (clampedPos.y > fromSymbol.y) {
              if (clampedPos.x < fromSymbol.x) {
                clampedPos.x = fromSymbol.x;
              } else if (clampedPos.x > fromSymbol.x + fromSymbol.width) {
                clampedPos.x = fromSymbol.x + fromSymbol.width;
              }
            }
          } else {
            if (clampedPos.y > drawingState.startY) {
              clampedPos.y = drawingState.startY;
            }
          }
        } else if (fromDirection === "left") {
          if (fromSymbol) {
            if (clampedPos.x > fromSymbol.x + fromSymbol.width) {
              clampedPos.x = fromSymbol.x + fromSymbol.width;
            }
            if (clampedPos.x > fromSymbol.x) {
              if (clampedPos.y < fromSymbol.y) {
                clampedPos.y = fromSymbol.y;
              } else if (clampedPos.y > fromSymbol.y + fromSymbol.height) {
                clampedPos.y = fromSymbol.y + fromSymbol.height;
              }
            }
          } else {
            if (clampedPos.x > drawingState.startX) {
              clampedPos.x = drawingState.startX;
            }
          }
        } else if (fromDirection === "right") {
          if (fromSymbol) {
            if (clampedPos.x < fromSymbol.x) {
              clampedPos.x = fromSymbol.x;
            }
            if (clampedPos.x < fromSymbol.x + fromSymbol.width) {
              if (clampedPos.y < fromSymbol.y) {
                clampedPos.y = fromSymbol.y;
              } else if (clampedPos.y > fromSymbol.y + fromSymbol.height) {
                clampedPos.y = fromSymbol.y + fromSymbol.height;
              }
            }
          } else {
            if (clampedPos.x < drawingState.startX) {
              clampedPos.x = drawingState.startX;
            }
          }
        }
      }

      setCurrentMousePos(clampedPos);

      // Find nearest hotspot to snap (using clamped position)
      let nearest = null;
      let minDist = 36; // Snapping radius in logical pixels

      for (const hs of allHotspots) {
        if (hs.symbolId === drawingState.startSymbolId && hs.name === drawingState.startTerminal) {
          continue; // Don't snap to source terminal
        }
        const dx = hs.absX - clampedPos.x;
        const dy = hs.absY - clampedPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = hs;
        }
      }

      if (nearest) {
        setCurrentMousePos({ x: nearest.absX, y: nearest.absY });
        setHoveredHotspot({
          symbolId: nearest.symbolId,
          terminalName: nearest.name,
          absX: nearest.absX,
          absY: nearest.absY,
          isTop: nearest.isTop,
          type: nearest.type,
          direction: nearest.direction,
        });
      } else {
        setHoveredHotspot(null);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning) {
      setIsPanning(false);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_err) {
        // Pointer może być już zwolniony (np. po touchend) — bezpiecznie zignorować.
      }
      return;
    }

    if (draggingHandle || draggingSegment) {
      const finalState = localConnections;
      onConnectionsChange(finalState, "Przesuń trasę", "Przesunięto trasę przewodu");
      setDraggingHandle(null);
      setDraggingSegment(null);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_err) {
        // Pointer może być już zwolniony — bezpiecznie zignorować.
      }
      return;
    }

    // Zakończ rysowanie gdy kliknięto w terminal docelowy
    if (drawingState && hoveredHotspot) {
      if (drawingState.startSymbolId === hoveredHotspot.symbolId && drawingState.startTerminal === hoveredHotspot.terminalName) {
        // Kliknięcie i puszczenie na tym samym zacisku (początkowym) -> kontynuujemy rysowanie
        return;
      }

      // Smart Color Defaults
      let wireColor = defaultWireSettings.wireColor;
      if (hoveredHotspot.type === "neutral" || drawingState.type === "neutral") {
        wireColor = "blue";
      } else if (hoveredHotspot.type === "pe" || drawingState.type === "pe") {
        wireColor = "green-yellow";
      }

      // Determine entry direction based on terminal's declared direction or cursor position
      const cursorY = currentMousePos?.y ?? hoveredHotspot.absY;
      const finalIsToTop = hoveredHotspot.isTop ?? (cursorY < hoveredHotspot.absY);

      const finalPoints = explicitPoints.length > 0 ? [...explicitPoints] : undefined;

      const newWire = createDefaultConnection({
        fromSymbolId: drawingState.startSymbolId,
        fromTerminal: drawingState.startTerminal,
        toSymbolId: hoveredHotspot.symbolId,
        toTerminal: hoveredHotspot.terminalName,
        wireColor,
        wireCrossSection: defaultWireSettings.wireCrossSection,
        wireType: defaultWireSettings.wireType,
        routingMode: defaultWireSettings.routingMode,
        ferruleColor: defaultWireSettings.ferruleColor,
        isFromTop: drawingState.isTop,
        fromDirection: drawingState.direction,
        isToTop: finalIsToTop,
        toDirection: hoveredHotspot?.direction,
        points: finalPoints,
      });

      // Prevent duplicate wires
      const isDuplicate = localConnections.some(
        (c) =>
          (c.fromSymbolId === newWire.fromSymbolId &&
            c.fromTerminal === newWire.fromTerminal &&
            c.toSymbolId === newWire.toSymbolId &&
            c.toTerminal === newWire.toTerminal) ||
          (c.fromSymbolId === newWire.toSymbolId &&
            c.fromTerminal === newWire.toTerminal &&
            c.toSymbolId === newWire.fromSymbolId &&
            c.toTerminal === newWire.fromTerminal)
      );

      if (!isDuplicate) {
        const updated = [...localConnections, newWire];
        onConnectionsChange(updated, "Dodaj połączenie", "Dodano połączenie przewodem");
        onConnectionSelect(newWire.id);
      }

      setDrawingState(null);
      setCurrentMousePos(null);
      setHoveredHotspot(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleHotspotPointerDown = (
    e: React.PointerEvent<SVGCircleElement>,
    hs: TerminalHotspot & { symbolId: string; absX: number; absY: number }
  ) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Jeśli już rysujemy, kliknięcie w terminal kończy rysowanie
    if (drawingState) {
      // To zostanie obsłużone w handlePointerUp przez hoveredHotspot
      return;
    }
    
    // Rozpocznij rysowanie i capture pointer
    setDrawingState({
      startSymbolId: hs.symbolId,
      startTerminal: hs.name,
      startX: hs.absX,
      startY: hs.absY,
      isTop: hs.isTop,
      type: hs.type,
      direction: hs.direction,
    });
    setExplicitPoints([]);
    const logicalPoint = getLogicalPoint(e.clientX, e.clientY);
    setCurrentMousePos(logicalPoint);
    e.currentTarget.setPointerCapture(e.pointerId);
  };


  // Group parallel lines to offsets
  const groupedWiredPaths = useMemo(() => {
    const keyCounts: Record<string, number> = {};
    const keyIndices: Record<string, number> = {};
    
    // First pass: resolve terminals to correctly count wires per physical terminal (including isTop)
    const resolvedConnections = localConnections.map((conn) => {
      const fromSymbol = symbols.find((s) => s.id === conn.fromSymbolId);
      const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);
      
      if (!fromSymbol || !toSymbol) return null;

      const fromHS = findTerminalByName(getSymbolTerminals(fromSymbol), conn.fromTerminal, conn.isFromTop);
      const toHS = findTerminalByName(getSymbolTerminals(toSymbol), conn.toTerminal, conn.isToTop);

      if (!fromHS || !toHS) return null;

      return { conn, fromSymbol, toSymbol, fromHS, toHS };
    }).filter(Boolean);

    // Count how many wires connect to each specific terminal
    const terminalWireCounts: Record<string, number> = {};
    const terminalWireIndices: Record<string, number> = {};

    resolvedConnections.forEach((res) => {
      if (!res) return;
      const fromKey = `${res.conn.fromSymbolId}:${res.conn.fromTerminal}:${res.fromHS.isTop ? 'T' : 'B'}`;
      const toKey = `${res.conn.toSymbolId}:${res.conn.toTerminal}:${res.toHS.isTop ? 'T' : 'B'}`;
      terminalWireCounts[fromKey] = (terminalWireCounts[fromKey] || 0) + 1;
      terminalWireCounts[toKey] = (terminalWireCounts[toKey] || 0) + 1;
    });

    return resolvedConnections.map((res) => {
      if (!res) return null;
      const { conn, fromSymbol, toSymbol, fromHS, toHS } = res;

      const fromTerminalKey = `${conn.fromSymbolId}:${conn.fromTerminal}:${fromHS.isTop ? 'T' : 'B'}`;
      const toTerminalKey = `${conn.toSymbolId}:${conn.toTerminal}:${toHS.isTop ? 'T' : 'B'}`;
      
      const fromCount = terminalWireCounts[fromTerminalKey];
      const toCount = terminalWireCounts[toTerminalKey];
      
      const fromIndex = terminalWireIndices[fromTerminalKey] || 0;
      terminalWireIndices[fromTerminalKey] = fromIndex + 1;
      
      const toIndex = terminalWireIndices[toTerminalKey] || 0;
      terminalWireIndices[toTerminalKey] = toIndex + 1;

      let fromShiftX = 0, fromShiftY = 0;
      let toShiftX = 0, toShiftY = 0;
      
      const wireThickness = WIRE_THICKNESS_MAP[conn.wireCrossSection] || 4.5;
      const shiftAmount = wireThickness + 2; // Offset dla przewodów w tym samym zacisku

      if (fromCount > 1) {
        const startDir = conn.fromDirection || (fromHS.isTop ? "top" : "bottom");
        const offset = (fromIndex - (fromCount - 1) / 2) * shiftAmount;
        if (startDir === "top" || startDir === "bottom") {
          fromShiftX = offset;
        } else {
          fromShiftY = offset;
        }
      }

      if (toCount > 1) {
        const endDir = conn.toDirection || (toHS.isTop ? "top" : "bottom");
        const offset = (toIndex - (toCount - 1) / 2) * shiftAmount;
        if (endDir === "top" || endDir === "bottom") {
          toShiftX = offset;
        } else {
          toShiftY = offset;
        }
      }

      const fromTerminalPt = { x: fromSymbol.x + fromHS.x, y: fromSymbol.y + fromHS.y };
      const toTerminalPt = { x: toSymbol.x + toHS.x, y: toSymbol.y + toHS.y };

      const fromPt = { x: fromTerminalPt.x + fromShiftX, y: fromTerminalPt.y + fromShiftY };
      const toPt = { x: toTerminalPt.x + toShiftX, y: toTerminalPt.y + toShiftY };

      // Compute sorting key for parallel offsets
      const key = [conn.fromSymbolId, conn.toSymbolId].sort().join(":");
      const totalCount = keyCounts[key] || 0;
      keyCounts[key] = totalCount + 1;

      return {
        connection: conn,
        fromPt,
        toPt,
        fromTerminalPt,
        toTerminalPt,
        fromWireCount: fromCount,
        toWireCount: toCount,
        fromHS,
        toHS,
        fromSymbol,
        toSymbol,
        fromDeviceKind: fromSymbol.deviceKind,
        fromModuleRef: fromSymbol.moduleRef,
        toDeviceKind: toSymbol.deviceKind,
        toModuleRef: toSymbol.moduleRef,
        key,
      };
    }).filter(Boolean).map((d) => {
      if (!d) return null;
      const index = keyIndices[d.key] || 0;
      keyIndices[d.key] = index + 1;

      const hasFerrule = d.connection.ferruleColor && d.connection.ferruleColor !== "none";
      const customRadius = d.connection.customRadius ?? 0;
      
      const fromFerruleLen = getFerruleLength(d.fromDeviceKind, d.fromModuleRef);
      const toFerruleLen = getFerruleLength(d.toDeviceKind, d.toModuleRef);

      const fromExitOffsetVal = hasFerrule ? Math.max(d.fromHS.exitOffset ?? 40, fromFerruleLen) + customRadius : (d.fromHS.exitOffset ?? 40) + customRadius;
      const toExitOffsetVal = hasFerrule ? Math.max(d.toHS.exitOffset ?? 40, toFerruleLen) + customRadius : (d.toHS.exitOffset ?? 40) + customRadius;

      const routingOpts = {
        isFromTop: resolveConnectionIsFromTop(d.fromSymbol, d.connection.isFromTop, d.fromHS),
        isToTop: resolveConnectionIsToTop(d.toSymbol, d.connection.isToTop, d.toHS),
        points: d.connection.points,
        customOffset: d.connection.customOffset,
        customOffsetX: d.connection.customOffsetX,
        customOffsetY1: d.connection.customOffsetY1,
        customOffsetY2: d.connection.customOffsetY2,
        customRadius,
        fromDirection: d.fromHS.direction,
        toDirection: d.toHS.direction,
        fromVisualInset: (isDistributionBlockSymbol(d.fromSymbol) || (d.fromHS.visualInset !== undefined && d.fromHS.visualInset > 180)) ? 0 : d.fromHS.visualInset,
        toVisualInset: (isDistributionBlockSymbol(d.toSymbol) || (d.toHS.visualInset !== undefined && d.toHS.visualInset > 180)) ? 0 : d.toHS.visualInset,
        fromExitOffset: fromExitOffsetVal,
        toExitOffset: toExitOffsetVal,
      };

      const pointsArr = calculateWirePoints(d.fromPt, d.toPt, routingOpts);
      const path = calculateWirePath(d.fromPt, d.toPt, routingOpts);

      let actualFromDir = d.connection.fromDirection || d.fromHS.direction || (d.fromHS.isTop ? "top" : "bottom");
      if (pointsArr && pointsArr.length >= 2) {
        let p1 = pointsArr[1];
        for (let i = 1; i < pointsArr.length; i++) {
          if (Math.abs(pointsArr[i].x - pointsArr[0].x) > 1 || Math.abs(pointsArr[i].y - pointsArr[0].y) > 1) {
            p1 = pointsArr[i];
            break;
          }
        }
        const dx = p1.x - pointsArr[0].x;
        const dy = p1.y - pointsArr[0].y;
        if (Math.abs(dx) > Math.abs(dy)) {
          actualFromDir = dx > 0 ? "right" : "left";
        } else if (Math.abs(dy) > 0) {
          actualFromDir = dy > 0 ? "bottom" : "top";
        }
      }

      let actualToDir = d.connection.toDirection || d.toHS.direction || (d.toHS.isTop ? "top" : "bottom");
      if (pointsArr && pointsArr.length >= 2) {
        let p1 = pointsArr[pointsArr.length - 2];
        const pEnd = pointsArr[pointsArr.length - 1];
        for (let i = pointsArr.length - 2; i >= 0; i--) {
          if (Math.abs(pointsArr[i].x - pEnd.x) > 1 || Math.abs(pointsArr[i].y - pEnd.y) > 1) {
            p1 = pointsArr[i];
            break;
          }
        }
        const vX = p1.x - pEnd.x;
        const vY = p1.y - pEnd.y;
        if (Math.abs(vX) > Math.abs(vY)) {
          actualToDir = vX > 0 ? "right" : "left";
        } else if (Math.abs(vY) > 0) {
          actualToDir = vY > 0 ? "bottom" : "top";
        }
      }

      return {
        ...d,
        pointsArr,
        pathData: path,
        actualFromDir,
        actualToDir,
        parallelIndex: index,
        parallelCount: keyCounts[d.key],
        fromExitOffset: fromExitOffsetVal,
        toExitOffset: toExitOffsetVal,
      };
    });
  }, [localConnections, symbols]);

  // Alignment guides and snapping calculation during drawing
  const drawingAlignment = useMemo(() => {
    if (!drawingState || !currentMousePos || hoveredHotspot) {
      return { snappedPt: null, guides: [] as Array<{ x1: number; y1: number; x2: number; y2: number; hs: any }> };
    }

    const pts = [{ x: drawingState.startX, y: drawingState.startY }, ...explicitPoints];
    const lastP = pts[pts.length - 1];

    const isHorizontal = Math.abs(currentMousePos.x - lastP.x) > Math.abs(currentMousePos.y - lastP.y);
    const SNAP_TOLERANCE = 18;
    
    const snappedPt = { x: currentMousePos.x, y: currentMousePos.y };
    const guides: Array<{ x1: number; y1: number; x2: number; y2: number; hs: any }> = [];

    if (isHorizontal) {
      snappedPt.y = lastP.y;
      // Find a hotspot aligned vertically (same X)
      let bestHs = null;
      let minDiff = SNAP_TOLERANCE;
      for (const hs of allHotspots) {
        if (hs.symbolId === drawingState.startSymbolId && hs.name === drawingState.startTerminal) continue;
        const diff = Math.abs(currentMousePos.x - hs.absX);
        if (diff < minDiff) {
          minDiff = diff;
          bestHs = hs;
        }
      }
      if (bestHs) {
        snappedPt.x = bestHs.absX;
        guides.push({
          x1: bestHs.absX,
          y1: lastP.y,
          x2: bestHs.absX,
          y2: bestHs.absY,
          hs: bestHs,
        });
      }
    } else {
      snappedPt.x = lastP.x;
      // Find a hotspot aligned horizontally (same Y)
      let bestHs = null;
      let minDiff = SNAP_TOLERANCE;
      for (const hs of allHotspots) {
        if (hs.symbolId === drawingState.startSymbolId && hs.name === drawingState.startTerminal) continue;
        const diff = Math.abs(currentMousePos.y - hs.absY);
        if (diff < minDiff) {
          minDiff = diff;
          bestHs = hs;
        }
      }
      if (bestHs) {
        snappedPt.y = bestHs.absY;
        guides.push({
          x1: lastP.x,
          y1: bestHs.absY,
          x2: bestHs.absX,
          y2: bestHs.absY,
          hs: bestHs,
        });
      }
    }

    return { snappedPt, guides };
  }, [drawingState, currentMousePos, hoveredHotspot, explicitPoints, allHotspots]);

  // Compute preview path during drawing
  const previewPath = useMemo(() => {
    if (!drawingState || !currentMousePos) return null;
    const fromPt = { x: drawingState.startX, y: drawingState.startY };

    const fromSymbol = symbols.find((s) => s.id === drawingState.startSymbolId);
    const fromHS = fromSymbol ? findTerminalByName(getSymbolTerminals(fromSymbol), drawingState.startTerminal, drawingState.isTop) : null;
    const fromIsDist = fromSymbol ? (isDistributionBlockSymbol(fromSymbol) || (fromHS?.visualInset !== undefined && fromHS.visualInset > 180)) : false;
    const fromVisualInset = fromHS ? (fromIsDist ? 0 : fromHS.visualInset) : 10;
    const fromDirection = fromHS?.direction || (drawingState.isTop ? "top" : "bottom");

    const customRadius = 0;
    const fromExitOffsetVal = fromHS ? (fromHS.exitOffset ?? 40) + customRadius : 40 + customRadius;

    const toSymbol = hoveredHotspot ? symbols.find((s) => s.id === hoveredHotspot.symbolId) : null;
    const toHS = toSymbol && hoveredHotspot ? findTerminalByName(getSymbolTerminals(toSymbol), hoveredHotspot.terminalName, hoveredHotspot.isTop) : null;
    const toIsDist = toSymbol ? (isDistributionBlockSymbol(toSymbol) || (toHS?.visualInset !== undefined && toHS.visualInset > 180)) : false;

    const opts = {
      isDrawing: true,
      points: explicitPoints,
      customRadius,
      isFromTop: fromSymbol ? resolveConnectionIsFromTop(fromSymbol, drawingState.isTop, fromHS || undefined) : drawingState.isTop,
      fromDirection,
      fromVisualInset,
      fromExitOffset: fromExitOffsetVal,
      isToTop: hoveredHotspot && toSymbol ? resolveConnectionIsToTop(toSymbol, hoveredHotspot.isTop, toHS || undefined) : (hoveredHotspot ? hoveredHotspot.isTop : undefined),
      toDirection: hoveredHotspot ? (toHS?.direction || (hoveredHotspot.isTop ? "top" : "bottom")) : undefined,
      toVisualInset: hoveredHotspot ? (toHS ? (toIsDist ? 0 : toHS.visualInset) : 10) : undefined,
      toExitOffset: hoveredHotspot ? (toHS ? (toHS.exitOffset ?? 40) + customRadius : 40 + customRadius) : undefined,
    };

    const targetPt = hoveredHotspot 
      ? { x: hoveredHotspot.absX, y: hoveredHotspot.absY } 
      : (drawingAlignment.snappedPt || currentMousePos);

    const ptsArr = calculateWirePoints(fromPt, targetPt, opts);
    const pathData = calculateWirePath(fromPt, targetPt, opts);

    return { pathData, pointsArr: ptsArr };
  }, [drawingState, currentMousePos, hoveredHotspot, explicitPoints, symbols, drawingAlignment]);

  const actualDrawingFromDir = useMemo(() => {
    if (!previewPath || previewPath.pointsArr.length < 2) return null;
    const dx = previewPath.pointsArr[1].x - previewPath.pointsArr[0].x;
    const dy = previewPath.pointsArr[1].y - previewPath.pointsArr[0].y;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? "right" : "left";
    } else if (Math.abs(dy) > 0) {
      return dy > 0 ? "bottom" : "top";
    }
    return null;
  }, [previewPath]);

  const actualDrawingToDir = useMemo(() => {
    if (!previewPath || previewPath.pointsArr.length < 2) return null;
    const p1 = previewPath.pointsArr[previewPath.pointsArr.length - 2];
    const p2 = previewPath.pointsArr[previewPath.pointsArr.length - 1];
    const vX = p1.x - p2.x;
    const vY = p1.y - p2.y;
    if (Math.abs(vX) > Math.abs(vY)) {
      return vX > 0 ? "right" : "left";
    } else if (Math.abs(vY) > 0) {
      return vY > 0 ? "bottom" : "top";
    }
    return null;
  }, [previewPath]);
  const handleResetZoom = () => {
    hasInitializedFit.current = false;
    if (rail.width && rail.height && containerSize.width > 0 && containerSize.height > 0) {
      const scaleX = (containerSize.width - 80) / rail.width;
      const scaleY = (containerSize.height - 80) / rail.height;
      const initialScale = Math.min(scaleX, scaleY, 0.45);
      
      const initialPanX = (containerSize.width - rail.width * initialScale) / 2;
      const initialPanY = (containerSize.height - rail.height * initialScale) / 2;
      
      setViewport({ zoom: initialScale, pan: { x: initialPanX, y: initialPanY } });
      hasInitializedFit.current = true;
    }
  };

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
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          display: "flex",
          gap: "8px",
          zIndex: 10,
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "4px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
      >
        <button
          type="button"
          onClick={zoomIn}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            padding: "6px",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
          title="Przybliż"
        >
          <AppIcon name="zoomIn" size={16} />
        </button>
        <span style={{ display: "flex", alignItems: "center", fontSize: "12px", color: "var(--text-primary)", minWidth: "42px", justifyContent: "center", fontWeight: 600 }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomOut}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            padding: "6px",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
          title="Oddal"
        >
          <AppIcon name="zoomOut" size={16} />
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            padding: "6px",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
          title="Dopasuj do okna"
        >
          <AppIcon name="zoomFit" size={16} />
        </button>
      </div>

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


      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height: "100%",
          touchAction: "none",
          opacity: hasInitializedFit.current ? 1 : 0,
          transition: "opacity 0.15s ease-in-out",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
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
          {(() => {
            if (!rail.isVisible) return null;
            const rectWidth = Math.min(2000, rail.width * 0.35);
            const rectHeight = 300;
            const gap = 300;
            const centerX = rail.width / 2;
            const leftRectX = centerX - rectWidth - gap / 2;
            const rightRectX = centerX + gap / 2;
            const topY = -1200;
            const bottomY = (rail.config.rows - 1) * (1642.0 + 50.0) + 2400;

            const isZoneOccupied = (zoneX: number, zoneY: number) => {
              return symbols.some((s) => {
                const pathLower = (s.visualPath || s.moduleRef || "").toLowerCase();
                const pathMatches = pathLower.includes("listwy do rozdzielnicy") || pathLower.includes("listwy%20do%20rozdzielnicy") || pathLower.includes("gsu/gsu.svg");
                if (s.deviceKind !== "terminalBlock" || !pathMatches) return false;
                const sCenterX = s.x + s.width / 2;
                const sCenterY = s.y + s.height / 2;
                const zoneCenterX = zoneX + rectWidth / 2;
                const zoneCenterY = zoneY + rectHeight / 2;
                return Math.abs(sCenterX - zoneCenterX) < rectWidth * 0.8 && Math.abs(sCenterY - zoneCenterY) < rectHeight * 0.8;
              });
            };

            const createPlaceholder = (x: number, y: number, key: string, label: string = "DODAJ LISTWY", tabName: string = "Listwy do rozdzielnicy") => {
              if (isZoneOccupied(x, y)) return null;
              return (
                <g
                  key={key}
                  className="din-rail-listwy-placeholder-group"
                  style={{ cursor: "pointer", pointerEvents: "all" }}
                  transform={`translate(${x}, ${y})`}
                  onClick={() => onRequestLeftPanelTab?.(tabName)}
                  onPointerEnter={(e) => {
                    const rect = e.currentTarget.querySelector("rect");
                    if (rect) {
                      rect.style.stroke = "#94a3b8";
                      rect.style.fill = "rgba(30, 41, 59, 0.6)";
                    }
                  }}
                  onPointerLeave={(e) => {
                    const rect = e.currentTarget.querySelector("rect");
                    if (rect) {
                      rect.style.stroke = "#475569";
                      rect.style.fill = "rgba(15, 23, 42, 0.4)";
                    }
                  }}
                >
                  <rect
                    width={rectWidth}
                    height={rectHeight}
                    rx={24}
                    fill="rgba(15, 23, 42, 0.4)"
                    stroke="#475569"
                    strokeWidth={12}
                    strokeDasharray="24 24"
                    style={{ transition: "all 0.2s" }}
                  />
                  <line
                    x1={0} y1={rectHeight / 2}
                    x2={rectWidth} y2={rectHeight / 2}
                    stroke="#475569" strokeWidth={4} strokeDasharray="16 16"
                    style={{ pointerEvents: "none" }}
                  />
                  <line
                    x1={rectWidth / 2} y1={rectHeight / 2 - 50}
                    x2={rectWidth / 2} y2={rectHeight / 2 + 50}
                    stroke="#475569" strokeWidth={4}
                    style={{ pointerEvents: "none" }}
                  />
                  <text
                    x={rectWidth / 2}
                    y={rectHeight / 2 + 25}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={label.length > 15 ? 40 : 80}
                    fontWeight="bold"
                    fontFamily="system-ui, sans-serif"
                    letterSpacing={label.length > 15 ? 2 : 4}
                    style={{ textTransform: "uppercase", pointerEvents: "none" }}
                  >
                    {label}
                  </text>
                </g>
              );
            };

            return (
              <g className="din-rail-listwy-placeholders" style={{ pointerEvents: "none" }}>
                {createPlaceholder(leftRectX, topY, "top-left", "DODAJ LISTWY", "Listwy do rozdzielnicy")}
                {createPlaceholder(rightRectX, topY, "top-right", "DODAJ LISTWY", "Listwy do rozdzielnicy")}
                {createPlaceholder(leftRectX, bottomY, "bottom-left", "DODAJ LISTWĘ LUB GSU", "Listwy do rozdzielnicy")}
                {createPlaceholder(rightRectX, bottomY, "bottom-right", "DODAJ LISTWĘ LUB GSU", "Listwy do rozdzielnicy")}
              </g>
            );
          })()}



          {/* 2. Base Symbols (drawn under wires, e.g. terminal blocks base, RCD base) */}
          {symbols.filter(s => (s.deviceKind === "terminalBlock" && !isTerminalZlaczka(s.moduleRef)) || s.deviceKind === "phaseIndicator").map((symbol) => (
            <g
              key={symbol.id}
              transform={`translate(${symbol.x}, ${symbol.y})`}
              onPointerEnter={() => setHoveredSymbolId(symbol.id)}
              onPointerLeave={() => setHoveredSymbolId(null)}
              style={{ cursor: "pointer" }}
            >
              <rect
                width={symbol.width}
                height={symbol.height}
                fill="rgba(30, 41, 59, 0.05)"
                stroke={hoveredSymbolId === symbol.id ? "var(--accent-primary)" : "transparent"}
                strokeWidth={4}
                style={{ transition: "stroke 0.15s ease" }}
              />
              <image
                href={baseUrls[symbol.id] || getSymbolAssetUrl(symbol)}
                width={symbol.width}
                height={symbol.height}
                preserveAspectRatio={(symbol.moduleRef || "").toLowerCase().includes("listwy do rozdzielnicy") || (symbol.moduleRef || "").toLowerCase().includes("gsu") ? "none" : "xMidYMid meet"}
                style={{ pointerEvents: "none" }}
              />
              {/* Reference designation / Name indicator (Floating text below the module, matching main workspace) */}
              <text
                x={symbol.width / 2}
                y={symbol.height + 25}
                textAnchor="middle"
                fill="#f8fafc"
                fontSize={12}
                fontWeight={700}
                fontFamily="Segoe UI, Arial, sans-serif"
                style={{
                  pointerEvents: "none",
                  textShadow: "0 0 1px #111827, 0 0 3px #111827, 0 0 5px #111827",
                  userSelect: "none"
                }}
              >
                {symbol.referenceDesignation || symbol.label || "Aparat"}
              </text>
            </g>
          ))}

          {/* 2.8 Visual Hotspot circles layered UNDER wires */}
          {hotspotsData.map((d) => {
            return d.hotspots.map((hs) => {
              const isTargetHovered = hoveredHotspot?.symbolId === d.symbolId && hoveredHotspot?.terminalName === hs.name && hoveredHotspot?.isTop === hs.isTop;
              const isStartPoint = drawingState?.startSymbolId === d.symbolId && drawingState?.startTerminal === hs.name && drawingState?.isTop === hs.isTop;

                  // Visibility logic (terminals remain visible with 0.6 opacity even when connected)
                  const isHighlighted = highlightedComponent.terminalKeys.has(`${d.symbolId}:${hs.name}:${hs.isTop ? 'T' : 'B'}`);
                  let ringOpacity = isHighlighted ? 1.0 : 0.6;
                  if (isStartPoint || isTargetHovered) {
                    ringOpacity = 1.0;
                  }

                  const isListwa = d.moduleRef && d.moduleRef.toLowerCase().includes("listwy do rozdzielnicy");
                  const isZlaczka = !isListwa && (d.symbol.isTerminalBlock || (d.moduleRef && (d.moduleRef.toLowerCase().includes("złącz") || d.moduleRef.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("zlacz"))));
                  const defaultVisualRadius = isListwa ? 28.0 : isZlaczka ? 52.0 : 31.3;
                  const visualRadius = hs.radius ?? defaultVisualRadius;

                  return (
                    <g
                       key={`${d.symbolId}-${hs.name}-${hs.isTop ? 'top' : 'bottom'}`}
                       transform={`translate(${hs.absX}, ${hs.absY})`}
                       style={{ transition: "opacity 0.2s ease" }}
                    >
                       {/* Outer glow ring for currently drawing/hovered */}
                       {(isTargetHovered || isStartPoint) && (
                         <circle
                           r={visualRadius}
                           fill="transparent"
                           stroke={isTargetHovered ? "#52c41a" : "var(--accent-primary)"}
                           strokeWidth={4}
                           style={{ pointerEvents: "none", animation: "pulse 1.5s infinite" }}
                         />
                       )}

                       {/* Trace Path Highlight outer glow ring */}
                       {isHighlighted && !isTargetHovered && !isStartPoint && (
                         <circle
                           r={visualRadius}
                           fill="transparent"
                           stroke="#22c55e"
                           strokeWidth={4}
                           style={{ pointerEvents: "none" }}
                           opacity={0.8}
                         />
                       )}

                       {/* Visible green ring */}
                        <circle
                          r={visualRadius}
                          fill="transparent"
                          stroke={isTargetHovered || isHighlighted ? "#62C04B" : "#4caf50"}
                          strokeWidth={isTargetHovered || isHighlighted ? 6 : 4}
                          style={{ 
                            pointerEvents: "none", 
                            opacity: ringOpacity,
                            transition: "all 0.2s ease"
                          }}
                        />
                    </g>
                  );
            });
          })}
          {/* 3. Render connection wires */}
          {groupedWiredPaths.map((w) => {
            if (!w) return null;
            const isSelected = selectedConnectionId === w.connection.id;
            const wireThickness = WIRE_THICKNESS_MAP[w.connection.wireCrossSection] || 4.5;

            return (
              <g key={w.connection.id}>

                {/* 3.1.5 Trace Path Highlight glow */}
                {highlightedComponent.connectionIds.has(w.connection.id) && (
                  <path
                    d={w.pathData}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={wireThickness + 12.0}
                    strokeLinecap="butt"
                    strokeLinejoin="round"
                    opacity={0.45}
                    style={{ pointerEvents: "none" }}
                  />
                )}

                {/* 0. Drop shadow for wire */}
                <path
                  d={w.pathData}
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.4)"
                  strokeWidth={wireThickness}
                  strokeLinecap="butt"
                  strokeLinejoin="round"
                  transform="translate(1, 4)"
                  filter="url(#shadow-blur)"
                  style={{ pointerEvents: "none" }}
                />

                {/* 1. Dark outline base (Outer Edge) */}
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
                  style={{ pointerEvents: "none" }}
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
                  style={{ pointerEvents: "none" }}
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
                    style={{ pointerEvents: "none" }}
                  />
                )}

                {/* Hover / click hit area */}
                <path
                  d={w.pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ cursor: "pointer", pointerEvents: "stroke" }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onConnectionSelect(w.connection.id);
                  }}
                  onPointerEnter={() => setHoveredWireId(w.connection.id)}
                  onPointerLeave={() => setHoveredWireId(null)}
                />

                {/* 3.3 Dashed white axis lines for selected wire */}
                {isSelected && (
                  <path
                    d={w.pathData}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    strokeDasharray="6 6"
                    style={{ pointerEvents: "none", opacity: 0.8 }}
                  />
                )}

                {/* 3.4 Hitboxes for segment dragging */}
                {isSelected && w.pointsArr && w.pointsArr.map((pt, i) => {
                  if (i === 0 || i === w.pointsArr.length - 2) return null; // Don't drag terminal exits/entries directly
                  const nextPt = w.pointsArr[i + 1];
                  if (!nextPt) return null;
                  
                  const isHorizontal = Math.abs(pt.y - nextPt.y) < 1;
                  const isVertical = Math.abs(pt.x - nextPt.x) < 1;
                  
                  if (!isHorizontal && !isVertical) return null; // Only ortho segments
                  
                  return (
                    <line
                      key={`seg-${i}`}
                      x1={pt.x} y1={pt.y} x2={nextPt.x} y2={nextPt.y}
                      stroke="transparent" strokeWidth={24}
                      style={{ cursor: isHorizontal ? "ns-resize" : "ew-resize", pointerEvents: "stroke" }}
                      onPointerDown={(e) => {
                        e.stopPropagation(); e.preventDefault();
                        
                        const startDir = w.connection.fromDirection || (w.fromHS.isTop ? "top" : "bottom");
                        const endDir = w.connection.toDirection || (w.toHS.isTop ? "top" : "bottom");
                        const bendRadius = w.connection.customRadius ?? 0;
                        const startClearance = (w.fromExitOffset ?? 30) + 40 + bendRadius; 
                        const endClearance = (w.toExitOffset ?? 30) + 40 + bendRadius;

                        if (!w.connection.points || w.connection.points.length === 0) {
                          // Auto routed: use draggingHandle
                          let minBound: number | undefined;
                          let maxBound: number | undefined;

                          if (w.pointsArr.length === 6) {
                            if (i === 2) {
                              if (isHorizontal) {
                                if (startDir === "bottom") minBound = Math.max(minBound ?? -Infinity, w.fromPt.y + startClearance);
                                if (startDir === "top") maxBound = Math.min(maxBound ?? Infinity, w.fromPt.y - startClearance);
                                if (endDir === "bottom") minBound = Math.max(minBound ?? -Infinity, w.toPt.y + endClearance);
                                if (endDir === "top") maxBound = Math.min(maxBound ?? Infinity, w.toPt.y - endClearance);
                                setDraggingHandle({ connectionId: w.connection.id, type: "Y", defaultChannelY: (w.pointsArr[1].y + w.pointsArr[4].y) / 2, minBound, maxBound });
                              } else {
                                if (startDir === "right") minBound = Math.max(minBound ?? -Infinity, w.fromPt.x + startClearance);
                                if (startDir === "left") maxBound = Math.min(maxBound ?? Infinity, w.fromPt.x - startClearance);
                                if (endDir === "right") minBound = Math.max(minBound ?? -Infinity, w.toPt.x + endClearance);
                                if (endDir === "left") maxBound = Math.min(maxBound ?? Infinity, w.toPt.x - endClearance);
                                setDraggingHandle({ connectionId: w.connection.id, type: "X", baseX: (w.pointsArr[1].x + w.pointsArr[4].x) / 2, minBound, maxBound });
                              }
                            }
                          } else if (w.pointsArr.length === 8) {
                            if (i === 2) {
                              if (startDir === "bottom") minBound = w.fromPt.y + startClearance;
                              if (startDir === "top") maxBound = w.fromPt.y - startClearance;
                              setDraggingHandle({ connectionId: w.connection.id, type: "Y1", exitY: w.pointsArr[1].y, minBound, maxBound });
                            }
                            else if (i === 3) setDraggingHandle({ connectionId: w.connection.id, type: "X", baseX: (w.pointsArr[1].x + w.pointsArr[6].x) / 2 });
                            else if (i === 4) {
                              if (endDir === "bottom") minBound = w.toPt.y + endClearance;
                              if (endDir === "top") maxBound = w.toPt.y - endClearance;
                              setDraggingHandle({ connectionId: w.connection.id, type: "Y2", enterY: w.pointsArr[6].y, minBound, maxBound });
                            }
                          }
                        } else {
                          // Manual routed: use draggingSegment
                          const basePoints = w.connection.points;
                          const indexA = i - 2;
                          const indexB = i - 1;
                          
                          let minBound: number | undefined;
                          let maxBound: number | undefined;

                          if (isHorizontal) {
                             if (indexA === 0 || indexB === 0) {
                                if (startDir === "bottom") minBound = Math.max(minBound ?? -Infinity, w.fromPt.y + startClearance);
                                if (startDir === "top") maxBound = Math.min(maxBound ?? Infinity, w.fromPt.y - startClearance);
                             }
                             if (indexA === basePoints.length - 1 || indexB === basePoints.length - 1) {
                                if (endDir === "bottom") minBound = Math.max(minBound ?? -Infinity, w.toPt.y + endClearance);
                                if (endDir === "top") maxBound = Math.min(maxBound ?? Infinity, w.toPt.y - endClearance);
                             }
                          } else {
                             if (indexA === 0 || indexB === 0) {
                                if (startDir === "right") minBound = Math.max(minBound ?? -Infinity, w.fromPt.x + startClearance);
                                if (startDir === "left") maxBound = Math.min(maxBound ?? Infinity, w.fromPt.x - startClearance);
                             }
                             if (indexA === basePoints.length - 1 || indexB === basePoints.length - 1) {
                                if (endDir === "right") minBound = Math.max(minBound ?? -Infinity, w.toPt.x + endClearance);
                                if (endDir === "left") maxBound = Math.min(maxBound ?? Infinity, w.toPt.x - endClearance);
                             }
                          }

                          // Only allow dragging if it affects internal explicit points
                          if (indexA >= 0 && indexB < basePoints.length) {
                             const ptr = getLogicalPoint(e.clientX, e.clientY);
                             setDraggingSegment({
                               connectionId: w.connection.id,
                               basePoints: basePoints,
                               indexA,
                               indexB,
                               isHorizontal,
                               startX: ptr.x,
                               startY: ptr.y,
                               minBound,
                               maxBound
                             });
                          }
                        }
                        
                        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_err) {
                          // Pointer capture może rzucić wyjątek jeśli pointerId
                          // nie jest już aktywny (np. po touchend). Bezpiecznie zignorować.
                        }
                      }}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* 3.5 Ferrules drawn on top of wires but UNDER symbols and terminal block foreground (brass) */}
          <g>
            {(() => {
              const ferruleCounts = new Map<string, number>();
              groupedWiredPaths.forEach((w) => {
                if (!w || !w.connection.ferruleColor || w.connection.ferruleColor === "none") return;
                const fromKey = `${w.connection.fromSymbolId}:${w.connection.fromTerminal}:${w.fromHS.isTop ? 'T' : 'B'}:${w.actualFromDir}`;
                const toKey = `${w.connection.toSymbolId}:${w.connection.toTerminal}:${w.toHS.isTop ? 'T' : 'B'}:${w.actualToDir}`;
                ferruleCounts.set(fromKey, (ferruleCounts.get(fromKey) || 0) + 1);
                ferruleCounts.set(toKey, (ferruleCounts.get(toKey) || 0) + 1);
              });

              const renderedFerrules = new Set<string>();
              return groupedWiredPaths.map((w) => {
                if (!w || !w.connection.ferruleColor || w.connection.ferruleColor === "none") return null;
                const wireThickness = WIRE_THICKNESS_MAP[w.connection.wireCrossSection] || 4;
                const elements = [];

                const fromKey = `${w.connection.fromSymbolId}:${w.connection.fromTerminal}:${w.fromHS.isTop ? 'T' : 'B'}:${w.actualFromDir}`;
                const toKey = `${w.connection.toSymbolId}:${w.connection.toTerminal}:${w.toHS.isTop ? 'T' : 'B'}:${w.actualToDir}`;

                if (!renderedFerrules.has(fromKey)) {
                  renderedFerrules.add(fromKey);
                  const fromSymbolForFerrule = symbols.find(sym => sym.id === w.connection.fromSymbolId);
                  // For distribution-block pins the ferrule is a short 40px strip
                  // anchored at the screw (the wire itself passes through the
                  // module body and exits at the bottom edge).
                  const fromIsDist = !!fromSymbolForFerrule && (isDistributionBlockSymbol(fromSymbolForFerrule) || (w.fromHS.visualInset !== undefined && w.fromHS.visualInset > 180));
                  elements.push(
                    <FerruleGraphic
                      key={`ferrule-from-${fromKey}`}
                      x={w.fromTerminalPt.x}
                      y={w.fromTerminalPt.y}
                      direction={(w.fromHS.direction || w.actualFromDir) as any}
                      color={w.connection.ferruleColor}
                      wireThickness={wireThickness}
                      wireCrossSection={w.connection.wireCrossSection}
                      isDouble={(ferruleCounts.get(fromKey) || 0) >= 2}
                      isShort={(() => {
                        const s = symbols.find(sym => sym.id === w.connection.fromSymbolId);
                        return s?.deviceKind === "terminalBlock" && !isTerminalZlaczka(s.moduleRef);
                      })()}
                      isExtraLong={(() => {
                        const s = symbols.find(sym => sym.id === w.connection.fromSymbolId);
                        return isTerminalZlaczka(s?.moduleRef);
                      })()}
                      isSquare={(() => {
                        const s = symbols.find(sym => sym.id === w.connection.fromSymbolId);
                        return s?.deviceKind === "phaseIndicator";
                      })()}
                      customOffset={fromIsDist ? 10 : w.fromHS.visualInset}
                      customLength={fromIsDist ? 40 : undefined}
                    />
                  );
                }

                if (!renderedFerrules.has(toKey)) {
                  renderedFerrules.add(toKey);
                  const toSymbolForFerrule = symbols.find(sym => sym.id === w.connection.toSymbolId);
                  const toIsDist = !!toSymbolForFerrule && (isDistributionBlockSymbol(toSymbolForFerrule) || (w.toHS.visualInset !== undefined && w.toHS.visualInset > 180));
                  elements.push(
                    <FerruleGraphic
                      key={`ferrule-to-${toKey}`}
                      x={w.toTerminalPt.x}
                      y={w.toTerminalPt.y}
                      direction={(w.toHS.direction || w.actualToDir) as any}
                      color={w.connection.ferruleColor}
                      wireThickness={wireThickness}
                      wireCrossSection={w.connection.wireCrossSection}
                      isDouble={(ferruleCounts.get(toKey) || 0) >= 2}
                      isShort={(() => {
                        const s = symbols.find(sym => sym.id === w.connection.toSymbolId);
                        return s?.deviceKind === "terminalBlock" && !isTerminalZlaczka(s.moduleRef);
                      })()}
                      isExtraLong={(() => {
                        const s = symbols.find(sym => sym.id === w.connection.toSymbolId);
                        return isTerminalZlaczka(s?.moduleRef);
                      })()}
                      isSquare={(() => {
                        const s = symbols.find(sym => sym.id === w.connection.toSymbolId);
                        return s?.deviceKind === "phaseIndicator";
                      })()}
                      customOffset={toIsDist ? 10 : w.toHS.visualInset}
                      customLength={toIsDist ? 40 : undefined}
                    />
                  );
                }

                return <React.Fragment key={`ferrule-group-${w.connection.id}`}>{elements}</React.Fragment>;
              });
            })()}

            {drawingState && defaultWireSettings.ferruleColor && defaultWireSettings.ferruleColor !== "none" && (
              <FerruleGraphic
                x={drawingState.startX}
                y={drawingState.startY}
                direction={(actualDrawingFromDir || drawingState.direction || (drawingState.isTop ? "top" : "bottom")) as any}
                color={defaultWireSettings.ferruleColor}
                wireThickness={WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection] || 4}
                wireCrossSection={defaultWireSettings.wireCrossSection}
                isShort={(() => {
                  const s = symbols.find(sym => sym.id === drawingState.startSymbolId);
                  return s?.deviceKind === "terminalBlock" && !isTerminalZlaczka(s.moduleRef);
                })()}
                isExtraLong={(() => {
                  const s = symbols.find(sym => sym.id === drawingState.startSymbolId);
                  return isTerminalZlaczka(s?.moduleRef);
                })()}
                isSquare={(() => {
                  const s = symbols.find(sym => sym.id === drawingState.startSymbolId);
                  return s?.deviceKind === "phaseIndicator";
                })()}
                customOffset={(() => {
                  const s = symbols.find(sym => sym.id === drawingState.startSymbolId);
                  if (!s) return undefined;
                  const hotspots = getSymbolTerminals(s);
                  const hs = hotspots.find(h => h.name === drawingState.startTerminal);
                  const isDist = isDistributionBlockSymbol(s) || (hs?.visualInset !== undefined && hs.visualInset > 180);
                  return isDist ? 10 : hs?.visualInset;
                })()}
                customLength={(() => {
                  const s = symbols.find(sym => sym.id === drawingState.startSymbolId);
                  if (!s) return undefined;
                  const hotspots = getSymbolTerminals(s);
                  const hs = hotspots.find(h => h.name === drawingState.startTerminal);
                  const isDist = isDistributionBlockSymbol(s) || (hs?.visualInset !== undefined && hs.visualInset > 180);
                  return isDist ? 40 : undefined;
                })()}
              />
            )}
            {drawingState && hoveredHotspot && defaultWireSettings.ferruleColor && defaultWireSettings.ferruleColor !== "none" && (
              <FerruleGraphic
                x={hoveredHotspot.absX}
                y={hoveredHotspot.absY}
                direction={(actualDrawingToDir || hoveredHotspot.direction || (hoveredHotspot.isTop ? "top" : "bottom")) as any}
                color={defaultWireSettings.ferruleColor}
                wireThickness={WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection] || 4}
                wireCrossSection={defaultWireSettings.wireCrossSection}
                isShort={(() => {
                  const s = symbols.find(sym => sym.id === hoveredHotspot.symbolId);
                  return s?.deviceKind === "terminalBlock" && !isTerminalZlaczka(s.moduleRef);
                })()}
                isExtraLong={(() => {
                  const s = symbols.find(sym => sym.id === hoveredHotspot.symbolId);
                  return isTerminalZlaczka(s?.moduleRef);
                })()}
                isSquare={(() => {
                  const s = symbols.find(sym => sym.id === hoveredHotspot.symbolId);
                  return s?.deviceKind === "phaseIndicator";
                })()}
                customOffset={(() => {
                  const s = symbols.find(sym => sym.id === hoveredHotspot.symbolId);
                  if (!s) return undefined;
                  const hotspots = getSymbolTerminals(s);
                  const hs = hotspots.find(h => h.name === hoveredHotspot.terminalName);
                  const isDist = isDistributionBlockSymbol(s) || (hs?.visualInset !== undefined && hs.visualInset > 180);
                  return isDist ? 10 : hs?.visualInset;
                })()}
                customLength={(() => {
                  const s = symbols.find(sym => sym.id === hoveredHotspot.symbolId);
                  if (!s) return undefined;
                  const hotspots = getSymbolTerminals(s);
                  const hs = hotspots.find(h => h.name === hoveredHotspot.terminalName);
                  const isDist = isDistributionBlockSymbol(s) || (hs?.visualInset !== undefined && hs.visualInset > 180);
                  return isDist ? 40 : undefined;
                })()}
              />
            )}
          </g>

          {/* 4. Normal Symbols (drawn over wires) */}
          {symbols.filter(s => s.deviceKind !== "phaseIndicator" && (s.deviceKind !== "terminalBlock" || isTerminalZlaczka(s.moduleRef))).map((symbol) => (
            <g
              key={symbol.id}
              transform={`translate(${symbol.x}, ${symbol.y})`}
              onPointerEnter={() => setHoveredSymbolId(symbol.id)}
              onPointerLeave={() => setHoveredSymbolId(null)}
              style={{ cursor: "pointer" }}
            >
              <rect
                width={symbol.width}
                height={symbol.height}
                fill="rgba(30, 41, 59, 0.05)"
                stroke={hoveredSymbolId === symbol.id ? "var(--accent-primary)" : "transparent"}
                strokeWidth={4}
                style={{ transition: "stroke 0.15s ease" }}
              />
              <image
                href={getSymbolAssetUrl(symbol)}
                width={symbol.width}
                height={symbol.height}
                preserveAspectRatio={(symbol.moduleRef || "").toLowerCase().includes("listwy do rozdzielnicy") || (symbol.moduleRef || "").toLowerCase().includes("gsu") ? "none" : "xMidYMid meet"}
                style={{ pointerEvents: "none" }}
              />
              {/* Reference designation / Name indicator (Floating text below the module, matching main workspace) */}
              <text
                x={symbol.width / 2}
                y={symbol.height + 25}
                textAnchor="middle"
                fill="#f8fafc"
                fontSize={12}
                fontWeight={700}
                fontFamily="Segoe UI, Arial, sans-serif"
                style={{
                  pointerEvents: "none",
                  textShadow: "0 0 1px #111827, 0 0 3px #111827, 0 0 5px #111827",
                  userSelect: "none"
                }}
              >
                {symbol.referenceDesignation || symbol.label || "Aparat"}
              </text>
            </g>
          ))}

          {/* 4. Active drawing rubber-band preview */}
          {previewPath && drawingState && (
            <g style={{ pointerEvents: "none" }}>
              {/* Oś startowa (przerywana linia od zacisku startowego) */}
              {(() => {
                const targetPt = drawingAlignment.snappedPt || currentMousePos;
                if (!targetPt) return null;
                return (
                  <>
                    <line
                      x1={drawingState.startX}
                      y1={drawingState.startY}
                      x2={drawingState.startX}
                      y2={targetPt.y}
                      stroke="#38bdf8"
                      strokeWidth={2.0}
                      strokeDasharray="6 4"
                      vectorEffect="non-scaling-stroke"
                      opacity={0.8}
                    />
                    {/* Oś końcowa (przerywana linia od aktualnego punktu) */}
                    <line
                      x1={targetPt.x}
                      y1={targetPt.y}
                      x2={targetPt.x}
                      y2={drawingState.startY}
                      stroke="#38bdf8"
                      strokeWidth={2.0}
                      strokeDasharray="6 4"
                      vectorEffect="non-scaling-stroke"
                      opacity={0.8}
                    />
                  </>
                );
              })()}

              {/* Dynamiczne linie pomocnicze wyrównania (Snap-to-Axis) */}
              {drawingAlignment.guides.map((guide, idx) => (
                <g key={`align-guide-${idx}`}>
                  <line
                    x1={guide.x1}
                    y1={guide.y1}
                    x2={guide.x2}
                    y2={guide.y2}
                    stroke="#0ea5e9"
                    strokeWidth={2.0}
                    strokeDasharray="6 4"
                    vectorEffect="non-scaling-stroke"
                    opacity={0.85}
                  />
                  {/* Podświetlenie wyrównanego zacisku docelowego */}
                  <circle
                    cx={guide.hs.absX}
                    cy={guide.hs.absY}
                    r={26}
                    fill="transparent"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    vectorEffect="non-scaling-stroke"
                    opacity={0.7}
                    style={{ pointerEvents: "none" }}
                  />
                  {/* Pulsujący okrąg wokół wyrównanego zacisku */}
                  <circle
                    cx={guide.hs.absX}
                    cy={guide.hs.absY}
                    r={34}
                    fill="transparent"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                    opacity={0.4}
                    style={{ pointerEvents: "none", animation: "pulse 1.2s infinite" }}
                  />
                </g>
              ))}

              {/* Drop shadow */}
              <path
                d={previewPath.pathData}
                fill="none"
                stroke="rgba(0, 0, 0, 0.4)"
                strokeWidth={WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection]}
                strokeLinecap="butt"
                strokeLinejoin="round"
                transform="translate(1, 4)"
                filter="url(#shadow-blur)"
                style={{ pointerEvents: "none" }}
              />
              {/* 1. Dark outline base */}
              <path
                d={previewPath.pathData}
                fill="none"
                stroke={
                  drawingWarning
                    ? "#991b1b"
                    : defaultWireSettings.wireColor === "black"
                      ? "#888888"
                      : (WIRE_COLORS_MAP[defaultWireSettings.wireColor]?.dark || "#1a1a1a")
                }
                strokeWidth={WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection] + 1.8}
                strokeLinecap="butt"
                strokeLinejoin="round"
                style={{ pointerEvents: "none", opacity: 0.9 }}
              />
              {/* 2. Main color (Midtone) */}
              <path
                d={previewPath.pathData}
                fill="none"
                stroke={
                  drawingWarning
                    ? "#ef4444"
                    : defaultWireSettings.wireColor === "green-yellow"
                      ? "#2e7d32"
                      : (WIRE_COLORS_MAP[defaultWireSettings.wireColor]?.hex || "#555")
                }
                strokeWidth={WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection]}
                strokeLinecap="butt"
                strokeLinejoin="round"
                style={{ pointerEvents: "none", opacity: 0.9 }}
              />
              {/* 3. Yellow stripes overlay for PE */}
              {!drawingWarning && defaultWireSettings.wireColor === "green-yellow" && (
                <path
                  d={previewPath.pathData}
                  fill="none"
                  stroke="#FFD600"
                  strokeWidth={WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection]}
                  strokeDasharray={`${WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection] * 1.2} ${WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection] * 1.2}`}
                  strokeLinecap="butt"
                  strokeLinejoin="round"
                  style={{ pointerEvents: "none", opacity: 0.9 }}
                />
              )}

            </g>
          )}

          {/* 5. Foreground parts of terminal blocks (brass/mosiądz on top) */}
          <DinRailConnectionsForegroundLayer
            symbols={symbols.filter(s => s.deviceKind === "terminalBlock" && !isTerminalZlaczka(s.moduleRef))}
            foregroundUrls={foregroundUrls}
          />

          {/* 6. Invisible Hotspot Hit Targets layered on top of everything to ensure they are interactive */}
          {hotspotsData.map((d) => {
            return d.hotspots.map((hs) => {
                  const isListwa = d.moduleRef && d.moduleRef.toLowerCase().includes("listwy do rozdzielnicy");
                  const isZlaczka = !isListwa && (d.symbol.isTerminalBlock || (d.moduleRef && (d.moduleRef.toLowerCase().includes("złącz") || d.moduleRef.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("zlacz"))));
                  const defaultHitRadius = isListwa ? 38 : isZlaczka ? 56 : 46;
                  const hitRadius = hs.radius ? hs.radius + 10 : defaultHitRadius;

                  return (
                    <g
                       key={`${d.symbolId}-${hs.name}-${hs.isTop ? 'top' : 'bottom'}`}
                       transform={`translate(${hs.absX}, ${hs.absY})`}
                    >
                       {/* Invisible pointer hit target (wide for touch/easy mouse) */}
                       <circle
                         r={hitRadius}
                         fill="transparent"
                         style={{ cursor: drawingState ? "crosshair" : "pointer", pointerEvents: "all" }}
                         onPointerDown={(e) => handleHotspotPointerDown(e, { ...hs, symbolId: d.symbolId, absX: hs.absX, absY: hs.absY })}
                         onPointerEnter={() => setHoveredHotspot({ symbolId: d.symbolId, terminalName: hs.name, absX: hs.absX, absY: hs.absY, isTop: hs.isTop, type: hs.type, direction: hs.direction })}
                         onPointerLeave={() => setHoveredHotspot(null)}
                       />

                       {/* Terminal Name Text Overlay (Only show if hovered target or start point, to keep it clean) */}
                       {(() => {
                         const isTargetHovered = hoveredHotspot?.symbolId === d.symbolId && hoveredHotspot?.terminalName === hs.name && hoveredHotspot?.isTop === hs.isTop;
                         const isStartPoint = drawingState?.startSymbolId === d.symbolId && drawingState?.startTerminal === hs.name && drawingState?.isTop === hs.isTop;
                         return (
                           <g style={{ pointerEvents: "none", opacity: (isTargetHovered || isStartPoint) ? 1 : 0, transition: "opacity 0.2s" }}>
                             <rect
                               x={-12}
                               y={hs.isTop ? -32 : 16}
                               width={24}
                               height={16}
                               rx={3}
                               fill="#1e293b"
                               stroke="#475569"
                               strokeWidth={1}
                             />
                             <text
                               x={0}
                               y={hs.isTop ? -20 : 28}
                               textAnchor="middle"
                               fill="#f8fafc"
                               fontSize={10}
                               fontWeight={800}
                               fontFamily="Inter, Roboto, sans-serif"
                             >
                               {hs.name}
                             </text>
                           </g>
                         );
                       })()}
                    </g>
                  );
            });
          })}


        </g>
      </svg>
    </div>
  );
}
