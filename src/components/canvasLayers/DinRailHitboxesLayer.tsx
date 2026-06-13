import type { WorldRect } from "./canvasTypes";
import type { SymbolItem } from "../../types/symbolItem";
import { buildWorldRectStyle } from "./canvasTypes";
import { getSymbolDesignationLabel } from "./canvasUtils";

interface DinRailHitboxesLayerProps {
  isVisible: boolean;
  snappedSymbols: SymbolItem[];
  selectedIds: Set<string>;
  interactiveRects: Map<string, WorldRect>;
  automaticDesignationBySymbolId: Map<string, string>;
  onBeginDrag: (event: React.PointerEvent<HTMLElement>, symbolId: string) => void;
  worldTransform: string;
}

export function DinRailHitboxesLayer({
  isVisible,
  snappedSymbols,
  selectedIds,
  interactiveRects,
  automaticDesignationBySymbolId,
  onBeginDrag,
  worldTransform,
}: DinRailHitboxesLayerProps) {
  if (!isVisible) {
    return null;
  }

  const hitboxLayerStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 5,
    pointerEvents: "none",
    transform: worldTransform,
    transformOrigin: "top left",
  };

  return (
    <div style={hitboxLayerStyle}>
      {snappedSymbols.map((symbol) => (
        <button
          key={`symbol-hitbox-${symbol.id}`}
          type="button"
          className={`din-rail-hitbox${selectedIds.has(symbol.id) ? " is-selected" : ""}`}
          style={{
            ...buildWorldRectStyle(interactiveRects.get(symbol.id) ?? symbol),
            pointerEvents: "auto",
          }}
          onPointerDown={(event) => onBeginDrag(event, symbol.id)}
          title={
            getSymbolDesignationLabel(symbol, automaticDesignationBySymbolId) ||
            symbol.label
          }
          aria-label={
            getSymbolDesignationLabel(symbol, automaticDesignationBySymbolId) ||
            symbol.label ||
            symbol.type
          }
        />
      ))}
    </div>
  );
}
