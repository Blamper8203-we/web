import { useMemo } from "react";
import { type ConnectionItem } from "../../types/connectionItem";
import { type SymbolItem } from "../../types/symbolItem";
import { getSymbolTerminals, findTerminalByName, resolveConnectionIsFromTop, resolveConnectionIsToTop } from "../../lib/modules/moduleTerminals";
import { calculateWirePoints, calculateWirePath, type Point } from "../../lib/routing/wireRoutingEngine";
import { WIRE_COLORS_MAP, WIRE_THICKNESS_MAP, getFerruleLength, isTerminalZlaczka } from "../../lib/connections/connectionsLogic";
import type { DraggingHandle, DraggingSegment } from "../../hooks/useDinRailConnectionsInteraction";
import { FerruleGraphic } from "./FerruleGraphic";

interface DinRailConnectionsWiresLayerProps {
  connections: ConnectionItem[];
  symbols: SymbolItem[];
  selectedConnectionId: string | null;
  onConnectionSelect: (id: string | null) => void;
  highlightedConnectionIds: Set<string>;
  setHoveredWireId: (id: string | null) => void;
  setDraggingHandle: (handle: DraggingHandle | null) => void;
  setDraggingSegment: (segment: DraggingSegment | null) => void;
  getLogicalPoint: (clientX: number, clientY: number) => Point;
  renderMode?: "background" | "foreground";
  clipPathId?: string;
}

