import type { ConnectionItem } from "../../types/connectionItem";

const WIRE_COLORS_MAP: Record<string, { hex: string; highlight: string; dark: string }> = {
  black: { hex: "#333333", highlight: "#666666", dark: "#000000" },
  brown: { hex: "#8B4513", highlight: "#c4763a", dark: "#4a2007" },
  grey: { hex: "#888888", highlight: "#bbbbbb", dark: "#555555" },
  gray: { hex: "#888888", highlight: "#bbbbbb", dark: "#555555" },
  blue: { hex: "#1565C0", highlight: "#4a9ed6", dark: "#0a2f6b" },
  "green-yellow": { hex: "#2e7d32", highlight: "#5ab55e", dark: "#143b16" },
  pe: { hex: "#2e7d32", highlight: "#5ab55e", dark: "#143b16" },
  red: { hex: "#ef4444", highlight: "#f87171", dark: "#991b1b" },
  other: { hex: "#a855f7", highlight: "#c084fc", dark: "#6b21a8" },
};

const WIRE_THICKNESS_MAP: Record<number, number> = {
  1.5: 24.0,
  2.5: 30.0,
  4.0: 36.0,
  6.0: 42.0,
  10.0: 50.0,
  16.0: 60.0,
};

interface DinRailWiresLayerProps {
  isVisible: boolean;
  showWires: boolean;
  width: number;
  height: number;
  worldTransform: string;
  groupedWiredPaths: Array<{
    connection: ConnectionItem;
    fromPt: { x: number; y: number };
    toPt: { x: number; y: number };
    fromHS: { isTop: boolean; name: string; x: number; y: number };
    toHS: { isTop: boolean; name: string; x: number; y: number };
    pathData: string;
    parallelIndex: number;
    parallelCount: number;
  } | null>;
}

export function DinRailWiresLayer({
  isVisible,
  showWires,
  width,
  height,
  worldTransform,
  groupedWiredPaths,
}: DinRailWiresLayerProps) {
  if (!isVisible || !showWires || groupedWiredPaths.length === 0) {
    return null;
  }

  return (
    <svg
      className="din-rail-wires-layer"
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: `${width}px`,
        height: `${height}px`,
        transform: worldTransform,
        transformOrigin: "top left",
        pointerEvents: "none",
        zIndex: 1.5,
        overflow: "visible",
      }}
    >
      <defs>
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

      {groupedWiredPaths.map((w) => {
        if (!w) return null;
        const wireThickness = WIRE_THICKNESS_MAP[w.connection.wireCrossSection] || 4.5;

        const offsetDistance = 6;
        const parallelCount = w.parallelCount || 1;
        const offset = parallelCount > 1 ? (w.parallelIndex - (parallelCount - 1) / 2) * offsetDistance : 0;
        const x1 = w.fromPt.x + (w.fromHS.isTop ? offset : -offset);
        const x2 = w.toPt.x + (w.toHS.isTop ? offset : -offset);

        const ferruleExtension = Math.max(16, Math.round(wireThickness * 0.4));
        const ferruleLength = 115 + ferruleExtension;
        const FERRULE_INSET = 22; // Offset od środka śruby do krawędzi plastiku

        const fromY1 = w.fromPt.y + (w.fromHS.isTop ? -FERRULE_INSET : FERRULE_INSET);
        const fromY2 = w.fromPt.y + (w.fromHS.isTop ? -(ferruleLength + FERRULE_INSET) : ferruleLength + FERRULE_INSET);

        const toY1 = w.toPt.y + (w.toHS.isTop ? -FERRULE_INSET : FERRULE_INSET);
        const toY2 = w.toPt.y + (w.toHS.isTop ? -(ferruleLength + FERRULE_INSET) : ferruleLength + FERRULE_INSET);

        return (
          <g key={w.connection.id}>
            <line
              x1={x1}
              y1={fromY1}
              x2={x1}
              y2={fromY2}
              stroke="#000000"
              strokeWidth={wireThickness + 3.0}
              strokeLinecap="butt"
            />
            <line
              x1={x2}
              y1={toY1}
              x2={x2}
              y2={toY2}
              stroke="#000000"
              strokeWidth={wireThickness + 3.0}
              strokeLinecap="butt"
            />
            {/* 1. Dark outline base */}
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
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
