import type { SymbolItem } from "../../types/symbolItem";
import type { DinRailCanvasRail } from "../DinRailCanvasPixi";
import type { PreparedSymbolAsset } from "../../hooks/useDinRailPreparedAssets";
import type { WorldPoint } from "../../lib/dinRailCanvas/types";
import { isTerminalZlaczka } from "../../lib/connections/connectionsLogic";

export interface DinRailSymbolsLayerProps {
  rail: DinRailCanvasRail;
  pan: WorldPoint;
  scale: number;
  snappedSymbols: SymbolItem[];
  selectedIds: Set<string>;
  assetMap: Map<string, PreparedSymbolAsset>;
  bindMeasuredNode: (symbolId: string, node: HTMLDivElement | null) => void;
}

export function DinRailSymbolsLayer({
  rail,
  pan,
  scale,
  snappedSymbols,
  selectedIds,
  assetMap,
  bindMeasuredNode,
}: DinRailSymbolsLayerProps) {
  if (!rail.isVisible) return null;

  return (
    <>
      {snappedSymbols.map((symbol) => {
        const isListwa = symbol.deviceKind === "terminalBlock" && !isTerminalZlaczka(symbol.moduleRef);
        const asset = assetMap.get(symbol.id);
        if (!asset) return null;

        return (
          <div
            key={symbol.id}
            ref={(node) => bindMeasuredNode(symbol.id, node)}
            className={`din-rail-symbol-preview${selectedIds.has(symbol.id) ? " is-selected" : ""}`}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: `${symbol.width}px`,
              height: `${symbol.height}px`,
              transform: `translate(${symbol.x * scale + pan.x}px, ${symbol.y * scale + pan.y}px) scale(${scale})`,
              transformOrigin: "top left",
              pointerEvents: "none",
              zIndex: isListwa ? 12 : 20,
            }}
            dangerouslySetInnerHTML={
              asset.namespacedMarkup ? { __html: asset.namespacedMarkup } : undefined
            }
          >
            {asset.imageSrc && <img alt="" draggable={false} src={asset.imageSrc} />}
          </div>
        );
      })}
    </>
  );
}
