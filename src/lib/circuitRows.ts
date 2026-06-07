import type { CircuitRow } from "../types/circuitRow";
import {
  isAuxiliaryNonCircuitSymbol,
  isTerminalOrConnectorSymbol,
  type SymbolItem,
} from "../types/symbolItem";

export const CIRCUIT_ROWS_STORAGE_KEY = "dinboard-web.circuit-rows.v1";
const LEGACY_CIRCUIT_ROWS_STORAGE_KEY = "dinboard-tauri.circuit-rows.v1";

export type CircuitRcdGroup = {
  id: string;
  rcd: CircuitRow | null;
  rows: CircuitRow[];
};

export type CircuitGroup = {
  location: string;
  rcdGroups: CircuitRcdGroup[];
};

export type CircuitListTableRow = {
  index: number;
  location: string;
  rcdLabel: string;
  rcdProtection: string;
  row: CircuitRow;
};

export function createDemoCircuitRows(): CircuitRow[] {
  return [
    {
      id: "fr-main",
      type: "FR 4P",
      deviceKind: "fr",
      x: 10,
      y: 20,
      label: "Rozłącznik główny",
      referenceDesignation: "QF1",
      phase: "L1+L2+L3",
      protectionType: "FR 63A",
      displayProtection: "63A (FR)",
      circuitName: "Zasilanie główne rozdzielnicy",
      powerW: 0,
      cableLength: 0,
      cableCrossSection: 10,
      location: "Rozdzielnica główna",
      displayLocation: "Rozdzielnica główna",
      circuitType: "Zasilanie",
      isTerminalBlock: false,
      visualPath: "FR_4P.svg",
    },
    {
      id: "spd-main",
      type: "SPD T1+T2",
      deviceKind: "spd",
      x: 22,
      y: 20,
      label: "Ochrona przepięciowa",
      referenceDesignation: "SPD1",
      phase: "L1+L2+L3",
      protectionType: "SPD",
      displayProtection: "SPD T1+T2 275V 25kA",
      circuitName: "Ochrona przepięciowa",
      powerW: 0,
      cableLength: 0,
      cableCrossSection: 16,
      location: "Rozdzielnica główna",
      displayLocation: "Rozdzielnica główna",
      circuitType: "Ochrona",
      isTerminalBlock: false,
      visualPath: "SPD_T1T2.svg",
    },
    {
      id: "rcd-1",
      type: "RCD 4P",
      deviceKind: "rcd",
      x: 34,
      y: 20,
      label: "RCD 40A/30mA",
      referenceDesignation: "FI1",
      phase: "L1+L2+L3",
      protectionType: "RCD",
      displayProtection: "RCD 40A/30mA Typ A",
      circuitName: "Grupa kuchnia + piekarnik",
      powerW: 0,
      cableLength: 0,
      cableCrossSection: 10,
      location: "Rozdzielnica główna",
      displayLocation: "Rozdzielnica główna",
      circuitType: "RCD",
      isTerminalBlock: false,
      visualPath: "RCD_4P.svg",
    },
    {
      id: "mcb-kitchen",
      type: "MCB 2P",
      deviceKind: "mcb",
      x: 48,
      y: 20,
      label: "Indukcja",
      referenceDesignation: "F1",
      phase: "L1+L2",
      protectionType: "B16",
      displayProtection: "B16",
      circuitName: "Płyta indukcyjna",
      powerW: 7200,
      cableLength: 18,
      cableCrossSection: 2.5,
      location: "Kuchnia",
      displayLocation: "Kuchnia",
      circuitType: "Siła",
      isTerminalBlock: false,
      visualPath: "MCB_2P.svg",
    },
    {
      id: "mcb-oven",
      type: "MCB 1P",
      deviceKind: "mcb",
      x: 60,
      y: 20,
      label: "Piekarnik",
      referenceDesignation: "F2",
      phase: "L3",
      protectionType: "B16",
      displayProtection: "B16",
      circuitName: "Piekarnik",
      powerW: 3500,
      cableLength: 16,
      cableCrossSection: 2.5,
      location: "Kuchnia",
      displayLocation: "Kuchnia",
      circuitType: "Gniazdo",
      isTerminalBlock: false,
      visualPath: "MCB_1P.svg",
    },
    {
      id: "mcb-lights",
      type: "MCB 1P",
      deviceKind: "mcb",
      x: 72,
      y: 20,
      label: "Salon światło",
      referenceDesignation: "F3",
      phase: "L1",
      protectionType: "B10",
      displayProtection: "B10",
      circuitName: "Oświetlenie salon",
      powerW: 450,
      cableLength: 24,
      cableCrossSection: 1.5,
      location: "Salon",
      displayLocation: "Salon",
      circuitType: "Oświetlenie",
      isTerminalBlock: false,
      visualPath: "MCB_1P.svg",
    },
    {
      id: "mcb-sockets",
      type: "MCB 1P",
      deviceKind: "mcb",
      x: 84,
      y: 20,
      label: "Gniazda salon",
      referenceDesignation: "F4",
      phase: "L2",
      protectionType: "B16",
      displayProtection: "B16",
      circuitName: "Gniazda ogólne salon",
      powerW: 2800,
      cableLength: 28,
      cableCrossSection: 2.5,
      location: "Salon",
      displayLocation: "Salon",
      circuitType: "Gniazdo",
      isTerminalBlock: false,
      visualPath: "MCB_1P.svg",
    },
    {
      id: "mcb-garage-force",
      type: "MCB 3P",
      deviceKind: "mcb",
      x: 96,
      y: 20,
      label: "Gniazdo 400V",
      referenceDesignation: "F5",
      phase: "L1+L2+L3",
      protectionType: "C16",
      displayProtection: "C16",
      circuitName: "Gniazdo siłowe garaż",
      powerW: 11000,
      cableLength: 20,
      cableCrossSection: 4,
      location: "Garaż",
      displayLocation: "Garaż",
      circuitType: "Siła",
      isTerminalBlock: false,
      visualPath: "MCB_3P.svg",
    },
    {
      id: "phase-indicator",
      type: "Kontrolki faz",
      deviceKind: "phase-indicator",
      x: 6,
      y: 20,
      label: "Kontrolki faz",
      referenceDesignation: "H1",
      phase: "L1+L2+L3",
      protectionType: "2A gG",
      displayProtection: "2A gG",
      circuitName: "Sygnalizacja napięcia",
      powerW: 0,
      cableLength: 0,
      cableCrossSection: 1.5,
      location: "Rozdzielnica główna",
      displayLocation: "Rozdzielnica główna",
      circuitType: "Pomocniczy",
      isTerminalBlock: false,
      visualPath: "KONTROLKI_FAZ.svg",
    },
    {
      id: "terminal-block",
      type: "TerminalBlock",
      deviceKind: "terminal-block",
      x: 120,
      y: 20,
      label: "Listwa N/PE",
      referenceDesignation: "X1",
      phase: "N/PE",
      protectionType: "-",
      displayProtection: "-",
      circuitName: "Listwa zaciskowa",
      powerW: 0,
      cableLength: 0,
      cableCrossSection: 10,
      location: "Rozdzielnica główna",
      displayLocation: "Rozdzielnica główna",
      circuitType: "Pomocniczy",
      isTerminalBlock: true,
      visualPath: "LISTWA_N_PE.svg",
    },
  ];
}

