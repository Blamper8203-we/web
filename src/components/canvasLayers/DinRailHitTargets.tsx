import React from "react";
import type { DrawingState, HoveredHotspot } from "../../hooks/connections/useConnectionsDrawing";
import type { SymbolItem } from "../../types/symbolItem";

export interface DinRailHitTargetsProps {
  hotspotsData: {
    symbolId: string;
    moduleRef: string | undefined;
    symbol: SymbolItem;
    hotspots: any[]; 
  }[];
  drawingState: DrawingState | null;
  hoveredHotspot: HoveredHotspot | null;
  setHoveredHotspot: (hotspot: HoveredHotspot | null) => void;
  handleHotspotPointerDown: (e: React.PointerEvent<any>, hotspot: any) => void;
}

export function DinRailHitTargets({
  hotspotsData,
  drawingState,
  hoveredHotspot,
  setHoveredHotspot,
  handleHotspotPointerDown,
}: DinRailHitTargetsProps) {
  return (
    <>
      {hotspotsData.map((d) => {
        return d.hotspots.map((hs) => {
          const isListwa = d.moduleRef && d.moduleRef.toLowerCase().includes("listwy do rozdzielnicy");
          const isZlaczka = !isListwa && (d.symbol.isTerminalBlock || (d.moduleRef && (d.moduleRef.toLowerCase().includes("złącz") || d.moduleRef.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("zlacz"))));
          const defaultHitRadius = isListwa ? 38 : isZlaczka ? 56 : 46;
          const hitRadius = hs.radius ? hs.radius + 10 : defaultHitRadius;

          return (
            <g
               key={`${d.symbolId}-${hs.name}-${hs.isTop ? 'top' : 'bottom'}`}
               transform={`translate(${hs.absX}, ${hs.absY})`}
            >
               {/* Invisible pointer hit target (wide for touch/easy mouse) */}
               <circle
                 r={hitRadius}
                 fill="transparent"
                 style={{ cursor: drawingState ? "crosshair" : "pointer", pointerEvents: "all" }}
                 onPointerDown={(e) => handleHotspotPointerDown(e, { ...hs, symbolId: d.symbolId, absX: hs.absX, absY: hs.absY })}
                 onPointerEnter={() => setHoveredHotspot({ symbolId: d.symbolId, terminalName: hs.name, absX: hs.absX, absY: hs.absY, isTop: hs.isTop, type: hs.type, direction: hs.direction })}
                 onPointerLeave={() => setHoveredHotspot(null)}
               />

               {/* Terminal Name Text Overlay (Only show if hovered target or start point, to keep it clean) */}
               {(() => {
                 const isTargetHovered = hoveredHotspot?.symbolId === d.symbolId && hoveredHotspot?.terminalName === hs.name && hoveredHotspot?.isTop === hs.isTop;
                 const isStartPoint = drawingState?.startSymbolId === d.symbolId && drawingState?.startTerminal === hs.name && drawingState?.isTop === hs.isTop;
                 return (
                   <g style={{ pointerEvents: "none", opacity: (isTargetHovered || isStartPoint) ? 1 : 0, transition: "opacity 0.2s" }}>
                     <rect
                       x={-12}
                       y={hs.isTop ? -32 : 16}
                       width={24}
                       height={16}
                       rx={3}
                       fill="#1e293b"
                       stroke="#475569"
                       strokeWidth={1}
                     />
                     <text
                       x={0}
                       y={hs.isTop ? -20 : 28}
                       textAnchor="middle"
                       fill="#f8fafc"
                       fontSize={10}
                       fontWeight={800}
                       fontFamily="Inter, Roboto, sans-serif"
                     >
                       {hs.name}
                     </text>
                   </g>
                 );
               })()}
            </g>
          );
        });
      })}
    </>
  );
}
