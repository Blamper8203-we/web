import { type ConnectionItem, type FerruleColor } from "../../types/connectionItem";
import { type SymbolItem, isTerminalOrConnectorSymbol, isDistributionBlockSymbol } from "../../types/symbolItem";
import { type TerminalHotspot } from "../modules/moduleTerminals";

export const WIRE_COLORS_MAP: Record<string, { hex: string; highlight: string; dark: string }> = {
  black: { hex: "#333333", highlight: "#666666", dark: "#000000" }, // L2
  brown: { hex: "#8B4513", highlight: "#c4763a", dark: "#4a2007" }, // L1
  grey: { hex: "#888888", highlight: "#bbbbbb", dark: "#555555" },  // L3
  gray: { hex: "#888888", highlight: "#bbbbbb", dark: "#555555" },  // L3
  blue: { hex: "#1565C0", highlight: "#4a9ed6", dark: "#0a2f6b" },  // N
  "green-yellow": { hex: "#2e7d32", highlight: "#5ab55e", dark: "#143b16" }, // PE
  pe: { hex: "#2e7d32", highlight: "#5ab55e", dark: "#143b16" }, // PE
  red: { hex: "#ef4444", highlight: "#f87171", dark: "#991b1b" },
  other: { hex: "#a855f7", highlight: "#c084fc", dark: "#6b21a8" },
};

export const FERRULE_COLORS_MAP: Record<string, { hex: string; highlight: string; dark: string }> = {
  white: { hex: "#dddddd", highlight: "#ffffff", dark: "#aaaaaa" },
  grey: { hex: "#666666", highlight: "#999999", dark: "#333333" },
  red: { hex: "#b91c1c", highlight: "#dc2626", dark: "#7f1d1d" },
  blue: { hex: "#1d4ed8", highlight: "#2563eb", dark: "#1e3a8a" },
  yellow: { hex: "#eab308", highlight: "#facc15", dark: "#a16207" },
  black: { hex: "#171717", highlight: "#404040", dark: "#000000" },
  brown: { hex: "#6b3410", highlight: "#8B4513", dark: "#401f0a" },
  none: { hex: "transparent", highlight: "transparent", dark: "transparent" },
};

export const WIRE_THICKNESS_MAP: Record<number, number> = {
  1.5: 24.0,
  2.5: 30.0,
  4.0: 36.0,
  6.0: 42.0,
  10.0: 50.0,
  16.0: 60.0,
};

export function getAutoFerruleColor(crossSection: number): FerruleColor {
  if (crossSection <= 1.5) return "black";
  if (crossSection === 2.5) return "blue";
  if (crossSection === 4.0) return "grey";
  if (crossSection === 6.0) return "yellow";
  if (crossSection === 10.0) return "red";
  if (crossSection >= 16.0) return "blue";
  return "black";
}

export function findConnectedComponent(
  connections: ConnectionItem[],
  startSymbolId: string,
  startTerminal: string
): { terminalKeys: Set<string>; connectionIds: Set<string> } {
  const terminalKeys: Set<string> = new Set();
  const connectionIds: Set<string> = new Set();
  const queue: Array<{ symbolId: string; terminal: string }> = [{ symbolId: startSymbolId, terminal: startTerminal }];
  const startKey = `${startSymbolId}:${startTerminal}`;
  terminalKeys.add(startKey);

  let iterations = 0;
  while (queue.length > 0 && iterations < 1000) {
    iterations++;
    const current = queue.shift()!;
    const currentKey = `${current.symbolId}:${current.terminal}`;

    for (const conn of connections) {
      const fromKey = `${conn.fromSymbolId}:${conn.fromTerminal}`;
      const toKey = `${conn.toSymbolId}:${conn.toTerminal}`;

      if (fromKey === currentKey && !terminalKeys.has(toKey)) {
        terminalKeys.add(toKey);
        connectionIds.add(conn.id);
        queue.push({ symbolId: conn.toSymbolId, terminal: conn.toTerminal });
      } else if (toKey === currentKey && !terminalKeys.has(fromKey)) {
        terminalKeys.add(fromKey);
        connectionIds.add(conn.id);
        queue.push({ symbolId: conn.fromSymbolId, terminal: conn.fromTerminal });
      }
    }
  }

  return { terminalKeys, connectionIds };
}