function toCircuitDeviceKind(symbol: SymbolItem): CircuitRow["deviceKind"] {
  if (isTerminalOrConnectorSymbol(symbol)) {
    return "terminal-block";
  }

  switch (symbol.deviceKind) {
    case "mcb":
    case "rcbo":
    case "fr":
    case "spd":
    case "rcd":
      return symbol.deviceKind;
    case "phaseIndicator":
      return "phase-indicator";
    case "terminalBlock":
      return "terminal-block";
    default:
      return symbol.isTerminalBlock ? "terminal-block" : "aux";
  }
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  return values.find((v) => typeof v === "string" && v.trim().length > 0)?.trim() ?? "";
}

function compareCircuitRowPosition(left: CircuitRow, right: CircuitRow): number {
  if (left.y !== right.y) {
    return left.y - right.y;
  }

  return left.x - right.x;
}

export function buildCircuitRowsFromSymbols(symbols: SymbolItem[]): CircuitRow[] {
  return symbols.map((symbol) => ({
    id: symbol.id,
    type: symbol.type,
    deviceKind: toCircuitDeviceKind(symbol),
    x: symbol.x,
    y: symbol.y,
    label: firstNonEmpty(symbol.label, symbol.type),
    referenceDesignation: firstNonEmpty(symbol.referenceDesignation),
    phase: symbol.phase,
    protectionType: firstNonEmpty(symbol.protectionType, symbol.protection),
    displayProtection: firstNonEmpty(
      symbol.displayProtection,
      symbol.protectionType,
      symbol.protection,
    ),
    circuitName: firstNonEmpty(symbol.circuitName, symbol.label, symbol.type),
    powerW: symbol.powerW,
    cableLength: symbol.cableLength,
    cableCrossSection: symbol.cableCrossSection,
    location: firstNonEmpty(symbol.location),
    displayLocation: firstNonEmpty(symbol.displayLocation, symbol.location, "Brak lokalizacji"),
    circuitType: symbol.circuitType,
    isTerminalBlock: symbol.isTerminalBlock,
    visualPath: symbol.visualPath,
    rcdSymbolId: symbol.rcdSymbolId,
  }));
}

