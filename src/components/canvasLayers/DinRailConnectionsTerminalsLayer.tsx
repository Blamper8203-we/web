import type { TerminalHotspot } from "../../lib/modules/moduleTerminals";
import type { DrawingState, HoveredHotspot } from "../../hooks/useDinRailConnectionsInteraction";

interface DinRailConnectionsTerminalsLayerProps {
  hotspotsData: Array<{
    symbolId: string;
    moduleRef: string;
    symbol: any;
    hotspots: Array<TerminalHotspot & { absX: number; absY: number }>;
  }>;
  drawingState: DrawingState | null;
  hoveredHotspot: HoveredHotspot | null;
  highlightedTerminalKeys: Set<string>;
  handleHotspotPointerDown: (
    e: React.PointerEvent<SVGCircleElement>,
    hs: TerminalHotspot & { symbolId: string; absX: number; absY: number }
  ) => void;
  setHoveredHotspot: (hs: HoveredHotspot | null) => void;
}

export function DinRailConnectionsTerminalsLayer({
  hotspotsData,
  drawingState,
  hoveredHotspot,
  highlightedTerminalKeys,
  handleHotspotPointerDown,
  setHoveredHotspot,
}: DinRailConnectionsTerminalsLayerProps) {
  return (
    <>
      {hotspotsData.map((d) => {
        return d.hotspots.map((hs) => {
          const isTargetHovered =
            hoveredHotspot?.symbolId === d.symbolId && hoveredHotspot?.terminalName === hs.name;
          const isStartPoint =
            drawingState?.startSymbolId === d.symbolId && drawingState?.startTerminal === hs.name;

          // Visibility logic
          const isHighlighted = highlightedTerminalKeys.has(`${d.symbolId}:${hs.name}`);
          let ringOpacity = isHighlighted ? 1.0 : 0.6;
          if (isStartPoint || isTargetHovered) {
            ringOpacity = 1.0;
          }

          const isListwa = d.moduleRef && d.moduleRef.toLowerCase().includes("listwy do rozdzielnicy");
          const isZlaczka =
            !isListwa &&
            (d.symbol.isTerminalBlock ||
              (d.moduleRef &&
                (d.moduleRef.toLowerCase().includes("złącz") ||
                  d.moduleRef
                    .toLowerCase()
                    .replace(/ł/g, "l")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .includes("zlacz"))));
          
          let visualRadius = hs.radius ?? (isListwa ? 28.0 : isZlaczka ? 52.0 : 31.3);
          let hitRadius = Math.max(visualRadius + 4, 15);
          let baseStrokeW = Math.max(1.5, visualRadius * 0.12);
          let hoverStrokeW = baseStrokeW * 1.5;

          return (
            <g
              key={`${d.symbolId}-${hs.name}-${hs.isTop ? "top" : "bottom"}`}
              transform={`translate(${hs.absX}, ${hs.absY})`}
              style={{ transition: "opacity 0.2s ease" }}
            >
              {/* Invisible pointer hit target (wide for touch/easy mouse) */}
              <circle
                r={hitRadius}
                fill="transparent"
                style={{ cursor: drawingState ? "crosshair" : "pointer", pointerEvents: "all" }}
                onPointerDown={(e) =>
                  handleHotspotPointerDown(e, { ...hs, symbolId: d.symbolId, absX: hs.absX, absY: hs.absY })
                }
                onPointerEnter={() =>
                  setHoveredHotspot({
                    symbolId: d.symbolId,
                    terminalName: hs.name,
                    absX: hs.absX,
                    absY: hs.absY,
                    isTop: hs.isTop,
                    type: hs.type,
                  })
                }
                onPointerLeave={() => setHoveredHotspot(null)}
              />
              {/* Outer glow ring for currently drawing/hovered */}
              {(isTargetHovered || isStartPoint) && (
                <circle
                  r={Math.max(0.1, visualRadius - baseStrokeW / 2)}
                  fill="transparent"
                  stroke={isTargetHovered ? "#52c41a" : "var(--accent-primary)"}
                  strokeWidth={baseStrokeW}
                  style={{ pointerEvents: "none", animation: "pulse 1.5s infinite" }}
                />
              )}

              {/* Trace Path Highlight outer glow ring */}
              {isHighlighted && !isTargetHovered && !isStartPoint && (
                <circle
                  r={Math.max(0.1, visualRadius - baseStrokeW / 2)}
                  fill="transparent"
                  stroke="#22c55e"
                  strokeWidth={baseStrokeW}
                  style={{ pointerEvents: "none" }}
                  opacity={0.8}
                />
              )}

              {/* Visible green ring */}
              <circle
                r={Math.max(0.1, visualRadius - (isTargetHovered || isHighlighted ? hoverStrokeW : baseStrokeW) / 2)}
                fill="transparent"
                stroke={isTargetHovered || isHighlighted ? "#62C04B" : "#4caf50"}
                strokeWidth={isTargetHovered || isHighlighted ? hoverStrokeW : baseStrokeW}
                style={{
                  pointerEvents: "none",
                  opacity: ringOpacity,
                  transition: "all 0.2s ease",
                }}
              />

              {/* Terminal Name Text Overlay */}
              <g
                style={{
                  pointerEvents: "none",
                  opacity: isTargetHovered || isStartPoint ? 1 : 0,
                  transition: "opacity 0.2s",
                }}
              >
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
            </g>
          );
        });
      })}
    </>
  );
}
