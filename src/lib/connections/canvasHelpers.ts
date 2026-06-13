import type { ConnectionItem } from "../../types/connectionItem";
import type { SymbolItem } from "../../types/symbolItem";
import {
  isDistributionBlockSymbol,
  isTerminalOrConnectorSymbol,
} from "../../types/symbolItem";
import type { TerminalHotspot } from "../modules/moduleTerminals";

export type HotspotPhase = "L1" | "L2" | "L3" | "N" | "PE" | "unknown";

export interface ConnectedComponent {
  terminalKeys: Set<string>;
  connectionIds: Set<string>;
}

const PHASE_TERMINAL_KEY = (symbolId: string, terminal: string, isTop: boolean | undefined): string =>
  `${symbolId}:${terminal}:${isTop ? "T" : "B"}`;

/**
 * Trace all terminals and connections reachable from a starting point in the
 * connection graph. Used to highlight every wire/terminal that's electrically
 * connected to the user's selection.
 *
 * Safety: bounded by a 1000-iteration cap to defend against pathological
 * connection sets; in practice the graph is small.
 */
export function findConnectedComponent(
  connections: ConnectionItem[],
  startSymbolId: string,
  startTerminal: string,
  startIsTop?: boolean,
): ConnectedComponent {
  const terminalKeys: Set<string> = new Set();
  const connectionIds: Set<string> = new Set();
  const queue: Array<{ symbolId: string; terminal: string; isTop?: boolean }> = [
    { symbolId: startSymbolId, terminal: startTerminal, isTop: startIsTop },
  ];
  const startKey = PHASE_TERMINAL_KEY(startSymbolId, startTerminal, startIsTop);
  terminalKeys.add(startKey);

  let iterations = 0;
  while (queue.length > 0 && iterations < 1000) {
    iterations++;
    const current = queue.shift()!;
    const currentKey = PHASE_TERMINAL_KEY(current.symbolId, current.terminal, current.isTop);

    for (const conn of connections) {
      const fromKey = PHASE_TERMINAL_KEY(conn.fromSymbolId, conn.fromTerminal, conn.isFromTop);
      const toKey = PHASE_TERMINAL_KEY(conn.toSymbolId, conn.toTerminal, conn.isToTop);

      if (fromKey === currentKey && !terminalKeys.has(toKey)) {
        terminalKeys.add(toKey);
        connectionIds.add(conn.id);
        queue.push({
          symbolId: conn.toSymbolId,
          terminal: conn.toTerminal,
          isTop: conn.isToTop,
        });
      } else if (toKey === currentKey && !terminalKeys.has(fromKey)) {
        terminalKeys.add(fromKey);
        connectionIds.add(conn.id);
        queue.push({
          symbolId: conn.fromSymbolId,
          terminal: conn.fromTerminal,
          isTop: conn.isFromTop,
        });
      }
    }
  }

  return { terminalKeys, connectionIds };
}

/**
 * Determine the electrical phase of a specific terminal hotspot on a symbol.
 * Falls back to the symbol's primary phase (e.g. L1) when the hotspot does
 * not encode a phase explicitly.
 */
export function getHotspotPhase(symbol: SymbolItem, hs: TerminalHotspot): HotspotPhase {
  if (hs.type === "pe") return "PE";
  if (hs.type === "neutral") return "N";
  if (hs.type !== "phase") return "unknown";

  const phaseStr = (symbol.phase || "L1").toUpperCase();
  if (phaseStr === "L1") return "L1";
  if (phaseStr === "L2") return "L2";
  if (phaseStr === "L3") return "L3";

  // Multi-phase device (L1+L2+L3, 3F, L1+L2, etc.) - infer from terminal name
  const name = hs.name;
  if (name === "1" || name === "2" || name.startsWith("L1") || name.toLowerCase().includes("in1") || name.toLowerCase().includes("out1")) return "L1";
  if (name === "3" || name === "4" || name.startsWith("L2") || name.toLowerCase().includes("in2") || name.toLowerCase().includes("out2")) return "L2";
  if (name === "5" || name === "6" || name.startsWith("L3") || name.toLowerCase().includes("in3") || name.toLowerCase().includes("out3")) return "L3";
  if (name === "N") return "N";
  if (name === "PE" || name === "PE2") return "PE";

  return "L1"; // Fallback to first phase
}

/**
 * Returns a human-readable warning string when connecting two terminals would
 * be electrically unsafe, or null when the connection is fine.
 *
 * Special case: PE-to-N connections are allowed only when both ends are
 * terminal blocks or distribution blocks (PEN split).
 */
export function checkConnectionWarning(
  fromSymbol: SymbolItem,
  fromHS: TerminalHotspot,
  toSymbol: SymbolItem,
  toHS: TerminalHotspot,
): string | null {
  const fromPhase = getHotspotPhase(fromSymbol, fromHS);
  const toPhase = getHotspotPhase(toSymbol, toHS);

  if (fromPhase === "unknown" || toPhase === "unknown") return null;
  if (fromPhase === toPhase) return null; // Safe

  // PE to Phase/N warnings
  if (fromPhase === "PE" || toPhase === "PE") {
    const otherPhase = fromPhase === "PE" ? toPhase : fromPhase;

    // PEN split exception: PE-N connection is allowed when both ends are
    // terminal blocks or distribution blocks
    if (otherPhase === "N") {
      const isFromBlock = isTerminalOrConnectorSymbol(fromSymbol) || isDistributionBlockSymbol(fromSymbol);
      const isToBlock = isTerminalOrConnectorSymbol(toSymbol) || isDistributionBlockSymbol(toSymbol);
      if (isFromBlock && isToBlock) {
        return null; // Allowed PEN split
      }
    }

    return `Ostrzeżenie: Próba połączenia uziemienia (PE) z ${otherPhase}!`;
  }

  // N to Phase warnings
  if (fromPhase === "N" || toPhase === "N") {
    const otherPhase = fromPhase === "N" ? toPhase : fromPhase;
    return `Niebezpieczeństwo: Zwarcie fazy ${otherPhase} z przewodem neutralnym (N)!`;
  }

  // Phase to Phase warnings
  const isPhase = (p: string): boolean => p === "L1" || p === "L2" || p === "L3";
  if (isPhase(fromPhase) && isPhase(toPhase)) {
    return `Niebezpieczeństwo: Zwarcie międzyfazowe (${fromPhase} ↔ ${toPhase})!`;
  }

  return null;
}

/**
 * Resolve the asset URL for a symbol, normalising leading slashes.
 * Symbols from Avalonia-imported projects may have relative paths; we always
 * return an absolute path so the renderer can locate the asset.
 */
export function getSymbolAssetUrl(symbol: SymbolItem): string {
  let path = symbol.visualPath || "";
  if (!path.startsWith("/") && !path.startsWith("http")) {
    path = "/" + path;
  }
  return path;
}
