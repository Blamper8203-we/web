
import type { SymbolItem } from "../../types/symbolItem";
import { getSymbolAssetUrl } from "../../lib/connections/canvasHelpers";

export interface DinRailRenderedSymbolsProps {
  symbols: SymbolItem[];
  hoveredSymbolId: string | null;
  setHoveredSymbolId: (id: string | null) => void;
  filterFn: (symbol: SymbolItem) => boolean;
  /** Override URLs per symbol ID — e.g. base SVG with Osłona group hidden. */
  overrideUrls?: Record<string, string>;
  onSymbolSelect?: (id: string | null) => void;
  selectedSymbolId?: string | null;
  isDrawing?: boolean;
}

export function DinRailRenderedSymbols({
  symbols,
  hoveredSymbolId,
  setHoveredSymbolId,
  filterFn,
  overrideUrls = {},
  onSymbolSelect,
  selectedSymbolId,
  isDrawing = false,
}: DinRailRenderedSymbolsProps) {
  return (
    <>
      {symbols.filter(filterFn).map((symbol) => (
        <g
          key={symbol.id}
          transform={`translate(${symbol.x}, ${symbol.y})`}
          onPointerEnter={() => setHoveredSymbolId(symbol.id)}
          onPointerLeave={() => setHoveredSymbolId(null)}
          onPointerDown={(e) => {
            if (isDrawing) {
              return; // Let the event bubble to the SVG to create a routing waypoint
            }
            e.stopPropagation();
            onSymbolSelect?.(symbol.id);
          }}
          style={{ cursor: "pointer" }}
        >
          <rect
            width={symbol.width}
            height={symbol.height}
            fill={selectedSymbolId === symbol.id ? "rgba(30, 41, 59, 0.15)" : "rgba(30, 41, 59, 0.05)"}
            stroke={(hoveredSymbolId === symbol.id || selectedSymbolId === symbol.id) ? "var(--accent-primary)" : "transparent"}
            strokeWidth={4}
            style={{ transition: "stroke 0.15s ease" }}
          />
          <image
            href={overrideUrls[symbol.id] ?? getSymbolAssetUrl(symbol)}
            width={symbol.width}
            height={symbol.height}
            preserveAspectRatio={(symbol.moduleRef || "").toLowerCase().includes("listwy do rozdzielnicy") || (symbol.moduleRef || "").toLowerCase().includes("gsu") ? "none" : "xMidYMid meet"}
            style={{ pointerEvents: "none" }}
          />
          {/* Reference designation / Name indicator (Floating text below the module, matching main workspace) */}
          <text
            x={symbol.width / 2}
            y={symbol.height + 25}
            textAnchor="middle"
            fill="#f8fafc"
            fontSize={12}
            fontWeight={700}
            fontFamily="Segoe UI, Arial, sans-serif"
            style={{
              pointerEvents: "none",
              textShadow: "0 0 1px #111827, 0 0 3px #111827, 0 0 5px #111827",
              userSelect: "none"
            }}
          >
            {symbol.referenceDesignation || symbol.label || "Aparat"}
          </text>
        </g>
      ))}
    </>
  );
}
