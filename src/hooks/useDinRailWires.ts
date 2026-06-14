import { useMemo } from "react";
import type { ConnectionItem } from "../types/connectionItem";
import type { SymbolItem } from "../types/symbolItem";
import { getSymbolTerminals, findTerminalByName, resolveConnectionIsFromTop, resolveConnectionIsToTop } from "../lib/modules/moduleTerminals";
import { isDistributionBlockSymbol } from "../types/symbolItem";
import { calculateWirePath } from "../lib/routing/wireRoutingEngine";

export function useDinRailWires(connections: ConnectionItem[], symbols: SymbolItem[]) {
  return useMemo(() => {
    const keyCounts: Record<string, number> = {};
    const keyIndices: Record<string, number> = {};

    return connections
      .map((conn) => {
        const fromSymbol = symbols.find((s) => s.id === conn.fromSymbolId);
        const toSymbol = symbols.find((s) => s.id === conn.toSymbolId);

        if (!fromSymbol || !toSymbol) return null;

        const fromHS = findTerminalByName(getSymbolTerminals(fromSymbol), conn.fromTerminal, conn.isFromTop);
        const toHS = findTerminalByName(getSymbolTerminals(toSymbol), conn.toTerminal, conn.isToTop);

        if (!fromHS || !toHS) return null;

        const fromPt = { x: fromSymbol.x + fromHS.x, y: fromSymbol.y + fromHS.y };
        const toPt = { x: toSymbol.x + toHS.x, y: toSymbol.y + toHS.y };

        const key = [conn.fromSymbolId, conn.toSymbolId].sort().join(":");
        const totalCount = keyCounts[key] || 0;
        keyCounts[key] = totalCount + 1;

        return {
          connection: conn,
          fromPt,
          toPt,
          fromHS,
          toHS,
          fromSymbol,
          toSymbol,
          key,
        };
      })
      .filter(Boolean)
      .map((d) => {
        if (!d) return null;
        const index = keyIndices[d.key] || 0;
        keyIndices[d.key] = index + 1;

        // For distribution-block pins, the wire starts AT the screw and passes
        // through the module body, exiting at the bottom edge. The ferrule
        // (80px short, drawn by FerruleGraphic) sits right at the screw.
        // For all other modules we keep the historical "wire starts at module
        // edge" behaviour with a long ferrule that bridges screw → edge.
        const fromIsDist = isDistributionBlockSymbol(d.fromSymbol);
        const toIsDist = isDistributionBlockSymbol(d.toSymbol);
        const fromVisualInset = fromIsDist ? 0 : d.fromHS.visualInset;
        const toVisualInset = toIsDist ? 0 : d.toHS.visualInset;

        const path = calculateWirePath(d.fromPt, d.toPt, {
          isFromTop: resolveConnectionIsFromTop(d.fromSymbol, d.connection.isFromTop, d.fromHS),
          fromDirection: d.fromHS.direction,
          isToTop: resolveConnectionIsToTop(d.toSymbol, d.connection.isToTop, d.toHS),
          toDirection: d.toHS.direction,
          fromVisualInset,
          toVisualInset,
          exitOffset: Math.max(d.fromHS.exitOffset ?? 40, d.toHS.exitOffset ?? 40),
          parallelIndex: index,
          parallelCount: keyCounts[d.key],
          customOffset: d.connection.customOffset,
          customOffsetX: d.connection.customOffsetX,
          customOffsetY1: d.connection.customOffsetY1,
          customOffsetY2: d.connection.customOffsetY2,
          points: d.connection.points,
          customRadius: d.connection.customRadius,
        });

        return {
          ...d,
          pathData: path,
          parallelIndex: index,
          parallelCount: keyCounts[d.key],
        };
      });
  }, [connections, symbols]);
}
