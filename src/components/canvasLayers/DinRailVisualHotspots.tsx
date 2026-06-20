
import type { DrawingState, HoveredHotspot } from "../../hooks/connections/useConnectionsDrawing";
import type { SymbolItem } from "../../types/symbolItem";

export interface DinRailVisualHotspotsProps {
  hotspotsData: {
    symbolId: string;
    moduleRef: string | undefined;
    symbol: SymbolItem;
    hotspots: any[]; 
  }[];
  hoveredHotspot: HoveredHotspot | null;
  drawingState: DrawingState | null;
  highlightedComponent: {
    terminalKeys: Set<string>;
    connectionIds: Set<string>;
  };
}

export function DinRailVisualHotspots({
  hotspotsData,
  hoveredHotspot,
  drawingState,
  highlightedComponent,
}: DinRailVisualHotspotsProps) {
  return (
    <>
      {hotspotsData.map((d) => {
        return d.hotspots.map((hs) => {
          const isTargetHovered = hoveredHotspot?.symbolId === d.symbolId && hoveredHotspot?.terminalName === hs.name && hoveredHotspot?.isTop === hs.isTop;
          const isStartPoint = drawingState?.startSymbolId === d.symbolId && drawingState?.startTerminal === hs.name && drawingState?.isTop === hs.isTop;

          // Visibility logic (terminals remain visible with 0.6 opacity even when connected)
          const isHighlighted = highlightedComponent.terminalKeys.has(`${d.symbolId}:${hs.name}:${hs.isTop ? 'T' : 'B'}`);
          let ringOpacity = isHighlighted ? 1.0 : 0.6;
          if (isStartPoint || isTargetHovered) {
            ringOpacity = 1.0;
          }

          const isListwa = d.moduleRef && d.moduleRef.toLowerCase().includes("listwy do rozdzielnicy");
          const isZlaczka = !isListwa && (d.symbol.isTerminalBlock || (d.moduleRef && (d.moduleRef.toLowerCase().includes("złącz") || d.moduleRef.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("zlacz"))));
          const defaultVisualRadius = isListwa ? 28.0 : isZlaczka ? 52.0 : 31.3;
          const visualRadius = hs.radius ?? defaultVisualRadius;

          return (
            <g
               key={`${d.symbolId}-${hs.name}-${hs.isTop ? 'top' : 'bottom'}`}
               transform={`translate(${hs.absX}, ${hs.absY})`}
               style={{ transition: "opacity 0.2s ease" }}
            >
               {/* Outer glow ring for currently drawing/hovered */}
               {(isTargetHovered || isStartPoint) && (
                 <circle
                   r={visualRadius}
                   fill="transparent"
                   stroke={isTargetHovered ? "#52c41a" : "var(--accent-primary)"}
                   strokeWidth={4}
                   style={{ pointerEvents: "none", animation: "pulse 1.5s infinite" }}
                 />
               )}

               {/* Trace Path Highlight outer glow ring */}
               {isHighlighted && !isTargetHovered && !isStartPoint && (
                 <circle
                   r={visualRadius}
                   fill="transparent"
                   stroke="#22c55e"
                   strokeWidth={4}
                   style={{ pointerEvents: "none" }}
                   opacity={0.8}
                 />
               )}

               {/* Visible green ring */}
                <circle
                  r={visualRadius}
                  fill="transparent"
                  stroke={isTargetHovered || isHighlighted ? "#62C04B" : "#4caf50"}
                  strokeWidth={isTargetHovered || isHighlighted ? 6 : 4}
                  style={{ 
                    pointerEvents: "none", 
                    opacity: ringOpacity,
                    transition: "all 0.2s ease"
                  }}
                />
            </g>
          );
        });
      })}
    </>
  );
}
