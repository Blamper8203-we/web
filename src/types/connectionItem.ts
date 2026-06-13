export type FerruleColor = "white" | "grey" | "red" | "blue" | "yellow" | "black" | "brown" | "none" | "auto";
export type WireColor = "black" | "blue" | "brown" | "grey" | "green-yellow" | "red" | "other";

export type WireType = "DY" | "LgY" | "szyna";

export type RoutingMode = "manhattan" | "orthogonal" | "direct" | "smart";

export interface ConnectionItem {
  id: string;
  fromSymbolId: string;
  fromTerminal: string; // np. "1", "3", "5", "N", "PE"
  toSymbolId: string;
  toTerminal: string; // np. "2", "N", "L"
  wireColor: WireColor;
  wireCrossSection: number; // np. 1.5, 2.5, 4, 6, 10, 16 mm2
  wireType: WireType;
  ferruleColor?: FerruleColor;
  routingMode: RoutingMode;
  customOffset?: number;
  customOffsetX?: number;
  customOffsetY1?: number;
  customOffsetY2?: number;
  customRadius?: number;
  isFromTop?: boolean;
  isToTop?: boolean;
  fromDirection?: "top" | "bottom" | "left" | "right" | "auto-horizontal" | "auto-vertical";
  toDirection?: "top" | "bottom" | "left" | "right" | "auto-horizontal" | "auto-vertical";
  points?: Array<{ x: number; y: number }>;
}

export function createDefaultConnection(overrides?: Partial<ConnectionItem>): ConnectionItem {
  return {
    id: crypto.randomUUID(),
    fromSymbolId: "",
    fromTerminal: "",
    toSymbolId: "",
    toTerminal: "",
    wireColor: "black",
    wireCrossSection: 2.5,
    wireType: "LgY",
    ferruleColor: "none",
    routingMode: "orthogonal",
    ...overrides,
  };
}
