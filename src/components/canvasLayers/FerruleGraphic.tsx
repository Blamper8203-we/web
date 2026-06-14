import { FERRULE_COLORS_MAP, getAutoFerruleColor } from "../../lib/connections/connectionsLogic";
import type { FerruleColor } from "../../types/connectionItem";

interface FerruleGraphicProps {
  x: number;
  y: number;
  direction: "top" | "bottom" | "left" | "right" | "auto-horizontal" | "auto-vertical";
  color: FerruleColor;
  wireThickness: number;
  wireCrossSection?: number;
  isDouble?: boolean;
  isShort?: boolean;
  isExtraLong?: boolean;
  isSquare?: boolean;
  customOffset?: number;
  customLength?: number;
}

export function FerruleGraphic({ x, y, direction, color, wireThickness, wireCrossSection, isDouble, isShort, isExtraLong, isSquare, customOffset, customLength }: FerruleGraphicProps) {
  if (!color || color === "none") return null;

  const actualColor = color === "auto" ? getAutoFerruleColor(wireCrossSection || 2.5) : color;
  const ferruleColorData = FERRULE_COLORS_MAP[actualColor];
  if (!ferruleColorData) return null;

  // Ferrule is slightly thicker than the wire and has a fixed length
  const thickness = isDouble ? (wireThickness * 2 + 4) : (wireThickness + 6);
  const length = customLength !== undefined ? customLength : (isSquare ? thickness + 4 : isExtraLong ? 230 : isShort ? 80 : 150); // Modified length based on props
  const offset = customOffset !== undefined ? customOffset : (isSquare ? 0 : 10); // Distance from terminal point (screw) to the start of the visible plastic collar

  let rx, ry, width, height;

  if (direction === "top" || direction === "auto-vertical") {
    width = thickness;
    height = length;
    rx = x - thickness / 2;
    ry = y - length - offset;
  } else if (direction === "bottom") { // Wire goes DOWN from terminal
    width = thickness;
    height = length;
    rx = x - thickness / 2;
    ry = y + offset;
  } else if (direction === "left") { // Wire goes LEFT from terminal
    width = length;
    height = thickness;
    rx = x - length - offset;
    ry = y - thickness / 2;
  } else if (direction === "right" || direction === "auto-horizontal") {
    width = length;
    height = thickness;
    rx = x + offset;
    ry = y - thickness / 2;
  } else {
    return null;
  }

  return (
    <g style={{ pointerEvents: "none" }}>
      {/* Ferrule background / dark border */}
      <rect
        x={rx - 1}
        y={ry - 1}
        width={width + 2}
        height={height + 2}
        fill={ferruleColorData.dark}
        rx={2}
      />
      {/* Ferrule main color */}
      <rect
        x={rx}
        y={ry}
        width={width}
        height={height}
        fill={ferruleColorData.hex}
        rx={2}
      />
      {/* Highlight for 3D effect */}
      <rect
        x={direction === "left" || direction === "right" ? rx : rx + 2}
        y={direction === "top" || direction === "bottom" ? ry : ry + 2}
        width={direction === "left" || direction === "right" ? width : Math.max(1, width / 4)}
        height={direction === "top" || direction === "bottom" ? height : Math.max(1, height / 4)}
        fill={ferruleColorData.highlight}
        opacity={0.5}
        rx={1}
      />
    </g>
  );
}
