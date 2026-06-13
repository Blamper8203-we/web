import { type SymbolItem } from "../../types/symbolItem";

interface DinRailConnectionsForegroundLayerProps {
  symbols: SymbolItem[];
  foregroundUrls: Record<string, string>;
}

export function DinRailConnectionsForegroundLayer({
  symbols,
  foregroundUrls,
}: DinRailConnectionsForegroundLayerProps) {
  return (
    <>
      {symbols.map((symbol) => {
        const url = foregroundUrls[symbol.id];
        if (!url) return null;

        return (
          <image
            key={symbol.id}
            href={url}
            x={symbol.x}
            y={symbol.y}
            width={symbol.width}
            height={symbol.height}
            preserveAspectRatio={(symbol.moduleRef || "").toLowerCase().includes("listwy do rozdzielnicy") || (symbol.moduleRef || "").toLowerCase().includes("gsu") ? "none" : "xMidYMid meet"}
            style={{ pointerEvents: "none" }}
          />
        );
      })}
    </>
  );
}
