import { type SymbolItem } from "../../types/symbolItem";
import type { ConnectionItem } from "../../types/connectionItem";

export interface SymbolHistorySnapshot {
  symbols: SymbolItem[];
  connections?: ConnectionItem[];
  selectedSymbolId: string | null;
  selectedSymbolIds?: string[];
}

export function cloneSymbolsSnapshot(symbols: SymbolItem[]): SymbolItem[] {
  return symbols.map((symbol) => ({ ...symbol, parameters: { ...symbol.parameters } }));
}

/**
 * Tworzy pelny SymbolHistorySnapshot z podanego stanu + connections.
 *
 * WHY: W useSymbolHistory.ts inline konstrukcja snapshota pojawia sie 3 razy
 * (markClean + beforeSnapshot + afterSnapshot w executeSymbolsCommand) z
 * identyczna struktura. Wyciagniecie helpera eliminuje 3 miejsca do
 * synchronizacji (w szczegolnosci selectedSymbolIds fallback na
 * [selectedSymbolId]). Connections przekazywane jako osobny parametr
 * (required) — caller rozwiązuje ewentualny `undefined` z
 * `state.connections ?? fallback` na miejscu wywolania, bo logika
 * rozwijania jest rozna (np. markClean uzywa [], executeSymbolsCommand
 * uzywa biezacych connections z ref). Zwraca nowy obiekt z klonami
 * symbols i connections, wiec undo/redo nie dzieli referencji z live state.
 */
export function createSymbolHistorySnapshot(
  state: {
    symbols: SymbolItem[];
    selectedSymbolId: string | null;
    selectedSymbolIds?: string[] | null;
  },
  connections: ConnectionItem[],
): SymbolHistorySnapshot {
  return {
    symbols: cloneSymbolsSnapshot(state.symbols),
    connections: connections.map((c) => ({ ...c })),
    selectedSymbolId: state.selectedSymbolId,
    selectedSymbolIds:
      state.selectedSymbolIds ??
      (state.selectedSymbolId ? [state.selectedSymbolId] : []),
  };
}

export function areSymbolSnapshotsEqual(first: SymbolItem[], second: SymbolItem[]): boolean {
  if (first.length !== second.length) return false;

  for (let i = 0; i < first.length; i++) {
    const a = first[i];
    const b = second[i];
    
    if (a === b) continue;

    if (
      a.id !== b.id ||
      a.type !== b.type ||
      a.x !== b.x ||
      a.y !== b.y ||
      a.width !== b.width ||
      a.height !== b.height ||
      a.label !== b.label ||
      a.phase !== b.phase ||
      a.group !== b.group ||
      a.groupName !== b.groupName ||
      a.isSnappedToRail !== b.isSnappedToRail ||
      a.protectionType !== b.protectionType ||
      a.powerW !== b.powerW ||
      a.referenceDesignation !== b.referenceDesignation ||
      a.circuitName !== b.circuitName ||
      a.circuitDescription !== b.circuitDescription ||
      a.circuitType !== b.circuitType ||
      a.location !== b.location ||
      a.rcdSymbolId !== b.rcdSymbolId ||
      a.rcdRatedCurrent !== b.rcdRatedCurrent ||
      a.rcdResidualCurrent !== b.rcdResidualCurrent ||
      a.rcdType !== b.rcdType ||
      a.spdType !== b.spdType ||
      a.spdVoltage !== b.spdVoltage ||
      a.spdDischargeCurrent !== b.spdDischargeCurrent ||
      a.frRatedCurrent !== b.frRatedCurrent ||
      a.cableCrossSection !== b.cableCrossSection ||
      a.cableLength !== b.cableLength ||
      a.deviceKind !== b.deviceKind ||
      a.isPhaseLocked !== b.isPhaseLocked ||
      a.visualPath !== b.visualPath ||
      a.moduleSourceType !== b.moduleSourceType ||
      a.moduleRef !== b.moduleRef
    ) {
      return false;
    }

    if (a.parameters || b.parameters) {
      if (!a.parameters || !b.parameters) return false;
      const keysA = Object.keys(a.parameters);
      const keysB = Object.keys(b.parameters);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (a.parameters[key] !== b.parameters[key]) return false;
      }
    }
  }

  return true;
}