export function DinRailConnectionsWiresLayer({
  connections,
  symbols,
  selectedConnectionId,
  onConnectionSelect,
  highlightedConnectionIds,
  setHoveredWireId,
  setDraggingHandle,
  setDraggingSegment,
  getLogicalPoint,
  renderMode = "background",
  clipPathId,
}: DinRailConnectionsWiresLayerProps) {
  // Group parallel lines to offsets
  const groupedWiredPaths = useMemo(() => {
    const keyCounts: Record<string, number> = {};
    const keyIndices: Record<string, number> = {};

    return connections
      .map((conn) => {
        const fromSymbol = symbols.find((s) => s.id === conn.fromSymbolId);
        const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);

        if (!fromSymbol || !toSymbol) return null;

        const fromHS = findTerminalByName(getSymbolTerminals(fromSymbol), conn.fromTerminal);
        const toHS = findTerminalByName(getSymbolTerminals(toSymbol), conn.toTerminal);

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
      })
      .filter(Boolean)
      .map((d) => {
        if (!d) return null;
        const index = keyIndices[d.key] || 0;
        keyIndices[d.key] = index + 1;

        const hasFerrule = d.connection.ferruleColor && d.connection.ferruleColor !== "none";
        const customRadius = d.connection.customRadius ?? 52;
        
        const fromFerruleLen = getFerruleLength(d.fromSymbol.deviceKind, d.fromSymbol.moduleRef);
        const toFerruleLen = getFerruleLength(d.toSymbol.deviceKind, d.toSymbol.moduleRef);

        const fromExitOffsetVal = hasFerrule ? Math.max(d.fromHS.exitOffset ?? 40, fromFerruleLen) + customRadius : (d.fromHS.exitOffset ?? 40) + customRadius;
        const toExitOffsetVal = hasFerrule ? Math.max(d.toHS.exitOffset ?? 40, toFerruleLen) + customRadius : (d.toHS.exitOffset ?? 40) + customRadius;

        const routingOpts = {
          isFromTop: resolveConnectionIsFromTop(d.fromSymbol, d.connection.isFromTop, d.fromHS),
          fromDirection: d.fromHS.direction,
          isToTop: resolveConnectionIsToTop(d.toSymbol, d.connection.isToTop, d.toHS),
          toDirection: d.toHS.direction,
          points: d.connection.points,
          customOffset: d.connection.customOffset,
          customOffsetX: d.connection.customOffsetX,
          customOffsetY1: d.connection.customOffsetY1,
          customOffsetY2: d.connection.customOffsetY2,
          customRadius,
          fromExitOffset: fromExitOffsetVal,
          toExitOffset: toExitOffsetVal,
        };

        const pointsArr = calculateWirePoints(d.fromPt, d.toPt, routingOpts);
        const pathData = calculateWirePath(d.fromPt, d.toPt, routingOpts);

        let actualFromDir = d.connection.fromDirection || d.fromHS.direction || (d.fromHS.isTop ? "top" : "bottom");
        if (pointsArr && pointsArr.length >= 2) {
          const dx = pointsArr[1].x - pointsArr[0].x;
          const dy = pointsArr[1].y - pointsArr[0].y;
          if (Math.abs(dx) > Math.abs(dy)) {
            actualFromDir = dx > 0 ? "right" : "left";
          } else {
            actualFromDir = dy > 0 ? "bottom" : "top";
          }
        }

        let actualToDir = d.connection.toDirection || d.toHS.direction || (d.toHS.isTop ? "top" : "bottom");
        if (pointsArr && pointsArr.length >= 2) {
          const lastIdx = pointsArr.length - 1;
          const dx = pointsArr[lastIdx].x - pointsArr[lastIdx - 1].x;
          const dy = pointsArr[lastIdx].y - pointsArr[lastIdx - 1].y;
          if (Math.abs(dx) > Math.abs(dy)) {
            actualToDir = dx > 0 ? "right" : "left";
          } else {
            actualToDir = dy > 0 ? "bottom" : "top";
          }
        }

        const resolvedIsFromTop = resolveConnectionIsFromTop(d.fromSymbol, d.connection.isFromTop, d.fromHS);
        const resolvedIsToTop = resolveConnectionIsToTop(d.toSymbol, d.connection.isToTop, d.toHS);

        return {
          ...d,
          pointsArr,
          pathData,
          actualFromDir,
          actualToDir,
          resolvedIsFromTop,
          resolvedIsToTop,
          parallelIndex: index,
          parallelCount: keyCounts[d.key],
        };
      });
  }, [connections, symbols]);

  const ferruleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    groupedWiredPaths.forEach((w) => {
      if (!w || !w.connection.ferruleColor || w.connection.ferruleColor === "none") return;
      const fromKey = `${w.connection.fromSymbolId}:${w.connection.fromTerminal}:${w.fromHS.isTop ? 'T' : 'B'}:${w.actualFromDir}`;
      const toKey = `${w.connection.toSymbolId}:${w.connection.toTerminal}:${w.toHS.isTop ? 'T' : 'B'}:${w.actualToDir}`;
      counts.set(fromKey, (counts.get(fromKey) || 0) + 1);
      counts.set(toKey, (counts.get(toKey) || 0) + 1);
    });
    return counts;
  }, [groupedWiredPaths]);

  return (
    <g clipPath={clipPathId ? `url(#${clipPathId})` : undefined}>
      {groupedWiredPaths.map((w) => {
        if (!w) return null;
        const isSelected = selectedConnectionId === w.connection.id;
        const wireThickness = WIRE_THICKNESS_MAP[w.connection.wireCrossSection] || 4.5;

        return (
          <g key={w.connection.id}>
            {/* Trace Path Highlight glow */}
            {renderMode === "background" && highlightedConnectionIds.has(w.connection.id) && (
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

            {/* 1. Dark outline base (Outer Edge) */}
            <path
              d={w.pathData}
              fill="none"
              stroke={
                w.connection.wireColor === "black"
                  ? "#888888"
                  : WIRE_COLORS_MAP[w.connection.wireColor]?.dark || "#1a1a1a"
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
                  : WIRE_COLORS_MAP[w.connection.wireColor]?.hex || "#555"
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

            {/* Ferrules (only render in foreground mode or if not clipping) */}
            {w.connection.ferruleColor && w.connection.ferruleColor !== "none" && (
              <>
                <FerruleGraphic
                  x={w.fromPt.x}
                  y={w.fromPt.y}
                  direction={w.connection.fromDirection || (w.resolvedIsFromTop ? "top" : "bottom")}
                  color={w.connection.ferruleColor}
                  wireThickness={wireThickness}
                  wireCrossSection={w.connection.wireCrossSection}
                  isShort={w.fromSymbol?.deviceKind === "terminalBlock" && !isTerminalZlaczka(w.fromSymbol?.moduleRef)}
                  isExtraLong={isTerminalZlaczka(w.fromSymbol?.moduleRef)}
                  isSquare={w.fromSymbol?.deviceKind === "phaseIndicator"}
                  isDouble={(ferruleCounts.get(`${w.connection.fromSymbolId}:${w.connection.fromTerminal}:${w.resolvedIsFromTop ? 'T' : 'B'}:${w.actualFromDir}`) || 0) >= 2}
                  customOffset={w.fromHS?.visualInset}
                  customLength={undefined}
                />
                <FerruleGraphic
                  x={w.toPt.x}
                  y={w.toPt.y}
                  direction={w.connection.toDirection || (w.resolvedIsToTop ? "top" : "bottom")}
                  color={w.connection.ferruleColor}
                  wireThickness={wireThickness}
                  wireCrossSection={w.connection.wireCrossSection}
                  isShort={w.toSymbol?.deviceKind === "terminalBlock" && !isTerminalZlaczka(w.toSymbol?.moduleRef)}
                  isExtraLong={isTerminalZlaczka(w.toSymbol?.moduleRef)}
                  isSquare={w.toSymbol?.deviceKind === "phaseIndicator"}
                  isDouble={(ferruleCounts.get(`${w.connection.toSymbolId}:${w.connection.toTerminal}:${w.resolvedIsToTop ? 'T' : 'B'}:${w.actualToDir}`) || 0) >= 2}
                  customOffset={w.toHS?.visualInset}
                  customLength={undefined}
                />
              </>
            )}

            {/* Hover / click hit area - Only in background mode */}
            {renderMode === "background" && (
              <path
                d={w.pathData}
                fill="none"
                stroke="transparent"
                strokeWidth={wireThickness + 24}
                strokeLinecap="butt"
                strokeLinejoin="round"
                style={{ cursor: "pointer", pointerEvents: "stroke" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onConnectionSelect(w.connection.id);
                }}
                onPointerEnter={() => setHoveredWireId(w.connection.id)}
                onPointerLeave={() => setHoveredWireId(null)}
              />
            )}

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
            {isSelected &&
              w.pointsArr &&
              w.pointsArr.map((pt, i) => {
                if (i === 0 || i === w.pointsArr.length - 2) return null; // Don't drag terminal exits/entries directly
                const nextPt = w.pointsArr[i + 1];
                if (!nextPt) return null;

                const isHorizontal = Math.abs(pt.y - nextPt.y) < 1;
                const isVertical = Math.abs(pt.x - nextPt.x) < 1;

                if (!isHorizontal && !isVertical) return null; // Only ortho segments

                return (
                  <line
                    key={`seg-${i}`}
                    x1={pt.x}
                    y1={pt.y}
                    x2={nextPt.x}
                    y2={nextPt.y}
                    stroke="transparent"
                    strokeWidth={24}
                    style={{
                      cursor: isHorizontal ? "ns-resize" : "ew-resize",
                      pointerEvents: "stroke",
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();

                      const bounds: { minY?: number; maxY?: number; minX?: number; maxX?: number } = {};
                      const hasFerrule = w.connection.ferruleColor && w.connection.ferruleColor !== "none";
                      const customRadius = w.connection.customRadius ?? 0;
                      
                      const fromFerruleLen = getFerruleLength(w.fromSymbol?.deviceKind, w.fromSymbol?.moduleRef);
                      const toFerruleLen = getFerruleLength(w.toSymbol?.deviceKind, w.toSymbol?.moduleRef);

                      const fromMargin = (hasFerrule ? Math.max(w.fromHS?.exitOffset ?? 40, fromFerruleLen) : (w.fromHS?.exitOffset ?? 40)) + customRadius + 20;
                      const toMargin = (hasFerrule ? Math.max(w.toHS?.exitOffset ?? 40, toFerruleLen) : (w.toHS?.exitOffset ?? 40)) + customRadius + 20;

                      if (isHorizontal) {
                        const startDir = w.connection.fromDirection || (w.resolvedIsFromTop ? "top" : "bottom");
                        const endDir = w.connection.toDirection || (w.resolvedIsToTop ? "top" : "bottom");
                        
                        if (startDir === "bottom") bounds.minY = Math.max(bounds.minY ?? -Infinity, w.fromPt.y + fromMargin);
                        if (startDir === "top") bounds.maxY = Math.min(bounds.maxY ?? Infinity, w.fromPt.y - fromMargin);
                        
                        if (endDir === "bottom") bounds.minY = Math.max(bounds.minY ?? -Infinity, w.toPt.y + toMargin);
                        if (endDir === "top") bounds.maxY = Math.min(bounds.maxY ?? Infinity, w.toPt.y - toMargin);
                      } else {
                        const startDir = w.connection.fromDirection;
                        const endDir = w.connection.toDirection;
                        
                        if (startDir === "right") bounds.minX = Math.max(bounds.minX ?? -Infinity, w.fromPt.x + fromMargin);
                        if (startDir === "left") bounds.maxX = Math.min(bounds.maxX ?? Infinity, w.fromPt.x - fromMargin);
                        
                        if (endDir === "right") bounds.minX = Math.max(bounds.minX ?? -Infinity, w.toPt.x + toMargin);
                        if (endDir === "left") bounds.maxX = Math.min(bounds.maxX ?? Infinity, w.toPt.x - toMargin);
                      }

                      if (!w.connection.points || w.connection.points.length === 0) {
                        // Auto routed: use draggingHandle
                        if (w.pointsArr.length === 6) {
                          if (i === 2) {
                            if (isHorizontal)
                              setDraggingHandle({
                                connectionId: w.connection.id,
                                type: "Y",
                                defaultChannelY: (w.pointsArr[1].y + w.pointsArr[4].y) / 2,
                                bounds,
                              });
                            else
                              setDraggingHandle({
                                connectionId: w.connection.id,
                                type: "X",
                                baseX: (w.pointsArr[1].x + w.pointsArr[4].x) / 2,
                                bounds,
                              });
                          }
                        } else if (w.pointsArr.length === 8) {
                          if (i === 2)
                            setDraggingHandle({
                              connectionId: w.connection.id,
                              type: "Y1",
                              exitY: w.pointsArr[1].y,
                              bounds,
                            });
                          else if (i === 3)
                            setDraggingHandle({
                              connectionId: w.connection.id,
                              type: "X",
                              baseX: (w.pointsArr[1].x + w.pointsArr[6].x) / 2,
                              bounds,
                            });
                          else if (i === 4)
                            setDraggingHandle({
                              connectionId: w.connection.id,
                              type: "Y2",
                              enterY: w.pointsArr[6].y,
                              bounds,
                            });
                        }
                      } else {
                        // Manual routed: use draggingSegment
                        const basePoints = w.connection.points;
                        const indexA = i - 2;
                        const indexB = i - 1;

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
                            bounds,
                          });
                        }
                      }

                      try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                      } catch (err) {}
                    }}
                  />
                );
              })}
          </g>
        );
      })}
    </g>
  );
}
