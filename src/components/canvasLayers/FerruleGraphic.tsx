import { FERRULE_COLORS_MAP, getAutoFerruleColor } from "../../lib/connections/connectionsLogic";
import type { FerruleColor } from "../../types/connectionItem";
import { isDistributionBlockSymbol, type SymbolBase } from "../../types/symbolItem";

/**
 * Returns the (customOffset, customLength) pair for FerruleGraphic so that
 * the ferrule covers the gap between the screw and the module's plastic edge.
 *
 * For distribution-block pins (e.g. "Blok rozdzielczy 4-7") all 28 wires
 * fan out below the block, so the ferrule MUST be drawn as a thin strip
 * reaching from the screw to the bottom edge of the housing — otherwise
 * the ferrule lands under the module edge and looks like a misplaced bead.
 *
 * The original call sites used `visualInset` as `customOffset` directly,
 * which is the distance from screw to housing edge. That value is huge
 * (e.g. 920px for an upper pin) and combined with the default length=80
 * it placed the ferrule under the edge. Splitting it as
 * (offset=10, length=visualInset-10) keeps the ferrule anchored at the
 * screw while still reaching the edge.
 *
 * For non-distribution modules (MCB, RCD, plain zlaczka) we keep the legacy
 * rendering: `customOffset=visualInset, customLength=undefined` — it has
 * been the documented behaviour for a long time and many users may have
 * tuned their layouts against it. Only distribution blocks need the new
 * geometric split, because their `visualInset` is huge and asymmetric.
 */
export function getFerruleRenderInset(
  visualInset: number | undefined,
  isDistributionBlock: boolean,
): { customOffset: number; customLength: number | undefined } {
  if (!isDistributionBlock) {
    // Legacy: pass visualInset through as offset, keep default length.
    return { customOffset: visualInset ?? 10, customLength: undefined };
  }
  if (visualInset === undefined) {
    return { customOffset: 10, customLength: undefined };
  }
  return { customOffset: 10, customLength: Math.max(20, visualInset - 10) };
}

/**
 * Convenience: compute the ferrule render inset straight from a SymbolItem
 * + hotspot, so call sites don't have to import `isDistributionBlockSymbol`
 * themselves.
 */
export function getFerruleRenderInsetForSymbol(
  symbol: Partial<SymbolBase> | undefined,
  hotspot: { visualInset?: number } | undefined,
): { customOffset: number; customLength: number | undefined } {
  const isDist = !!symbol && isDistributionBlockSymbol(symbol);
  return getFerruleRenderInset(hotspot?.visualInset, isDist);
}

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
