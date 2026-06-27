import type { CircuitRow } from "../types/circuitRow";
import {
  isAuxiliaryNonCircuitSymbol,
  isTerminalOrConnectorSymbol,
  type SymbolItem,
} from "../types/symbolItem";
import { firstNonEmpty } from "./stringHelpers";

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

function toCircuitDeviceKind(symbol: SymbolItem): CircuitRow["deviceKind"] {
  if (isTerminalOrConnectorSymbol(symbol)) {
    return "terminalBlock";
  }
  return symbol.deviceKind;
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

export function isCircuitElement(item: CircuitRow): boolean {
  if (item.deviceKind === "phaseIndicator") {
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
    deviceKind: item.deviceKind === "terminalBlock" ? "terminalBlock" : "other",
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
