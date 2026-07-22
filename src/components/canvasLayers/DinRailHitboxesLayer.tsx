import type { CSSProperties } from "react";
import type { SymbolItem } from "../../types/symbolItem";
import type { DinRailCanvasRail } from "../DinRailCanvas";
import type { WorldRect } from "../../lib/dinRailCanvas/types";
import { buildWorldRectStyle, getSymbolDesignationLabel } from "../../lib/dinRailCanvas/geometry";

type DesignationMap = Map<string, string>;

export interface DinRailHitboxesLayerProps {
  rail: DinRailCanvasRail;
  snappedSymbols: SymbolItem[];
  selectedIds: Set<string>;
  interactiveRects: Map<string, WorldRect>;
  automaticDesignationBySymbolId: DesignationMap;
  hitboxLayerStyle: CSSProperties;
  onBeginDragForSymbol: (symbolId: string) => (event: React.PointerEvent<HTMLElement>) => void;
}

export function DinRailHitboxesLayer({
  rail,
  snappedSymbols,
  selectedIds,
  interactiveRects,
  automaticDesignationBySymbolId,
  hitboxLayerStyle,
  onBeginDragForSymbol,
}: DinRailHitboxesLayerProps) {
  if (!rail.isVisible) return null;
  return (
    <div style={hitboxLayerStyle}>
      {snappedSymbols.map((symbol) => {
        const designationLabel = getSymbolDesignationLabel(symbol, automaticDesignationBySymbolId);
        return (
          <button
            key={`symbol-hitbox-${symbol.id}`}
            type="button"
            className={`din-rail-hitbox${selectedIds.has(symbol.id) ? " is-selected" : ""}`}
            style={{
              ...buildWorldRectStyle(interactiveRects.get(symbol.id) ?? symbol),
              pointerEvents: "auto",
            }}
            onPointerDown={onBeginDragForSymbol(symbol.id)}
            title={designationLabel || symbol.label}
            aria-label={designationLabel || symbol.label || symbol.type}
          />
        );
      })}
    </div>
  );
}
