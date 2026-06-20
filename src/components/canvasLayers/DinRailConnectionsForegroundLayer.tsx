import { type SymbolItem } from "../../types/symbolItem";

interface DinRailConnectionsForegroundLayerProps {
  symbols: SymbolItem[];
  foregroundUrls: Record<string, string>;
  onSymbolSelect?: (id: string | null) => void;
  isDrawing?: boolean;
}

export function DinRailConnectionsForegroundLayer({
  symbols,
  foregroundUrls,
  onSymbolSelect,
  isDrawing = false,
}: DinRailConnectionsForegroundLayerProps) {
  return (
    <>
      {symbols.map((symbol) => {
        const url = foregroundUrls[symbol.id];
        if (!url) return null;

        return (
          <g 
            key={symbol.id}
            onPointerDown={(e) => {
              if (isDrawing) return;
              e.stopPropagation();
              onSymbolSelect?.(symbol.id);
            }}
            style={{ cursor: "pointer" }}
          >
            <image
              href={url}
              x={symbol.x}
              y={symbol.y}
              width={symbol.width}
              height={symbol.height}
              preserveAspectRatio={(symbol.moduleRef || "").toLowerCase().includes("listwy do rozdzielnicy") || (symbol.moduleRef || "").toLowerCase().includes("gsu") ? "none" : "xMidYMid meet"}
            />
          </g>
        );
      })}
    </>
  );
}
