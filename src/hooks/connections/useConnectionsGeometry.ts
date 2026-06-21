import { useMemo } from "react";
import type { ConnectionItem } from "../../types/connectionItem";
import { type SymbolItem, isDistributionBlockSymbol } from "../../types/symbolItem";
import { getSymbolTerminals, findTerminalByName, resolveConnectionIsFromTop, resolveConnectionIsToTop } from "../../lib/modules/moduleTerminals";
import { calculateWirePath, calculateWirePoints, type Point } from "../../lib/routing/wireRoutingEngine";
import { computeGroupedWiredPaths } from "../../lib/connections/wirePathGenerator";
import type { DrawingState, HoveredHotspot } from "./useConnectionsDrawing";

export interface UseConnectionsGeometryProps {
  symbols: SymbolItem[];
  localConnections: ConnectionItem[];
  drawingState: DrawingState | null;
  currentMousePos: { x: number; y: number } | null;
  explicitPoints: Point[];
  hoveredHotspot: HoveredHotspot | null;
}

export function useConnectionsGeometry({
  symbols,
  localConnections,
  drawingState,
  currentMousePos,
  explicitPoints,
  hoveredHotspot,
}: UseConnectionsGeometryProps) {
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

  const groupedWiredPaths = useMemo(() => {
    return computeGroupedWiredPaths(symbols, localConnections);
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
    const fromIsDist = fromSymbol ? isDistributionBlockSymbol(fromSymbol) : false;
    const fromVisualInset = fromHS ? (fromIsDist ? 0 : fromHS.visualInset) : 10;
    const fromDirection = fromHS?.direction || (drawingState.isTop ? "top" : "bottom");

    const customRadius = 0;
    const fromExitOffsetVal = fromHS ? (fromHS.exitOffset ?? 40) + customRadius : 40 + customRadius;

    const toSymbol = hoveredHotspot ? symbols.find((s) => s.id === hoveredHotspot.symbolId) : null;
    const toHS = toSymbol && hoveredHotspot ? findTerminalByName(getSymbolTerminals(toSymbol), hoveredHotspot.terminalName, hoveredHotspot.isTop) : null;
    const toIsDist = toSymbol ? isDistributionBlockSymbol(toSymbol) : false;

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

  return {
    hotspotsData,
    allHotspots,
    groupedWiredPaths,
    drawingAlignment,
    previewPath,
    actualDrawingFromDir,
    actualDrawingToDir,
  };
}
