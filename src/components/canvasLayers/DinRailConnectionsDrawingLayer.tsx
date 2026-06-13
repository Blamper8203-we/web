import { useMemo } from "react";
import { pointsToRoundedPath, getOrthoExit, type Point } from "../../lib/routing/wireRoutingEngine";
import { WIRE_COLORS_MAP, WIRE_THICKNESS_MAP } from "../../lib/connections/connectionsLogic";
import type { DrawingState } from "../../hooks/useDinRailConnectionsInteraction";
import type { WireColor, FerruleColor } from "../../types/connectionItem";
import { FerruleGraphic } from "./FerruleGraphic";

interface DinRailConnectionsDrawingLayerProps {
  drawingState: DrawingState | null;
  explicitPoints: Point[];
  currentMousePos: Point | null;
  hoveredHotspot: {
    symbolId: string;
    terminalName: string;
    absX: number;
    absY: number;
    isTop: boolean;
    type: "phase" | "neutral" | "pe";
  } | null;
  drawingAlignment: {
    snappedPt: Point | null;
    guides: Array<{ x1: number; y1: number; x2: number; y2: number; hs: any }>;
  };
  drawingWarning: string | null;
  defaultWireSettings: {
    wireColor: WireColor;
    wireCrossSection: number;
    ferruleColor?: FerruleColor;
  };
}

export function DinRailConnectionsDrawingLayer({
  drawingState,
  explicitPoints,
  currentMousePos,
  hoveredHotspot,
  drawingAlignment,
  drawingWarning,
  defaultWireSettings,
}: DinRailConnectionsDrawingLayerProps) {
  // Compute preview path during drawing
  const previewPath = useMemo(() => {
    if (!drawingState || !currentMousePos) return null;
    const fromPt = { x: drawingState.startX, y: drawingState.startY };

    // Build sequence of points from start -> explicitPoints -> currentMousePos
    const pts = [fromPt, ...explicitPoints];

    // Get last point (could be start point or last explicit corner)
    const lastP = pts[pts.length - 1];

    const previewPoints: Point[] = [...pts];

    if (hoveredHotspot) {
      const toPt = { x: hoveredHotspot.absX, y: hoveredHotspot.absY };
      const endEntry = getOrthoExit(toPt, lastP);
      const corner =
        endEntry.axis === "y" ? { x: endEntry.x, y: lastP.y } : { x: lastP.x, y: endEntry.y };

      previewPoints.push(corner);
      previewPoints.push({ x: endEntry.x, y: endEntry.y });
      previewPoints.push(toPt);
    } else {
      // Use snapped preview point if calculated
      const targetPt = drawingAlignment.snappedPt || currentMousePos;
      let previewX = targetPt.x;
      let previewY = targetPt.y;

      if (Math.abs(targetPt.x - lastP.x) > Math.abs(targetPt.y - lastP.y)) {
        previewY = lastP.y;
      } else {
        previewX = lastP.x;
      }
      previewPoints.push({ x: previewX, y: previewY });
    }

    return pointsToRoundedPath(previewPoints, 0); // Preview uses sharp corners by default
  }, [drawingState, currentMousePos, hoveredHotspot, explicitPoints, drawingAlignment]);

  if (!previewPath || !drawingState) return null;

  return (
    <g style={{ pointerEvents: "none" }}>
      {/* Oś startowa i końcowa (przerywana linia) */}
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
        d={previewPath}
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
        d={previewPath}
        fill="none"
        stroke={
          drawingWarning
            ? "#991b1b"
            : defaultWireSettings.wireColor === "black"
              ? "#888888"
              : WIRE_COLORS_MAP[defaultWireSettings.wireColor]?.dark || "#1a1a1a"
        }
        strokeWidth={WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection] + 1.8}
        strokeLinecap="butt"
        strokeLinejoin="round"
        style={{ pointerEvents: "none", opacity: 0.9 }}
      />
      {/* 2. Main color (Midtone) */}
      <path
        d={previewPath}
        fill="none"
        stroke={
          drawingWarning
            ? "#ef4444"
            : defaultWireSettings.wireColor === "green-yellow"
              ? "#2e7d32"
              : WIRE_COLORS_MAP[defaultWireSettings.wireColor]?.hex || "#555"
        }
        strokeWidth={WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection]}
        strokeLinecap="butt"
        strokeLinejoin="round"
        style={{ pointerEvents: "none", opacity: 0.9 }}
      />
      {/* 3. Yellow stripes overlay for PE */}
      {!drawingWarning && defaultWireSettings.wireColor === "green-yellow" && (
        <path
          d={previewPath}
          fill="none"
          stroke="#FFD600"
          strokeWidth={WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection]}
          strokeDasharray={`${WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection] * 1.2} ${
            WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection] * 1.2
          }`}
          strokeLinecap="butt"
          strokeLinejoin="round"
          style={{ pointerEvents: "none", opacity: 0.9 }}
        />
      )}

      {/* Ferrule at start point */}
      {defaultWireSettings.ferruleColor && defaultWireSettings.ferruleColor !== "none" && (
        <FerruleGraphic
          x={drawingState.startX}
          y={drawingState.startY}
          direction={drawingState.direction || (drawingState.isTop ? "top" : "bottom")}
          color={defaultWireSettings.ferruleColor}
          wireThickness={WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection]}
        />
      )}

      {/* Ferrule at end point (if hovering hotspot) */}
      {defaultWireSettings.ferruleColor && defaultWireSettings.ferruleColor !== "none" && hoveredHotspot && (
        <FerruleGraphic
          x={hoveredHotspot.absX}
          y={hoveredHotspot.absY}
          direction={hoveredHotspot.isTop ? "top" : "bottom"}
          color={defaultWireSettings.ferruleColor}
          wireThickness={WIRE_THICKNESS_MAP[defaultWireSettings.wireCrossSection]}
        />
      )}
    </g>
  );
}
