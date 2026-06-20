
import { WIRE_COLORS_MAP, WIRE_THICKNESS_MAP } from "../../lib/dinRailCanvas/constants";
import type { DraggingHandle, DraggingSegment } from "../../hooks/connections/useConnectionsMutations";

export interface DinRailConnectionWiresProps {
  groupedWiredPaths: any[]; // Or properly typed from useConnectionsGeometry return
  selectedConnectionId: string | null;
  onConnectionSelect: (id: string | null) => void;
  setHoveredWireId: (id: string | null) => void;
  highlightedComponent: {
    terminalKeys: Set<string>;
    connectionIds: Set<string>;
  };
  getLogicalPoint: (clientX: number, clientY: number) => { x: number; y: number };
  setDraggingHandle: (handle: DraggingHandle | null) => void;
  setDraggingSegment: (segment: DraggingSegment | null) => void;
}

export function DinRailConnectionWires({
  groupedWiredPaths,
  selectedConnectionId,
  onConnectionSelect,
  setHoveredWireId,
  highlightedComponent,
  getLogicalPoint,
  setDraggingHandle,
  setDraggingSegment,
}: DinRailConnectionWiresProps) {
  return (
    <>
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
                strokeWidth={wireThickness * 0.45}
                strokeLinecap="butt"
                strokeLinejoin="round"
                style={{ pointerEvents: "none" }}
              />
            )}

            {/* 3.1. 3D Highlight (Cylindrical glossy sheen) */}
            <path
              d={w.pathData}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={Math.max(2, wireThickness * 0.35)}
              strokeLinecap="butt"
              strokeLinejoin="round"
              style={{ pointerEvents: "none" }}
            />
            <path
              d={w.pathData}
              fill="none"
              stroke="rgba(255, 255, 255, 0.18)"
              strokeWidth={Math.max(1, wireThickness * 0.1)}
              strokeLinecap="butt"
              strokeLinejoin="round"
              style={{ pointerEvents: "none" }}
            />

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
            {isSelected && w.pointsArr && w.pointsArr.map((pt: any, i: number) => {
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
    </>
  );
}
