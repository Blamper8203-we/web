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
    ferruleColor: "white",
    routingMode: "orthogonal",
    ...overrides,
  };
}

// WHY: Filtr typów dla surowych danych z JSON.parse / localStorage. Wyciąga tylko
// pola o poprawnych typach zgodnych z ConnectionItem. `points` ma dodatkowy
// filtr (każdy punkt musi mieć x/y jako number). Brakujące/nieprawidłowe pola
// są pomijane — createDefaultConnection dostarcza domyślne wartości.
//
// UWAGA dla maintainera: przy dodawaniu nowego pola do ConnectionItem trzeba
// też dodać sprawdzenie typu tutaj, inaczej z pliku nie załaduje się wartość.
export function filterConnectionOverrides(raw: unknown): Partial<ConnectionItem> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const conn = raw as Record<string, unknown>;
  const overrides: Partial<ConnectionItem> = {};

  if (typeof conn.id === "string" && conn.id.trim().length > 0) {
    overrides.id = conn.id;
  }
  if (typeof conn.fromSymbolId === "string") overrides.fromSymbolId = conn.fromSymbolId;
  if (typeof conn.fromTerminal === "string") overrides.fromTerminal = conn.fromTerminal;
  if (typeof conn.toSymbolId === "string") overrides.toSymbolId = conn.toSymbolId;
  if (typeof conn.toTerminal === "string") overrides.toTerminal = conn.toTerminal;
  if (typeof conn.wireColor === "string") overrides.wireColor = conn.wireColor as WireColor;
  if (typeof conn.wireCrossSection === "number") overrides.wireCrossSection = conn.wireCrossSection;
  if (typeof conn.wireType === "string") overrides.wireType = conn.wireType as WireType;
  if (typeof conn.ferruleColor === "string") overrides.ferruleColor = conn.ferruleColor as FerruleColor;
  if (typeof conn.routingMode === "string") overrides.routingMode = conn.routingMode as RoutingMode;
  if (typeof conn.customOffset === "number") overrides.customOffset = conn.customOffset;
  if (typeof conn.customOffsetX === "number") overrides.customOffsetX = conn.customOffsetX;
  if (typeof conn.customOffsetY1 === "number") overrides.customOffsetY1 = conn.customOffsetY1;
  if (typeof conn.customOffsetY2 === "number") overrides.customOffsetY2 = conn.customOffsetY2;
  if (typeof conn.isFromTop === "boolean") overrides.isFromTop = conn.isFromTop;
  if (typeof conn.isToTop === "boolean") overrides.isToTop = conn.isToTop;
  if (Array.isArray(conn.points)) {
    const points = conn.points
      .filter((p): p is { x: number; y: number } =>
        typeof p === "object" && p !== null &&
        typeof (p as Record<string, unknown>).x === "number" &&
        typeof (p as Record<string, unknown>).y === "number",
      );
    if (points.length > 0) {
      overrides.points = points;
    }
  }

  return overrides;
}

// WHY: Odczyt z localStorage / pliku to nieufne dane (mogą byc uszkodzone lub
// pochodzic ze starszej wersji). Normalizator filtruje smieci i wypełnia pola
// domyslne przez createDefaultConnection, analogicznie do normalizeSymbolItems
// w symbolItem.ts. Element bez prawidłowego `id` jest odrzucany (połączenie bez
// tożsamości jest bezużyteczne i mogłoby psuć historię undo/redo).
export function normalizeConnectionItems(raw: unknown): ConnectionItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const result: ConnectionItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const overrides = filterConnectionOverrides(item);
    if (typeof overrides.id !== "string") {
      // Brak id w danych wejsciowych → odrzuc (polaczenie bez tozsamosci
      // jest bezuzyteczne i mogłoby psuc historie undo/redo).
      continue;
    }
    result.push(createDefaultConnection(overrides));
  }
  return result;
}
