
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
  /**
   * Current zoom (1.0 = 100%). The whole SVG is wrapped in a `<g>` with
   * `scale(${zoom})`, so SVG text fontSize is in user units and the
   * effective pixel size = fontSize * zoom. We invert the zoom here so
   * the effective size stays in the 10-18px range regardless of zoom,
   * matching DinRailDesignationLabelsOverlay.tsx (clamp 13.5*scale, 10, 18).
   */
  zoom: number;
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
  zoom,
}: DinRailRenderedSymbolsProps) {
  // SVG text fontSize is in user units; effective pixels = fontSize * zoom.
  // Invert the clamp from DinRailDesignationLabelsOverlay (effective 10..18px)
  // so the rendered label stays in the same readable range at any zoom.
  const labelFontSize = Math.min(
    Math.max(13.5 / zoom, 10 / zoom),
    18 / zoom
  );
  return (
    <>
      {symbols.filter(filterFn).map((symbol) => {
        // Match DinRailDesignationLabelsOverlay's vertical placement: top of
        // text sits 4px below the module's bottom edge.
        //
        // We use dominantBaseline="text-before-edge" so that y is the top of
        // the text, not the baseline. This avoids guessing cap height per
        // font, which is what made the previous attempt (baseline + cap
        // height factor) sit too low. y is in user units, so 4/zoom converts
        // the desired 4px effective offset back to user units at any zoom.
        const labelY = symbol.height + 4 / zoom;
        return (
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
            y={labelY}
            textAnchor="middle"
            dominantBaseline="text-before-edge"
            fill="#f8fafc"
            fontSize={labelFontSize}
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
        );
      })}
    </>
  );
}