export function getHotspotPhase(symbol: SymbolItem, hs: TerminalHotspot): "L1" | "L2" | "L3" | "N" | "PE" | "unknown" {
  if (hs.type === "pe") return "PE";
  if (hs.type === "neutral") return "N";
  if (hs.type !== "phase") return "unknown";

  const phaseStr = (symbol.phase || "L1").toUpperCase();
  if (phaseStr === "L1") return "L1";
  if (phaseStr === "L2") return "L2";
  if (phaseStr === "L3") return "L3";

  // Multi-phase device (L1+L2+L3, 3F, L1+L2, etc.)
  const name = hs.name;
  if (name === "1" || name === "2" || name.startsWith("L1") || name.toLowerCase().includes("in1") || name.toLowerCase().includes("out1")) return "L1";
  if (name === "3" || name === "4" || name.startsWith("L2") || name.toLowerCase().includes("in2") || name.toLowerCase().includes("out2")) return "L2";
  if (name === "5" || name === "6" || name.startsWith("L3") || name.toLowerCase().includes("in3") || name.toLowerCase().includes("out3")) return "L3";
  if (name === "N") return "N";
  if (name === "PE" || name === "PE2") return "PE";

  return "L1"; // Fallback to first phase
}

export function checkConnectionWarning(
  fromSymbol: SymbolItem,
  fromHS: TerminalHotspot,
  toSymbol: SymbolItem,
  toHS: TerminalHotspot
): string | null {
  const fromPhase = getHotspotPhase(fromSymbol, fromHS);
  const toPhase = getHotspotPhase(toSymbol, toHS);

  if (fromPhase === "unknown" || toPhase === "unknown") return null;
  if (fromPhase === toPhase) return null; // Safe

  // PE to Phase/N warnings
  if (fromPhase === "PE" || toPhase === "PE") {
    const otherPhase = fromPhase === "PE" ? toPhase : fromPhase;

    // Wyjątek dla podziału PEN: połączenie PE z N jest dozwolone,
    // jeśli oba elementy są listwami zaciskowymi (terminalBlock) lub blokami rozdzielczymi
    if (otherPhase === "N") {
      const isFromBlock = isTerminalOrConnectorSymbol(fromSymbol) || isDistributionBlockSymbol(fromSymbol);
      const isToBlock = isTerminalOrConnectorSymbol(toSymbol) || isDistributionBlockSymbol(toSymbol);
      if (isFromBlock && isToBlock) {
        return null; // Dozwolony podział PEN
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
  const isPhase = (p: string) => p === "L1" || p === "L2" || p === "L3";
  if (isPhase(fromPhase) && isPhase(toPhase)) {
    return `Niebezpieczeństwo: Zwarcie międzyfazowe (${fromPhase} ↔ ${toPhase})!`;
  }

  return null;
}

export function getSymbolAssetUrl(symbol: SymbolItem): string {
  let path = symbol.visualPath || "";
  if (!path.startsWith("/") && !path.startsWith("http")) {
    path = "/" + path;
  }
  return path;
}

// Helper to distinguish standard Złączki from Listwy do rozdzielnicy
export const isTerminalZlaczka = (moduleRef?: string | null): boolean => {
  if (!moduleRef) return false;
  const normalized = moduleRef.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.includes("zlacz") && !normalized.includes("rozlacz");
};

export function getFerruleLength(deviceKind: string | undefined, moduleRef: string | null | undefined): number {
  if (isTerminalZlaczka(moduleRef)) {
    return 240; // extra-long: 230 collar + 10 offset
  }
  if (deviceKind === "terminalBlock") {
    return 90;  // short: 80 collar + 10 offset
  }
  if (deviceKind === "phaseIndicator") {
    return 20;  // square
  }
  return 160;   // regular: 150 collar + 10 offset
}
