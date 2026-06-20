
import { WIRE_COLORS_MAP, WIRE_THICKNESS_MAP } from "../../lib/dinRailCanvas/constants";
import type { DefaultWireSettings } from "../../lib/connections/connectionsLogic";
import type { DrawingState } from "../../hooks/connections/useConnectionsDrawing";

export interface DinRailDrawingPreviewProps {
  previewPath: { pathData: string } | null;
  drawingState: DrawingState | null;
  drawingAlignment: {
    snappedPt?: { x: number; y: number } | null;
    guides: { x1: number; y1: number; x2: number; y2: number; hs: any }[];
  };
  currentMousePos: { x: number; y: number } | null;
  defaultWireSettings: DefaultWireSettings;
  drawingWarning: string | null;
}

export function DinRailDrawingPreview({
  previewPath,
  drawingState,
  drawingAlignment,
  currentMousePos,
  defaultWireSettings,
  drawingWarning,
}: DinRailDrawingPreviewProps) {
  if (!previewPath || !drawingState) return null;

  return (
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
  );
}
