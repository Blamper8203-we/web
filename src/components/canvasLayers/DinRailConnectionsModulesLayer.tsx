import { type SymbolItem } from "../../types/symbolItem";
import { getSymbolAssetUrl } from "../../lib/connections/connectionsLogic";

interface DinRailConnectionsModulesLayerProps {
  symbols: SymbolItem[];
  hoveredSymbolId: string | null;
  setHoveredSymbolId: (id: string | null) => void;
}

export function DinRailConnectionsModulesLayer({
  symbols,
  hoveredSymbolId,
  setHoveredSymbolId,
}: DinRailConnectionsModulesLayerProps) {
  return (
    <>
      {symbols.map((symbol) => (
        <g
          key={symbol.id}
          transform={`translate(${symbol.x}, ${symbol.y})`}
          onPointerEnter={() => setHoveredSymbolId(symbol.id)}
          onPointerLeave={() => setHoveredSymbolId(null)}
          style={{ cursor: "pointer" }}
        >
          <rect
            width={symbol.width}
            height={symbol.height}
            fill="rgba(30, 41, 59, 0.05)"
            stroke={hoveredSymbolId === symbol.id ? "var(--accent-primary)" : "transparent"}
            strokeWidth={4}
            style={{ transition: "stroke 0.15s ease" }}
          />
          <image
            href={getSymbolAssetUrl(symbol)}
            width={symbol.width}
            height={symbol.height}
            preserveAspectRatio={
              (symbol.moduleRef || "").toLowerCase().includes("listwy do rozdzielnicy") ||
              (symbol.moduleRef || "").toLowerCase().includes("gsu")
                ? "none"
                : "xMidYMid meet"
            }
            style={{ pointerEvents: "none" }}
          />
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
              userSelect: "none",
            }}
          >
            {symbol.referenceDesignation || symbol.label || "Aparat"}
          </text>
        </g>
      ))}
    </>
  );
}
