import type { CSSProperties } from "react";
import type { SymbolItem } from "../../types/symbolItem";
import type { DinRailCanvasRail } from "../DinRailCanvas";
import type { WorldPoint } from "../../lib/dinRailCanvas/types";
import { clamp, getSymbolDesignationLabel } from "../../lib/dinRailCanvas/geometry";

type DesignationMap = Map<string, string>;

export interface DinRailDesignationLabelsOverlayProps {
  rail: DinRailCanvasRail;
  pan: WorldPoint;
  scale: number;
  snappedSymbols: SymbolItem[];
  automaticDesignationBySymbolId: DesignationMap;
  labelOverlayStyle: CSSProperties;
}

export function DinRailDesignationLabelsOverlay({
  rail,
  pan,
  scale,
  snappedSymbols,
  automaticDesignationBySymbolId,
  labelOverlayStyle,
}: DinRailDesignationLabelsOverlayProps) {
  if (!rail.isVisible) return null;
  return (
    <div aria-hidden="true" style={labelOverlayStyle}>
      {snappedSymbols.map((symbol) => {
        const designationLabel = getSymbolDesignationLabel(symbol, automaticDesignationBySymbolId);
        if (!designationLabel) return null;

        return (
          <div
            key={`symbol-label-${symbol.id}`}
            style={{
              position: "absolute",
              left:
                symbol.x * scale
                + pan.x
                + Math.max(symbol.width * scale, 48 * scale) / 2,
              top: symbol.y * scale + pan.y + symbol.height * scale + 4,
              transform: "translateX(-50%)",
              transformOrigin: "center",
              color: "#f8fafc",
              fontFamily: "Segoe UI, Arial, sans-serif",
              fontSize: `${clamp(13.5 * scale, 10, 18)}px`,
              fontWeight: 700,
              lineHeight: 1.1,
              textShadow:
                "0 0 1px #111827, 0 0 3px #111827, 0 0 5px #111827",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {designationLabel}
          </div>
        );
      })}
    </div>
  );
}
