import type { SymbolItem } from "../../types/symbolItem";
import type { DinRailCanvasRail } from "../DinRailCanvasPixi";
import { isTerminalZlaczka } from "../../lib/connections/connectionsLogic";
import { DinRailConnectionsForegroundLayer } from "./DinRailConnectionsForegroundLayer";

export interface DinRailTerminalBlocksForegroundLayerProps {
  rail: DinRailCanvasRail;
  worldTransform: string;
  symbols: SymbolItem[];
  foregroundUrls: Record<string, string>;
}

export function DinRailTerminalBlocksForegroundLayer({
  rail,
  worldTransform,
  symbols,
  foregroundUrls,
}: DinRailTerminalBlocksForegroundLayerProps) {
  const terminalBlocks = symbols.filter(
    (s) => s.deviceKind === "terminalBlock" && !isTerminalZlaczka(s.moduleRef),
  );
  if (terminalBlocks.length === 0) return null;

  return (
    <svg
      className="din-rail-foreground-layer"
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: `${rail.width}px`,
        height: `${rail.height}px`,
        transform: worldTransform,
        transformOrigin: "top left",
        pointerEvents: "none",
        zIndex: 25,
        overflow: "visible",
      }}
    >
      <DinRailConnectionsForegroundLayer
        symbols={terminalBlocks}
        foregroundUrls={foregroundUrls}
      />
    </svg>
  );
}