export function normalizeCircuitRows(raw: Partial<CircuitRow>[] | null | undefined): CircuitRow[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return createDemoCircuitRows();
  }

  const demo = createDemoCircuitRows();
  const fallback = demo[0];

  return raw.map((item, index) => {
    const source = demo[index] ?? fallback;

    return {
      id: item.id ?? `${source.id}-${index}`,
      type: item.type ?? source.type,
      deviceKind: item.deviceKind ?? source.deviceKind,
      x: typeof item.x === "number" ? item.x : source.x,
      y: typeof item.y === "number" ? item.y : source.y,
      label: item.label ?? source.label,
      referenceDesignation: item.referenceDesignation ?? source.referenceDesignation,
      phase: item.phase ?? source.phase,
      protectionType: item.protectionType ?? source.protectionType,
      displayProtection: item.displayProtection ?? source.displayProtection,
      circuitName: item.circuitName ?? source.circuitName,
      powerW: typeof item.powerW === "number" ? item.powerW : source.powerW,
      cableLength: typeof item.cableLength === "number" ? item.cableLength : source.cableLength,
      cableCrossSection:
        typeof item.cableCrossSection === "number"
          ? item.cableCrossSection
          : source.cableCrossSection,
      location: item.location ?? source.location,
      displayLocation: item.displayLocation ?? item.location ?? source.displayLocation,
      circuitType: item.circuitType ?? source.circuitType,
      isTerminalBlock: item.isTerminalBlock ?? source.isTerminalBlock,
      visualPath: item.visualPath ?? source.visualPath,
      rcdSymbolId: item.rcdSymbolId ?? source.rcdSymbolId,
    };
  });
}

export function loadCircuitRows(): CircuitRow[] {
  if (typeof window === "undefined") {
    return createDemoCircuitRows();
  }

  const raw =
    window.localStorage.getItem(CIRCUIT_ROWS_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_CIRCUIT_ROWS_STORAGE_KEY);

  if (!raw) {
    return createDemoCircuitRows();
  }

  try {
    return normalizeCircuitRows(JSON.parse(raw) as Partial<CircuitRow>[]);
  } catch {
    return createDemoCircuitRows();
  }
}

export function isCircuitElement(item: CircuitRow): boolean {
  if (item.deviceKind === "phase-indicator") {
    return false;
  }

  if (item.deviceKind === "rcd") {
    return false;
  }

  if (isTerminalBlockOrAux(item)) {
    return false;
  }

  return true;
}

export function isTerminalBlockOrAux(item: CircuitRow): boolean {
  if (item.isTerminalBlock) {
    return true;
  }

  return isAuxiliaryNonCircuitSymbol({
    type: item.type,
    label: item.label,
    visualPath: item.visualPath,
    isTerminalBlock: item.isTerminalBlock,
    deviceKind: item.deviceKind === "terminal-block" ? "terminalBlock" : "other",
  });
}

export function buildVisibleCircuitGroups(allRows: CircuitRow[]): CircuitGroup[] {
  const visibleRows = allRows
    .filter(isCircuitElement)
    .slice()
    .sort(compareCircuitRowPosition);

  const locationMap = new Map<string, Map<string, CircuitRow[]>>();

  for (const row of visibleRows) {
    const loc = row.displayLocation || "Brak lokalizacji";
    const rcdId = row.rcdSymbolId || "direct";

    let rcdMap = locationMap.get(loc);
    if (!rcdMap) {
      rcdMap = new Map<string, CircuitRow[]>();
      locationMap.set(loc, rcdMap);
    }

    let bucket = rcdMap.get(rcdId);
    if (!bucket) {
      bucket = [];
      rcdMap.set(rcdId, bucket);
    }
    bucket.push(row);
  }

  return Array.from(locationMap.entries()).map(([location, rcdMap]) => {
    const rcdGroups: CircuitRcdGroup[] = [];

    for (const [rcdId, groupedRows] of rcdMap.entries()) {
      const rcdRow = rcdId === "direct" ? null : allRows.find(r => r.id === rcdId) || null;
      rcdGroups.push({
        id: rcdId,
        rcd: rcdRow,
        rows: groupedRows.sort(compareCircuitRowPosition),
      });
    }

    rcdGroups.sort((a, b) => {
      const aFirst = a.rcd || a.rows[0];
      const bFirst = b.rcd || b.rows[0];
      if (!aFirst && !bFirst) return 0;
      if (!aFirst) return 1;
      if (!bFirst) return -1;
      return compareCircuitRowPosition(aFirst, bFirst);
    });

    return {
      location,
      rcdGroups,
    };
  });
}

export function buildCircuitListTableRows(allRows: CircuitRow[]): CircuitListTableRow[] {
  const tableRows: CircuitListTableRow[] = [];
  const groups = buildVisibleCircuitGroups(allRows);

  for (const group of groups) {
    for (const rcdGroup of group.rcdGroups) {
      const rcdLabel = rcdGroup.rcd
        ? firstNonEmpty(rcdGroup.rcd.referenceDesignation, rcdGroup.rcd.label, rcdGroup.rcd.type, "RCD")
        : "";
      const rcdProtection = rcdGroup.rcd
        ? firstNonEmpty(rcdGroup.rcd.displayProtection, rcdGroup.rcd.protectionType, "RCD")
        : "";

      for (const row of rcdGroup.rows) {
        tableRows.push({
          index: tableRows.length + 1,
          location: group.location,
          rcdLabel,
          rcdProtection,
          row,
        });
      }
    }
  }

  return tableRows;
}

export function countHiddenCircuitRows(rows: CircuitRow[]): number {
  return rows.length - rows.filter(isCircuitElement).length;
}
