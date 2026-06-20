import type { CSSProperties } from "react";
import type { WorldRect } from "../../lib/dinRailCanvas/types";
import { buildWorldRectStyle } from "../../lib/dinRailCanvas/geometry";

export interface DinRailSelectionOverlayProps {
  selectedBounds: WorldRect | null;
  selectionRect: WorldRect | null;
  overlayLayerStyle: CSSProperties;
}

export function DinRailSelectionOverlay({
  selectedBounds,
  selectionRect,
  overlayLayerStyle,
}: DinRailSelectionOverlayProps) {
  const selectedBoundsStyle = selectedBounds ? buildWorldRectStyle(selectedBounds) : undefined;
  const selectionRectStyle = selectionRect ? buildWorldRectStyle(selectionRect) : undefined;
  if (!selectedBoundsStyle && !selectionRectStyle) return null;

  return (
    <div aria-hidden="true" style={overlayLayerStyle}>
      {selectedBoundsStyle && (
        <div
          style={{
            ...selectedBoundsStyle,
            border: "none",
            background: "transparent",
            borderRadius: "6px",
            pointerEvents: "none",
          }}
        />
      )}
      {selectionRectStyle && (
        <div
          style={{
            ...selectionRectStyle,
            border: "none",
            background: "var(--state-info-soft)",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
